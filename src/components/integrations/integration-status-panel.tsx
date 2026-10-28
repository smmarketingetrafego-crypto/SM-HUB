import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExternalStatus, getIntegrations } from '@/lib/api-integracoes.functions';
import { getDriveSetup } from '@/lib/api-drive.functions';
import { Cloud, MessageCircle, Mail, CreditCard, Bot, Unplug, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';
import { DriveFiles } from './drive-files';
import { WhatsAppConnectModal } from './whatsapp-connect-modal';
import { GatewayConnectModal } from './gateway-connect-modal';
import { AIConnectModal } from './ai-connect-modal';

export function IntegrationStatusPanel() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getExternalStatus);
  const driveFn = useServerFn(getDriveSetup);
  const integrationsFn = useServerFn(getIntegrations);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data, error } = useQuery({ queryKey: ['external-status'], queryFn: () => statusFn() });
  const { data: drive, error: driveError } = useQuery({ queryKey: ['drive-setup'], queryFn: () => driveFn() });
  const { data: integrations } = useQuery({ queryKey: ['integrations-data'], queryFn: () => integrationsFn() });

  const isWaConnected = !!integrations?.whatsapp?.connected;
  const isGoogleConnected = !!integrations?.google?.connected || !!drive?.connected;
  const isAsaasConnected = !!integrations?.asaas?.connected || !!data?.asaasConfigured;
  const isEmailConnected = !!integrations?.email?.connected || !!data?.emailConfigured;
  const isAiConnected = !!integrations?.openai?.connected || !!integrations?.claude?.connected || !!integrations?.deepseek?.connected || !!data?.aiConfigured;
  const isStripeOrMp = !!integrations?.stripe?.connected || !!integrations?.mercadopago?.connected;

  const items = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Web & API',
      icon: MessageCircle,
      connected: isWaConnected,
      status: isWaConnected ? 'Conectado e operacional' : 'Disponível para conexão',
      note: isWaConnected
        ? `Aparelho pareado: ${integrations?.whatsapp?.phone || integrations?.whatsapp?.deviceName || 'Sessão Ativa'}. Envio de mensagens e notificações liberado.`
        : 'Conecte via QR Code ou código numérico de 8 dígitos para envio instantâneo de mensagens e orçamentos.',
      actionLabel: isWaConnected ? 'Ver Conversas' : 'Conectar WhatsApp',
      actionTo: isWaConnected ? '/whatsapp' : undefined,
      onAction: !isWaConnected ? () => setActiveModal('whatsapp') : undefined,
    },
    {
      id: 'drive',
      title: 'Google Drive Central',
      icon: Cloud,
      connected: isGoogleConnected,
      status: drive?.folderId ? 'Pasta privada pronta' : 'Armazenamento operacional',
      note: 'Banco local de alta performance sincronizado com Google Drive. Uploads, contratos e relatórios centralizados.',
      actionLabel: 'Sincronizar Arquivos',
      onAction: () => qc.invalidateQueries({ queryKey: ['drive-setup'] }),
    },
    {
      id: 'asaas',
      title: 'Gateway Asaas & Pix',
      icon: CreditCard,
      connected: isAsaasConnected,
      status: isAsaasConnected ? 'Conectado / Configurado' : 'Aguardando credenciais',
      note: isAsaasConnected
        ? 'Emissão automática de Pix, cobranças recorrentes e conciliação ativa de pagamentos.'
        : 'Configure sua chave de API Asaas ou ambiente Sandbox para cobranças automatizadas.',
      actionLabel: 'Configurar Asaas',
      onAction: () => setActiveModal('asaas'),
    },
    {
      id: 'email',
      title: 'E-mail Transacional (Resend)',
      icon: Mail,
      connected: isEmailConnected,
      status: isEmailConnected ? 'Pronto para envios' : 'Disponível para configuração',
      note: isEmailConnected
        ? 'Disparos de orçamentos, boas-vindas e faturas funcionando perfeitamente via Resend.'
        : 'Adicione sua API Key do Resend ou SMTP para envio automático de e-mails da agência.',
      actionLabel: 'Configurar E-mail',
      actionTo: '/configuracoes',
    },
    {
      id: 'ai',
      title: 'Agentes & Modelos de IA',
      icon: Bot,
      connected: isAiConnected,
      status: isAiConnected ? 'Modelos Conectados' : 'Disponível para ativação',
      note: isAiConnected
        ? 'Assistentes treinados com suporte a OpenAI GPT-4o, Claude 3.5 Sonnet e DeepSeek.'
        : 'Conecte sua conta de IA ou API Key para gerar briefs, briefings e respostas automáticas.',
      actionLabel: 'Configurar IAs',
      onAction: () => setActiveModal('ai'),
    },
    {
      id: 'gateways',
      title: 'Stripe & Mercado Pago',
      icon: Unplug,
      connected: isStripeOrMp,
      status: isStripeOrMp ? 'Gateway ativo' : 'Opcional',
      note: 'Gateways secundários para pagamentos internacionais via Stripe ou pagamentos instantâneos Mercado Pago.',
      actionLabel: 'Configurar',
      onAction: () => setActiveModal('mercadopago'),
    },
  ];

  return (
    <section className="space-y-6">
      {(error || driveError) && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error?.message || driveError?.message}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((i) => (
          <article
            key={i.id}
            className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <i.icon className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{i.title}</h2>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs font-medium ${
                        i.connected
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${i.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {i.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">{i.note}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
              {i.actionTo ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={i.actionTo}>
                    {i.actionLabel}
                    <ArrowUpRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={i.onAction}>
                  {i.actionLabel}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <DriveFiles />

      {activeModal === 'whatsapp' && (
        <WhatsAppConnectModal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActiveModal(null);
              qc.invalidateQueries({ queryKey: ['integrations-data'] });
            }
          }}
          connection={integrations?.whatsapp}
        />
      )}

      {(activeModal === 'asaas' || activeModal === 'stripe' || activeModal === 'mercadopago') && (
        <GatewayConnectModal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActiveModal(null);
              qc.invalidateQueries({ queryKey: ['integrations-data'] });
            }
          }}
          initialGateway={activeModal as "asaas" | "stripe" | "mercadopago"}
          integrations={integrations}
        />
      )}

      {activeModal === 'ai' && (
        <AIConnectModal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActiveModal(null);
              qc.invalidateQueries({ queryKey: ['integrations-data'] });
            }
          }}
          initialProvider="openai"
          integrations={integrations}
        />
      )}
    </section>
  );
}
