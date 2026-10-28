import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { 
  ArrowLeft, Headphones, Send, Bot, Loader2, Sparkles, 
  MessageCircle, RefreshCw, CheckCircle2, ChevronDown, 
  User, ExternalLink, Zap, ShieldAlert, Clock
} from 'lucide-react';
import { 
  getSupportTicket, 
  initialSupportAnswer, 
  updateSupportTicket, 
  getSupportAgents 
} from '@/lib/api-support.functions';
import { MessageResponse } from '@/components/ai-elements/message';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { pageMeta } from '@/lib/page-meta';
import { toast } from 'sonner';

export const Route = createFileRoute('/suporte_/$id')({
  validateSearch: (p: Record<string, unknown>) => ({
    initial: p.initial === true || p.initial === 'true',
  }),
  head: () => pageMeta('Ticket de suporte', 'Acompanhe o atendimento e as respostas do suporte SM Hub.'),
  component: TicketPage,
});

const labels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
};

const SUPPORT_WHATSAPP = 'https://wa.me/5599985501962?text=Ol%C3%A1!%20Preciso%20de%20suporte%20no%20SM%20Hub.';

function TicketPage() {
  const { id } = Route.useParams();
  const { initial } = Route.useSearch();
  const qc = useQueryClient();

  const get = useServerFn(getSupportTicket);
  const update = useServerFn(updateSupportTicket);
  const answer = useServerFn(initialSupportAnswer);
  const getAgents = useServerFn(getSupportAgents);

  const { data, error, isLoading } = useQuery({
    queryKey: ['support-ticket', id],
    queryFn: () => get({ data: id }),
    refetchInterval: 8000,
  });

  const { data: agents } = useQuery({
    queryKey: ['support-agents'],
    queryFn: () => getAgents(),
  });

  const [body, setBody] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-2');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDraftBusy, setAiDraftBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [autoRespondOnSend, setAutoRespondOnSend] = useState(true);
  const started = useRef(false);

  // Auto-resposta inicial se parâmetro initial estiver ativo e ainda não tiver mensagem de IA
  useEffect(() => {
    if (!initial || started.current || !data) return;
    const hasAiMessage = data.messages.some((m: any) => m.sender === 'ai');
    if (hasAiMessage) return;

    started.current = true;
    setAiBusy(true);
    answer({ data: { id, followUp: false, agentId: selectedAgentId } })
      .then((r) => {
        if (!r.success) setAiError(r.error ?? 'IA indisponível no momento.');
        else toast.success(`Resposta inicial gerada pelo ${r.agentName || 'Assistente de Suporte'}`);
      })
      .catch((e) => setAiError(e.message))
      .finally(() => {
        setAiBusy(false);
        qc.invalidateQueries({ queryKey: ['support-ticket', id] });
      });
  }, [initial, data, id, answer, qc, selectedAgentId]);

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!body.trim() || busy) return;

    const messageText = body.trim();
    setBusy(true);
    try {
      await update({ data: { id, body: messageText } });
      setBody('');
      toast.success('Mensagem enviada com sucesso!');
      await qc.invalidateQueries({ queryKey: ['support-ticket', id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });

      // Se o usuário solicitou auto-resposta da IA para novas mensagens
      if (autoRespondOnSend && !data?.isFounder) {
        setAiBusy(true);
        setTimeout(async () => {
          try {
            await answer({ data: { id, followUp: true, agentId: selectedAgentId } });
            await qc.invalidateQueries({ queryKey: ['support-ticket', id] });
          } catch (err: any) {
            console.warn('Auto follow-up AI failed:', err);
          } finally {
            setAiBusy(false);
          }
        }, 800);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setBusy(false);
    }
  }

  // Gera resposta direta da IA e posta no ticket
  async function handleGenerateAiResponse() {
    setAiBusy(true);
    setAiError('');
    try {
      const res = await answer({
        data: {
          id,
          followUp: true,
          agentId: selectedAgentId,
        },
      });
      if (res.success) {
        toast.success(`Resposta gerada com sucesso por ${res.agentName || 'IA de Suporte'}!`);
      } else {
        setAiError(res.error || 'A IA não pôde responder no momento.');
      }
    } catch (err: any) {
      setAiError(err instanceof Error ? err.message : 'Falha ao acionar IA.');
    } finally {
      setAiBusy(false);
      qc.invalidateQueries({ queryKey: ['support-ticket', id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    }
  }

  // Gera rascunho da IA para preencher na caixa de texto (ideal para o founder revisar antes de enviar)
  async function handleDraftAiResponse() {
    setAiDraftBusy(true);
    setAiError('');
    try {
      const res = await answer({
        data: {
          id,
          followUp: true,
          agentId: selectedAgentId,
          draftOnly: true,
        },
      });
      if (res.success && res.text) {
        setBody(res.text);
        toast.success(`Sugestão elaborada por ${res.agentName || 'IA'} inserida no campo!`);
      } else {
        setAiError(res.error || 'Não foi possível gerar a sugestão.');
      }
    } catch (err: any) {
      setAiError(err instanceof Error ? err.message : 'Erro ao gerar sugestão.');
    } finally {
      setAiDraftBusy(false);
    }
  }

  async function handleStatusChange(newStatus: 'open' | 'in_progress' | 'resolved') {
    setBusy(true);
    try {
      await update({ data: { id, status: newStatus } });
      toast.success(`Status atualizado para "${labels[newStatus]}"`);
      await qc.invalidateQueries({ queryKey: ['support-ticket', id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status');
    } finally {
      setBusy(false);
    }
  }

  async function handleEscalateToHuman() {
    setBusy(true);
    try {
      await update({ data: { id, escalate: true } });
      toast.info('Chamado encaminhado para a equipe de atendimento humano.');
      await qc.invalidateQueries({ queryKey: ['support-ticket', id] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar atendimento');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-4">
        <ShieldAlert className="size-10 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Não foi possível carregar o chamado</h2>
        <p className="text-sm text-gray-400">{error.message}</p>
        <Button asChild variant="outline">
          <Link to="/suporte">
            <ArrowLeft className="mr-2 size-4" /> Voltar aos Tickets
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl py-24 text-center space-y-3">
        <Loader2 className="size-8 text-brand animate-spin mx-auto" />
        <p className="text-sm text-gray-400">Carregando detalhes do ticket e histórico...</p>
      </div>
    );
  }

  const { ticket, messages, isFounder } = data;
  const currentAgent = (agents || []).find((a: any) => a.id === selectedAgentId) || agents?.[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Botão de retorno e Status */}
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <Link to="/suporte">
            <ArrowLeft className="mr-2 size-4" /> Todos os chamados
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 size-4" /> WhatsApp (99) 98550-1962
              <ExternalLink className="ml-1.5 size-3 opacity-70" />
            </a>
          </Button>
        </div>
      </div>

      {/* Cabeçalho do Ticket */}
      <header className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase bg-brand/10 border border-brand/20 text-brand px-2.5 py-0.5 rounded-full font-bold">
                Ticket #{ticket.id.slice(0, 8)}
              </span>
              <span className="text-xs bg-white/5 border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-full">
                {ticket.requester_type ? ticket.requester_type.toUpperCase() : 'CLIENTE'}
              </span>
              {ticket.needs_human && (
                <span className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <Headphones className="size-3" /> Aguardando Humano
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white break-words">{ticket.subject}</h1>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <Clock className="size-3.5" /> Aberto por <span className="text-gray-200">{ticket.user_email || 'Usuário'}</span> em {new Date(ticket.created_at).toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Controle de Status e Escalação */}
          <div className="flex items-center gap-3">
            {isFounder ? (
              <div className="space-y-1 text-right">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Status do Atendimento</span>
                <Select
                  value={ticket.status}
                  onValueChange={(v) => handleStatusChange(v as 'open' | 'in_progress' | 'resolved')}
                  disabled={busy}
                >
                  <SelectTrigger className="w-40 bg-black/40 border-white/10 font-medium text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(labels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Button
                variant={ticket.needs_human ? "secondary" : "outline"}
                size="sm"
                disabled={busy || ticket.needs_human}
                onClick={handleEscalateToHuman}
                className="text-xs"
              >
                <Headphones className="mr-2 size-4" />
                {ticket.needs_human ? 'Encaminhado ao Suporte Humano' : 'Falar com uma Pessoa'}
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Seleção e Ação de Agente de IA */}
        <div className="bg-gradient-to-r from-purple-950/30 via-purple-900/10 to-transparent border border-purple-500/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Assistente de Suporte IA</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.2 rounded-full font-mono">
                  Online 24/7
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                Respostas orientadas ao sistema com detecção de contexto e base de conhecimento ativa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Agente de IA */}
            {agents && agents.length > 0 && (
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="h-8 text-xs bg-black/40 border-purple-500/30 text-purple-200 w-48">
                  <Bot className="size-3.5 mr-1.5 text-purple-400" />
                  <SelectValue placeholder="Selecione o agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((ag: any) => (
                    <SelectItem key={ag.id} value={ag.id} className="text-xs">
                      {ag.name} ({ag.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Ações da IA */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiBusy || aiDraftBusy || busy}
              onClick={handleGenerateAiResponse}
              className="h-8 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold"
            >
              {aiBusy ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Gerando Resposta...
                </>
              ) : (
                <>
                  <Bot className="mr-1.5 size-3.5" /> Responder com IA
                </>
              )}
            </Button>

            {isFounder && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={aiBusy || aiDraftBusy || busy}
                onClick={handleDraftAiResponse}
                className="h-8 text-xs text-gray-300 hover:text-white hover:bg-white/5"
                title="Gera uma sugestão e preenche o campo de texto para você editar antes de enviar"
              >
                {aiDraftBusy ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Elaborando Rascunho...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 size-3.5 text-brand" /> Sugerir no Campo
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Histórico de Mensagens */}
      <div className="space-y-4" aria-live="polite">
        {messages.map((m: any) => {
          const isUser = m.sender === 'user';
          const isAi = m.sender === 'ai';
          const isFounderSender = m.sender === 'founder';

          return (
            <article
              key={m.id || m.created_at}
              className={`rounded-2xl p-4 transition-all ${
                isUser
                  ? 'ml-auto max-w-[85%] bg-brand/10 border border-brand/20 text-white'
                  : isAi
                  ? 'mr-auto max-w-[88%] bg-purple-950/20 border border-purple-500/20 text-gray-100 shadow-sm'
                  : 'mr-auto max-w-[88%] bg-card border border-white/10 text-white shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2.5 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-xs">
                  {isAi ? (
                    <div className="size-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                      <Bot className="size-3" />
                    </div>
                  ) : isFounderSender ? (
                    <div className="size-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                      <Headphones className="size-3" />
                    </div>
                  ) : (
                    <div className="size-5 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-brand">
                      <User className="size-3" />
                    </div>
                  )}

                  <span className="font-semibold text-white">
                    {isAi
                      ? m.agent_name || 'Assistente SM Hub IA'
                      : isFounderSender
                      ? 'Equipe de Suporte Oficial'
                      : ticket.user_email || 'Solicitante'}
                  </span>

                  {isAi && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-full font-mono">
                      IA Autônoma
                    </span>
                  )}
                </div>

                <time className="text-[10px] text-gray-400">
                  {new Date(m.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">
                {isAi ? (
                  <MessageResponse>{m.body}</MessageResponse>
                ) : (
                  <div className="text-sm">{m.body}</div>
                )}
              </div>
            </article>
          );
        })}

        {aiBusy && (
          <div className="mr-auto max-w-[85%] bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-3 text-purple-300 text-sm animate-pulse">
            <Loader2 className="size-4 animate-spin text-purple-400" />
            <span>
              <strong>{currentAgent?.name || 'Assistente de Suporte'}</strong> está analisando a mensagem e preparando a resolução...
            </span>
          </div>
        )}

        {aiError && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-3">
            <span>{aiError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateAiResponse}
              className="text-amber-200 hover:text-white h-7 text-xs"
            >
              Tentar novamente
            </Button>
          </div>
        )}
      </div>

      {/* Caixa de Resposta */}
      <form onSubmit={handleSendMessage} className="bg-card border border-border/60 rounded-2xl p-4 space-y-3 shadow-md">
        <Textarea
          autoFocus
          aria-label="Mensagem de resposta"
          placeholder={
            isFounder
              ? 'Escreva a resposta para o cliente ou use o botão "Sugerir no Campo" da IA acima...'
              : 'Digite sua mensagem ou dúvida adicional para a equipe e assistentes...'
          }
          value={body}
          maxLength={10000}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[110px] bg-black/30 border-white/10 text-white placeholder:text-gray-500 resize-none text-sm focus-visible:ring-brand"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Opção de Auto-resposta */}
          {!isFounder && (
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRespondOnSend}
                onChange={(e) => setAutoRespondOnSend(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-brand focus:ring-brand size-3.5"
              />
              <span>Receber resposta imediata do assistente de IA</span>
            </label>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Botão de Resposta Rápida IA */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiBusy || busy}
              onClick={handleGenerateAiResponse}
              className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs"
            >
              <Bot className="mr-1.5 size-3.5" />
              Pedir Ajuda à IA
            </Button>

            {/* Enviar Resposta */}
            <Button
              type="submit"
              disabled={busy || !body.trim()}
              size="sm"
              className="bg-brand text-black hover:bg-brand/90 font-bold text-xs"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 size-3.5" /> Enviar Resposta
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
