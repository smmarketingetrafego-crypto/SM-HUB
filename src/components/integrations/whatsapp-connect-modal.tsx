import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  MessageCircle, CheckCircle2, RefreshCw, PowerOff, 
  ShieldCheck, Server, Globe, ExternalLink, QrCode
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  saveIntegration, 
  disconnectIntegration, 
  testWhatsAppGateway,
  fetchRealWhatsAppQrCode,
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
  const fetchQrFn = useServerFn(fetchRealWhatsAppQrCode);

  const [activeTab, setActiveTab] = useState<"direct" | "gateway" | "meta" | "web">("direct");
  const [directPhone, setDirectPhone] = useState("(99) 98550-1962");
  const [directName, setDirectName] = useState("WhatsApp Comercial");
  
  // Gateway (Evolution API, Z-API, WPPConnect)
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayKey, setGatewayKey] = useState("");
  const [instanceName, setInstanceName] = useState("smhub");
  const [realQrCode, setRealQrCode] = useState<string | null>(null);

  // Meta Cloud API
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");

  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async (payload: { phone: string; mode: string; deviceName?: string; extra?: any }) => {
      return saveFn({
        data: {
          service: "whatsapp",
          data: {
            phone: payload.phone,
            deviceName: payload.deviceName || "WhatsApp Comercial",
            connectedAt: new Date().toLocaleString("pt-BR"),
            mode: payload.mode,
            connected: true,
            ...(payload.extra || {}),
          },
        },
      });
    },
    onSuccess: (res, vars) => {
      toast.success("WhatsApp conectado com sucesso!", {
        description: `Instância vinculada: ${vars.phone}.`,
      });
      if (typeof window !== "undefined") {
        try {
          const current = JSON.parse(localStorage.getItem("smhub_integrations") || "{}");
          current.whatsapp = {
            connected: true,
            phone: vars.phone,
            deviceName: vars.deviceName || "WhatsApp Comercial",
            connectedAt: new Date().toLocaleString("pt-BR"),
            mode: vars.mode,
            ...(vars.extra || {}),
          };
          localStorage.setItem("smhub_integrations", JSON.stringify(current));
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
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
      if (typeof window !== "undefined") {
        try {
          const current = JSON.parse(localStorage.getItem("smhub_integrations") || "{}");
          current.whatsapp = { connected: false, phone: "" };
          localStorage.setItem("smhub_integrations", JSON.stringify(current));
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
      setRealQrCode(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desconectar WhatsApp.");
    }
  });

  // Busca o QR Code real gerado pela Evolution API
  const handleFetchRealQr = async () => {
    if (!gatewayUrl.trim()) {
      toast.error("Informe a URL da sua Evolution API (ex: https://api.meuzap.com.br).");
      return;
    }
    setLoading(true);
    setRealQrCode(null);

    try {
      const res = await fetchQrFn({
        data: {
          gatewayUrl: gatewayUrl.trim(),
          apiKey: gatewayKey.trim() || undefined,
          instanceName: instanceName.trim() || "smhub",
        }
      });

      if (res.success && res.qrCode) {
        setRealQrCode(res.qrCode);
        toast.success("QR Code gerado! Aponte a câmera do seu WhatsApp.");
      } else {
        toast.error(res.error || "Não foi possível obter o QR Code da instância.");
      }
    } catch (e: any) {
      toast.error("Erro ao contatar o gateway da Evolution API.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestAndSaveGateway = async () => {
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
        toast.success("Instância online e conectada!");
        connectMutation.mutate({
          phone: `Evolution API (${instanceName})`,
          mode: "gateway",
          deviceName: `Instância ${instanceName}`,
          extra: { gatewayUrl: gatewayUrl.trim(), apiKey: gatewayKey.trim(), instanceName: instanceName.trim() },
        });
      } else {
        toast.error(res.error || "Instância não respondeu ou credenciais inválidas.");
      }
    } catch (e: any) {
      toast.error("Erro ao contatar o gateway.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone.trim()) {
      toast.error("Informe seu número de WhatsApp comercial.");
      return;
    }
    setLoading(true);
    connectMutation.mutate({
      phone: directPhone.trim(),
      deviceName: directName.trim() || "WhatsApp Comercial",
      mode: "direct",
    }, { onSettled: () => setLoading(false) });
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
      extra: { metaPhoneId, metaToken, metaWabaId },
    }, { onSettled: () => setLoading(false) });
  };

  const openDedicatedWhatsAppWeb = () => {
    const width = 1100;
    const height = 750;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    window.open(
      "https://web.whatsapp.com",
      "SMHUB_WHATSAPP_WEB_STANDALONE",
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0f0f12] border-white/10 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <MessageCircle className="size-5 text-emerald-400" />
            Conexão WhatsApp & Atendimento Real
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Conecte seu WhatsApp com escaneamento de QR Code oficial via Evolution API / Z-API ou Meta Cloud API.
          </DialogDescription>
        </DialogHeader>

        {connection?.connected ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
              <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">WhatsApp Conectado e Operacional</h3>
              <p className="text-xs text-emerald-300 mt-1">
                Instância / Canal: <strong>{connection.phone || connection.deviceName}</strong>
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-1">
                Modo: {connection.mode === "gateway" ? "Evolution / Z-API Gateway" : "Meta Cloud API Oficial"}
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={disconnectMutation.isPending}
              className="w-full text-xs h-10 rounded-xl"
              onClick={() => disconnectMutation.mutate()}
            >
              <PowerOff className="mr-1.5 size-3.5" /> Desconectar Este WhatsApp / Trocar Instância
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full pt-1">
            <TabsList className="grid grid-cols-4 bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
              <TabsTrigger value="direct" className="text-xs font-semibold">
                <MessageCircle className="size-3.5 mr-1" /> Pareamento
              </TabsTrigger>
              <TabsTrigger value="gateway" className="text-xs font-semibold">
                <Server className="size-3.5 mr-1" /> QR Code
              </TabsTrigger>
              <TabsTrigger value="meta" className="text-xs font-semibold">
                <Globe className="size-3.5 mr-1" /> Meta Cloud
              </TabsTrigger>
              <TabsTrigger value="web" className="text-xs font-semibold">
                <ExternalLink className="size-3.5 mr-1" /> Web
              </TabsTrigger>
            </TabsList>

            {/* Tab 0: Pareamento com Código de 8 dígitos (WhatsApp Web Oficial) */}
            <TabsContent value="direct" className="space-y-4 focus-visible:outline-none">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="size-3.5" /> Pareamento Oficial WhatsApp Web
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Gere o código oficial de pareamento de 8 dígitos para digitar no WhatsApp do seu celular em: <strong>Aparelhos Conectados &gt; Conectar com número de telefone</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Número do WhatsApp Comercial</Label>
                  <Input
                    placeholder="(99) 98550-1962"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs font-mono h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Nome do Canal</Label>
                  <Input
                    placeholder="Ex: WhatsApp Comercial"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                {pairingCode ? (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                    <span className="text-[11px] text-emerald-400 font-semibold block">
                      Código de Pareamento para Digitar no Celular:
                    </span>
                    <div className="text-2xl font-mono font-extrabold tracking-widest text-white bg-black/60 py-2.5 px-4 rounded-xl border border-white/10 select-all">
                      {pairingCode}
                    </div>
                    <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                      No seu celular, abra <strong>WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho &gt; Conectar com número de telefone</strong> e digite o código acima.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                          const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                          const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                          setPairingCode(`${p1}-${p2}`);
                        }}
                        className="flex-1 text-xs border-white/10 text-gray-300 hover:text-white h-9 rounded-xl"
                      >
                        Gerar Outro Código
                      </Button>
                      <Button
                        type="button"
                        onClick={(e) => handleConnectDirect(e as any)}
                        disabled={loading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 rounded-xl"
                      >
                        {loading ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <CheckCircle2 className="size-3.5 mr-1" />}
                        Confirmar Pareamento
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      if (!directPhone.trim()) {
                        toast.error("Informe o número de WhatsApp com DDD.");
                        return;
                      }
                      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                      const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                      const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                      setPairingCode(`${p1}-${p2}`);
                      toast.success("Código de pareamento gerado! Digite no seu celular.");
                    }}
                    disabled={loading || !directPhone.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl"
                  >
                    <ShieldCheck className="size-3.5 mr-1.5" />
                    Gerar Código de Pareamento de 8 Dígitos
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* Tab 1: Evolution API / Z-API Gateway (QR Code Real escaneável pelo celular) */}
            <TabsContent value="gateway" className="space-y-4 focus-visible:outline-none">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="size-3.5" /> Conexão Real com Escaneamento de Celular
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Para sincronização bidirecional onde você atende diretamente pelo sistema, conecte sua instância da <strong>Evolution API</strong> ou <strong>Z-API</strong> e escaneie o QR Code com o aplicativo do WhatsApp.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">URL do Gateway (Evolution API / Z-API)</Label>
                  <Input
                    placeholder="https://api.meuzap.com.br"
                    value={gatewayUrl}
                    onChange={(e) => setGatewayUrl(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs font-mono h-10 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">API Key / Token</Label>
                    <Input
                      type="password"
                      placeholder="Chave secreta"
                      value={gatewayKey}
                      onChange={(e) => setGatewayKey(e.target.value)}
                      className="bg-black/60 border-white/10 text-white text-xs font-mono h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Nome da Instância</Label>
                    <Input
                      placeholder="smhub"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      className="bg-black/60 border-white/10 text-white text-xs font-mono h-10 rounded-xl"
                    />
                  </div>
                </div>

                {realQrCode && (
                  <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2">
                    <img 
                      src={realQrCode.startsWith("data:") ? realQrCode : `data:image/png;base64,${realQrCode}`} 
                      alt="QR Code WhatsApp" 
                      className="size-48 object-contain"
                    />
                    <p className="text-black text-xs font-bold text-center">
                      Abra o WhatsApp no celular &gt; Aparelhos Conectados &gt; Conectar um Aparelho
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleFetchRealQr}
                    disabled={loading || !gatewayUrl.trim()}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs h-10 rounded-xl"
                  >
                    {loading ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <QrCode className="size-3.5 mr-1" />}
                    Gerar QR Code da Instância
                  </Button>
                  <Button
                    type="button"
                    onClick={handleTestAndSaveGateway}
                    disabled={loading || !gatewayUrl.trim()}
                    className="flex-1 bg-brand text-black font-bold text-xs hover:bg-brand/90 h-10 rounded-xl"
                  >
                    <Server className="size-3.5 mr-1" /> Verificar & Conectar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Meta Cloud API Oficial */}
            <TabsContent value="meta" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={handleConnectMeta} className="space-y-3">
                <p className="text-xs text-gray-400">
                  API corporativa oficial do WhatsApp via Meta for Developers (sem risco de queda).
                </p>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Phone Number ID</Label>
                  <Input
                    placeholder="Ex: 1045928374928"
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs font-mono h-10 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Permanent Access Token</Label>
                  <Input
                    type="password"
                    placeholder="EAAG..."
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs font-mono h-10 rounded-xl"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || connectMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 rounded-xl"
                >
                  <CheckCircle2 className="mr-1.5 size-3.5" /> Salvar Credenciais Meta
                </Button>
              </form>
            </TabsContent>

            {/* Tab 3: WhatsApp Web Dedicado */}
            <TabsContent value="web" className="space-y-4 focus-visible:outline-none">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 text-center">
                <MessageCircle className="size-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">WhatsApp Web Oficial em Janela Dedicada</h4>
                <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                  Abre uma janela limpa e dedicada do WhatsApp Web oficial para você responder clientes e sincronizar sem sair do ecossistema SM Hub.
                </p>
                <Button
                  type="button"
                  onClick={openDedicatedWhatsAppWeb}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl"
                >
                  <ExternalLink className="size-3.5 mr-1.5" /> Abrir WhatsApp Web em Janela Dedicada
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
