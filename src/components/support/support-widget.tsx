import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  LifeBuoy, MessageCircle, Send, Headphones, ExternalLink, 
  HelpCircle, CheckCircle2, Sparkles, X, ChevronRight, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageResponse } from '@/components/ai-elements/message';
import { createSupportTicket, getSupportTicket, initialSupportAnswer, updateSupportTicket } from '@/lib/api-support.functions';
import { toast } from 'sonner';

export const SUPPORT_PHONE = '(99) 98550-1962';
export const SUPPORT_WHATSAPP = 'https://wa.me/5599985501962?text=Ol%C3%A1!%20Preciso%20de%20suporte%20no%20SM%20Hub.';

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');
  
  const create = useServerFn(createSupportTicket);
  const get = useServerFn(getSupportTicket);
  const update = useServerFn(updateSupportTicket);
  const answer = useServerFn(initialSupportAnswer);
  const qc = useQueryClient();

  const { data } = useQuery({ 
    queryKey: ['support-ticket', id], 
    queryFn: () => get({ data: id }), 
    enabled: open && !!id, 
    refetchInterval: open && id ? 10000 : false 
  });

  async function submit(useAI: boolean) {
    setBusy(true); 
    setError('');
    try {
      let ticketId = id;
      if (!ticketId) {
        const result = await create({ data: { subject, body, requesterType: 'cliente', autoRespondWithAI: useAI } });
        ticketId = result.id; 
        setId(ticketId);
        toast.success('Ticket aberto com sucesso!');
      } else {
        await update({ data: { id: ticketId, body } });
        if (useAI) {
          setAiBusy(true);
          const result = await answer({ data: { id: ticketId, followUp: true } });
          if (!result.success) setError(result.error || 'Assistente indisponível.');
        }
      }
      setBody('');
      await qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });

      if (!id && !useAI) {
        await update({ data: { id: ticketId, escalate: true } });
      }
    } catch (e: any) { 
      setError(e instanceof Error ? e.message : 'Não foi possível enviar.'); 
      toast.error('Erro ao registrar chamado.');
    } finally { 
      setBusy(false); 
      setAiBusy(false); 
    }
  }

  return (
    <>
      {/* Botão Flutuante de Suporte */}
      <div className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 md:bottom-6 md:right-6">
        {/* Botão rápido para WhatsApp direto */}
        <a
          href={SUPPORT_WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          title={`WhatsApp de Suporte: ${SUPPORT_PHONE}`}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl shadow-emerald-900/30 transition-all hover:bg-emerald-500 hover:scale-105"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-white"></span>
          </span>
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">Suporte {SUPPORT_PHONE}</span>
        </a>

        {/* Botão principal que abre a Central de Suporte & Tickets */}
        <Button
          aria-label="Central de Suporte"
          title="Ajuda & Suporte"
          onClick={() => setOpen(true)}
          className="size-11 rounded-full border border-primary/40 bg-card text-primary shadow-xl shadow-black/40 hover:bg-muted hover:scale-105"
          size="icon"
        >
          <LifeBuoy className="size-5" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg pt-[calc(1.5rem+env(safe-area-inset-top))]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LifeBuoy className="size-5 text-primary" />
                <span>Central de Suporte SM Hub</span>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Card WhatsApp em Destaque */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Atendimento Rápido via WhatsApp
              </span>
              <span className="text-[11px] text-muted-foreground">{SUPPORT_PHONE}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fale diretamente com nossa equipe técnica para tirar dúvidas, relatar problemas ou solicitar ajustes.
            </p>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium" size="sm">
              <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                Chamar no WhatsApp ({SUPPORT_PHONE})
                <ExternalLink className="size-3.5 ml-auto opacity-70" />
              </a>
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {id ? 'Atendimento do Chamado' : 'Ou Abra um Ticket Interno'}
            </span>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary h-7">
              <Link to="/suporte" onClick={() => setOpen(false)}>
                Ver todos os tickets <ChevronRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          {!id ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="quick-support-subject" className="text-xs">Assunto do problema ou dúvida</Label>
                <Input
                  id="quick-support-subject"
                  placeholder="Ex: Erro ao enviar mensagem ou dúvida sobre o funil"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quick-support-body" className="text-xs">Detalhes do que aconteceu</Label>
                <Textarea
                  id="quick-support-body"
                  placeholder="Descreva o que ocorreu para nossa equipe te ajudar rapidamente..."
                  value={body}
                  rows={4}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={10000}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  className="flex-1"
                  disabled={busy || subject.trim().length < 3 || body.trim().length < 5}
                  onClick={() => submit(false)}
                >
                  <Send className="mr-2 size-3.5" />
                  Abrir Ticket de Suporte
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || subject.trim().length < 3 || body.trim().length < 5}
                  onClick={() => submit(true)}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  Resposta com IA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="p-3 rounded-lg bg-card border border-border">
                <h2 className="break-words font-semibold text-sm text-foreground">{data?.ticket?.subject || subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Status: {data?.ticket?.status === 'resolved' ? 'Resolvido' : 'Em atendimento'}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]" aria-live="polite">
                {data?.messages?.map((m: any) => (
                  <div
                    key={m.id}
                    className={
                      m.sender === 'user'
                        ? 'rounded-xl bg-primary/10 border border-primary/20 p-3 text-foreground ml-auto max-w-[85%]'
                        : 'rounded-xl bg-card border border-border p-3 text-foreground mr-auto max-w-[85%]'
                    }
                  >
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      {m.sender === 'ai' ? (m.agent_name ? `🤖 ${m.agent_name}` : '🤖 Assistente SM Hub') : m.sender === 'founder' ? '👨‍💻 Atendimento Técnico' : 'Você'}
                    </p>
                    {m.sender === 'ai' ? (
                      <MessageResponse>{m.body}</MessageResponse>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.body}</p>
                    )}
                  </div>
                ))}
              </div>

              <form
                className="space-y-2 pt-2 border-t border-border"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (body.trim()) submit(!data?.ticket?.needs_human);
                }}
              >
                <Textarea
                  aria-label="Mensagem no suporte rápido"
                  placeholder="Digite sua resposta..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={10000}
                  rows={2}
                />
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || data?.ticket?.needs_human}
                    onClick={async () => {
                      try {
                        await update({ data: { id, escalate: true } });
                        await qc.invalidateQueries({ queryKey: ['support-ticket', id] });
                        toast.success('Solicitação encaminhada a um atendente!');
                      } catch (e: any) {
                        toast.error(e.message || 'Erro ao solicitar atendimento.');
                      }
                    }}
                  >
                    <Headphones className="mr-1.5 size-3.5" />
                    {data?.ticket?.needs_human ? 'Aguardando atendimento' : 'Falar com uma pessoa'}
                  </Button>
                  <Button type="submit" size="sm" disabled={busy || !body.trim()} className="gap-1.5">
                    <Send className="size-3.5" /> Enviar
                  </Button>
                </div>
              </form>

              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <a href={`/suporte/${id}`} onClick={() => setOpen(false)}>
                  Abrir tela cheia do chamado <ExternalLink className="size-3 ml-1" />
                </a>
              </Button>
            </div>
          )}

          {busy && <p role="status" className="text-xs text-muted-foreground">{aiBusy ? 'Assistente preparando resposta…' : 'Processando…'}</p>}
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </SheetContent>
      </Sheet>
    </>
  );
}