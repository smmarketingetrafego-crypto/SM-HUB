import { pageMeta } from '@/lib/page-meta';
import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  ArrowLeft, ExternalLink, Calendar as CalendarIcon, Mail, Activity, 
  UserPlus, Handshake, FileText, CalendarDays, CreditCard, DollarSign, 
  MessageCircle, Phone, ArrowUpRight 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/lib/api-clientes.functions";
import { getPipelines } from "@/lib/api-pipelines.functions";
import { getOrcamentos } from "@/lib/api-propostas.functions";
import { brl } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/lead-details")({
  head: () => pageMeta('Detalhes do Lead', 'Acompanhamento e jornada do contato no SM Hub.'),
  component: LeadDetailsPage,
});

function LeadDetailsPage() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const contactName = urlParams.get('name') || 'Contato';

  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients(),
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => getPipelines(),
  });

  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => getOrcamentos(),
  });

  const clientInfo = useMemo(() => {
    const clients = clientsData.clients || [];
    const direct = clients.find((c: any) => c.name.toLowerCase() === contactName.toLowerCase());
    if (direct) return direct;

    // Search in pipelines
    for (const p of pipelines) {
      for (const s of p.stages || []) {
        const deal: any = (s.deals || []).find((d: any) => 
          (d.name && d.name.toLowerCase() === contactName.toLowerCase()) || 
          (d.client && d.client.toLowerCase() === contactName.toLowerCase()) ||
          (d.clientName && d.clientName.toLowerCase() === contactName.toLowerCase())
        );
        if (deal) {
          return {
            name: deal.name || deal.client || deal.clientName || contactName,
            email: deal.email || "contato@cliente.com",
            phone: deal.phone || "",
            status: s.name,
            value: deal.value || 0,
            pipeline: p.name,
          };
        }
      }
    }

    return {
      name: contactName,
      email: "contato@cliente.com",
      phone: "",
      status: "Em Atendimento",
      value: 0,
    };
  }, [clientsData, pipelines, contactName]);

  const clientOrcamentos = useMemo(() => {
    return (orcamentos || []).filter((o: any) => 
      o.cliente?.toLowerCase() === contactName.toLowerCase() ||
      o.cliente?.toLowerCase().includes(contactName.toLowerCase())
    );
  }, [orcamentos, contactName]);

  const totalValue = clientOrcamentos.reduce((acc: number, o: any) => acc + (Number(o.valor) || 0), Number(clientInfo.value) || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to="/leads" className="mt-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{clientInfo.name}</h1>
              <span className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                {clientInfo.status || 'Lead'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4" /> Base SM Hub · Pipeline Ativo
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-4" /> {clientInfo.email}
              </div>
              {clientInfo.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4" /> {clientInfo.phone}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            to="/pipelines" 
            className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            <ExternalLink className="size-4" /> Abrir no Funil
          </Link>
          <Link 
            to="/whatsapp" 
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors text-sm font-medium"
          >
            <MessageCircle className="size-4" /> Conversar
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-2">
            <CreditCard className="size-4" /> Propostas Aprovadas
          </p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {clientOrcamentos.filter((o: any) => o.status === 'aprovado').length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-2">
            <Activity className="size-4" /> Volume Negociado
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{brl(totalValue)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-2">
            <DollarSign className="size-4" /> Ticket Médio
          </p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {clientOrcamentos.length ? brl(totalValue / clientOrcamentos.length) : brl(totalValue)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-2">
            <FileText className="size-4" /> Total de Orçamentos
          </p>
          <p className="text-2xl font-bold text-foreground mt-2">{clientOrcamentos.length}</p>
        </div>
      </div>

      {/* Jornada */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="size-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Jornada no Funil Comercial</h2>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-4">
          <div className="flex-shrink-0 min-w-[200px] rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-foreground font-semibold mb-1 text-sm">
              <UserPlus className="size-4 text-primary" /> Entrada de Lead
            </div>
            <p className="text-xs text-muted-foreground">Cadastrado no CRM</p>
          </div>

          <div className="flex-shrink-0 w-8 h-px bg-border" />

          <div className="flex-shrink-0 min-w-[200px] rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-foreground font-semibold mb-1 text-sm">
              <Handshake className="size-4 text-amber-500" /> Qualificação
            </div>
            <p className="text-xs text-muted-foreground">{clientInfo.status || 'Em andamento'}</p>
          </div>

          <div className="flex-shrink-0 w-8 h-px bg-border" />

          <div className="flex-shrink-0 min-w-[200px] rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-foreground font-semibold mb-1 text-sm">
              <FileText className="size-4 text-blue-500" /> Proposta Comercial
            </div>
            <p className="text-xs text-muted-foreground">{clientOrcamentos.length} gerada(s)</p>
          </div>

          <div className="flex-shrink-0 w-8 h-px bg-border" />

          <div className="flex-shrink-0 min-w-[200px] rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-1 text-sm">
              <CreditCard className="size-4" /> Fechamento & Contrato
            </div>
            <p className="text-xs text-muted-foreground">Formalização Digital</p>
          </div>
        </div>
      </div>

      {/* Propostas do Lead */}
      {clientOrcamentos.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-4">Propostas Comerciais Vinculadas</h2>
          <div className="divide-y divide-border">
            {clientOrcamentos.map((orc: any) => (
              <div key={orc.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-foreground">{orc.numero} — {orc.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Valor: {brl(orc.valor)} • Status: {orc.status}</p>
                </div>
                <Link 
                  to="/proposta/$id" 
                  params={{ id: orc.id }}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Abrir Proposta <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
