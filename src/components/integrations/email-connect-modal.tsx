import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getEmailConfig,
  saveEmailConfig,
  verifyResendConnection,
  sendTransactionalEmail,
  type EmailIntegrationConfig,
} from "@/lib/api-email.server";
import {
  openResendConnectPopup,
  openResendDirectLogin,
  openResendDirectSignup,
  openResendDirectApiKeys,
  RESEND_EVENT_NAME,
} from "@/lib/resend-connect";
import {
  Mail,
  CheckCircle2,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  KeyRound,
  Server,
  AlertCircle,
  ExternalLink,
  ClipboardCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface EmailConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminEmail?: string;
}

export function EmailConnectModal({ open, onOpenChange, adminEmail = "" }: EmailConnectModalProps) {
  const queryClient = useQueryClient();

  const { data: emailData, isLoading } = useQuery({
    queryKey: ["email-config"],
    queryFn: () => getEmailConfig(),
    enabled: open,
  });

  const [provider, setProvider] = useState<"resend" | "smtp">("resend");
  const [resendApiKey, setResendApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("onboarding@resend.dev");
  const [senderName, setSenderName] = useState("SM Hub");

  // SMTP Fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");

  const [testingEmail, setTestingEmail] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);

  useEffect(() => {
    if (emailData?.config) {
      setProvider(emailData.config.provider || "resend");
      if (emailData.config.resendApiKey) setResendApiKey(emailData.config.resendApiKey);
      if (emailData.config.senderEmail) setSenderEmail(emailData.config.senderEmail);
      if (emailData.config.senderName) setSenderName(emailData.config.senderName);
      if (emailData.config.smtpHost) setSmtpHost(emailData.config.smtpHost);
      if (emailData.config.smtpPort) setSmtpPort(emailData.config.smtpPort);
      if (emailData.config.smtpUser) setSmtpUser(emailData.config.smtpUser);
    }
  }, [emailData]);

  // Escuta evento de Resend Conectado via popup
  useEffect(() => {
    const handleResendUpdated = (event: any) => {
      const config = event.detail;
      if (config) {
        if (config.resendApiKey) setResendApiKey(config.resendApiKey);
        if (config.senderEmail) setSenderEmail(config.senderEmail);
        if (config.senderName) setSenderName(config.senderName);
        setProvider("resend");
      }
      queryClient.invalidateQueries({ queryKey: ["email-config"] });
    };

    window.addEventListener(RESEND_EVENT_NAME, handleResendUpdated);
    return () => window.removeEventListener(RESEND_EVENT_NAME, handleResendUpdated);
  }, [queryClient]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (data: Partial<EmailIntegrationConfig>) => saveEmailConfig({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Configurações de e-mail salvas com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["email-config"] });
        onOpenChange(false);
      } else {
        toast.error(res.error || "Erro ao salvar.");
      }
    },
  });

  // Validação direta da API Key
  const handleValidateKey = async () => {
    const key = resendApiKey.trim();
    if (!key) {
      toast.error("Informe a chave de API do Resend primeiro.");
      return;
    }
    setValidatingKey(true);
    try {
      const res = await verifyResendConnection({ data: { apiKey: key } });
      if (res.success) {
        toast.success(res.message || "Chave do Resend validada com sucesso!");
      } else {
        toast.error(res.error || "Chave inválida.");
      }
    } catch (e: any) {
      toast.error(`Erro ao validar chave: ${e.message}`);
    } finally {
      setValidatingKey(false);
    }
  };

  // Leitura do Clipboard
  const handlePasteKey = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (trimmed) {
          setResendApiKey(trimmed);
          toast.success("Chave colada da área de transferência!");
          return;
        }
      }
      toast.info("Cole sua chave usando Ctrl+V ou Cmd+V.");
    } catch {
      toast.info("Cole diretamente no campo.");
    }
  };

  // Test Email Mutation
  const handleTestEmail = async () => {
    const targetEmail = adminEmail || "contato@smhub.com.br";
    setTestingEmail(true);
    try {
      const res = await sendTransactionalEmail({
        data: {
          to: targetEmail,
          subject: "Teste de Envio — SM Hub Oficial",
          code: "761543",
          type: "verification",
          userName: senderName || "Administrador",
        },
      });

      if (res.success) {
        if (res.provider === "resend") {
          toast.success(`E-mail real enviado com sucesso para ${targetEmail} via Resend!`);
        } else {
          toast.info(`E-mail de teste processado (Modo Simulação). Código de teste: ${res.code}`);
        }
      } else {
        toast.error("Falha ao disparar e-mail de teste.");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate({
      provider,
      resendApiKey: resendApiKey.trim(),
      senderEmail: senderEmail.trim(),
      senderName: senderName.trim(),
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser.trim(),
      smtpPass: smtpPass.trim(),
    });
  };

  // Abre o assistente popup
  const handleOpenPopupConnect = () => {
    openResendConnectPopup({
      defaultEmail: adminEmail,
      onSuccess: (config) => {
        if (config.resendApiKey) setResendApiKey(config.resendApiKey);
        if (config.senderEmail) setSenderEmail(config.senderEmail);
        queryClient.invalidateQueries({ queryKey: ["email-config"] });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0a0a0c] border border-white/10 text-white p-6 sm:p-8 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/30">
              DISPAROS TRANSACIONAIS
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="size-3 text-emerald-400" /> Criptografia Ponta a Ponta
            </span>
          </div>

          <DialogTitle className="text-2xl font-black text-white">
            Conectar Envio de E-mails (Resend & SMTP)
          </DialogTitle>

          <DialogDescription className="text-xs text-gray-400">
            Configure seu provedor para enviar códigos de segurança, contratos, propostas e notificações direto para a caixa postal dos seus clientes.
          </DialogDescription>
        </DialogHeader>

        {/* Botão em Destaque: Assistente Popup com Login/Cadastro no Resend */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#ff5722]/15 via-[#ff3d00]/10 to-transparent border border-[#ff5722]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Zap className="size-3.5 text-[#ff5722]" /> Assistente de Conexão em Popup
              </span>
              <span className="text-[10px] uppercase font-bold bg-[#ff5722] text-black px-1.5 py-0.2 rounded-full">
                MAIS FÁCIL
              </span>
            </div>
            <p className="text-[11px] text-gray-300">
              Faça login ou crie sua conta no Resend em uma janela popup e retorne automaticamente com tudo conectado.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleOpenPopupConnect}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-xs shrink-0 shadow-md shadow-[#ff5722]/20 flex items-center gap-1.5"
          >
            <Sparkles className="size-3.5" />
            <span>Conectar via Popup</span>
            <ExternalLink className="size-3" />
          </Button>
        </div>

        <div className="space-y-5 mt-4">
          {/* Escolha do Provedor */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider("resend")}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                provider === "resend"
                  ? "bg-[#ff5722]/10 border-[#ff5722] text-white shadow-lg shadow-[#ff5722]/5"
                  : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles className={`size-5 ${provider === "resend" ? "text-[#ff5722]" : ""}`} />
              <div className="text-left">
                <p className="font-bold text-xs text-white">Resend API (Oficial)</p>
                <p className="text-[10px] text-gray-400">99.9% de entrega na caixa</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProvider("smtp")}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                provider === "smtp"
                  ? "bg-[#ff5722]/10 border-[#ff5722] text-white shadow-lg shadow-[#ff5722]/5"
                  : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <Server className={`size-5 ${provider === "smtp" ? "text-[#ff5722]" : ""}`} />
              <div className="text-left">
                <p className="font-bold text-xs text-white">Servidor SMTP Próprio</p>
                <p className="text-[10px] text-gray-400">Host, Porta, Usuário & Senha</p>
              </div>
            </button>
          </div>

          {/* Form Resend */}
          {provider === "resend" && (
            <div className="space-y-3.5 bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              {/* Botões rápidos de Login / Cadastro no Resend */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                <span className="text-[11px] font-semibold text-gray-400">Ações Rápidas no Resend:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openResendDirectLogin}
                    className="text-[11px] text-gray-300 hover:text-white hover:underline flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md"
                  >
                    Login <ExternalLink className="size-2.5 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={openResendDirectSignup}
                    className="text-[11px] text-[#ff5722] hover:underline font-semibold flex items-center gap-1 bg-[#ff5722]/10 px-2 py-1 rounded-md"
                  >
                    Criar Conta Grátis <ExternalLink className="size-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={openResendDirectApiKeys}
                    className="text-[11px] text-gray-300 hover:text-white hover:underline flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md"
                  >
                    API Keys <ExternalLink className="size-2.5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Resend API Key</Label>
                  <button
                    type="button"
                    onClick={handleValidateKey}
                    disabled={validatingKey || !resendApiKey}
                    className="text-[11px] text-[#ff5722] hover:underline flex items-center gap-1 disabled:opacity-40"
                  >
                    {validatingKey ? (
                      <>
                        <RefreshCw className="size-2.5 animate-spin" /> Validando...
                      </>
                    ) : (
                      "Testar Chave na API"
                    )}
                  </button>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                  <Input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder="re_123456789_abcdef..."
                    className="bg-black/60 border-white/10 text-xs font-mono text-white h-10 pl-10 pr-20"
                  />
                  <button
                    type="button"
                    onClick={handlePasteKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-[10px] font-semibold text-gray-300 flex items-center gap-1"
                  >
                    <ClipboardCheck className="size-2.5 text-[#ff5722]" /> Colar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">E-mail Remetente</Label>
                  <Input
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="onboarding@resend.dev ou seu@dominio.com"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                  <p className="text-[10px] text-gray-500">
                    Use <span className="font-mono text-gray-400">onboarding@resend.dev</span> para testar sem DNS.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Nome do Remetente</Label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="SM Hub"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                  <p className="text-[10px] text-gray-500">Nome de exibição nas caixas postais.</p>
                </div>
              </div>
            </div>
          )}

          {/* Form SMTP */}
          {provider === "smtp" && (
            <div className="space-y-3.5 bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-gray-300">Servidor SMTP (Host)</Label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.seudominio.com.br"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Porta</Label>
                  <Input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Usuário SMTP</Label>
                  <Input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="contato@seudominio.com.br"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Senha SMTP</Label>
                  <Input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="w-full sm:w-auto text-xs border-white/15 text-gray-300 hover:text-white h-11 rounded-xl"
            >
              {testingEmail ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                  Enviando Teste...
                </>
              ) : (
                <>
                  <Send className="size-3.5 mr-1.5 text-brand" />
                  Enviar E-mail de Teste
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-xs shadow-lg shadow-[#ff5722]/20"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
