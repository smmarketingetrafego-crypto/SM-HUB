import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, MessageCircle, Send, Headphones, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageResponse } from '@/components/ai-elements/message';
import { createSupportTicket, getSupportTicket, initialSupportAnswer, updateSupportTicket } from '@/lib/api-support.functions';
import { toast } from 'sonner';

export const SUPPORT_WHATSAPP = 'https://wa.me/5599985501962';

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
  const { data } = useQuery({ queryKey: ['support-ticket', id], queryFn: () => get({ data: id }), enabled: open && !!id, refetchInterval: open && id ? 10000 : false });
  async function submit(useAI: boolean) {
    setBusy(true); setError('');
    try {
      let ticketId = id;
      if (!ticketId) {
        const result = await create({ data: { subject, body, requesterType: 'cliente' } });
        ticketId = result.id; setId(ticketId);
      } else await update({ data: { id: ticketId, body } });
      setBody('');
      await qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      if (useAI && !data?.ticket.needs_human) {
        setAiBusy(true);
        const result = await answer({ data: { id: ticketId, followUp: true } });
        if (!result.success) setError(result.error || 'Assistente indisponível.');
        await qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      } else if (!id) {
        await update({ data: { id: ticketId, escalate: true } });
        toast.success('Ticket enviado ao atendimento.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível enviar.'); }
    finally { setBusy(false); setAiBusy(false); }
  }
  return <>
    <Button aria-label="Abrir suporte" title="Suporte" onClick={() => setOpen(true)} className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 size-12 rounded-full shadow-lg md:bottom-6" size="icon"><LifeBuoy className="size-6"/></Button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <SheetHeader><SheetTitle className="flex items-center gap-2"><LifeBuoy className="size-5 text-primary"/>Suporte SM Hub</SheetTitle></SheetHeader>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 size-4"/>WhatsApp<ExternalLink className="ml-2 size-3"/></a></Button><Button asChild variant="ghost" size="sm"><Link to="/suporte" onClick={() => setOpen(false)}>Meus tickets</Link></Button></div>
      {!id ? <div className="space-y-4"><div className="space-y-2"><Label htmlFor="quick-support-subject">Assunto</Label><Input id="quick-support-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={200}/></div><div className="space-y-2"><Label htmlFor="quick-support-body">O que aconteceu?</Label><Textarea id="quick-support-body" value={body} onChange={e => setBody(e.target.value)} maxLength={10000}/></div><div className="flex flex-wrap gap-2"><Button disabled={busy || subject.trim().length < 3 || body.trim().length < 5} onClick={() => submit(true)}>Perguntar à IA</Button><Button variant="outline" disabled={busy || subject.trim().length < 3 || body.trim().length < 5} onClick={() => submit(false)}>Abrir ticket</Button></div></div> : <>
        <h2 className="break-words font-semibold">{data?.ticket.subject || subject}</h2>
        <div className="flex-1 space-y-4" aria-live="polite">{data?.messages.map(m => <div key={m.id} className={m.sender === 'user' ? 'rounded-lg bg-secondary p-3 text-secondary-foreground' : 'py-2'}><p className="mb-2 text-xs text-muted-foreground">{m.sender === 'ai' ? 'Assistente SM Hub' : m.sender === 'founder' ? 'Atendimento humano' : 'Você'}</p>{m.sender === 'ai' ? <MessageResponse>{m.body}</MessageResponse> : <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}</div>)}</div>
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); submit(!data?.ticket.needs_human); }}><Textarea aria-label="Mensagem no suporte rápido" placeholder="Digite sua mensagem…" value={body} onChange={e => setBody(e.target.value)} maxLength={10000}/><div className="flex flex-wrap justify-between gap-2"><Button variant="outline" disabled={busy || data?.ticket.needs_human} onClick={async () => { try { await update({ data: { id, escalate: true } }); await qc.invalidateQueries({ queryKey: ['support-ticket', id] }); } catch(e) { toast.error(e instanceof Error ? e.message : 'Não foi possível solicitar atendimento.'); } }}><Headphones className="mr-2 size-4"/>{data?.ticket.needs_human ? 'Atendimento solicitado' : 'Falar com uma pessoa'}</Button><Button type="submit" size="icon" aria-label="Enviar mensagem" disabled={busy || !body.trim()}><Send className="size-4"/></Button></div></form>
        <Button asChild variant="ghost"><Link to="/suporte/$id" params={{ id }} search={{ initial: false }} onClick={() => setOpen(false)}>Abrir atendimento completo</Link></Button>
      </>}
      {busy && <p role="status" className="text-sm text-muted-foreground">{aiBusy ? 'Assistente preparando resposta…' : 'Enviando…'}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </SheetContent></Sheet>
  </>;
}