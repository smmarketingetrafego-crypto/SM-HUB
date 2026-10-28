import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  LifeBuoy, Plus, Search, Bot, MessageCircle, ExternalLink, 
  Sparkles, Headphones, Clock, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { 
  listSupportTickets, 
  createSupportTicket, 
  getSupportAgents 
} from '@/lib/api-support.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { pageMeta } from '@/lib/page-meta';
import { toast } from 'sonner';

export const Route = createFileRoute('/suporte')({
  head: () => pageMeta('Central de suporte', 'Tickets, atendimento humano e suporte com IA no SM Hub.'),
  component: SupportPage,
});

export const labels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
};

const SUPPORT_WHATSAPP = 'https://wa.me/5599985501962?text=Ol%C3%A1!%20Preciso%20de%20suporte%20no%20SM%20Hub.';

function SupportPage() {
  const list = useServerFn(listSupportTickets);
  const create = useServerFn(createSupportTicket);
  const getAgents = useServerFn(getSupportAgents);

  const { data, error, isPending } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => list(),
    refetchInterval: 12000,
  });

  const { data: agents } = useQuery({
    queryKey: ['support-agents'],
    queryFn: () => getAgents(),
  });

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'cliente' | 'colaborador' | 'agencia' | 'freelancer'>('cliente');
  const [selectedAgentId, setSelectedAgentId] = useState('agent-2');
  const [autoRespond, setAutoRespond] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner de Suporte e WhatsApp */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-emerald-900/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Canal Direto de Suporte Humano</span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-gray-300">
              Precisa de atendimento em tempo real? Fale diretamente com nossa equipe no WhatsApp: <strong className="text-emerald-300">(99) 98550-1962</strong>
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20">
          <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 size-4" /> Chamar no WhatsApp
            <ExternalLink className="ml-1.5 size-3 opacity-70" />
          </a>
        </Button>
      </div>

      {/* Header Principal */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LifeBuoy className="size-6 text-brand" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Atendimento & Resoluções</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            {data?.isFounder ? 'Central de Atendimento e Tickets' : 'Central de Suporte'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Abra chamados com respostas instantâneas dos nossos Agentes de IA e acompanhe os atendimentos.
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="bg-brand text-black hover:bg-brand/90 font-bold shadow-md">
          <Plus className="mr-2 size-4" /> Abrir Novo Chamado
        </Button>
      </header>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Buscar tickets"
            className="pl-9 bg-card border-white/10"
            placeholder="Buscar por assunto ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 bg-card border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(labels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estados de carregamento e erro */}
      {isPending && (
        <div className="py-16 text-center text-gray-400">
          <div className="size-6 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando chamados...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error.message}
        </div>
      )}

      {/* Lista de Tickets */}
      <div className="space-y-3">
        {data?.tickets
          ?.filter(
            (t) =>
              (filter === 'all' || t.status === filter) &&
              `${t.subject} ${t.user_email || ''}`.toLowerCase().includes(search.toLowerCase())
          )
          .map((t) => (
            <Link
              key={t.id}
              to="/suporte/$id"
              params={{ id: t.id }}
              search={{ initial: false }}
              className="group block bg-card hover:bg-card/80 border border-white/10 hover:border-brand/40 rounded-2xl p-4 transition-all shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                      #{t.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] bg-brand/10 border border-brand/20 text-brand px-2 py-0.5 rounded-full font-semibold uppercase">
                      {t.requester_type || 'Cliente'}
                    </span>
                    {t.needs_human ? (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Headphones className="size-2.5" /> Atendimento Humano
                      </span>
                    ) : (
                      <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Bot className="size-2.5" /> IA Integrada
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-white group-hover:text-brand transition-colors break-words">
                    {t.subject}
                  </h2>

                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    <Clock className="size-3 text-gray-500" />
                    <span>{t.user_email || 'Usuário'}</span>
                    <span>•</span>
                    <span>Atualizado em {new Date(t.updated_at || t.created_at).toLocaleString('pt-BR')}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      t.status === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : t.status === 'in_progress'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {labels[t.status] ?? t.status}
                  </span>

                  <ChevronRight className="size-4 text-gray-500 group-hover:text-brand group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))}
      </div>

      {data && data.tickets.length === 0 && (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-card/30">
          <LifeBuoy className="mx-auto mb-3 size-12 text-gray-500" />
          <h3 className="text-lg font-bold text-white">Nenhum chamado registrado</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1 mb-4">
            Abra um ticket para tirar dúvidas, relatar problemas ou solicitar consultoria comercial.
          </p>
          <Button onClick={() => setOpen(true)} className="bg-brand text-black font-semibold">
            <Plus className="mr-2 size-4" /> Criar Primeiro Ticket
          </Button>
        </div>
      )}

      {/* Modal de Criação de Ticket */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-white">
              <LifeBuoy className="size-5 text-brand" /> Abrir Novo Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Descreva sua necessidade. Nossos Agentes de IA analisam o conteúdo para fornecer uma resposta imediata.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4 pt-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await create({
                  data: {
                    subject,
                    body,
                    requesterType: type,
                    autoRespondWithAI: autoRespond,
                    agentId: selectedAgentId,
                  },
                });
                toast.success('Ticket aberto com sucesso!');
                setOpen(false);
                window.location.assign(`/suporte/${r.id}?initial=false`);
              } catch (err: any) {
                toast.error(err.message || 'Erro ao criar ticket.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <div>
              <Label className="text-xs text-gray-300">Tipo de Solicitante</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="mt-1 bg-black/40 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="agencia">Agência</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ticket-subject" className="text-xs text-gray-300">
                Assunto do Chamado
              </Label>
              <Input
                id="ticket-subject"
                required
                minLength={3}
                maxLength={200}
                placeholder="Ex: Dúvida sobre o funil de leads ou proposta comercial"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 bg-black/40 border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="ticket-body" className="text-xs text-gray-300">
                Descrição Detalhada
              </Label>
              <Textarea
                id="ticket-body"
                required
                minLength={5}
                maxLength={10000}
                rows={4}
                placeholder="Explique o que aconteceu, a dúvida ou a solicitação..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 bg-black/40 border-white/10 resize-none"
              />
            </div>

            {/* Agente de Atendimento */}
            {agents && agents.length > 0 && (
              <div>
                <Label className="text-xs text-gray-300">Agente de IA Responsável</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="mt-1 bg-black/40 border-purple-500/30 text-purple-200">
                    <Bot className="size-3.5 mr-1.5 text-purple-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((ag: any) => (
                      <SelectItem key={ag.id} value={ag.id} className="text-xs">
                        {ag.name} ({ag.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Checkbox de Resposta Automática com IA */}
            <label className="flex items-center gap-2 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRespond}
                onChange={(e) => setAutoRespond(e.target.checked)}
                className="rounded border-purple-500/40 bg-black/40 text-purple-500 focus:ring-purple-500 size-4"
              />
              <div className="text-xs">
                <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-brand" /> Ativar Resposta Imediata da IA
                </span>
                <span className="text-[11px] text-gray-400 block">
                  A IA gerará uma solução passo a passo assim que o chamado for criado.
                </span>
              </div>
            </label>

            <Button className="w-full bg-brand text-black font-bold hover:bg-brand/90" disabled={busy} type="submit">
              {busy ? 'Criando Chamado...' : 'Abrir Ticket'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
