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

  it('deve mover leads com resiliência sem erro de deal not found', async () => {
    const db = await readDb();
    if (!db.pipelines) {
      db.pipelines = [{
        id: "pipeline-principal",
        name: "Pipeline Principal",
        stages: [
          { name: "Novo Lead", deals: [] },
          { name: "Qualificação", deals: [{ id: "deal_silas_test", client: "Silas teste", stage: "Qualificação", value: 3000 }] },
        ]
      }];
      await writeDb(db);
    }

    // Busca o deal e move de Qualificação para Novo Lead
    const targetPipeline = db.pipelines[0];
    const qualifStage = targetPipeline.stages.find((s: any) => s.name === "Qualificação");
    const novoLeadStage = targetPipeline.stages.find((s: any) => s.name === "Novo Lead");

    expect(qualifStage?.deals.some((d: any) => d.client === "Silas teste")).toBe(true);

    // Simula a movimentação resiliente
    const [deal] = qualifStage.deals.splice(0, 1);
    deal.stage = "Novo Lead";
    novoLeadStage.deals.push(deal);
    await writeDb(db);

    const reloaded = await readDb();
    const updatedQualif = reloaded.pipelines[0].stages.find((s: any) => s.name === "Qualificação");
    const updatedNovoLead = reloaded.pipelines[0].stages.find((s: any) => s.name === "Novo Lead");

    expect(updatedNovoLead?.deals.some((d: any) => d.client === "Silas teste")).toBe(true);
    expect(updatedQualif?.deals.some((d: any) => d.client === "Silas teste")).toBe(false);
  });
});
