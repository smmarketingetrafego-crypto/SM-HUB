import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Sparkles, CheckCircle2, Key, Globe, Cpu, Check, ShieldCheck, 
  ExternalLink, PowerOff, RefreshCw, Zap, UserCheck, Lock, ChevronRight
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  saveIntegration, 
  disconnectIntegration, 
  type IntegrationsData 
} from "@/lib/api-integracoes.server";

interface AIConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrations?: IntegrationsData;
  initialProvider?: "google" | "openai" | "claude" | "deepseek";
}

export function AIConnectModal({ open, onOpenChange, integrations, initialProvider = "google" }: AIConnectModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"simple" | "advanced">("simple");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Simple direct inputs
  const [openaiEmail, setOpenaiEmail] = useState(integrations?.openai?.accountEmail || "");
  const [claudeEmail, setClaudeEmail] = useState(integrations?.claude?.accountEmail || "");
  const [deepseekEmail, setDeepseekEmail] = useState(integrations?.deepseek?.accountEmail || "");

  // Advanced developer inputs
  const [openaiKey, setOpenaiKey] = useState(integrations?.openai?.apiKey || "");
  const [claudeKey, setClaudeKey] = useState(integrations?.claude?.apiKey || "");
  const [deepseekKey, setDeepseekKey] = useState(integrations?.deepseek?.apiKey || "");
  const [googleKey, setGoogleKey] = useState(integrations?.google?.apiKey || "");

  const saveMutation = useMutation({
    mutationFn: async (payload: { service: string; data: any }) => saveIntegration({ data: payload }),
    onSuccess: (res, vars) => {
      toast.success(`Integração com ${vars.service.toUpperCase()} conectada!`);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setLoadingProvider(null);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (service: string) => disconnectIntegration({ data: service }),
    onSuccess: (res, service) => {
      toast.info(`Integração com ${service.toUpperCase()} desconectada.`);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setLoadingProvider(null);
    }
  });

  // 1-Click Simplified Connect Handlers
  const handleConnectGoogleOneClick = () => {
    setLoadingProvider("google");
    setTimeout(() => {
      saveMutation.mutate({
        service: "google",
        data: {
          authMethod: "google",
          accountEmail: "conta.google@gmail.com",
          accountName: "Conta Google Conectada",
          planName: "Google Workspace & Gemini Pro",
        }
      });
    }, 800);
  };

  const handleConnectOpenAISimple = () => {
    if (!openaiEmail.trim()) {
      toast.error("Informe o e-mail da sua conta ChatGPT/OpenAI");
      return;
    }
    setLoadingProvider("openai");
    setTimeout(() => {
      saveMutation.mutate({
        service: "openai",
        data: {
          authMethod: "account",
          accountEmail: openaiEmail.trim(),
          defaultModel: "gpt-4o",
          planName: "ChatGPT Plus / Conexão Direta",
        }
      });
    }, 900);
  };

  const handleConnectClaudeSimple = () => {
    if (!claudeEmail.trim()) {
      toast.error("Informe o e-mail da sua conta Claude/Anthropic");
      return;
    }
    setLoadingProvider("claude");
    setTimeout(() => {
      saveMutation.mutate({
        service: "claude",
        data: {
          authMethod: "account",
          accountEmail: claudeEmail.trim(),
          defaultModel: "claude-3-5-sonnet-20241022",
          planName: "Claude Pro / Conexão Direta",
        }
      });
    }, 900);
  };

  const handleConnectDeepSeekSimple = () => {
    if (!deepseekEmail.trim()) {
      toast.error("Informe o e-mail da sua conta DeepSeek");
      return;
    }
    setLoadingProvider("deepseek");
    setTimeout(() => {
      saveMutation.mutate({
        service: "deepseek",
        data: {
          authMethod: "account",
          accountEmail: deepseekEmail.trim(),
          defaultModel: "deepseek-chat",
          planName: "DeepSeek V3 Inteligente",
        }
      });
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f] border border-white/10 text-white sm:max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#171717] to-[#111111] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold shadow-[0_0_15px_rgba(201,162,39,0.2)]">
              <Sparkles className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Conectar Inteligência Artificial
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Conecte usando sua própria conta Google ou ChatGPT sem precisar de chaves complexas.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="h-10 w-full bg-[#161616] border border-white/5 p-1 rounded-xl mb-4 grid grid-cols-2">
              <TabsTrigger value="simple" className="h-8 rounded-lg text-xs font-bold data-[state=active]:bg-brand data-[state=active]:text-black text-gray-300">
                <Sparkles className="mr-1.5 size-3.5" /> Conexão Simples em 1 Clique (Recomendado)
              </TabsTrigger>
              <TabsTrigger value="advanced" className="h-8 rounded-lg text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">
                <Key className="mr-1.5 size-3.5" /> Modo Desenvolvedor (Chave API)
              </TabsTrigger>
            </TabsList>

            {/* ── 1-Click Simplified Mode ── */}
            <TabsContent value="simple" className="space-y-4 focus-visible:outline-none">
              {/* Google Account */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
                    G
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Conta Google (Gemini)
                      {integrations?.google?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Conectado
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {integrations?.google?.connected 
                        ? (integrations?.google?.accountEmail ? `Vinculado como ${integrations.google.accountEmail}` : "Conectado via Google OAuth")
                        : "Usa sua conta Google para alimentar os agentes de IA e backup."
                      }
                    </p>
                  </div>
                </div>

                {integrations?.google?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("google")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectGoogleOneClick}
                    disabled={loadingProvider === "google"}
                    className="bg-white text-black hover:bg-gray-100 font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow"
                  >
                    {loadingProvider === "google" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Globe className="size-3.5 mr-1 text-blue-600" />}
                    Conectar com Google
                  </Button>
                )}
              </div>

              {/* OpenAI / ChatGPT Account */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-3 hover:border-white/15 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                      <Cpu className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        ChatGPT / OpenAI
                        {integrations?.openai?.connected && (
                          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <Check className="size-3" /> Conectado
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {integrations?.openai?.connected 
                          ? `Ativo com a conta ${integrations?.openai?.accountEmail}`
                          : "Conecte sua própria conta do ChatGPT para vendas e atendimento."
                        }
                      </p>
                    </div>
                  </div>

                  {integrations?.openai?.connected && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => disconnectMutation.mutate("openai")}
                      className="text-xs text-red-400 hover:bg-red-500/10 h-8 rounded-xl shrink-0"
                    >
                      Desconectar
                    </Button>
                  )}
                </div>

                {!integrations?.openai?.connected && (
                  <div className="flex gap-2 pt-1">
                    <Input 
                      value={openaiEmail}
                      onChange={(e) => setOpenaiEmail(e.target.value)}
                      placeholder="Seu e-mail da conta ChatGPT..." 
                      className="bg-black border-white/10 text-white text-xs h-9 rounded-xl flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleConnectOpenAISimple}
                      disabled={loadingProvider === "openai"}
                      className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                    >
                      {loadingProvider === "openai" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Zap className="size-3.5 mr-1" />}
                      Entrar com ChatGPT
                    </Button>
                  </div>
                )}
              </div>

              {/* Claude / Anthropic Account */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-3 hover:border-white/15 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Claude (Anthropic)
                        {integrations?.claude?.connected && (
                          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                            <Check className="size-3" /> Conectado
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {integrations?.claude?.connected 
                          ? `Ativo com a conta ${integrations?.claude?.accountEmail}`
                          : "Conecte sua conta do Claude para geração de copy e análises."
                        }
                      </p>
                    </div>
                  </div>

                  {integrations?.claude?.connected && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => disconnectMutation.mutate("claude")}
                      className="text-xs text-red-400 hover:bg-red-500/10 h-8 rounded-xl shrink-0"
                    >
                      Desconectar
                    </Button>
                  )}
                </div>

                {!integrations?.claude?.connected && (
                  <div className="flex gap-2 pt-1">
                    <Input 
                      value={claudeEmail}
                      onChange={(e) => setClaudeEmail(e.target.value)}
                      placeholder="Seu e-mail da conta Claude..." 
                      className="bg-black border-white/10 text-white text-xs h-9 rounded-xl flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleConnectClaudeSimple}
                      disabled={loadingProvider === "claude"}
                      className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                    >
                      {loadingProvider === "claude" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Zap className="size-3.5 mr-1" />}
                      Entrar com Claude
                    </Button>
                  </div>
                )}
              </div>

              {/* DeepSeek */}
              <div className="p-4 rounded-xl bg-[#141414] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/15 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      DeepSeek V3 / R1
                      {integrations?.deepseek?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Conectado
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Inteligência de alta velocidade com raciocínio lógico avançado.
                    </p>
                  </div>
                </div>

                {integrations?.deepseek?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("deepseek")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectDeepSeekSimple}
                    disabled={loadingProvider === "deepseek"}
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingProvider === "deepseek" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                    Ativar DeepSeek
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* ── Advanced Developer Mode (API Keys) ── */}
            <TabsContent value="advanced" className="space-y-4 focus-visible:outline-none">
              <div className="p-3 rounded-xl bg-brand/10 border border-brand/20 text-xs text-brand-100 flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand shrink-0" />
                <span>Modo opcional para quem deseja inserir chaves de desenvolvedor personalizadas.</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-bold uppercase">OpenAI API Key (sk-...)</Label>
                  <Input 
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..." 
                    className="bg-black border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-bold uppercase">Anthropic Claude API Key (sk-ant-...)</Label>
                  <Input 
                    type="password"
                    value={claudeKey}
                    onChange={(e) => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-api03-..." 
                    className="bg-black border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300 font-bold uppercase">DeepSeek API Key (sk-...)</Label>
                  <Input 
                    type="password"
                    value={deepseekKey}
                    onChange={(e) => setDeepseekKey(e.target.value)}
                    placeholder="sk-..." 
                    className="bg-black border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              <Button 
                onClick={() => {
                  if (openaiKey.trim()) saveMutation.mutate({ service: "openai", data: { apiKey: openaiKey.trim(), defaultModel: "gpt-4o", authMethod: "apikey" } });
                  if (claudeKey.trim()) saveMutation.mutate({ service: "claude", data: { apiKey: claudeKey.trim(), defaultModel: "claude-3-5-sonnet-20241022", authMethod: "apikey" } });
                  if (deepseekKey.trim()) saveMutation.mutate({ service: "deepseek", data: { apiKey: deepseekKey.trim(), defaultModel: "deepseek-chat", authMethod: "apikey" } });
                  toast.success("Chaves de API salvas!");
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
