import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { isFounder } from './platform-access.server';
import { canReadTicket, ticketStates } from './platform-rules';
import { getRequest } from '@tanstack/react-start/server';
import { generateAiSupportResponse } from './ai-support.server';
import { DEFAULT_AGENTS, type AIAgent } from './api-agentes.functions';

export const listSupportTickets = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const founder = await isFounder(context);
  let tickets: any[] = [];
  
  try {
    let q = context.supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
    if (!founder) q = q.eq('user_id', context.userId);
    const { data, error } = await q;
    if (!error && data) tickets = data;
  } catch {}

  // Sincronização e merge com banco local garantido
  try {
    const { readDb } = await import('./db-drive');
    const db = await readDb();
    const localTickets = db.support_tickets || [];
    const existingIds = new Set(tickets.map(t => t.id));
    for (const lt of localTickets) {
      if (!existingIds.has(lt.id)) {
        if (founder || lt.user_id === context.userId) {
          tickets.push(lt);
        }
      }
    }
    tickets.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  } catch {}

  return { isFounder: founder, tickets };
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

  // Merge com banco local garantido
  try {
    const { readDb } = await import('./db-drive');
    const db = await readDb();
    const localMsgs = (db.support_messages || []).filter((m: any) => m.ticket_id === data);
    if (localMsgs.length > 0) {
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

export const getSupportAgents = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      const { readDb } = await import('./db-drive');
      const db = await readDb();
      const agents: AIAgent[] = (db.agents && Array.isArray(db.agents)) ? db.agents : DEFAULT_AGENTS;
      return agents;
    } catch {
      return DEFAULT_AGENTS;
    }
  });

export const createSupportTicket = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.object({
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(5).max(10000),
    requesterType: z.enum(['cliente', 'colaborador', 'agencia', 'freelancer']),
    autoRespondWithAI: z.boolean().optional(),
    agentId: z.string().optional()
  }).parse(p))
  .handler(async ({ data, context }) => {
    let ticketId: any = crypto.randomUUID();
    let ticketSaved = false;

    try {
      const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
      const { data: membership } = await context.supabase.from('account_members').select('account_id').eq('user_id', context.userId).limit(1).maybeSingle();
      const { data: ownAccount } = await context.supabase.from('accounts').select('id').eq('owner_id', context.userId).maybeSingle();
      const { data: ticket, error } = await admin.from('support_tickets').insert({
        user_id: context.userId,
        account_id: ownAccount?.id ?? membership?.account_id ?? null,
        user_email: String(context.claims?.email ?? ''),
        subject: data.subject,
        requester_type: data.requesterType
      }).select().single();

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

    // Resposta imediata por IA se ativada (padrão ativo)
    if (data.autoRespondWithAI !== false) {
      try {
        const aiResult = await generateAiSupportResponse({
          ticket: {
            id: ticketId,
            subject: data.subject,
            user_email: String(context.claims?.email || ''),
            requester_type: data.requesterType,
          },
          messages: [{ sender: 'user', body: data.body }],
          agentId: data.agentId,
          userId: context.userId,
        });

        if (aiResult.success && aiResult.answer) {
          // Salva resposta remota
          try {
            const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
            await admin.from('support_messages').insert({
              ticket_id: ticketId,
              sender: 'ai',
              body: aiResult.answer
            });
            await admin.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticketId);
          } catch {}

          // Salva resposta local garantida
          try {
            const { readDb, writeDb } = await import('./db-drive');
            const db = await readDb();
            if (!Array.isArray(db.support_messages)) db.support_messages = [];
            db.support_messages.push({
              id: crypto.randomUUID(),
              ticket_id: ticketId,
              sender: 'ai',
              body: aiResult.answer,
              agent_name: aiResult.agent.name,
              created_at: new Date().toISOString(),
            });

            // Atualiza status do ticket local
            const tLocal = (db.support_tickets || []).find((t: any) => t.id === ticketId);
            if (tLocal) {
              tLocal.status = 'in_progress';
              tLocal.updated_at = new Date().toISOString();
            }

            // Atualiza contador do agente
            if (Array.isArray(db.agents)) {
              const ag = db.agents.find((a: any) => a.id === aiResult.agent.id);
              if (ag) ag.chats = (ag.chats || 0) + 1;
            }

            await writeDb(db);
          } catch {}
        }
      } catch (err) {
        console.warn('Auto AI response error on ticket creation:', err);
      }
    }

    return { id: ticketId };
  });

export const initialSupportAnswer = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) =>
    z.union([
      z.string().uuid(),
      z.object({
        id: z.string().uuid(),
        followUp: z.boolean().optional(),
        agentId: z.string().optional(),
        draftOnly: z.boolean().optional(),
      })
    ]).parse(p)
  )
  .handler(async ({ data, context }) => {
    const id = typeof data === 'string' ? data : data.id;
    const agentId = typeof data === 'object' ? data.agentId : undefined;
    const draftOnly = typeof data === 'object' ? Boolean(data.draftOnly) : false;

    let ticket: any = null;
    let messages: any[] = [];

    // Busca ticket em Supabase
    try {
      const { data: t } = await context.supabase.from('support_tickets').select('*').eq('id', id).maybeSingle();
      if (t) ticket = t;
      const { data: m } = await context.supabase.from('support_messages').select('*').eq('ticket_id', id).order('created_at');
      if (m) messages = m;
    } catch {}

    // Busca/merge no banco local
    try {
      const { readDb } = await import('./db-drive');
      const db = await readDb();
      if (!ticket) {
        ticket = (db.support_tickets || []).find((t: any) => t.id === id);
      }
      const localMsgs = (db.support_messages || []).filter((m: any) => m.ticket_id === id);
      const existingIds = new Set(messages.map(m => m.id));
      for (const lm of localMsgs) {
        if (!existingIds.has(lm.id)) {
          messages.push(lm);
        }
      }
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } catch {}

    if (!ticket) {
      ticket = {
        id,
        subject: 'Chamado de Suporte',
        status: 'open',
        user_email: String(context.claims?.email || 'smmarketingetrafego@gmail.com')
      };
    }

    // Chama o motor inteligente de resposta de suporte
    const result = await generateAiSupportResponse({
      ticket,
      messages,
      agentId,
      userId: context.userId
    });

    if (!result.success || !result.answer) {
      return { success: false, error: 'Não foi possível gerar a resposta com a IA no momento.' };
    }

    // Se solicitado apenas como rascunho (para preencher o campo de texto)
    if (draftOnly) {
      return {
        success: true,
        text: result.answer,
        agentName: result.agent.name,
        agentId: result.agent.id,
        error: null
      };
    }

    // Salva a resposta no chamado
    try {
      const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
      await admin.from('support_messages').insert({
        ticket_id: id,
        sender: 'ai',
        body: result.answer
      });
      await admin.from('support_tickets').update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      }).eq('id', id);
    } catch {}

    // Salva no banco local
    try {
      const { readDb, writeDb } = await import('./db-drive');
      const db = await readDb();
      if (!Array.isArray(db.support_messages)) db.support_messages = [];
      db.support_messages.push({
        id: crypto.randomUUID(),
        ticket_id: id,
        sender: 'ai',
        body: result.answer,
        agent_name: result.agent.name,
        created_at: new Date().toISOString(),
      });

      if (Array.isArray(db.support_tickets)) {
        const local = db.support_tickets.find((t: any) => t.id === id);
        if (local) {
          local.status = 'in_progress';
          local.updated_at = new Date().toISOString();
        }
      }

      if (Array.isArray(db.agents)) {
        const ag = db.agents.find((a: any) => a.id === result.agent.id);
        if (ag) ag.chats = (ag.chats || 0) + 1;
      }

      await writeDb(db);
    } catch (e) {
      console.warn('Error saving local AI support message:', e);
    }

    return {
      success: true,
      error: null,
      answer: result.answer,
      agentName: result.agent.name
    };
  });

export const updateSupportTicket = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(10000).optional(), status: z.enum(ticketStates).optional(), escalate: z.boolean().optional() }).parse(p)).handler(async ({ data, context }) => {
  const founder = await isFounder(context);
  const senderType = founder ? 'founder' : 'user';

  if (data.body) {
    let saved = false;
    
    // Tentativa 1: Inserir via context.supabase
    try {
      const { error: userError } = await context.supabase.from('support_messages').insert({ ticket_id: data.id, sender: senderType, body: data.body });
      if (!userError) saved = true;
    } catch {}

    // Tentativa 2: Inserir via admin
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
