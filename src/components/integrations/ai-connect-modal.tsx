import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Sparkles, Check, ShieldCheck, RefreshCw, Zap
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  saveIntegration, 
  disconnectIntegration, 
  type IntegrationsData 
} from "@/lib/api-integracoes.functions";

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
  const [googleEmail, setGoogleEmail] = useState(integrations?.google?.accountEmail || "smmarketingetrafego@gmail.com");
  const [openaiEmail, setOpenaiEmail] = useState(integrations?.openai?.accountEmail || "");
  const [claudeEmail, setClaudeEmail] = useState(integrations?.claude?.accountEmail || "");
  const [deepseekEmail, setDeepseekEmail] = useState(integrations?.deepseek?.accountEmail || "");

  // Advanced developer inputs
  const [openaiKey, setOpenaiKey] = useState(integrations?.openai?.apiKey || "");
  const [claudeKey, setClaudeKey] = useState(integrations?.claude?.apiKey || "");
  const [deepseekKey, setDeepseekKey] = useState(integrations?.deepseek?.apiKey || "");

  const saveMutation = useMutation({
    mutationFn: async (payload: { service: string; data: any }) => saveIntegration({ data: payload }),
    onSuccess: (res, vars) => {
      toast.success(`Integração com ${vars.service.toUpperCase()} conectada!`);
      if (typeof window !== 'undefined') {
        try {
          const current = JSON.parse(localStorage.getItem('smhub_integrations') || '{}');
          current[vars.service] = {
            ...(current[vars.service] || {}),
            ...vars.data,
            connected: true,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem('smhub_integrations', JSON.stringify(current));
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['integrations-data'] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['external-status'] });
      queryClient.invalidateQueries({ queryKey: ['drive-setup'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setLoadingProvider(null);
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (service: string) => disconnectIntegration({ data: service }),
    onSuccess: (res, service) => {
      toast.info(`Integração com ${service.toUpperCase()} desconectada.`);
      if (typeof window !== 'undefined') {
        try {
          const current = JSON.parse(localStorage.getItem('smhub_integrations') || '{}');
          if (current[service]) {
            current[service] = { connected: false };
            localStorage.setItem('smhub_integrations', JSON.stringify(current));
          }
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['integrations-data'] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['external-status'] });
      queryClient.invalidateQueries({ queryKey: ['drive-setup'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setLoadingProvider(null);
    }
  });

  const handleConnectGoogleOneClick = () => {
    const emailToUse = googleEmail.trim() || "smmarketingetrafego@gmail.com";
    setLoadingProvider("google");
    setTimeout(() => {
      saveMutation.mutate({
        service: "google",
        data: {
          authMethod: "google",
          accountEmail: emailToUse,
          accountName: emailToUse.split("@")[0] || "Conta Google Conectada",
          planName: "Google Workspace & Drive",
        }
      });
    }, 400);
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
    }, 600);
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
    }, 600);
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
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f0f] border border-white/10 text-white sm:max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#171717] to-[#111111] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Sparkles className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Conectar Provedores de IA
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Vincule seus modelos favoritos para alimentar os agentes de conteúdo e suporte.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
            <TabsList className="grid grid-cols-2 bg-[#171717] p-1 rounded-xl border border-white/5 mb-6">
              <TabsTrigger value="simple" className="data-[state=active]:bg-[#242424] data-[state=active]:text-white text-xs font-semibold rounded-lg py-2">
                <Zap className="size-3.5 mr-1.5" /> Conexão Rápida
              </TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-[#242424] data-[state=active]:text-white text-xs font-semibold rounded-lg py-2">
                <ShieldCheck className="size-3.5 mr-1.5" /> Chaves de API (Avançado)
              </TabsTrigger>
            </TabsList>

            {/* ── Modo Rápido ── */}
            <TabsContent value="simple" className="space-y-4 focus-visible:outline-none">
              {/* Google Drive / Gemini */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base shrink-0">
                    G
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Google Workspace & Drive
                      {integrations?.google?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Ativo
                        </span>
                      )}
                    </h4>
                    {!integrations?.google?.connected ? (
                      <Input 
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        placeholder="E-mail da sua conta Google (ex: smmarketingetrafego@gmail.com)"
                        className="bg-black border-white/10 text-white text-xs h-8 mt-2 rounded-lg"
                      />
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Sincronização de arquivos e banco de dados via Google Drive.
                      </p>
                    )}
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
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingProvider === "google" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                    Conectar Conta Google
                  </Button>
                )}
              </div>

              {/* OpenAI / ChatGPT */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                    AI
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      OpenAI (GPT-4o)
                      {integrations?.openai?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Conectado
                        </span>
                      )}
                    </h4>
                    {!integrations?.openai?.connected && (
                      <Input 
                        value={openaiEmail}
                        onChange={(e) => setOpenaiEmail(e.target.value)}
                        placeholder="E-mail da sua conta ChatGPT"
                        className="bg-black border-white/10 text-white text-xs h-8 mt-2 rounded-lg"
                      />
                    )}
                  </div>
                </div>

                {integrations?.openai?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("openai")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectOpenAISimple}
                    disabled={loadingProvider === "openai"}
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingProvider === "openai" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                    Ativar OpenAI
                  </Button>
                )}
              </div>

              {/* Anthropic Claude */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                    C
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Anthropic Claude 3.5
                      {integrations?.claude?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Conectado
                        </span>
                      )}
                    </h4>
                    {!integrations?.claude?.connected && (
                      <Input 
                        value={claudeEmail}
                        onChange={(e) => setClaudeEmail(e.target.value)}
                        placeholder="E-mail da sua conta Claude"
                        className="bg-black border-white/10 text-white text-xs h-8 mt-2 rounded-lg"
                      />
                    )}
                  </div>
                </div>

                {integrations?.claude?.connected ? (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => disconnectMutation.mutate("claude")}
                    className="text-xs text-red-400 hover:bg-red-500/10 h-9 rounded-xl shrink-0"
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={handleConnectClaudeSimple}
                    disabled={loadingProvider === "claude"}
                    className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0"
                  >
                    {loadingProvider === "claude" ? <RefreshCw className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                    Ativar Claude
                  </Button>
                )}
              </div>

              {/* DeepSeek */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base shrink-0">
                    D
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      DeepSeek V3 / R1
                      {integrations?.deepseek?.connected && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <Check className="size-3" /> Conectado
                        </span>
                      )}
                    </h4>
                    {!integrations?.deepseek?.connected && (
                      <Input 
                        value={deepseekEmail}
                        onChange={(e) => setDeepseekEmail(e.target.value)}
                        placeholder="E-mail da sua conta DeepSeek"
                        className="bg-black border-white/10 text-white text-xs h-8 mt-2 rounded-lg"
                      />
                    )}
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

            {/* ── Modo Chaves Manuais ── */}
            <TabsContent value="advanced" className="space-y-4 focus-visible:outline-none">
              <div className="p-3 rounded-xl bg-brand/10 border border-brand/20 text-xs text-brand-100 flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand shrink-0" />
                <span>Insira chaves de desenvolvedor personalizadas (opcional).</span>
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
