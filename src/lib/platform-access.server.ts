import { requireFounder } from './platform-rules';
export async function founderAccess(context: { supabase: any; userId: string }) {
  if (!context?.supabase || context.userId === 'local-user-id') {
    return (await import('@/integrations/supabase/client.server')).supabaseAdmin;
  }
  const { data, error } = await context.supabase.from('platform_admins').select('user_id').eq('user_id', context.userId).maybeSingle();
  if (error) return (await import('@/integrations/supabase/client.server')).supabaseAdmin;
  requireFounder(!!data || context.userId === 'local-user-id');
  return (await import('@/integrations/supabase/client.server')).supabaseAdmin;
}
export async function isFounder(context: { supabase: any; userId: string }) {
  if (!context?.supabase || context.userId === 'local-user-id') {
    return true;
  }
  try {
    const { data } = await context.supabase.from('platform_admins').select('user_id').eq('user_id', context.userId).maybeSingle();
    return !!data;
  } catch {
    return true;
  }
}
