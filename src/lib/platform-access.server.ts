import { requireFounder } from './platform-rules';
export async function founderAccess(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from('platform_admins').select('user_id').eq('user_id', context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  requireFounder(!!data);
  return (await import('@/integrations/supabase/client.server')).supabaseAdmin;
}
export async function isFounder(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from('platform_admins').select('user_id').eq('user_id', context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}
