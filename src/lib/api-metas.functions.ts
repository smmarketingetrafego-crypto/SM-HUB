import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface MetaRecord {
  id: string;
  title: string;
  category: "Financeiro" | "Comercial" | "Operacional" | "Marketing";
  period: "Mensal" | "Trimestral" | "Anual";
  targetValue: number;
  currentValue: number;
  unit: "BRL" | "QUANTITY" | "PERCENT";
  autoSync: boolean;
  autoSyncSource?: "faturamento" | "clientes" | "vendas" | "projetos" | "leads";
  deadline: string;
  status: "Em Andamento" | "Atingida" | "Em Risco" | "Superada";
  description?: string;
  rewardNotes?: string;
  createdAt: string;
}

export const DEFAULT_METAS: MetaRecord[] = [];

export const getMetas = createServerFn({ method: "GET" }).handler(async () => {
  const db = await readDb();
  let metas: MetaRecord[] = db.metas && Array.isArray(db.metas) && db.metas.length > 0 ? db.metas : DEFAULT_METAS;

  const transactions = db.transactions || [];
  const clients = db.clients || [];
  const projects = db.projects || [];
  const pipelines = db.pipelines || [];
  const leads = db.leads || [];

  // Calcular métricas reais do sistema
  const totalFaturamentoReal = transactions
    .filter((t: any) => (t.type === "in" || t.amount > 0) && (t.status === "Recebido" || t.status === "Pago" || t.status === "completed"))
    .reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount) || 0), 0);

  const totalClientsActive = clients.filter((c: any) => c.status !== "Inativo").length || clients.length || 0;

  const totalSalesCount = transactions.filter((t: any) =>
    t.isSale || (t.desc && t.desc.includes("Venda")) || (t.cat && t.cat.includes("Venda"))
  ).length || 0;

  const totalProjectsCount = projects.length || 0;

  // Total de leads nas etapas das pipelines + lista de leads
  let pipelineDealsCount = 0;
  if (Array.isArray(pipelines)) {
    pipelines.forEach((p: any) => {
      if (Array.isArray(p.stages)) {
        p.stages.forEach((s: any) => {
          if (Array.isArray(s.deals)) {
            pipelineDealsCount += s.deals.length;
          }
        });
      }
    });
  }
  const totalLeadsCount = Math.max(pipelineDealsCount, Array.isArray(leads) ? leads.length : 0);

  // Sincronizar dinamicamente metas com autoSync ativo
  metas = metas.map((m) => {
    let current = m.currentValue;

    if (m.autoSync && m.autoSyncSource) {
      if (m.autoSyncSource === "faturamento") {
        current = totalFaturamentoReal;
      } else if (m.autoSyncSource === "clientes") {
        current = totalClientsActive;
      } else if (m.autoSyncSource === "vendas") {
        current = totalSalesCount;
      } else if (m.autoSyncSource === "projetos") {
        current = totalProjectsCount;
      } else if (m.autoSyncSource === "leads") {
        current = totalLeadsCount;
      }
    }

    const progressPercent = m.targetValue > 0 ? (current / m.targetValue) * 100 : 0;
    let status = m.status;

    if (progressPercent >= 110) {
      status = "Superada";
    } else if (progressPercent >= 100) {
      status = "Atingida";
    } else if (progressPercent < 40) {
      status = "Em Risco";
    } else {
      status = "Em Andamento";
    }

    return {
      ...m,
      currentValue: current,
      status
    };
  });

  return {
    metas,
    summary: {
      totalMetas: metas.length,
      achievedMetas: metas.filter((m) => m.status === "Atingida" || m.status === "Superada").length,
      inProgressMetas: metas.filter((m) => m.status === "Em Andamento").length,
      atRiskMetas: metas.filter((m) => m.status === "Em Risco").length,
      averageProgress: Math.round(
        metas.reduce((acc, m) => acc + Math.min(100, m.targetValue > 0 ? (m.currentValue / m.targetValue) * 100 : 0), 0) /
        (metas.length || 1)
      ),
      primaryRevenueMeta: metas.find((m) => m.autoSyncSource === "faturamento") || metas[0]
    }
  };
});

export const addMeta = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as Omit<MetaRecord, "id" | "createdAt">)
  .handler(async ({ data }) => {
    const db = await readDb();
    const metas: MetaRecord[] = db.metas && Array.isArray(db.metas) ? db.metas : [...DEFAULT_METAS];

    const newMeta: MetaRecord = {
      ...data,
      id: "meta-" + Date.now(),
      createdAt: new Date().toISOString().split("T")[0],
      currentValue: Number(data.currentValue) || 0,
      targetValue: Number(data.targetValue) || 100,
      status: "Em Andamento"
    };

    metas.unshift(newMeta);
    db.metas = metas;
    await writeDb(db);

    return { success: true, meta: newMeta };
  });

export const updateMeta = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d as MetaRecord)
  .handler(async ({ data }) => {
    const db = await readDb();
    let metas: MetaRecord[] = db.metas && Array.isArray(db.metas) ? db.metas : [...DEFAULT_METAS];

    const index = metas.findIndex((m) => m.id === data.id);
    if (index === -1) {
      return { success: false, error: "Meta não encontrada." };
    }

    metas[index] = {
      ...metas[index],
      ...data,
      currentValue: Number(data.currentValue) || 0,
      targetValue: Number(data.targetValue) || 100
    };

    db.metas = metas;
    await writeDb(db);

    return { success: true, meta: metas[index] };
  });

export const deleteMeta = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const db = await readDb();
    let metas: MetaRecord[] = db.metas && Array.isArray(db.metas) ? db.metas : [...DEFAULT_METAS];

    metas = metas.filter((m) => m.id !== id);
    db.metas = metas;
    await writeDb(db);

    return { success: true };
  });

export const quickUpdateMetaProgress = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; increment: number }) => d)
  .handler(async ({ data }) => {
    const db = await readDb();
    let metas: MetaRecord[] = db.metas && Array.isArray(db.metas) ? db.metas : [...DEFAULT_METAS];

    const index = metas.findIndex((m) => m.id === data.id);
    if (index === -1) {
      return { success: false, error: "Meta não encontrada." };
    }

    const current = Math.max(0, (metas[index].currentValue || 0) + data.increment);
    metas[index].currentValue = current;

    const progressPercent = metas[index].targetValue > 0 ? (current / metas[index].targetValue) * 100 : 0;
    if (progressPercent >= 110) {
      metas[index].status = "Superada";
    } else if (progressPercent >= 100) {
      metas[index].status = "Atingida";
    } else if (progressPercent < 40) {
      metas[index].status = "Em Risco";
    } else {
      metas[index].status = "Em Andamento";
    }

    db.metas = metas;
    await writeDb(db);

    return { success: true, meta: metas[index] };
  });
