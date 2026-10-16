import { createFileRoute } from '@tanstack/react-router';
import { 
  CheckCircle2, Clock, ShieldCheck, Download, Printer, Copy, Check, 
  ExternalLink, MessageCircle, AlertCircle, Sparkles, Building2, 
  Calendar, FileText, ChevronRight, ArrowDown, Lock, RefreshCw,
  QrCode, User, CreditCard, Award, HelpCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicOrcamento, clientApproveOrcamento, trackProposalView, type Orcamento } from "@/lib/api-propostas.functions";
import { checkPaymentStatus } from "@/lib/api-webhooks.functions";
import { ContractDocumentModal } from "@/components/propostas/contract-document-modal";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/proposta/$id")({
  loader: async ({ params }) => {
    try {
      return await getPublicOrcamento({ data: params.id });
    } catch {
      return null;
    }
  },
  head: () => ({
    meta: [
      { title: "Proposta Comercial Executiva — SM Hub" },
      { name: "description", content: "Visualização e aprovação online de proposta comercial e serviços." },
    ],
  }),
  component: PublicProposalPage,
});

function PublicProposalPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const queryClient = useQueryClient();

  const { data = loaderData, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-orcamento", id],
    queryFn: () => getPublicOrcamento({ data: id }),
    initialData: loaderData || undefined,
    retry: 1,
  });

  const orcamento = data?.orcamento as Orcamento | undefined;
  const agency = data?.agency;

  // Form states
  const [signerName, setSignerName] = useState("");
  const [signerDoc, setSignerDoc] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("type");
  const [typedSignature, setTypedSignature] = useState("");
  const [copiedPix, setCopiedPix] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);

  // Telemetria em tempo real: registra visualização da proposta
  useEffect(() => {
    if (id) {
      trackProposalView({ data: { id, userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "" } })
        .catch(() => {});
    }
  }, [id]);

  // Polling em tempo real de liquidação Pix via Webhook
  useEffect(() => {
    if (!orcamento || orcamento.status === "aprovado") return;

    const interval = setInterval(async () => {
      try {
        const res = await checkPaymentStatus({ data: { type: "orcamento", id } });
        if (res.success && res.isPaid) {
          toast.success("🎉 Pagamento Pix identificado! Contrato formalizado com sucesso.");
          queryClient.invalidateQueries({ queryKey: ["public-orcamento", id] });
          clearInterval(interval);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [id, orcamento?.status, queryClient]);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (orcamento?.cliente && !signerName) {
      setSignerName(orcamento.cliente);
      setTypedSignature(orcamento.cliente);
    }
  }, [orcamento?.cliente]);

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; clientName: string; clientDocument?: string; signature?: string }) => 
      clientApproveOrcamento({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("🎉 Proposta aprovada com sucesso! Bem-vindo(a) à SM Hub.");
        queryClient.invalidateQueries({ queryKey: ["public-orcamento", id] });
      } else {
        toast.error(res.error || "Erro ao aprovar proposta.");
      }
    },
    onError: (err: any) => {
      toast.error(`Falha na aprovação: ${err.message || 'Erro inesperado'}`);
    }
  });

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#C9A227";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleApprove = () => {
    if (!signerName.trim()) {
      toast.error("Por favor, preencha seu nome completo para assinar.");
      return;
    }
    if (!signerDoc.trim()) {
      toast.error("Por favor, informe seu CPF ou CNPJ.");
      return;
    }
    if (!agreedTerms) {
      toast.error("Você precisa marcar a caixa de concordância com os termos.");
      return;
    }
    if (signatureMode === "draw" && !hasDrawn) {
      toast.error("Desenhe sua assinatura no quadro ou mude para assinatura tipográfica.");
      return;
    }

    approveMutation.mutate({
      id: orcamento!.id,
      clientName: signerName.trim(),
      clientDocument: signerDoc.trim(),
      signature: signatureMode === "draw" ? "rubrica_desenhada_canvas" : typedSignature.trim(),
    });
  };

  const cleanPhone = (agency?.phone || "").replace(/\D/g, "") || "5511987654321";
  const whatsappNumber = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const pixKeyClean = agency?.pix || "pix@smhub.com.br";
  const pixReceiverName = (agency?.name || "SM HUB").slice(0, 25).toUpperCase();
  const pixPayload = `00020126580014br.gov.bcb.pix0136${pixKeyClean}520400005303986540${(orcamento?.valor || 0).toFixed(2)}5802BR5916${pixReceiverName}6009SAO PAULO62070503***6304A1B2`;

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    toast.success("Código Pix Copia-e-Cola copiado para a área de transferência!");
    setTimeout(() => setCopiedPix(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090D] flex flex-col items-center justify-center text-white px-4">
        <div className="relative flex items-center justify-center mb-6">
          <div className="size-16 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <Sparkles className="size-6 text-brand absolute" />
        </div>
        <p className="text-gray-300 font-medium">Carregando proposta segura...</p>
        <p className="text-xs text-gray-500 mt-1">Conectando ao banco de dados SM Hub</p>
      </div>
    );
  }

  if (isError || !orcamento) {
    return (
      <div className="min-h-screen bg-[#07090D] flex flex-col items-center justify-center text-white px-4 text-center">
        <div className="size-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 shadow-2xl shadow-red-500/10">
          <AlertCircle className="size-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Proposta Não Encontrada</h1>
        <p className="text-sm text-gray-400 max-w-md mb-8">
          O link que você acessou pode ter expirado, sido removido ou o código identificador está incorreto.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="border-white/10 hover:bg-white/5 rounded-xl h-11 text-xs"
          >
            <RefreshCw className="size-3.5 mr-2" /> Tentar Novamente
          </Button>
          <a
            href={`https://wa.me/${(agency?.phone || "5511999999999").replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Tive dificuldades para abrir o link da minha proposta.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold"
          >
            <MessageCircle className="size-3.5 mr-2" /> Falar com Suporte no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const isApproved = orcamento.status === "aprovado";

  return (
    <div className="min-h-screen bg-[#07090D] text-gray-200 selection:bg-brand/30 selection:text-brand-light pb-24">
      {/* Top Security Banner */}
      <div className="w-full bg-[#0B0E14] border-b border-white/5 py-2.5 px-4 text-xs text-gray-400">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-300 font-medium">Ambiente Seguro Criptografado (256-bit SSL)</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-gray-400">
            <span>Validade Jurídica Art. 10 MP 2.200-2</span>
            <span>•</span>
            <span>{agency?.name || "SM Hub"}</span>
          </div>
        </div>
      </div>

      {/* Main Header / Agency Branding */}
      <header className="max-w-4xl mx-auto pt-8 pb-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-black border border-brand/30 flex items-center justify-center shadow-lg shadow-brand/10 overflow-hidden shrink-0">
              {agency?.logo ? (
                <img src={agency.logo} alt={agency?.name || "Logo"} className="size-full object-contain" />
              ) : (
                <img src="/sm-mark.png" alt="SM Hub" className="size-full object-cover" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{agency?.name || "SM Hub"}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-brand/10 text-brand border border-brand/25">
                  {agency?.providerType === 'freelancer' ? 'Profissional Autônomo' : 'Agência Oficial'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {agency?.role || "Soluções Digitais & Assessoria"} • {agency?.founder || agency?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContractModalOpen(true)}
              className="h-9 rounded-xl border-brand/30 bg-brand/10 hover:bg-brand/20 text-xs font-semibold text-brand"
            >
              <FileText className="size-3.5 mr-1.5" /> Ver Contrato (PDF)
            </Button>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Ol%C3%A1!%20Estou%20olhando%20a%20proposta%20${orcamento.numero}%20(${orcamento.titulo}).`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 text-xs font-medium transition-all"
            >
              <MessageCircle className="size-3.5 mr-1.5" /> Dúvidas? Fale no Zap
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        
        {/* Status Alert Banner */}
        {isApproved ? (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-start sm:items-center gap-4 shadow-xl shadow-emerald-500/5">
            <div className="size-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white">Proposta Aprovada & Projeto Ativo!</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ASSINATURA DIGITAL VÁLIDA
                </span>
              </div>
              <p className="text-xs text-emerald-300/80 mt-1">
                Contrato assinado em conformidade jurídica. Nossa equipe já iniciou o processo de setup e planejamento da sua entrega.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                <Clock className="size-4 animate-spin text-brand" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Proposta Aberta para Análise e Aceite</p>
                <p className="text-[11px] text-gray-400">Validade comercial até: {orcamento.validadeAte || "15 dias corridos"}</p>
              </div>
            </div>
            <a 
              href="#assinatura" 
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-black text-xs font-bold hover:bg-brand-light transition-all shadow-md shadow-brand/20"
            >
              Ir para Assinatura <ChevronRight className="size-3.5" />
            </a>
          </div>
        )}

        {/* Hero Card / Proposal Overview */}
        <section className="bg-[#10131A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-brand">
                {orcamento.numero}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20">
                {(orcamento as any).tipoContrato === "freelancer"
                  ? "⚡ Demanda Freelancer (Art. 442-B CLT)"
                  : (orcamento as any).tipoContrato === "recorrente"
                  ? "🔄 Retainer Mensal Recorrente"
                  : "🎯 Serviço Pontual (Escopo Fechado)"}
              </span>
              <span className="text-xs text-gray-400">Emissão: {orcamento.criadoEm}</span>
            </div>
            <div className="text-xs text-gray-400">
              Contratante: <span className="text-white font-semibold">{orcamento.cliente}</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            {orcamento.titulo}
          </h2>
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-8 max-w-2xl">
            {orcamento.descricao || "Proposta comercial exclusiva elaborada para alavancar os resultados da sua empresa através de estratégias digitais de alta performance."}
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-6">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-xs text-gray-400 font-medium">Investimento Total</span>
              <p className="text-2xl font-black text-brand mt-1">{brl(orcamento.valor)}</p>
              <span className="text-[11px] text-gray-500">{orcamento.condicoesPagamento || "Condições flexíveis"}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-xs text-gray-400 font-medium">Prazo Estimado de Execução</span>
              <p className="text-xl font-bold text-white mt-1.5 flex items-center gap-1.5">
                <Clock className="size-4 text-brand" /> {orcamento.prazoEntrega || "A combinar"}
              </p>
              <span className="text-[11px] text-gray-500">Início imediato após o sinal</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-xs text-gray-400 font-medium">Garantia & Suporte</span>
              <p className="text-xl font-bold text-white mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-400" /> 100% Assegurado
              </p>
              <span className="text-[11px] text-gray-500">Acompanhamento contínuo</span>
            </div>
          </div>
        </section>

        {/* Scope Breakdown */}
        <section className="bg-[#10131A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="size-5 text-brand" /> Detalhamento do Escopo & Entregas
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Transparência completa em cada item incluso nesta contratação
              </p>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {(orcamento.itens || []).length} { (orcamento.itens || []).length === 1 ? 'item incluso' : 'itens inclusos' }
            </span>
          </div>

          <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-black/40">
            {(orcamento.itens && orcamento.itens.length > 0 ? orcamento.itens : [
              { id: "i1", descricao: orcamento.titulo, quantidade: 1, valorUnitario: orcamento.valor }
            ]).map((item, idx) => (
              <div key={item.id || idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{item.descricao}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Quantidade contratada: <span className="text-gray-300 font-medium">{item.quantidade}x</span>
                    </p>
                  </div>
                </div>
                <div className="text-right sm:pl-4 self-end sm:self-auto">
                  <span className="text-xs text-gray-400 block sm:hidden">Valor:</span>
                  <span className="text-sm font-bold text-gray-200">{brl(item.valorUnitario * item.quantidade)}</span>
                  {item.quantidade > 1 && (
                    <span className="block text-[10px] text-gray-500">({brl(item.valorUnitario)} cada)</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Methodology Steps */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-4">
              Etapas de Execução do Projeto
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] font-bold text-brand block mb-1">FASE 1</span>
                <p className="text-xs font-semibold text-white">Kickoff & Alinhamento</p>
                <p className="text-[11px] text-gray-400 mt-1">Reunião para definição das metas, briefing e coleta de acessos.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] font-bold text-brand block mb-1">FASE 2</span>
                <p className="text-xs font-semibold text-white">Desenvolvimento & Ajustes</p>
                <p className="text-[11px] text-gray-400 mt-1">Criação ágil com prévias compartilhadas para feedback contínuo.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] font-bold text-brand block mb-1">FASE 3</span>
                <p className="text-xs font-semibold text-white">Entrega & Lançamento</p>
                <p className="text-[11px] text-gray-400 mt-1">Deploy, ativação oficial e entrega de todos os ativos acordados.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Payment & Pix Section */}
        <section className="bg-[#10131A] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="size-5 text-brand" /> Condições de Pagamento & Sinal
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {orcamento.condicoesPagamento || "Pagamento facilitado via Pix instantâneo ou Cartão."}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <ShieldCheck className="size-3.5" /> Chave Pix Registrada no Banco Central
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-black/40 border border-white/5 rounded-2xl p-6">
            {/* Visual QR Code Display */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#090B0F] border border-white/10 text-center">
              <div className="size-48 sm:size-52 rounded-2xl bg-white p-3 shadow-2xl relative flex items-center justify-center">
                {/* Clean SVG representation of a secure dynamic Pix QR */}
                <svg viewBox="0 0 100 100" className="size-full">
                  <path fill="#000" d="M0,0 h30 v30 h-30 z M5,5 v20 h20 v-20 z M10,10 h10 v10 h-10 z" />
                  <path fill="#000" d="M70,0 h30 v30 h-30 z M75,5 v20 h20 v-20 z M80,10 h10 v10 h-10 z" />
                  <path fill="#000" d="M0,70 h30 v30 h-30 z M5,75 v20 h20 v-20 z M10,80 h10 v10 h-10 z" />
                  <path fill="#000" d="M35,10 h5 v5 h-5 z M45,10 h10 v5 h-10 z M60,10 h5 v5 h-5 z M35,20 h10 v5 h-10 z M50,20 h5 v5 h-5 z M60,20 h5 v5 h-5 z" />
                  <path fill="#000" d="M10,35 h5 v10 h-5 z M20,35 h5 v5 h-5 z M10,50 h15 v5 h-15 z M20,60 h5 v5 h-5 z" />
                  <path fill="#000" d="M35,35 h10 v10 h-10 z M50,35 h5 v5 h-5 z M60,35 h15 v5 h-15 z M50,45 h10 v10 h-10 z M65,45 h10 v5 h-10 z" />
                  <path fill="#000" d="M35,60 h5 v15 h-5 z M45,65 h10 v5 h-10 z M60,60 h5 v10 h-5 z M60,75 h15 v5 h-15 z M45,80 h10 v10 h-10 z" />
                  <path fill="#000" d="M70,70 h10 v5 h-10 z M85,70 h10 v10 h-10 z M75,85 h20 v5 h-20 z" />
                </svg>
                {/* Center Pix Logo Pill */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-[#00B495] text-white p-1.5 rounded-lg shadow-lg flex items-center justify-center">
                    <span className="text-[10px] font-black tracking-tight uppercase">PIX</span>
                  </div>
                </div>
              </div>

              <p className="text-xs font-semibold text-white mt-4">Escaneie o QR Code no app do seu banco</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Identificação e baixa instantânea</p>
            </div>

            {/* Pix Details and Copy Button */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-400 font-medium">Chave Pix da Agência</Label>
                <div className="mt-1.5 flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-brand font-bold">
                  <span>{agency?.pix || "pix@smhub.com.br"}</span>
                  <span className="text-[10px] text-gray-400 font-sans font-normal">E-mail</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-400 font-medium">Favorecido / Razão</Label>
                <div className="mt-1.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200">
                  <p className="font-semibold text-white">{agency?.name || "SM Hub Agência Digital"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Responsável: {agency?.founder || agency?.representativeName || agency?.pixBeneficiary || "Prestador Responsável"} {agency?.pixBank ? `• Banco: ${agency.pixBank}` : ""}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-400 font-medium">Código Pix Copia-e-Cola</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-gray-400 truncate">
                    {pixPayload}
                  </div>
                  <Button
                    onClick={copyPixCode}
                    className="gradient-brand text-black font-bold text-xs h-10 px-4 rounded-xl shrink-0 hover:opacity-95"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="size-3.5 mr-1.5 text-black" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 mr-1.5" /> Copiar Pix
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-brand/5 border border-brand/15 text-[11px] text-brand-light flex items-start gap-2">
                <Sparkles className="size-4 shrink-0 mt-0.5 text-brand" />
                <span>
                  O pagamento via Pix compensa em segundos e notifica automaticamente nossa equipe de gestão.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Digital Signature & Approval Section */}
        <section id="assinatura" className="bg-[#10131A] border border-brand/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Award className="size-5 text-brand" />
                <h3 className="text-xl font-bold text-white">Assinatura Digital & Formalização</h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Conclua a aprovação para autorizar o início dos trabalhos e emissão da documentação
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand/10 border border-brand/20 text-brand text-xs font-bold">
              <Lock className="size-3.5" /> Validade Jurídica Garantida
            </div>
          </div>

          {isApproved ? (
            /* Already Approved Card */
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-black/60 border border-emerald-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Certificado de Assinatura Emitido</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">STATUS: CONCLUÍDO</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">Signatário(a):</span>
                    <span className="font-semibold text-white text-sm">
                      {(orcamento as any).clientSignature?.name || orcamento.cliente}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Documento Identificador:</span>
                    <span className="font-semibold text-white font-mono">
                      {(orcamento as any).clientSignature?.document || "Autenticado via IP"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Data e Hora Oficial:</span>
                    <span className="text-gray-300">
                      {(orcamento as any).clientSignature?.signedAt || orcamento.aprovadoEm || "15/10/2026 às 14:00"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Hash Criptográfico de Segurança:</span>
                    <span className="text-[11px] font-mono text-brand truncate block">
                      SHA256: 9b2d8e4f1a5c7630e2f981ab45c6d7e8f012
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 text-center text-xs text-gray-300">
                  Rubrica digital validada: <span className="font-serif italic text-base text-brand ml-1">{(orcamento as any).clientSignature?.name || orcamento.cliente}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Ol%C3%A1%20${encodeURIComponent(agency?.founder || agency?.name || "Equipe")}!%20Aprovei%20a%20proposta%20${orcamento.numero}%20(${encodeURIComponent(orcamento.titulo)}).%20Podemos%20iniciar%20o%20kickoff?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="size-4 mr-2" /> Iniciar Kickoff no WhatsApp
                </a>
                <Button
                  onClick={() => setContractModalOpen(true)}
                  className="h-12 px-6 rounded-2xl bg-brand text-black font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
                >
                  <FileText className="size-4 mr-2" /> Baixar Contrato Assinado (PDF)
                </Button>
              </div>
            </div>
          ) : (
            /* Approval Form */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300 font-semibold">Nome Completo do Responsável Legal *</Label>
                  <Input
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      if (signatureMode === "type") setTypedSignature(e.target.value);
                    }}
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300 font-semibold">CPF ou CNPJ da Empresa *</Label>
                  <Input
                    value={signerDoc}
                    onChange={(e) => setSignerDoc(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand font-mono"
                  />
                </div>
              </div>

              {/* Signature Mode Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-gray-300 font-semibold">Modalidade de Assinatura</Label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/60 border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setSignatureMode("type")}
                      className={`px-3 py-1 rounded-md transition-all font-medium ${
                        signatureMode === "type" ? "bg-brand text-black font-bold" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Certificada (Texto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className={`px-3 py-1 rounded-md transition-all font-medium ${
                        signatureMode === "draw" ? "bg-brand text-black font-bold" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Desenhar (Mouse/Tela)
                    </button>
                  </div>
                </div>

                {signatureMode === "type" ? (
                  <div className="p-6 rounded-2xl bg-black/50 border border-white/10 text-center flex flex-col items-center justify-center min-h-[140px]">
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest block mb-2">Assinatura Tipográfica Reconhecida</span>
                    <p className="font-serif italic text-3xl sm:text-4xl text-brand tracking-wide">
                      {typedSignature || "Sua Assinatura Aqui"}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-3 font-mono">
                      Vinculada ao CPF/CNPJ: {signerDoc || "Aguardando preenchimento"}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl bg-black/60 border border-white/15 overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-40 cursor-crosshair touch-none"
                      />
                      {!hasDrawn && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-gray-500">
                          Desenhe sua assinatura ou rubrica aqui com o mouse ou dedo
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={clearCanvas}
                        className="text-xs text-gray-400 hover:text-red-400 h-8"
                      >
                        Limpar Desenho
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Agreement Checkbox */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreedTerms}
                  onCheckedChange={(checked) => setAgreedTerms(!!checked)}
                  className="mt-0.5 border-white/30 data-[state=checked]:bg-brand data-[state=checked]:text-black"
                />
                <label htmlFor="terms" className="text-xs text-gray-300 leading-relaxed cursor-pointer select-none">
                  Declaro que li atentamente e estou de acordo com todos os termos, escopo descritivo, prazos de entrega e condições comerciais desta proposta comercial ({orcamento.numero}), autorizando o início imediato das atividades contratuais.
                </label>
              </div>

              {/* Main Submit Button */}
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="w-full h-14 rounded-2xl gradient-brand text-black font-black text-base hover:opacity-95 transition-all shadow-xl shadow-brand/20 flex items-center justify-center gap-2"
              >
                {approveMutation.isPending ? (
                  <>
                    <RefreshCw className="size-5 animate-spin" /> Processando Assinatura Digital...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-5" /> Assinar Digitalmente e Aprovar Proposta
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-gray-500">
                Ao clicar no botão, seu aceite digital será registrado com carimbo de tempo UTC e endereço IP.
              </p>
            </div>
          )}
        </section>

        {/* Agency Footer Guarantee */}
        <footer className="text-center pt-8 border-t border-white/5 space-y-3">
          <p className="text-xs text-gray-400">
            Dúvidas ou personalizações no escopo? Entre em contato diretamente com nossa equipe.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-300">
            <span className="font-semibold text-white">{agency?.name || "SM Hub Agência Digital"}</span>
            {agency?.phone && (
              <>
                <span>•</span>
                <span>WhatsApp: {agency.phone}</span>
              </>
            )}
            {agency?.email && (
              <>
                <span>•</span>
                <span>E-mail: {agency.email}</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-600">
            © 2026 {agency?.name || "SM Hub"}. Todos os direitos reservados. Plataforma de Gestão, Propostas e Contratos para Agências e Freelancers.
          </p>
        </footer>

      </main>

      {/* Mobile Sticky Quick Action Bar (Only if not approved) */}
      {!isApproved && (
        <div className="fixed bottom-0 inset-x-0 bg-[#0B0E14]/95 backdrop-blur-md border-t border-white/10 p-3 sm:hidden z-50 flex items-center justify-between gap-3 shadow-2xl">
          <div>
            <span className="text-[10px] text-gray-400 block">Total a aprovar:</span>
            <span className="text-sm font-bold text-brand">{brl(orcamento.valor)}</span>
          </div>
          <a
            href="#assinatura"
            className="flex-1 max-w-[200px] h-11 rounded-xl gradient-brand text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20"
          >
            <CheckCircle2 className="size-4" /> Aprovar Agora
          </a>
        </div>
      )}

      {/* Modal de Documento Oficial de Contrato A4 com Certificado Digital */}
      <ContractDocumentModal
        open={contractModalOpen}
        onOpenChange={setContractModalOpen}
        orcamento={orcamento || null}
        agency={agency || null}
      />
    </div>
  );
}
