import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  MessageCircle, Smartphone, CheckCircle2, RefreshCw, PowerOff, 
  ShieldCheck, Server, Globe, ExternalLink, QrCode
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  saveIntegration, 
  disconnectIntegration, 
  testWhatsAppGateway,
  type WhatsAppConnection 
} from "@/lib/api-integracoes.functions";
import { useServerFn } from "@tanstack/react-start";

interface WhatsAppConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: WhatsAppConnection;
}

export function WhatsAppConnectModal({ open, onOpenChange, connection }: WhatsAppConnectModalProps) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveIntegration);
  const disconnectFn = useServerFn(disconnectIntegration);
  const testGatewayFn = useServerFn(testWhatsAppGateway);

  const [activeTab, setActiveTab] = useState<"direct" | "gateway" | "meta">("direct");
  
  // Direct Click-to-chat
  const [directPhone, setDirectPhone] = useState(connection?.phone || "(99) 98550-1962");
  
  // Gateway (Evolution API, Z-API, WPPConnect)
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayKey, setGatewayKey] = useState("");
  const [instanceName, setInstanceName] = useState("smhub");
  const [realQrCode, setRealQrCode] = useState<string | null>(null);

  // Meta Cloud API
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");

  const [loading, setLoading] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async (payload: { phone: string; mode: string; deviceName?: string; extra?: any }) => {
      return saveFn({
        data: {
          service: "whatsapp",
          data: {
            phone: payload.phone,
            deviceName: payload.deviceName || "WhatsApp Comercial",
            connectedAt: new Date().toLocaleString('pt-BR'),
            mode: payload.mode,
            connected: true,
            ...(payload.extra || {}),
          },
        },
      });
    },
    onSuccess: (res, vars) => {
      toast.success("WhatsApp conectado com sucesso!", {
        description: `Disparos e atendimento vinculados ao número ${vars.phone}.`,
      });
      if (typeof window !== 'undefined') {
        try {
          const current = JSON.parse(localStorage.getItem('smhub_integrations') || '{}');
          current.whatsapp = {
            connected: true,
            phone: vars.phone,
            deviceName: vars.deviceName || "WhatsApp Comercial",
            connectedAt: new Date().toLocaleString('pt-BR'),
            mode: vars.mode,
            ...(vars.extra || {}),
          };
          localStorage.setItem('smhub_integrations', JSON.stringify(current));
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['integrations-data'] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['external-status'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao conectar WhatsApp.");
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => disconnectFn({ data: "whatsapp" }),
    onSuccess: () => {
      toast.info("WhatsApp desconectado com sucesso.", {
        description: "Você pode conectar outro número ou instância a qualquer momento.",
      });
      if (typeof window !== 'undefined') {
        try {
          const current = JSON.parse(localStorage.getItem('smhub_integrations') || '{}');
          current.whatsapp = { connected: false, phone: "" };
          localStorage.setItem('smhub_integrations', JSON.stringify(current));
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['integrations-data'] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['external-status'] });
      setRealQrCode(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desconectar WhatsApp.");
    }
  });

  const handleConnectDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = directPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Informe um número válido com DDD (ex: 99985501962).");
      return;
    }
    setLoading(true);
    connectMutation.mutate({
      phone: directPhone,
      mode: "direct",
      deviceName: "WhatsApp Web & Click-to-Chat",
    }, { onSettled: () => setLoading(false) });
  };

  const handleTestGateway = async () => {
    if (!gatewayUrl.trim()) {
      toast.error("Informe a URL da sua Evolution API ou Z-API.");
      return;
    }
    setLoading(true);
    try {
      const res = await testGatewayFn({
        data: {
          gatewayUrl: gatewayUrl.trim(),
          apiKey: gatewayKey.trim(),
          instanceName: instanceName.trim(),
        }
      });
      if (res.success) {
        toast.success("Gateway online e respondendo!");
        connectMutation.mutate({
          phone: "Instância Gateway Ativa",
          mode: "gateway",
          deviceName: `Gateway (${instanceName})`,
          extra: { gatewayUrl, instanceName },
        });
      } else {
        toast.error(res.error || "Não foi possível conectar à instância do gateway.");
      }
    } catch (e: any) {
      toast.error("Erro ao contatar o gateway.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaPhoneId.trim() || !metaToken.trim()) {
      toast.error("Preencha o Phone Number ID e o Access Token da Meta.");
      return;
    }
    setLoading(true);
    connectMutation.mutate({
      phone: `Meta ID: ${metaPhoneId}`,
      mode: "meta_cloud",
      deviceName: "Meta Cloud API Oficial",
      extra: { metaPhoneId, metaWabaId },
    }, { onSettled: () => setLoading(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <MessageCircle className="size-5 text-emerald-400" />
            Conexão WhatsApp & Disparos
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Configure a forma de comunicação via WhatsApp para envio de orçamentos, contratos e atendimento.
          </DialogDescription>
        </DialogHeader>

        {connection?.connected ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
              <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">WhatsApp Conectado e Operacional</h3>
              <p className="text-xs text-emerald-300 mt-1">
                Número / Dispositivo: <strong>{connection.phone || connection.deviceName}</strong>
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-1">
                Modo: {connection.mode === "direct" ? "Click-to-Chat Direto" : connection.mode === "gateway" ? "Evolution / Z-API Gateway" : "Meta Cloud API"}
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={disconnectMutation.isPending}
              className="w-full text-xs"
              onClick={() => disconnectMutation.mutate()}
            >
              <PowerOff className="mr-1.5 size-3.5" /> Desconectar Este WhatsApp / Trocar Número
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full pt-1">
            <TabsList className="grid grid-cols-3 bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
              <TabsTrigger value="direct" className="text-xs font-semibold">
                <Smartphone className="size-3.5 mr-1" /> Direto / Web
              </TabsTrigger>
              <TabsTrigger value="gateway" className="text-xs font-semibold">
                <Server className="size-3.5 mr-1" /> Gateway API
              </TabsTrigger>
              <TabsTrigger value="meta" className="text-xs font-semibold">
                <Globe className="size-3.5 mr-1" /> Meta Oficial
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Click-to-chat Direto (Recomendado para uso imediato sem servidor extra) */}
            <TabsContent value="direct" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={handleConnectDirect} className="space-y-3.5">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="size-3.5" /> Conexão Nativa 100% Segura
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Não requer escaneamento de robô nem corre risco de bloqueio. Ao disparar propostas ou mensagens, o SM Hub abre diretamente no seu WhatsApp Web ou aplicativo com o texto preenchido.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Número do WhatsApp Comercial (com DDD)</Label>
                  <Input
                    placeholder="(99) 98550-1962"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    className="bg-black/40 border-white/10 text-white font-medium"
                    required
                  />
                  <p className="text-[11px] text-gray-400">
                    Ex: (99) 98550-1962 ou 5599985501962.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || connectMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" /> Vincular Número Comercial
                </Button>
              </form>
            </TabsContent>

            {/* Tab 2: Evolution API / Z-API Gateway */}
            <TabsContent value="gateway" className="space-y-4 focus-visible:outline-none">
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  Para conexão com QR Code real multi-aparelho, conecte sua instância da <strong>Evolution API</strong>, <strong>Z-API</strong> ou <strong>WPPConnect</strong>.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">URL do Gateway / Instância</Label>
                  <Input
                    placeholder="https://api.meuzap.com.br"
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    className="bg-black/40 border-white/10 text-white text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">API Key / Token</Label>
                    <Input
                      type="password"
                      placeholder="Chave secreta"
                      value={gatewayKey}
                      onChange={(e) => setGatewayKey(e.target.value)}
                      className="bg-black/40 border-white/10 text-white text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">Nome da Instância</Label>
                    <Input
                      placeholder="smhub"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      className="bg-black/40 border-white/10 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleTestGateway}
                  disabled={loading}
                  className="w-full bg-brand text-black font-bold text-xs hover:bg-brand/90"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> Verificando Instância...
                    </>
                  ) : (
                    <>
                      <Server className="mr-1.5 size-3.5" /> Testar & Conectar Gateway
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Tab 3: Meta Cloud API Oficial */}
            <TabsContent value="meta" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={handleConnectMeta} className="space-y-3">
                <p className="text-xs text-gray-400">
                  API corporativa oficial do WhatsApp via Meta for Developers (sem risco de queda).
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Phone Number ID</Label>
                  <Input
                    placeholder="Ex: 1045928374928"
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value)}
                    className="bg-black/40 border-white/10 text-white text-xs font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Permanent Access Token</Label>
                  <Input
                    type="password"
                    placeholder="EAAG..."
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    className="bg-black/40 border-white/10 text-white text-xs font-mono"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || connectMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" /> Salvar Credenciais Meta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
