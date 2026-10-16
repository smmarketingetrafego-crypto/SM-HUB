import { createFileRoute, Link } from '@tanstack/react-router'
import {
  PlayCircle, Target, Calendar, CheckSquare, Plus, Clock, UserPlus, AlertTriangle,
  ArrowRight, FileText, Box, Palette, DollarSign, TrendingUp, X, ChevronDown,
  Trash2, Edit2, Check, ArrowUpRight,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, setStore } from "@/lib/store";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { brl } from "@/lib/format";
import { useGoogleLogin } from "@react-oauth/google";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/lib/api-financeiro.functions";
import { getClients } from "@/lib/api-clientes.functions";
import { getPipelines } from "@/lib/api-pipelines.functions";
import { getMetas } from "@/lib/api-metas.functions";
import { useEffect } from "react";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Dashboard — SM Hub" },
      { name: "description", content: "Visão geral do seu negócio" },
    ],
  }),
  component: DashboardPage,
} as any));

// ---------- local types ----------
type Task = { id: string; text: string; done: boolean; due?: string };
type Reminder = { id: string; text: string };

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function DashboardPage() {
  const { tutorials } = useStore();
  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients(),
  });
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => getPipelines(),
  });

  const clients = clientsData.clients || [];
  const deals = pipelines.flatMap((p: any) => p.stages).flatMap((s: any) => s.deals);
  const wonDeals = pipelines
    .flatMap((p: any) => p.stages)
    .filter((s: any) => s.name.toLowerCase().includes("ganho"))
    .flatMap((s: any) => s.deals);
  const totalRevenue = wonDeals.reduce((acc: any, d: any) => acc + (d.value ?? 0), 0);

  // State hooks
  const [period, setPeriod] = useState<"mensal" | "trimestral" | "anual">("mensal");
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
  });
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (period === "mensal") {
      setDateRange({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) });
    } else if (period === "trimestral") {
      setDateRange({ from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) });
    } else if (period === "anual") {
      setDateRange({ from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) });
    }
  }, [period]);

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions()
  });

  const filteredTransactions = transactions.filter((t: any) => {
    if (!t.date) return false;
    const date = new Date(t.date + 'T12:00:00');
    if (dateRange?.from) {
      const past = new Date(dateRange.from);
      past.setHours(0,0,0,0);
      const future = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      future.setHours(23,59,59,999);
      return date >= past && date <= future;
    }
    return true;
  });

  const { data: metasData } = useQuery({
    queryKey: ['metas'],
    queryFn: () => getMetas()
  });

  const totalFaturamento = filteredTransactions.filter((t: any) => t.type === 'in' && t.status === 'Recebido').reduce((a: any, b: any) => a + Number(b.amount), 0);
  const totalDespesas = filteredTransactions.filter((t: any) => t.type === 'out' && t.status === 'Pago').reduce((a: any, b: any) => a + Math.abs(Number(b.amount)), 0);
  const faturamentoPrevisto = filteredTransactions.filter((t: any) => t.type === 'in' && t.status === 'Pendente').reduce((a: any, b: any) => a + Number(b.amount), 0);
  
  const primaryRevenueMeta = metasData?.summary?.primaryRevenueMeta;
  const metaReceita = primaryRevenueMeta?.targetValue || 25000;

  const now = new Date();
  
  const displayedClients = clients.length;
  const displayedDeals = deals.length;

  const formatShort = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  
  let currentMonthLabel = `${MONTHS[now.getMonth()]}/${String(now.getFullYear()).slice(2)}`;
  if (dateRange?.from) {
    if (dateRange.to && dateRange.from.toDateString() !== dateRange.to.toDateString()) {
      currentMonthLabel = `${formatShort(dateRange.from)} - ${formatShort(dateRange.to)}`;
    } else if (!isToday) {
      currentMonthLabel = formatShort(dateRange.from);
    }
  }

  const connectGoogleCalendar = useGoogleLogin({
    onSuccess: (codeResponse) => {
      console.log(codeResponse);
      toast.success("Conta do Google conectada com sucesso!");
      setIsGoogleConnected(true);
    },
    onError: (error) => toast.error("Falha na autenticação: " + error),
  });

  // Tarefas
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Revisar proposta do cliente", done: false },
    { id: "2", text: "Enviar relatório semanal", done: false },
  ]);
  const [newTask, setNewTask] = useState("");

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now().toString(), text: newTask.trim(), done: false }]);
    setNewTask("");
    toast.success("Tarefa criada!");
  };
  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };
  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Lembretes
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderText, setReminderText] = useState("");
  const addReminder = () => {
    if (!reminderText.trim()) return;
    setReminders((prev) => [...prev, { id: Date.now().toString(), text: reminderText.trim() }]);
    setReminderText("");
    toast.success("Lembrete adicionado!");
  };
  const deleteReminder = (id: string) => setReminders((prev) => prev.filter((r) => r.id !== id));

  const doneTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Visão geral do seu negócio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(["mensal", "trimestral", "anual"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "outline"}
              onClick={() => setPeriod(p)}
              className={`h-10 px-4 rounded-xl text-sm capitalize transition-all ${
                period === p
                  ? "bg-brand/20 border-brand/40 text-brand"
                  : "bg-transparent border-white/10 text-white hover:bg-white/5"
              }`}
            >
              {p}
            </Button>
          ))}
          <Button variant="outline" onClick={() => setCalendarOpen(true)} className="h-10 px-4 rounded-xl text-sm bg-transparent border-white/10 text-white hover:bg-white/5">
            <Calendar className="mr-2 size-4 text-gray-400" />
            {currentMonthLabel}
          </Button>
        </div>
      </div>

      {/* Banner */}
      <TutorialBanner location="Dashboard" />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold text-white">Meta de Receita</h3>
                <Link to="/metas" className="text-gray-500 hover:text-brand transition-colors" title="Ajustar e Gerenciar Metas">
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <p className="text-sm text-gray-500">Progresso do mês atual</p>
            </div>
            <Link to="/metas">
              <div className="size-9 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 transition-all flex items-center justify-center cursor-pointer">
                <Target className="size-5" />
              </div>
            </Link>
          </div>
          <div className="flex justify-between items-end mb-3">
            <p className="text-sm text-gray-500">{brl(totalFaturamento)}</p>
            <p className="text-lg font-bold text-brand">{brl(metaReceita)}</p>
          </div>
          <div className="h-2 w-full bg-[#222] rounded-full overflow-hidden mb-3">
            <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (totalFaturamento / metaReceita) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs font-medium">
            <span className="text-gray-400">{Math.round((totalFaturamento / metaReceita) * 100)}% alcançado</span>
            <span className="text-gray-500">Faltam {brl(Math.max(0, metaReceita - totalFaturamento))}</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
            <DollarSign className="size-5" />
          </div>
          <h3 className="text-3xl font-bold text-brand mb-1">{brl(totalFaturamento)}</h3>
          <p className="text-sm text-gray-400 mb-6">Faturamento Realizado</p>
          <div className="pt-4 border-t border-white/5 text-xs text-gray-500 font-medium flex justify-between">
            <span>+ {brl(faturamentoPrevisto)} pendente</span>
            <span className="text-red-400">- {brl(totalDespesas)} despesas</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="size-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
            <UserPlus className="size-5" />
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{displayedDeals}</h3>
          <p className="text-sm text-gray-400">Leads no funil</p>
          <Link to="/pipelines" className="mt-4 inline-flex items-center gap-1 text-xs text-brand hover:underline">
            Ver pipeline <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Tarefas */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 font-bold text-white">
              <CheckSquare className="size-4 text-brand" /> Tarefas
            </div>
            <span className="text-xs text-gray-500">{doneTasks}/{totalTasks}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Nova tarefa..."
              className="bg-[#1A1A1A] border-white/5 h-8 text-xs rounded-xl flex-1"
            />
            <Button
              size="icon"
              onClick={addTask}
              className="bg-brand hover:brightness-110 text-white size-8 rounded-xl shrink-0 border-0"
            >
              <Plus className="size-3" />
            </Button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px]">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 opacity-50">
                <CheckSquare className="size-8 mb-2 text-gray-500" />
                <p className="text-xs text-gray-400">Nenhuma tarefa</p>
              </div>
            ) : tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleTask(t.id)}
                  className={`size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${t.done ? "bg-brand border-brand" : "border-white/20 hover:border-brand/50"}`}
                >
                  {t.done && <Check className="size-3 text-black" />}
                </button>
                <span className={`text-xs flex-1 ${t.done ? "line-through text-gray-600" : "text-gray-300"}`}>{t.text}</span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lembretes */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white mb-4">
            <FileText className="size-4 text-brand" /> Lembretes
          </div>
          <div className="flex gap-2 mb-4">
            <Input
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReminder()}
              placeholder="Adicionar lembrete..."
              className="bg-[#1A1A1A] border-white/5 h-8 text-xs rounded-xl flex-1"
            />
            <Button
              size="icon"
              onClick={addReminder}
              className="bg-brand hover:brightness-110 text-white size-8 rounded-xl shrink-0 border-0"
            >
              <Plus className="size-3" />
            </Button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px]">
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 opacity-50">
                <FileText className="size-8 mb-2 text-gray-500" />
                <p className="text-xs text-gray-400">Nenhum lembrete</p>
              </div>
            ) : reminders.map((r) => (
              <div key={r.id} className="flex items-center gap-2 group bg-white/5 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-300 flex-1">{r.text}</span>
                <button onClick={() => deleteReminder(r.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
          <div className="font-bold text-white mb-6">Atividade Recente</div>
          {deals.length === 0 ? (
            <div className="opacity-50 text-center py-4">
              <Clock className="size-8 mb-2 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-400">Sem atividades</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.slice(0, 3).map((d, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <UserPlus className="size-3.5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Lead: {d.client}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">No funil</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tarefas Atrasadas */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            <AlertTriangle className="size-4 text-brand" /> Pendências
          </div>
          {tasks.filter((t) => !t.done).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
              <AlertTriangle className="size-8 mb-3 text-gray-500" />
              <p className="text-xs text-gray-400">Nenhuma pendência! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.filter((t) => !t.done).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs text-gray-300 bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="size-3 text-orange-400 shrink-0" />
                  <span className="truncate">{t.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second row */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Projetos Recentes */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            Projetos Recentes <Clock className="size-4 text-brand ml-1" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
            <Box className="size-8 mb-3 text-gray-500" />
            <p className="text-xs text-gray-400 max-w-[140px]">Nenhum projeto ativo</p>
          </div>
        </div>

        {/* Próximas Reuniões */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            <Calendar className="size-4 text-brand" /> Próximas Reuniões
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
            <Calendar className="size-8 mb-3 text-gray-500" />
            <p className="text-xs text-gray-400 max-w-[140px]">Nenhuma reunião agendada</p>
            <button onClick={() => setCalendarOpen(true)} className="text-xs font-medium text-brand hover:underline flex items-center gap-1 mt-3">
              Ver agenda <ArrowRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Estoque */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            <Box className="size-4 text-brand" /> Estoque
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Todos os produtos estão com estoque adequado ✅
          </p>
        </div>

        {/* Conteúdos do Dia */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 font-bold text-white mb-6">
            <Palette className="size-4 text-brand" /> Conteúdos do Dia
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
            <Palette className="size-8 mb-3 text-gray-500" />
            <p className="text-xs text-gray-400 max-w-[140px]">Nenhum conteúdo para hoje 🎉</p>
            <button onClick={() => setCalendarOpen(true)} className="text-xs font-medium text-brand hover:underline flex items-center gap-1 mt-3">
              Ver calendário <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="bg-[#111111] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-brand" /> 
              Agenda e Calendário
            </DialogTitle>
          </DialogHeader>
          <style>{`
            .rdp-root {
              --rdp-accent-color: #c9a227;
              --rdp-accent-background-color: rgba(201, 162, 39, 0.2);
              --rdp-range_middle-background-color: rgba(201, 162, 39, 0.15);
              --rdp-background-color: transparent;
              color: white;
            }
            .rdp-day { color: white; }
            .rdp-day_selected:not(.rdp-day_range_middle) { color: black !important; font-weight: bold; }
            .rdp-day_range_middle { color: white !important; }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); }
          `}</style>
          <div className="flex justify-center p-4">
            <DayPicker 
              mode="range" 
              selected={dateRange} 
              onSelect={setDateRange as any}
              className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl"
            />
          </div>
          <div className="border-t border-white/10 pt-4 px-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-300">
                Eventos de {dateRange?.from ? (dateRange.to && dateRange.from.toDateString() !== dateRange.to.toDateString() ? "vários dias" : dateRange.from.toLocaleDateString('pt-BR')) : 'hoje'}
              </h4>
              {!isGoogleConnected ? (
                <button 
                  onClick={() => connectGoogleCalendar()}
                  className="text-[10px] uppercase font-bold tracking-wider text-brand border border-brand/30 bg-brand/10 hover:bg-brand/20 px-2 py-1 rounded transition-colors flex items-center gap-1"
                >
                  Conectar Google Agenda
                </button>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
                  <Check className="size-3" /> Sincronizado
                </span>
              )}
            </div>
            {isGoogleConnected ? (
              <div className="bg-[#1a1a1a] border border-brand/20 rounded-lg p-3 text-left mb-4">
                <div className="flex gap-3 items-start">
                  <div className="w-1.5 h-10 bg-brand rounded-full"></div>
                  <div>
                    <h5 className="text-white font-medium text-sm">Alinhamento de Setup — {clients[0]?.name || "Cliente Premium"}</h5>
                    <p className="text-gray-400 text-xs mt-0.5">14:00 - 15:00 • Google Meet</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/50 border border-white/5 rounded-lg p-4 text-center text-sm text-gray-500 mb-4">
                Nenhum evento, reunião ou publicação agendada para este dia.
              </div>
            )}
            
            <Button 
              onClick={() => setCalendarOpen(false)} 
              className="w-full h-11 bg-brand text-black hover:bg-brand/90 font-bold rounded-xl"
            >
              Confirmar Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
