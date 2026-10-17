import { createFileRoute } from '@tanstack/react-router';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getClientPortalData } from "@/lib/api-portal.functions";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ContractDocumentModal } from "@/components/propostas/contract-document-modal";
import type { Orcamento } from "@/lib/api-propostas.functions";

export const Route = createFileRoute("/portal/$id")({
  loader: async ({ params }) => {
    try {
      return await getClientPortalData({ data: params.id });
    } catch {
      return null;
    }
  },
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Portal do Cliente — SM Hub' },
      { property: 'og:description', content: 'Acompanhe seus projetos, contratos, entregas e faturas em tempo real.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Portal do Cliente — SM Hub" },
      { name: "description", content: "Acompanhe seus projetos, contratos, entregas e faturas em tempo real." },
    ],
  }),
  component: ClientPortalPage,
});

function ClientPortalPage() {
  const { id } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const { data: response = loaderData, isLoading, refetch } = useQuery({
    queryKey: ["client-portal", id],
    queryFn: () => getClientPortalData({ data: id }),
    initialData: loaderData || undefined,
  });

  const portalData = response?.data;
  const client = portalData?.client;
  const agency = portalData?.agency;
  const projects = portalData?.projects || [];
  const orcamentos = portalData?.orcamentos || [];
  const invoices = portalData?.invoices || [];
  const sharedLinks = portalData?.sharedLinks || [];

  const [selectedContract, setSelectedContract] = useState<Orcamento | null>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  const agencyName = agency?.tradeName || agency?.legalName || "SM Hub Agência Digital";
  const agencyPhone = (agency?.phone || "5511999999999").replace(/\D/g, "");

  const handleCopyPix = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPixId(id);
    toast.success("Código Pix Copia-e-Cola copiado com sucesso!");
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  const handleOpenContractPdf = (orc: Orcamento) => {
    setSelectedContract(orc);
    setContractModalOpen(true);
  };

  if (isLoading || !portalData) {
    return (
      <div className="min-h-screen bg-[#07080c] flex flex-col items-center justify-center text-white p-6">
        <Sparkles className="size-8 text-[#C9A227] animate-spin mb-4" />
        <p className="text-sm text-gray-400">Carregando seu portal exclusivo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-white selection:bg-[#C9A227]/30 selection:text-[#C9A227] pb-24">
      {/* Top Banner da Agência */}
      <div className="border-b border-white/10 bg-[#0d0e14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/sm-mark.png"
              alt="SM Hub"
              className="size-10 rounded-xl object-contain border border-[#C9A227]/30 shadow-md shadow-[#C9A227]/20"
            />
            <div>
              <span className="text-sm font-bold text-white block">{agencyName}</span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
                <ShieldCheck className="size-3 text-emerald-400" /> Portal Oficial do Cliente
              </span>
            </div>
          </div>

          <a
            href={`https://wa.me/${agencyPhone}?text=Ol%C3%A1%20${encodeURIComponent(agencyName)}!%20Acesse%20meu%20portal%20do%20cliente%20e%20gostaria%20de%20falar%20com%20meu%20gestor.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-bold transition-all"
          >
            <MessageCircle className="size-4 mr-2" /> Falar com o Gestor
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Hero Card de Boas-vindas */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#C9A227]/20 via-[#DFBA47]/5 to-transparent border border-[#C9A227]/30 relative overflow-hidden shadow-2xl before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#C9A227] before:to-transparent">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <Badge className="bg-gradient-to-r from-[#C9A227] to-[#DFBA47] text-black font-black text-[10px] uppercase tracking-wider px-3 py-0.5 shadow-md shadow-[#C9A227]/20">
                Área do Cliente VIP
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Olá, {client?.name}!
              </h1>
              <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
                Bem-vindo(a) ao seu painel executivo. Aqui você acompanha em tempo real o andamento das suas entregas, contratos ativos, links úteis e faturas financeiras com transparência total.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-center min-w-[130px] shadow-inner">
                <span className="text-2xl font-black text-[#C9A227]">{projects.length}</span>
                <span className="text-[11px] text-gray-400 block font-medium">Projetos Ativos</span>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-center min-w-[130px] shadow-inner">
                <span className="text-2xl font-black text-emerald-400">
                  {invoices.filter((i) => i.status === "Pago").length}
                </span>
                <span className="text-[11px] text-gray-400 block font-medium">Faturas Quitadas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Abas Principais do Portal */}
        <Tabs defaultValue="projetos" className="space-y-6">
          <TabsList className="bg-[#12141c] border border-white/10 p-1.5 rounded-2xl h-12 flex flex-wrap max-w-2xl">
            <TabsTrigger
              value="projetos"
              className="flex-1 text-xs font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C9A227] data-[state=active]:to-[#DFBA47] data-[state=active]:text-black text-gray-300 transition-all"
            >
              <Briefcase className="size-3.5 mr-2" /> Projetos & Entregas
            </TabsTrigger>
            <TabsTrigger
              value="contratos"
              className="flex-1 text-xs font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C9A227] data-[state=active]:to-[#DFBA47] data-[state=active]:text-black text-gray-300 transition-all"
            >
              <FileText className="size-3.5 mr-2" /> Contratos & Propostas
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="flex-1 text-xs font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C9A227] data-[state=active]:to-[#DFBA47] data-[state=active]:text-black text-gray-300 transition-all"
            >
              <CreditCard className="size-3.5 mr-2" /> Faturas & Pix
            </TabsTrigger>
            <TabsTrigger
              value="arquivos"
              className="flex-1 text-xs font-bold rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C9A227] data-[state=active]:to-[#DFBA47] data-[state=active]:text-black text-gray-300 transition-all"
            >
              <FolderOpen className="size-3.5 mr-2" /> Arquivos & Links
            </TabsTrigger>
          </TabsList>

          {/* ── ABA 1: PROJETOS & ENTREGAS ── */}
          <TabsContent value="projetos" className="space-y-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-6 rounded-2xl bg-[#0e1017] border border-white/10 space-y-5 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{proj.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>Prazo acordado: <strong className="text-white">{proj.deadline || "Em andamento"}</strong></span>
                      <span>•</span>
                      <span>Orçamento: <strong className="text-[#C9A227]">{brl(proj.budget)}</strong></span>
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-bold px-3 py-1 self-start sm:self-auto">
                    {proj.progress >= 100 ? "✓ Concluído" : "Em Execução Ativa"}
                  </Badge>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300 font-semibold">
                    <span>Evolução do Cronograma</span>
                    <span className="text-[#C9A227] font-mono font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#C9A227] via-[#DFBA47] to-[#E5C158] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(201,162,39,0.5)]"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                </div>

                {/* Entregáveis do Projeto */}
                {proj.deliverables && proj.deliverables.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Marcos & Entregáveis:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {proj.deliverables.map((del, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5 text-xs"
                        >
                          <CheckCircle2 className={`size-4 shrink-0 ${
                            del.type === "concluído" ? "text-emerald-400" : "text-gray-500"
                          }`} />
                          <span className="text-gray-200 font-medium truncate">{del.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ── ABA 2: CONTRATOS & PROPOSTAS ── */}
          <TabsContent value="contratos" className="space-y-4">
            {orcamentos.map((orc) => (
              <div
                key={orc.id}
                className="p-6 rounded-2xl bg-[#0e1017] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-gray-400">{orc.numero}</span>
                    <Badge className={`text-[10px] font-black uppercase ${
                      orc.status === "aprovado"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    }`}>
                      {orc.status === "aprovado" ? "✓ Formalizado & Assinado" : "Aguardando Assinatura"}
                    </Badge>
                  </div>
                  <h4 className="text-base font-bold text-white">{orc.titulo}</h4>
                  <p className="text-xs text-gray-400">
                    Emitido em {orc.criadoEm} • Investimento: <strong className="text-[#C9A227]">{brl(orc.valor)}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    onClick={() => handleOpenContractPdf(orc)}
                    className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10"
                  >
                    <Download className="size-3.5 mr-1.5 text-[#C9A227]" /> Baixar Contrato em PDF
                  </Button>
                  <a
                    href={`/proposta/${orc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-gradient-to-r from-[#C9A227] via-[#DFBA47] to-[#C9A227] hover:brightness-110 text-black text-xs font-extrabold transition-all shadow-md shadow-[#C9A227]/25"
                  >
                    <ExternalLink className="size-3.5 mr-1.5" /> Ver na Web
                  </a>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── ABA 3: FATURAS & PIX ── */}
          <TabsContent value="financeiro" className="space-y-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-6 rounded-2xl bg-[#0e1017] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] font-black uppercase ${
                      inv.status === "Pago"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    }`}>
                      {inv.status === "Pago" ? "✓ Fatura Paga" : "Aguardando Pagamento"}
                    </Badge>
                    <span className="text-xs text-gray-400">Vencimento: {inv.dueDate || "A vista"}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{inv.description}</h4>
                  <p className="text-xl font-black text-white">{brl(inv.amount)}</p>
                </div>

                {inv.status !== "Pago" && inv.pixCode ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => handleCopyPix(inv.pixCode!, inv.id)}
                      className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#C9A227] via-[#DFBA47] to-[#C9A227] text-black font-extrabold text-xs hover:brightness-110 shadow-lg shadow-[#C9A227]/30"
                    >
                      {copiedPixId === inv.id ? (
                        <>
                          <Check className="size-4 mr-1.5 text-black" /> Código Pix Copiado!
                        </>
                      ) : (
                        <>
                          <QrCode className="size-4 mr-1.5" /> Pagar via Pix Instantâneo
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="size-4" /> Recibo de quitação liberado
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ── ABA 4: ARQUIVOS & LINKS DA AGÊNCIA ── */}
          <TabsContent value="arquivos" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sharedLinks.map((link, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#0e1017] border border-white/10 space-y-3 flex flex-col justify-between hover:border-white/20 transition-all"
              >
                <div className="space-y-2">
                  <div className="size-10 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/30 text-[#C9A227] flex items-center justify-center">
                    <FolderOpen className="size-5" />
                  </div>
                  <h4 className="font-bold text-white text-sm">{link.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{link.description}</p>
                </div>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-colors"
                >
                  <ExternalLink className="size-3.5 mr-2 text-[#C9A227]" /> Acessar Link
                </a>
              </div>
            ))}
          </TabsContent>
        </Tabs>

      </div>

      {/* Modal do Contrato Oficial em PDF */}
      <ContractDocumentModal
        open={contractModalOpen}
        onOpenChange={setContractModalOpen}
        orcamento={selectedContract}
        agency={agency || null}
      />
    </div>
  );
}
