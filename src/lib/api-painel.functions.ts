import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { collectSales, salesInMonth, salesRanking } from "./sales-ranking";

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
  return {
    month: ym,
    total: month.reduce((a, s) => a + s.value, 0),
    count: month.length,
    ranking: salesRanking(month),
    daily,
    latest,
    goal: Number(db.salesBoard?.goal) || 0,
    brand: (db.agencyProfile?.tradeName || db.agencyProfile?.legalName || "SM Hub") as string,
    logo: (db.salesBoard?.logo || "") as string,
  };
});

export const saveSalesBoardSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { goal: number; logo?: string }) => ({ goal: Math.max(0, Number(d.goal) || 0), logo: String(d.logo ?? "").slice(0, 500) }))
  .handler(async ({ data }) => {
    const db = await readDb();
    db.salesBoard = { ...(db.salesBoard ?? {}), ...data };
    await writeDb(db);
    return { ok: true };
  });
