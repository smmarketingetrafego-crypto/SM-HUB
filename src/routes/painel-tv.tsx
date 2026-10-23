import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Flame, Maximize, Settings, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getSalesBoard, saveSalesBoardSettings } from "@/lib/api-painel.functions";
import { goalProgress, type GoalType } from "@/lib/sales-ranking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/painel-tv")({
  head: () => ({
    meta: [
      { title: "Painel para TV — SM Hub" },
      { name: "description", content: "Vendas, ranking, tarefas e leads em tela cheia para TV ou segundo monitor." },
      { property: "og:title", content: "Painel para TV — SM Hub" },
      { property: "og:description", content: "Ranking de vendedores, meta do mês, tarefas e funil de leads em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesBoard,
});

type Board = Awaited<ReturnType<typeof getSalesBoard>>;
type Screen = "vendas" | "ranking" | "tarefas" | "leads";
const SCREENS: { id: Screen; label: string }[] = [
  { id: "vendas", label: "Vendas" },
  { id: "ranking", label: "Ranking" },
  { id: "tarefas", label: "Tarefas" },
  { id: "leads", label: "Leads" },
];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MEDALS = ["🥇", "🥈", "🥉"];
const TITLES = ["Rei(nha) das vendas", "Na cola do líder", "Fechando o pódio"];

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
  const { data } = useQuery({ queryKey: ["sales-board"], queryFn: () => getSalesBoard(), refetchInterval: 20000 });
  const [screen, setScreen] = useState<Screen>("vendas");
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const lastCount = useRef<number | null>(null);
  const prevPos = useRef<Record<string, number>>({});
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [goal, setGoal] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("valor");
  const [logo, setLogo] = useState("");
  const [rotate, setRotate] = useState(0);

  useEffect(() => {
    if (!data) return;
    const pos: Record<string, number> = {};
    data.ranking.forEach((r, i) => (pos[r.seller] = i));
    if (lastCount.current !== null && data.count > lastCount.current) {
      const seller = data.latest[0]?.seller ?? "";
      const before = prevPos.current[seller];
      const now = pos[seller];
      const overtook = before !== undefined && now < before ? data.ranking[now + 1]?.seller : undefined;
      setCelebrate(overtook ? `${seller} passou ${overtook} e agora é ${now + 1}º!` : `${seller} · ${brl(data.latest[0]?.value ?? 0)}`);
      setScreen("ranking");
      setTimeout(() => setCelebrate(null), 6000);
    }
    const mv: Record<string, number> = {};
    for (const s of Object.keys(pos)) if (prevPos.current[s] !== undefined) mv[s] = prevPos.current[s] - pos[s];
    if (Object.keys(prevPos.current).length) setMoves(mv);
    prevPos.current = pos;
    lastCount.current = data.count;
    setGoal(String(data.goal || ""));
    setGoalType(data.goalType);
    setLogo(data.logo || "");
    setRotate(data.rotate || 0);
  }, [data]);

  useEffect(() => {
    if (!data?.rotate) return;
    const id = setInterval(() => setScreen((s) => SCREENS[(SCREENS.findIndex((x) => x.id === s) + 1) % SCREENS.length].id), data.rotate * 1000);
    return () => clearInterval(id);
  }, [data?.rotate]);

  const save = async () => {
    await saveSalesBoardSettings({ data: { goal: Number(goal.replace(/\./g, "").replace(",", ".")) || 0, goalType, logo, rotate } });
    qc.invalidateQueries({ queryKey: ["sales-board"] });
    toast.success("Painel atualizado.");
  };

  if (!data) return <div className="flex min-h-[90vh] items-center justify-center text-muted-foreground">Carregando painel...</div>;
  const [y, m] = data.month.split("-");

  return (
    <div className="relative flex min-h-[calc(100dvh-3rem)] flex-col gap-6">
      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 animate-in fade-in">
          <div className="text-center">
            <p className="text-7xl">🎉</p>
            <p className="mt-4 text-5xl font-black text-primary">Nova venda!</p>
            <p className="mt-2 text-2xl text-foreground">{celebrate}</p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {data.logo ? <img src={data.logo} alt={data.brand} className="h-14 w-auto object-contain" /> : <img src="/sm-mark.png" alt="SM Hub" className="h-12 w-auto" />}
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">{data.brand}</h1>
            <p className="text-lg text-muted-foreground">{MONTHS[Number(m) - 1]} {y}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border bg-card p-1">
            {SCREENS.map((s) => (
              <button key={s.id} onClick={() => setScreen(s.id)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${screen === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s.label}</button>
            ))}
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="Voltar"><Link to="/"><ArrowLeft className="size-5" /></Link></Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Ajustes"><Settings className="size-5" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3">
              <p className="text-sm font-semibold">Ajustes do painel</p>
              <div className="text-xs text-muted-foreground">Tipo de meta
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {(["valor", "quantidade"] as GoalType[]).map((t) => (
                    <Button key={t} size="sm" variant={goalType === t ? "default" : "outline"} onClick={() => setGoalType(t)}>{t === "valor" ? "Valor (R$)" : "Nº de vendas"}</Button>
                  ))}
                </div>
              </div>
              <label className="block text-xs text-muted-foreground">{goalType === "valor" ? "Meta do mês (R$)" : "Meta do mês (quantidade de vendas)"}<Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={goalType === "valor" ? "50000" : "20"} className="mt-1" /></label>
              <label className="block text-xs text-muted-foreground">Trocar de tela sozinho
                <select value={rotate} onChange={(e) => setRotate(Number(e.target.value))} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
                  <option value={0}>Não trocar</option><option value={15}>A cada 15 s</option><option value={30}>A cada 30 s</option><option value={60}>A cada 1 min</option>
                </select>
              </label>
              <label className="block text-xs text-muted-foreground">Endereço da sua logo (opcional)<Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." className="mt-1" /></label>
              <Button size="sm" className="w-full" onClick={save}>Salvar</Button>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" aria-label="Tela cheia" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize className="size-5" /></Button>
        </div>
      </header>

      {screen === "vendas" && <SalesScreen data={data} />}
      {screen === "ranking" && <RankingScreen data={data} moves={moves} />}
      {screen === "tarefas" && <TasksScreen data={data} />}
      {screen === "leads" && <LeadsScreen data={data} />}
    </div>
  );
}

function SalesScreen({ data }: { data: Board }) {
  const total = useCountUp(data.total);
  const pct = goalProgress(data.goalType, data.goal, data.total, data.count);
  const isQty = data.goalType === "quantidade";
  const max = Math.max(1, ...data.daily.map((d) => d.total));
  return (
    <>
      <section className="rounded-3xl border border-border bg-card p-8">
        <p className="text-xl text-muted-foreground">Vendido no mês</p>
        <p className="mt-2 text-6xl font-black tabular-nums text-primary md:text-8xl">{brl(total)}</p>
        <p className="mt-2 text-xl text-muted-foreground">{data.count} {data.count === 1 ? "venda" : "vendas"}</p>
        <div className="mt-8">
          <div className="flex justify-between text-lg">
            <span>Meta {data.goal > 0 ? (isQty ? `${data.goal} vendas` : brl(data.goal)) : "não definida"}</span>
            <span className="font-bold">{data.goal > 0 ? (isQty ? `${data.count}/${data.goal} · ` : "") + `${pct.toFixed(0)}%` : ""}</span>
          </div>
          <div className="mt-2 h-6 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          {data.goal > 0 && pct < 100 && <p className="mt-2 text-muted-foreground">Faltam {isQty ? `${Math.max(0, data.goal - data.count)} vendas` : brl(Math.max(0, data.goal - data.total))} para bater a meta</p>}
          {pct >= 100 && <p className="mt-2 text-lg font-bold text-primary">🏆 Meta batida!</p>}
        </div>
      </section>
      <section className="flex-1 rounded-3xl border border-border bg-card p-6">
        <p className="mb-4 text-xl font-bold">Vendas por dia</p>
        <div className="flex h-48 items-end gap-1 md:h-64">
          {data.daily.map((d) => (
            <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-primary/80" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 4 : 0 }} title={brl(d.total)} />
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function RankingScreen({ data, moves }: { data: Board; moves: Record<string, number> }) {
  const r = data.ranking;
  if (r.length === 0) return <section className="flex flex-1 items-center justify-center rounded-3xl border border-border bg-card p-8 text-2xl text-muted-foreground">Nenhuma venda neste mês ainda. Quem vai abrir o placar? 🚀</section>;
  const top = r[0].total || 1;
  const latestSeller = data.latest[0]?.seller;
  const podium = [r[1], r[0], r[2]];
  return (
    <>
      <section className="grid grid-cols-3 items-end gap-4">
        {podium.map((p, idx) => {
          if (!p) return <div key={idx} />;
          const pos = r.indexOf(p);
          return (
            <div key={p.seller} className={`flex flex-col items-center rounded-3xl border border-border bg-card p-6 text-center ${pos === 0 ? "border-primary pb-12 ring-2 ring-primary" : ""}`}>
              <span className="text-6xl">{MEDALS[pos]}</span>
              <p className="mt-2 truncate text-2xl font-black">{p.seller}</p>
              <p className="text-sm text-muted-foreground">{TITLES[pos]}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-primary">{brl(p.total)}</p>
              <p className="text-muted-foreground">{p.count} {p.count === 1 ? "venda" : "vendas"}</p>
              {p.seller === latestSeller && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary"><Flame className="size-4" /> Última venda</p>}
            </div>
          );
        })}
      </section>
      <section className="flex-1 rounded-3xl border border-border bg-card p-6">
        <p className="mb-4 flex items-center gap-2 text-xl font-bold"><Trophy className="size-6 text-primary" /> Classificação geral</p>
        <ol className="space-y-4">
          {r.map((s, i) => {
            const mv = moves[s.seller] ?? 0;
            const ahead = r[i - 1];
            return (
              <li key={s.seller} className="transition-all duration-700">
                <div className="flex items-baseline justify-between gap-2 text-lg">
                  <span className="flex items-center gap-2 truncate font-semibold">
                    <span className="w-10">{MEDALS[i] ?? `${i + 1}º`}</span>{s.seller}
                    {mv > 0 && <ArrowUp className="size-4 text-primary" />}
                    {mv < 0 && <ArrowDown className="size-4 text-destructive" />}
                  </span>
                  <span className="shrink-0 tabular-nums">{brl(s.total)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${(s.total / top) * 100}%` }} /></div>
                {ahead && <p className="mt-1 text-xs text-muted-foreground">Faltam {brl(ahead.total - s.total + 1)} para passar {ahead.seller}</p>}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}

function TasksScreen({ data }: { data: Board }) {
  const t = data.tasks;
  return (
    <>
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {t.status.map((s) => (
          <div key={s.status} className="rounded-3xl border border-border bg-card p-6">
            <p className="text-lg text-muted-foreground">{s.status}</p>
            <p className="mt-1 text-5xl font-black tabular-nums text-primary">{s.count}</p>
          </div>
        ))}
      </section>
      <section className="grid flex-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="mb-4 text-xl font-bold">Prioridades em aberto</p>
          {t.urgent.length === 0 ? <p className="text-muted-foreground">Nada urgente. 👏</p> : (
            <ul className="space-y-3">
              {t.urgent.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 text-lg">
                  <span className="truncate"><span className={u.priority === "Urgente" ? "text-destructive" : "text-primary"}>●</span> {u.title}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{u.assignee}{u.date ? ` · ${u.date}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="mb-4 flex items-center gap-2 text-xl font-bold"><Trophy className="size-6 text-primary" /> Quem mais concluiu</p>
          {t.ranking.length === 0 ? <p className="text-muted-foreground">Nenhuma tarefa concluída ainda.</p> : (
            <ol className="space-y-3">
              {t.ranking.map((r, i) => (
                <li key={r.name} className="flex justify-between text-lg"><span>{MEDALS[i] ?? `${i + 1}º`} {r.name}</span><span className="font-bold tabular-nums">{r.count}</span></li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}

function LeadsScreen({ data }: { data: Board }) {
  const l = data.leads;
  const max = Math.max(1, ...l.stages.map((s) => s.count));
  return (
    <>
      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border bg-card p-6"><p className="text-lg text-muted-foreground">Leads no funil</p><p className="mt-1 text-6xl font-black tabular-nums text-primary">{l.total}</p></div>
        <div className="rounded-3xl border border-border bg-card p-6"><p className="text-lg text-muted-foreground">Novos neste mês</p><p className="mt-1 text-6xl font-black tabular-nums text-primary">{l.newThisMonth}</p></div>
      </section>
      <section className="grid flex-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="mb-4 text-xl font-bold">Funil</p>
          <ul className="space-y-3">
            {l.stages.map((s) => (
              <li key={s.name}>
                <div className="flex justify-between text-lg"><span>{s.name}</span><span className="tabular-nums">{s.count} · {brl(s.value)}</span></div>
                <div className="mt-1 h-3 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(s.count / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="mb-4 text-xl font-bold">Últimos leads</p>
          {l.recent.length === 0 ? <p className="text-muted-foreground">Nenhum lead ainda.</p> : (
            <ul className="space-y-3">
              {l.recent.map((r, i) => (
                <li key={i} className="flex justify-between gap-3 text-lg"><span className="truncate">{r.client}</span><span className="shrink-0 text-sm text-muted-foreground">{r.stage}{r.owner ? ` · ${r.owner}` : ""}</span></li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
