import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { notifyAccount, accountOf } from "./notifications.server";
import type { Pipeline } from "@/data/extra";

export const DEFAULT_PIPELINE: Pipeline = {
  id: "pipeline-principal",
  name: "Pipeline Principal",
  stages: [
    { name: "Novo Lead", deals: [] },
    { name: "Qualificação", deals: [] },
    { name: "Proposta Enviada", deals: [] },
    { name: "Negociação", deals: [] },
    { name: "Fechado - Ganho", deals: [] },
    { name: "Fechado - Perdido", deals: [] },
  ],
};

export const getPipelines = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.pipelines || !Array.isArray(db.pipelines) || db.pipelines.length === 0) {
      db.pipelines = [DEFAULT_PIPELINE];
      await writeDb(db);
    }
    return db.pipelines as Pipeline[];
  } catch (e: any) {
    console.error("Failed to read pipelines:", e);
    return [DEFAULT_PIPELINE];
  }
});

export const addLeadDeal = createServerFn({ method: "POST" })
  .validator((data: { pipelineId?: string; stageName: string; deal: { client: string; value: number; email?: string; phone?: string; owner?: string } }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines || db.pipelines.length === 0) {
        db.pipelines = [DEFAULT_PIPELINE];
      }
      const pIdx = data.pipelineId ? db.pipelines.findIndex((p: any) => p.id === data.pipelineId) : 0;
      const targetPipeline = pIdx !== -1 ? db.pipelines[pIdx] : db.pipelines[0];
      
      let stage = targetPipeline.stages.find((s: any) => s.name === data.stageName);
      if (!stage) {
        stage = targetPipeline.stages[0];
      }

      const newDeal = {
        ...data.deal,
        id: `deal_${Date.now()}`,
        stage: stage.name,
        createdAt: new Date().toISOString(),
      };
      stage.deals.push(newDeal);

      await writeDb(db);
      await notifyAccount(accountOf(db), { kind: "lead", title: "Novo lead", body: String(newDeal.client || ""), link: "/pipelines" });
      return { success: true, deal: newDeal, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to add deal:", e);
      return { success: false, error: e.message };
    }
  });

export const moveLeadDeal = createServerFn({ method: "POST" })
  .validator((data: { pipelineId?: string; fromStage?: string; toStage: string; clientName: string; dealId?: string; dealData?: any }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines || !Array.isArray(db.pipelines) || db.pipelines.length === 0) {
        db.pipelines = [DEFAULT_PIPELINE];
      }
      const pIdx = data.pipelineId ? db.pipelines.findIndex((p: any) => p.id === data.pipelineId) : 0;
      const targetPipeline = pIdx !== -1 ? db.pipelines[pIdx] : db.pipelines[0];

      // Garante que o estágio de destino existe
      let toStage = targetPipeline.stages.find((s: any) => s.name === data.toStage);
      if (!toStage) {
        toStage = { name: data.toStage, deals: [] };
        targetPipeline.stages.push(toStage);
      }
      if (!Array.isArray(toStage.deals)) toStage.deals = [];

      // Procura o deal em TODAS as etapas do funil para garantir movimentação precisa
      let foundDeal: any = null;
      for (const st of targetPipeline.stages) {
        if (!Array.isArray(st.deals)) st.deals = [];
        const idx = st.deals.findIndex((d: any) => 
          (data.dealId && (d.id === data.dealId || d._id === data.dealId)) ||
          (data.clientName && String(d.client || "").trim().toLowerCase() === String(data.clientName || "").trim().toLowerCase())
        );
        if (idx !== -1) {
          [foundDeal] = st.deals.splice(idx, 1);
          break;
        }
      }

      // Se encontrado, atualiza o estágio e adiciona ao destino
      if (foundDeal) {
        foundDeal.stage = toStage.name;
        if (toStage.name.toLowerCase().includes("ganho") && !foundDeal.wonAt) {
          foundDeal.wonAt = new Date().toISOString();
        }
        toStage.deals.push(foundDeal);
      } else {
        // Se por qualquer motivo não estava no servidor, restaura diretamente no destino
        const restored = {
          ...(data.dealData || {}),
          id: data.dealId || `deal_${Date.now()}`,
          client: data.clientName,
          stage: toStage.name,
          createdAt: new Date().toISOString(),
          value: data.dealData?.value ?? 0,
        };
        toStage.deals.push(restored);
      }

      await writeDb(db);
      return { success: true, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to move deal:", e);
      return { success: false, error: e.message };
    }
  });

export const removeLeadDeal = createServerFn({ method: "POST" })
  .validator((data: { pipelineId?: string; stageName?: string; clientName: string; dealId?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines) return { success: true };
      const pIdx = data.pipelineId ? db.pipelines.findIndex((p: any) => p.id === data.pipelineId) : 0;
      const targetPipeline = pIdx !== -1 ? db.pipelines[pIdx] : db.pipelines[0];

      // Remove de todas as etapas para garantir que o lead seja removido sem ficar fantasma
      targetPipeline.stages.forEach((stage: any) => {
        if (Array.isArray(stage.deals)) {
          stage.deals = stage.deals.filter((d: any) => {
            if (data.dealId && (d.id === data.dealId || d._id === data.dealId)) return false;
            if (data.clientName && String(d.client || "").trim().toLowerCase() === String(data.clientName || "").trim().toLowerCase()) return false;
            return true;
          });
        }
      });

      await writeDb(db);
      return { success: true, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to remove deal:", e);
      return { success: false, error: e.message };
    }
  });

export const removeBatchDeals = createServerFn({ method: "POST" })
  .validator((data: { pipelineId?: string; selectedKeys: string[] }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines) return { success: true };
      const pIdx = data.pipelineId ? db.pipelines.findIndex((p: any) => p.id === data.pipelineId) : 0;
      const targetPipeline = pIdx !== -1 ? db.pipelines[pIdx] : db.pipelines[0];

      targetPipeline.stages.forEach((stage: any) => {
        stage.deals = stage.deals.filter((d: any) => !data.selectedKeys.includes(`${stage.name}::${d.client}`));
      });

      await writeDb(db);
      return { success: true, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to remove batch deals:", e);
      return { success: false, error: e.message };
    }
  });

export const addPipeline = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines) db.pipelines = [DEFAULT_PIPELINE];
      const newPipeline: Pipeline = {
        id: `pipeline-${Date.now()}`,
        name: data.name,
        stages: [
          { name: "Novo Lead", deals: [] },
          { name: "Qualificação", deals: [] },
          { name: "Proposta Enviada", deals: [] },
          { name: "Negociação", deals: [] },
          { name: "Fechado - Ganho", deals: [] },
          { name: "Fechado - Perdido", deals: [] },
        ],
      };
      db.pipelines.push(newPipeline);
      await writeDb(db);
      return { success: true, pipeline: newPipeline, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to add pipeline:", e);
      return { success: false, error: e.message };
    }
  });
