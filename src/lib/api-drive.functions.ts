import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { resolveAccountId, readDb, writeDb } from './db-drive';
import { z } from 'zod';

export const getDriveSetup = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async () => {
  const accountId = await resolveAccountId();
  const db = await readDb();
  const connected = !!(process.env['GOOGLE_DRIVE_API_KEY'] || (db.integrations?.google?.connected && db.integrations?.google?.accountEmail));
  
  let files: Array<{ id: string; name: string; mime_type: string; created_at: string }> = db.drive_files || [];
  let folderId = db.drive_folder_id || '';

  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: folder } = await supabaseAdmin.from('account_drive_folders').select('folder_id').eq('account_id', accountId).maybeSingle();
    if (folder?.folder_id) folderId = folder.folder_id;
    const { data: supaFiles } = await supabaseAdmin.from('account_drive_files').select('id,name,mime_type,created_at').eq('account_id', accountId).order('created_at', { ascending: false });
    if (supaFiles && supaFiles.length > 0) {
      files = [...files, ...supaFiles];
    }
  } catch {
    // Graceful fallback to local DB storage
  }

  return {
    accountId,
    folderId,
    connected,
    status: connected ? 'ready' : 'disconnected',
    accountEmail: db.integrations?.google?.accountEmail || '',
    files,
  };
});

export const connectGoogleDrive = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.object({
    email: z.string().email(),
    folderId: z.string().optional(),
    apiKey: z.string().optional(),
  }).parse(p))
  .handler(async ({ data }) => {
    const db = await readDb();
    if (!db.integrations) db.integrations = {};
    db.integrations.google = {
      connected: true,
      authMethod: data.apiKey ? 'apikey' : 'google',
      accountEmail: data.email,
      accountName: data.email.split('@')[0],
      planName: 'Google Drive Sincronizado',
      updatedAt: new Date().toISOString(),
      ...(data.apiKey ? { apiKey: data.apiKey } : {}),
    };
    if (data.folderId) {
      db.drive_folder_id = data.folderId;
    }
    await writeDb(db);
    return { success: true, google: db.integrations.google };
  });

export const disconnectGoogleDrive = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const db = await readDb();
    if (db.integrations?.google) {
      db.integrations.google = {
        connected: false,
        authMethod: 'google',
        accountEmail: '',
        accountName: '',
        planName: '',
        updatedAt: new Date().toISOString(),
      };
      await writeDb(db);
    }
    return { success: true };
  });

export const prepareDriveFolder = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async () => {
  const accountId = await resolveAccountId();
  try {
    const { ensureAccountFolder } = await import('./drive-central.server');
    const folderId = await ensureAccountFolder(accountId);
    return { folderId };
  } catch {
    const db = await readDb();
    db.drive_folder_id = `smhub-folder-${accountId}`;
    await writeDb(db);
    return { folderId: db.drive_folder_id };
  }
});

export const uploadAccountFile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) =>
    z.object({
      name: z.string().trim().min(1).max(200),
      mimeType: z.string().max(150),
      base64: z.string().max(14000000).regex(/^[A-Za-z0-9+/]*={0,2}$/),
    }).parse(p)
  )
  .handler(async ({ data }) => {
    const accountId = await resolveAccountId();
    const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('Arquivo maior que 10 MB.');

    const newFile = {
      id: crypto.randomUUID(),
      name: data.name,
      mime_type: data.mimeType || 'application/octet-stream',
      created_at: new Date().toISOString(),
      base64: data.base64,
    };

    const db = await readDb();
    if (!Array.isArray(db.drive_files)) db.drive_files = [];
    db.drive_files.unshift(newFile);
    await writeDb(db);

    // Tentativa opcional de envio ao Google Drive central remoto
    try {
      if (process.env['GOOGLE_DRIVE_API_KEY'] && process.env['LOVABLE_API_KEY']) {
        const { ensureAccountFolder, driveRequest } = await import('./drive-central.server');
        const folderId = await ensureAccountFolder(accountId);
        const body = new FormData();
        body.append('metadata', new Blob([JSON.stringify({ name: data.name, parents: [folderId] })], { type: 'application/json' }));
        body.append('file', new Blob([bytes], { type: data.mimeType || 'application/octet-stream' }), data.name);
        await driveRequest('/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType', { method: 'POST', body });
      }
    } catch (e) {
      console.warn('Google Drive remote sync notice:', e);
    }

    return { success: true, file: { id: newFile.id, name: newFile.name, mime_type: newFile.mime_type, created_at: newFile.created_at } };
  });

export const downloadAccountFile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((p: unknown) => z.string().uuid().parse(p))
  .handler(async ({ data }) => {
    const db = await readDb();
    const localFile = (db.drive_files || []).find((f: any) => f.id === data);
    if (localFile?.base64) {
      return { name: localFile.name, mimeType: localFile.mime_type, base64: localFile.base64 };
    }

    const accountId = await resolveAccountId();
    try {
      const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');
      const { data: file } = await admin.from('account_drive_files').select('file_id,name,mime_type').eq('id', data).eq('account_id', accountId).single();
      if (file) {
        const { driveRequest } = await import('./drive-central.server');
        const response = await driveRequest(`/drive/v3/files/${encodeURIComponent(file.file_id)}?alt=media`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = ''; for (const value of bytes) binary += String.fromCharCode(value);
        return { name: file.name, mimeType: file.mime_type, base64: btoa(binary) };
      }
    } catch {
      // Ignorar e lançar abaixo se não encontrado
    }

    throw new Error('Arquivo não encontrado nesta conta.');
  });
