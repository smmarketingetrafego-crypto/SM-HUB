import { describe, it, expect } from 'vitest';
import { readDb, writeDb } from './db-drive';
import { DEFAULT_INTEGRATIONS } from './api-integracoes.functions';

describe('Real Integrations and Storage Integrity', () => {
  it('DEFAULT_INTEGRATIONS deve iniciar todos os serviços desconectados', () => {
    expect(DEFAULT_INTEGRATIONS.whatsapp.connected).toBe(false);
    expect(DEFAULT_INTEGRATIONS.google.connected).toBe(false);
    expect(DEFAULT_INTEGRATIONS.asaas.connected).toBe(false);
    expect(DEFAULT_INTEGRATIONS.openai.connected).toBe(false);
  });

  it('deve persistir conexão do Google Drive no banco central e permitir desconexão', async () => {
    const db = await readDb();
    if (!db.integrations) db.integrations = {};

    // Conectar
    db.integrations.google = {
      connected: true,
      authMethod: 'google',
      accountEmail: 'suporte.smhub@gmail.com',
      planName: 'Google Drive Sincronizado',
      updatedAt: new Date().toISOString(),
    };
    await writeDb(db);

    const reloaded = await readDb();
    expect(reloaded.integrations?.google?.connected).toBe(true);
    expect(reloaded.integrations?.google?.accountEmail).toBe('suporte.smhub@gmail.com');

    // Desconectar
    reloaded.integrations.google = {
      connected: false,
      authMethod: 'google',
      accountEmail: '',
      updatedAt: new Date().toISOString(),
    };
    await writeDb(reloaded);

    const after = await readDb();
    expect(after.integrations?.google?.connected).toBe(false);
  });

  it('deve persistir e desconectar dados do WhatsApp no banco central', async () => {
    const db = await readDb();
    if (!db.integrations) db.integrations = {};

    db.integrations.whatsapp = {
      phone: '(99) 98550-1962',
      deviceName: 'WhatsApp Web & Click-to-Chat',
      connected: true,
      mode: 'direct',
    };
    await writeDb(db);

    const reloaded = await readDb();
    expect(reloaded.integrations?.whatsapp?.connected).toBe(true);
    expect(reloaded.integrations?.whatsapp?.phone).toBe('(99) 98550-1962');

    // Desconectar
    reloaded.integrations.whatsapp = {
      connected: false,
      phone: '',
    };
    await writeDb(reloaded);

    const after = await readDb();
    expect(after.integrations?.whatsapp?.connected).toBe(false);
  });
});
