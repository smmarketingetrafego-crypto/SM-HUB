import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getExternalStatus, getIntegrations, disconnectIntegration } from '@/lib/api-integracoes.functions';
import { getDriveSetup, disconnectGoogleDrive } from '@/lib/api-drive.functions';
import { 
  Cloud, MessageCircle, Mail, CreditCard, Bot, Unplug, 
  CheckCircle2, AlertCircle, ArrowUpRight, PowerOff, Settings2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';
import { DriveFiles } from './drive-files';
import { WhatsAppConnectModal } from './whatsapp-connect-modal';
import { GatewayConnectModal } from './gateway-connect-modal';
import { AIConnectModal } from './ai-connect-modal';
import { GoogleDriveConnectModal } from './google-drive-connect-modal';
import { toast } from 'sonner';

export function IntegrationStatusPanel() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getExternalStatus);
  const driveFn = useServerFn(getDriveSetup);
  const integrationsFn = useServerFn(getIntegrations);
  const disconnectFn = useServerFn(disconnectIntegration);
  const disconnectDriveFn = useServerFn(disconnectGoogleDrive);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const { data, error } = useQuery({ queryKey: ['external-status'], queryFn: () => statusFn() });
  
  const { data: drive, error: driveError } = useQuery({
    queryKey: ['drive-setup'],
    queryFn: async () => {
      try {
        const fetched = await driveFn();
        if (typeof window !== 'undefined' && fetched?.connected) {
          try { localStorage.setItem('smhub_drive_setup', JSON.stringify(fetched)); } catch {}
        }
        return fetched;
      } catch {
        if (typeof window !== 'undefined') {
          try {
            const local = localStorage.getItem('smhub_drive_setup');
            if (local) return JSON.parse(local);
          } catch {}
        }
        return { connected: false, accountEmail: '', files: [] };
      }
    }
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations-data'],
    queryFn: async () => {
      try {
        const fetched = await integrationsFn();
        if (typeof window !== 'undefined') {
          try {
            const local = localStorage.getItem('smhub_integrations');
            if (local) {
              const parsed = JSON.parse(local);
              const merged = { ...parsed, ...fetched };
              localStorage.setItem('smhub_integrations', JSON.stringify(merged));
              return merged;
            }
            if (fetched) {
              localStorage.setItem('smhub_integrations', JSON.stringify(fetched));
            }
          } catch {}
        }
        return fetched;
      } catch {
        if (typeof window !== 'undefined') {
          try {
            const local = localStorage.getItem('smhub_integrations');
            if (local) return JSON.parse(local);
          } catch {}
        }
        return null;
      }
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (service: string) => {
      if (service === 'drive' || service === 'google') {
        return disconnectDriveFn();
      }
      return disconnectFn({ data: service });
    },
    onSuccess: (res, service) => {
      toast.info(`Integração com ${service.toUpperCase()} desconectada.`);
      if (typeof window !== 'undefined') {
        try {
          if (service === 'drive' || service === 'google') {
            localStorage.removeItem('smhub_drive_setup');
          }
          const local = localStorage.getItem('smhub_integrations');
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed[service]) {
              parsed[service] = { connected: false };
              localStorage.setItem('smhub_integrations', JSON.stringify(parsed));
            }
          }
        } catch {}
      }
      qc.invalidateQueries({ queryKey: ['integrations-data'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['external-status'] });
      qc.invalidateQueries({ queryKey: ['drive-setup'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao desconectar serviço.');
    }
  });

  // Validação estrita de conexão (não exibe conectado se não houver dados reais)
  const isWaConnected = Boolean(integrations?.whatsapp?.connected && integrations?.whatsapp?.phone);
  const isGoogleConnected = Boolean(drive?.connected && (drive?.accountEmail || integrations?.google?.accountEmail));
  const isAsaasConnected = Boolean(integrations?.asaas?.connected && (integrations?.asaas?.apiKey || integrations?.asaas?.accountEmail));
  const isEmailConnected = Boolean(integrations?.email?.connected && integrations?.email?.apiKey);
  const isAiConnected = Boolean(
    (integrations?.openai?.connected && (integrations?.openai?.apiKey || integrations?.openai?.accountEmail)) ||
    (integrations?.claude?.connected && (integrations?.claude?.apiKey || integrations?.claude?.accountEmail)) ||
    (integrations?.deepseek?.connected && (integrations?.deepseek?.apiKey || integrations?.deepseek?.accountEmail)) ||
    (integrations?.google?.connected && integrations?.google?.apiKey)
  );
  const isStripeOrMp = Boolean(integrations?.stripe?.connected || integrations?.mercadopago?.connected);

  const items = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Web & API',
      icon: MessageCircle,
      connected: isWaConnected,
      accountDetail: integrations?.whatsapp?.phone || integrations?.whatsapp?.deviceName,
      status: isWaConnected ? 'Conectado e operacional' : 'Desconectado',
      note: isWaConnected
        ? `Número ativo: ${integrations?.whatsapp?.phone}. Disparos automáticos e mensagens vinculados.`
        : 'Conecte via Click-to-Chat direto com seu número ou via Gateway Evolution API / Z-API.',
      onConnect: () => setActiveModal('whatsapp'),
    },
    {
      id: 'drive',
      title: 'Google Drive Central',
      icon: Cloud,
      connected: isGoogleConnected,
      accountDetail: drive?.accountEmail || integrations?.google?.accountEmail,
      status: isGoogleConnected ? 'Pasta sincronizada em nuvem' : 'Desconectado',
      note: isGoogleConnected
        ? `Conta: ${drive?.accountEmail || integrations?.google?.accountEmail}. Base smhub_database.json sincronizada.`
        : 'Conecte sua conta do Google Drive para armazenar e sincronizar em nuvem seu banco de dados e arquivos.',
      onConnect: () => setActiveModal('drive'),
    },
    {
      id: 'asaas',
      title: 'Gateway Asaas & Pix',
      icon: CreditCard,
      connected: isAsaasConnected,
      accountDetail: integrations?.asaas?.accountEmail,
      status: isAsaasConnected ? 'Conectado / Produção' : 'Desconectado',
      note: isAsaasConnected
        ? 'Emissão automática de Pix copia-e-cola, boletos bancários e conciliação de faturas.'
        : 'Configure sua chave de API Asaas para emissão de Pix e boletos automáticos aos seus clientes.',
      onConnect: () => setActiveModal('asaas'),
    },
    {
      id: 'ai',
      title: 'Agentes & Modelos de IA',
      icon: Bot,
      connected: isAiConnected,
      accountDetail: integrations?.openai?.connected ? 'OpenAI GPT-4o' : integrations?.deepseek?.connected ? 'DeepSeek' : 'Modelos Conectados',
      status: isAiConnected ? 'Modelos Conectados' : 'Desconectado',
      note: isAiConnected
        ? 'Assistentes autônomos treinados para suporte, SDR comercial e geração de propostas.'
        : 'Conecte sua chave de API da OpenAI, DeepSeek, Claude ou Gemini para potencializar seus agentes.',
      onConnect: () => setActiveModal('ai'),
    },
    {
      id: 'email',
      title: 'E-mail Transacional (Resend)',
      icon: Mail,
      connected: isEmailConnected,
      status: isEmailConnected ? 'Pronto para envios' : 'Desconectado',
      note: isEmailConnected
        ? 'Disparos de orçamentos, boas-vindas e faturas funcionando perfeitamente via Resend.'
        : 'Adicione sua API Key do Resend ou SMTP para envio de notificações por e-mail.',
      onConnect: () => toast.info('Configure a chave RESEND_API_KEY no painel de configurações.'),
    },
    {
      id: 'gateways',
      title: 'Stripe & Mercado Pago',
      icon: Unplug,
      connected: isStripeOrMp,
      status: isStripeOrMp ? 'Gateway ativo' : 'Desconectado',
      note: 'Gateways secundários para pagamentos internacionais via Stripe ou pagamentos instantâneos Mercado Pago.',
      onConnect: () => setActiveModal('mercadopago'),
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
            className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all ${
              i.connected
                ? 'border-emerald-500/30 bg-emerald-950/10'
                : 'border-white/10 bg-card hover:border-white/20'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-11 items-center justify-center rounded-xl ${
                      i.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    <i.icon className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{i.title}</h2>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs font-semibold ${
                        i.connected
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-gray-400'
                      }`}
                    >
                      <span
                        className={`mr-1.5 inline-block size-1.5 rounded-full ${
                          i.connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                        }`}
                      />
                      {i.status}
                    </Badge>
                  </div>
                </div>

                {i.accountDetail && (
                  <span className="text-[11px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5 truncate max-w-[150px]">
                    {i.accountDetail}
                  </span>
                )}
              </div>

              <p className="mt-3.5 text-xs leading-relaxed text-gray-300">{i.note}</p>
            </div>

            {/* Ações e Botão de Desconectar */}
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
              {i.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnectMutation.isPending}
                    onClick={() => disconnectMutation.mutate(i.id)}
                    className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 h-8"
                  >
                    <PowerOff className="size-3.5 mr-1.5" /> Desconectar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={i.onConnect}
                    className="text-xs text-white border-white/10 hover:bg-white/5 h-8"
                  >
                    <Settings2 className="size-3.5 mr-1.5" /> Trocar Conta
                  </Button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <Button
                    size="sm"
                    onClick={i.onConnect}
                    className="bg-brand text-black hover:bg-brand/90 font-bold text-xs h-8 px-4 shadow-sm"
                  >
                    <Plus className="size-3.5 mr-1.5" /> Conectar Agora
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <DriveFiles />

      {/* Modal Google Drive */}
      {activeModal === 'drive' && (
        <GoogleDriveConnectModal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setActiveModal(null);
              qc.invalidateQueries({ queryKey: ['drive-setup'] });
              qc.invalidateQueries({ queryKey: ['integrations-data'] });
            }
          }}
          connected={isGoogleConnected}
          currentEmail={drive?.accountEmail || integrations?.google?.accountEmail}
          folderId={drive?.folderId}
        />
      )}

      {/* Modal WhatsApp */}
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

      {/* Modal Gateways Asaas / Stripe / Mercado Pago */}
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

      {/* Modal IAs */}
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
