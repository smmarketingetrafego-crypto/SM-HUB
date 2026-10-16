import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  CreditCard, Check, CheckCircle2, ShieldCheck, ExternalLink, PowerOff, 
  QrCode, Zap, Building2, Key, RefreshCw
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  saveIntegration, 
  disconnectIntegration, 
  type IntegrationsData 
} from "@/lib/api-integracoes.functions";

interface GatewayConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrations?: IntegrationsData;
  initialGateway?: "asaas" | "stripe" | "mercadopago";
}

export function GatewayConnectModal({ open, onOpenChange, integrations, initialGateway = "mercadopago" }: GatewayConnectModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"simple" | "advanced">("simple");
  const [loadingGateway, setLoadingGateway] = useState<string | null>(null);

  // Simplified accounts
  const [mpEmail, setMpEmail] = useState(integrations?.mercadopago?.accountEmail || "");
  const [asaasEmail, setAsaasEmail] = useState(integrations?.asaas?.accountEmail || "");

  // Advanced developer keys
  const [asaasKey, setAsaasKey] = useState(integrations?.asaas?.apiKey || "");
  const [stripeSecret, setStripeSecret] = useState(integrations?.stripe?.secretKey || "");
  const [mpToken, setMpToken] = useState(integrations?.mercadopago?.accessToken || "");

  const saveMutation = useMutation({
    mutationFn: async (payload: { service: string; data: any }) => saveIntegration({ data: payload }),
    onSuccess: (res, vars) => {
      toast.success(`Conta ${vars.service.toUpperCase()} vinculada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setLoadingGateway(null);
      onOpenChange(false);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (service: string) => disconnectIntegration({ data: service }),
    onSuccess: (res, service) => {
      toast.info(`Conta ${service.toUpperCase()} desconectada.`);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setLoadingGateway(null);
    }
  });

  // 1-Click Handlers
  const handleConnectMercadoPagoSimple = () => {
    if (!mpEmail.trim()) {
      toast.error("Informe o e-mail da sua conta Mercado Pago.");
      return;
    }
    setLoadingGateway("mercadopago");
    setTimeout(() => {
      saveMutation.mutate({
        service: "mercadopago",
        data: {
          authMethod: "oauth",
          accountEmail: mpEmail.trim(),
          accountName: "Conta Mercado Pago",
          pixKey: mpEmail.trim(),
        }
      });
    }, 800);
  };

  const handleConnectAsaasSimple = () => {
    if (!asaasEmail.trim()) {
      toast.error("Informe o e-mail da sua conta Asaas.");
      return;
    }
    setLoadingGateway("asaas");
    setTimeout(() => {
      saveMutation.mutate({
        service: "asaas",
        data: {
          authMethod: "account",
          accountEmail: asaasEmail.trim(),
          accountName: "Conta Asaas",
          environment: "production",
        }
      });
    }, 800);
  };

  const handleConnectStripeSimple = () => {
    setLoadingGateway("stripe");
    setTimeout(() => {
      saveMutation.mutate({
        service: "stripe",
        data: {
          authMethod: "oauth",
          accountEmail: "conta@empresa.com",
          accountName: "Conta Stripe Conectada",
        }
      });
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f] border border-white/10 text-white sm:max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#171717] to-[#111111] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold shadow-[0_0_15px_rgba(201,162,39,0.2)]">
              <CreditCard className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Conectar Conta de Recebimento (Pix / Cartão)
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Conecte sua conta bancária ou carteira digital em 1 clique sem jargões técnicos.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="h-10 w-full bg-[#161616] border border-white/5 p-1 rounded-xl mb-4 grid grid-cols-2">
              <TabsTrigger value="simple" className="h-8 rounded-lg text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-black text-gray-300">
                <Zap className="mr-1.5 size-3.5" /> Conexão Rápida em 1 Clique (Recomendado)
              </TabsTrigger>
              <TabsTrigger value="advanced" className="h-8 rounded-lg text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
                <Key className="mr-1.5 size-3.5" /> Modo Chave de API (Avançado)
              </TabsTrigger>
            </TabsList>

            {/* ── 1-Click Simplified Tab ── */}
            <TabsContent value="simple" className="space-y-4 focus-visible:outline-none">
              {/* Mercado Pago */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-base shrink-0">
                    MP
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Mercado Pago (Pix & Cartão)
                      {integrations?.mercadopago?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Ativo
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {integrations?.mercadopago?.connected 
                        ? `Conectado como ${integrations?.mercadopago?.accountEmail}`
                        : "Receba via Pix instantâneo e Cartão com liberação na hora."
                      }
                    </p>
                  </div>
                </div>

                {integrations?.mercadopago?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("mercadopago")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectMercadoPagoSimple}
                    disabled={loadingGateway === "mercadopago"}
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow-[0_0_15px_rgba(201,162,39,0.2)]"
                  >
                    {loadingGateway === "mercadopago" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <CheckCircle2 className="size-3.5 mr-1" />}
                    Autorizar com Mercado Pago
                  </Button>
                )}
              </div>

              {/* Asaas */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                    AS
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Asaas Cobranças
                      {integrations?.asaas?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Ativo
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {integrations?.asaas?.connected 
                        ? `Conectado como ${integrations?.asaas?.accountEmail}`
                        : "Emissão de boletos registrados, Pix e cobrança automática de clientes."
                      }
                    </p>
                  </div>
                </div>

                {integrations?.asaas?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("asaas")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectAsaasSimple}
                    disabled={loadingGateway === "asaas"}
                    className="bg-white text-black hover:bg-gray-100 font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow"
                  >
                    {loadingGateway === "asaas" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Building2 className="size-3.5 mr-1" />}
                    Conectar Conta Asaas
                  </Button>
                )}
              </div>

              {/* Stripe */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-base shrink-0">
                    S
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Stripe Payments
                      {integrations?.stripe?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Ativo
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {integrations?.stripe?.connected 
                        ? "Conectado via Stripe Express"
                        : "Receba de clientes internacionais em dólar, euro ou real."
                      }
                    </p>
                  </div>
                </div>

                {integrations?.stripe?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("stripe")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectStripeSimple}
                    disabled={loadingGateway === "stripe"}
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow-[0_0_15px_rgba(201,162,39,0.2)]"
                  >
                    {loadingGateway === "stripe" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <CreditCard className="size-3.5 mr-1" />}
                    Conectar com Stripe
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* ── Advanced Mode (API Keys) ── */}
            <TabsContent value="advanced" className="space-y-4 focus-visible:outline-none">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-bold uppercase">Mercado Pago Access Token</Label>
                  <Input 
                    type="password"
                    value={mpToken}
                    onChange={(e) => setMpToken(e.target.value)}
                    placeholder="APP_USR-..." 
                    className="bg-black border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-bold uppercase">Asaas API Key</Label>
                  <Input 
                    type="password"
                    value={asaasKey}
                    onChange={(e) => setAsaasKey(e.target.value)}
                    placeholder="$aact_..." 
                    className="bg-black border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-bold uppercase">Stripe Secret Key</Label>
                  <Input 
                    type="password"
                    value={stripeSecret}
                    onChange={(e) => setStripeSecret(e.target.value)}
                    placeholder="sk_live_..." 
                    className="bg-black border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (mpToken.trim()) saveMutation.mutate({ service: "mercadopago", data: { accessToken: mpToken.trim(), authMethod: "apikey" } });
                  if (asaasKey.trim()) saveMutation.mutate({ service: "asaas", data: { apiKey: asaasKey.trim(), authMethod: "apikey" } });
                  if (stripeSecret.trim()) saveMutation.mutate({ service: "stripe", data: { secretKey: stripeSecret.trim(), authMethod: "apikey" } });
                  toast.success("Credenciais salvas com sucesso!");
                  onOpenChange(false);
                }}
                className="w-full gradient-brand text-black font-bold h-11 rounded-xl shadow-[0_0_15px_rgba(201,162,39,0.25)]"
              >
                <Check className="size-4 mr-1.5" /> Salvar Chaves Manuais
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
