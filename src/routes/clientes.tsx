import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive, ArchiveRestore, Camera, Copy, ExternalLink, FileText, FolderKanban,
  Grid2X2, Link2, List, Mail, MessageCircle, MoreHorizontal, Pencil, Phone, Plus,
  Search, Trash2, UserRoundPlus, Users, UsersRound, X, Check,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/layout/confirm-action";
import { PageHeader } from "@/components/layout/page-header";
import { TutorialButton } from "@/components/layout/tutorial-button";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { PhotoAvatar } from "@/components/media/photo-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AddressFormFields } from "@/components/common/address-form-fields";
import type { ClientGroup, ClientRecord } from "@/lib/clients.functions";
import { brl, initials, shortDate } from "@/lib/format";
import { startQuoteFor } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, addClient, updateClient, archiveClient, deleteClient, addClientGroup, deleteClientGroup } from "@/lib/api-clientes.functions";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [
      { property: 'og:title', content: 'Clientes — SM Hub' },
      { property: 'og:description', content: 'Cadastre e gerencie seus clientes.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    { title: "Clientes — SM Hub" },
    { name: "description", content: "Cadastre e gerencie seus clientes." },
  ] }),
  component: ClientsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────
type EditorMode = "simple" | "advanced";
type ClientDraft = Partial<ClientRecord> & { tagsText: string; id?: string };

const emptyDraft: ClientDraft = {
  name: "", email: "", phone: "", contactName: "", documentType: "CPF", documentId: "",
  birthDate: "", zip: "", address: "", addressNumber: "", complement: "", district: "", city: "",
  state: "", segment: "", projectInterest: "", tags: [], tagsText: "", notes: "", withheldIss: false,
  issRate: 0, pipelineId: "", pipelineStage: "", contractStart: "", contractMonths: 0, monthlyValue: 0,
  status: "onboarding", photoUrl: null, groupIds: [],
};

function draftFromClient(client: ClientRecord): ClientDraft {
  return { ...client, birthDate: client.birthDate ?? "", contractStart: client.contractStart ?? "",
    pipelineId: client.pipelineId ?? "", pipelineStage: client.pipelineStage ?? "", tagsText: (client.tags ?? []).join(", ") };
}

// ── Main page ──────────────────────────────────────────────────────────────
function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: dbData = { clients: [], groups: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: async () => {
      try {
        const fetched = await getClients();
        if (typeof window !== 'undefined') {
          try {
            const localRaw = localStorage.getItem('smhub_clients');
            if (localRaw) {
              const localParsed = JSON.parse(localRaw);
              if (localParsed?.clients && Array.isArray(localParsed.clients)) {
                if (localParsed.clients.length > (fetched?.clients?.length || 0)) {
                  return localParsed;
                }
              }
            }
            if (fetched?.clients) {
              localStorage.setItem('smhub_clients', JSON.stringify(fetched));
            }
          } catch {}
        }
        return fetched || { clients: [], groups: [] };
      } catch (e) {
        if (typeof window !== 'undefined') {
          try {
            const localRaw = localStorage.getItem('smhub_clients');
            if (localRaw) return JSON.parse(localRaw);
          } catch {}
        }
        return { clients: [], groups: [] };
      }
    },
  });

  const clients = dbData.clients || [];
  const groups = dbData.groups || [];

  const addMutation = useMutation({
    mutationFn: async (data: any) => addClient({ data }),
    onSuccess: (res, vars) => {
      if (res.success) {
        toast.success("Cliente cadastrado com sucesso!");
        const newClient = res.client || { ...vars, id: `c_${Date.now()}` };
        const updatedData = {
          ...dbData,
          clients: [newClient, ...(dbData.clients || [])]
        };
        queryClient.setQueryData(['clients-data'], updatedData);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smhub_clients', JSON.stringify(updatedData)); } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['clients-data'] });
        setEditor(null);
      } else toast.error("Erro: " + res.error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => updateClient({ data }),
    onSuccess: (res, vars) => {
      if (res.success) {
        toast.success("Cliente atualizado com sucesso!");
        const updatedClients = (dbData.clients || []).map((c: any) => c.id === vars.id ? { ...c, ...vars } : c);
        const updatedData = { ...dbData, clients: updatedClients };
        queryClient.setQueryData(['clients-data'], updatedData);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smhub_clients', JSON.stringify(updatedData)); } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['clients-data'] });
        setEditor(null);
      } else toast.error("Erro: " + res.error);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => archiveClient({ data: { id, archived } }),
    onSuccess: (res, vars) => {
      if (res.success) {
        toast.success(res.client?.archived ? "Cliente arquivado." : "Cliente restaurado.");
        const updatedClients = (dbData.clients || []).map((c: any) => c.id === vars.id ? { ...c, archived: vars.archived } : c);
        const updatedData = { ...dbData, clients: updatedClients };
        queryClient.setQueryData(['clients-data'], updatedData);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smhub_clients', JSON.stringify(updatedData)); } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['clients-data'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteClient({ data: id }),
    onSuccess: (res, deletedId) => {
      if (res.success) {
        toast.success("Cliente excluído.");
        const updatedClients = (dbData.clients || []).filter((c: any) => c.id !== deletedId);
        const updatedData = { ...dbData, clients: updatedClients };
        queryClient.setQueryData(['clients-data'], updatedData);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smhub_clients', JSON.stringify(updatedData)); } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['clients-data'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const addGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => addClientGroup({ data }),
    onSuccess: (res, vars) => {
      if (res.success) {
        toast.success("Grupo criado!");
        const newGroup = res.group || { id: `g_${Date.now()}`, ...vars, memberCount: 0 };
        const updatedData = { ...dbData, groups: [...(dbData.groups || []), newGroup] };
        queryClient.setQueryData(['clients-data'], updatedData);
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('smhub_clients', JSON.stringify(updatedData)); } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['clients-data'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => deleteClientGroup({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Grupo excluído.");
        queryClient.invalidateQueries({ queryKey: ['clients-data'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft);
  const [details, setDetails] = useState<ClientRecord | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [portalHelpOpen, setPortalHelpOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((c: any) =>
      c.archived === showArchived &&
      (!term || [c.name, c.email, c.contactName ?? "", c.phone].join(" ").toLowerCase().includes(term))
    );
  }, [clients, query, showArchived]);

  const now = new Date();
  const newThisMonth = clients.filter((c: any) => {
    const d = new Date(c.createdAt);
    return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear() && !c.archived;
  }).length;
  const renewals = clients.filter((c: any) => {
    if (!c.contractStart || !c.contractMonths) return false;
    const end = new Date(`${c.contractStart}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + c.contractMonths);
    const days = (end.getTime() - now.getTime()) / 86400000;
    return days >= 0 && days <= 30;
  }).length;

  const openNew = (mode: EditorMode) => { setDraft({ ...emptyDraft }); setEditor(mode); };
  const openEdit = (client: ClientRecord) => { setDraft(draftFromClient(client)); setEditor("advanced"); };

  const handleSave = () => {
    if (!draft.name?.trim()) { toast.error("Informe o nome do cliente"); return; }
    const tags = (draft.tagsText ?? "").split(",").map((t) => t.trim()).filter(Boolean);
    if (draft.id) {
      updateMutation.mutate({ ...draft, tags });
    } else {
      addMutation.mutate({ ...draft, tags });
    }
  };

  const saving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Gerencie todos os seus clientes cadastrados"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-border p-1">
              <Button size="icon" variant={view === "grid" ? "secondary" : "ghost"} onClick={() => setView("grid")} title="Ver cartões"><Grid2X2 className="size-4" /></Button>
              <Button size="icon" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")} title="Ver lista"><List className="size-4" /></Button>
            </div>
            <TutorialButton compact />
            <Button
              variant="outline"
              onClick={() => setPortalHelpOpen(true)}
              className="border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10 font-medium"
            >
              <ExternalLink className="size-4 mr-2" /> Portais dos Clientes
            </Button>
            <Button variant="outline" onClick={() => setLinkOpen(true)}><Link2 className="size-4 mr-2" /> Link de Cadastro</Button>
            <Button variant="outline" onClick={() => setGroupOpen(true)}><UsersRound className="size-4 mr-2" /> Grupos</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gradient-brand text-primary-foreground"><Plus className="size-4 mr-2" /> Cadastrar Cliente</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={() => openNew("simple")}><UserRoundPlus className="mr-2 size-4" /> Cadastro simples</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openNew("advanced")}><FileText className="mr-2 size-4" /> Cadastro avançado</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <TutorialBanner location="Clientes" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, email, empresa..." className="pl-9 bg-muted/50 border-border/50" />
        </div>
        <label className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/50 px-4 py-2 text-sm text-muted-foreground cursor-pointer">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} /> Mostrar arquivados
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total de Clientes" value={String(clients.filter((c) => !c.archived).length)} />
        <Metric label="Novos este Mês" value={String(newThisMonth)} />
        <Metric label="Renovações próximas" value={String(renewals)} subtext="nos próximos 30 dias" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#111] p-10 text-center">
          <Users className="mx-auto size-10 text-gray-600 mb-3" />
          <p className="font-medium text-white">{showArchived ? "Nenhum cliente arquivado" : "Nenhum cliente encontrado"}</p>
          <p className="mt-1 text-sm text-gray-500">{showArchived ? "Os clientes arquivados aparecerão aqui." : "Cadastre o primeiro cliente ou ajuste sua busca."}</p>
          {!showArchived && (
            <Button className="mt-4 gradient-brand text-black font-semibold" onClick={() => openNew("simple")}>
              <Plus className="mr-2 size-4" /> Cadastrar Primeiro Cliente
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              groups={groups}
              onDetails={setDetails}
              onEdit={openEdit}
              onArchive={(c) => archiveMutation.mutate({ id: c.id, archived: !c.archived })}
              onDelete={(c) => deleteMutation.mutate(c.id)}
              onQuote={(c) => { startQuoteFor(c.name); navigate({ to: "/propostas" }); }}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-[#111] overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-white/5 bg-[#0a0a0a] text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="p-4">Cliente</th>
                <th>Contato</th>
                <th>Grupo</th>
                <th>Contrato</th>
                <th>Mensalidade</th>
                <th className="pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client: any) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  groups={groups}
                  onDetails={setDetails}
                  onEdit={openEdit}
                  onArchive={(c) => archiveMutation.mutate({ id: c.id, archived: !c.archived })}
                  onDelete={(c) => deleteMutation.mutate(c.id)}
                  onQuote={(c) => { startQuoteFor(c.name); navigate({ to: "/propostas" }); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Editor Dialog */}
      <Dialog open={Boolean(editor)} onOpenChange={(v) => !v && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10 sm:max-w-2xl p-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="text-xl font-bold text-white">{draft.id ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex bg-[#141414] rounded-lg p-1">
                {(["simple", "advanced"] as EditorMode[]).map((m) => (
                  <button
                    key={m}
                    className={cn("px-4 py-1.5 text-sm rounded-md transition-colors", editor === m ? "bg-[#1f1f1f] text-white" : "text-gray-500 hover:text-white")}
                    onClick={() => setEditor(m)}
                  >
                    {m === "simple" ? "Simples" : "Avançado"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/80">Nome Cliente/Empresa *</Label>
                  <Input value={draft.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Ex: João Silva ou Agência XYZ" className="bg-[#111] border-white/10 text-white h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Email</Label>
                  <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="cliente@email.com" className="bg-[#111] border-white/10 text-white h-11" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/80">Telefone</Label>
                  <Input value={draft.phone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="(00) 00000-0000" className="bg-[#111] border-white/10 text-white h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Status</Label>
                  <Select value={draft.status ?? "onboarding"} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as any }))}>
                    <SelectTrigger className="bg-[#111] border-white/10 text-white h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                      <SelectItem value="inadimplente">Inadimplente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editor === "advanced" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white/80">Nome do Contato</Label>
                      <Input value={draft.contactName ?? ""} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} placeholder="Pessoa de contato" className="bg-[#111] border-white/10 text-white h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Segmento</Label>
                      <Input value={draft.segment ?? ""} onChange={(e) => setDraft((d) => ({ ...d, segment: e.target.value }))} placeholder="Ex: E-commerce, Restaurante..." className="bg-[#111] border-white/10 text-white h-11" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-white/80">Mensalidade (R$)</Label>
                      <Input type="number" value={draft.monthlyValue ?? 0} onChange={(e) => setDraft((d) => ({ ...d, monthlyValue: parseFloat(e.target.value) || 0 }))} className="bg-[#111] border-white/10 text-white h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Início do Contrato</Label>
                      <Input type="date" value={draft.contractStart ?? ""} onChange={(e) => setDraft((d) => ({ ...d, contractStart: e.target.value }))} className="bg-[#111] border-white/10 text-white h-11" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Tags (separadas por vírgula)</Label>
                    <Input value={draft.tagsText ?? ""} onChange={(e) => setDraft((d) => ({ ...d, tagsText: e.target.value }))} placeholder="social-media, ads, meta..." className="bg-[#111] border-white/10 text-white h-11" />
                  </div>

                  {/* Endereço do Cliente com Busca por CEP & Edição Manual */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <AddressFormFields
                      title="Endereço da Empresa / Cliente"
                      description="Informe o CEP para preenchimento automático nos Correios ou preencha manualmente."
                      values={{
                        zip: draft.zip ?? "",
                        address: draft.address ?? "",
                        addressNumber: draft.addressNumber ?? "",
                        complement: draft.complement ?? "",
                        district: draft.district ?? "",
                        city: draft.city ?? "",
                        state: draft.state ?? "",
                      }}
                      onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                      showComplement={true}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Observações</Label>
                    <Textarea value={draft.notes ?? ""} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Notas sobre o cliente..." className="bg-[#111] border-white/10 text-white min-h-[80px]" />
                  </div>
                  {/* Groups */}
                  {groups.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-white/80">Grupos</Label>
                      <div className="flex flex-wrap gap-2">
                        {groups.map((g) => {
                          const selected = (draft.groupIds ?? []).includes(g.id);
                          return (
                            <button
                              key={g.id}
                              onClick={() => setDraft((d) => ({
                                ...d,
                                groupIds: selected
                                  ? (d.groupIds ?? []).filter((id) => id !== g.id)
                                  : [...(d.groupIds ?? []), g.id],
                              }))}
                              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", selected ? "bg-brand/20 border-brand/40 text-brand" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20")}
                            >
                              {selected && <Check className="inline-block size-3 mr-1" />}{g.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between gap-3 mt-8">
              <Button variant="outline" className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5 h-11 rounded-xl" onClick={() => setEditor(null)}>Cancelar</Button>
              <Button className="flex-1 gradient-brand text-black font-semibold h-11 rounded-xl" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando…" : draft.id ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Details Dialog */}
      <Dialog open={Boolean(details)} onOpenChange={(v) => !v && setDetails(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10 sm:max-w-2xl p-0">
          {details && (
            <div>
              <div className="flex items-center justify-between border-b border-white/5 p-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Detalhes do Cliente</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Visão completa, contatos, contratos e link do portal</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#C9A227] to-[#DFBA47] text-black font-extrabold text-xs h-9 px-3.5 rounded-xl hover:brightness-110 shadow-md shadow-[#C9A227]/20 cursor-pointer gap-1.5"
                    onClick={() => window.open(`/portal/${encodeURIComponent(details.id || details.name)}`, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                    Abrir Portal do Cliente
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setDetails(null); openEdit(details); }} className="rounded-xl text-xs h-9 border-white/10">
                    <Pencil className="mr-1 size-3" /> Editar
                  </Button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {/* Portal do Cliente VIP Action Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C9A227]/15 via-[#C9A227]/5 to-transparent border border-[#C9A227]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#C9A227] uppercase tracking-wider">Página Exclusiva do Cliente</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">Acesso VIP</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      Link público onde este cliente acompanha projetos, faturas Pix e contratos em tempo real.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10 rounded-xl font-semibold gap-1.5"
                      onClick={() => {
                        const url = `${window.location.origin}/portal/${encodeURIComponent(details.id || details.name)}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link do Portal do Cliente copiado com sucesso!");
                      }}
                    >
                      <Copy className="size-3.5" />
                      Copiar Link
                    </Button>
                  </div>
                </div>
                <Tabs defaultValue="informacoes">
                  <TabsList className="mb-6 flex-wrap gap-1 h-auto rounded-xl bg-white/5 p-1 justify-start">
                    {["informacoes", "projetos", "financeiro"].map((t) => (
                      <TabsTrigger key={t} value={t} className="rounded-lg px-4 py-2 text-xs font-medium capitalize data-[state=active]:bg-[#1f1f1f] data-[state=active]:text-white">
                        {t === "informacoes" ? "Informações" : t === "projetos" ? "Projetos" : "Financeiro"}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="informacoes" className="space-y-4">
                    <div className="flex items-center gap-4 rounded-xl border border-white/5 p-5 bg-[#111]">
                      <div className="size-16 rounded-xl bg-brand/20 flex items-center justify-center text-2xl font-bold text-brand shrink-0">
                        {initials(details.name)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{details.name}</h3>
                        <p className="text-sm text-gray-400">{details.segment || details.contactName || "Sem segmento"}</p>
                        <Badge variant="outline" className="mt-1 text-xs capitalize">{details.status}</Badge>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: "E-mail", value: details.email },
                        { label: "Telefone", value: details.phone },
                        { label: "Cidade / UF", value: details.city ? `${details.city}/${details.state}` : "" },
                        { label: "CEP", value: details.zip },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-white/5 p-4 bg-[#111]">
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="mt-1 text-sm font-medium text-white">{value || "—"}</p>
                        </div>
                      ))}
                    </div>
                    {details.address && (
                      <div className="rounded-xl border border-white/5 p-4 bg-[#111]">
                        <p className="text-xs text-gray-500 mb-1">Endereço Completo</p>
                        <p className="text-sm text-gray-200">
                          {details.address}, nº {details.addressNumber || "S/N"}
                          {details.complement ? ` (${details.complement})` : ""}
                          {details.district ? ` - ${details.district}` : ""} · {details.city}/{details.state}
                          {details.zip ? ` · CEP: ${details.zip}` : ""}
                        </p>
                      </div>
                    )}
                    {details.notes && (
                      <div className="rounded-xl border border-white/5 p-4 bg-[#111]">
                        <p className="text-xs text-gray-500 mb-1">Observações</p>
                        <p className="text-sm text-gray-300">{details.notes}</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="projetos">
                    <p className="text-sm text-gray-400">Nenhum projeto vinculado a este cliente.</p>
                  </TabsContent>
                  <TabsContent value="financeiro" className="space-y-3">
                    {[
                      { label: "Mensalidade", value: brl(details.monthlyValue ?? 0) },
                      { label: "Início do Contrato", value: details.contractStart ? shortDate(details.contractStart) : "—" },
                      { label: "Duração", value: details.contractMonths ? `${details.contractMonths} meses` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between rounded-xl border border-white/5 p-4 bg-[#111]">
                        <p className="text-sm text-gray-400">{label}</p>
                        <p className="text-sm font-medium text-white">{value}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Groups Dialog */}
      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Grupos de Clientes</DialogTitle>
            <DialogDescription className="text-gray-400">Organize sua carteira por equipe, serviço ou prioridade.</DialogDescription>
          </DialogHeader>
          <GroupsManager
            groups={groups}
            onClose={() => setGroupOpen(false)}
            onAddGroup={(name, description) => addGroupMutation.mutate({ name, description })}
            onDeleteGroup={(id) => deleteGroupMutation.mutate(id)}
          />
        </DialogContent>
      </Dialog>

      {/* Registration Link Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link de Cadastro</DialogTitle>
            <DialogDescription className="text-gray-400">Envie este link para o cliente preencher os próprios dados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-400">Gere um link personalizado de cadastro de clientes:</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/cadastro/${Date.now()}`}
                className="bg-[#111] border-white/10 text-white text-xs"
              />
              <Button
                size="icon"
                variant="outline"
                className="border-white/10 hover:bg-white/5"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/cadastro/${Date.now()}`);
                  toast.success("Link copiado!");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setLinkOpen(false)} className="gradient-brand text-black font-semibold w-full">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Portais dos Clientes Modal */}
      <Dialog open={portalHelpOpen} onOpenChange={setPortalHelpOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-[#C9A227]">👑</span> Portais dos Clientes
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs leading-relaxed">
              Cada cliente possui uma página web exclusiva em <code className="text-[#C9A227] bg-white/5 px-1 py-0.5 rounded">/portal/:id</code>. Nela, o cliente visualiza o andamento de projetos, aprova propostas, paga faturas via Pix instantâneo e acessa arquivos compartilhados. Não é necessário senha ou login do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs font-semibold text-gray-400">
              Selecione um cliente para abrir ou copiar o link de acesso:
            </div>
            <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-[#111114] max-h-72 overflow-y-auto">
              {clients.map((c: any) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.email || "Sem e-mail cadastrado"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#C9A227] to-[#DFBA47] text-black font-extrabold text-xs h-8 px-3 rounded-lg hover:brightness-110 shadow-sm gap-1"
                      onClick={() => window.open(`/portal/${encodeURIComponent(c.id || c.name)}`, "_blank")}
                    >
                      <ExternalLink className="size-3" /> Abrir Portal
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg"
                      title="Copiar link do portal"
                      onClick={() => {
                        const url = `${window.location.origin}/portal/${encodeURIComponent(c.id || c.name)}`;
                        navigator.clipboard.writeText(url);
                        toast.success(`Link do portal de ${c.name} copiado!`);
                      }}
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPortalHelpOpen(false)} className="gradient-brand text-black font-bold w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Metric({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 hover:border-brand/30 transition-all duration-300">
      <p className="text-sm font-medium text-neutral-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-bold text-white">{value}</p>
        {subtext && <p className="text-xs text-neutral-400">{subtext}</p>}
      </div>
    </div>
  );
}

function ClientCard({ client, groups, onDetails, onEdit, onArchive, onDelete, onQuote, navigate }: {
  client: ClientRecord; groups: ClientGroup[]; onDetails: (c: ClientRecord) => void;
  onEdit: (c: ClientRecord) => void; onArchive: (c: ClientRecord) => void;
  onDelete: (c: ClientRecord) => void; onQuote: (c: ClientRecord) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const names = groups.filter((g) => (client.groupIds ?? []).includes(g.id)).map((g) => g.name);
  return (
    <div className={cn("bg-[#111111] border border-white/5 rounded-2xl p-6 transition-all duration-300 hover:border-brand/30 group flex flex-col", client.archived && "opacity-50 grayscale")}>
      <div className="flex justify-between items-start mb-5">
        <div className="flex gap-4 min-w-0">
          <div className="size-12 rounded-full bg-brand/20 flex items-center justify-center text-lg font-bold text-brand shrink-0">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <button className="truncate text-lg font-bold text-white hover:text-brand transition-colors text-left block w-full" onClick={() => onDetails(client)}>
              {client.name}
            </button>
            <div className="flex items-center gap-2 text-sm text-neutral-400 mt-0.5">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{client.email || "Sem e-mail cadastrado"}</span>
            </div>
          </div>
        </div>
        <ClientMenu client={client} onDetails={onDetails} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} onQuote={onQuote} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6 flex-1 content-start">
        {names.length > 0
          ? names.map((n) => <span key={n} className="px-2.5 py-1 rounded-md bg-white/5 text-xs font-medium text-neutral-300 border border-white/5">{n}</span>)
          : <span className="px-2.5 py-1 rounded-md bg-transparent text-xs text-neutral-600 border border-dashed border-white/10">Sem grupo</span>}
        {client.segment && <span className="px-2.5 py-1 rounded-md bg-brand/10 text-xs font-medium text-brand border border-brand/20">{client.segment}</span>}
        {client.status && <Badge variant="outline" className="text-[10px]">{client.status}</Badge>}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-1">
          {client.phone && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg" title="Ligar"
              onClick={() => window.open(`tel:${client.phone}`)}>
              <Phone className="size-4" />
            </Button>
          )}
          {client.email && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg" title="Enviar e-mail"
              onClick={() => window.open(`mailto:${client.email}`)}>
              <Mail className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg" title="Editar"
            onClick={() => onEdit(client)}>
            <Pencil className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs bg-gradient-to-r from-[#C9A227] to-[#DFBA47] text-black font-extrabold hover:brightness-110 shadow-md shadow-[#C9A227]/20 rounded-lg gap-1.5 cursor-pointer"
            title="Abrir o Portal VIP do Cliente em nova aba"
            onClick={() => window.open(`/portal/${encodeURIComponent(client.id || client.name)}`, "_blank")}
          >
            <ExternalLink className="size-3.5" />
            Portal
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-transparent border-white/10 text-white hover:bg-white/10 rounded-lg" onClick={() => onDetails(client)}>
            Ver Perfil
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClientMenu({ client, onDetails, onEdit, onArchive, onDelete, onQuote }: {
  client: ClientRecord; onDetails: (c: ClientRecord) => void; onEdit: (c: ClientRecord) => void;
  onArchive: (c: ClientRecord) => void; onDelete: (c: ClientRecord) => void; onQuote: (c: ClientRecord) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="shrink-0" title="Mais ações">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10 text-white">
        <DropdownMenuItem
          onClick={() => window.open(`/portal/${encodeURIComponent(client.id || client.name)}`, "_blank")}
          className="hover:bg-white/5 text-[#C9A227] font-bold"
        >
          <ExternalLink className="mr-2 size-4" /> Abrir Portal do Cliente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDetails(client)} className="hover:bg-white/5"><FileText className="mr-2 size-4" /> Ver ficha completa</DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${encodeURIComponent(client.id || client.name)}`;
            navigator.clipboard.writeText(url);
            toast.success(`Link do Portal do Cliente copiado!`, {
              description: `Envie o link para ${client.name} no WhatsApp.`
            });
          }} 
          className="hover:bg-white/5 text-brand font-semibold"
        >
          <Copy className="mr-2 size-4" /> Copiar Link do Portal do Cliente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(client)} className="hover:bg-white/5"><Pencil className="mr-2 size-4" /> Editar cliente</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onQuote(client)} className="hover:bg-white/5"><FileText className="mr-2 size-4" /> Preparar orçamento</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onArchive(client)} className="hover:bg-white/5">
          {client.archived ? <ArchiveRestore className="mr-2 size-4" /> : <Archive className="mr-2 size-4" />}
          {client.archived ? "Restaurar cliente" : "Arquivar cliente"}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={() => onDelete(client)}>
          <Trash2 className="mr-2 size-4" /> Excluir definitivamente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientRow({ client, groups, onDetails, onEdit, onArchive, onDelete, onQuote }: {
  client: ClientRecord; groups: ClientGroup[]; onDetails: (c: ClientRecord) => void;
  onEdit: (c: ClientRecord) => void; onArchive: (c: ClientRecord) => void;
  onDelete: (c: ClientRecord) => void; onQuote: (c: ClientRecord) => void;
}) {
  const group = groups.find((g) => (client.groupIds ?? []).includes(g.id));
  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/5 text-sm text-gray-300">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">{initials(client.name)}</div>
          <div>
            <button onClick={() => onDetails(client)} className="font-medium text-white hover:text-brand transition-colors">{client.name}</button>
            <p className="text-xs text-gray-500">{client.email}</p>
          </div>
        </div>
      </td>
      <td>{client.phone || "—"}</td>
      <td>{group?.name ?? "—"}</td>
      <td>{client.contractStart ? shortDate(client.contractStart) : "—"}</td>
      <td className="font-medium text-brand">{brl(client.monthlyValue ?? 0)}</td>
      <td className="pr-4 text-right">
        <div className="inline-flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs text-[#C9A227] hover:bg-[#C9A227]/15 rounded-lg font-bold gap-1"
            title="Abrir Portal do Cliente em Nova Aba"
            onClick={() => window.open(`/portal/${encodeURIComponent(client.id || client.name)}`, "_blank")}
          >
            <ExternalLink className="size-3.5" />
            Portal
          </Button>
          <Button size="icon" variant="ghost" className="hover:bg-white/10" onClick={() => onEdit(client)}><Pencil className="size-4" /></Button>
          <ClientMenu client={client} onDetails={onDetails} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} onQuote={onQuote} />
        </div>
      </td>
    </tr>
  );
}

function GroupsManager({
  groups,
  onClose,
  onAddGroup,
  onDeleteGroup,
}: {
  groups: ClientGroup[];
  onClose: () => void;
  onAddGroup: (name: string, description: string) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do grupo" className="bg-[#111] border-white/10 text-white" onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onAddGroup(name.trim(), description.trim());
            setName("");
            setDescription("");
          }
        }} />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" className="bg-[#111] border-white/10 text-white" />
        <Button
          className="gradient-brand text-black font-semibold shrink-0"
          onClick={() => {
            if (!name.trim()) { toast.error("Informe o nome do grupo"); return; }
            onAddGroup(name.trim(), description.trim());
            setName("");
            setDescription("");
          }}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="max-h-60 space-y-2 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-gray-500">Nenhum grupo criado.</p>
        ) : groups.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111] p-3">
            <div>
              <p className="text-sm font-medium text-white">{g.name}</p>
              {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
            </div>
            <ConfirmAction
              title="Excluir grupo?"
              description="Os clientes serão mantidos, apenas o agrupamento será removido."
              onConfirm={() => { onDeleteGroup(g.id); }}
              trigger={
                <Button size="icon" variant="ghost" className="hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="size-4" />
                </Button>
              }
            />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={onClose} className="gradient-brand text-black font-semibold w-full">Fechar</Button>
      </DialogFooter>
    </div>
  );
}
