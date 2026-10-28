import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Mail, Check, ShieldCheck, RefreshCw, PowerOff, KeyRound, ExternalLink, Send
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  verifyResendConnection, 
  saveEmailConfig, 
  getEmailConfig, 
  sendTransactionalEmail,
  type EmailIntegrationConfig
} from "@/lib/api-email.functions";

interface ResendConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResendConnectModal({ open, onOpenChange }: ResendConnectModalProps) {
  const queryClient = useQueryClient();
  const verifyFn = useServerFn(verifyResendConnection);
  const saveFn = useServerFn(saveEmailConfig);
  const getConfigFn = useServerFn(getEmailConfig);
  const sendTestFn = useServerFn(sendTransactionalEmail);

  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("onboarding@resend.dev");
  const [senderName, setSenderName] = useState("SM Hub");
  const [testTargetEmail, setTestTargetEmail] = useState("smmarketingetrafego@gmail.com");

  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (open) {
      getConfigFn().then((res) => {
        if (res?.config?.resendApiKey) {
          setApiKey(res.config.resendApiKey);
          setConnected(true);
        }
        if (res?.config?.senderEmail) setSenderEmail(res.config.senderEmail);
        if (res?.config?.senderName) setSenderName(res.config.senderName);
      }).catch(() => {});
    }
  }, [open]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      toast.error("Informe sua chave de API do Resend (começa com 're_').");
      return;
    }
    if (!cleanKey.startsWith("re_")) {
      toast.error("Chave inválida. A chave da API Resend deve começar com 're_'.");
      return;
    }

    setLoading(true);
    try {
      // 1. Testa a chave nos servidores oficiais da Resend
      const testResult = await verifyFn({ data: { apiKey: cleanKey } });
      if (!testResult.success) {
        toast.error(testResult.error || "Chave do Resend inválida ou sem permissão.");
        return;
      }

      // 2. Salva no banco de dados do sistema
      const saveResult = await saveFn({
        data: {
          provider: "resend",
          resendApiKey: cleanKey,
          senderEmail: senderEmail.trim() || "onboarding@resend.dev",
          senderName: senderName.trim() || "SM Hub",
          connected: true,
        }
      });

      if (saveResult.success) {
        setConnected(true);
        toast.success("Resend conectado com sucesso!", {
          description: "Envio de e-mails transacionais e notificações ativado.",
        });
        queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
        queryClient.invalidateQueries({ queryKey: ["external-status"] });
        queryClient.invalidateQueries({ queryKey: ["email-config"] });
        onOpenChange(false);
      } else {
        toast.error("Erro ao salvar configuração de e-mail.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao validar credenciais do Resend.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testTargetEmail.trim() || !testTargetEmail.includes("@")) {
      toast.error("Informe um e-mail válido para o teste.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await sendTestFn({
        data: {
          to: testTargetEmail.trim(),
          subject: "Teste de E-mail — SM Hub",
          type: "welcome",
          userName: "Silas Maroto",
        }
      });
      if (res.success) {
        toast.success(`E-mail de teste enviado para ${testTargetEmail}!`);
      } else {
        toast.error(res.error || "Falha ao enviar e-mail de teste.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro no envio do e-mail de teste.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await saveFn({
        data: {
          provider: "resend",
          resendApiKey: "",
          connected: false,
        }
      });
      setApiKey("");
      setConnected(false);
      toast.info("Resend desconectado.");
      queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
      queryClient.invalidateQueries({ queryKey: ["email-config"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao desconectar Resend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0f0f12] border-white/10 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Mail className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Conectar E-mail Transacional (Resend)
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                Dispare propostas, notificações de faturas e confirmações de cadastro aos seus clientes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleTestAndSave} className="space-y-4 pt-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-300 font-semibold">Resend API Key (re_...)</Label>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-brand hover:underline flex items-center gap-1 font-medium"
              >
                Gerar chave no Resend <ExternalLink className="size-2.5" />
              </a>
            </div>
            <Input
              type="password"
              required
              placeholder="re_123456789_abcdef..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-black/60 border-white/10 text-white font-mono text-xs h-11 rounded-xl"
            />
            <p className="text-[11px] text-gray-500">
              Copie sua chave no painel oficial do Resend em API Keys.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-semibold">E-mail Remetente</Label>
              <Input
                type="email"
                required
                placeholder="onboarding@resend.dev"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-semibold">Nome Remetente</Label>
              <Input
                placeholder="SM Hub - Silas Maroto"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
              <Send className="size-3.5 text-brand" /> Testar Envio de E-mail
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="smmarketingetrafego@gmail.com"
                value={testTargetEmail}
                onChange={(e) => setTestTargetEmail(e.target.value)}
                className="bg-black/40 border-white/10 text-white text-xs h-9 rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendTest}
                disabled={sendingTest || !apiKey.trim()}
                className="h-9 text-xs border-white/10 text-white hover:bg-white/10 shrink-0 rounded-xl"
              >
                {sendingTest ? <RefreshCw className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
                Enviar Teste
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {connected && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDisconnect}
                disabled={loading}
                className="h-11 px-4 rounded-xl text-xs shrink-0"
              >
                <PowerOff className="size-3.5 mr-1" /> Desconectar
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="flex-1 bg-brand text-black font-bold hover:bg-brand/90 h-11 rounded-xl text-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" /> Validando na API Resend...
                </>
              ) : (
                <>
                  <Check className="size-3.5 mr-1.5" /> Validar & Salvar Conexão
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
