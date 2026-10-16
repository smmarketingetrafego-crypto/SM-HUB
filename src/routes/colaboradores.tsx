import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  DollarSign, 
  Shield, 
  Briefcase, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Building2,
  KeyRound,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { 
  getCollaborators, 
  addCollaborator, 
  updateCollaborator, 
  deleteCollaborator,
  Collaborator 
} from "@/lib/api-colaboradores.server";

export const Route = createFileRoute("/colaboradores")({
  component: ColaboradoresPage,
});

const DEPARTMENTS = [
  "Todos",
  "Direção",
  "Tráfego",
  "Design",
  "Conteúdo",
  "Tecnologia",
  "Comercial",
  "Atendimento",
  "Operações",
] as const;

function ColaboradoresPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingColab, setEditingColab] = useState<Collaborator | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formDept, setFormDept] = useState<Collaborator["department"]>("Design");
  const [formPermission, setFormPermission] = useState<Collaborator["permissionLevel"]>("member");
  const [formRemunerationType, setFormRemunerationType] = useState<Collaborator["remunerationType"]>("mensal");
  const [formSalary, setFormSalary] = useState<string>("3500");
  const [formPixKey, setFormPixKey] = useState("");
  const [formStatus, setFormStatus] = useState<Collaborator["status"]>("Ativo");
  const [formNotes, setFormNotes] = useState("");

  const { data: collaborators = [], isLoading } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const res = await getCollaborators();
      return res;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: Omit<Collaborator, "id" | "joinedAt">) => {
      return addCollaborator({ data: payload });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Colaborador cadastrado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["collaborators"] });
        closeModal();
      } else {
        toast.error("Erro ao cadastrar: " + res.error);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Collaborator) => {
      return updateCollaborator({ data: payload });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Dados do colaborador atualizados!");
        queryClient.invalidateQueries({ queryKey: ["collaborators"] });
        closeModal();
      } else {
        toast.error("Erro ao atualizar: " + res.error);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteCollaborator({ data: id });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Colaborador removido da equipe.");
        queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      } else {
        toast.error("Erro ao remover: " + res.error);
      }
    },
  });

  const openNewModal = () => {
    setEditingColab(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("");
    setFormDept("Design");
    setFormPermission("member");
    setFormRemunerationType("mensal");
    setFormSalary("3500");
    setFormPixKey("");
    setFormStatus("Ativo");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditModal = (colab: Collaborator) => {
    setEditingColab(colab);
    setFormName(colab.name);
    setFormEmail(colab.email);
    setFormPhone(colab.phone);
    setFormRole(colab.role);
    setFormDept(colab.department);
    setFormPermission(colab.permissionLevel);
    setFormRemunerationType(colab.remunerationType || "mensal");
    setFormSalary(colab.salaryOrRate ? String(colab.salaryOrRate) : "0");
    setFormPixKey(colab.pixKey || "");
    setFormStatus(colab.status);
    setFormNotes(colab.notes || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingColab(null);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("Informe o nome completo do colaborador.");
      return;
    }
    if (!formEmail.trim() || !formEmail.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!formRole.trim()) {
      toast.error("Informe o cargo ou função do colaborador.");
      return;
    }

    const salaryNum = parseFloat(formSalary.replace(/[^\d.]/g, "")) || 0;

    if (editingColab) {
      updateMutation.mutate({
        ...editingColab,
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        role: formRole.trim(),
        department: formDept,
        permissionLevel: formPermission,
        remunerationType: formRemunerationType,
        salaryOrRate: salaryNum,
        pixKey: formPixKey.trim(),
        status: formStatus,
        notes: formNotes.trim(),
      });
    } else {
      addMutation.mutate({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        role: formRole.trim(),
        department: formDept,
        permissionLevel: formPermission,
        remunerationType: formRemunerationType,
        salaryOrRate: salaryNum,
        pixKey: formPixKey.trim(),
        status: formStatus,
        notes: formNotes.trim(),
      });
    }
  };

  // KPIs
  const totalCount = collaborators.length;
  const activeCount = collaborators.filter((c) => c.status === "Ativo").length;
  const deptsCount = new Set(collaborators.map((c) => c.department)).size;
  const totalPayroll = collaborators
    .filter((c) => c.status === "Ativo")
    .reduce((acc, c) => acc + (c.salaryOrRate || 0), 0);

  // Filtered List
  const filtered = collaborators.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "Todos" || c.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const getPermissionBadge = (lvl: Collaborator["permissionLevel"]) => {
    switch (lvl) {
      case "admin":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20 font-bold">Admin</Badge>;
      case "manager":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">Gestor</Badge>;
      case "member":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold">Membro</Badge>;
      case "viewer":
        return <Badge className="bg-neutral-500/10 text-neutral-400 border-neutral-500/20">Leitura</Badge>;
    }
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case "Direção":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      case "Tráfego":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "Design":
        return "bg-pink-500/15 text-pink-300 border-pink-500/30";
      case "Conteúdo":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "Tecnologia":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "Comercial":
        return "bg-orange-500/15 text-orange-300 border-orange-500/30";
      default:
        return "bg-neutral-500/15 text-neutral-300 border-neutral-500/30";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Cadastro de Colaboradores
              </h1>
              <p className="text-sm text-neutral-400">
                Gerencie sua equipe, cargos, salários, permissões e canais de contato.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={openNewModal}
          className="gradient-brand text-black font-extrabold text-sm h-11 px-5 rounded-xl shadow-lg shadow-brand/20 hover:opacity-95"
        >
          <UserPlus className="mr-2 size-4" /> Novo Colaborador
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Total de Membros</span>
            <div className="size-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{totalCount}</div>
          <p className="text-xs text-neutral-500 mt-1">Colaboradores registrados</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Membros Ativos</span>
            <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeCount}</div>
          <p className="text-xs text-neutral-500 mt-1">Produzindo atualmente</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-neutral-400">Departamentos</span>
            <div className="size-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Building2 className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{deptsCount}</div>
          <p className="text-xs text-neutral-500 mt-1">Áreas com responsáveis</p>
        </div>

        <div className="rounded-2xl border border-brand/20 bg-[#111] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-brand">Folha Mensal Estimada</span>
            <div className="size-8 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-brand">{brl(totalPayroll)}</div>
          <p className="text-xs text-neutral-500 mt-1">Total de remuneração ativa</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0e11] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input
            placeholder="Buscar por nome, cargo ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand"
          />
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDept === dept
                  ? "bg-brand text-black shadow-md shadow-brand/20 font-bold"
                  : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Collaborators Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-neutral-500">
          <p className="animate-pulse">Carregando equipe...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111]/40 p-12 text-center">
          <Users className="size-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base">Nenhum colaborador encontrado</h3>
          <p className="text-xs text-neutral-500 mt-1">
            {searchTerm || selectedDept !== "Todos"
              ? "Tente alterar os termos de busca ou filtros."
              : "Cadastre seu primeiro colaborador para gerenciar a equipe."}
          </p>
          <Button onClick={openNewModal} size="sm" className="mt-4 gradient-brand text-black font-bold">
            <UserPlus className="mr-1.5 size-4" /> Cadastrar Agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((colab) => {
            const rawPhone = colab.phone.replace(/\D/g, "");
            const whatsappUrl = `https://wa.me/55${rawPhone}`;

            return (
              <div
                key={colab.id}
                className="rounded-2xl border border-white/5 bg-[#111114] p-5 shadow-xl hover:border-brand/30 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Top Bar: Avatar + Name + More Dropdown */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-gradient-to-tr from-[#c9a227] to-[#e6be44] text-black font-black text-lg flex items-center justify-center shadow-lg shadow-brand/10 shrink-0">
                        {colab.name[0]?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-base group-hover:text-brand transition-colors line-clamp-1">
                          {colab.name}
                        </h4>
                        <p className="text-xs text-neutral-400 font-medium line-clamp-1">{colab.role}</p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 text-neutral-400 hover:text-white rounded-lg">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-[#0e0e11] border border-white/10 text-white rounded-xl p-1 shadow-2xl">
                        <DropdownMenuItem
                          onClick={() => openEditModal(colab)}
                          className="cursor-pointer text-xs text-neutral-300 hover:text-white focus:bg-white/10 rounded-lg px-2.5 py-2"
                        >
                          <Edit className="size-3.5 mr-2 text-brand" /> Editar Dados
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="cursor-pointer text-xs text-neutral-300 hover:text-white focus:bg-white/10 rounded-lg px-2.5 py-2"
                        >
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="size-3.5 mr-2 text-emerald-400" /> Abrir no WhatsApp
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        <DropdownMenuItem
                          onClick={() => {
                            if (confirm(`Deseja realmente remover o colaborador ${colab.name}?`)) {
                              deleteMutation.mutate(colab.id);
                            }
                          }}
                          className="cursor-pointer text-xs text-red-400 hover:text-red-300 focus:bg-red-500/10 rounded-lg px-2.5 py-2"
                        >
                          <Trash2 className="size-3.5 mr-2" /> Excluir Colaborador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges: Dept + Status + Permission */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDepartmentColor(colab.department)}`}>
                      {colab.department}
                    </span>
                    {getPermissionBadge(colab.permissionLevel)}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        colab.status === "Ativo"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : colab.status === "Férias"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                      }`}
                    >
                      {colab.status}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-neutral-400 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="size-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{colab.email}</span>
                    </div>
                    {colab.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-neutral-500 shrink-0" />
                        <span>{colab.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Remuneration & Quick Actions */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                      {colab.remunerationType === "mensal"
                        ? "Salário Mensal"
                        : colab.remunerationType === "por_projeto"
                        ? "Por Projeto"
                        : "Comissão"}
                    </span>
                    <p className="text-sm font-black text-brand">
                      {colab.salaryOrRate ? brl(colab.salaryOrRate) : "A combinar"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {colab.pixKey && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(colab.pixKey || "");
                          toast.success(`Chave Pix de ${colab.name} copiada!`);
                        }}
                        className="h-8 px-2.5 rounded-lg border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 text-xs font-semibold"
                        title={`Chave Pix: ${colab.pixKey}`}
                      >
                        <KeyRound className="size-3.5 mr-1" /> Pix
                      </Button>
                    )}
                    {colab.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 px-2.5 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs"
                      >
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-3.5 mr-1" /> WhatsApp
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(colab)}
                      className="h-8 px-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 text-xs"
                    >
                      <Edit className="size-3.5 mr-1" /> Editar
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo / Editar Colaborador */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-[#0e0e11] border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Users className="size-5 text-brand" />
              {editingColab ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Preencha os dados profissionais e de acesso do membro da agência.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-neutral-300">Nome Completo *</Label>
                <Input
                  placeholder="Ex: Silas Maroto"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">E-mail Profissional *</Label>
                <Input
                  type="email"
                  placeholder="silas@agencia.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">WhatsApp / Telefone</Label>
                <Input
                  placeholder="(11) 98888-7777"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-neutral-300">Cargo / Função *</Label>
                <Input
                  placeholder="Ex: Gestor de Tráfego Pago & Meta Ads"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Departamento</Label>
                <Select value={formDept} onValueChange={(v: any) => setFormDept(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="Direção">Direção</SelectItem>
                    <SelectItem value="Tráfego">Tráfego</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Conteúdo">Conteúdo</SelectItem>
                    <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Atendimento">Atendimento</SelectItem>
                    <SelectItem value="Operações">Operações</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Nível de Permissão</Label>
                <Select value={formPermission} onValueChange={(v: any) => setFormPermission(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="admin">Administrador (Total)</SelectItem>
                    <SelectItem value="manager">Gestor / Coordenador</SelectItem>
                    <SelectItem value="member">Membro Operacional</SelectItem>
                    <SelectItem value="viewer">Apenas Visualização</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Tipo de Remuneração</Label>
                <Select value={formRemunerationType} onValueChange={(v: any) => setFormRemunerationType(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="mensal">Mensal Fixo (CLT / PJ)</SelectItem>
                    <SelectItem value="por_projeto">Por Demanda / Projeto</SelectItem>
                    <SelectItem value="comissao">Comissão / Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Valor Estimado (R$)</Label>
                <Input
                  placeholder="3500"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand font-semibold text-brand"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-neutral-300">Chave Pix para Pagamento (CPF, E-mail, Celular ou Aleatória)</Label>
                <Input
                  placeholder="Ex: 11988887777 ou financeiro@colaborador.com"
                  value={formPixKey}
                  onChange={(e) => setFormPixKey(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm focus-visible:ring-brand font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-neutral-300">Status</Label>
                <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="Ativo">Ativo (Trabalhando normalmente)</SelectItem>
                    <SelectItem value="Férias">Férias / Ausência temporária</SelectItem>
                    <SelectItem value="Inativo">Inativo / Desativado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-neutral-300">Observações & Especialidades</Label>
                <Textarea
                  placeholder="Ex: Especialista em Google Ads, Copy de Alta Conversão, disponibilidade aos sábados..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl text-sm min-h-[70px] focus-visible:ring-brand"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeModal}
              className="border-white/10 text-neutral-300 hover:bg-white/5 rounded-xl text-xs h-10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={addMutation.isPending || updateMutation.isPending}
              className="gradient-brand text-black font-extrabold text-xs h-10 px-5 rounded-xl shadow-lg shadow-brand/20 hover:opacity-95"
            >
              {addMutation.isPending || updateMutation.isPending
                ? "Salvando..."
                : editingColab
                ? "Atualizar Colaborador"
                : "Cadastrar Colaborador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
