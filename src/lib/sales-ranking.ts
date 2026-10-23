// Sales credit goes to the person responsible for the lead or proposal.
// A sale counts when a proposal is approved or a deal reaches a "ganho" stage.
export type Sale = { seller: string; value: number; date: string; label: string; source: "proposta" | "funil" };

const UNASSIGNED = "Sem responsável";

function brDateToIso(d?: string): string | undefined {
  if (!d) return undefined;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
}

export function collectSales(orcamentos: any[] = [], pipelines: any[] = []): Sale[] {
  const sales: Sale[] = [];
  for (const o of orcamentos) {
    if (o?.status !== "aprovado") continue;
    const date = (o.aprovadoEm && new Date(o.aprovadoEm).toString() !== "Invalid Date" ? new Date(o.aprovadoEm).toISOString() : brDateToIso(o.criadoEm)) ?? "";
    sales.push({ seller: (o.responsavel || "").trim() || UNASSIGNED, value: Number(o.valor) || 0, date, label: o.titulo || o.cliente || "Proposta", source: "proposta" });
  }
  for (const p of pipelines) {
    for (const s of p?.stages ?? []) {
      if (!String(s?.name ?? "").toLowerCase().includes("ganho")) continue;
      for (const d of s.deals ?? []) {
        sales.push({ seller: (d.owner || "").trim() || UNASSIGNED, value: Number(d.value) || 0, date: d.wonAt || d.createdAt || "", label: d.client || "Negócio", source: "funil" });
      }
    }
  }
  return sales;
}

export function salesInMonth(sales: Sale[], yearMonth: string): Sale[] {
  return sales.filter((s) => s.date.startsWith(yearMonth));
}

export function salesRanking(sales: Sale[]): { seller: string; total: number; count: number }[] {
  const map = new Map<string, { seller: string; total: number; count: number }>();
  for (const s of sales) {
    const r = map.get(s.seller) ?? { seller: s.seller, total: 0, count: 0 };
    r.total += s.value;
    r.count += 1;
    map.set(s.seller, r);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
