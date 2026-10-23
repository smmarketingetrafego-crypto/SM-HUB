import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Maximize, Settings, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getSalesBoard, saveSalesBoardSettings } from "@/lib/api-painel.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/painel-tv")({
  head: () => ({
    meta: [
      { title: "Painel de Vendas para TV — SM Hub" },
      { name: "description", content: "Números de vendas do mês em tela cheia para TV ou segundo monitor, com ranking e meta." },
      { property: "og:title", content: "Painel de Vendas para TV — SM Hub" },
      { property: "og:description", content: "Ranking de vendedores, gráfico do mês e barra de meta em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesBoard,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1500);
      setV(a + (target - a) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function SalesBoard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["sales-board"], queryFn: () => getSalesBoard(), refetchInterval: 30000 });
  const total = useCountUp(data?.total ?? 0);
  const [celebrate, setCelebrate] = useState(false);
  const lastCount = useRef<number | null>(null);
  const [goal, setGoal] = useState("");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    if (!data) return;
    if (lastCount.current !== null && data.count > lastCount.current) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 5000);
    }
    lastCount.current = data.count;
    setGoal(String(data.goal || ""));
    setLogo(data.logo || "");
  }, [data]);

  const save = async () => {
    await saveSalesBoardSettings({ data: { goal: Number(goal.replace(/\./g, "").replace(",", ".")) || 0, logo } });
    qc.invalidateQueries({ queryKey: ["sales-board"] });
    toast.success("Painel atualizado.");
  };

  if (!data) return <div className="flex min-h-[90vh] items-center justify-center text-muted-foreground">Carregando painel...</div>;

  const pct = data.goal > 0 ? Math.min(100, (data.total / data.goal) * 100) : 0;
  const max = Math.max(1, ...data.daily.map((d) => d.total));
  const [y, m] = data.month.split("-");
  const top = data.ranking[0]?.total || 1;

  return (
    <div className="relative flex min-h-[calc(100dvh-3rem)] flex-col gap-6">
      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 animate-in fade-in">
          <div className="text-center">
            <p className="text-7xl">🎉</p>
            <p className="mt-4 text-5xl font-black text-primary">Nova venda!</p>
            <p className="mt-2 text-2xl text-foreground">{data.latest[0]?.seller} · {brl(data.latest[0]?.value ?? 0)}</p>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {data.logo ? <img src={data.logo} alt={data.brand} className="h-14 w-auto object-contain" /> : <img src="/sm-mark.png" alt="SM Hub" className="h-12 w-auto" />}
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">{data.brand}</h1>
            <p className="text-lg text-muted-foreground">Vendas de {MONTHS[Number(m) - 1]} {y}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar"><Link to="/"><ArrowLeft className="size-5" /></Link></Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Ajustes"><Settings className="size-5" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Ajustes do painel</p>
              <label className="block text-xs text-muted-foreground">Meta do mês (R$)<Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="50000" className="mt-1" /></label>
              <label className="block text-xs text-muted-foreground">Endereço da sua logo (opcional)<Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." className="mt-1" /></label>
              <Button size="sm" className="w-full" onClick={save}>Salvar</Button>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" aria-label="Tela cheia" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize className="size-5" /></Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-8 lg:col-span-2">
          <p className="text-xl text-muted-foreground">Vendido no mês</p>
          <p className="mt-2 text-6xl font-black tabular-nums text-primary md:text-8xl">{brl(total)}</p>
          <p className="mt-2 text-xl text-muted-foreground">{data.count} {data.count === 1 ? "venda" : "vendas"}</p>
          <div className="mt-8">
            <div className="flex justify-between text-lg">
              <span>Meta {data.goal > 0 ? brl(data.goal) : "não definida"}</span>
              <span className="font-bold">{data.goal > 0 ? `${pct.toFixed(0)}%` : ""}</span>
            </div>
            <div className="mt-2 h-6 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="mb-4 flex items-center gap-2 text-xl font-bold"><Trophy className="size-6 text-primary" /> Ranking</p>
          {data.ranking.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma venda neste mês ainda.</p>
          ) : (
            <ol className="space-y-4">
              {data.ranking.slice(0, 6).map((r, i) => (
                <li key={r.seller}>
                  <div className="flex items-baseline justify-between gap-2 text-lg">
                    <span className="truncate font-semibold">{i + 1}º {r.seller}</span>
                    <span className="shrink-0 tabular-nums">{brl(r.total)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.total / top) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="flex-1 rounded-3xl border border-border bg-card p-6">
        <p className="mb-4 text-xl font-bold">Vendas por dia</p>
        <div className="flex h-48 items-end gap-1 md:h-64">
          {data.daily.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-primary/80" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 4 : 0 }} title={brl(d.total)} />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
