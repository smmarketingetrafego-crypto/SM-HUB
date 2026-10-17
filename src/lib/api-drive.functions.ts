import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAccountId } from './db-drive';
export const getDriveSetup = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async () => {
  const accountId = await resolveAccountId();
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: folder, error } = await supabaseAdmin.from('account_drive_folders').select('folder_id').eq('account_id', accountId).maybeSingle();
  if (error) throw new Error(error.message);
  return { accountId, folderId: folder?.folder_id ?? null, connected: false, status: 'awaiting_connection' };
});
