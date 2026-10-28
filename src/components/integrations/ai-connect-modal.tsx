import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Sparkles, Check, ShieldCheck, RefreshCw, PowerOff, Key, ExternalLink, Bot
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  saveIntegration, 
  disconnectIntegration, 
  testAiKey,
  type IntegrationsData 
} from "@/lib/api-integracoes.functions";

interface AIConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrations?: IntegrationsData;
  initialProvider?: string;
}

export function AIConnectModal({ open, onOpenChange, integrations, initialProvider }: AIConnectModalProps) {
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveIntegration);
  const disconnectFn = useServerFn(disconnectIntegration);
  const testKeyFn = useServerFn(testAiKey);

  const [openaiKey, setOpenaiKey] = useState(integrations?.openai?.apiKey || "");
  const [deepseekKey, setDeepseekKey] = useState(integrations?.deepseek?.apiKey || "");
  const [claudeKey, setClaudeKey] = useState(integrations?.claude?.apiKey || "");

  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const isOpenaiConnected = Boolean(integrations?.openai?.connected && integrations?.openai?.apiKey);
  const isDeepseekConnected = Boolean(integrations?.deepseek?.connected && integrations?.deepseek?.apiKey);
  const isClaudeConnected = Boolean(integrations?.claude?.connected && integrations?.claude?.apiKey);

  // Test and Connect
  const handleTestAndConnect = async (provider: "openai" | "deepseek" | "claude", keyToTest: string, defaultModel: string) => {
    const trimmed = keyToTest.trim();
    if (!trimmed) {
      toast.error(`Informe a chave de API oficial para ${provider.toUpperCase()}.`);
      return;
    }

    setTestingProvider(provider);
    try {
      const result = await testKeyFn({
        data: {
          provider,
          apiKey: trimmed,
        }
      });

      if (!result.success) {
        toast.error(result.error || `Chave de API ${provider.toUpperCase()} inválida.`);
        return;
      }

      // Salva no banco de dados
      await saveFn({
        data: {
          service: provider,
          data: {
            apiKey: trimmed,
            defaultModel,
            authMethod: "apikey",
            connected: true,
          }
        }
      });

      if (typeof window !== "undefined") {
        try {
          const current = JSON.parse(localStorage.getItem("smhub_integrations") || "{}");
          current[provider] = {
            ...(current[provider] || {}),
            apiKey: trimmed,
            defaultModel,
            authMethod: "apikey",
            connected: true,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem("smhub_integrations", JSON.stringify(current));
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });

      toast.success(`Chave ${provider.toUpperCase()} validada e conectada com sucesso!`);
    } catch (err: any) {
      toast.error(err?.message || `Erro ao testar chave ${provider.toUpperCase()}.`);
    } finally {
      setTestingProvider(null);
    }
  };

  // Disconnect
  const handleDisconnect = async (provider: "openai" | "deepseek" | "claude") => {
    setTestingProvider(provider);
    try {
      await disconnectFn({ data: provider });
      if (typeof window !== "undefined") {
        try {
          const current = JSON.parse(localStorage.getItem("smhub_integrations") || "{}");
          if (current[provider]) {
            current[provider] = { connected: false, apiKey: "" };
            localStorage.setItem("smhub_integrations", JSON.stringify(current));
          }
        } catch {}
      }
      if (provider === "openai") setOpenaiKey("");
      if (provider === "deepseek") setDeepseekKey("");
      if (provider === "claude") setClaudeKey("");

      queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });

      toast.info(`Integração com ${provider.toUpperCase()} desconectada.`);
    } catch (err: any) {
      toast.error(err?.message || `Erro ao desconectar ${provider.toUpperCase()}.`);
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f11] border border-white/10 text-white sm:max-w-xl p-0 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#17171c] to-[#111114] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Conectar Provedores de IA Reais
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400 mt-0.5">
                Vincule suas chaves de API oficiais para alimentar os agentes de suporte, WhatsApp e propostas.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl text-xs text-purple-300 flex items-start gap-2.5">
            <ShieldCheck className="size-4 shrink-0 mt-0.5 text-purple-400" />
            <p className="leading-relaxed">
              As conexões são validadas diretamente nos servidores oficiais da <strong>OpenAI</strong>, <strong>DeepSeek</strong> e <strong>Anthropic</strong>. Nenhuma conexão fictícia é permitida.
            </p>
          </div>

          {/* 1. OpenAI */}
          <div className="p-4 rounded-2xl bg-[#141418] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">OpenAI (ChatGPT & GPT-4o)</h4>
                  <p className="text-[11px] text-gray-400">Usado para geração de contratos, automação e inteligência geral.</p>
                </div>
              </div>
              {isOpenaiConnected ? (
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Check className="size-3" /> Conectado
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-zinc-800 text-gray-400 px-2.5 py-0.5 rounded-full border border-white/5">
                  Desconectado
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-medium">OpenAI API Key (sk-...)</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                />
                {isOpenaiConnected ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDisconnect("openai")}
                    disabled={testingProvider === "openai"}
                    className="h-10 text-xs px-3 rounded-xl shrink-0"
                  >
                    <PowerOff className="size-3.5 mr-1" /> Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleTestAndConnect("openai", openaiKey, "gpt-4o")}
                    disabled={testingProvider === "openai" || !openaiKey.trim()}
                    className="h-10 text-xs px-4 rounded-xl bg-brand text-black font-bold hover:bg-brand/90 shrink-0"
                  >
                    {testingProvider === "openai" ? (
                      <RefreshCw className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Check className="size-3.5 mr-1" />
                    )}
                    Validar & Conectar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 2. DeepSeek */}
          <div className="p-4 rounded-2xl bg-[#141418] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                  D
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">DeepSeek (V3 / R1)</h4>
                  <p className="text-[11px] text-gray-400">Modelo ultra-rápido de baixo custo para atendimento de suporte.</p>
                </div>
              </div>
              {isDeepseekConnected ? (
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Check className="size-3" /> Conectado
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-zinc-800 text-gray-400 px-2.5 py-0.5 rounded-full border border-white/5">
                  Desconectado
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-medium">DeepSeek API Key (sk-...)</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                />
                {isDeepseekConnected ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDisconnect("deepseek")}
                    disabled={testingProvider === "deepseek"}
                    className="h-10 text-xs px-3 rounded-xl shrink-0"
                  >
                    <PowerOff className="size-3.5 mr-1" /> Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleTestAndConnect("deepseek", deepseekKey, "deepseek-chat")}
                    disabled={testingProvider === "deepseek" || !deepseekKey.trim()}
                    className="h-10 text-xs px-4 rounded-xl bg-brand text-black font-bold hover:bg-brand/90 shrink-0"
                  >
                    {testingProvider === "deepseek" ? (
                      <RefreshCw className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Check className="size-3.5 mr-1" />
                    )}
                    Validar & Conectar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Anthropic Claude */}
          <div className="p-4 rounded-2xl bg-[#141418] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Anthropic Claude 3.5 Sonnet</h4>
                  <p className="text-[11px] text-gray-400">Alta precisão na redação de propostas e análises de tráfego.</p>
                </div>
              </div>
              {isClaudeConnected ? (
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Check className="size-3" /> Conectado
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-zinc-800 text-gray-400 px-2.5 py-0.5 rounded-full border border-white/5">
                  Desconectado
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 font-medium">Anthropic API Key (sk-ant-...)</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                />
                {isClaudeConnected ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDisconnect("claude")}
                    disabled={testingProvider === "claude"}
                    className="h-10 text-xs px-3 rounded-xl shrink-0"
                  >
                    <PowerOff className="size-3.5 mr-1" /> Desconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleTestAndConnect("claude", claudeKey, "claude-3-5-sonnet-20241022")}
                    disabled={testingProvider === "claude" || !claudeKey.trim()}
                    className="h-10 text-xs px-4 rounded-xl bg-brand text-black font-bold hover:bg-brand/90 shrink-0"
                  >
                    {testingProvider === "claude" ? (
                      <RefreshCw className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Check className="size-3.5 mr-1" />
                    )}
                    Validar & Conectar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
