import { getCollaborators } from "@/lib/api-colaboradores.functions";
import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import {
  Plus, TrendingUp, Search, CalendarClock, MoreHorizontal,
  RefreshCw, Users, Trophy, XCircle, DollarSign, CheckSquare,
  Tag, Shrink, ChevronDown, UserPlus, Filter, Settings,
  List, LayoutGrid, X, Check, ChevronRight, ArrowRight, ArrowLeft,
  ExternalLink, Trash2, User
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Pipeline } from "@/data/extra";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPipelines, addLeadDeal, moveLeadDeal, removeLeadDeal, removeBatchDeals, addPipeline } from "@/lib/api-pipelines.functions";
import { triggerFunnelAutomation } from "@/lib/api-automacoes.functions";

export const Route = createFileRoute("/pipelines")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Leads & Pipelines — SM Hub' },
      { property: 'og:description', content: 'Gerencie seu funil de vendas' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Leads & Pipelines — SM Hub" },
      { name: "description", content: "Gerencie seu funil de vendas" },
    ],
  }),
  component: PipelinesPage,
});

type NewLeadForm = { name: string; email: string; phone: string; value: string; stage: string; owner?: string };

function PipelinesPage() {
  const queryClient = useQueryClient();
  const getColabsFn = useServerFn(getCollaborators);
  const getPipelinesFn = useServerFn(getPipelines);
  const addDealFn = useServerFn(addLeadDeal);
  const moveDealFn = useServerFn(moveLeadDeal);
  const removeDealFn = useServerFn(removeLeadDeal);
  const removeBatchFn = useServerFn(removeBatchDeals);
  const addPipelineFn = useServerFn(addPipeline);

  const { data: colabs = [] } = useQuery({ queryKey: ["collaborators"], queryFn: () => getColabsFn() });
  const sellers = (colabs as any[]).map((c) => c.name).filter(Boolean) as string[];

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      try {
        const fetched = await getPipelinesFn();
        if (typeof window !== 'undefined') {
          try {
            const localRaw = localStorage.getItem('smhub_pipelines');
            if (localRaw) {
              const localParsed = JSON.parse(localRaw);
              if (Array.isArray(localParsed) && localParsed.length > 0) {
                // Se local tiver mais dados ou deals mais recentes, prioriza a retenção
                const localDealsCount = localParsed.reduce((acc, p) => acc + (p.stages?.reduce((a: number, s: any) => a + (s.deals?.length || 0), 0) || 0), 0);
                const fetchedDealsCount = (fetched || []).reduce((acc: number, p: any) => acc + (p.stages?.reduce((a: number, s: any) => a + (s.deals?.length || 0), 0) || 0), 0);
                if (localDealsCount > fetchedDealsCount) {
                  return localParsed;
                }
              }
            }
            if (Array.isArray(fetched) && fetched.length > 0) {
              localStorage.setItem('smhub_pipelines', JSON.stringify(fetched));
            }
          } catch {}
        }
        return fetched || [];
      } catch (err) {
        if (typeof window !== 'undefined') {
          try {
            const localRaw = localStorage.getItem('smhub_pipelines');
            if (localRaw) return JSON.parse(localRaw);
          } catch {}
        }
        return [];
      }
    },
  });

  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("todas");
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [newLead, setNewLead] = useState<NewLeadForm>({ name: "", email: "", phone: "", value: "", stage: "" });
  const [newPipelineName, setNewPipelineName] = useState("");
  const [addPipelineOpen, setAddPipelineOpen] = useState(false);

  const currentPipelineId = activeId || pipelines[0]?.id || "";
  const pipeline = pipelines.find((p: any) => p.id === currentPipelineId) ?? pipelines[0];
  const allDeals = pipeline?.stages.flatMap((s: any) => s.deals) ?? [];

  const addDealMutation = useMutation({
    mutationFn: async (payload: { pipelineId: string; stageName: string; deal: any }) => addDealFn({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Lead adicionado com sucesso!`);
        if (res.pipelines) {
          queryClient.setQueryData(['pipelines'], res.pipelines);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('smhub_pipelines', JSON.stringify(res.pipelines)); } catch {}
          }
        }
        queryClient.invalidateQueries({ queryKey: ['pipelines'] });
        setNewLead({ name: "", email: "", phone: "", value: "", stage: "" });
        setAddLeadOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const moveDealMutation = useMutation({
    mutationFn: async (payload: { pipelineId?: string; fromStage?: string; toStage: string; clientName: string; dealId?: string; dealData?: any }) => moveDealFn({ data: payload }),
    onSuccess: (res, vars) => {
      if (res.success) {
        toast.success(`Lead movido para "${vars.toStage}"`);
        if (res.pipelines) {
          queryClient.setQueryData(['pipelines'], res.pipelines);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('smhub_pipelines', JSON.stringify(res.pipelines)); } catch {}
          }
        }
        queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const removeDealMutation = useMutation({
    mutationFn: async (payload: { pipelineId?: string; stageName?: string; clientName: string; dealId?: string }) => removeDealFn({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Lead removido.");
        if (res.pipelines) {
          queryClient.setQueryData(['pipelines'], res.pipelines);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('smhub_pipelines', JSON.stringify(res.pipelines)); } catch {}
          }
        }
        queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const removeBatchMutation = useMutation({
    mutationFn: async (payload: { pipelineId: string; selectedKeys: string[] }) => removeBatchFn({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`${selected.length} lead(s) removido(s)`);
        if (res.pipelines) {
          queryClient.setQueryData(['pipelines'], res.pipelines);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('smhub_pipelines', JSON.stringify(res.pipelines)); } catch {}
          }
        }
        queryClient.invalidateQueries({ queryKey: ['pipelines'] });
        setSelected([]);
      } else toast.error("Erro: " + res.error);
    }
  });

  const addPipelineMutation = useMutation({
    mutationFn: async (name: string) => addPipelineFn({ data: { name } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Funil "${res.pipeline.name}" criado!`);
        if (res.pipelines) {
          queryClient.setQueryData(['pipelines'], res.pipelines);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('smhub_pipelines', JSON.stringify(res.pipelines)); } catch {}
          }
        }
        queryClient.invalidateQueries({ queryKey: ['pipelines'] });
        setActiveId(res.pipeline.id);
        setNewPipelineName("");
        setAddPipelineOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const filteredStages = useMemo(() => pipeline?.stages.map((stage: any) => ({
    ...stage,
    deals: stage.deals.filter((d: any) => {
      if (search && !d.client.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
  })) ?? [], [pipeline, search]);

  const total = allDeals.reduce((s: any, d: any) => s + (d.value ?? 0), 0);
  const won = pipeline?.stages.find((s: any) => s.name.toLowerCase().includes("ganho"))?.deals.length ?? 0;
  const lost = pipeline?.stages.find((s: any) => s.name.toLowerCase().includes("perdido"))?.deals.length ?? 0;
  const conversionRate = allDeals.length > 0 ? Math.round((won / allDeals.length) * 100) : 0;

  const saveLead = async () => {
    if (!newLead.name.trim()) { toast.error("Informe o nome do lead"); return; }
    const targetStage = newLead.stage || pipeline?.stages[0]?.name || "Novo Lead";
    const clientName = newLead.name.trim();
    const dealVal = parseFloat(newLead.value.replace(",", ".")) || 0;
    addDealMutation.mutate({
      pipelineId: pipeline?.id,
      stageName: targetStage,
      deal: {
        client: clientName,
        value: dealVal,
        email: newLead.email.trim(),
        phone: newLead.phone.trim(),
        owner: (newLead.owner ?? "").trim(),
      }
    });

    try {
      const autoRes = await triggerFunnelAutomation({
        data: {
          clientName,
          stageName: targetStage,
          dealValue: dealVal,
        }
      });
      if (autoRes?.triggered) {
        toast.success(`🤖 Automação disparada: ${autoRes.ruleName}`, {
          description: `Disparo WhatsApp enviado para ${clientName}`,
        });
      }
    } catch (e) {
      console.warn("Automation trigger warning:", e);
    }
  };

  const removeDeal = (stageName: string, dealInput: any) => {
    const clientName = typeof dealInput === 'string' ? dealInput : dealInput?.client;
    const dealId = typeof dealInput === 'object' ? dealInput?.id : undefined;

    // Atualização otimista imediata na UI
    queryClient.setQueryData(['pipelines'], (prevPipelines: any) => {
      if (!Array.isArray(prevPipelines)) return prevPipelines;
      return prevPipelines.map((p: any) => {
        if (p.id !== (pipeline?.id || prevPipelines[0]?.id)) return p;
        return {
          ...p,
          stages: (p.stages || []).map((st: any) => ({
            ...st,
            deals: (st.deals || []).filter((d: any) => {
              if (dealId && (d.id === dealId || d._id === dealId)) return false;
              if (clientName && d.client?.trim().toLowerCase() === clientName.trim().toLowerCase()) return false;
              return true;
            })
          }))
        };
      });
    });

    removeDealMutation.mutate({
      pipelineId: pipeline?.id,
      stageName,
      clientName,
      dealId,
    });
  };

  const moveDeal = async (fromStage: string, toStage: string, dealInput: any) => {
    const clientName = typeof dealInput === 'string' ? dealInput : dealInput?.client;
    const dealId = typeof dealInput === 'object' ? dealInput?.id : undefined;

    // Atualização otimista imediata na UI (estilo fluido e instantâneo do quadro de Tarefas)
    queryClient.setQueryData(['pipelines'], (prevPipelines: any) => {
      if (!Array.isArray(prevPipelines)) return prevPipelines;
      return prevPipelines.map((p: any) => {
        if (p.id !== (pipeline?.id || prevPipelines[0]?.id)) return p;
        let movingDeal: any = null;
        const newStages = (p.stages || []).map((st: any) => {
          if (!Array.isArray(st.deals)) return st;
          const matchIdx = st.deals.findIndex((d: any) => 
            (dealId && (d.id === dealId || d._id === dealId)) ||
            (clientName && d.client?.trim().toLowerCase() === clientName.trim().toLowerCase())
          );
          if (matchIdx !== -1) {
            movingDeal = { ...st.deals[matchIdx], stage: toStage };
            return { ...st, deals: st.deals.filter((_: any, idx: number) => idx !== matchIdx) };
          }
          return st;
        });

        if (!movingDeal && typeof dealInput === 'object') {
          movingDeal = { ...dealInput, stage: toStage };
        }

        if (movingDeal) {
          const target = newStages.find((st: any) => st.name === toStage);
          if (target) {
            if (!Array.isArray(target.deals)) target.deals = [];
            target.deals.push(movingDeal);
          }
        }
        return { ...p, stages: newStages };
      });
    });

    moveDealMutation.mutate({
      pipelineId: pipeline?.id,
      fromStage,
      toStage,
      clientName,
      dealId,
      dealData: typeof dealInput === 'object' ? dealInput : undefined,
    });

    try {
      const autoRes = await triggerFunnelAutomation({
        data: {
          clientName,
          stageName: toStage,
        }
      });
      if (autoRes?.triggered) {
        toast.success(`🤖 Disparo Automático: ${autoRes.ruleName}`, {
          description: `Disparo WhatsApp enviado para ${clientName}`,
        });
      }
    } catch (e) {
      console.warn("Automation trigger warning:", e);
    }
  };

  const handleMoveStage = (fromStageName: string, direction: "next" | "prev", dealInput: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const stages = pipeline?.stages || [];
    const currentIndex = stages.findIndex((s: any) => s.name === fromStageName);
    if (currentIndex === -1) return;
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < stages.length) {
      const toStage = stages[newIndex].name;
      moveDeal(fromStageName, toStage, dealInput);
    }
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const stageColors: Record<string, string> = {
    "Novo Lead": "border-t-blue-500",
    "Qualificação": "border-t-purple-500",
    "Proposta Enviada": "border-t-yellow-500",
    "Negociação": "border-t-orange-500",
    "Fechado - Ganho": "border-t-emerald-500",
    "Fechado - Perdido": "border-t-red-500",
  };

  return (
    <div className="space-y-6">
      <TutorialBanner location="Pipeline" />
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">Leads & Pipelines</h1>
        <p className="text-sm text-gray-400 -mt-3">Gerencie seu funil de vendas</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="gradient-brand hover:brightness-110 text-primary-foreground h-10 px-4 rounded-xl text-sm font-semibold border-0 shadow-[0_0_15px_rgba(201,162,39,0.3)]"
            onClick={() => { setNewLead({ name: "", email: "", phone: "", value: "", stage: "" }); setAddLeadOpen(true); }}
          >
            <Plus className="mr-2 size-4" /> Novo Lead
          </Button>
          <Button variant="outline" className="h-10 px-4 rounded-xl text-sm bg-transparent border-white/10 text-white hover:bg-white/5"
            onClick={() => { setNewLead({ name: "", email: "", phone: "", value: "", stage: "" }); setAddLeadOpen(true); }}>
            <RefreshCw className="mr-2 size-4 text-gray-400" /> Nova Negociação
          </Button>
          <div className="ml-auto flex gap-3">
            <Button
              variant="outline"
              className={cn("h-10 px-4 rounded-xl text-sm border-white/10 hover:bg-white/5", selectMode ? "bg-brand/20 border-brand/40 text-brand" : "bg-transparent text-white")}
              onClick={() => { setSelectMode(!selectMode); setSelected([]); }}
            >
              <CheckSquare className="mr-2 size-4" /> {selectMode ? `${selected.length} selecionado(s)` : "Selecionar"}
            </Button>
            <Button variant="outline" className="h-10 px-4 rounded-xl text-sm bg-transparent border-white/10 text-white hover:bg-white/5"
              onClick={() => setCollapsed(!collapsed)}>
              <Shrink className="mr-2 size-4 text-gray-400" /> {collapsed ? "Expandir" : "Recolher"}
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Selector + View Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {pipelines.map((p) => (
            <Button
              key={p.id}
              variant={currentPipelineId === p.id ? "secondary" : "outline"}
              className={cn("rounded-xl h-10 px-4", currentPipelineId === p.id ? "bg-brand/20 border-brand/40 text-brand" : "border-white/10 bg-white/5 text-white hover:bg-white/10")}
              onClick={() => setActiveId(p.id)}
            >
              {p.name}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-10 w-10 border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
            title="Criar novo funil"
            onClick={() => setAddPipelineOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex items-center rounded-xl border border-white/10 p-1 bg-[#111]">
          <Button
            size="sm"
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            className={cn("h-8 px-4 text-sm rounded-lg", viewMode === "kanban" ? "bg-[#222] text-white" : "text-gray-400 hover:text-white")}
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="mr-1.5 size-3.5" /> Kanban
          </Button>
          <Button
            size="sm"
            variant={viewMode === "lista" ? "secondary" : "ghost"}
            className={cn("h-8 px-4 text-sm rounded-lg", viewMode === "lista" ? "bg-[#222] text-white" : "text-gray-400 hover:text-white")}
            onClick={() => setViewMode("lista")}
          >
            <List className="mr-1.5 size-3.5" /> Lista
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-5">
        {[
          { icon: UserPlus, label: "No funil", value: allDeals.length.toString(), color: "bg-white/5 text-gray-400" },
          { icon: Trophy, label: "Ganhas", value: won.toString(), color: "bg-emerald-500/10 text-emerald-500" },
          { icon: XCircle, label: "Perdidas", value: lost.toString(), color: "bg-red-500/10 text-red-500" },
          { icon: TrendingUp, label: "Conversão", value: allDeals.length > 0 ? `${conversionRate}%` : "—", color: "bg-white/5 text-gray-400" },
          { icon: DollarSign, label: "Na mesa", value: brl(total), color: "bg-brand/10 text-brand" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[#111111] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Tag Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead por nome..."
            className="pl-9 bg-[#111] border-white/5 h-10 text-sm rounded-xl text-white placeholder:text-gray-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-36 bg-[#111] border-white/5 h-10 rounded-xl text-white text-sm">
            <Tag className="size-3.5 mr-1.5 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectItem value="todas">Todas etapas</SelectItem>
            {pipeline?.stages.map((s) => (
              <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {search && (
          <p className="text-sm text-gray-400">
            {filteredStages.reduce((acc, s) => acc + s.deals.length, 0)} resultado(s)
          </p>
        )}
        {selectMode && selected.length > 0 && (
          <Button variant="destructive" size="sm" className="rounded-xl h-10 px-4" onClick={() => {
            removeBatchMutation.mutate({
              pipelineId: pipeline?.id,
              selectedKeys: selected,
            });
          }}>
            <Trash2 className="mr-1.5 size-4" /> Remover {selected.length}
          </Button>
        )}
      </div>

      {/* ── KANBAN VIEW ─────────────────────────────────────────────────── */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: "420px" }}>
          {filteredStages
            .filter((s) => tagFilter === "todas" || s.name === tagFilter)
            .map((stage, colIdx, allCols) => {
              const stageTotal = stage.deals.reduce((s, d) => s + (d.value ?? 0), 0);
              return (
                <div key={stage.name} className={`min-w-[280px] w-[280px] flex-none rounded-2xl bg-[#0a0a0a] border-t-2 border border-white/5 ${stageColors[stage.name] ?? "border-t-brand"} flex flex-col`}>
                  <div className="p-4 border-b border-white/5 bg-[#111] rounded-t-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-white">{stage.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{stage.deals.length}</span>
                        <button
                          onClick={() => { setNewLead({ name: "", email: "", phone: "", value: "", stage: stage.name }); setAddLeadOpen(true); }}
                          className="text-gray-500 hover:text-brand transition-colors" title="Adicionar lead"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                    {!collapsed && <p className="text-xs text-gray-500">{brl(stageTotal)}</p>}
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {stage.deals.map((deal, i) => {
                      const key = `${stage.name}::${deal.client}`;
                      const isSelected = selected.includes(key);
                      const initials = (deal.client || "LD").slice(0, 2).toUpperCase();
                      return (
                        <div
                          key={`${deal.client}-${i}`}
                          onClick={() => selectMode && toggleSelect(key)}
                          className={cn(
                            "rounded-2xl bg-[#111318] border border-white/10 hover:border-brand/40 transition-all group shadow-md space-y-2.5",
                            collapsed ? "py-2 px-3" : "p-3.5",
                            selectMode && "cursor-pointer",
                            isSelected && "border-brand/60 bg-brand/5",
                            !isSelected && "border-white/10"
                          )}
                        >
                          {/* Top: Tag / Valor & Ações */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {selectMode && (
                                <div className={cn("size-4 rounded border flex items-center justify-center shrink-0", isSelected ? "bg-brand border-brand" : "border-white/20")}>
                                  {isSelected && <Check className="size-2.5 text-black" />}
                                </div>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-brand/30 bg-brand/10 text-brand truncate">
                                {deal.value > 0 ? brl(deal.value) : "Novo Lead"}
                              </span>
                            </div>

                            {!selectMode && (
                              <div className="flex items-center gap-1">
                                <Link
                                  to="/lead-details"
                                  search={{ name: deal.client }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="size-6 rounded-md hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                                  title="Ver jornada do lead"
                                >
                                  <ExternalLink className="size-3" />
                                </Link>
                                <Select onValueChange={(v) => v === "__remove__" ? removeDeal(stage.name, deal) : moveDeal(stage.name, v, deal)}>
                                  <SelectTrigger className="size-6 border-0 bg-transparent text-gray-500 hover:text-white p-0 [&>svg]:hidden">
                                    <MoreHorizontal className="size-3.5" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                                    <div className="px-2 py-1 text-[10px] text-gray-500 font-semibold uppercase">Mover para</div>
                                    {pipeline?.stages.filter((s) => s.name !== stage.name).map((s) => (
                                      <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                    <SelectItem value="__remove__" className="text-red-400">Remover lead</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Nome do Lead */}
                          <div>
                            <Link
                              to="/lead-details"
                              search={{ name: deal.client }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-bold text-white hover:text-brand transition-colors block truncate"
                            >
                              {deal.client}
                            </Link>
                            {!collapsed && (
                              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                <CalendarClock className="size-3 text-brand/70" /> Adicionado hoje
                              </p>
                            )}
                          </div>

                          {/* Rodapé: Responsável com Avatar e Botões de Avanço Rápido (Estilo Quadro de Tarefas) */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-7 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white leading-tight truncate">
                                  {deal.owner || "Equipe Comercial"}
                                </div>
                                <div className="text-[10px] text-gray-400 leading-tight truncate">
                                  {stage.name}
                                </div>
                              </div>
                            </div>

                            {/* Botões de fluxo rápido (Voltar e Avançar Etapa) */}
                            {!selectMode && (
                              <div className="flex items-center gap-1 shrink-0">
                                {colIdx > 0 && (
                                  <button
                                    onClick={(e) => handleMoveStage(stage.name, "prev", deal, e)}
                                    className="size-6 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                                    title={`Voltar para ${allCols[colIdx - 1]?.name}`}
                                  >
                                    <ArrowLeft className="size-3" />
                                  </button>
                                )}
                                {colIdx < allCols.length - 1 && (
                                  <button
                                    onClick={(e) => handleMoveStage(stage.name, "next", deal, e)}
                                    className="size-6 rounded-md bg-brand/20 hover:bg-brand/30 text-brand flex items-center justify-center transition-colors font-bold shadow-sm"
                                    title={`Avançar para ${allCols[colIdx + 1]?.name}`}
                                  >
                                    <ArrowRight className="size-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {stage.deals.length === 0 && (
                      <button
                        onClick={() => { setNewLead({ name: "", email: "", phone: "", value: "", stage: stage.name }); setAddLeadOpen(true); }}
                        className="w-full h-16 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors text-xs gap-1"
                      >
                        <Plus className="size-4" /> Adicionar lead
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ── LISTA VIEW ──────────────────────────────────────────────────── */}
      {viewMode === "lista" && (
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 bg-[#111] text-left text-xs uppercase text-gray-500">
              <tr>
                {selectMode && <th className="p-4 w-10" />}
                <th className="p-4">Lead</th>
                <th className="p-4">Etapa</th>
                <th className="p-4">Valor</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredStages
                .filter((s) => tagFilter === "todas" || s.name === tagFilter)
                .flatMap((stage) =>
                  stage.deals.map((deal, i) => {
                    const key = `${stage.name}::${deal.client}`;
                    const isSelected = selected.includes(key);
                    return (
                      <tr
                        key={`${stage.name}-${deal.client}-${i}`}
                        className={cn("border-b border-white/5 hover:bg-white/5 transition-colors", isSelected && "bg-brand/5")}
                        onClick={() => selectMode && toggleSelect(key)}
                      >
                        {selectMode && (
                          <td className="pl-4">
                            <div className={cn("size-4 rounded border flex items-center justify-center", isSelected ? "bg-brand border-brand" : "border-white/20")}>
                              {isSelected && <Check className="size-2.5 text-black" />}
                            </div>
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(deal.client)}&backgroundColor=1a1a1a&textColor=C9A227`}
                              alt={deal.client} className="size-8 rounded-full"
                            />
                            <span className="font-medium text-white">{deal.client}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", stageColors[stage.name]?.replace("border-t-", "text-").replace("-500", "-400") || "text-gray-400", "bg-white/5")}>
                            {stage.name}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-brand">
                          {deal.value > 0 ? brl(deal.value) : "—"}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            {pipeline?.stages.filter((s) => s.name !== stage.name).slice(0, 1).map((s) => (
                              <Button key={s.name} size="sm" variant="ghost" className="h-8 text-xs text-gray-400 hover:text-white"
                                onClick={(e) => { e.stopPropagation(); moveDeal(stage.name, s.name, deal); }}>
                                → {s.name}
                              </Button>
                            ))}
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={(e) => { e.stopPropagation(); removeDeal(stage.name, deal); }}>
                              Remover
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              {filteredStages.every((s) => s.deals.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500">
                    Nenhum lead encontrado.{" "}
                    <button className="text-brand hover:underline" onClick={() => setAddLeadOpen(true)}>Adicionar lead</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog: Novo Lead */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">Nome *</Label>
              <Input value={newLead.name} onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome do lead ou empresa" className="bg-[#1A1A1A] border-white/10 text-white" autoFocus
                onKeyDown={(e) => e.key === "Enter" && saveLead()} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">E-mail</Label>
                <Input value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com" className="bg-[#1A1A1A] border-white/10 text-white" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Telefone</Label>
                <Input value={newLead.phone} onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(00) 00000-0000" className="bg-[#1A1A1A] border-white/10 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Valor estimado</Label>
                <Input value={newLead.value} onChange={(e) => setNewLead((p) => ({ ...p, value: e.target.value }))}
                  placeholder="0,00" className="bg-[#1A1A1A] border-white/10 text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Etapa</Label>
                <Select value={newLead.stage || pipeline?.stages[0]?.name} onValueChange={(v) => setNewLead((p) => ({ ...p, stage: v }))}>
                  <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    {pipeline?.stages.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">Responsável (vendedor)</Label>
              <Input value={newLead.owner ?? ""} onChange={(e) => setNewLead((p) => ({ ...p, owner: e.target.value }))}
                placeholder="Quem cuida deste lead" list="sellers-list" className="bg-[#1A1A1A] border-white/10 text-white" />
              <datalist id="sellers-list">{sellers.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddLeadOpen(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
            <Button onClick={saveLead} className="gradient-brand text-black font-semibold">
              <Plus className="mr-2 size-4" /> Adicionar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Funil */}
      <Dialog open={addPipelineOpen} onOpenChange={setAddPipelineOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Criar Novo Funil</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">Nome do Funil *</Label>
              <Input
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Ex: Vendas High Ticket, B2B, Lançamento..."
                className="bg-[#1A1A1A] border-white/10 text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newPipelineName.trim()) {
                    addPipelineMutation.mutate(newPipelineName.trim());
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddPipelineOpen(false)} className="text-gray-400 hover:text-white">Cancelar</Button>
            <Button
              onClick={() => {
                if (!newPipelineName.trim()) {
                  toast.error("Informe o nome do funil");
                  return;
                }
                addPipelineMutation.mutate(newPipelineName.trim());
              }}
              className="gradient-brand text-black font-semibold"
              disabled={addPipelineMutation.isPending}
            >
              <Plus className="mr-2 size-4" /> Criar Funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
