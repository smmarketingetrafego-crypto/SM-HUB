import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  QrCode, Smartphone, CheckCircle2, RefreshCw, PowerOff, ShieldCheck, 
  HelpCircle, Copy, ArrowRight, BatteryMedium, Sparkles
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

  // Timer for QR code refresh
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
            connected: true
          }
        }
      });
    },
    onSuccess: () => {
      toast.success("WhatsApp Conectado com sucesso!", {
        description: "Mensagens e disparos automáticos agora estão sincronizados.",
      });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      onOpenChange(false);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => disconnectIntegration({ data: "whatsapp" }),
    onSuccess: () => {
      toast.info("WhatsApp desconectado.");
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setPairingCode(null);
    }
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
      if (res.success) {
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
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Conectado
                  </span>
                )}
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Vincule seu WhatsApp pessoal ou empresarial via QR Code ou Número de Telefone.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isConnected ? (
            /* Active Connection State */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#141414] border border-white/5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-white">{connection?.deviceName || "WhatsApp Web Oficial"}</p>
                      <p className="text-xs text-gray-400">{connection?.phone || "Sessão Ativa"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">
                    <BatteryMedium className="size-4 text-emerald-400" /> 92%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-500 block mb-1">Status da Sessão:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Ativo & Sincronizado
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-gray-500 block mb-1">Modo de Conexão:</span>
                    <span className="text-white font-medium">
                      {connection?.mode === "phone" ? "Número de Telefone" : "QR Code Web"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  Criptografia de ponta a ponta ativa
                </span>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs h-9 rounded-xl font-semibold"
                >
                  <PowerOff className="mr-1.5 size-3.5" /> Desconectar Aparelho
                </Button>
              </div>
            </div>
          ) : (
            /* Connection Options */
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="h-11 w-full bg-[#161616] border border-white/5 p-1 rounded-xl mb-6">
                <TabsTrigger value="qrcode" className="flex-1 h-9 rounded-lg text-xs font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
                  <QrCode className="mr-2 size-4 text-brand" /> Conectar com QR Code
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex-1 h-9 rounded-lg text-xs font-semibold data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
                  <Smartphone className="mr-2 size-4 text-brand" /> Conectar com Número
                </TabsTrigger>
              </TabsList>

              {/* QR Code Tab */}
              <TabsContent value="qrcode" className="space-y-6 focus-visible:outline-none">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Visual QR Code Display */}
                  <div className="relative size-52 bg-white p-3 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-xl border-4 border-white/20">
                    {/* Stylized QR Code matrix simulation */}
                    <div key={qrKey} className="size-full bg-black rounded-lg p-2 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex justify-between">
                        <div className="size-11 border-4 border-white bg-black flex items-center justify-center">
                          <div className="size-5 bg-white" />
                        </div>
                        <div className="size-11 border-4 border-white bg-black flex items-center justify-center">
                          <div className="size-5 bg-white" />
                        </div>
                      </div>

                      <div className="my-auto flex flex-col items-center justify-center">
                        <div className="size-9 rounded-full bg-brand flex items-center justify-center text-black font-bold text-xs shadow-md">
                          SM
                        </div>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="size-11 border-4 border-white bg-black flex items-center justify-center">
                          <div className="size-5 bg-white" />
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div className="size-2 bg-white" />
                          <div className="size-2 bg-white" />
                          <div className="size-2 bg-white" />
                        </div>
                      </div>
                    </div>

                    <div className="absolute -bottom-2 bg-[#1a1a1a] text-brand border border-brand/30 text-[10px] font-mono px-2 py-0.5 rounded-full shadow">
                      Atualiza em {countdown}s
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-3 text-xs flex-1">
                    <p className="font-bold text-white text-sm">Passo a passo no seu celular:</p>
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
