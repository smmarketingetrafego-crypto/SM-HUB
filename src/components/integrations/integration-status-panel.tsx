import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { getExternalStatus } from '@/lib/api-integracoes.functions';
import { getDriveSetup } from '@/lib/api-drive.functions';
import { Cloud, MessageCircle, Mail, CreditCard, Bot, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { DriveFiles } from './drive-files';
export function IntegrationStatusPanel() {
 const statusFn = useServerFn(getExternalStatus); const driveFn = useServerFn(getDriveSetup);
 const { data, error } = useQuery({ queryKey: ['external-status'], queryFn: () => statusFn() });
 const { data: drive, error: driveError } = useQuery({ queryKey: ['drive-setup'], queryFn: () => driveFn() });
 const items = [
  { title: 'WhatsApp', icon: MessageCircle, status: 'Não conectado', note: 'A conexão oficial da Meta ainda não foi configurada. Envios e pareamento indisponíveis.' },
  { title: 'Google Drive central', icon: Cloud, status: drive?.folderId ? 'Pasta privada pronta' : drive?.connected ? 'Autorizado · aguardando pasta' : 'Aguardando conexão', note: 'Drive central com pasta privada por conta. Arquivos acessíveis à equipe desta conta e ao Founder Master.' },
  { title: 'Asaas', icon: CreditCard, status: data?.asaasConfigured ? 'Credenciais configuradas · não verificado' : 'Não configurado', note: 'Cobranças dependem de planos reais confirmados pelo Founder Master e do retorno de pagamento configurado.' },
  { title: 'E-mail externo', icon: Mail, status: data?.emailConfigured ? 'Credenciais configuradas · não verificado' : 'Não conectado', note: 'Resend e SMTP externos sem conexão verificada. O login do SM Hub usa o serviço de autenticação da plataforma.' },
  { title: 'Assistente de suporte', icon: Bot, status: data?.aiConfigured ? 'Disponível para solicitar resposta' : 'Não configurado', note: 'A resposta inicial usa Lovable AI. Contas pessoais de ChatGPT, Claude, Gemini e DeepSeek não estão conectadas.' },
  { title: 'Outras integrações', icon: Unplug, status: 'Não conectado', note: 'Calendário Google, Stripe, Mercado Pago e automações externas sem autorização real.' },
 ];
 return <section className="space-y-5">{(error || driveError) && <p role="alert" className="text-destructive">{error?.message || driveError?.message}</p>}<div className="grid gap-4 md:grid-cols-2">{items.map(i => <article key={i.title} className="rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-3"><i.icon className="size-6 text-primary"/><h2 className="text-lg font-semibold">{i.title}</h2></div><p className="mt-4 text-sm text-warning">{i.status}</p><p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{i.note}</p>{i.title === 'Assistente de suporte' && <Button className="mt-4" variant="outline" asChild><Link to="/suporte">Abrir suporte</Link></Button>}</article>)}</div><DriveFiles/></section>;
}
