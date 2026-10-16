import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Plus,
  Trophy,
  TrendingUp,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Filter,
  Search,
  DollarSign,
  Users,
  Briefcase,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Flame,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import {
  getMetas,
  addMeta,
  updateMeta,
  deleteMeta,
  quickUpdateMetaProgress,
  type MetaRecord,
} from "@/lib/api-metas.functions";
import { TutorialBanner } from "@/components/layout/tutorial-banner";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas & OKRs Estratégicos — SM Hub" },
      { name: "description", content: "Gerencie e acompanhe metas de receita, clientes, vendas e equipe da agência." },
    ],
  }),
  component: MetasPage,
});

const CATEGORIES = ["Todas", "Financeiro", "Comercial", "Operacional", "Marketing"] as const;

export function MetasPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaRecord | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<MetaRecord["category"]>("Financeiro");
  const [formPeriod, setFormPeriod] = useState<MetaRecord["period"]>("Mensal");
  const [formTargetValue, setFormTargetValue] = useState("25000");
  const [formCurrentValue, setFormCurrentValue] = useState("0");
  const [formUnit, setFormUnit] = useState<MetaRecord["unit"]>("BRL");
  const [formAutoSync, setFormAutoSync] = useState(true);
  const [formAutoSyncSource, setFormAutoSyncSource] = useState<NonNullable<MetaRecord["autoSyncSource"]>>("faturamento");
  const [formDeadline, setFormDeadline] = useState(new Date().toISOString().split("T")[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formRewardNotes, setFormRewardNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["metas"],
    queryFn: () => getMetas(),
  });

  const metas = data?.metas || [];
  const summary = data?.summary;

  const addMutation = useMutation({
    mutationFn: (payload: Omit<MetaRecord, "id" | "createdAt">) => addMeta({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Meta cadastrada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["metas"] });
        setIsModalOpen(false);
      } else {
        toast.error("Erro ao cadastrar meta.");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: MetaRecord) => updateMeta({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Meta atualizada!");
        queryClient.invalidateQueries({ queryKey: ["metas"] });
        setIsModalOpen(false);
      } else {
        toast.error("Erro ao atualizar meta.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMeta({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Meta removida!");
        queryClient.invalidateQueries({ queryKey: ["metas"] });
      } else {
        toast.error("Erro ao remover meta.");
      }
    },
  });

  const quickIncrementMutation = useMutation({
    mutationFn: (payload: { id: string; increment: number }) => quickUpdateMetaProgress({ data: payload }),
    onSuccess: () => {
      toast.success("Progresso atualizado!");
      queryClient.invalidateQueries({ queryKey: ["metas"] });
    },
  });

  const handleOpenNew = () => {
    setEditingMeta(null);
    setFormTitle("");
    setFormCategory("Financeiro");
    setFormPeriod("Mensal");
    setFormTargetValue("25000");
    setFormCurrentValue("0");
    setFormUnit("BRL");
    setFormAutoSync(true);
    setFormAutoSyncSource("faturamento");
    setFormDeadline(new Date().toISOString().split("T")[0]);
    setFormDescription("");
    setFormRewardNotes("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (meta: MetaRecord) => {
    setEditingMeta(meta);
    setFormTitle(meta.title);
    setFormCategory(meta.category);
    setFormPeriod(meta.period);
    setFormTargetValue(String(meta.targetValue));
    setFormCurrentValue(String(meta.currentValue));
    setFormUnit(meta.unit);
    setFormAutoSync(meta.autoSync);
    setFormAutoSyncSource(meta.autoSyncSource || "faturamento");
    setFormDeadline(meta.deadline || new Date().toISOString().split("T")[0]);
    setFormDescription(meta.description || "");
    setFormRewardNotes(meta.rewardNotes || "");
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (type: "faturamento" | "clientes" | "vendas" | "projetos" | "leads") => {
    if (type === "faturamento") {
      setFormTitle("Meta de Faturamento Mensal (R$ 30k)");
      setFormCategory("Financeiro");
      setFormUnit("BRL");
      setFormTargetValue("30000");
      setFormAutoSync(true);
      setFormAutoSyncSource("faturamento");
      setFormDescription("Meta principal de faturamento bruto da agência");
      setFormRewardNotes("🏆 Bônus especial de 10% para a equipe");
    } else if (type === "clientes") {
      setFormTitle("Aquisição de 8 Novos Clientes");
      setFormCategory("Comercial");
      setFormUnit("QUANTITY");
      setFormTargetValue("8");
      setFormAutoSync(true);
      setFormAutoSyncSource("clientes");
      setFormDescription("Novos contratos ativos no CRM");
      setFormRewardNotes("🎯 Jantar de comemoração da agência");
    } else if (type === "vendas") {
      setFormTitle("15 Vendas de Produtos & Serviços");
      setFormCategory("Comercial");
      setFormUnit("QUANTITY");
      setFormTargetValue("15");
      setFormAutoSync(true);
      setFormAutoSyncSource("vendas");
      setFormDescription("Volume de vendas e fechamentos diretos");
      setFormRewardNotes("⭐ Premiação de destaque comercial");
    } else if (type === "projetos") {
      setFormTitle("10 Projetos Concluídos no Prazo");
      setFormCategory("Operacional");
      setFormUnit("QUANTITY");
      setFormTargetValue("10");
      setFormAutoSync(true);
      setFormAutoSyncSource("projetos");
      setFormDescription("Entrega impecável com SLA dentro do prazo");
      setFormRewardNotes("🚀 Sexta-feira curta (folga às 16h)");
    } else if (type === "leads") {
      setFormTitle("40 Leads Qualificados no Funil");
      setFormCategory("Marketing");
      setFormUnit("QUANTITY");
      setFormTargetValue("40");
      setFormAutoSync(true);
      setFormAutoSyncSource("leads");
      setFormDescription("Captação e nutrição de leads estratégicos");
      setFormRewardNotes("🔥 Aumento de verba de tráfego pago");
    }
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast.error("Informe o título da meta.");
      return;
    }

    const targetNum = Math.max(1, parseFloat(formTargetValue) || 1);
    const currentNum = Math.max(0, parseFloat(formCurrentValue) || 0);

    const payload: any = {
      title: formTitle.trim(),
      category: formCategory,
      period: formPeriod,
      targetValue: targetNum,
      currentValue: currentNum,
      unit: formUnit,
      autoSync: formAutoSync,
      autoSyncSource: formAutoSync ? formAutoSyncSource : undefined,
      deadline: formDeadline,
      description: formDescription.trim(),
      rewardNotes: formRewardNotes.trim(),
    };

    if (editingMeta) {
      updateMutation.mutate({ ...editingMeta, ...payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  // Filter Logic
  const filteredMetas = metas.filter((m) => {
    if (selectedCategory !== "Todas" && m.category !== selectedCategory) return false;
    if (selectedPeriod !== "todos" && m.period !== selectedPeriod) return false;
    if (selectedStatus !== "todos" && m.status !== selectedStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchCat = m.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const formatValue = (val: number, unit: MetaRecord["unit"]) => {
    if (unit === "BRL") return brl(val);
    if (unit === "PERCENT") return `${Math.round(val)}%`;
    return `${val}`;
  };

  const getStatusBadge = (status: MetaRecord["status"], percent: number) => {
    if (status === "Superada" || percent >= 110) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-brand/20 text-brand border border-brand/40 shadow-sm shadow-brand/20 animate-pulse">
          <Sparkles className="size-3 text-brand" /> SUPERADA ({Math.round(percent)}%)
        </span>
      );
    }
    if (status === "Atingida" || percent >= 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="size-3 text-emerald-400" /> ATINGIDA (100%)
        </span>
      );
    }
    if (status === "Em Risco" || percent < 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="size-3 text-amber-400" /> EM RISCO ({Math.round(percent)}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Clock className="size-3" /> EM ANDAMENTO ({Math.round(percent)}%)
      </span>
    );
  };

  const getCategoryColor = (cat: MetaRecord["category"]) => {
    switch (cat) {
      case "Financeiro":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Comercial":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Operacional":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Marketing":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <TutorialBanner location="Dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-black bg-brand px-2.5 py-0.5 rounded-full font-sans">
              INDICADORES & OKRS
            </span>
            <span className="text-xs text-neutral-400">• Gestão Estratégica de Crescimento</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 mt-1">
            <Target className="size-7 text-brand" /> Metas & OKRs da Agência
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Defina, sincronize e acompanhe os objetivos de receita, expansão de clientes e performance operacional.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/conquistas">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-4 rounded-xl text-xs font-bold"
            >
              <Trophy className="mr-1.5 size-4 text-brand" /> Conquistas & Placas
            </Button>
          </Link>
          <Button
            onClick={handleOpenNew}
            className="gradient-brand text-black font-extrabold shadow-[0_0_20px_rgba(201,162,39,0.35)] border-0 h-10 px-4 rounded-xl hover:opacity-95 text-xs"
          >
            <Plus className="mr-1.5 size-4" /> Nova Meta
          </Button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metas Totais */}
        <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Metas Monitoradas</span>
            <div className="size-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Target className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{summary?.totalMetas ?? metas.length}</div>
          <p className="text-xs text-neutral-500 mt-1">
            {summary?.inProgressMetas ?? 0} em andamento ativo
          </p>
        </div>

        {/* Metas Atingidas / Superadas */}
        <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Metas Atingidas</span>
            <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{summary?.achievedMetas ?? 0}</div>
          <p className="text-xs text-neutral-500 mt-1">
            {metas.length > 0 ? Math.round(((summary?.achievedMetas ?? 0) / metas.length) * 100) : 0}% de taxa de sucesso
          </p>
        </div>

        {/* Progresso Médio Global */}
        <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Progresso Médio Geral</span>
            <div className="size-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{summary?.averageProgress ?? 0}%</div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-brand to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(100, summary?.averageProgress ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Meta Principal de Faturamento */}
        <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-[#111] to-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-brand flex items-center gap-1.5">
              <Flame className="size-4 text-brand animate-pulse" /> Meta de Faturamento
            </span>
            <div className="size-8 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {summary?.primaryRevenueMeta ? brl(summary.primaryRevenueMeta.currentValue) : brl(0)}
          </div>
          <p className="text-xs text-brand/90 mt-1 font-medium">
            Meta: {summary?.primaryRevenueMeta ? brl(summary.primaryRevenueMeta.targetValue) : brl(25000)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0e11] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input
            placeholder="Buscar por meta, indicador ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-brand text-black shadow-md shadow-brand/20 font-bold"
                  : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px] h-10 bg-black/60 border-white/10 text-xs text-white rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              <SelectItem value="Atingida">✓ Atingidas</SelectItem>
              <SelectItem value="Superada">🚀 Superadas</SelectItem>
              <SelectItem value="Em Risco">⚠️ Em Risco</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metas Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-neutral-500">
          <p className="animate-pulse">Carregando indicadores e metas...</p>
        </div>
      ) : filteredMetas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111]/40 p-12 text-center">
          <Target className="size-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base">Nenhuma meta encontrada</h3>
          <p className="text-xs text-neutral-500 mt-1">
            {searchTerm || selectedCategory !== "Todas"
              ? "Tente ajustar seus termos de pesquisa ou filtros."
              : "Defina sua primeira meta estratégica para guiar a equipe ao sucesso."}
          </p>
          <Button onClick={handleOpenNew} size="sm" className="mt-4 gradient-brand text-black font-bold">
            <Plus className="mr-1.5 size-4" /> Criar Primeira Meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMetas.map((meta) => {
            const percent = meta.targetValue > 0 ? (meta.currentValue / meta.targetValue) * 100 : 0;
            const remaining = Math.max(0, meta.targetValue - meta.currentValue);
            const isCompleted = percent >= 100;

            return (
              <div
                key={meta.id}
                className={`rounded-2xl border bg-[#111114] p-5 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isCompleted ? "border-brand/40 shadow-[0_0_20px_rgba(201,162,39,0.1)]" : "border-white/5 hover:border-white/20"
                }`}
              >
                <div>
                  {/* Top Bar: Badges + Action Dropdown */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getCategoryColor(meta.category)}`}>
                        {meta.category}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-400">
                        {meta.period}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {getStatusBadge(meta.status, percent)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-neutral-400 hover:text-white rounded-lg">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0e0e11] border border-white/10 text-white rounded-xl p-1 shadow-2xl">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(meta)}
                            className="cursor-pointer text-xs text-neutral-300 hover:text-white focus:bg-white/10 rounded-lg px-2.5 py-2"
                          >
                            <Edit className="size-3.5 mr-2 text-brand" /> Editar Meta
                          </DropdownMenuItem>
                          {!meta.autoSync && (
                            <DropdownMenuItem
                              onClick={() => quickIncrementMutation.mutate({ id: meta.id, increment: meta.unit === "BRL" ? 1000 : 1 })}
                              className="cursor-pointer text-xs text-emerald-400 hover:text-emerald-300 focus:bg-emerald-500/10 rounded-lg px-2.5 py-2"
                            >
                              <Plus className="size-3.5 mr-2" /> Avançar Progresso (+{meta.unit === "BRL" ? "R$ 1.000" : "1"})
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10 my-1" />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`Deseja excluir a meta "${meta.title}"?`)) {
                                deleteMutation.mutate(meta.id);
                              }
                            }}
                            className="cursor-pointer text-xs text-red-400 hover:text-red-300 focus:bg-red-500/10 rounded-lg px-2.5 py-2"
                          >
                            <Trash2 className="size-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-white font-bold text-base group-hover:text-brand transition-colors line-clamp-1 mb-1">
                    {meta.title}
                  </h3>
                  {meta.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                      {meta.description}
                    </p>
                  )}

                  {/* Progress Box */}
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 mb-3">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs text-neutral-400 font-medium">Realizado</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-white">{formatValue(meta.currentValue, meta.unit)}</span>
                        <span className="text-xs text-neutral-500 font-medium"> / {formatValue(meta.targetValue, meta.unit)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-[#1e2029] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isCompleted
                            ? "bg-gradient-to-r from-[#c9a227] to-[#e6be44] shadow-md shadow-brand/30"
                            : percent < 40
                            ? "bg-gradient-to-r from-amber-600 to-amber-400"
                            : "bg-gradient-to-r from-blue-500 to-emerald-400"
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-brand">{Math.round(percent)}% concluído</span>
                      <span className="text-neutral-400">
                        {isCompleted ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Meta Batida!
                          </span>
                        ) : (
                          `Faltam ${formatValue(remaining, meta.unit)}`
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: AutoSync Badge & Reward Note */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  {meta.rewardNotes && (
                    <div className="p-2 rounded-lg bg-brand/5 border border-brand/20 text-brand text-xs flex items-center gap-1.5 font-medium">
                      <Trophy className="size-3.5 shrink-0" />
                      <span className="line-clamp-1">{meta.rewardNotes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                    <div className="flex items-center gap-1">
                      {meta.autoSync ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <Zap className="size-3" /> Sincronizado ao Vivo
                        </span>
                      ) : (
                        <span className="text-neutral-400 flex items-center gap-1">
                          Manual
                        </span>
                      )}
                    </div>
                    {meta.deadline && (
                      <span className="flex items-center gap-1 text-neutral-400">
                        <Calendar className="size-3" /> Até {new Date(meta.deadline + "T12:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar / Editar Meta */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Target className="size-5 text-brand" />
              {editingMeta ? "Editar Meta Estratégica" : "Nova Meta & Indicador"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Configure o valor alvo, categoria e forma de acompanhamento da sua meta.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Template Buttons */}
          {!editingMeta && (
            <div className="space-y-1.5 pt-1 pb-2">
              <Label className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">
                ⚡ Modelos Rápidos de Metas
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("faturamento")}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 hover:border-brand/40 text-neutral-300 hover:text-white"
                >
                  💰 Faturamento R$ 30k
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("clientes")}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 hover:border-brand/40 text-neutral-300 hover:text-white"
                >
                  👥 8 Novos Clientes
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("vendas")}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 hover:border-brand/40 text-neutral-300 hover:text-white"
                >
                  🛍️ 15 Vendas
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate("projetos")}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 hover:border-brand/40 text-neutral-300 hover:text-white"
                >
                  🚀 10 Projetos no Prazo
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-neutral-300 mb-1.5 block">Título da Meta *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Faturamento Mensal de R$ 30.000"
                className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">Categoria</Label>
                <Select value={formCategory} onValueChange={(v: any) => setFormCategory(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                    <SelectItem value="Financeiro">Financeiro</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">Período</Label>
                <Select value={formPeriod} onValueChange={(v: any) => setFormPeriod(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">Unidade</Label>
                <Select value={formUnit} onValueChange={(v: any) => setFormUnit(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                    <SelectItem value="BRL">Reais (R$)</SelectItem>
                    <SelectItem value="QUANTITY">Quantidade</SelectItem>
                    <SelectItem value="PERCENT">Porcentagem (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">Valor Alvo (Meta) *</Label>
                <Input
                  type="number"
                  value={formTargetValue}
                  onChange={(e) => setFormTargetValue(e.target.value)}
                  placeholder="25000"
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand font-bold"
                />
              </div>

              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">Data Limite</Label>
                <Input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>
            </div>

            {/* Sincronização Automática */}
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="size-3.5 text-brand" /> Sincronização Automática com o Sistema
                  </Label>
                  <p className="text-[11px] text-neutral-400">
                    Calcula o progresso em tempo real a partir dos lançamentos da agência.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formAutoSync}
                  onChange={(e) => setFormAutoSync(e.target.checked)}
                  className="size-4 accent-[#c9a227] cursor-pointer"
                />
              </div>

              {formAutoSync ? (
                <div>
                  <Label className="text-[11px] text-neutral-400 mb-1 block">Fonte dos Dados:</Label>
                  <Select value={formAutoSyncSource} onValueChange={(v: any) => setFormAutoSyncSource(v)}>
                    <SelectTrigger className="bg-black border-white/10 text-white rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 text-white text-xs">
                      <SelectItem value="faturamento">💰 Faturamento Realizado (Entradas no Caixa)</SelectItem>
                      <SelectItem value="clientes">👥 Clientes Ativos (Base do CRM)</SelectItem>
                      <SelectItem value="vendas">🛍️ Vendas de Produtos / Serviços Registradas</SelectItem>
                      <SelectItem value="projetos">🚀 Projetos Cadastrados / Concluídos</SelectItem>
                      <SelectItem value="leads">🔥 Leads nas Pipelines de Vendas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-[11px] text-neutral-400 mb-1 block">Valor Atual Realizado:</Label>
                  <Input
                    type="number"
                    value={formCurrentValue}
                    onChange={(e) => setFormCurrentValue(e.target.value)}
                    placeholder="0"
                    className="bg-black border-white/10 text-white rounded-xl h-9 text-xs focus-visible:ring-brand"
                  />
                </div>
              )}
            </div>

            {/* Premiação / Descrição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">🏆 Premiação / Recompensa</Label>
                <Input
                  value={formRewardNotes}
                  onChange={(e) => setFormRewardNotes(e.target.value)}
                  placeholder="Ex: Bônus de 10% / Jantar da equipe"
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>

              <div>
                <Label className="text-xs text-neutral-300 mb-1.5 block">Descrição / Observações</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Foco nos contratos recorrentes"
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs h-10 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="gradient-brand text-black font-extrabold text-xs h-10 rounded-xl px-5 hover:opacity-95 shadow-md shadow-brand/20"
            >
              {addMutation.isPending || updateMutation.isPending ? "Salvando..." : editingMeta ? "Salvar Alterações" : "Criar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
