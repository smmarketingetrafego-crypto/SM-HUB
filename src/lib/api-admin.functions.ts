import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { accountPatch, canChargePlan, freeUntil } from './platform-rules';
import { founderAccess, isFounder } from './platform-access.server';
import { accountSettingsSchema } from './account-settings';
export const getPlatformIdentity = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => ({ isFounder: await isFounder(context), userId: context.userId }));
export const getAdminOverview = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const admin = await founderAccess(context);
  const results = await Promise.all([admin.from('accounts').select('*').order('created_at', { ascending: false }), admin.from('plans').select('*').order('sort'), admin.from('payments').select('id,account_id,reference,description,amount,billing_type,status,created_at,paid_at,invoice_url').order('created_at', { ascending: false }).limit(500)]);
  for (const r of results) if (r.error) throw new Error(r.error.message);
  return { accounts: results[0].data ?? [], plans: results[1].data ?? [], payments: results[2].data ?? [] };
});
const planSchema = z.object({ id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/), name: z.string().trim().min(1).max(120), price: z.number().finite().min(0), cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']), description: z.string().max(2000), features: z.array(z.string().trim().min(1).max(300)).max(50), active: z.boolean(), billing_ready: z.boolean(), sort: z.number().int().min(0).max(9999) });
export const savePlatformPlan = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => planSchema.parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  if (data.billing_ready && !canChargePlan(data)) throw new Error('Defina nome, preço maior que zero e recursos reais antes de liberar cobranças.');
  const { error } = await admin.from('plans').upsert(data);
  if (error) throw new Error(error.message);
  return { success: true };
});
export const manageAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.object({ accountId: z.string().uuid(), action: z.enum(['plan', 'free', 'suspend', 'reactivate']), planId: z.string().optional(), days: z.number().int().optional() }).parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  const { data: acc, error } = await admin.from('accounts').select('id,lifetime').eq('id', data.accountId).single();
  if (error || !acc) throw new Error('Conta não encontrada.');
  let patch: Record<string, unknown>;
  if (data.action === 'suspend' || data.action === 'reactivate') patch = accountPatch(data.action, acc.lifetime);
  else {
    if (acc.lifetime) throw new Error('O acesso vitalício do fundador está protegido.');
    if (data.action === 'free') patch = { plan_status: 'active', plan_valid_until: freeUntil(data.days ?? 0) };
    else {
      const { data: plan } = await admin.from('plans').select('id').eq('id', data.planId ?? '').maybeSingle();
      if (!plan) throw new Error('Selecione um plano válido.');
      patch = { plan_id: plan.id };
    }
  }
  const { error: updateError } = await admin.from('accounts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', acc.id);
  if (updateError) throw new Error(updateError.message);
  return { success: true };
});
export const selectFounderAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.string().uuid().parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  const { data: account, error } = await admin.from('accounts').select('id,name,email').eq('id', data).single();
  if (error || !account) throw new Error('Conta não encontrada.');
  return account;
});

export const getFounderAccountAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.string().uuid().parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  const { data: account, error } = await admin.from('accounts').select('id,owner_id,email').eq('id', data).single();
  if (error || !account) throw new Error('Conta não encontrada.');
  const { data: members, error: memberError } = await admin.from('account_members').select('user_id,role,created_at').eq('account_id', data).order('created_at');
  if (memberError) throw new Error(memberError.message);
  const ids = [...new Set([account.owner_id, ...(members ?? []).map(m => m.user_id)])];
  const { data: profiles, error: profileError } = await admin.from('profiles').select('id,full_name').in('id', ids);
  if (profileError) throw new Error(profileError.message);
  return [{ userId: account.owner_id, name: profiles?.find(p => p.id === account.owner_id)?.full_name || account.email, role: 'Proprietário' }, ...(members ?? []).filter(m => m.user_id !== account.owner_id).map(m => ({ userId: m.user_id, name: profiles?.find(p => p.id === m.user_id)?.full_name || 'Membro da equipe', role: m.role }))];
});

export const saveFounderAccountSettings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => accountSettingsSchema.parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  const { data: account, error } = await admin.from('accounts').update({ name: data.name, notes: data.notes, updated_at: new Date().toISOString() }).eq('id', data.accountId).select('id').single();
  if (error || !account) throw new Error(error?.message ?? 'Conta não encontrada.');
  return { success: true };
});
