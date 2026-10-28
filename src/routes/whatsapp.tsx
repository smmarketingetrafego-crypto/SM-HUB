import { createFileRoute } from '@tanstack/react-router';
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { Search, Phone, Video, Paperclip, Smile, Send, CheckCheck, Bot, Zap, MessageSquare, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWhatsAppMessages, sendWhatsAppMessage, type WhatsAppMessage } from "@/lib/api-automacoes.functions";
import { getClients } from "@/lib/api-clientes.functions";
import { WhatsAppConnectModal } from "@/components/integrations/whatsapp-connect-modal";
import { getIntegrations, type IntegrationsData } from "@/lib/api-integracoes.functions";

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
          online: true,
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
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              WhatsApp
              {isConnected ? (
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Online
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Não conectado
                </span>
              )}
            </h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setConnectModalOpen(true)}
              className="text-xs h-8 border-brand/30 text-brand bg-brand/5 hover:bg-brand/15 rounded-lg"
            >
              <QrCode className="size-3.5 mr-1" /> {isConnected ? "Aparelho" : "Conectar"}
            </Button>
          </div>

          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa ou cliente..." 
                className="pl-9 bg-[#1a1a1a] border-white/10 h-9 rounded-xl text-xs text-white placeholder:text-gray-500" 
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredContacts.map((c) => {
              const active = c.id === activeContactId;
              const lastMsg = messages.filter(m => m.contactId === c.id || m.contactName === c.name).slice(-1)[0];
              return (
                <div 
                  key={c.id} 
                  onClick={() => setActiveContactId(c.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${active ? 'bg-white/5 border-l-2 border-brand' : 'hover:bg-white/[0.02]'}`}
                >
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-full bg-gradient-to-tr from-brand/20 to-brand/5 border border-brand/30 text-brand flex items-center justify-center font-bold text-sm">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    {c.online && (
                      <span className="size-3 rounded-full bg-emerald-500 border-2 border-[#111111] absolute bottom-0 right-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white truncate">{c.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{lastMsg?.timestamp || "Hoje"}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {lastMsg ? (lastMsg.sender === "me" ? `Você: ${lastMsg.text}` : lastMsg.text) : c.phone}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col bg-[#0d0d0d] relative">
          {/* Top Contact Bar */}
          <div className="p-4 bg-[#111111] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold text-sm">
                {activeContact?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {activeContact?.name}
                  {activeContact?.online && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />}
                </h3>
                <span className="text-[11px] text-gray-400 font-mono">{activeContact?.phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white"><Phone className="size-4" /></Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white"><Video className="size-4" /></Button>
            </div>
          </div>

          {/* Quick Automations Banner */}
          <div className="bg-[#141414] border-b border-white/5 p-2 px-4 flex items-center justify-between text-xs overflow-x-auto gap-2">
            <span className="text-gray-400 shrink-0 font-semibold">Disparos Rápidos:</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendQuickTemplate(`Olá ${activeContact.name}! Seu contrato foi gerado e está pronto para assinatura digital: http://localhost:8080/propostas`)}
                className="h-8 text-xs border-brand/30 text-brand bg-brand/5 hover:bg-brand/15 rounded-lg shrink-0"
              >
                <Bot className="size-3 mr-1" /> Disparo Contrato
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendQuickTemplate(`Olá ${activeContact.name}! Segue o link Pix para confirmação da sua proposta comercial. Qualquer dúvida estou à disposição!`)}
                className="h-8 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15 rounded-lg shrink-0"
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
