import { createFileRoute } from '@tanstack/react-router';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  FileText,
  Printer,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Building2,
  Calendar,
  Award,
  ArrowUpRight,
  Eye,
  RefreshCw,
  Clock,
  SlidersHorizontal
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/lib/api-clientes.functions";
import { getAgencyProfile, type AgencyProfile, DEFAULT_AGENCY_PROFILE } from "@/lib/api-propostas.functions";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Relatórios Executivos de Performance — SM Hub' },
      { property: 'og:description', content: 'Gere relatórios executivos de tráfego, conversão e ROI com períodos configuráveis.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Relatórios Executivos de Performance — SM Hub" },
      { name: "description", content: "Gere relatórios executivos de tráfego, conversão e ROI com períodos configuráveis." },
    ],
  }),
  component: ReportsPage,
});

type PeriodType = "mensal" | "quinzenal" | "trimestral" | "semanal" | "custom";

function ReportsPage() {
  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ["clients-data"],
    queryFn: () => getClients(),
  });
  const { data: agencyProfile = DEFAULT_AGENCY_PROFILE } = useQuery({
    queryKey: ["agency-profile"],
    queryFn: () => getAgencyProfile(),
  });

  const clients = clientsData.clients || [];

  // Form State
  const [selectedClientName, setSelectedClientName] = useState<string>(() => clients[0]?.name || "");
  
  // Configuração do Período
  const [periodType, setPeriodType] = useState<PeriodType>("mensal");
  const [monthPreset, setMonthPreset] = useState("Outubro / 2026");
  const [fortnightPreset, setFortnightPreset] = useState("1ª Quinzena de Outubro / 2026");
  const [quarterPreset, setQuarterPreset] = useState("4º Trimestre / 2026 (Q4)");
  const [weekPreset, setWeekPreset] = useState("Últimos 7 dias");
  const [customStart, setCustomStart] = useState("2026-10-01");
  const [customEnd, setCustomEnd] = useState("2026-10-21");

  // Métricas
  const [adSpend, setAdSpend] = useState<number>(3500);
  const [impressions, setImpressions] = useState<number>(94500);
  const [leadsCount, setLeadsCount] = useState<number>(168);
  const [revenue, setRevenue] = useState<number>(22400);
  const [notes, setNotes] = useState<string>(
    "No período avaliado otimizamos a alocação de verba nos criativos de maior retenção. O Custo por Lead (CPL) apresentou redução e o índice de qualificação comercial avançou, gerando um ROAS expressivo. Para a próxima etapa, recomendamos expandir a segmentação e testar novos ângulos de oferta."
  );

  const [copiedText, setCopiedText] = useState(false);

  // Cálculo da Duração e Label do Período
  const { periodLabel, daysCount } = useMemo(() => {
    switch (periodType) {
      case "mensal":
        return { periodLabel: `Mensal: ${monthPreset}`, daysCount: 30 };
      case "quinzenal":
        return { periodLabel: `Quinzenal: ${fortnightPreset}`, daysCount: 15 };
      case "trimestral":
        return { periodLabel: `Trimestral: ${quarterPreset}`, daysCount: 90 };
      case "semanal":
        return { periodLabel: `Semanal: ${weekPreset}`, daysCount: 7 };
      case "custom": {
        const start = new Date(customStart + "T12:00:00");
        const end = new Date(customEnd + "T12:00:00");
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const validDays = isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
        const startFmt = start.toLocaleDateString("pt-BR");
        const endFmt = end.toLocaleDateString("pt-BR");
        return {
          periodLabel: `${startFmt} a ${endFmt} (${validDays} dias)`,
          daysCount: validDays
        };
      }
    }
  }, [periodType, monthPreset, fortnightPreset, quarterPreset, weekPreset, customStart, customEnd]);

  // Auto-calculated KPIs
  const cpl = useMemo(() => (leadsCount > 0 ? adSpend / leadsCount : 0), [adSpend, leadsCount]);
  const roas = useMemo(() => (adSpend > 0 ? revenue / adSpend : 0), [adSpend, revenue]);
  const netProfit = useMemo(() => revenue - adSpend, [revenue, adSpend]);
  const roiPercent = useMemo(() => (adSpend > 0 ? ((revenue - adSpend) / adSpend) * 100 : 0), [revenue, adSpend]);
  
  // Médias Diárias
  const dailySpend = useMemo(() => (daysCount > 0 ? adSpend / daysCount : 0), [adSpend, daysCount]);
  const dailyLeads = useMemo(() => (daysCount > 0 ? (leadsCount / daysCount).toFixed(1) : "0"), [leadsCount, daysCount]);

  const selectedClient = clients.find((c: any) => c.name === selectedClientName);
  const clientPhone = selectedClient?.phone ? selectedClient.phone.replace(/\D/g, "") : "";
  const agencyBrand = agencyProfile?.tradeName || agencyProfile?.legalName || "SM Hub Agência Digital";

  // Formata o relatório para envio direto no WhatsApp
  const formattedWhatsAppMessage = useMemo(() => {
    return `📊 *RELATÓRIO DE PERFORMANCE & ROI — SM HUB*
🏢 *Cliente:* ${selectedClientName}
📅 *Período Avaliado:* ${periodLabel} (${daysCount} dias)
🚀 *Assessoria:* ${agencyBrand}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *INVESTIMENTO EM ANÚNCIOS:* ${brl(adSpend)} (~${brl(dailySpend)}/dia)
👥 *PESSOAS IMPACTADAS (ALCANCE):* ${impressions.toLocaleString("pt-BR")}
🎯 *LEADS GERADOS:* ${leadsCount} contatos (~${dailyLeads}/dia)
⚡ *CUSTO MÉDIO POR LEAD (CPL):* ${brl(cpl)}
📈 *FATURAMENTO / VENDAS:* ${brl(revenue)}
🔥 *RETORNO SOBRE O INVESTIMENTO (ROAS):* ${roas.toFixed(2)}x (+${roiPercent.toFixed(0)}% ROI)
━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *PARECER ESTRATÉGICO DA AGÊNCIA:*
"${notes}"

🔗 _Relatório executivo auditado e gerado pela plataforma SM HUB._`;
  }, [selectedClientName, agencyBrand, periodLabel, daysCount, adSpend, dailySpend, impressions, leadsCount, dailyLeads, cpl, revenue, roas, roiPercent, notes]);

  const handleCopyFormattedText = () => {
    navigator.clipboard.writeText(formattedWhatsAppMessage);
    setCopiedText(true);
    toast.success("Relatório formatado copiado para a área de transferência!");
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleSendWhatsApp = () => {
    const phone = clientPhone || "5511999999999";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(formattedWhatsAppMessage)}`;
    window.open(url, "_blank");
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="size-7 text-[#ff5722]" /> Relatórios Executivos de Performance
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gere relatórios customizados por quantidade de dias, quinzena, mês ou trimestre.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleCopyFormattedText}
            className="h-10 text-xs border-white/10 hover:bg-white/5 text-gray-300 rounded-xl"
          >
            {copiedText ? (
              <>
                <Check className="size-4 mr-1.5 text-emerald-400" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="size-4 mr-1.5" /> Copiar p/ WhatsApp
              </>
            )}
          </Button>

          <Button
            onClick={handleSendWhatsApp}
            className="h-10 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 rounded-xl"
          >
            <MessageCircle className="size-4 mr-1.5" /> Enviar no Zap
          </Button>

          <Button
            onClick={handlePrintReport}
            className="h-10 text-xs font-bold bg-[#ff5722] hover:bg-[#ff5722]/90 text-white shadow-lg shadow-[#ff5722]/20 rounded-xl"
          >
            <Printer className="size-4 mr-1.5" /> Baixar PDF / Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Painel de Edição / Controles (Esquerda: 5 colunas) */}
        <div className="lg:col-span-5 space-y-6 bg-[#0e1017] border border-white/10 rounded-3xl p-6 shadow-xl print:hidden">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Sparkles className="size-5 text-[#ff5722]" />
            <h3 className="font-bold text-white text-base">Parâmetros do Relatório</h3>
          </div>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-semibold">Cliente Destinatário *</Label>
              <select
                value={selectedClientName}
                onChange={(e) => setSelectedClientName(e.target.value)}
                className="w-full h-11 bg-black/50 border border-white/10 rounded-xl px-3.5 text-sm text-white focus:border-[#ff5722] focus:outline-none"
              >
                {clients.map((c: any) => (
                  <option key={c.id || c.name} value={c.name} className="bg-neutral-900 text-white">
                    {c.name} {c.company ? `(${c.company})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Período Definido pela Agência */}
            <div className="space-y-2 bg-black/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-brand font-semibold flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5" />
                  Tipo de Período do Relatório
                </Label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {daysCount} dias calculados
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
                {(["mensal", "quinzenal", "trimestral", "semanal", "custom"] as PeriodType[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPeriodType(mode)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold capitalize transition-all text-center border ${
                      periodType === mode
                        ? "bg-brand/20 border-brand text-brand shadow-sm"
                        : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    {mode === "custom" ? "Dias Livres" : mode}
                  </button>
                ))}
              </div>

              {/* Controles Específicos por Tipo */}
              <div className="pt-2">
                {periodType === "mensal" && (
                  <Select value={monthPreset} onValueChange={setMonthPreset}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                      <SelectItem value="Outubro / 2026">Outubro / 2026</SelectItem>
                      <SelectItem value="Setembro / 2026">Setembro / 2026</SelectItem>
                      <SelectItem value="Agosto / 2026">Agosto / 2026</SelectItem>
                      <SelectItem value="Julho / 2026">Julho / 2026</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {periodType === "quinzenal" && (
                  <Select value={fortnightPreset} onValueChange={setFortnightPreset}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                      <SelectItem value="1ª Quinzena de Outubro / 2026">1ª Quinzena (01 a 15 de Outubro)</SelectItem>
                      <SelectItem value="2ª Quinzena de Outubro / 2026">2ª Quinzena (16 a 31 de Outubro)</SelectItem>
                      <SelectItem value="1ª Quinzena de Setembro / 2026">1ª Quinzena de Setembro</SelectItem>
                      <SelectItem value="2ª Quinzena de Setembro / 2026">2ª Quinzena de Setembro</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {periodType === "trimestral" && (
                  <Select value={quarterPreset} onValueChange={setQuarterPreset}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                      <SelectItem value="4º Trimestre / 2026 (Q4)">4º Trimestre / 2026 (Out - Dez)</SelectItem>
                      <SelectItem value="3º Trimestre / 2026 (Q3)">3º Trimestre / 2026 (Jul - Set)</SelectItem>
                      <SelectItem value="2º Trimestre / 2026 (Q2)">2º Trimestre / 2026 (Abr - Jun)</SelectItem>
                      <SelectItem value="1º Trimestre / 2026 (Q1)">1º Trimestre / 2026 (Jan - Mar)</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {periodType === "semanal" && (
                  <Select value={weekPreset} onValueChange={setWeekPreset}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                      <SelectItem value="Últimos 7 dias">Últimos 7 dias corridos</SelectItem>
                      <SelectItem value="Semana 42 (12 a 18/10)">Semana 42 (12 a 18/10)</SelectItem>
                      <SelectItem value="Semana 41 (05 a 11/10)">Semana 41 (05 a 11/10)</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {periodType === "custom" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400">Data Inicial</span>
                      <Input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-black/60 border-white/10 text-white h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400">Data Final</span>
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-black/60 border-white/10 text-white h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Valores de Investimento e Faturamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">Investimento (R$)</Label>
                <Input
                  type="number"
                  value={adSpend}
                  onChange={(e) => setAdSpend(Number(e.target.value))}
                  className="bg-black/50 border-white/10 text-white h-11 text-sm font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">Faturamento Gerado (R$)</Label>
                <Input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(Number(e.target.value))}
                  className="bg-black/50 border-white/10 text-white h-11 text-sm font-mono rounded-xl"
                />
              </div>
            </div>

            {/* Alcance e Leads */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">Pessoas Impactadas</Label>
                <Input
                  type="number"
                  value={impressions}
                  onChange={(e) => setImpressions(Number(e.target.value))}
                  className="bg-black/50 border-white/10 text-white h-11 text-sm font-mono rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">Leads & Oportunidades</Label>
                <Input
                  type="number"
                  value={leadsCount}
                  onChange={(e) => setLeadsCount(Number(e.target.value))}
                  className="bg-black/50 border-white/10 text-white h-11 text-sm font-mono rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-semibold">
                Diagnóstico Estratégico & Próximos Passos
              </Label>
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Insira as observações técnicas e recomendações para o cliente..."
                className="bg-black/50 border-white/10 text-white text-xs leading-relaxed rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Pré-visualização do Relatório Executivo (Direita: 7 colunas, A4 Impressão) */}
        <div className="lg:col-span-7 flex justify-center w-full">
          
          {/* Folha do Relatório A4 Formatada */}
          <div
            id="printable-report"
            className="w-full bg-white text-neutral-900 shadow-2xl rounded-2xl p-8 sm:p-10 space-y-6 text-xs sm:text-sm font-sans leading-relaxed border border-neutral-200 print:p-0 print:border-none print:shadow-none"
          >
            {/* Header Timbrado */}
            <div className="border-b-2 border-neutral-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-neutral-500">
                  RELATÓRIO EXECUTIVO DE RESULTADOS
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-950 uppercase tracking-tight mt-0.5">
                  PERFORMANCE & ROI DE CAMPANHAS
                </h2>
                <p className="text-xs text-neutral-600 font-medium">
                  Período Avaliado: <strong className="text-neutral-900">{periodLabel}</strong> ({daysCount} dias)
                </p>
              </div>

              <div className="text-left sm:text-right text-[11px] text-neutral-600 shrink-0">
                <p className="font-bold text-neutral-950 text-xs">{agencyBrand}</p>
                <p>{agencyProfile?.docNumber ? `CNPJ/CPF: ${agencyProfile.docNumber}` : "Assessoria Digital"}</p>
                <p>{agencyProfile?.email || "contato@smhub.com.br"}</p>
              </div>
            </div>

            {/* Identificação do Cliente */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Conta / Cliente:</span>
                <span className="font-extrabold text-base text-neutral-950">{selectedClientName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Lucro Bruto Gerado:</span>
                <span className="font-mono font-bold text-sm text-emerald-700">+{brl(netProfit)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Multiplicador ROAS:</span>
                <span className="font-mono font-black text-base text-neutral-950">{roas.toFixed(2)}x</span>
              </div>
            </div>

            {/* Grade de KPIs Chave */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Verba Aplicada</span>
                <p className="text-base sm:text-lg font-black text-neutral-950 mt-0.5">{brl(adSpend)}</p>
                <span className="text-[10px] text-neutral-500">~{brl(dailySpend)}/dia</span>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Alcance Total</span>
                <p className="text-base sm:text-lg font-black text-neutral-950 mt-0.5">{impressions.toLocaleString("pt-BR")}</p>
                <span className="text-[10px] text-neutral-500">Pessoas impactadas</span>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Novos Leads</span>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">{leadsCount}</p>
                <span className="text-[10px] text-neutral-500">~{dailyLeads} contatos/dia</span>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Custo p/ Lead</span>
                <p className="text-base sm:text-lg font-black text-neutral-950 mt-0.5">{brl(cpl)}</p>
                <span className="text-[10px] text-neutral-500">CPL Médio</span>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Faturamento</span>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">{brl(revenue)}</p>
                <span className="text-[10px] text-neutral-500">Vendas validadas</span>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Retorno Líquido</span>
                <p className="text-base sm:text-lg font-black text-neutral-950 mt-0.5">+{roiPercent.toFixed(0)}%</p>
                <span className="text-[10px] text-neutral-500">ROI Operacional</span>
              </div>
            </div>

            {/* Parecer Técnico da Agência */}
            <div className="space-y-2 border border-neutral-200 rounded-xl p-4 bg-neutral-50/30">
              <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
                <Award className="size-3.5 text-[#ff5722]" /> Parecer Técnico & Estratégico da Agência
              </span>
              <p className="text-xs text-neutral-800 leading-relaxed italic">
                "{notes}"
              </p>
            </div>

            {/* Rodapé de Autenticação */}
            <div className="border-t border-neutral-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-neutral-500">
              <div className="flex items-center gap-2">
                <div className="size-4 rounded-full bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold text-[9px]">✓</div>
                <span>Documento executivo auditado e gerado pela plataforma SM HUB</span>
              </div>
              <span>Data de emissão: {new Date().toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
