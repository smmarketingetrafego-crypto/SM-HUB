import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { collectSales, salesInMonth, salesRanking, type GoalType } from "./sales-ranking";

export const getSalesBoard = createServerFn({ method: "GET" }).handler(async () => {
  const db = await readDb();
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = salesInMonth(collectSales(db.orcamentos, db.pipelines), ym);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, total: 0 }));
  for (const s of month) {
    const d = Number(s.date.slice(8, 10));
    if (d >= 1 && d <= days) daily[d - 1].total += s.value;
  }
  const latest = [...month].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const tasks: any[] = Array.isArray(db.tasks) ? db.tasks : [];
  const taskStatus = ["A Fazer", "Em Andamento", "Revisão", "Concluído"].map((s) => ({ status: s, count: tasks.filter((t) => t.status === s).length }));
  const urgentTasks = tasks
    .filter((t) => t.status !== "Concluído" && (t.priority === "Urgente" || t.priority === "Alta"))
    .slice(0, 8)
    .map((t) => ({ id: String(t.id), title: String(t.title || ""), priority: String(t.priority || ""), assignee: String(t.assignee?.name || ""), date: String(t.date || "") }));
  const doneBy = new Map<string, number>();
  for (const t of tasks) if (t.status === "Concluído") { const n = t.assignee?.name || "Sem responsável"; doneBy.set(n, (doneBy.get(n) || 0) + 1); }
  const taskRanking = [...doneBy.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

  const pipes: any[] = Array.isArray(db.pipelines) ? db.pipelines : [];
  const stageMap = new Map<string, { count: number; value: number }>();
  const allDeals: any[] = [];
  for (const p of pipes) for (const s of p?.stages ?? []) {
    const r = stageMap.get(s.name) ?? { count: 0, value: 0 };
    for (const d of s.deals ?? []) { r.count++; r.value += Number(d.value) || 0; allDeals.push({ ...d, stage: s.name }); }
    stageMap.set(s.name, r);
  }
  const leadStages = [...stageMap.entries()].map(([name, r]) => ({ name, ...r }));
  const newLeads = allDeals.filter((d) => String(d.createdAt || "").startsWith(ym)).length;
  const recentLeads = allDeals
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 6)
    .map((d) => ({ client: String(d.client || ""), value: Number(d.value) || 0, stage: String(d.stage), owner: String(d.owner || "") }));

  return {
    month: ym,
    total: month.reduce((a, s) => a + s.value, 0),
    count: month.length,
    ranking: salesRanking(month),
    daily,
    latest,
    goal: Number(db.salesBoard?.goal) || 0,
    goalType: (db.salesBoard?.goalType === "quantidade" ? "quantidade" : "valor") as GoalType,
    rotate: Number(db.salesBoard?.rotate) || 0,
    brand: (db.agencyProfile?.tradeName || db.agencyProfile?.legalName || "SM Hub") as string,
    logo: (db.salesBoard?.logo || "") as string,
    tasks: { status: taskStatus, urgent: urgentTasks, ranking: taskRanking, open: tasks.filter((t) => t.status !== "Concluído").length },
    leads: { stages: leadStages, newThisMonth: newLeads, recent: recentLeads, total: allDeals.length },
  };
});

export const saveSalesBoardSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { goal: number; goalType?: GoalType; logo?: string; rotate?: number }) => ({
    goal: Math.max(0, Number(d.goal) || 0),
    goalType: (d.goalType === "quantidade" ? "quantidade" : "valor") as GoalType,
    logo: String(d.logo ?? "").slice(0, 500),
    rotate: [0, 15, 30, 60].includes(Number(d.rotate)) ? Number(d.rotate) : 0,
  }))
  .handler(async ({ data }) => {
    const db = await readDb();
    db.salesBoard = { ...(db.salesBoard ?? {}), ...data };
    await writeDb(db);
    return { ok: true };
  });
