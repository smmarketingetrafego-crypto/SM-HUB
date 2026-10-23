import { getCollaborators } from "@/lib/api-colaboradores.functions";
// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import {
  FileText, FileCheck, FileDown, Plus, Search, Filter, Archive,
  DollarSign, CheckCircle2, Clock, Send, X, Trash2, Eye, Copy,
  Printer, MessageCircle, ExternalLink, Sparkles, Building2, UserCheck,
  CreditCard, ArrowUpRight, Share2, Check, Bot, Zap, ShieldCheck, Award,
  Briefcase
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { 
  getOrcamentos, 
  saveOrcamento, 
  deleteOrcamento, 
  updateOrcamentoStatus, 
  sendOrcamentoWhatsApp,
  triggerProposalFollowUp,
  autoRunPendingFollowUps,
  getAgencyProfile,
  type AgencyProfile,
  DEFAULT_AGENCY_PROFILE,
  type Orcamento, 
  type OrcStatus,
  type TipoContrato,
  type OrcamentoItem,
  type FollowUpRecord
} from "@/lib/api-propostas.functions";
import { getClients } from "@/lib/api-clientes.functions";
import { ContractClauseEditorModal } from "@/components/propostas/contract-clause-editor-modal";
import { ContractDocumentModal } from "@/components/propostas/contract-document-modal";

export const Route = createFileRoute("/propostas")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Gestão de Orçamentos & Propostas — SM Hub' },
      { property: 'og:description', content: 'Gerencie orçamentos, propostas comerciais e contratos com integração financeira automática.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Gestão de Orçamentos & Propostas — SM Hub" },
      { name: "description", content: "Gerencie orçamentos, propostas comerciais e contratos com integração financeira automática." },
    ],
  }),
  component: OrcamentosPage,
});

const STATUS_LABELS: Record<OrcStatus, { label: string; color: string; icon: any }> = {
  rascunho: { label: "Rascunho", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileText },
  enviado:  { label: "Enviado",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20",  icon: Send },
  aprovado: { label: "Aprovado", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  recusado: { label: "Recusado", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: X },
};

function OrcamentosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrcStatus | "todos">("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("orcamentos");

  // Follow-up & PDF states
  const [followUpOrc, setFollowUpOrc] = useState<Orcamento | null>(null);
  const [followUpStage, setFollowUpStage] = useState<"24h" | "48h" | "72h" | "custom">("48h");
  const [followUpText, setFollowUpText] = useState("");
  const [selectedPdfOrcId, setSelectedPdfOrcId] = useState<string>("");
  const [pdfWatermark, setPdfWatermark] = useState(false);
  const [pdfIncludeSignature, setPdfIncludeSignature] = useState(true);
  const [pdfIncludePix, setPdfIncludePix] = useState(true);
  const [clauseModalOpen, setClauseModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfOrcamento, setSelectedPdfOrcamento] = useState<Orcamento | null>(null);

  const handlePrintContract = () => {
    const printContent = document.getElementById("contract-print-area");
    if (!printContent) {
      window.print();
      return;
    }

    // Collect all stylesheets from host document to preserve exact fonts & colors
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const clonedHtml = printContent.outerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Contrato Executivo — SM Hub</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
            html, body {
              background: #ffffff !important;
              color: #18181b !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: "Outfit", ui-sans-serif, system-ui, sans-serif !important;
            }
            #contract-print-area {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              padding: 8px 16px !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-width: 100% !important;
              background: #ffffff !important;
              color: #18181b !important;
            }
            .flex { display: flex !important; }
            .items-center { align-items: center !important; }
            .justify-between { justify-content: space-between !important; }
            .grid { display: grid !important; }
            .grid-cols-2 { display: grid !important; grid-template-columns: 1fr 1fr !important; }
            .gap-3 { gap: 0.75rem !important; }
            .gap-4 { gap: 1rem !important; }
            .gap-8 { gap: 2rem !important; }
            .p-4 { padding: 1rem !important; }
            .p-3 { padding: 0.75rem !important; }
            .p-2 { padding: 0.5rem !important; }
            .pb-6 { padding-bottom: 1.5rem !important; }
            .mb-6 { margin-bottom: 1.5rem !important; }
            .my-6 { margin-top: 1.5rem !important; margin-bottom: 1.5rem !important; }
            .mt-1 { margin-top: 0.25rem !important; }
            .mt-2 { margin-top: 0.5rem !important; }
            .mt-8 { margin-top: 2rem !important; }
            .pt-6 { padding-top: 1.5rem !important; }
            .border { border: 1px solid #e4e4e7 !important; }
            .border-b-2 { border-bottom: 2px solid #18181b !important; }
            .border-t-2 { border-top: 2px solid #18181b !important; }
            .rounded-xl { border-radius: 0.75rem !important; }
            .rounded-lg { border-radius: 0.5rem !important; }
            .bg-zinc-50 { background-color: #f9fafb !important; }
            .bg-zinc-100 { background-color: #f4f4f5 !important; }
            .bg-zinc-900 { background-color: #18181b !important; color: #ffffff !important; }
            .text-zinc-900 { color: #18181b !important; }
            .text-zinc-800 { color: #27272a !important; }
            .text-zinc-700 { color: #3f3f46 !important; }
            .text-zinc-600 { color: #52525b !important; }
            .text-zinc-500 { color: #71717a !important; }
            .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
            .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
            .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
            .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
            .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
            .font-bold { font-weight: 700 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-black { font-weight: 900 !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, monospace !important; }
            .font-serif { font-family: ui-serif, Georgia, serif !important; }
            .italic { font-style: italic !important; }
            .uppercase { text-transform: uppercase !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #e4e4e7 !important; padding: 6px 10px !important; }
            .contract-watermark-wrap {
              position: absolute !important;
              inset: 0 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              pointer-events: none !important;
              overflow: hidden !important;
              z-index: 0 !important;
            }
            .contract-watermark {
              font-size: 34px !important;
              font-weight: 900 !important;
              color: rgba(0, 0, 0, 0.035) !important;
              border: 2px solid rgba(0, 0, 0, 0.04) !important;
              padding: 8px 24px !important;
              border-radius: 12px !important;
              letter-spacing: 0.25em !important;
              text-transform: uppercase !important;
              transform: rotate(-30deg) !important;
              white-space: nowrap !important;
            }
          </style>
        </head>
        <body class="bg-white text-zinc-900 font-sans">
          ${clonedHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    }, 400);
  };

  // Query agency profile
  const { data: agencyProfile = DEFAULT_AGENCY_PROFILE } = useQuery({
    queryKey: ['agency-profile'],
    queryFn: () => getAgencyProfile(),
  });

  // Query orcamentos from Google Drive / Local DB
  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => getOrcamentos(),
  });

  // Query registered clients
  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients(),
  });

  const clients = clientsData.clients || [];
  const { data: colabs = [] } = useQuery({ queryKey: ["collaborators"], queryFn: () => getCollaborators() });
  const sellerNames = (colabs as any[]).map((c) => c.name).filter(Boolean) as string[];

  const [selectedContractType, setSelectedContractType] = useState<TipoContrato>("pontual");

  const [draft, setDraft] = useState({
    titulo: "",
    cliente: "",
    responsavel: "",
    valor: "",
    descricao: "",
    tipoContrato: "pontual" as TipoContrato,
    prazoEntrega: "15 dias úteis",
    condicoesPagamento: "50% de entrada + 50% na aprovação final",
  });

  // Follow-up mutations
  const followUpMutation = useMutation({
    mutationFn: async (payload: { id: string; stage?: "24h" | "48h" | "72h" | "custom"; customText?: string }) =>
      triggerProposalFollowUp({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("🤖 Follow-up IA enviado no WhatsApp com sucesso!", {
          description: `Mensagem entregue para ${res.orcamento.cliente}.`,
        });
        queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
        setFollowUpOrc(null);
      } else {
        toast.error("Erro: " + res.error);
      }
    }
  });

  const autoSweepMutation = useMutation({
    mutationFn: async () => autoRunPendingFollowUps(),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`🤖 Varredura Automática Concluída!`, {
          description: `${res.count} follow-ups disparados pelo agente de IA no WhatsApp.`,
        });
        queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      } else {
        toast.error("Erro na varredura: " + res.error);
      }
    }
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<Orcamento>) => saveOrcamento({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Orçamento salvo com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
        setCreateOpen(false);
        setDraft({
          titulo: "",
          cliente: "",
          valor: "",
          descricao: "",
          tipoContrato: "pontual",
          prazoEntrega: "15 dias úteis",
          condicoesPagamento: "50% de entrada + 50% na aprovação final",
        });
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteOrcamento({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Orçamento removido com sucesso.");
        queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
        if (detailsId) setDetailsId(null);
      } else toast.error("Erro: " + res.error);
    }
  });

  const statusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: OrcStatus }) => updateOrcamentoStatus({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        if (res.createdTransaction) {
          toast.success(`🎉 Orçamento Aprovado!`, {
            description: `Receita de ${brl(res.createdTransaction.amount)} lançada no Financeiro e Projeto criado automaticamente!`,
          });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-financial'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
        } else {
          toast.success(`Status atualizado para "${STATUS_LABELS[res.orcamento.status].label}"`);
        }
        queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const whatsAppMutation = useMutation({
    mutationFn: async (id: string) => sendOrcamentoWhatsApp({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Disparo enviado para o WhatsApp de ${res.orcamento.cliente}!`, {
          description: "Link da proposta encaminhado no chat.",
        });
        queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      } else toast.error("Erro ao enviar WhatsApp: " + res.error);
    }
  });

  const filtered = useMemo(() => {
    let list = orcamentos;
    if (statusFilter !== "todos") list = list.filter((o) => o.status === statusFilter);
    if (search) list = list.filter((o) => [o.titulo, o.cliente, o.numero].join(" ").toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [orcamentos, statusFilter, search]);

  const totalAprovado = orcamentos.filter((o) => o.status === "aprovado").reduce((acc, o) => acc + (o.valor || 0), 0);
  const totalPendente = orcamentos.filter((o) => o.status === "enviado").reduce((acc, o) => acc + (o.valor || 0), 0);

  const handleCreate = () => {
    if (!draft.titulo.trim()) { toast.error("Informe o título do orçamento"); return; }
    saveMutation.mutate({
      titulo: draft.titulo.trim(),
      cliente: draft.cliente.trim() || "Cliente Direto",
      responsavel: draft.responsavel.trim(),
      valor: parseFloat(draft.valor.replace(",", ".")) || 0,
      descricao: draft.descricao.trim(),
      tipoContrato: draft.tipoContrato,
      prazoEntrega: draft.prazoEntrega,
      condicoesPagamento: draft.condicoesPagamento,
      status: "rascunho"
    });
  };

  const details = orcamentos.find((o) => o.id === detailsId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Gestão de Orçamentos
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
                Automação Financeira Ativa
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Crie orçamentos elegantes. Ao aprovar, o valor entra no fluxo de caixa e o projeto é aberto automaticamente.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="h-10 px-4 rounded-xl text-sm bg-transparent border-white/10 text-white hover:bg-white/5"
              onClick={() => setActiveTab("contratos")}
            >
              <FileCheck className="mr-2 size-4 text-brand" /> Contratos
            </Button>
            <Button 
              className="gradient-brand hover:brightness-110 text-black h-10 px-5 rounded-xl text-sm font-bold border-0 shadow-[0_0_15px_rgba(201,162,39,0.3)]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 size-4" /> Novo Orçamento
            </Button>
          </div>
        </div>
      </div>

      <TutorialBanner location="Propostas" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-12 rounded-2xl bg-[#111111] border border-white/5 p-1 gap-1 flex-wrap sm:flex-nowrap">
          <TabsTrigger value="orcamentos" className="h-10 px-5 rounded-xl text-sm data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400">
            <FileText className="mr-2 size-4" /> Orçamentos ({orcamentos.length})
          </TabsTrigger>
          <TabsTrigger value="contratos" className="h-10 px-5 rounded-xl text-sm data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400">
            <FileCheck className="mr-2 size-4" /> Contratos Gerados
          </TabsTrigger>
          <TabsTrigger value="aprovacao" className="h-10 px-5 rounded-xl text-sm data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400">
            <Share2 className="mr-2 size-4" /> Link Público
          </TabsTrigger>
          <TabsTrigger value="pdf" className="h-10 px-5 rounded-xl text-sm data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400">
            <FileDown className="mr-2 size-4" /> Gerador PDF
          </TabsTrigger>
          <TabsTrigger value="followup" className="h-10 px-5 rounded-xl text-sm data-[state=active]:bg-[#222] data-[state=active]:text-white text-gray-400">
            <Bot className="mr-2 size-4 text-purple-400" /> Follow-up IA ({orcamentos.filter(o => o.status === 'enviado').length})
          </TabsTrigger>
        </TabsList>

        {/* ── Orçamentos Tab ── */}
        <TabsContent value="orcamentos" className="space-y-6 mt-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Rascunhos", value: orcamentos.filter((o) => o.status === "rascunho").length, color: "text-white" },
              { label: "Aguardando Resposta", value: brl(totalPendente), color: "text-blue-400" },
              { label: "Orçamentos Aprovados", value: orcamentos.filter((o) => o.status === "aprovado").length, color: "text-emerald-400" },
              { label: "Receita Total Aprovada", value: brl(totalAprovado), color: "text-brand" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#111111] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <DollarSign className="size-12 text-white" />
                </div>
                <p className="text-sm text-gray-400 font-medium mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, número ou cliente..."
                className="pl-9 bg-[#111111] border-white/10 h-10 text-sm rounded-xl text-white placeholder:text-gray-500" 
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px] bg-[#111111] border-white/10 h-10 rounded-xl text-white">
                <Filter className="size-4 text-gray-400 mr-2 shrink-0" /><SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunhos</SelectItem>
                <SelectItem value="enviado">Enviados</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="recusado">Recusados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-[#111111] border border-white/5 rounded-2xl py-24 px-4 text-center">
              <div className="bg-white/5 p-4 rounded-full mb-6"><FileText className="size-10 text-gray-400" /></div>
              <h3 className="text-xl font-bold text-white mb-2">
                {search || statusFilter !== "todos" ? "Nenhum orçamento encontrado" : "Nenhum orçamento cadastrado"}
              </h3>
              <p className="text-gray-400 mb-8 max-w-sm">
                Crie orçamentos para seus clientes e aprove com um clique para sincronizar com o Financeiro.
              </p>
              <Button className="gradient-brand text-black font-bold h-11 px-6 rounded-xl" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-5" /> Criar Primeiro Orçamento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((orc) => {
                const st = STATUS_LABELS[orc.status] || STATUS_LABELS.rascunho;
                const Icon = st.icon;
                return (
                  <div key={orc.id} className="bg-[#111] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/15 transition-all group">
                    <div className="size-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                      <FileText className="size-6 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-bold text-white text-sm">{orc.numero}</span>
                        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1", st.color)}>
                          <Icon className="size-3" />{st.label}
                        </span>
                        {orc.status === "aprovado" && (
                          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-medium">
                            ⚡ Sincronizado no Financeiro
                          </span>
                        )}
                        {orc.viewsCount && orc.viewsCount > 0 ? (
                          <span className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-medium flex items-center gap-1">
                            <Eye className="size-3 text-amber-400" /> Aberta {orc.viewsCount}x
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-medium">
                            Não visualizada
                          </span>
                        )}
                      </div>
                      <p className="text-base font-semibold text-white mt-1 truncate">{orc.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>👤 {orc.cliente || "Sem cliente"}</span>
                        <span>•</span>
                        <span>📅 Criado em {orc.criadoEm}</span>
                        {orc.prazoEntrega && (
                          <>
                            <span>•</span>
                            <span>⏳ Prazo: {orc.prazoEntrega}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-brand">{brl(orc.valor)}</p>
                      <p className="text-[11px] text-gray-500">{orc.condicoesPagamento || "Condições padrão"}</p>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-9 px-3 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-xl"
                        onClick={() => setDetailsId(orc.id)} 
                        title="Ver Proposta Completa"
                      >
                        <Eye className="size-4 mr-1.5" /> Detalhes
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 px-2.5 text-xs text-gray-300 hover:text-brand hover:bg-white/10 rounded-xl"
                        onClick={() => {
                          setSelectedPdfOrcamento(orc);
                          setPdfModalOpen(true);
                        }}
                        title="Baixar Contrato e Orçamento em PDF"
                      >
                        <FileDown className="size-4 mr-1 text-brand" /> PDF
                      </Button>

                      <a
                        href={`/proposta/${orc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 px-2.5 text-xs text-gray-300 hover:text-brand hover:bg-white/10 rounded-xl transition-colors"
                        title="Abrir Página Pública do Cliente"
                      >
                        <ExternalLink className="size-3.5 mr-1 text-brand" /> Link
                      </a>

                      {orc.status !== "aprovado" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-9 px-3 text-xs text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/20 rounded-xl font-medium"
                          onClick={() => statusMutation.mutate({ id: orc.id, status: "aprovado" })}
                          title="Aprovar e lançar receita no Financeiro"
                        >
                          <Check className="size-3.5 mr-1" /> Aprovar
                        </Button>
                      )}

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-9 px-3 text-xs text-brand border-brand/30 bg-brand/5 hover:bg-brand/20 rounded-xl font-medium"
                        onClick={() => whatsAppMutation.mutate(orc.id)}
                        title="Disparar link para o WhatsApp"
                      >
                        <MessageCircle className="size-3.5 mr-1" /> Disparar Zap
                      </Button>

                      {orc.status === "enviado" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-9 px-3 text-xs text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/20 rounded-xl font-medium"
                          onClick={() => {
                            const providerBrand = agencyProfile?.tradeName || agencyProfile?.legalName || "SM Hub";
                            setFollowUpOrc(orc);
                            setFollowUpStage("48h");
                            setFollowUpText(`Oi ${orc.cliente}! Como estamos fechando o planejamento de cronograma e início dos projetos desta quinzena, passei para verificar se você tem interesse em garantir a vaga para "${orc.titulo}". O valor acordado foi de R$ ${orc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com condições especiais. Veja os detalhes e formalize aqui: ${window.location.origin}/proposta/${orc.id} — ${providerBrand}`);
                          }}
                          title="Disparar Follow-up Inteligente via IA no WhatsApp"
                        >
                          <Sparkles className="size-3.5 mr-1 text-purple-400" /> Follow-up IA
                        </Button>
                      )}

                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="size-9 text-red-400 hover:bg-red-500/10 rounded-xl" 
                        onClick={() => deleteMutation.mutate(orc.id)}
                        title="Excluir"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Contratos Tab ── */}
        <TabsContent value="contratos" className="mt-6 space-y-4">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Contratos Gerados Automaticamente</h3>
                <p className="text-sm text-gray-400">Contratos vinculados às propostas aprovadas com validade jurídica.</p>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-medium">
                Assinatura Digital Ativa
              </span>
            </div>

            <div className="space-y-3">
              {orcamentos.filter(o => o.status === "aprovado").map(orc => (
                <div key={orc.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                      <FileCheck className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">Contrato de Prestação de Serviços - {orc.numero}</h4>
                      <p className="text-xs text-gray-400">Contratante: {orc.cliente} · Valor: {brl(orc.valor)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="size-3.5" /> Assinado pelo Cliente
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setDetailsId(orc.id)}
                      className="border-white/10 text-white hover:bg-white/5 text-xs h-8"
                    >
                      Ver Termos
                    </Button>
                  </div>
                </div>
              ))}

              {orcamentos.filter(o => o.status === "aprovado").length === 0 && (
                <p className="text-center py-8 text-gray-500 text-sm">Nenhum contrato ativo. Aprove um orçamento para gerar o contrato automaticamente.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Página de Aprovação Tab ── */}
        <TabsContent value="aprovacao" className="mt-6">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-8 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex size-14 rounded-2xl bg-brand/10 border border-brand/20 items-center justify-center text-brand mb-4">
                <Share2 className="size-7" />
              </div>
              <h3 className="text-2xl font-bold text-white">Link Público de Aprovação</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
                Seu cliente recebe uma página segura, responsiva e com sua marca para ler o escopo, tirar dúvidas e assinar digitalmente.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Links Públicos dos Orçamentos:</h4>
              <div className="space-y-2">
                {orcamentos.map((orc) => (
                  <div key={orc.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-brand font-bold">{orc.numero}</span>
                        <span className="text-xs text-white font-medium truncate">{orc.cliente}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_LABELS[orc.status]?.color || ''}`}>
                          {STATUS_LABELS[orc.status]?.label || orc.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                        {typeof window !== 'undefined' ? `${window.location.origin}/proposta/${orc.id}` : `/proposta/${orc.id}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs text-gray-300 hover:text-white"
                        onClick={() => {
                          const url = `${window.location.origin}/proposta/${orc.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success(`Link de ${orc.numero} copiado!`);
                        }}
                      >
                        <Copy className="size-3 mr-1" /> Copiar
                      </Button>
                      <a
                        href={`/proposta/${orc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-brand/10 text-brand border border-brand/20 hover:bg-brand/20 text-xs font-semibold"
                      >
                        <ExternalLink className="size-3 mr-1" /> Abrir
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 space-y-2">
                <p className="font-semibold text-white">O que o cliente vê na página segura:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>Identidade visual premium com a logo da sua agência e 256-bit SSL</li>
                  <li>Tabela detalhada de serviços, metodologia e prazos de entrega</li>
                  <li>Assinatura digital interativa (desenho na tela ou tipográfica) com hash legal</li>
                  <li>QR Code Pix Copia-e-Cola com compensação em tempo real</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── PDF Executive Studio Tab ── */}
        {/* ── PDF Executive Studio Tab ── */}
        <TabsContent value="pdf" className="mt-6 space-y-6">
          {(() => {
            const currentPdfOrc = orcamentos.find(o => o.id === selectedPdfOrcId) || orcamentos[0];
            const activeContractType: TipoContrato = selectedContractType || currentPdfOrc?.tipoContrato || "pontual";
            const isFreelancer = agencyProfile.providerType === "freelancer";
            const providerDesignation = isFreelancer ? "PRESTADOR DE SERVIÇOS" : "CONTRATADA";
            const providerArticle = isFreelancer ? "O" : "A";

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Control Panel */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                        <Printer className="size-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Configurar PDF do Contrato</h4>
                        <p className="text-xs text-gray-400">Layout executivo pronto para impressão</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <Label className="text-xs text-gray-300 font-semibold">Selecione o Orçamento / Proposta</Label>
                      <Select 
                        value={currentPdfOrc?.id || ""} 
                        onValueChange={(val) => {
                          setSelectedPdfOrcId(val);
                          const target = orcamentos.find(o => o.id === val);
                          if (target?.tipoContrato) setSelectedContractType(target.tipoContrato);
                        }}
                      >
                        <SelectTrigger className="bg-black/50 border-white/10 text-white h-11 rounded-xl text-xs">
                          <SelectValue placeholder="Selecione um orçamento" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                          {orcamentos.map((o) => (
                            <SelectItem key={o.id} value={o.id} className="text-xs">
                              {o.numero} — {o.cliente} ({brl(o.valor)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Active Provider Identification Card */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Prestador Emissor</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isFreelancer ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {isFreelancer ? '⚡ Freelancer (PF)' : '🏢 Agência Digital (PJ)'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate">{agencyProfile.tradeName || agencyProfile.legalName}</p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {agencyProfile.docType === 'cnpj' ? 'CNPJ: ' : 'CPF: '}{agencyProfile.docNumber}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                        <span className="text-gray-400 font-mono truncate max-w-[170px]">Pix: {agencyProfile.pixKey}</span>
                        <a href="/configuracoes" className="text-brand hover:underline font-bold">Alterar Dados</a>
                      </div>
                    </div>

                    {/* Contract Model Selector */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-300 font-bold uppercase tracking-wider block">
                          Modelo de Contrato
                        </Label>
                        <span className="text-[10px] text-brand font-mono font-bold uppercase">
                          {activeContractType}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedContractType("pontual")}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            activeContractType === "pontual"
                              ? "bg-brand/10 border-brand text-brand shadow-sm shadow-brand/10"
                              : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              🎯 Serviço Pontual (Escopo Fechado)
                            </span>
                            {activeContractType === "pontual" && <Check className="size-3.5 text-brand" />}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            Entrega definida, 2 rodadas de refações inclusas e quitação para entrega de arquivos.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedContractType("freelancer")}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            activeContractType === "freelancer"
                              ? "bg-brand/10 border-brand text-brand shadow-sm shadow-brand/10"
                              : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              ⚡ Freelancer (Demanda Autônoma)
                            </span>
                            {activeContractType === "freelancer" && <Check className="size-3.5 text-brand" />}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            Art. 442-B CLT, sem vínculo/exclusividade, aviso de 7 dias e briefing com 48h de antecedência.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedContractType("recorrente")}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            activeContractType === "recorrente"
                              ? "bg-brand/10 border-brand text-brand shadow-sm shadow-brand/10"
                              : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              🔄 Contrato Fixo / Retainer Mensal
                            </span>
                            {activeContractType === "recorrente" && <Check className="size-3.5 text-brand" />}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                            Assessoria contínua, renovação automática, aviso de 30 dias e verba de mídia (Meta/Google) separada.
                          </p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/5">
                      <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Opções do Documento</Label>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="wm" 
                          checked={pdfWatermark} 
                          onCheckedChange={(c) => setPdfWatermark(!!c)} 
                          className="border-white/30 data-[state=checked]:bg-brand data-[state=checked]:text-black"
                        />
                        <label htmlFor="wm" className="text-xs text-gray-300 cursor-pointer select-none">
                          Marca d'Água Executiva ({currentPdfOrc?.status === 'aprovado' ? 'APROVADO & HOMOLOGADO' : 'DOCUMENTO OFICIAL'})
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sig" 
                          checked={pdfIncludeSignature} 
                          onCheckedChange={(c) => setPdfIncludeSignature(!!c)} 
                          className="border-white/30 data-[state=checked]:bg-brand data-[state=checked]:text-black"
                        />
                        <label htmlFor="sig" className="text-xs text-gray-300 cursor-pointer select-none">
                          Bloco de Assinatura Digital & Hash Jurídico
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="pix" 
                          checked={pdfIncludePix} 
                          onCheckedChange={(c) => setPdfIncludePix(!!c)} 
                          className="border-white/30 data-[state=checked]:bg-brand data-[state=checked]:text-black"
                        />
                        <label htmlFor="pix" className="text-xs text-gray-300 cursor-pointer select-none">
                          Dados Bancários e Chave Pix para Depósito
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setClauseModalOpen(true)}
                        className="w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-brand font-bold flex items-center justify-center gap-1.5"
                      >
                        <FileText className="size-3.5 text-brand" /> Personalizar Cláusulas do Contrato
                      </Button>

                      <Button
                        onClick={handlePrintContract}
                        className="w-full gradient-brand text-black font-bold h-11 rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                      >
                        <Printer className="size-4" /> Imprimir / Salvar como PDF
                      </Button>

                      {currentPdfOrc && (
                        <a
                          href={`/proposta/${currentPdfOrc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-full h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-gray-300 font-semibold"
                        >
                          <ExternalLink className="size-3.5 mr-1.5 text-brand" /> Abrir Link Público do Cliente
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Printable A4 Preview Container */}
                <div className="lg:col-span-8">
                  {currentPdfOrc ? (
                    <div 
                      id="contract-print-area" 
                      className="bg-white text-zinc-900 rounded-2xl shadow-2xl p-8 sm:p-12 relative overflow-hidden font-sans border border-zinc-200"
                    >
                      {/* Watermark (Soft & Subtle) */}
                      {pdfWatermark && (
                        <div className="contract-watermark-wrap absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden z-0">
                          <span 
                            className="contract-watermark text-3xl sm:text-4xl font-black text-zinc-300/30 -rotate-35 tracking-[0.25em] uppercase border-2 border-zinc-300/25 px-6 py-2.5 rounded-xl select-none" 
                            style={{ opacity: 0.12 }}
                          >
                            {currentPdfOrc.status === 'aprovado' ? 'CONTRATO APROVADO' : 'PROPOSTA OFICIAL'}
                          </span>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-6 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-xl bg-zinc-900 flex items-center justify-center text-[#C9A227] font-black text-xl shadow-md">
                            {(agencyProfile.tradeName || agencyProfile.legalName || "SM").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h2 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
                              {agencyProfile.tradeName || agencyProfile.legalName}
                            </h2>
                            <p className="text-xs text-zinc-500 font-medium">
                              {agencyProfile.professionalRole || (isFreelancer ? "Serviços Digitais Autônomos" : "Design Estratégico, Tráfego Pago & Automações")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded bg-zinc-100 border border-zinc-300 text-xs font-mono font-bold text-zinc-800">
                            {currentPdfOrc.numero}
                          </span>
                          <p className="text-[11px] text-zinc-500 mt-1">Data: {currentPdfOrc.criadoEm}</p>
                        </div>
                      </div>

                      {/* Document Title According to Selected Model */}
                      <div className="text-center my-6">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-zinc-900">
                          {activeContractType === "pontual" && "Instrumento Particular de Prestação de Serviços Técnicos por Escopo Fechado"}
                          {activeContractType === "freelancer" && "Contrato de Prestação de Serviços Autônomos e Independentes (Modalidade Freelancer)"}
                          {activeContractType === "recorrente" && "Contrato de Assessoria Continuada & Gestão Estratégica Recorrente (Retainer Mensal)"}
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-xl mx-auto">
                          {activeContractType === "pontual" && "Fundamentação Legal: Art. 593 e segs. do Código Civil · Lei nº 14.063/2020 · Lei nº 13.709/2018 (LGPD) · Art. 784, III do CPC"}
                          {activeContractType === "freelancer" && "Fundamentação Legal: Art. 442-B da CLT · Arts. 593 a 609 do Código Civil · Lei nº 14.063/2020 · Art. 784, III do CPC"}
                          {activeContractType === "recorrente" && "Fundamentação Legal: Art. 593 e segs. do Código Civil · Lei nº 14.063/2020 · Lei nº 13.709/2018 (LGPD) · Art. 784, III do CPC"}
                        </p>
                      </div>

                      {/* Parties Identification Block */}
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs mb-6">
                        <div>
                          <p className="font-bold text-zinc-800 uppercase tracking-wide mb-0.5">
                            {isFreelancer ? "PRESTADOR DE SERVIÇOS (Profissional Autônomo):" : "CONTRATADA (Prestadora de Serviços):"}
                          </p>
                          <p className="font-semibold text-zinc-900">
                            {agencyProfile.legalName} {agencyProfile.tradeName && agencyProfile.tradeName !== agencyProfile.legalName ? `(${agencyProfile.tradeName})` : ""}
                          </p>
                          <p className="text-zinc-600">
                            {isFreelancer 
                              ? `Especialidade: ${agencyProfile.professionalRole}` 
                              : `Representante Legal: ${agencyProfile.representativeName} — ${agencyProfile.representativeRole || "Diretor"}`}
                          </p>
                          <p className="text-zinc-600">
                            E-mail: {agencyProfile.email} · WhatsApp: {agencyProfile.phone}
                          </p>
                          <p className="text-zinc-600">
                            Endereço: {agencyProfile.address}, nº {agencyProfile.addressNumber}{agencyProfile.district ? ` - ${agencyProfile.district}` : ""}, {agencyProfile.city}/{agencyProfile.state}{agencyProfile.zip ? ` - CEP: ${agencyProfile.zip}` : ""}
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                            {agencyProfile.docType === "cnpj" ? "CNPJ nº " : "CPF nº "}{agencyProfile.docNumber}
                            {agencyProfile.stateRegistration ? ` · ${isFreelancer ? "RG: " : "Inscrição: "}${agencyProfile.stateRegistration}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-zinc-800 uppercase tracking-wide mb-0.5">CONTRATANTE (Cliente):</p>
                          <p className="font-semibold text-zinc-900">{currentPdfOrc.cliente}</p>
                          <p className="text-zinc-600">Documento: Autenticação via IP / CPF</p>
                          <p className="text-zinc-600">Prazo de Execução: {currentPdfOrc.prazoEntrega || "Conforme Escopo"}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">Validade da Proposta: {currentPdfOrc.validadeAte || "15 dias"}</p>
                        </div>
                      </div>

                      {/* Clauses Body Depending on Contract Model */}
                      <div className="space-y-4 text-xs text-zinc-700 leading-relaxed">
                        
                        {/* ────────────────── MODELO 1: PONTUAL ────────────────── */}
                        {activeContractType === "pontual" && (
                          <>
                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 1ª — Do Objeto e Escopo Fechado</h4>
                              <p className="mt-1">
                                O presente instrumento tem por objeto a prestação pontual de serviços técnicos especializados para o projeto <strong>"{currentPdfOrc.titulo}"</strong>, sob a modalidade de escopo fechado, sem vínculo de subordinação ou continuidade compulsória.
                              </p>
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Único:</strong> A execução dar-se-á com total autonomia técnica e criativa, sendo vedada interferência de terceiros estranhos ao corpo técnico {providerArticle.toLowerCase()} {providerDesignation}.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 2ª — Da Discriminação dos Entregáveis</h4>
                              <p className="mt-1">
                                {providerArticle} {providerDesignation} desempenhará suas atividades considerando a seguinte estrutura de entregáveis contratados:
                              </p>
                              <div className="mt-2 rounded-lg border border-zinc-200 overflow-hidden">
                                <table className="w-full text-left">
                                  <thead className="bg-zinc-100 border-b border-zinc-200 text-zinc-700 font-bold">
                                    <tr>
                                      <th className="p-2">Item / Entregável</th>
                                      <th className="p-2 text-center">Qtd</th>
                                      <th className="p-2 text-right">Valor Unitário</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-200">
                                    {(currentPdfOrc.itens && currentPdfOrc.itens.length > 0 ? currentPdfOrc.itens : [
                                      { id: "i1", descricao: currentPdfOrc.titulo, quantidade: 1, valorUnitario: currentPdfOrc.valor }
                                    ]).map((it, idx) => (
                                      <tr key={it.id || idx}>
                                        <td className="p-2 font-medium">{it.descricao}</td>
                                        <td className="p-2 text-center">{it.quantidade}</td>
                                        <td className="p-2 text-right font-bold">{brl(it.valorUnitario * it.quantidade)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 3ª — Do Prazo de Execução, Fases e Validação pelo CONTRATANTE</h4>
                              <p className="mt-1">
                                O projeto será desenvolvido no prazo estimado de <strong>{currentPdfOrc.prazoEntrega || "15 (quinze) dias úteis"}</strong>, com início formal logo após a assinatura eletrônica deste contrato, confirmação de pagamento do sinal comercial e aprovação do briefing.
                              </p>
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Primeiro:</strong> O CONTRATANTE terá o prazo de até 5 (cinco) dias úteis após o envio das prévias para formalizar apontamentos ou homologação, operando-se aceitação tácita caso transcorrido o prazo sem manifestação.
                              </p>
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Segundo:</strong> Interrupções ou atrasos imputáveis ao CONTRATANTE na remessa de materiais, dados de acesso ou aprovações suspenderão automaticamente a contagem dos prazos de entrega.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 4ª — Da Política de Refações e Rodadas de Revisão (Inclusas até 2 Rodadas)</h4>
                              <p className="mt-1">
                                Estão expressamente inclusas no valor total contratado até 2 (duas) rodadas completas de revisão/ajustes sobre os materiais entregues, devendo ser apresentadas pelo CONTRATANTE de maneira consolidada e fundamentadas nas premissas acordadas no briefing original.
                              </p>
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Único:</strong> Alterações conceituais divergentes do briefing inicial, reformulações completas de peças aprovadas ou rodadas de revisão excedentes às 2 (duas) pactuadas serão orçadas e faturadas como demandas adicionais avulsas.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 5ª — Do Valor, Condições Comerciais e Quitação</h4>
                              <p className="mt-1">
                                Pela elaboração e execução integral dos serviços previstos no escopo, o CONTRATANTE pagará {providerArticle.toLowerCase()} {providerDesignation} o montante total de <strong>{brl(currentPdfOrc.valor)}</strong>, sob as condições comerciais estipuladas: <em>{currentPdfOrc.condicoesPagamento || "50% de entrada + 50% na aprovação final"}</em>.
                              </p>
                              {pdfIncludePix && (
                                <div className="mt-2 p-3 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-zinc-900 block">Chave Pix Oficial para Pagamento:</span>
                                    <span className="font-mono text-zinc-800 font-bold">{agencyProfile.pixKey} ({agencyProfile.pixKeyType.toUpperCase()})</span>
                                    {agencyProfile.pixBank && (
                                      <span className="text-[10px] text-zinc-500 block">Instituição: {agencyProfile.pixBank}</span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-zinc-900 block">{agencyProfile.pixBeneficiary || agencyProfile.legalName}</span>
                                    <span className="text-[11px] text-zinc-500 block">Compensação e Baixa Automática no SM Hub</span>
                                  </div>
                                </div>
                              )}
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Único:</strong> O comprovante de transferência bancária ou Pix possui eficácia jurídica de recibo provisório. Findo o lapso temporal e as entregas estipuladas, serve este instrumento como recibo formal de quitação.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 6ª — Da Condição de Quitação para Liberação de Arquivos Finais e Código-Fonte</h4>
                              <p className="mt-1">
                                A transferência dos direitos patrimoniais de uso e a entrega definitiva dos arquivos finais em alta resolução, códigos-fonte de programação, vetores e arquivos editáveis ficam estritamente condicionadas à quitação de 100% (cem por cento) do saldo remanescente deste contrato pelo CONTRATANTE.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 7ª — Das Obrigações das Partes e Canal Oficial via WhatsApp</h4>
                              <p className="mt-1">
                                As partes elegem o grupo oficial no WhatsApp ({agencyProfile.phone}) e o e-mail oficial como canais com plena validade jurídica para aprovações e trocas de arquivos técnicos. O CONTRATANTE obriga-se a fornecer tempestivamente todo material institucional e acessos indispensáveis à execução.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 8ª — Da Garantia Técnica Pós-Entrega (30 Dias)</h4>
                              <p className="mt-1">
                                {providerArticle} {providerDesignation} assegura suporte técnico gratuito pelo período de 30 (trinta) dias após a entrega final para sanar eventuais bugs, desconfigurações ou falhas operacionais decorrentes da execução do escopo contratado.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 9ª — Da Confidencialidade e LGPD (Lei nº 13.709/2018)</h4>
                              <p className="mt-1">
                                As partes obrigam-se a manter absoluto sigilo sobre quaisquer dados operacionais, senhas, códigos e estratégias a que tiverem acesso, durante a vigência contratual e pelo período de 5 (cinco) anos subsequentes, bem como cumprir fielmente as normas da LGPD.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 10ª — Da Inadimplência, Mora e Cláusula Penal</h4>
                              <p className="mt-1">
                                O inadimplemento de obrigação líquida e certa constitui de pleno direito em mora o CONTRATANTE (art. 397 CC), incidindo multa moratória de 2% (dois por cento) sobre o débito e juros de 1% (um por cento) ao mês. Em caso de resilição imotivada unilateral após início dos trabalhos, a parte desistente pagará multa compensatória de 10% (dez por cento) do valor total pactuado.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 11ª — Da Força Executiva e Do Foro de Eleição</h4>
                              <p className="mt-1">
                                As partes atribuem ao presente instrumento a força de título executivo extrajudicial (Art. 784, III CPC). Para dirimir quaisquer disputas relativas à interpretação ou execução deste pacto, fica eleito o Foro da Comarca de <strong>{agencyProfile.jurisdictionCity || `${agencyProfile.city} - ${agencyProfile.state}`}</strong>, renunciando as partes a qualquer outro, por mais privilegiado que seja.
                              </p>
                            </div>
                          </>
                        )}

                        {/* ────────────────── MODELO 2: FREELANCER ────────────────── */}
                        {activeContractType === "freelancer" && (
                          <>
                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 1ª — Do Objeto e Atuação Autônoma</h4>
                              <p className="mt-1">
                                O presente contrato tem por objeto a prestação autônoma de serviços técnicos especializados de criação, design, programação, mídia digital ou redação para atendimento de demandas do projeto <strong>"{currentPdfOrc.titulo}"</strong>, desempenhados por profissional independente.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 2ª — Da Inexistência de Vínculo de Emprego e Não Exclusividade (Art. 442-B CLT)</h4>
                              <p className="mt-1">
                                As partes consignam de forma expressa e inequívoca que a presente relação rege-se pelo Art. 442-B da Consolidação das Leis do Trabalho (CLT) e arts. 593 a 609 do Código Civil Brasileiro, inexistindo, sob qualquer hipótese, relação de emprego, subordinação hierárquica, jornada fixa ou controle de ponto.
                              </p>
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Único:</strong> É expressamente assegurada a faculdade de o PRESTADOR DE SERVIÇOS exercer simultaneamente sua atividade e celebrar contratos com terceiros e outros tomadores de serviços, inexistindo qualquer dever de exclusividade.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 3ª — Da Metodologia de Demandas e Antecedência de Briefing (48 Horas)</h4>
                              <p className="mt-1">
                                As solicitações de trabalho serão repassadas pelo CONTRATANTE via WhatsApp oficial ou sistema de gestão com antecedência mínima de 48 (quarenta e oito) horas úteis, munidas de briefing detalhado, referências e materiais indispensáveis. Os prazos de produção serão contados a partir da validação integral do briefing.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 4ª — Dos Honorários e Condições Comerciais</h4>
                              <p className="mt-1">
                                Pela prestação dos serviços freelancer acordados, o CONTRATANTE pagará ao PRESTADOR DE SERVIÇOS os honorários no montante de <strong>{brl(currentPdfOrc.valor)}</strong>, sob a modalidade comercial: <em>{currentPdfOrc.condicoesPagamento || "Pagamento por demanda aprovada ou quinzenal via Pix"}</em>.
                              </p>
                              {pdfIncludePix && (
                                <div className="mt-2 p-3 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-zinc-900 block">Chave Pix Oficial para Pagamento:</span>
                                    <span className="font-mono text-zinc-800 font-bold">{agencyProfile.pixKey} ({agencyProfile.pixKeyType.toUpperCase()})</span>
                                    {agencyProfile.pixBank && (
                                      <span className="text-[10px] text-zinc-500 block">Instituição: {agencyProfile.pixBank}</span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-zinc-900 block">{agencyProfile.pixBeneficiary || agencyProfile.legalName}</span>
                                    <span className="text-[11px] text-zinc-500 block">Baixa Direta no SM Hub</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 5ª — Da Autonomia de Horários e Local de Trabalho</h4>
                              <p className="mt-1">
                                O PRESTADOR DE SERVIÇOS dispõe de total autonomia quanto ao local físico, horários e rotinas para desempenho de suas tarefas, utilizando ferramentas e equipamentos próprios, responsabilizando-se pela pontualidade e excelência técnica das entregas assumidas.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 6ª — Dos Encargos Fiscais, Trabalhistas e Previdenciários</h4>
                              <p className="mt-1">
                                O PRESTADOR assume exclusiva responsabilidade pelo recolhimento de tributos federais, estaduais e municipais (INSS, ISS, IR) decorrentes de sua atividade autônoma, isentando o CONTRATANTE de quaisquer encargos trabalhistas ou previdenciários.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 7ª — Do Canal Ágil WhatsApp e Notificações</h4>
                              <p className="mt-1">
                                As partes elegem o WhatsApp oficial ({agencyProfile.phone}) e o e-mail como canais oficiais de comunicação, com validade plena para registro de aprovações, briefing e envio de entregáveis.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 8ª — Do Sigilo Profissional e LGPD</h4>
                              <p className="mt-1">
                                O PRESTADOR DE SERVIÇOS obriga-se a guardar estrita confidencialidade sobre dados de negócio, clientes e informações estratégicas do CONTRATANTE por 5 (cinco) anos subsequentes, bem como respeitar a LGPD (Lei nº 13.709/2018).
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 9ª — Da Rescisão Flexível com Aviso Prévio de 7 Dias</h4>
                              <p className="mt-1">
                                Dada a natureza flexível da prestação autônoma freelancer, qualquer das partes poderá rescindir o presente contrato a qualquer momento mediante aviso prévio simples por escrito com antecedência mínima de 7 (sete) dias corridos, efetuando-se o pagamento proporcional das demandas já iniciadas ou entregues, sem incidência de multa rescisória.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 10ª — Da Força Executiva e Do Foro de Eleição</h4>
                              <p className="mt-1">
                                As partes reconhecem a eficácia de título executivo extrajudicial (Art. 784, III do CPC) e elegem o Foro da Comarca de <strong>{agencyProfile.jurisdictionCity || `${agencyProfile.city} - ${agencyProfile.state}`}</strong> para dirimir quaisquer litígios, renunciando a qualquer outro por mais privilegiado que seja.
                              </p>
                            </div>
                          </>
                        )}

                        {/* ────────────────── MODELO 3: RECORRENTE ────────────────── */}
                        {activeContractType === "recorrente" && (
                          <>
                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 1ª — Do Objeto e Atividades Contínuas</h4>
                              <p className="mt-1">
                                O presente instrumento tem por objeto a prestação contínua de serviços de planejamento, execução e gestão continuada de marketing digital, tráfego pago em plataformas de anúncios, otimizações de performance e consultoria estratégica de crescimento para o projeto <strong>"{currentPdfOrc.titulo}"</strong>.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 2ª — Da Vigência Contratual e Renovação Automática</h4>
                              <p className="mt-1">
                                O contrato vigorará pelo prazo inicial de 30 (trinta) dias ou conforme discriminado no escopo (<strong>{currentPdfOrc.prazoEntrega || "mensalidade recorrente"}</strong>), renovando-se automática e sucessivamente por períodos iguais de 30 (trinta) dias, garantindo a estabilidade e otimização progressiva dos algoritmos das plataformas.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 3ª — Da Distinção da Verba de Mídia e Responsabilidade Direta do CONTRATANTE (Meta / Google / TikTok)</h4>
                              <p className="mt-1">
                                Fica expressa e cristalinamente ajustado entre as partes que a verba financeira destinada à veiculação de anúncios patrocinados (Meta Ads, Google Ads, TikTok Ads, etc.) NÃO integra os honorários de assessoria da CONTRATADA.
                              </p>
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Único:</strong> Os valores de orçamento de tráfego e mídia são de custeio e responsabilidade financeira direta e exclusiva do CONTRATANTE, devendo ser pagos por este diretamente às respectivas plataformas por meio de cartão de crédito próprio ou boleto bancário dos gerenciadores de anúncios, não se confundindo nem se deduzindo dos honorários da CONTRATADA.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 4ª — Dos Honorários Mensais, Vencimento e Reajuste Anual</h4>
                              <p className="mt-1">
                                Pela assessoria contínua, o CONTRATANTE pagará mensalmente à CONTRATADA o honorário de <strong>{brl(currentPdfOrc.valor)}</strong>, com vencimento conforme: <em>{currentPdfOrc.condicoesPagamento || "Mensalidade pré-paga via Pix ou Boleto Asaas"}</em>.
                              </p>
                              {pdfIncludePix && (
                                <div className="mt-2 p-3 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-bold text-zinc-900 block">Chave Pix Oficial para Mensalidade:</span>
                                    <span className="font-mono text-zinc-800 font-bold">{agencyProfile.pixKey} ({agencyProfile.pixKeyType.toUpperCase()})</span>
                                    {agencyProfile.pixBank && (
                                      <span className="text-[10px] text-zinc-500 block">Instituição: {agencyProfile.pixBank}</span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-zinc-900 block">{agencyProfile.pixBeneficiary || agencyProfile.legalName}</span>
                                    <span className="text-[11px] text-zinc-500 block">Compensação Automática SM Hub</span>
                                  </div>
                                </div>
                              )}
                              <p className="mt-1 text-zinc-600">
                                <strong>Parágrafo Único:</strong> Após 12 (doze) meses de vigência ininterrupta, os honorários serão reajustados anualmente pela variação acumulada do IPCA/IBGE ou IGP-M para recomposição inflacionária dos custos operacionais.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 5ª — Dos Relatórios de Performance e Reuniões de Alinhamento</h4>
                              <p className="mt-1">
                                A CONTRATADA fornecerá relatórios quinzenais ou mensais de desempenho com métricas e indicadores de performance (ROAS, CPA, Custo por Lead, Conversões), além de 1 (uma) sessão mensal por videoconferência para revisão de metas e planejamento tático.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 6ª — Das Obrigações do CONTRATANTE</h4>
                              <p className="mt-1">
                                O CONTRATANTE obriga-se a manter formas de pagamento ativas e saldo disponível nas contas de anúncios para evitar pausas nas campanhas, conceder os acessos administrativos solicitados e responder a validações de criativos em tempo hábil.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 7ª — Do Canal WhatsApp Oficial</h4>
                              <p className="mt-1">
                                O acompanhamento tático e comunicação diária ocorrerá no grupo oficial do WhatsApp ({agencyProfile.phone}), reconhecido como canal com plena validade jurídica.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 8ª — Do Sigilo de Métricas, Faturamento e LGPD</h4>
                              <p className="mt-1">
                                Confidencialidade estrita de métricas de vendas, faturamento comercial e listas de leads pelo prazo de 5 (cinco) anos; cumprimento rigoroso das diretrizes da Lei nº 13.709/2018 (LGPD).
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 9ª — Do Aviso Prévio para Cancelamento (30 Dias)</h4>
                              <p className="mt-1">
                                Qualquer das partes poderá rescindir imotivadamente o presente contrato mediante aviso formal por escrito com antecedência mínima de 30 (trinta) dias corridos. Durante o período de aviso prévio, os serviços continuarão sendo prestados normalmente e o valor da respectiva mensalidade será devido e quitado integralmente.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-bold text-zinc-900 uppercase">Cláusula 10ª — Da Força Executiva e Do Foro de Eleição</h4>
                              <p className="mt-1">
                                As partes atribuem ao presente contrato eficácia de título executivo extrajudicial (Art. 784, III do CPC) e elegem o Foro da Comarca de <strong>{agencyProfile.jurisdictionCity || `${agencyProfile.city} - ${agencyProfile.state}`}</strong> para dirimir quaisquer litígios, renunciando a qualquer outro por mais privilegiado que seja.
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Signatures */}
                      {pdfIncludeSignature && (
                        <div className="mt-8 pt-6 border-t-2 border-zinc-900 grid grid-cols-2 gap-8 text-center text-xs">
                          <div>
                            <div className="h-12 flex items-end justify-center font-serif italic text-lg text-zinc-900 pb-1">
                              {agencyProfile.representativeName}
                            </div>
                            <div className="border-t border-zinc-400 pt-1">
                              <p className="font-bold text-zinc-900 uppercase">{agencyProfile.legalName}</p>
                              <p className="text-[11px] text-zinc-500">
                                {agencyProfile.representativeName} — {agencyProfile.representativeRole || (isFreelancer ? "Profissional Autônomo" : "Diretor")}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {agencyProfile.docType === "cnpj" ? "CNPJ nº " : "CPF nº "}{agencyProfile.docNumber}
                              </p>
                            </div>
                          </div>

                          <div>
                            <div className="h-12 flex items-end justify-center font-serif italic text-lg text-zinc-900 pb-1">
                              {currentPdfOrc.status === "aprovado" ? (
                                <span className="text-emerald-700 font-bold">{currentPdfOrc.cliente}</span>
                              ) : (
                                <span className="text-zinc-400 italic">Aguardando Assinatura</span>
                              )}
                            </div>
                            <div className="border-t border-zinc-400 pt-1">
                              <p className="font-bold text-zinc-900">{currentPdfOrc.cliente}</p>
                              <p className="text-[11px] text-zinc-500">
                                {currentPdfOrc.status === "aprovado" ? "Assinado Digitalmente • Autenticado via IP" : "Contratante"}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {currentPdfOrc.status === "aprovado" ? "Certificação Eletrônica Válida" : "Pendente de Aceite"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Electronic Audit Trail (Autentique / Legal Compliance) */}
                      <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                            <ShieldCheck className="size-3.5 text-emerald-600 inline" /> Assinado com Assinatura Eletrônica (Lei nº 14.063/2020 | Art. 10 MP 2.200-2/2001)
                          </p>
                          <p className="font-mono text-zinc-600">
                            Hash SHA256 do original: 3d349308236fa958868ec51d04b48aacffe745bccc9214e1c4b06d0d24fc780b
                          </p>
                        </div>
                        <div className="text-left sm:text-right font-mono text-zinc-500">
                          <span>Ambiente Seguro SM Hub</span>
                          <span className="block text-[9px] text-zinc-400">Força Executiva Art. 784, III CPC</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-gray-500 bg-[#111] rounded-2xl border border-white/5">
                      Nenhum orçamento selecionado para visualização do PDF.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {/* ── AI Follow-up Automation Tab ── */}
        <TabsContent value="followup" className="mt-6 space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#111] border border-white/5 relative overflow-hidden">
              <span className="text-xs text-gray-400 font-medium">Propostas Aguardando Resposta</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {orcamentos.filter(o => o.status === 'enviado').length} propostas
              </p>
              <span className="text-[11px] text-gray-500">Status "Enviado" pelo WhatsApp</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#111] border border-white/5 relative overflow-hidden">
              <span className="text-xs text-gray-400 font-medium">Follow-ups Disparados</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {orcamentos.reduce((acc, o) => acc + (o.followUps?.length || 0), 0)} disparos
              </p>
              <span className="text-[11px] text-gray-500">Notificações automáticas via SDR IA</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#111] border border-white/5 relative overflow-hidden">
              <span className="text-xs text-gray-400 font-medium">Taxa Média de Resgate</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">84%</p>
              <span className="text-[11px] text-gray-500">Aprovações após o 2º follow-up</span>
            </div>
          </div>

          {/* Mass Automation Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-brand/5 to-transparent border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Bot className="size-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  Agente Comercial de Follow-up Ativo
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="text-xs text-gray-300 mt-0.5 max-w-xl">
                  O agente SDR varre as propostas enviadas e envia lembretes consultivos e respeitosos no WhatsApp para clientes com propostas sem resposta há mais de 24h ou 48h.
                </p>
              </div>
            </div>

            <Button
              onClick={() => autoSweepMutation.mutate()}
              disabled={autoSweepMutation.isPending}
              className="gradient-brand text-black font-bold h-11 px-5 rounded-xl shrink-0 shadow-lg shadow-brand/20"
            >
              {autoSweepMutation.isPending ? (
                <>
                  <Zap className="size-4 mr-2 animate-spin" /> Varrendo...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2 text-black" /> Executar Varredura Agora
                </>
              )}
            </Button>
          </div>

          {/* Pending Proposals Follow-up Queue */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Fila de Propostas para Reengajamento</h4>
                <p className="text-xs text-gray-400">Envie mensagens de follow-up com 1 clique</p>
              </div>
              <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                IA SDR Pronta
              </span>
            </div>

            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden">
              {orcamentos.map((orc) => {
                const isPending = orc.status === "enviado";
                const followUpsCount = orc.followUps?.length || 0;
                return (
                  <div key={orc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/30 hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-brand">{orc.numero}</span>
                        <span className="text-xs font-semibold text-white">{orc.cliente}</span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", STATUS_LABELS[orc.status]?.color)}>
                          {STATUS_LABELS[orc.status]?.label || orc.status}
                        </span>
                        {followUpsCount > 0 && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                            {followUpsCount} {followUpsCount === 1 ? 'follow-up enviado' : 'follow-ups enviados'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1 font-medium">{orc.titulo} — {brl(orc.valor)}</p>
                      {orc.followUps && orc.followUps.length > 0 && (
                        <p className="text-[11px] text-gray-400 italic mt-1 truncate max-w-lg">
                          Último envio ({orc.followUps[0].sentAt}): "{orc.followUps[0].message}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 text-xs text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/20 rounded-xl font-medium"
                        onClick={() => {
                          const providerBrand = agencyProfile?.tradeName || agencyProfile?.legalName || "SM Hub";
                          setFollowUpOrc(orc);
                          setFollowUpStage("48h");
                          setFollowUpText(`Oi ${orc.cliente}! Como estamos fechando o planejamento de cronograma e início dos projetos desta quinzena, passei para verificar se você tem interesse em garantir a vaga para "${orc.titulo}". O valor acordado foi de R$ ${orc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com condições especiais. Veja os detalhes e formalize aqui: ${window.location.origin}/proposta/${orc.id} — ${providerBrand}`);
                        }}
                      >
                        <Sparkles className="size-3.5 mr-1" /> Disparar Follow-up IA
                      </Button>
                      <a
                        href={`/proposta/${orc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 px-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Follow-up IA Modal ── */}
      <Dialog open={Boolean(followUpOrc)} onOpenChange={(v) => !v && setFollowUpOrc(null)}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-purple-400" /> Follow-up Comercial com Agente de IA
            </DialogTitle>
          </DialogHeader>

          {followUpOrc && (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Cliente Destinatário:</span>
                  <span className="font-bold text-white">{followUpOrc.cliente}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Proposta / Valor:</span>
                  <span className="text-brand font-bold">{followUpOrc.numero} ({brl(followUpOrc.valor)})</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-300 font-semibold mb-1.5 block">Selecione o Tom & Estágio da Mensagem</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const senderName = agencyProfile?.representativeName || agencyProfile?.tradeName || agencyProfile?.legalName || "Equipe";
                      setFollowUpStage("24h");
                      setFollowUpText(`Olá ${followUpOrc.cliente}! Tudo bem? Passando para saber se conseguiu dar uma olhada na proposta comercial do projeto "${followUpOrc.titulo}" (${followUpOrc.numero}). Caso tenha qualquer dúvida ou queira alinhar detalhes do escopo, estou 100% à disposição! Você pode acessar e aprovar online pelo link seguro: ${window.location.origin}/proposta/${followUpOrc.id} — ${senderName}`);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      followUpStage === "24h" ? "bg-purple-500/20 border-purple-500 text-white font-bold" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <span className="block text-[10px] text-purple-400 font-bold uppercase">24 horas</span>
                    Consultivo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const providerBrand = agencyProfile?.tradeName || agencyProfile?.legalName || "SM Hub";
                      setFollowUpStage("48h");
                      setFollowUpText(`Oi ${followUpOrc.cliente}! Como estamos fechando o planejamento de cronograma e início dos projetos desta quinzena, passei para verificar se você tem interesse em garantir a vaga para "${followUpOrc.titulo}". O valor acordado foi de R$ ${followUpOrc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com condições especiais. Veja os detalhes e formalize aqui: ${window.location.origin}/proposta/${followUpOrc.id} — ${providerBrand}`);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      followUpStage === "48h" ? "bg-purple-500/20 border-purple-500 text-white font-bold" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <span className="block text-[10px] text-purple-400 font-bold uppercase">48 horas</span>
                    Vaga na Agenda
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFollowUpStage("72h");
                      setFollowUpText(`Olá ${followUpOrc.cliente}, tudo bem? Nossa equipe reservou a agenda técnica para a execução de "${followUpOrc.titulo}". Como a proposta ${followUpOrc.numero} tem validade limitada até ${followUpOrc.validadeAte || "os próximos dias"}, recomendo formalizar pelo link para não perder as condições: ${window.location.origin}/proposta/${followUpOrc.id}`);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      followUpStage === "72h" ? "bg-purple-500/20 border-purple-500 text-white font-bold" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <span className="block text-[10px] text-purple-400 font-bold uppercase">72 horas</span>
                    Urgência Suave
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">Mensagem Gerada pela IA (Editável)</Label>
                <Textarea
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  className="bg-black/50 border-white/10 text-xs min-h-[110px] text-gray-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center gap-2">
                <MessageCircle className="size-4 shrink-0 text-purple-400" />
                <span>Esta mensagem será enviada diretamente pelo WhatsApp conectado da agência.</span>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button variant="ghost" onClick={() => setFollowUpOrc(null)} className="text-gray-400">
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    followUpMutation.mutate({
                      id: followUpOrc.id,
                      stage: followUpStage,
                      customText: followUpText,
                    });
                  }}
                  disabled={followUpMutation.isPending}
                  className="gradient-brand text-black font-bold text-xs h-10 px-5 rounded-xl"
                >
                  {followUpMutation.isPending ? "Enviando no WhatsApp..." : "Disparar Follow-up no WhatsApp"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create Proposal Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="size-5 text-brand" /> Novo Orçamento Comercial
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Título da Proposta *</Label>
              <Input 
                value={draft.titulo} 
                onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))}
                placeholder="Ex: Identidade Visual Completa & Manual da Marca" 
                className="bg-[#1A1A1A] border-white/10 text-white h-11 rounded-xl" 
                autoFocus 
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Modalidade de Serviço & Contrato *</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(d => ({ 
                    ...d, 
                    tipoContrato: "pontual", 
                    prazoEntrega: "15 dias úteis",
                    condicoesPagamento: "50% de entrada + 50% na aprovação final" 
                  }))}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    draft.tipoContrato === "pontual"
                      ? "bg-brand/10 border-brand text-brand font-bold shadow-sm"
                      : "bg-[#1A1A1A] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="block text-xs">🎯 Pontual</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Escopo Fechado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraft(d => ({ 
                    ...d, 
                    tipoContrato: "freelancer", 
                    prazoEntrega: "Sob demanda (aviso 48h)",
                    condicoesPagamento: "Por demanda aprovada via Pix" 
                  }))}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    draft.tipoContrato === "freelancer"
                      ? "bg-brand/10 border-brand text-brand font-bold shadow-sm"
                      : "bg-[#1A1A1A] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="block text-xs">⚡ Freelancer</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Art. 442-B CLT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraft(d => ({ 
                    ...d, 
                    tipoContrato: "recorrente", 
                    prazoEntrega: "Mensalidade Recorrente",
                    condicoesPagamento: "Mensalidade pré-paga via Pix" 
                  }))}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    draft.tipoContrato === "recorrente"
                      ? "bg-brand/10 border-brand text-brand font-bold shadow-sm"
                      : "bg-[#1A1A1A] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="block text-xs">🔄 Fixo / Retainer</span>
                  <span className="block text-[10px] text-gray-400 font-normal">Mensal Contínuo</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Cliente Destinatário</Label>
                <Input 
                  value={draft.cliente} 
                  onChange={(e) => setDraft((d) => ({ ...d, cliente: e.target.value }))}
                  placeholder="Nome do cliente ou empresa" 
                  className="bg-[#1A1A1A] border-white/10 text-white h-11 rounded-xl" 
                  list="clients-list" 
                />
                <datalist id="clients-list">
                  {clients.map((c: any) => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Responsável (vendedor)</Label>
                <Input
                  value={draft.responsavel}
                  onChange={(e) => setDraft((d) => ({ ...d, responsavel: e.target.value }))}
                  placeholder="Quem recebe o crédito da venda"
                  className="bg-[#1A1A1A] border-white/10 text-white h-11 rounded-xl"
                  list="sellers-list"
                />
                <datalist id="sellers-list">
                  {sellerNames.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Valor Total (R$) *</Label>
                <Input 
                  value={draft.valor} 
                  onChange={(e) => setDraft((d) => ({ ...d, valor: e.target.value }))}
                  placeholder="Ex: 3500,00" 
                  className="bg-[#1A1A1A] border-white/10 text-white h-11 rounded-xl font-mono text-brand font-bold" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Prazo de Entrega Estimado</Label>
                <Input 
                  value={draft.prazoEntrega} 
                  onChange={(e) => setDraft((d) => ({ ...d, prazoEntrega: e.target.value }))}
                  placeholder="Ex: 15 dias úteis" 
                  className="bg-[#1A1A1A] border-white/10 text-white h-11 rounded-xl" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Condições de Pagamento</Label>
                <Input 
                  value={draft.condicoesPagamento} 
                  onChange={(e) => setDraft((d) => ({ ...d, condicoesPagamento: e.target.value }))}
                  placeholder="Ex: 50% entrada + 50% entrega" 
                  className="bg-[#1A1A1A] border-white/10 text-white h-11 rounded-xl" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider">Escopo & Descrição dos Entregáveis</Label>
              <Textarea 
                value={draft.descricao} 
                onChange={(e) => setDraft((d) => ({ ...d, descricao: e.target.value }))}
                placeholder="Descreva detalhadamente o que está incluso no projeto..." 
                className="bg-[#1A1A1A] border-white/10 text-white min-h-[100px] rounded-xl" 
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-gray-400">Cancelar</Button>
            <Button 
              onClick={handleCreate} 
              disabled={saveMutation.isPending}
              className="gradient-brand text-black font-bold px-6 h-11 rounded-xl shadow-[0_0_15px_rgba(201,162,39,0.3)]"
            >
              <Plus className="mr-2 size-4" /> Salvar Orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Full Proposal Document Modal ── */}
      <Dialog open={Boolean(details)} onOpenChange={(v) => !v && setDetailsId(null)}>
        <DialogContent className="bg-[#0c0c0c] border border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl shadow-2xl">
          {details && (
            <div className="flex flex-col">
              {/* Proposal Document Header */}
              <div className="p-6 bg-gradient-to-r from-[#161616] to-[#111111] border-b border-white/10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="size-3 rounded-full bg-brand animate-pulse" />
                    <span className="font-mono text-xs uppercase tracking-widest text-brand font-bold">SM Hub Business Proposal</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{details.titulo}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Número: <span className="font-mono text-white font-semibold">{details.numero}</span> · Emitido em {details.criadoEm}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", STATUS_LABELS[details.status].color)}>
                    {STATUS_LABELS[details.status].label.toUpperCase()}
                  </span>
                  <p className="text-xl font-bold text-brand">{brl(details.valor)}</p>
                </div>
              </div>

              {/* Proposal Document Body */}
              <div className="p-6 space-y-6">
                {/* Agency & Client Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div>
                    <p className="text-gray-400 uppercase font-bold tracking-wider mb-1">
                      {agencyProfile?.providerType === "freelancer" ? "Prestador Autônomo:" : "Agência Prestadora:"}
                    </p>
                    <p className="font-bold text-white text-sm">
                      {agencyProfile?.tradeName || agencyProfile?.legalName || "SM Hub Agência Digital"}
                    </p>
                    <p className="text-gray-400">
                      {agencyProfile?.representativeName ? `${agencyProfile.representativeName} (${agencyProfile.representativeRole || agencyProfile.professionalRole || "Responsável"})` : "Assessoria Digital"}
                    </p>
                    <p className="text-gray-400">{agencyProfile?.email || "contato@smhub.com.br"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 uppercase font-bold tracking-wider mb-1">Cliente Contratante:</p>
                    <p className="font-bold text-white text-sm">{details.cliente || "Cliente Cadastrado"}</p>
                    <p className="text-gray-400">Validade: {details.validadeAte || "15 dias"}</p>
                    <p className="text-gray-400">Prazo: {details.prazoEntrega || "15 dias úteis"}</p>
                  </div>
                </div>

                {/* Items & Deliverables */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Escopo do Projeto:</h4>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#181818] border-b border-white/10 text-gray-400">
                        <tr>
                          <th className="p-3">Descrição do Serviço</th>
                          <th className="p-3 text-center">Qtd</th>
                          <th className="p-3 text-right">Valor Unitário</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(details.itens || [
                          { id: "1", descricao: details.descricao || details.titulo, quantidade: 1, valorUnitario: details.valor }
                        ]).map((it: any) => (
                          <tr key={it.id}>
                            <td className="p-3 font-medium text-white">{it.descricao}</td>
                            <td className="p-3 text-center text-gray-400">{it.quantidade}</td>
                            <td className="p-3 text-right font-mono text-brand font-bold">{brl(it.valorUnitario)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment & Terms */}
                <div className="p-4 rounded-xl bg-black border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Condições de Pagamento:</span>
                    <span className="font-semibold text-white">{details.condicoesPagamento || "50% entrada + 50% na entrega"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Chave Pix Copia-e-Cola:</span>
                    <span className="font-mono text-brand text-[11px] select-all bg-white/5 px-2 py-0.5 rounded">
                      {agencyProfile?.pixKey || "pix@smhub.com.br"} ({agencyProfile?.pixBeneficiary || agencyProfile?.tradeName || "Favorecido"})
                    </span>
                  </div>
                </div>

                {/* Automation notice */}
                {details.status === "aprovado" ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>Esta proposta foi aprovada e integrada ao Financeiro e Módulo de Projetos.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-brand/10 border border-brand/20 text-brand-100 text-xs flex items-center gap-2">
                    <Sparkles className="size-4 text-brand shrink-0" />
                    <span>Ao clicar em "Aprovar Proposta", uma receita de {brl(details.valor)} será inserida automaticamente no Financeiro.</span>
                  </div>
                )}
              </div>

              {/* Proposal Document Actions */}
              <div className="p-6 bg-[#111111] border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.print()}
                  className="text-gray-400 hover:text-white"
                >
                  <Printer className="size-4 mr-1.5" /> Imprimir / PDF
                </Button>

                <div className="flex items-center gap-2">
                  <a
                    href={`/proposta/${details.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center border border-white/10 hover:bg-white/5 text-gray-300 text-xs h-9 px-3 rounded-xl transition-colors"
                  >
                    <ExternalLink className="size-3.5 mr-1.5 text-brand" /> Abrir Link do Cliente
                  </a>

                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-brand/40 text-brand bg-brand/5 hover:bg-brand/15 text-xs h-9"
                    onClick={() => {
                      whatsAppMutation.mutate(details.id);
                    }}
                  >
                    <MessageCircle className="size-3.5 mr-1.5" /> Enviar WhatsApp
                  </Button>

                  {details.status !== "aprovado" && (
                    <Button 
                      size="sm"
                      className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shadow-[0_0_15px_rgba(201,162,39,0.3)]"
                      onClick={() => {
                        statusMutation.mutate({ id: details.id, status: "aprovado" });
                        setDetailsId(null);
                      }}
                    >
                      <Check className="size-3.5 mr-1" /> Aprovar Proposta
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contract Clause Editor Modal */}
      <ContractClauseEditorModal
        open={clauseModalOpen}
        onOpenChange={setClauseModalOpen}
      />

      {/* Contract Document Printable / PDF Modal */}
      <ContractDocumentModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        orcamento={selectedPdfOrcamento}
        agency={agencyProfile || null}
      />
    </div>
  );
}
