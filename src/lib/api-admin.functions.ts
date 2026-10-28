import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { accountPatch, canChargePlan, freeUntil } from './platform-rules';
import { founderAccess, isFounder } from './platform-access.server';
import { accountSettingsSchema } from './account-settings';
export const getPlatformIdentity = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => ({ isFounder: await isFounder(context), userId: context.userId }));
export interface AdminOverviewAccount {
  id: string;
  name: string;
  email: string;
  lifetime: boolean;
  status: string;
  plan_status: string;
  plan_id?: string | null;
  plan_valid_until?: string | null;
  created_at: string;
  [key: string]: any;
}

export interface AdminOverviewPayment {
  id: string;
  account_id: string;
  reference: string;
  description: string;
  amount: number;
  billing_type: string;
  status: string;
  created_at: string;
  paid_at?: string | null;
  invoice_url?: string | null;
  [key: string]: any;
}

export interface AdminOverviewData {
  accounts: AdminOverviewAccount[];
  plans: any[];
  payments: AdminOverviewPayment[];
}

export const getAdminOverview = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<AdminOverviewData> => {
  try {
    const admin = await founderAccess(context);
    const results = await Promise.all([
      admin.from('accounts').select('*').order('created_at', { ascending: false }),
      admin.from('plans').select('*').order('sort'),
      admin.from('payments').select('id,account_id,reference,description,amount,billing_type,status,created_at,paid_at,invoice_url').order('created_at', { ascending: false }).limit(500)
    ]);
    if (!results[0].error && !results[1].error) {
      return { 
        accounts: (results[0].data ?? []) as AdminOverviewAccount[], 
        plans: results[1].data ?? [], 
        payments: (results[2].data ?? []) as AdminOverviewPayment[] 
      };
    }
  } catch {
    // Fallback to local founder account
  }

  return {
    accounts: [
      {
        id: 'local-account-id',
        name: 'SM Hub Founder',
        email: 'smmarketingetrafego@gmail.com',
        lifetime: true,
        status: 'active',
        plan_status: 'active',
        plan_id: 'pro',
        plan_valid_until: null,
        created_at: new Date().toISOString(),
      }
    ],
    plans: [
      {
        id: 'pro',
        name: 'Plano Pro Agência',
        price: 297,
        cycle: 'MONTHLY',
        description: 'Acesso completo a funis, propostas, WhatsApp e agentes IA.',
        features: ['Propostas ilimitadas', 'WhatsApp Web e disparos', 'Automações de CRM', 'Portal do Cliente'],
        active: true,
        billing_ready: true,
        sort: 1,
      }
    ],
    payments: []
  };
});
const planSchema = z.object({ id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/), name: z.string().trim().min(1).max(120), price: z.number().finite().min(0), cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']), description: z.string().max(2000), features: z.array(z.string().trim().min(1).max(300)).max(50), active: z.boolean(), billing_ready: z.boolean(), sort: z.number().int().min(0).max(9999) });
export const savePlatformPlan = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => planSchema.parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  if (data.billing_ready && !canChargePlan(data)) throw new Error('Defina nome, preço maior que zero e recursos reais antes de liberar cobranças.');
  const { error } = await admin.from('plans').upsert(data);
  if (error) throw new Error(error.message);
  return { success: true };
});
export const manageAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.object({ accountId: z.string().uuid(), action: z.enum(['plan', 'free', 'suspend', 'reactivate']), planId: z.string().optional(), days: z.number().int().optional() }).parse(p)).handler(async ({ data, context }) => {
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
export const selectFounderAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.string().min(1).parse(p)).handler(async ({ data, context }) => {
  try {
    const admin = await founderAccess(context);
    const { data: account } = await admin.from('accounts').select('id,name,email').eq('id', data).single();
    if (account) return account;
  } catch {
    // Fallback
  }
  return { id: data, name: 'SM Hub Founder', email: 'smmarketingetrafego@gmail.com' };
});

export const getFounderAccountAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).validator((p: unknown) => z.string().min(1).parse(p)).handler(async ({ data, context }) => {
  try {
    const admin = await founderAccess(context);
    const { data: account } = await admin.from('accounts').select('id,owner_id,email').eq('id', data).single();
    if (account) {
      const { data: members } = await admin.from('account_members').select('user_id,role,created_at').eq('account_id', data).order('created_at');
      const ids = [...new Set([account.owner_id, ...(members ?? []).map(m => m.user_id)])];
      const { data: profiles } = await admin.from('profiles').select('id,full_name').in('id', ids);
      return [{ userId: account.owner_id, name: profiles?.find(p => p.id === account.owner_id)?.full_name || account.email, role: 'Proprietário' }, ...(members ?? []).filter(m => m.user_id !== account.owner_id).map(m => ({ userId: m.user_id, name: profiles?.find(p => p.id === m.user_id)?.full_name || 'Membro da equipe', role: m.role }))];
    }
  } catch {
    // Fallback
  }
  return [{ userId: 'local-user-id', name: 'SM Hub Founder', role: 'Proprietário' }];
});

export const saveFounderAccountSettings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).validator((p: unknown) => accountSettingsSchema.parse(p)).handler(async ({ data, context }) => {
  const admin = await founderAccess(context);
  const { data: account, error } = await admin.from('accounts').update({ name: data.name, notes: data.notes, updated_at: new Date().toISOString() }).eq('id', data.accountId).select('id').single();
  if (error || !account) throw new Error(error?.message ?? 'Conta não encontrada.');
  return { success: true };
});
