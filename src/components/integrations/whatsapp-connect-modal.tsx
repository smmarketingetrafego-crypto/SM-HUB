import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  QrCode, Smartphone, CheckCircle2, RefreshCw, PowerOff, ShieldCheck, 
  Sparkles
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  saveIntegration, 
  disconnectIntegration, 
  pairWhatsAppWithPhone,
  type WhatsAppConnection 
} from "@/lib/api-integracoes.functions";

interface WhatsAppConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection?: WhatsAppConnection;
}

export function WhatsAppConnectModal({ open, onOpenChange, connection }: WhatsAppConnectModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"qrcode" | "phone">("qrcode");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [qrKey, setQrKey] = useState(1);

  // Timer para atualização do QR Code
  useEffect(() => {
    if (!open || connection?.connected) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrKey((k) => k + 1);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, connection?.connected]);

  const connectMutation = useMutation({
    mutationFn: async (payload: { phone?: string; mode: "qrcode" | "phone" }) => {
      return saveIntegration({
        data: {
          service: "whatsapp",
          data: {
            phone: payload.phone || "Número Vinculado",
            deviceName: "WhatsApp Web (Chrome macOS)",
            connectedAt: "Agora mesmo",
            mode: payload.mode,
            connected: true,
          },
        },
      });
    },
    onSuccess: () => {
      toast.success("WhatsApp conectado com sucesso!", {
        description: "Mensagens e disparos automáticos agora estão sincronizados.",
      });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      onOpenChange(false);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => disconnectIntegration({ data: "whatsapp" }),
    onSuccess: () => {
      toast.info("WhatsApp desconectado.");
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setPairingCode(null);
    },
  });

  const handleSimulateScan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      connectMutation.mutate({ mode: "qrcode" });
    }, 1200);
  };

  const handleGeneratePhoneCode = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Informe seu número com DDD (ex: 11987654321)");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await pairWhatsAppWithPhone({ data: phoneNumber.trim() });
      if (res.success && res.pairingCode) {
        setPairingCode(res.pairingCode);
        toast.success("Código de pareamento gerado!");
      }
    } catch (e: any) {
      toast.error("Erro ao gerar código: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmPhonePair = () => {
    connectMutation.mutate({ phone: phoneNumber, mode: "phone" });
  };

  const isConnected = connection?.connected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f] border border-white/10 text-white sm:max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#171717] to-[#111111] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Conectar WhatsApp Web
                {isConnected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Online
                  </span>
                )}
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Envio automático de propostas, briefings e alertas para clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isConnected ? (
            <div className="p-6 rounded-2xl bg-[#141414] border border-white/5 space-y-4 text-center">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Aparelho Conectado</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {connection?.deviceName || "WhatsApp Web Ativo"} • {connection?.phone || "Número Vinculado"}
                </p>
                <p className="text-[11px] text-emerald-400 font-mono mt-1">
                  Status: Operacional • Sincronização em tempo real
                </p>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl text-xs h-10 w-full"
                >
                  <PowerOff className="size-3.5 mr-2" /> Desconectar Este Aparelho
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid grid-cols-2 bg-[#171717] p-1 rounded-xl border border-white/5 mb-6">
                <TabsTrigger value="qrcode" className="data-[state=active]:bg-[#242424] data-[state=active]:text-white text-xs font-semibold rounded-lg py-2">
                  <QrCode className="size-3.5 mr-1.5" /> Conectar via QR Code
                </TabsTrigger>
                <TabsTrigger value="phone" className="data-[state=active]:bg-[#242424] data-[state=active]:text-white text-xs font-semibold rounded-lg py-2">
                  <Smartphone className="size-3.5 mr-1.5" /> Número de Telefone
                </TabsTrigger>
              </TabsList>

              {/* QR Code Tab */}
              <TabsContent value="qrcode" className="space-y-4 focus-visible:outline-none">
                <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl bg-[#141414] border border-white/5">
                  <div className="bg-white p-3 rounded-2xl shadow-lg relative shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SMHUB-WA-${qrKey}-${countdown}&color=000000&bgcolor=ffffff`}
                      alt="QR Code WhatsApp" 
                      className="size-40 rounded-lg object-contain"
                    />
                    <div className="mt-2 text-center text-[10px] text-gray-700 font-mono flex items-center justify-center gap-1">
                      <RefreshCw className="size-2.5 animate-spin text-gray-500" />
                      Atualiza em {countdown}s
                    </div>
                  </div>

                  <div className="space-y-3 text-xs flex-1">
                    <p className="font-semibold text-white text-sm">Passo a passo no seu celular:</p>
                    <ol className="list-decimal list-inside space-y-2 text-gray-300">
                      <li>Abra o <strong className="text-white">WhatsApp</strong> no seu aparelho.</li>
                      <li>Toque no menu de <strong className="text-white">Configurações</strong> ou três pontos.</li>
                      <li>Selecione <strong className="text-white">Aparelhos Conectados</strong>.</li>
                      <li>Toque em <strong className="text-brand">Conectar um aparelho</strong> e aponte para o QR Code ao lado.</li>
                    </ol>

                    <div className="pt-2">
                      <Button 
                        onClick={handleSimulateScan}
                        disabled={isGenerating || connectMutation.isPending}
                        className="w-full gradient-brand text-black font-bold h-10 rounded-xl text-xs hover:brightness-110 shadow-[0_0_15px_rgba(201,162,39,0.25)]"
                      >
                        {isGenerating ? (
                          <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5 mr-1.5" />
                        )}
                        Simular Leitura do QR Code
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Phone Pairing Tab */}
              <TabsContent value="phone" className="space-y-4 focus-visible:outline-none">
                <div className="space-y-3">
                  <p className="text-xs text-gray-300">
                    Insira o número do seu celular com DDD para gerar o código de pareamento de 8 dígitos:
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+55 (00) 00000-0000" 
                      className="bg-[#181818] border-white/10 text-white h-11 text-sm rounded-xl font-mono flex-1"
                    />
                    <Button 
                      onClick={handleGeneratePhoneCode}
                      disabled={isGenerating || !phoneNumber.trim()}
                      className="gradient-brand text-black font-bold px-4 h-11 rounded-xl text-xs"
                    >
                      {isGenerating ? <RefreshCw className="size-3.5 animate-spin" /> : "Gerar Código"}
                    </Button>
                  </div>
                </div>

                {pairingCode && (
                  <div className="p-5 rounded-2xl bg-[#141414] border border-brand/30 space-y-4 animate-in fade-in">
                    <div className="text-center">
                      <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">Código de Pareamento</span>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        {pairingCode.split("").map((char, idx) => (
                          <span 
                            key={idx}
                            className={`size-10 rounded-xl flex items-center justify-center font-mono font-extrabold text-lg ${
                              char === "-" 
                                ? "text-gray-500 w-4 bg-transparent border-0" 
                                : "bg-black border border-brand/40 text-brand shadow-[0_0_10px_rgba(201,162,39,0.2)]"
                            }`}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 space-y-1">
                      <p className="font-semibold text-white">Instruções:</p>
                      <p>1. Uma notificação com o título <strong className="text-white">"Inserir código de pareamento"</strong> chegará no seu WhatsApp.</p>
                      <p>2. Digite os 8 caracteres acima para autenticar a sessão do SM Hub.</p>
                    </div>

                    <Button 
                      onClick={handleConfirmPhonePair}
                      disabled={connectMutation.isPending}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-10 rounded-xl text-xs"
                    >
                      <CheckCircle2 className="size-3.5 mr-1.5" /> Confirmar Conexão do Aparelho
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
