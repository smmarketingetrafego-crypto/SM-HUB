import { createFileRoute } from '@tanstack/react-router';
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import {
  Briefcase,
  Clock,
  Search,
  Filter,
  Plus,
  Calendar,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  List,
  Edit,
  Trash2,
  ExternalLink,
  DollarSign,
  AlertCircle,
  TrendingUp,
  User,
  SlidersHorizontal,
  FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProjects, addProject, updateProject, deleteProject } from "@/lib/api-projetos.server";
import { getClients } from "@/lib/api-clientes.server";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/projetos")({
  head: () => ({
    meta: [
      { title: "Projetos & Entregas — SM Hub" },
      { name: "description", content: "Acompanhe a entrega dos serviços e cronogramas dos clientes." },
    ],
  }),
  component: ProjetosPage,
});

function ProjetosPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    client: '',
    budget: 0,
    status: 'Em andamento',
    progress: 10,
    dateStart: '',
    dateEnd: ''
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects()
  });

  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients()
  });

  const clients = clientsData.clients || [];

  const addProjMutation = useMutation({
    mutationFn: async (data: any) => addProject({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Projeto criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        setIsModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const updateProjMutation = useMutation({
    mutationFn: async (data: any) => updateProject({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Projeto atualizado!");
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        setIsModalOpen(false);
        setDetailModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteProjMutation = useMutation({
    mutationFn: async (id: string) => deleteProject({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Projeto excluído com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        setDetailModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.client) {
      toast.error("Nome do Projeto e Cliente são obrigatórios.");
      return;
    }
    if (formData.id) {
      updateProjMutation.mutate(formData);
    } else {
      addProjMutation.mutate(formData);
    }
  };

  const handleOpenNew = () => {
    setFormData({
      id: '',
      name: '',
      client: clients[0]?.name || '',
      budget: 2500,
      status: 'Em andamento',
      progress: 10,
      dateStart: new Date().toISOString().split('T')[0],
      dateEnd: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenDetail = (proj: any) => {
    setEditingProject(proj);
    setFormData({
      id: proj.id,
      name: proj.name,
      client: proj.client,
      budget: proj.budget || 0,
      status: proj.status || 'Em andamento',
      progress: proj.progress || 0,
      dateStart: proj.dateStart || proj.startDate || '',
      dateEnd: proj.dateEnd || proj.endDate || ''
    });
    setDetailModalOpen(true);
  };

  // Filtragem e busca
  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === "todos") return true;
      return (p.status || "").toLowerCase().includes(statusFilter.toLowerCase());
    });
  }, [projects, searchQuery, statusFilter]);

  // Estatísticas Rápidas
  const totalCount = projects.length;
  const inProgressCount = projects.filter((p: any) => p.status === "Em andamento" || p.status === "in_progress").length;
  const completedCount = projects.filter((p: any) => p.status === "Concluído" || p.progress === 100).length;
  const delayedCount = projects.filter((p: any) => p.status === "Atrasado").length;

  return (
    <div className="space-y-6 pb-20">
      <TutorialBanner location="Projetos" />

      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Projetos & Entregas</h1>
            <Badge className="bg-brand/10 text-brand border-brand/20 font-bold text-xs">{totalCount} Projetos</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Acompanhe o progresso das entregas, prazos contratuais e status de cada cliente.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#111] border border-white/10 rounded-xl p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 rounded-lg ${viewMode === "grid" ? "bg-white/10 text-brand" : "text-gray-500 hover:text-white"}`}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 rounded-lg ${viewMode === "list" ? "bg-white/10 text-brand" : "text-gray-500 hover:text-white"}`}
            >
              <List className="size-4" />
            </Button>
          </div>

          <Button
            onClick={handleOpenNew}
            className="gradient-brand text-black font-semibold h-10 px-4 rounded-xl text-xs gap-2 shadow-lg shadow-brand/20"
          >
            <Plus className="size-4" /> Novo Projeto
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111318] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-gray-400">Total de Projetos</div>
          <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
        </div>
        <div className="bg-[#111318] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-brand">Em Andamento</div>
          <div className="text-2xl font-bold text-brand mt-1">{inProgressCount}</div>
        </div>
        <div className="bg-[#111318] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-emerald-400">Concluídos</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{completedCount}</div>
        </div>
        <div className="bg-[#111318] border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-red-400">Atrasados / Atenção</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{delayedCount}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111318] border border-white/10 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome do projeto ou cliente..."
            className="pl-9 h-9 bg-black/50 border-white/10 text-white rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 bg-black/50 border-white/10 text-xs text-white rounded-xl">
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="andamento">Em Andamento</SelectItem>
              <SelectItem value="fila">Na Fila</SelectItem>
              <SelectItem value="concluído">Concluído</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Projetos */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((proj: any) => {
            const isCompleted = proj.progress === 100 || proj.status === "Concluído";
            const isDelayed = proj.status === "Atrasado";

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenDetail(proj)}
                className="bg-[#111318] border border-white/10 rounded-2xl p-5 hover:border-brand/50 transition-all group shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                        <Briefcase className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-brand transition-colors line-clamp-1">
                          {proj.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <User className="size-3 text-brand" /> {proj.client}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={`text-[10px] font-bold border-0 uppercase ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isDelayed
                          ? "bg-red-500/20 text-red-400"
                          : "bg-brand/20 text-brand"
                      }`}
                    >
                      {proj.status || "Em andamento"}
                    </Badge>
                  </div>

                  {proj.budget ? (
                    <div className="text-xs text-gray-400 mb-4 flex items-center gap-1 font-mono">
                      <span>Orçamento:</span>
                      <strong className="text-white">{brl(proj.budget)}</strong>
                    </div>
                  ) : null}

                  {/* Barra de Progresso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="text-gray-400 font-medium">Progresso</span>
                      <span className="font-bold text-white font-mono">{proj.progress || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? "bg-emerald-400" : "bg-gradient-to-r from-brand to-amber-300"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, proj.progress || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-brand" />
                    <span>
                      {proj.dateEnd
                        ? `Entrega: ${new Date(proj.dateEnd + 'T12:00:00').toLocaleDateString('pt-BR')}`
                        : proj.deadline || "Prazo Contratual"}
                    </span>
                  </div>

                  <span className="text-brand text-xs font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Gerenciar <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Lista Compacta de Projetos */
        <div className="bg-[#111318] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
          {filteredProjects.map((proj: any) => (
            <div
              key={proj.id}
              onClick={() => handleOpenDetail(proj)}
              className="p-4 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="size-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                  <Briefcase className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white hover:text-brand">{proj.name}</h4>
                  <div className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                    <span>Cliente: {proj.client}</span>
                    {proj.budget && <span>• {brl(proj.budget)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-32 hidden sm:block">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-400">Progresso</span>
                    <span className="text-white font-bold">{proj.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full"
                      style={{ width: `${proj.progress || 0}%` }}
                    />
                  </div>
                </div>

                <Badge className="text-[10px] uppercase font-bold bg-white/5 border border-white/10 text-gray-300">
                  {proj.status || "Em andamento"}
                </Badge>

                <ChevronRight className="size-4 text-gray-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Projeto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0D0F14] border border-white/10 text-white rounded-3xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderKanban className="size-5 text-brand" />
              Novo Projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Cadastre um novo serviço e acompanhe o cronograma de entrega.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Nome do Projeto *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Gestão de Tráfego & Campanhas Meta"
                className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Cliente Relacionado *</Label>
              {clients.length > 0 ? (
                <Select
                  value={formData.client}
                  onValueChange={(val) => setFormData({ ...formData, client: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    {clients.map((c: any) => (
                      <SelectItem key={c.id || c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  placeholder="Nome do cliente..."
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Valor / Orçamento (R$)</Label>
                <Input
                  type="number"
                  value={formData.budget || ""}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  placeholder="Ex: 2500"
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Status Inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    <SelectItem value="Na Fila">Na Fila</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Em revisão">Em revisão</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Data de Início</Label>
                <Input
                  type="date"
                  value={formData.dateStart}
                  onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Previsão de Entrega</Label>
                <Input
                  type="date"
                  value={formData.dateEnd}
                  onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="bg-transparent border-white/10 text-white text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={addProjMutation.isPending}
                className="gradient-brand text-black font-semibold text-xs"
                onClick={handleSave}
              >
                {addProjMutation.isPending ? "Criando..." : "Salvar Projeto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes & Gerenciamento Rápido do Projeto */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="bg-[#0D0F14] border border-white/10 text-white rounded-3xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="size-5 text-brand" />
                Gerenciar Projeto
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Deseja realmente remover este projeto?")) {
                    deleteProjMutation.mutate(formData.id);
                  }
                }}
                className="h-8 px-2.5 text-xs border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="size-3.5 mr-1" /> Excluir
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Nome do Projeto</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Cliente</Label>
                <Input
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    <SelectItem value="Na Fila">Na Fila</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Em revisão">Em revisão</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Slider de Progresso Interativo */}
            <div className="space-y-2 bg-black/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">Progresso da Execução:</span>
                <span className="font-bold text-brand font-mono text-sm">{formData.progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.progress || 0}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                className="w-full accent-[#C9A227] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>0% (Início)</span>
                <span>50% (Metade)</span>
                <span>100% (Entregue)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Orçamento (R$)</Label>
                <Input
                  type="number"
                  value={formData.budget || ""}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Data de Entrega</Label>
                <Input
                  type="date"
                  value={formData.dateEnd}
                  onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="bg-transparent border-white/10 text-white text-xs"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                disabled={updateProjMutation.isPending}
                className="gradient-brand text-black font-semibold text-xs px-5"
                onClick={handleSave}
              >
                {updateProjMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
