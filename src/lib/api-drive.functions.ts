import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAccountId } from './db-drive';
import { z } from 'zod';
export const getDriveSetup = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async () => {
  const accountId = await resolveAccountId();
  const connected = !!process.env['GOOGLE_DRIVE_API_KEY'];
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: folder, error } = await supabaseAdmin.from('account_drive_folders').select('folder_id').eq('account_id', accountId).maybeSingle();
  if (error) throw new Error(error.message);
  const { data: files, error: filesError } = await supabaseAdmin.from('account_drive_files').select('id,name,mime_type,created_at').eq('account_id', accountId).order('created_at', { ascending: false });
  if (filesError) throw new Error(filesError.message);
  return { accountId, folderId: folder?.folder_id ?? null, connected, status: connected ? folder ? 'ready' : 'awaiting_folder' : 'awaiting_connection', files: files ?? [] };
});
export const prepareDriveFolder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async () => {
  const accountId = await resolveAccountId();
  const { ensureAccountFolder } = await import('./drive-central.server');
  return { folderId: await ensureAccountFolder(accountId) };
});
export const uploadAccountFile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.object({ name: z.string().trim().min(1).max(200), mimeType: z.string().max(150), base64: z.string().max(14000000).regex(/^[A-Za-z0-9+/]*={0,2}$/) }).parse(p)).handler(async ({ data }) => {
  const accountId = await resolveAccountId();
  const { ensureAccountFolder, driveRequest } = await import('./drive-central.server');
  const folderId = await ensureAccountFolder(accountId);
  const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Arquivo maior que 10 MB.');
  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify({ name: data.name, parents: [folderId] })], { type: 'application/json' }));
  body.append('file', new Blob([bytes], { type: data.mimeType || 'application/octet-stream' }), data.name);
  const uploaded = await (await driveRequest('/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType', { method: 'POST', body })).json() as { id: string; name: string; mimeType: string };
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
  const { error } = await admin.from('account_drive_files').insert({ account_id: accountId, file_id: uploaded.id, name: uploaded.name, mime_type: uploaded.mimeType });
  if (error) throw new Error(error.message);
  return { success: true };
});
export const downloadAccountFile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((p: unknown) => z.string().uuid().parse(p)).handler(async ({ data }) => {
  const accountId = await resolveAccountId();
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
  const { data: file, error } = await admin.from('account_drive_files').select('file_id,name,mime_type').eq('id', data).eq('account_id', accountId).single();
  if (error || !file) throw new Error('Arquivo não encontrado nesta conta.');
  const { driveRequest } = await import('./drive-central.server');
  const response = await driveRequest(`/drive/v3/files/${encodeURIComponent(file.file_id)}?alt=media`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Arquivo maior que o limite de download.');
  let binary = ''; for (const value of bytes) binary += String.fromCharCode(value);
  return { name: file.name, mimeType: file.mime_type, base64: btoa(binary) };
});
