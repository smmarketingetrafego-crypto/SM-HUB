import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
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
  .validator((data: { pipelineId?: string; stageName: string; deal: { client: string; value: number; email?: string; phone?: string } }) => data)
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
      return { success: true, deal: newDeal, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to add deal:", e);
      return { success: false, error: e.message };
    }
  });

export const moveLeadDeal = createServerFn({ method: "POST" })
  .validator((data: { pipelineId?: string; fromStage: string; toStage: string; clientName: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines) return { success: false, error: "No pipelines found" };
      const pIdx = data.pipelineId ? db.pipelines.findIndex((p: any) => p.id === data.pipelineId) : 0;
      const targetPipeline = pIdx !== -1 ? db.pipelines[pIdx] : db.pipelines[0];

      const fromStage = targetPipeline.stages.find((s: any) => s.name === data.fromStage);
      const toStage = targetPipeline.stages.find((s: any) => s.name === data.toStage);

      if (!fromStage || !toStage) return { success: false, error: "Stage not found" };

      const dealIdx = fromStage.deals.findIndex((d: any) => d.client === data.clientName);
      if (dealIdx === -1) return { success: false, error: "Deal not found" };

      const [deal] = fromStage.deals.splice(dealIdx, 1);
      deal.stage = toStage.name;
      toStage.deals.push(deal);

      await writeDb(db);
      return { success: true, pipelines: db.pipelines };
    } catch (e: any) {
      console.error("Failed to move deal:", e);
      return { success: false, error: e.message };
    }
  });

export const removeLeadDeal = createServerFn({ method: "POST" })
  .validator((data: { pipelineId?: string; stageName: string; clientName: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.pipelines) return { success: true };
      const pIdx = data.pipelineId ? db.pipelines.findIndex((p: any) => p.id === data.pipelineId) : 0;
      const targetPipeline = pIdx !== -1 ? db.pipelines[pIdx] : db.pipelines[0];

      const stage = targetPipeline.stages.find((s: any) => s.name === data.stageName);
      if (stage) {
        stage.deals = stage.deals.filter((d: any) => d.client !== data.clientName);
      }

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
