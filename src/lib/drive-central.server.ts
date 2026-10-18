export async function driveRequest(path: string, init: RequestInit = {}) {
  const key = process.env['GOOGLE_DRIVE_API_KEY']; const lovableKey = process.env['LOVABLE_API_KEY'];
  if (!key || !lovableKey) throw new Error('Drive central ainda não conectado.');
  const response = await fetch(`https://connector-gateway.lovable.dev/google_drive${path}`, { ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': key } });
  if (!response.ok) { const body = await response.text(); console.error(`Drive failed [${response.status}]: ${body}`); throw new Error(`Google Drive [${response.status}]: ${body}`); }
  return response;
}
export async function ensureAccountFolder(accountId: string) {
  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
  const { data: known, error } = await admin.from('account_drive_folders').select('folder_id').eq('account_id', accountId).maybeSingle();
  if (error) throw new Error(error.message);
  if (known) return known.folder_id;
  const { data: settings, error: settingsError } = await admin.from('platform_settings').select('drive_root_id').eq('id', true).maybeSingle();
  if (settingsError) throw new Error(settingsError.message);
  let rootId = settings?.drive_root_id;
  if (!rootId) {
    const root = await (await driveRequest('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'SM Hub — Contas', mimeType: 'application/vnd.google-apps.folder', appProperties: { smhub: 'central' } }) })).json() as { id: string };
    const { error: saveError } = await admin.from('platform_settings').upsert({ id: true, drive_root_id: root.id });
    if (saveError) throw new Error(saveError.message);
    rootId = root.id;
  }
  const folder = await (await driveRequest('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: accountId, mimeType: 'application/vnd.google-apps.folder', parents: [rootId], appProperties: { smhub_account: accountId } }) })).json() as { id: string };
  const { error: folderError } = await admin.from('account_drive_folders').insert({ account_id: accountId, folder_id: folder.id });
  if (folderError) {
    // Another request may have prepared the folder; always read the authoritative mapping.
    const { data: canonical } = await admin.from('account_drive_folders').select('folder_id').eq('account_id', accountId).maybeSingle();
    if (canonical) return canonical.folder_id;
    throw new Error(folderError.message);
  }
  return folder.id;
}
