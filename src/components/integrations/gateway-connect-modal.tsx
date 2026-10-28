import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  CreditCard, Check, ShieldCheck, PowerOff, 
  Zap, Key, RefreshCw
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
    }, 600);
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
    }, 600);
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
    }, 600);
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
                Gere cobranças, faturas e links de pagamento automáticos para suas propostas.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid grid-cols-2 bg-[#171717] p-1 rounded-xl border border-white/5 mb-6">
              <TabsTrigger value="simple" className="data-[state=active]:bg-[#242424] data-[state=active]:text-white text-xs font-semibold rounded-lg py-2">
                <Zap className="size-3.5 mr-1.5" /> Vinculação Direta
              </TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-[#242424] data-[state=active]:text-white text-xs font-semibold rounded-lg py-2">
                <Key className="size-3.5 mr-1.5" /> Chaves de API
              </TabsTrigger>
            </TabsList>

            {/* ── Direct Accounts ── */}
            <TabsContent value="simple" className="space-y-4 focus-visible:outline-none">
              {/* Asaas */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                    A
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Asaas Cobranças (Pix / Boleto / Cartão)
                      {integrations?.asaas?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Ativo
                        </span>
                      )}
                    </h4>
                    {!integrations?.asaas?.connected && (
                      <Input 
                        value={asaasEmail}
                        onChange={(e) => setAsaasEmail(e.target.value)}
                        placeholder="E-mail da sua conta Asaas"
                        className="bg-black border-white/10 text-white text-xs h-8 mt-2 rounded-lg"
                      />
                    )}
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
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingGateway === "asaas" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                    Ativar Asaas
                  </Button>
                )}
              </div>

              {/* Mercado Pago */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-base shrink-0">
                    MP
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Mercado Pago (Pix Instantâneo)
                      {integrations?.mercadopago?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Ativo
                        </span>
                      )}
                    </h4>
                    {!integrations?.mercadopago?.connected && (
                      <Input 
                        value={mpEmail}
                        onChange={(e) => setMpEmail(e.target.value)}
                        placeholder="E-mail da sua conta Mercado Pago"
                        className="bg-black border-white/10 text-white text-xs h-8 mt-2 rounded-lg"
                      />
                    )}
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
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingGateway === "mercadopago" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                    Ativar Mercado Pago
                  </Button>
                )}
              </div>

              {/* Stripe */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
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
                      Receba de clientes internacionais em dólar, euro ou real.
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
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingGateway === "stripe" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <CreditCard className="size-3.5 mr-1" />}
                    Conectar Stripe
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
