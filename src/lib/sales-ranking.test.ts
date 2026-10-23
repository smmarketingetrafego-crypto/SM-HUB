import { describe, expect, it } from "vitest";
import { collectSales, salesInMonth, salesRanking } from "./sales-ranking";

describe("sales ranking", () => {
  it("credits an approved proposal to its responsible person", () => {
    const sales = collectSales([{ status: "aprovado", valor: 1000, responsavel: "Ana", aprovadoEm: "2026-10-05T10:00:00Z" }], []);
    expect(salesRanking(sales)).toEqual([{ seller: "Ana", total: 1000, count: 1 }]);
  });
  it("ignores proposals that were not approved", () => {
    expect(collectSales([{ status: "enviado", valor: 500, responsavel: "Ana" }], [])).toEqual([]);
  });
  it("credits a won deal to the lead's responsible person", () => {
    const pipes = [{ stages: [{ name: "Fechado - Ganho", deals: [{ client: "X", value: 300, owner: "Bruno", wonAt: "2026-10-10T00:00:00Z" }] }, { name: "Negociação", deals: [{ value: 900, owner: "Bruno" }] }] }];
    expect(salesRanking(collectSales([], pipes))).toEqual([{ seller: "Bruno", total: 300, count: 1 }]);
  });
  it("only counts sales of the chosen month", () => {
    const sales = collectSales([{ status: "aprovado", valor: 1, responsavel: "A", aprovadoEm: "2026-09-30T12:00:00Z" }, { status: "aprovado", valor: 2, responsavel: "A", aprovadoEm: "2026-10-01T12:00:00Z" }], []);
    expect(salesInMonth(sales, "2026-10").map((s) => s.value)).toEqual([2]);
  });
});

import { goalProgress } from "./sales-ranking";
describe("goal progress", () => {
  it("counts sales when the goal is a number of sales", () => {
    expect(goalProgress("quantidade", 10, 99999, 5)).toBe(50);
  });
  it("uses value when the goal is money", () => {
    expect(goalProgress("valor", 1000, 250, 9)).toBe(25);
  });
});
