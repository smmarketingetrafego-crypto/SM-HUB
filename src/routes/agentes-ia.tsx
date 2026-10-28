import { createFileRoute } from '@tanstack/react-router';
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { 
  Bot, Sparkles, MessageSquare, Plus, Settings2, Power, Brain, Zap, 
  Send, User, ArrowRight, Check, X, RefreshCw, Cpu, Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAgents, 
  toggleAgent, 
  saveAgent, 
  chatWithAgent, 
  type AIAgent, 
  type AgentMessage 
} from "@/lib/api-agentes.functions";
import { AIConnectModal } from "@/components/integrations/ai-connect-modal";
import { getIntegrations, type IntegrationsData } from "@/lib/api-integracoes.functions";

export const Route = createFileRoute("/agentes-ia")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Agentes IA & Automação Inteligente — SM Hub' },
      { property: 'og:description', content: 'Agentes de inteligência artificial autônomos para vendas, suporte e marketing.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Agentes IA & Automação Inteligente — SM Hub" },
      { name: "description", content: "Agentes de inteligência artificial autônomos para vendas, suporte e marketing." },
    ],
  }),
  component: AgentesPage,
});

function AgentesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAgentForChat, setSelectedAgentForChat] = useState<AIAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const { data: integrations = {} as IntegrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => getIntegrations(),
  });

  const [newAgentDraft, setNewAgentDraft] = useState({
    name: "",
    role: "Vendas",
    desc: "",
    model: "GPT-4o (Comercial)",
    systemPrompt: ""
  });

  // Query agents from DB
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => toggleAgent({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Agente ${res.agent.name} ${res.agent.active ? "ativado" : "desativado"} com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ['agents'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<AIAgent>) => saveAgent({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Agente salvo com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        setIsCreateOpen(false);
        setEditingAgent(null);
        setNewAgentDraft({
          name: "",
          role: "Vendas",
          desc: "",
          model: "GPT-4o (Comercial)",
          systemPrompt: ""
        });
      } else toast.error("Erro: " + res.error);
    }
  });

  const handleCreateAgent = () => {
    if (!newAgentDraft.name.trim()) { toast.error("Informe o nome do agente"); return; }
    saveMutation.mutate({
      name: newAgentDraft.name.trim(),
      role: newAgentDraft.role,
      desc: newAgentDraft.desc.trim() || `Assistente especialista em ${newAgentDraft.role}`,
      model: newAgentDraft.model,
      systemPrompt: newAgentDraft.systemPrompt.trim() || `Você é um agente especialista em ${newAgentDraft.role} na agência SM Hub.`
    });
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !selectedAgentForChat || isSendingChat) return;
    const msg = chatInput.trim();
    setChatInput("");
    setIsSendingChat(true);

    try {
      const res = await chatWithAgent({
        data: {
          agentId: selectedAgentForChat.id,
          userMessage: msg,
        }
      });

      if (res.success) {
        // update local active agent history
        setSelectedAgentForChat(prev => prev ? { ...prev, history: res.history } : null);
        queryClient.invalidateQueries({ queryKey: ['agents'] });
      } else {
        toast.error("Erro na resposta do agente: " + res.error);
      }
    } catch (e: any) {
      toast.error("Falha ao comunicar com IA: " + e.message);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      <TutorialBanner location="IA" />
      
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Agentes IA 
            <Badge className="bg-brand text-black font-bold uppercase text-[10px] tracking-widest border-0 shadow-[0_0_10px_rgba(201,162,39,0.3)]">
              PRO
            </Badge>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Inteligências autônomas integradas ao WhatsApp, triagem comercial e geração de copy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="bg-transparent border-white/10 text-white hover:bg-white/5 h-10 px-4 rounded-xl text-sm"
            onClick={() => setAiModalOpen(true)}
          >
            <Key className="mr-2 size-4 text-brand" /> Conectar APIs (Google, OpenAI, Claude)
          </Button>
          <Button 
            className="gradient-brand text-black font-bold shadow-[0_0_15px_rgba(201,162,39,0.3)] border-0 h-10 px-5 rounded-xl text-sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="mr-2 size-4" /> Criar Novo Agente
          </Button>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {agents.map((agent) => (
          <div 
            key={agent.id} 
            className={`rounded-2xl border p-6 transition-all relative overflow-hidden ${
              agent.active 
                ? 'bg-[#111] border-brand/30 shadow-[0_0_25px_rgba(201,162,39,0.06)]' 
                : 'bg-[#0a0a0a] border-white/5 opacity-75'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`size-12 rounded-xl flex items-center justify-center ${agent.active ? 'bg-brand/20 text-brand shadow-[0_0_15px_rgba(201,162,39,0.2)]' : 'bg-white/5 text-gray-500'}`}>
                  <Bot className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                  <Badge variant="outline" className="mt-1 bg-white/5 border-white/10 text-gray-300 text-xs font-medium">
                    {agent.role}
                  </Badge>
                </div>
              </div>

              {/* Toggle Button */}
              <button
                onClick={() => toggleMutation.mutate(agent.id)}
                className={`flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  agent.active 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' 
                    : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
                }`}
                title="Clique para ligar ou desligar este agente"
              >
                <Power className="size-3.5" />
                {agent.active ? 'LIGADO' : 'DESLIGADO'}
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-6 min-h-[40px] leading-relaxed">
              {agent.desc}
            </p>
            
            <div className="flex items-center justify-between border-t border-white/10 pt-5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <MessageSquare className="size-3 text-brand" /> Atendimentos
                  </span>
                  <span className="text-lg font-bold text-white font-mono mt-0.5">{agent.chats || 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <Cpu className="size-3 text-brand" /> Modelo
                  </span>
                  <span className="text-xs font-semibold text-white mt-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {agent.model}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAgentForChat(agent)}
                  className="border-brand/40 text-brand bg-brand/5 hover:bg-brand/15 text-xs h-9 rounded-xl font-medium"
                >
                  <MessageSquare className="mr-1.5 size-3.5" /> Testar no Chat
                </Button>
                <Button 
                  size="sm"
                  variant="ghost" 
                  onClick={() => setEditingAgent(agent)}
                  className="text-gray-400 hover:text-white hover:bg-white/5 text-xs h-9 rounded-xl"
                >
                  <Settings2 className="mr-1.5 size-3.5" /> Treinar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Banner */}
      <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/15 via-[#111] to-black p-8 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="text-brand size-6" /> Agentes de Automação Comercial
          </h2>
          <p className="text-gray-300 max-w-xl text-sm leading-relaxed">
            Seus agentes operam 24/7 conectados à base de dados <span className="text-white font-mono font-semibold">smhub_database.json</span> no Google Drive. Cada lead convertido dispara mensagens e cadastra receitas de forma autônoma.
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="shrink-0 relative z-10 gradient-brand text-black font-bold h-11 px-6 rounded-xl hover:brightness-110 shadow-[0_0_15px_rgba(201,162,39,0.3)]"
        >
          <Zap className="mr-2 size-4 text-black" /> Configurar Agente Customizado
        </Button>
        
        <div className="absolute -right-20 -bottom-20 opacity-10 pointer-events-none">
          <Bot className="w-64 h-64 text-brand" />
        </div>
      </div>

      {/* ── Chat Simulator Modal ── */}
      <Dialog open={Boolean(selectedAgentForChat)} onOpenChange={(v) => !v && setSelectedAgentForChat(null)}>
        <DialogContent className="bg-[#0e0e0e] border border-white/10 text-white sm:max-w-xl p-0 rounded-2xl overflow-hidden shadow-2xl">
          {selectedAgentForChat && (
            <div className="flex flex-col h-[520px]">
              {/* Header */}
              <div className="p-4 bg-[#141414] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center font-bold">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{selectedAgentForChat.name}</h3>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      {selectedAgentForChat.model} · Modo Teste Interativo
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-brand/30 text-brand bg-brand/10 text-xs">
                  {selectedAgentForChat.role}
                </Badge>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0a]">
                <div className="text-center my-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    Canal Ativo do Agente de IA
                  </span>
                </div>

                {(!selectedAgentForChat.history || selectedAgentForChat.history.length === 0) ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    Envie uma mensagem abaixo para interagir com o agente.
                  </div>
                ) : (
                  selectedAgentForChat.history.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser 
                            ? 'bg-brand text-black font-medium rounded-tr-none' 
                            : 'bg-[#181818] text-gray-200 border border-white/10 rounded-tl-none shadow-md'
                        }`}>
                          {!isUser && (
                            <div className="flex items-center gap-1 text-[10px] text-brand font-bold uppercase tracking-wider mb-1">
                              <Bot className="size-3" /> {selectedAgentForChat.name}
                            </div>
                          )}
                          <p className="whitespace-pre-line">{msg.text}</p>
                          <span className={`text-[9px] block text-right mt-1 ${isUser ? 'text-black/60' : 'text-gray-500'}`}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {isSendingChat && (
                  <div className="flex items-center gap-2 text-xs text-brand bg-brand/10 p-2.5 rounded-xl border border-brand/20 w-fit animate-pulse">
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>{selectedAgentForChat.name} está pensando...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-[#141414] border-t border-white/10 flex items-center gap-2">
                <Input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  placeholder={`Pergunte algo para ${selectedAgentForChat.name}...`}
                  className="bg-[#1e1e1e] border-white/10 text-white text-xs h-10 rounded-xl"
                  disabled={isSendingChat}
                />
                <Button 
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isSendingChat}
                  className="size-10 rounded-xl gradient-brand text-black shrink-0 hover:brightness-110"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Agent Dialog ── */}
      <Dialog open={isCreateOpen || Boolean(editingAgent)} onOpenChange={(v) => { if (!v) { setIsCreateOpen(false); setEditingAgent(null); } }}>
        <DialogContent className="bg-[#111] border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Bot className="size-5 text-brand" /> {editingAgent ? `Configurar: ${editingAgent.name}` : "Novo Agente IA"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 uppercase font-bold">Nome do Agente</Label>
              <Input 
                value={editingAgent ? editingAgent.name : newAgentDraft.name} 
                onChange={(e) => {
                  if (editingAgent) setEditingAgent({ ...editingAgent, name: e.target.value });
                  else setNewAgentDraft({ ...newAgentDraft, name: e.target.value });
                }}
                placeholder="Ex: Closer de Vendas WhatsApp" 
                className="bg-black border-white/10 text-white h-10 rounded-xl text-sm" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 uppercase font-bold">Função / Área</Label>
                <Select 
                  value={editingAgent ? editingAgent.role : newAgentDraft.role} 
                  onValueChange={(v) => {
                    if (editingAgent) setEditingAgent({ ...editingAgent, role: v });
                    else setNewAgentDraft({ ...newAgentDraft, role: v });
                  }}
                >
                  <SelectTrigger className="bg-black border-white/10 text-white h-10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    <SelectItem value="Vendas">Vendas / SDR</SelectItem>
                    <SelectItem value="Atendimento">Atendimento / Suporte</SelectItem>
                    <SelectItem value="Marketing">Marketing / Copy</SelectItem>
                    <SelectItem value="Financeiro">Financeiro / Cobrança</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 uppercase font-bold">Modelo LLM</Label>
                <Select 
                  value={editingAgent ? editingAgent.model : newAgentDraft.model} 
                  onValueChange={(v) => {
                    if (editingAgent) setEditingAgent({ ...editingAgent, model: v });
                    else setNewAgentDraft({ ...newAgentDraft, model: v });
                  }}
                >
                  <SelectTrigger className="bg-black border-white/10 text-white h-10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    <SelectItem value="GPT-4o (Comercial)">GPT-4o</SelectItem>
                    <SelectItem value="GPT-4o Mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="DeepSeek V3">DeepSeek V3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300 uppercase font-bold">Instrução Base (System Prompt)</Label>
              <Textarea 
                value={editingAgent ? editingAgent.systemPrompt : newAgentDraft.systemPrompt} 
                onChange={(e) => {
                  if (editingAgent) setEditingAgent({ ...editingAgent, systemPrompt: e.target.value });
                  else setNewAgentDraft({ ...newAgentDraft, systemPrompt: e.target.value });
                }}
                placeholder="Ex: Você é o assistente comercial da SM Hub. Seja cordial, tire dúvidas sobre orçamentos..."
                className="bg-black border-white/10 text-white min-h-[90px] rounded-xl text-xs leading-relaxed" 
              />
            </div>

            <Button 
              className="w-full gradient-brand text-black font-bold h-11 rounded-xl shadow-[0_0_15px_rgba(201,162,39,0.3)] mt-2" 
              onClick={() => {
                if (editingAgent) {
                  saveMutation.mutate(editingAgent);
                } else {
                  handleCreateAgent();
                }
              }}
            >
              <Check className="mr-2 size-4" /> Salvar Agente no Drive
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AIConnectModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen} 
        integrations={integrations} 
      />
    </div>
  );
}
