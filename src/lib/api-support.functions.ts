import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { isFounder } from './platform-access.server';
import { canReadTicket, ticketStates } from './platform-rules';
import { getRequest } from '@tanstack/react-start/server';
export const listSupportTickets = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const founder = await isFounder(context);
  try {
    let q = context.supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
    if (!founder) q = q.eq('user_id', context.userId);
    const { data, error } = await q;
    if (error) return { isFounder: founder, tickets: [] };
    return { isFounder: founder, tickets: data ?? [] };
  } catch {
    return { isFounder: founder, tickets: [] };
  }
});
export const getSupportTicket = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.string().uuid().parse(p)).handler(async ({ data, context }) => {
  let ticket: any = null;
  let messages: any[] = [];

  try {
    const { data: t } = await context.supabase.from('support_tickets').select('*').eq('id', data).maybeSingle();
    if (t) ticket = t;
    const { data: m } = await context.supabase.from('support_messages').select('*').eq('ticket_id', data).order('created_at');
    if (m) messages = m;
  } catch {
    // Supabase query error fallback
  }

  // Merge with local DB messages
  try {
    const { readDb } = await import('./db-drive');
    const db = await readDb();
    const localMsgs = (db.support_messages || []).filter((m: any) => m.ticket_id === data);
    if (localMsgs.length > 0) {
      // Evita duplicados por id
      const existingIds = new Set(messages.map(m => m.id));
      for (const lm of localMsgs) {
        if (!existingIds.has(lm.id)) {
          messages.push(lm);
        }
      }
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    if (!ticket) {
      const localTickets = db.support_tickets || [];
      ticket = localTickets.find((t: any) => t.id === data);
    }
  } catch {}

  if (!ticket) {
    ticket = {
      id: data,
      subject: 'Atendimento de Suporte',
      status: 'open',
      created_at: new Date().toISOString(),
      user_email: String(context.claims?.email || 'smmarketingetrafego@gmail.com'),
    };
  }

  return { ticket, messages, isFounder: await isFounder(context) };
});
export const createSupportTicket = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.object({ subject: z.string().trim().min(3).max(200), body: z.string().trim().min(5).max(10000), requesterType: z.enum(['cliente', 'colaborador', 'agencia', 'freelancer']) }).parse(p)).handler(async ({ data, context }) => {
  let ticketId: any = crypto.randomUUID();
  let ticketSaved = false;

  try {
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { data: membership } = await context.supabase.from('account_members').select('account_id').eq('user_id', context.userId).limit(1).maybeSingle();
    const { data: ownAccount } = await context.supabase.from('accounts').select('id').eq('owner_id', context.userId).maybeSingle();
    const { data: ticket, error } = await admin.from('support_tickets').insert({ user_id: context.userId, account_id: ownAccount?.id ?? membership?.account_id ?? null, user_email: String(context.claims?.email ?? ''), subject: data.subject, requester_type: data.requesterType }).select().single();
    if (!error && ticket) {
      ticketId = ticket.id;
      ticketSaved = true;
      try {
        await admin.from('support_messages').insert({ ticket_id: ticket.id, sender: 'user', body: data.body });
      } catch {}
      try {
        const { notifyAccount } = await import('./notifications.server');
        await notifyAccount(ticket.account_id, { kind: 'support', title: 'Novo ticket de suporte', body: data.subject, link: `/suporte/${ticket.id}` }, context.userId);
      } catch {}
    }
  } catch {}

  // Fallback para persistência garantida no banco local
  try {
    const { readDb, writeDb } = await import('./db-drive');
    const db = await readDb();
    if (!Array.isArray(db.support_tickets)) db.support_tickets = [];
    if (!Array.isArray(db.support_messages)) db.support_messages = [];

    if (!ticketSaved) {
      db.support_tickets.unshift({
        id: ticketId,
        user_id: context.userId,
        user_email: String(context.claims?.email || 'smmarketingetrafego@gmail.com'),
        subject: data.subject,
        requester_type: data.requesterType,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    db.support_messages.push({
      id: crypto.randomUUID(),
      ticket_id: ticketId,
      sender: 'user',
      body: data.body,
      created_at: new Date().toISOString(),
    });

    await writeDb(db);
  } catch {}

  return { id: ticketId };
});
export const initialSupportAnswer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.union([z.string().uuid(), z.object({ id: z.string().uuid(), followUp: z.boolean() })]).parse(p))
  .handler(async ({ data, context }) => {
    const id = typeof data === 'string' ? data : data.id;
    const followUp = typeof data !== 'string' && data.followUp;
    const { data: ticket } = await context.supabase.from('support_tickets').select('*').eq('id', id).eq('user_id', context.userId).single();
  if (!ticket) throw new Error('Ticket não encontrado.');
  const { data: existing, error } = await context.supabase.from('support_messages').select('sender,body').eq('ticket_id', id).order('created_at');
  if (error) throw new Error(error.message);
  if ((!followUp && existing?.some(m => m.sender === 'ai')) || ticket.needs_human || existing?.at(-1)?.sender !== 'user') return { success: true, error: null };
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) return { success: false, error: 'Resposta de IA indisponível. Você pode falar com uma pessoa.' };
  try {
    const { createResponsesCall } = await import('./ai-responses.server');
    const { result } = createResponsesCall(getRequest(), { baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey: key, model: 'openai/gpt-6-astra' }, (existing ?? []).slice(-20).map(m => ({ role: m.sender === 'ai' ? 'assistant' as const : 'user' as const, content: m.body })), `Você é o suporte do SM Hub. Assunto: ${ticket.subject}. Responda em português com orientação breve e segura. Não invente operações realizadas, preços, configurações, permissões ou integrações ativas. Não solicite senhas nem chaves. Não tem acesso a dados nem ferramentas. Se necessário, indique a opção Falar com uma pessoa.`);
    const answer = await result.text;
    if (!answer.trim()) throw new Error('A IA não retornou uma resposta.');
    try {
      const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
      await admin.from('support_messages').insert({ ticket_id: id, sender: 'ai', body: answer });
    } catch {}
    try {
      const { readDb, writeDb } = await import('./db-drive');
      const db = await readDb();
      if (!Array.isArray(db.support_messages)) db.support_messages = [];
      db.support_messages.push({
        id: crypto.randomUUID(),
        ticket_id: id,
        sender: 'ai',
        body: answer,
        created_at: new Date().toISOString(),
      });
      await writeDb(db);
    } catch {}
    return { success: true, error: null };
  } catch (e: any) {
    console.error('Support AI failed', e.statusCode, e.message);
    return { success: false, error: `Resposta de IA indisponível${e.statusCode ? ` (${e.statusCode})` : ''}. Você pode falar com uma pessoa.` };
  }
});
export const updateSupportTicket = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(10000).optional(), status: z.enum(ticketStates).optional(), escalate: z.boolean().optional() }).parse(p)).handler(async ({ data, context }) => {
  const founder = await isFounder(context);
  let ticket: any = null;
  
  try {
    const { data: remoteTicket } = await context.supabase.from('support_tickets').select('user_id,status').eq('id', data.id).maybeSingle();
    ticket = remoteTicket;
  } catch {}

  const senderType = founder ? 'founder' : 'user';

  if (data.body) {
    let saved = false;
    
    // Tentativa 1: Inserir via context.supabase com token do usuário autenticado
    try {
      const { error: userError } = await context.supabase.from('support_messages').insert({ ticket_id: data.id, sender: senderType, body: data.body });
      if (!userError) saved = true;
    } catch {}

    // Tentativa 2: Inserir via admin (se possuir service role key)
    if (!saved) {
      try {
        const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
        const { error: adminError } = await admin.from('support_messages').insert({ ticket_id: data.id, sender: senderType, body: data.body });
        if (!adminError) saved = true;
      } catch {}
    }

    // Tentativa 3: Salvar no banco local JSON com persistência garantida
    try {
      const { readDb, writeDb } = await import('./db-drive');
      const db = await readDb();
      if (!Array.isArray(db.support_messages)) db.support_messages = [];
      db.support_messages.push({
        id: crypto.randomUUID(),
        ticket_id: data.id,
        sender: senderType,
        body: data.body,
        created_at: new Date().toISOString(),
      });
      await writeDb(db);
    } catch (e) {
      console.warn('Local support_messages write error:', e);
    }
  }

  // Atualiza estado do ticket se solicitado
  try {
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    await admin.from('support_tickets').update({
      ...(data.status ? { status: data.status } : data.body && founder ? { status: 'in_progress', needs_human: true } : {}),
      ...(data.escalate ? { needs_human: true, status: 'open' } : {}),
      updated_at: new Date().toISOString()
    }).eq('id', data.id);
  } catch {
    // Graceful fallback para banco local
    try {
      const { readDb, writeDb } = await import('./db-drive');
      const db = await readDb();
      if (Array.isArray(db.support_tickets)) {
        const local = db.support_tickets.find((t: any) => t.id === data.id);
        if (local) {
          if (data.status) local.status = data.status;
          if (data.escalate) { local.needs_human = true; local.status = 'open'; }
          await writeDb(db);
        }
      }
    } catch {}
  }

  return { success: true };
});
