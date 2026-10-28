// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  openResendDirectLogin,
  openResendDirectSignup,
  openResendDirectApiKeys,
  notifyResendSuccess,
} from "@/lib/resend-connect";
import {
  verifyResendConnection,
  saveEmailConfig,
  getEmailConfig,
  sendTransactionalEmail,
} from "@/lib/api-email.functions";
import {
  Sparkles,
  KeyRound,
  ExternalLink,
  ClipboardCheck,
  CheckCircle2,
  Mail,
  ShieldCheck,
  RefreshCw,
  Send,
  ArrowRight,
  HelpCircle,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/conectar-resend")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Conectar Resend — SM Hub' },
      { property: 'og:description', content: 'Assistente rápido para conectar o envio de e-mails via Resend ao SM Hub.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Conectar Resend — SM Hub" },
      { name: "description", content: "Assistente rápido para conectar o envio de e-mails via Resend ao SM Hub." },
    ],
  }),
  component: ConectarResendPage,
});

function ConectarResendPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("onboarding@resend.dev");
  const [senderName, setSenderName] = useState("SM Hub");
  const [isPopup, setIsPopup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [connectedSuccess, setConnectedSuccess] = useState(false);
  const [verifiedDomains, setVerifiedDomains] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isPop = params.get("popup") === "true" || !!window.opener || window.name === "SMHUB_RESEND_CONNECT_POPUP";
      setIsPopup(isPop);

      // Carrega config existente
      getEmailConfig()
        .then((res) => {
          if (res?.config?.resendApiKey) {
            setApiKey(res.config.resendApiKey);
          }
          if (res?.config?.senderEmail) {
            setSenderEmail(res.config.senderEmail);
          }
          if (res?.config?.senderName) {
            setSenderName(res.config.senderName);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Leitura da área de transferência
  const handlePasteClipboard = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = text.trim();
        if (trimmed) {
          setApiKey(trimmed);
          if (trimmed.startsWith("re_")) {
            toast.success("Chave do Resend colada da área de transferência!");
          } else {
            toast.info("Texto colado. Lembre-se que chaves do Resend começam com 're_'.");
          }
          return;
        }
      }
      toast.info("Não foi possível ler da área de transferência. Cole usando Ctrl+V ou Cmd+V.");
    } catch {
      toast.info("Acesso à área de transferência restrito pelo navegador. Cole diretamente no campo.");
    }
  };

  // Teste e Conexão Oficial
  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const key = apiKey.trim();

    if (!key) {
      toast.error("Por favor, informe a Chave de API do Resend.");
      return;
    }

    if (!key.startsWith("re_")) {
      toast.error("Formato inválido. A chave do Resend deve começar com 're_'. Exemplo: re_123456789_abcdef");
      return;
    }

    setVerifying(true);

    try {
      // 1. Testa a chave na API do Resend
      const verifyRes = await verifyResendConnection({ data: { apiKey: key } });

      if (!verifyRes.success) {
        toast.error(verifyRes.error || "Falha ao validar chave do Resend.");
        setVerifying(false);
        return;
      }

      // 2. Salva a configuração no banco de dados do SM Hub
      const saveRes = await saveEmailConfig({
        data: {
          provider: "resend",
          resendApiKey: key,
          senderEmail: senderEmail.trim() || "onboarding@resend.dev",
          senderName: senderName.trim() || "SM Hub",
          connected: true,
        },
      });

      if (!saveRes.success) {
        toast.error(saveRes.error || "Erro ao salvar configuração no sistema.");
        setVerifying(false);
        return;
      }

      if (verifyRes.domains && verifyRes.domains.length > 0) {
        setVerifiedDomains(verifyRes.domains.map((d: any) => d.name));
      }

      setConnectedSuccess(true);
      toast.success("⚡ Resend conectado com sucesso ao SM Hub!");

      // 3. Notifica a janela principal e fecha o popup
      notifyResendSuccess(saveRes.config || { provider: "resend", connected: true, resendApiKey: key });

      if (!isPopup) {
        setTimeout(() => {
          navigate({ to: "/configuracoes" });
        }, 1500);
      }
    } catch (err: any) {
      toast.error(`Erro ao conectar: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  // Disparo de teste
  const handleTestEmail = async () => {
    if (!apiKey.trim()) {
      toast.error("Informe e salve sua API Key primeiro.");
      return;
    }
    setTestingEmail(true);
    try {
      const res = await sendTransactionalEmail({
        data: {
          to: "contato@smhub.com.br",
          subject: "Teste de Conexão Resend — SM Hub",
          code: "829471",
          type: "verification",
          userName: "Administrador SM Hub",
        },
      });

      if (res.success && res.provider === "resend") {
        toast.success("E-mail real de teste disparado via Resend com sucesso!");
      } else {
        toast.info(`E-mail registrado no sistema. Código de verificação: ${res.code}`);
      }
    } catch (e: any) {
      toast.error(`Erro no disparo de teste: ${e.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-[#ff5722]/30">
      {/* Top Banner de Popup */}
      <div className="max-w-2xl w-full mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-[#ff5722] to-[#ff3d00] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#ff5722]/20">
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-white tracking-tight">SM HUB</span>
                <span className="text-gray-500 text-xs">✕</span>
                <span className="font-bold text-xs text-white bg-white/10 px-2 py-0.5 rounded-full">Resend</span>
              </div>
              <p className="text-[11px] text-gray-400">Assistente de Conexão Oficial de E-mails</p>
            </div>
          </div>

          {isPopup && (
            <button
              type="button"
              onClick={() => window.close()}
              className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              title="Fechar Popup"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Celebratory Screen if Connected */}
        {connectedSuccess ? (
          <div className="bg-[#0e0e12] border border-emerald-500/30 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="size-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-in zoom-in-75">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CONEXÃO ATIVA & VERIFICADA
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Resend Conectado com Sucesso!</h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                Todos os e-mails transacionais (códigos de segurança, propostas, contratos e recibos) agora serão disparados pela infraestrutura do Resend com máxima entregabilidade.
              </p>
            </div>

            {verifiedDomains.length > 0 && (
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 max-w-sm mx-auto text-left">
                <p className="text-[11px] font-semibold text-gray-400 mb-1">Domínios detectados no Resend:</p>
                <div className="flex flex-wrap gap-1.5">
                  {verifiedDomains.map((d) => (
                    <span key={d} className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-gray-400 animate-pulse">
                {isPopup ? "Retornando ao SM HUB automaticamente em instantes..." : "Redirecionando para as Configurações..."}
              </p>
            </div>
          </div>
        ) : (
          /* Guided Flow Card */
          <div className="space-y-6">
            <div className="bg-[#0e0e12] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Zap className="size-5 text-[#ff5722]" /> Conectar Resend em Poucos Cliques
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  Siga os passos abaixo. Você pode abrir o Resend em um popup para fazer login ou criar sua conta grátis, gerar a chave e colar aqui.
                </p>
              </div>

              {/* PASSO 1: Acesso ao Resend */}
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-[#ff5722]/20 text-[#ff5722] text-xs font-black flex items-center justify-center border border-[#ff5722]/30">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-white">Login ou Cadastro no Resend</h3>
                </div>
                <p className="text-xs text-gray-400 pl-8 leading-relaxed">
                  Não precisa sair desta tela. Clique no botão correspondente para abrir o Resend em uma janela segura:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openResendDirectLogin}
                    className="h-11 rounded-xl border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Fazer Login no Resend</span>
                    <ExternalLink className="size-3.5 text-gray-400" />
                  </Button>

                  <Button
                    type="button"
                    onClick={openResendDirectSignup}
                    className="h-11 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#ff5722]/20"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Criar Conta Grátis (3.000 emails/mês)</span>
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* PASSO 2: Obter Chave de API */}
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-[#ff5722]/20 text-[#ff5722] text-xs font-black flex items-center justify-center border border-[#ff5722]/30">
                      2
                    </div>
                    <h3 className="text-sm font-bold text-white">Chave de API do Resend (API Key)</h3>
                  </div>

                  <button
                    type="button"
                    onClick={openResendDirectApiKeys}
                    className="text-xs text-[#ff5722] hover:underline font-semibold flex items-center gap-1"
                  >
                    Abrir Minhas Chaves <ExternalLink className="size-3" />
                  </button>
                </div>

                <div className="pl-8 space-y-2">
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="re_123456789_abcdef..."
                      className="h-11 pl-10 pr-28 rounded-xl bg-black/60 border-white/10 text-xs font-mono text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-[#ff5722]"
                    />
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-gray-200 flex items-center gap-1 transition-colors"
                      title="Colar da área de transferência"
                    >
                      <ClipboardCheck className="size-3 text-[#ff5722]" /> Colar
                    </button>
                  </div>

                  {apiKey && (
                    <div className="flex items-center gap-2 pt-0.5">
                      {apiKey.startsWith("re_") ? (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="size-3" /> Formato de chave válido (re_...)
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400">
                          Aviso: As chaves do Resend normalmente começam com "re_"
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* PASSO 3: Remetente Padrão */}
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-[#ff5722]/20 text-[#ff5722] text-xs font-black flex items-center justify-center border border-[#ff5722]/30">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-white">Configuração do Remetente</h3>
                </div>

                <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">E-mail Remetente</Label>
                    <Input
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="onboarding@resend.dev"
                      className="h-10 rounded-xl bg-black/60 border-white/10 text-xs text-white"
                    />
                    <p className="text-[10px] text-gray-500">
                      Use <span className="font-mono text-gray-300">onboarding@resend.dev</span> para testar agora sem configurar DNS.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-300">Nome de Exibição</Label>
                    <Input
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="SM Hub"
                      className="h-10 rounded-xl bg-black/60 border-white/10 text-xs text-white"
                    />
                    <p className="text-[10px] text-gray-500">Nome que aparece para os seus clientes.</p>
                  </div>
                </div>
              </div>

              {/* Botão de Validação e Ativação */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testingEmail || !apiKey}
                  className="w-full sm:w-auto h-12 px-4 rounded-xl border-white/15 text-xs text-gray-300 hover:text-white"
                >
                  {testingEmail ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin mr-1.5" />
                      Disparando Teste...
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5 mr-1.5 text-[#ff5722]" />
                      Enviar E-mail de Teste
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleConnect}
                  disabled={verifying || !apiKey}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-xs shadow-xl shadow-[#ff5722]/25 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Validando Conexão...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      <span>Validar e Conectar ao SM HUB</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Informações adicionais & Segurança */}
            <div className="flex items-center justify-center gap-6 text-[11px] text-gray-500 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-400" /> Chaves Criptografadas
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-[#ff5722]" /> 99.9% de Entregabilidade
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-blue-400" /> Retorno Automático ao Sistema
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer simples */}
      <footer className="text-center py-4 text-[11px] text-gray-600">
        SM HUB © {new Date().getFullYear()} • Plataforma de Gestão Integrada
      </footer>
    </div>
  );
}
