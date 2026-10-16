import { createFileRoute } from '@tanstack/react-router';
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { Search, MoreVertical, Phone, Video, Paperclip, Smile, Send, Check, CheckCheck, Sparkles, Zap, MessageSquare, Bot, QrCode, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWhatsAppMessages, sendWhatsAppMessage, type WhatsAppMessage } from "@/lib/api-automacoes.server";
import { getClients } from "@/lib/api-clientes.server";
import { WhatsAppConnectModal } from "@/components/integrations/whatsapp-connect-modal";
import { getIntegrations, type IntegrationsData } from "@/lib/api-integracoes.server";

export const Route = createFileRoute("/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp & Disparos — SM Hub" },
      { name: "description", content: "Atendimento multicanal e disparos automáticos no WhatsApp" },
    ],
  }),
  component: WhatsappPage,
});

function WhatsappPage() {
  const queryClient = useQueryClient();
  const [activeContactId, setActiveContactId] = useState<string>("c_1");
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const { data: integrations = {} as IntegrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => getIntegrations(),
  });

  const isConnected = integrations.whatsapp?.connected;

  const { data: messages = [] } = useQuery({
    queryKey: ['whatsapp-messages'],
    queryFn: () => getWhatsAppMessages(),
    refetchInterval: 5000,
  });

  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients(),
  });

  const baseContacts = [
    { id: "c_1", name: "Maria Silva", phone: "(11) 98765-4321", online: true },
    { id: "c_2", name: "João Pereira", phone: "(11) 97654-3210", online: false },
    { id: "c_3", name: "Empresa ABC (Suporte)", phone: "(11) 96543-2109", online: true },
    { id: "c_4", name: "Carlos Eduardo", phone: "(11) 95432-1098", online: false },
    { id: "c_5", name: "Ana Beatriz", phone: "(11) 94321-0987", online: false },
  ];

  // Merge registered clients with base contacts
  const allContacts = useMemo(() => {
    const list = [...baseContacts];
    (clientsData.clients || []).forEach((c: any) => {
      if (!list.some(x => x.name.toLowerCase() === c.name.toLowerCase())) {
        list.push({
          id: c.id,
          name: c.name,
          phone: c.phone || "(11) 99999-9999",
          online: true
        });
      }
    });
    return list;
  }, [clientsData.clients]);

  const sendMutation = useMutation({
    mutationFn: async (payload: { contactId: string; contactName: string; phone?: string; text: string; sender?: "me" | "automation" }) => 
      sendWhatsAppMessage({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
        setInputText("");
      } else toast.error("Erro ao enviar: " + res.error);
    }
  });

  const filteredContacts = useMemo(() => {
    return allContacts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  }, [allContacts, search]);

  const activeContact = allContacts.find(c => c.id === activeContactId) || allContacts[0];

  const currentMessages = useMemo(() => {
    return messages.filter(m => m.contactId === activeContact?.id || m.contactName === activeContact?.name);
  }, [messages, activeContact]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMutation.mutate({
      contactId: activeContact.id,
      contactName: activeContact.name,
      phone: activeContact.phone,
      text: inputText.trim(),
      sender: "me"
    });
  };

  const sendQuickTemplate = (text: string) => {
    sendMutation.mutate({
      contactId: activeContact.id,
      contactName: activeContact.name,
      phone: activeContact.phone,
      text,
      sender: "automation"
    });
    toast.success("Disparo automático enviado!");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] pb-4">
      <TutorialBanner location="WhatsApp" />
      
      <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden bg-[#0a0a0a] flex mt-4 shadow-2xl min-h-[500px]">
        {/* Sidebar */}
        <div className="w-80 md:w-96 border-r border-white/10 bg-[#111111] flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#151515]">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setConnectModalOpen(true)}
                className="size-10 rounded-xl bg-brand flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(201,162,39,0.3)] cursor-pointer hover:scale-105 transition-transform"
                title="Configurar Aparelho WhatsApp"
              >
                SM
              </div>
              <div className="cursor-pointer" onClick={() => setConnectModalOpen(true)}>
                <span className="text-white font-semibold block leading-tight flex items-center gap-1.5">
                  WhatsApp Web Pro
                  <QrCode className="size-3 text-brand" />
                </span>
                {isConnected ? (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 hover:underline">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
                    {integrations.whatsapp?.phone || "Conectado via QR Code"}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 hover:underline">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" /> 
                    Desconectado · Parear Aparelho
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConnectModalOpen(true)}
              className="text-xs h-8 border-brand/30 text-brand bg-brand/5 hover:bg-brand/15 rounded-lg px-2.5"
            >
              <QrCode className="size-3.5 mr-1" /> Parear
            </Button>
          </div>

          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa ou cliente..." 
                className="pl-9 h-10 bg-black/40 border-white/10 text-white rounded-xl text-sm placeholder:text-gray-500" 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-none">
            {filteredContacts.map((c) => {
              const contactMsgs = messages.filter(m => m.contactId === c.id || m.contactName === c.name);
              const lastMsg = contactMsgs[contactMsgs.length - 1];
              const isSelected = c.id === activeContact?.id;

              return (
                <div 
                  key={c.id} 
                  onClick={() => setActiveContactId(c.id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 ${isSelected ? 'bg-brand/10 border-r-2 border-r-brand' : ''}`}
                >
                  <div className="relative">
                    <div className="size-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-base">
                      {c.name.charAt(0)}
                    </div>
                    {c.online && <div className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-[#111]"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className={`font-semibold truncate text-sm ${isSelected ? 'text-brand' : 'text-white'}`}>{c.name}</h4>
                      <span className="text-[11px] text-gray-500">{lastMsg?.timestamp || "Hoje"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-400 truncate">
                        {lastMsg?.isAutomation ? "🤖 Disparo: " : ""}{lastMsg?.text || "Nenhuma mensagem recente"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#070707] relative overflow-hidden">
          {/* Header */}
          <div className="h-16 border-b border-white/10 bg-[#111111] flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold">
                {activeContact?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-bold text-base">{activeContact?.name}</h3>
                <p className="text-xs text-gray-400 font-mono">{activeContact?.phone}</p>
              </div>
            </div>
            
            {/* Quick automation presets */}
            <div className="hidden lg:flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendQuickTemplate(`Olá ${activeContact.name}! Seu contrato foi gerado e está pronto para assinatura digital: https://smhub.com.br/c/${Date.now()}`)}
                className="h-8 text-xs border-brand/30 text-brand bg-brand/5 hover:bg-brand/15 rounded-lg"
              >
                <Bot className="size-3 mr-1" /> Disparo Contrato
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendQuickTemplate(`Olá ${activeContact.name}! Segue o link Pix para confirmação da sua proposta comercial. Qualquer dúvida estou à disposição!`)}
                className="h-8 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 rounded-lg"
              >
                <Zap className="size-3 mr-1" /> Disparo Cobrança Pix
              </Button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: 'radial-gradient(circle at center, #111 0%, transparent 100%)' }}>
            <div className="flex justify-center mb-6">
              <span className="bg-[#141414] text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10">
                Histórico Seguro de Mensagens & Automações
              </span>
            </div>

            {currentMessages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="size-12 text-gray-600 mb-3" />
                <p className="text-white font-semibold">Inicie a conversa com {activeContact?.name}</p>
                <p className="text-gray-400 text-xs mt-1">Você pode digitar uma mensagem ou clicar nos botões de disparo rápido acima.</p>
              </div>
            ) : (
              currentMessages.map((msg) => {
                const isMe = msg.sender === "me" || msg.sender === "automation";
                return (
                  <div key={msg.id} className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-md p-3.5 rounded-2xl text-sm relative ${
                      msg.isAutomation 
                        ? 'bg-brand/20 text-brand-100 rounded-tr-sm border border-brand/40 shadow-[0_0_15px_rgba(201,162,39,0.15)]'
                        : isMe 
                          ? 'bg-brand text-black font-medium rounded-tr-sm' 
                          : 'bg-[#181818] text-gray-200 rounded-tl-sm border border-white/10'
                    }`}>
                      {msg.isAutomation && (
                        <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-brand mb-1">
                          <Bot className="size-3" /> Disparo Automático (Gatilho)
                        </div>
                      )}
                      {msg.text}
                      <div className={`text-[10px] text-right mt-1.5 flex items-center justify-end gap-1 ${isMe && !msg.isAutomation ? 'text-black/70' : 'text-gray-400'}`}>
                        {msg.timestamp} 
                        {isMe && <CheckCheck className="size-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#111111] border-t border-white/10 flex items-center gap-3 shrink-0">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0"><Smile className="size-5" /></Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white shrink-0"><Paperclip className="size-5" /></Button>
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={`Mensagem para ${activeContact?.name}...`} 
              className="flex-1 bg-[#1a1a1a] border-white/10 h-12 rounded-xl text-white px-4 placeholder:text-gray-500 focus-visible:ring-brand" 
            />
            <Button 
              onClick={handleSend}
              disabled={!inputText.trim() || sendMutation.isPending}
              className="size-12 rounded-xl gradient-brand hover:brightness-110 text-black font-bold shrink-0 shadow-[0_0_15px_rgba(201,162,39,0.3)]"
            >
              <Send className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      <WhatsAppConnectModal 
        open={connectModalOpen} 
        onOpenChange={setConnectModalOpen} 
        connection={integrations.whatsapp} 
      />
    </div>
  );
}
