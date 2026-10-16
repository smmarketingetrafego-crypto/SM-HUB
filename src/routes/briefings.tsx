import { createFileRoute } from '@tanstack/react-router';
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  Plus,
  Search,
  MoreHorizontal,
  HelpCircle,
  Clock,
  Sparkles,
  MessageCircle,
  Share2,
  Trash2,
  Check,
  Send,
  Building2,
  Layers,
  ArrowRight
} from "lucide-react";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients } from "@/lib/api-clientes.server";
import {
  getBriefings,
  createBriefing,
  deleteBriefing,
  DEFAULT_BRIEFING_TEMPLATES,
  type BriefingRecord,
  type BriefingTemplate,
  type BriefingQuestion
} from "@/lib/api-briefings.server";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/briefings")({
  head: () => ({
    meta: [
      { title: "Briefings — SM Hub" },
      { name: "description", content: "Crie briefings em etapas, envie o link ao cliente e receba as respostas." },
      { property: "og:title", content: "Briefings — SM Hub" },
      { property: "og:description", content: "Alinhe escopo e expectativas com briefings estruturados." },
    ],
  }),
  component: BriefingsPage,
});

function BriefingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"briefings" | "templates">("briefings");
  const [query, setQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalBriefing, setViewModalBriefing] = useState<BriefingRecord | null>(null);

  // Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl-identidade-visual");
  const [briefingTitle, setBriefingTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const { data: briefingsData = { templates: DEFAULT_BRIEFING_TEMPLATES, briefings: [] }, isLoading } = useQuery({
    queryKey: ["briefings-data"],
    queryFn: () => getBriefings(),
  });

  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ["clients-data"],
    queryFn: () => getClients(),
  });

  const templates = briefingsData.templates || DEFAULT_BRIEFING_TEMPLATES;
  const briefings = briefingsData.briefings || [];
  const clients = clientsData.clients || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => createBriefing({ data }),
    onSuccess: (res) => {
      if (res.success && res.briefing) {
        toast.success("Briefing criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["briefings-data"] });
        setCreateModalOpen(false);

        // Copia o link público
        const fullLink = `${window.location.origin}/briefing/${res.briefing.id}`;
        navigator.clipboard.writeText(fullLink);
        toast.info("Link do briefing copiado para a área de transferência!");
      } else {
        toast.error("Erro: " + res.error);
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao criar briefing: " + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBriefing({ data: id }),
    onSuccess: () => {
      toast.success("Briefing removido.");
      queryClient.invalidateQueries({ queryKey: ["briefings-data"] });
    }
  });

  const handleOpenNewFromTemplate = (tpl: BriefingTemplate) => {
    setSelectedTemplateId(tpl.id);
    setBriefingTitle(tpl.title);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setCreateModalOpen(true);
  };

  const handleCreateBriefing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefingTitle.trim() || !clientName.trim()) {
      toast.error("Informe o título e o nome do cliente.");
      return;
    }

    const tpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];

    createMutation.mutate({
      title: briefingTitle,
      client: clientName,
      clientPhone,
      clientEmail,
      category: tpl.category,
      questions: tpl.questions,
    });
  };

  const handleCopyLink = (briefingId: string) => {
    const fullUrl = `${window.location.origin}/briefing/${briefingId}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link do briefing copiado!");
  };

  const handleWhatsAppShare = (b: BriefingRecord) => {
    const fullUrl = `${window.location.origin}/briefing/${b.id}`;
    const msg = `Olá, ${b.client}! Segue o link do nosso formulário de briefing para alinharmos todos os detalhes do seu projeto:\n\n🔗 ${fullUrl}\n\nAssim que você preencher, nossa equipe já recebe imediatamente. Obrigado!`;
    const phone = b.clientPhone ? b.clientPhone.replace(/\D/g, "") : "";
    const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  const filteredBriefings = briefings.filter((b) =>
    b.title.toLowerCase().includes(query.toLowerCase()) || b.client.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTemplates = templates.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <TutorialBanner location="Briefings" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Briefings Estruturados</h1>
            <Badge className="bg-brand/10 text-brand border-brand/20 font-bold text-xs">SM HUB</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Envie questionários online para seus clientes e receba todas as diretrizes antes de começar a criar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              const defaultTpl = templates[0];
              setSelectedTemplateId(defaultTpl.id);
              setBriefingTitle(defaultTpl.title);
              setCreateModalOpen(true);
            }}
            className="gradient-brand text-black font-semibold h-10 px-4 rounded-xl text-sm gap-2 shadow-lg shadow-brand/20"
          >
            <Plus className="size-4" /> Novo Briefing
          </Button>
        </div>
      </div>

      {/* Tabs de Controle */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <TabsList className="bg-[#111] border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="briefings" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-black text-xs font-semibold gap-2">
              <ClipboardList className="size-4" />
              Briefings dos Clientes ({briefings.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-lg data-[state=active]:bg-brand data-[state=active]:text-black text-xs font-semibold gap-2">
              <Layers className="size-4" />
              Templates de Questionários ({templates.length})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente ou título..."
              className="pl-9 h-9 bg-[#111] border-white/10 text-white rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Tab 1: Briefings dos Clientes */}
        <TabsContent value="briefings" className="space-y-4">
          {filteredBriefings.length === 0 ? (
            <div className="surface-panel p-12 text-center rounded-2xl border border-white/5 space-y-3">
              <div className="size-12 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center mx-auto">
                <ClipboardList className="size-6" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhum briefing cadastrado ainda</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Clique no botão "Novo Briefing" acima para gerar um questionário e enviar o link para seu cliente responder online.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBriefings.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#111318] border border-white/10 rounded-2xl p-5 hover:border-brand/40 transition-all flex flex-col justify-between group shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="text-[11px] font-medium text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
                        {b.category}
                      </span>
                      <Badge
                        className={`text-[10px] uppercase font-bold border-0 ${
                          b.status === "concluído"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : b.status === "em andamento"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {b.status}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-brand transition-colors line-clamp-1">
                      {b.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-brand shrink-0" />
                      Cliente: <strong className="text-gray-200">{b.client}</strong>
                    </p>

                    <div className="text-[11px] text-gray-500 mt-3 space-y-1">
                      <div>Criado em: {b.createdAt}</div>
                      {b.respondedAt && (
                        <div className="text-emerald-400 font-medium">Respondido em: {b.respondedAt}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewModalBriefing(b)}
                      className="flex-1 h-8 rounded-lg text-xs bg-white/5 border-white/10 text-white hover:border-brand/40 gap-1.5"
                    >
                      <Eye className="size-3.5 text-brand" />
                      {b.status === "concluído" ? "Ver Respostas" : "Visualizar"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(b.id)}
                      className="h-8 w-8 p-0 rounded-lg bg-white/5 border-white/10 text-white hover:border-brand/40"
                      title="Copiar Link"
                    >
                      <Copy className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWhatsAppShare(b)}
                      className="h-8 w-8 p-0 rounded-lg bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      title="Enviar no WhatsApp"
                    >
                      <MessageCircle className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(b.id)}
                      className="h-8 w-8 p-0 rounded-lg bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                      title="Excluir"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Templates Oficiais */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-[#111318] border border-white/10 rounded-2xl p-6 hover:border-brand/40 transition-all flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-brand bg-brand/10 border border-brand/20 px-2.5 py-0.5 rounded-full">
                      {tpl.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <HelpCircle className="size-3.5 text-gray-500" />
                      {tpl.questions.length} perguntas
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{tpl.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{tpl.description}</p>

                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1.5 mb-4">
                    <div className="text-[11px] font-semibold text-gray-300">Amostra das perguntas:</div>
                    {tpl.questions.slice(0, 3).map((q, i) => (
                      <div key={i} className="text-xs text-gray-400 truncate flex items-center gap-1.5">
                        <span className="text-brand">•</span> {q.label}
                      </div>
                    ))}
                    {tpl.questions.length > 3 && (
                      <div className="text-[10px] text-gray-500 italic">+ {tpl.questions.length - 3} outras perguntas</div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => handleOpenNewFromTemplate(tpl)}
                    className="w-full gradient-brand text-black font-semibold h-10 rounded-xl text-xs gap-2"
                  >
                    <Plus className="size-4" /> Usar este Template para um Cliente
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Novo Briefing */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl bg-[#0D0F14] border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="size-5 text-brand" />
              Criar Novo Briefing para Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Gere um link personalizado e envie no WhatsApp do seu cliente para ele responder online.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBriefing} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Escolha o Modelo / Template *</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={(val) => {
                  setSelectedTemplateId(val);
                  const t = templates.find((x) => x.id === val);
                  if (t) setBriefingTitle(t.title);
                }}
              >
                <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-11">
                  <SelectValue placeholder="Selecione o modelo..." />
                </SelectTrigger>
                <SelectContent className="bg-[#151922] border-white/10 text-white">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Título do Briefing *</Label>
              <Input
                required
                value={briefingTitle}
                onChange={(e) => setBriefingTitle(e.target.value)}
                placeholder="Ex: Briefing de Identidade Visual"
                className="bg-black/60 border-white/10 text-white rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Nome do Cliente *</Label>
                {clients.length > 0 ? (
                  <div className="space-y-2">
                    <Select
                      value={clientName}
                      onValueChange={(val) => {
                        setClientName(val);
                        const found = clients.find((c: any) => c.name === val);
                        if (found) {
                          if (found.phone) setClientPhone(found.phone);
                          if (found.email) setClientEmail(found.email);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-11">
                        <SelectValue placeholder="Selecione um cliente..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#151922] border-white/10 text-white">
                        {clients.map((c: any) => (
                          <SelectItem key={c.id || c.name} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Ou digite outro nome..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="bg-black/40 border-white/10 text-xs text-white rounded-lg h-8"
                    />
                  </div>
                ) : (
                  <Input
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João Pereira"
                    className="bg-black/60 border-white/10 text-white rounded-xl h-11"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">WhatsApp do Cliente</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-black/60 border-white/10 text-white rounded-xl h-11"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl h-10 px-5 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gradient-brand text-black font-semibold rounded-xl h-10 px-6 text-xs gap-2"
              >
                <Plus className="size-4" />
                {createMutation.isPending ? "Criando..." : "Gerar Link do Briefing"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Visualizar Respostas do Briefing */}
      {viewModalBriefing && (
        <Dialog open={Boolean(viewModalBriefing)} onOpenChange={() => setViewModalBriefing(null)}>
          <DialogContent className="sm:max-w-2xl bg-[#0D0F14] border border-white/10 text-white rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="size-5 text-brand" />
                  {viewModalBriefing.title}
                </DialogTitle>
                <Badge
                  className={`text-[10px] uppercase font-bold border-0 ${
                    viewModalBriefing.status === "concluído"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {viewModalBriefing.status}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-gray-400">
                Cliente: <strong className="text-white">{viewModalBriefing.client}</strong> • Criado em: {viewModalBriefing.createdAt}
                {viewModalBriefing.respondedAt && ` • Respondido em: ${viewModalBriefing.respondedAt}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {viewModalBriefing.status !== "concluído" ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-300 flex items-center justify-between gap-3">
                  <div>
                    <strong>Aguardando resposta do cliente.</strong>
                    <div className="text-[11px] text-amber-300/80 mt-0.5">
                      Envie o link abaixo para o cliente preencher.
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCopyLink(viewModalBriefing.id)}
                    className="gradient-brand text-black font-semibold text-xs h-8 px-3 shrink-0"
                  >
                    <Copy className="size-3.5 mr-1" /> Copiar Link
                  </Button>
                </div>
              ) : null}

              <div className="space-y-3">
                {viewModalBriefing.questions.map((q, idx) => {
                  const ans = viewModalBriefing.answers?.[q.id];
                  return (
                    <div key={q.id || idx} className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-1.5">
                      <div className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                        <span className="size-5 rounded-md bg-white/5 text-brand flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        {q.label}
                      </div>
                      <div className="pl-7 text-xs text-white whitespace-pre-wrap leading-relaxed">
                        {ans ? (
                          <span className="text-gray-100 font-medium">{String(ans)}</span>
                        ) : (
                          <span className="text-gray-600 italic">Sem resposta registrada</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(viewModalBriefing.id)}
                  className="bg-transparent border-white/10 text-white text-xs h-9"
                >
                  <Copy className="size-3.5 mr-1.5" /> Copiar Link Público
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleWhatsAppShare(viewModalBriefing)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-9 px-4 font-semibold"
                >
                  <MessageCircle className="size-3.5 mr-1.5" /> Enviar no WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
