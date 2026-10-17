import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from "@/components/layout/page-header";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  CheckCircle2,
  MessageCircle,
  User,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Briefcase,
  AlertTriangle,
  Flag,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  DEFAULT_TEAM_MEMBERS,
  type TaskRecord,
  type TaskAssignee
} from "@/lib/api-tarefas.functions";
import { getProjects } from "@/lib/api-projetos.functions";
import { getCollaborators } from "@/lib/api-colaboradores.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Quadro de Tarefas & Equipe — SM Hub' },
      { property: 'og:description', content: 'Gerencie tarefas, atribua responsáveis e acompanhe prazos da equipe.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Quadro de Tarefas & Equipe — SM Hub" },
      { name: "description", content: "Gerencie tarefas, atribua responsáveis e acompanhe prazos da equipe." },
    ],
  }),
  component: TarefasPage,
});

const STATUS_COLUMNS = [
  { id: "A Fazer", title: "A Fazer", color: "bg-blue-500", border: "border-blue-500/20" },
  { id: "Em Andamento", title: "Em Andamento", color: "bg-amber-400", border: "border-amber-400/20" },
  { id: "Revisão", title: "Revisão", color: "bg-purple-400", border: "border-purple-400/20" },
  { id: "Concluído", title: "Concluído", color: "bg-emerald-400", border: "border-emerald-400/20" },
] as const;

function TarefasPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("todos");
  const [priorityFilter, setPriorityFilter] = useState<string>("todos");

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks()
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects()
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ['collaborators'],
    queryFn: () => getCollaborators()
  });

  const teamMembers = useMemo(() => {
    if (collaborators.length > 0) {
      return collaborators.map((c: any) => ({
        name: c.name,
        role: c.role,
        avatar: c.avatar || (c.name ? c.name.charAt(0).toUpperCase() : "U"),
      }));
    }
    return DEFAULT_TEAM_MEMBERS;
  }, [collaborators]);

  const [formData, setFormData] = useState<any>({
    id: '',
    title: '',
    desc: '',
    date: '',
    tags: '',
    status: 'A Fazer',
    priority: 'Média',
    assigneeName: DEFAULT_TEAM_MEMBERS[0].name,
    assigneeRole: DEFAULT_TEAM_MEMBERS[0].role,
    project: ''
  });

  const addTaskMutation = useMutation({
    mutationFn: async (data: any) => addTask({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tarefa criada!");
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: any) => updateTask({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tarefa atualizada!");
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => deleteTask({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tarefa removida!");
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        setIsModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    const payload: Partial<TaskRecord> = {
      id: formData.id,
      title: formData.title,
      desc: formData.desc,
      date: formData.date || "Esta semana",
      status: formData.status,
      priority: formData.priority,
      project: formData.project,
      assignee: {
        name: formData.assigneeName,
        role: formData.assigneeRole,
      },
      tags: typeof formData.tags === 'string'
        ? formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : formData.tags
    };

    if (formData.id) {
      updateTaskMutation.mutate(payload);
    } else {
      addTaskMutation.mutate(payload);
    }
  };

  const handleOpenNew = (status = 'A Fazer') => {
    const defaultMember = teamMembers[0] || DEFAULT_TEAM_MEMBERS[0];
    setFormData({
      id: '',
      title: '',
      desc: '',
      date: 'Esta semana',
      tags: '',
      status,
      priority: 'Média',
      assigneeName: defaultMember.name,
      assigneeRole: defaultMember.role,
      project: projects[0]?.name || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: TaskRecord) => {
    const defaultMember = teamMembers[0] || DEFAULT_TEAM_MEMBERS[0];
    setFormData({
      id: task.id,
      title: task.title,
      desc: task.desc || '',
      date: task.date || '',
      tags: task.tags?.join(', ') || '',
      status: task.status,
      priority: task.priority || 'Média',
      assigneeName: task.assignee?.name || defaultMember.name,
      assigneeRole: task.assignee?.role || defaultMember.role,
      project: task.project || ''
    });
    setIsModalOpen(true);
  };

  // Mover tarefa para a próxima coluna
  const handleMoveColumn = (task: TaskRecord, direction: "next" | "prev", e: React.MouseEvent) => {
    e.stopPropagation();
    const order: Array<TaskRecord["status"]> = ["A Fazer", "Em Andamento", "Revisão", "Concluído"];
    const currentIndex = order.indexOf(task.status);
    let newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < order.length) {
      const nextStatus = order[newIndex];
      updateTaskMutation.mutate({ id: task.id, status: nextStatus });
      toast.success(`Tarefa movida para "${nextStatus}"`);
    }
  };

  // Filtragem
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.desc && t.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.assignee?.name && t.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (assigneeFilter !== "todos" && t.assignee?.name !== assigneeFilter) {
        return false;
      }

      if (priorityFilter !== "todos" && t.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, assigneeFilter, priorityFilter]);

  const columnsWithTasks = STATUS_COLUMNS.map((col) => ({
    ...col,
    tasks: filteredTasks.filter((t) => t.status === col.id)
  }));

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case "Urgente":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Alta":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Média":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-2rem)] pb-8">
      <TutorialBanner location="Tarefas" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Quadro de Tarefas & Equipe</h1>
            <Badge className="bg-brand/10 text-brand border-brand/20 font-bold text-xs">{tasks.length} Tarefas</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Atribua responsáveis, delegue funções estratégicas e acompanhe a execução dos projetos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => handleOpenNew()}
            className="gradient-brand text-black font-semibold h-10 px-4 rounded-xl text-xs gap-2 shadow-lg shadow-brand/20"
          >
            <Plus className="size-4" /> Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111318] border border-white/10 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, responsável ou descrição..."
            className="pl-9 h-9 bg-black/50 border-white/10 text-white rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[170px] h-9 bg-black/50 border-white/10 text-xs text-white rounded-xl">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
              <SelectItem value="todos">Todos os Responsáveis</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.name} value={m.name}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-black/50 border-white/10 text-xs text-white rounded-xl">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
              <SelectItem value="todos">Todas as Prioridades</SelectItem>
              <SelectItem value="Urgente">Urgente</SelectItem>
              <SelectItem value="Alta">Alta</SelectItem>
              <SelectItem value="Média">Média</SelectItem>
              <SelectItem value="Baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full gap-5 min-w-max">
          {columnsWithTasks.map((col, colIdx) => (
            <div key={col.id} className="flex flex-col w-[310px] shrink-0 h-full">
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-sm text-white">{col.title}</h3>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-400 text-xs px-2 py-0">
                    {col.tasks.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenNew(col.id)}
                  className="h-7 w-7 text-gray-500 hover:text-white rounded-lg"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {col.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleOpenEdit(task)}
                    className="bg-[#111318] border border-white/10 p-4 rounded-2xl hover:border-brand/40 transition-all cursor-pointer group shadow-lg space-y-3"
                  >
                    {/* Top Tag & Prioridade */}
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 border ${getPriorityBadgeClass(task.priority)}`}
                      >
                        {task.priority || "Média"}
                      </Badge>

                      {task.project && (
                        <span className="text-[10px] text-gray-400 font-medium truncate max-w-[130px] flex items-center gap-1">
                          <Briefcase className="size-3 text-brand shrink-0" />
                          {task.project}
                        </span>
                      )}
                    </div>

                    {/* Título & Descrição */}
                    <div>
                      <h4 className="text-sm text-white font-bold group-hover:text-brand transition-colors line-clamp-2">
                        {task.title}
                      </h4>
                      {task.desc && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {task.desc}
                        </p>
                      )}
                    </div>

                    {/* Responsável com Cargo e Avatar */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                          {(task.assignee?.name || "SM").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white leading-tight">
                            {task.assignee?.name || "Não atribuído"}
                          </div>
                          <div className="text-[10px] text-gray-400 leading-tight">
                            {task.assignee?.role || "Membro da equipe"}
                          </div>
                        </div>
                      </div>

                      {/* Botão de avanço rápido */}
                      <div className="flex items-center gap-1">
                        {colIdx > 0 && (
                          <button
                            onClick={(e) => handleMoveColumn(task, "prev", e)}
                            className="size-6 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                            title="Voltar etapa"
                          >
                            <ArrowLeft className="size-3" />
                          </button>
                        )}
                        {colIdx < STATUS_COLUMNS.length - 1 && (
                          <button
                            onClick={(e) => handleMoveColumn(task, "next", e)}
                            className="size-6 rounded-md bg-brand/20 hover:bg-brand/30 text-brand flex items-center justify-center transition-colors font-bold"
                            title="Avançar etapa"
                          >
                            <ArrowRight className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rodapé: Prazo */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-brand" />
                        <span>{task.date || "Sem prazo"}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={() => handleOpenNew(col.id)}
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-white hover:bg-white/5 border border-dashed border-white/10 rounded-2xl h-11 text-xs"
                >
                  <Plus className="mr-1.5 size-4" /> Adicionar tarefa em {col.title}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Criar / Editar Tarefa */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0D0F14] border border-white/10 text-white rounded-3xl max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-brand" />
              {formData.id ? "Editar Tarefa" : "Nova Tarefa da Equipe"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Defina o escopo, prioridade, responsável e projeto vinculado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Título da Tarefa *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Subir criativos de vídeo para campanha Meta Ads"
                className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Descrição / Instruções</Label>
              <Input
                value={formData.desc}
                onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                placeholder="Detalhes do que precisa ser executado..."
                className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
              />
            </div>

            {/* Responsável e Função */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Responsável *</Label>
                <Select
                  value={formData.assigneeName}
                  onValueChange={(val) => {
                    const found = teamMembers.find((m) => m.name === val);
                    setFormData({
                      ...formData,
                      assigneeName: val,
                      assigneeRole: found?.role || formData.assigneeRole
                    });
                  }}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    {teamMembers.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Cargo / Função</Label>
                <Input
                  value={formData.assigneeRole}
                  onChange={(e) => setFormData({ ...formData, assigneeRole: e.target.value })}
                  placeholder="Ex: Gestor de Tráfego"
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Projeto e Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Projeto Vinculado</Label>
                {projects.length > 0 ? (
                  <Select
                    value={formData.project}
                    onValueChange={(val) => setFormData({ ...formData, project: val })}
                  >
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                      <SelectValue placeholder="Selecione um projeto..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                      {projects.map((p: any) => (
                        <SelectItem key={p.id || p.name} value={p.name}>
                          {p.name} ({p.client})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    placeholder="Nome do projeto..."
                    className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    <SelectItem value="Baixa">🟢 Baixa</SelectItem>
                    <SelectItem value="Média">🔵 Média</SelectItem>
                    <SelectItem value="Alta">🟠 Alta</SelectItem>
                    <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coluna e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Status da Coluna</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    {STATUS_COLUMNS.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Prazo de Entrega</Label>
                <Input
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="Ex: 20/10/2026 ou Amanhã"
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="pt-3 flex items-center justify-between border-t border-white/10">
              {formData.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTaskMutation.mutate(formData.id)}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                >
                  <Trash2 className="size-3.5 mr-1" /> Excluir
                </Button>
              ) : <div />}

              <div className="flex gap-2">
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
                  disabled={addTaskMutation.isPending || updateTaskMutation.isPending}
                  className="gradient-brand text-black font-semibold text-xs px-5"
                  onClick={handleSave}
                >
                  {addTaskMutation.isPending || updateTaskMutation.isPending ? "Salvando..." : "Salvar Tarefa"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
