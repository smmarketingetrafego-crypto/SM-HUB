import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { isFounder } from './platform-access.server';
import { canReadTicket, ticketStates } from './platform-rules';
import { getRequest } from '@tanstack/react-start/server';
export const listSupportTickets = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const founder = await isFounder(context);
  let q = context.supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
  if (!founder) q = q.eq('user_id', context.userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { isFounder: founder, tickets: data ?? [] };
});
export const getSupportTicket = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.string().uuid().parse(p)).handler(async ({ data, context }) => {
  const { data: ticket, error } = await context.supabase.from('support_tickets').select('*').eq('id', data).single();
  if (error || !ticket) throw new Error('Ticket não encontrado.');
  const { data: messages, error: messageError } = await context.supabase.from('support_messages').select('*').eq('ticket_id', data).order('created_at');
  if (messageError) throw new Error(messageError.message);
  return { ticket, messages: messages ?? [] };
});
export const createSupportTicket = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.object({ subject: z.string().trim().min(3).max(200), body: z.string().trim().min(5).max(10000), requesterType: z.enum(['cliente', 'colaborador', 'agencia', 'freelancer']) }).parse(p)).handler(async ({ data, context }) => {
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
  const { data: membership } = await context.supabase.from('account_members').select('account_id').eq('user_id', context.userId).limit(1).maybeSingle();
  const { data: ownAccount } = await context.supabase.from('accounts').select('id').eq('owner_id', context.userId).maybeSingle();
  const { data: ticket, error } = await admin.from('support_tickets').insert({ user_id: context.userId, account_id: ownAccount?.id ?? membership?.account_id ?? null, user_email: String(context.claims.email ?? ''), subject: data.subject, requester_type: data.requesterType }).select().single();
  if (error || !ticket) throw new Error(error?.message ?? 'Não foi possível criar o ticket.');
  const { error: messageError } = await admin.from('support_messages').insert({ ticket_id: ticket.id, sender: 'user', body: data.body });
  if (messageError) throw new Error(messageError.message);
  const { notifyAccount } = await import('./notifications.server');
  await notifyAccount(ticket.account_id, { kind: 'support', title: 'Novo ticket de suporte', body: data.subject, link: `/suporte/${ticket.id}` }, context.userId);
  return { id: ticket.id };
});
export const initialSupportAnswer = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.string().uuid().parse(p)).handler(async ({ data, context }) => {
  const { data: ticket } = await context.supabase.from('support_tickets').select('*').eq('id', data).eq('user_id', context.userId).single();
  if (!ticket) throw new Error('Ticket não encontrado.');
  const { data: existing, error } = await context.supabase.from('support_messages').select('sender,body').eq('ticket_id', data).order('created_at');
  if (error) throw new Error(error.message);
  if (existing?.some(m => m.sender === 'ai') || ticket.needs_human) return { success: true, error: null };
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) return { success: false, error: 'Resposta de IA indisponível. Você pode falar com uma pessoa.' };
  try {
    const { createResponsesCall } = await import('./ai-responses.server');
    const { result } = createResponsesCall(getRequest(), { baseURL: 'https://ai.gateway.lovable.dev/v1', apiKey: key, model: 'openai/gpt-6-astra' }, [{ role: 'user', content: `${ticket.subject}\n${existing?.find(m => m.sender === 'user')?.body ?? ''}` }], 'Você é o suporte inicial do SM Hub. Responda em português com orientação breve e segura. Não invente operações realizadas, preços, configurações, permissões ou integrações ativas. Não solicite senhas nem chaves. Não tem acesso a dados nem ferramentas. Se necessário, indique a opção Falar com uma pessoa.');
    const answer = await result.text;
    if (!answer.trim()) throw new Error('A IA não retornou uma resposta.');
    const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
    const { error: saveError } = await admin.from('support_messages').insert({ ticket_id: data, sender: 'ai', body: answer });
    if (saveError) throw new Error(saveError.message);
    return { success: true, error: null };
  } catch (e: any) {
    console.error('Support AI failed', e.statusCode, e.message);
    return { success: false, error: `Resposta de IA indisponível${e.statusCode ? ` (${e.statusCode})` : ''}. Você pode falar com uma pessoa.` };
  }
});
export const updateSupportTicket = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(10000).optional(), status: z.enum(ticketStates).optional(), escalate: z.boolean().optional() }).parse(p)).handler(async ({ data, context }) => {
  const founder = await isFounder(context);
  const { data: ticket } = await context.supabase.from('support_tickets').select('user_id,status').eq('id', data.id).single();
  if (!ticket || !canReadTicket(founder, context.userId, ticket.user_id)) throw new Error('Acesso negado.');
  if (data.status && !founder) throw new Error('Somente o fundador pode alterar o estado.');
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
  if (data.body) {
    const { error } = await admin.from('support_messages').insert({ ticket_id: data.id, sender: founder ? 'founder' : 'user', body: data.body });
    if (error) throw new Error(error.message);
  }
  const { error } = await admin.from('support_tickets').update({ ...(data.status ? { status: data.status } : {}), ...(data.escalate ? { needs_human: true, status: 'open' } : {}), updated_at: new Date().toISOString() }).eq('id', data.id);
  if (error) throw new Error(error.message);
  return { success: true };
});
