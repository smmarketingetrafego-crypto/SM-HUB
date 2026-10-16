import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from "@/components/layout/page-header";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Image as ImageIcon,
  Video,
  AlignLeft,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  Trash2,
  Clock,
  Sparkles,
  Layers,
  User,
  CheckCircle2,
  CalendarDays,
  List,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getScheduledPosts,
  saveScheduledPost,
  deleteScheduledPost,
  type ScheduledPost
} from "@/lib/api-conteudo.server";
import { getClients } from "@/lib/api-clientes.server";
import { toast } from "sonner";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday as checkIsToday
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/calendario-conteudo")({
  head: () => ({
    meta: [
      { title: "Calendário de Conteúdo & Redes Sociais — SM Hub" },
      { name: "description", content: "Planeje, visualize e agende publicações nas redes sociais dos seus clientes." },
    ],
  }),
  component: CalendarioPage,
});

const PLATFORM_CONFIG: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-400", badge: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  tiktok: { label: "TikTok", icon: Video, color: "text-cyan-400", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  youtube: { label: "YouTube", icon: Youtube, color: "text-red-400", badge: "bg-red-500/10 text-red-400 border-red-500/20" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "text-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  facebook: { label: "Facebook", icon: Facebook, color: "text-indigo-400", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  blog: { label: "Blog", icon: AlignLeft, color: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

function CalendarioPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"calendar" | "kanban" | "list">("calendar");
  const [contentCategories, setContentCategories] = useState<Array<{ id: string; name: string; color: string }>>([
    { id: "reels", name: "Reels / Vídeo", color: "#EC4899" },
    { id: "carrossel", name: "Carrossel", color: "#C9A227" },
    { id: "imagem", name: "Post Estático", color: "#3B82F6" },
    { id: "stories", name: "Stories Diários", color: "#F97316" },
    { id: "artigo", name: "Artigo / Blog", color: "#10B981" },
  ]);

  useEffect(() => {
    const loadCategories = () => {
      try {
        const stored = localStorage.getItem("smhub_page_appearances");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.contentCategories?.length) {
            setContentCategories(parsed.contentCategories);
          }
        }
      } catch (e) {}
    };
    loadCategories();
    window.addEventListener("smhub-theme-changed", loadCategories);
    return () => window.removeEventListener("smhub-theme-changed", loadCategories);
  }, []);

  const getFormatBadgeStyle = (format: string) => {
    const cat = contentCategories.find(
      (c) => c.id === format || c.name.toLowerCase().includes(format.toLowerCase())
    );
    if (cat?.color) {
      return {
        backgroundColor: `${cat.color}20`,
        borderColor: `${cat.color}40`,
        color: cat.color,
      };
    }
    return undefined;
  };

  const [formData, setFormData] = useState<Partial<ScheduledPost>>({
    id: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    platform: 'instagram',
    format: 'reels',
    status: 'planejado',
    caption: '',
    client: 'Geral'
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['scheduled-posts'],
    queryFn: () => getScheduledPosts()
  });

  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients()
  });

  const clients = clientsData.clients || [];

  const saveMutation = useMutation({
    mutationFn: (data: Partial<ScheduledPost>) => saveScheduledPost({ data }),
    onSuccess: () => {
      toast.success("Postagem salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduledPost({ data: id }),
    onSuccess: () => {
      toast.success("Postagem removida.");
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      setIsModalOpen(false);
    }
  });

  // Dias da grade do calendário
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Navegação
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleOpenDay = (day: Date) => {
    const formattedDate = format(day, "yyyy-MM-dd");
    setFormData({
      id: '',
      title: '',
      date: formattedDate,
      time: '18:00',
      platform: 'instagram',
      format: 'reels',
      status: 'planejado',
      caption: '',
      client: clients[0]?.name || 'Geral'
    });
    setSelectedPost(null);
    setIsModalOpen(true);
  };

  const handleOpenPost = (post: ScheduledPost, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setFormData({ ...post });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.error("Informe o título do post.");
      return;
    }
    saveMutation.mutate(formData);
  };

  // Filtragem dos posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (platformFilter !== "todas" && p.platform !== platformFilter) return false;
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      return true;
    });
  }, [posts, platformFilter, statusFilter]);

  const monthLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-2rem)] pb-12">
      <TutorialBanner location="Calendário" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Conteúdos & Redes Sociais</h1>
            <Badge className="bg-brand/10 text-brand border-brand/20 font-bold text-xs">{posts.length} Posts</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Planejamento editorial, fluxo de produção e cronograma de publicações dos clientes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#111318] border border-white/10 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-brand text-black font-bold shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <CalendarDays className="size-3.5" />
              <span>Calendário</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-brand text-black font-bold shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FolderKanban className="size-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-brand text-black font-bold shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="size-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <Button
            onClick={() => handleOpenDay(new Date())}
            className="gradient-brand text-black font-semibold h-10 px-4 rounded-xl text-xs gap-2 shadow-lg shadow-brand/20 cursor-pointer"
          >
            <Plus className="size-4" /> Novo Conteúdo
          </Button>
        </div>
      </div>

      {/* Barra de Navegação de Mês e Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111318] border border-white/10 p-3 rounded-2xl">
        {viewMode === "calendar" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="bg-black/50 border-white/10 text-white text-xs h-9 px-3 hover:bg-white/5 cursor-pointer"
            >
              Hoje
            </Button>
            <div className="flex items-center rounded-xl border border-white/10 bg-black/50 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8 text-gray-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-white font-bold px-3 text-xs capitalize min-w-[130px] text-center">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 text-gray-400 hover:text-white cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 flex items-center gap-2 px-2">
            <span className="text-brand font-bold">•</span>
            <span>Total de <strong>{filteredPosts.length}</strong> publicações filtradas</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px] h-9 bg-black/50 border-white/10 text-xs text-white rounded-xl">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
              <SelectItem value="todas">Todas Redes</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 bg-black/50 border-white/10 text-xs text-white rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="planejado">Planejado</SelectItem>
              <SelectItem value="em_producao">Em Produção</SelectItem>
              <SelectItem value="agendado">Agendado</SelectItem>
              <SelectItem value="publicado">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grade do Calendário */}
      {viewMode === "calendar" && (
        <div className="flex-1 rounded-3xl border border-white/10 bg-[#0A0D14] overflow-hidden flex flex-col shadow-2xl">
        {/* Header dos Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-[#0E1118]">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-r border-white/5 last:border-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Células de Dias */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-[#07090E]">
          {calendarDays.map((day, i) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = checkIsToday(day);
            const dayPosts = filteredPosts.filter((p) => p.date === dateStr);

            return (
              <div
                key={dateStr || i}
                onClick={() => handleOpenDay(day)}
                className={`border-r border-b border-white/5 last:border-r-0 p-2 min-h-[110px] transition-all hover:bg-white/[0.03] cursor-pointer flex flex-col justify-between group ${
                  !isCurrentMonth ? "opacity-30 bg-black/20" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold size-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                        isToday
                          ? "bg-brand text-black shadow-md shadow-brand/30"
                          : "text-gray-400 group-hover:text-white"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-brand transition-opacity font-bold">
                      +
                    </span>
                  </div>

                  {/* Lista de Posts no Dia */}
                  <div className="space-y-1.5">
                    {dayPosts.map((post) => {
                      const cfg = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.instagram;
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={post.id}
                          onClick={(e) => handleOpenPost(post, e)}
                          className="bg-[#12151D] border border-white/10 rounded-xl p-2 hover:border-brand/60 hover:bg-[#181C26] transition-all shadow-sm group/post"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <Icon className={`size-3 ${cfg.color} shrink-0`} />
                              <span className="text-[10px] font-mono text-gray-400">{post.time || "18:00"}</span>
                            </div>
                            <span
                              className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border"
                              style={
                                getFormatBadgeStyle(post.format) || {
                                  backgroundColor: "rgba(201, 162, 39, 0.15)",
                                  borderColor: "rgba(201, 162, 39, 0.3)",
                                  color: "#C9A227",
                                }
                              }
                            >
                              {post.format}
                            </span>
                          </div>

                          <p className="text-[11px] text-white font-semibold truncate group-hover/post:text-brand transition-colors">
                            {post.title}
                          </p>

                          {post.client && post.client !== "Geral" && (
                            <div className="text-[9px] text-gray-500 truncate mt-0.5">
                              {post.client}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {dayPosts.length === 0 && isCurrentMonth && (
                  <div className="text-[10px] text-transparent group-hover:text-gray-600 transition-colors pt-2">
                    Clique p/ agendar
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* VISÃO 2: QUADRO KANBAN DE PRODUÇÃO */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
          {[
            { id: "planejado", title: "Planejamento & Ideias", color: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
            { id: "em_producao", title: "Em Produção / Criação", color: "border-purple-500/30 bg-purple-500/5 text-purple-400" },
            { id: "agendado", title: "Aprovado & Agendado", color: "border-blue-500/30 bg-blue-500/5 text-blue-400" },
            { id: "publicado", title: "Publicado / No Ar", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" },
          ].map((col) => {
            const colPosts = filteredPosts.filter((p) => p.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-[#0e0e11] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 min-h-[420px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${col.color.split(" ")[2].replace("text-", "bg-")}`} />
                    <span className="text-xs font-bold text-white">{col.title}</span>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">
                    {colPosts.length}
                  </Badge>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colPosts.map((post) => {
                    const cfg = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.instagram;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={post.id}
                        onClick={(e) => handleOpenPost(post, e)}
                        className="bg-[#141418] border border-white/5 hover:border-brand/40 p-3 rounded-xl transition-all cursor-pointer group space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`size-3.5 ${cfg.color}`} />
                            <span className="text-[10px] uppercase font-bold text-gray-400">{post.platform}</span>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">{post.date}</span>
                        </div>

                        <h4 className="text-xs font-bold text-white group-hover:text-brand transition-colors line-clamp-2">
                          {post.title}
                        </h4>

                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-gray-400">
                          <span className="truncate max-w-[120px] font-medium">{post.client || "Geral"}</span>
                          <span
                            className="capitalize px-1.5 py-0.5 rounded text-[10px] font-bold border"
                            style={
                              getFormatBadgeStyle(post.format) || {
                                backgroundColor: "rgba(201, 162, 39, 0.15)",
                                borderColor: "rgba(201, 162, 39, 0.3)",
                                color: "#C9A227",
                              }
                            }
                          >
                            {post.format}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {colPosts.length === 0 && (
                    <div className="h-32 flex items-center justify-center border border-dashed border-white/5 rounded-xl text-[11px] text-gray-600">
                      Nenhum post nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISÃO 3: LISTA / TABELA */}
      {viewMode === "list" && (
        <div className="bg-[#0e0e11] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141418] border-b border-white/5 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Título / Tema</th>
                  <th className="p-3.5">Rede Social</th>
                  <th className="p-3.5">Formato</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Data & Horário</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPosts.map((post) => {
                  const cfg = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.instagram;
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={post.id}
                      onClick={(e) => handleOpenPost(post, e)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 font-bold text-white group-hover:text-brand transition-colors max-w-xs truncate">
                        {post.title}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`size-4 ${cfg.color}`} />
                          <span className="capitalize text-gray-300">{post.platform}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize"
                          style={
                            getFormatBadgeStyle(post.format) || {
                              backgroundColor: "rgba(201, 162, 39, 0.15)",
                              borderColor: "rgba(201, 162, 39, 0.3)",
                              color: "#C9A227",
                            }
                          }
                        >
                          {post.format}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-300 font-medium">{post.client || "Geral"}</td>
                      <td className="p-3.5 font-mono text-gray-400 text-[11px]">
                        {post.date} às {post.time || "18:00"}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            post.status === "publicado"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : post.status === "agendado"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : post.status === "em_producao"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {post.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenPost(post, e)}
                          className="text-xs text-brand hover:text-white hover:bg-white/5 h-8 px-2.5 cursor-pointer"
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredPosts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Nenhum conteúdo encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Agendar / Editar Postagem */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#0D0F14] border border-white/10 text-white rounded-3xl max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="size-5 text-brand" />
              {formData.id ? "Editar Publicação" : "Agendar Publicação"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Planeje a data, horário, legenda e cliente da postagem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Tema / Título do Conteúdo *</Label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: 3 Segredos para Escalar Vendas no Instagram"
                className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Rede Social *</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(val: any) => setFormData({ ...formData, platform: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="blog">Blog / Artigo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Formato *</Label>
                <Select
                  value={formData.format}
                  onValueChange={(val: any) => setFormData({ ...formData, format: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    <SelectItem value="reels">Vídeo / Reels / Shorts</SelectItem>
                    <SelectItem value="carrossel">Carrossel de Imagens</SelectItem>
                    <SelectItem value="imagem">Imagem Estática</SelectItem>
                    <SelectItem value="stories">Stories Diários</SelectItem>
                    <SelectItem value="artigo">Artigo de Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Data de Publicação *</Label>
                <Input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Horário</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Cliente / Projeto</Label>
                {clients.length > 0 ? (
                  <Select
                    value={formData.client}
                    onValueChange={(val) => setFormData({ ...formData, client: val })}
                  >
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                      <SelectItem value="Geral">Geral (Próprio SM HUB)</SelectItem>
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

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Status Editorial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="bg-black/60 border-white/10 text-white h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#151922] border-white/10 text-white text-xs">
                    <SelectItem value="planejado">💡 Planejado / Ideia</SelectItem>
                    <SelectItem value="em_producao">🎨 Em Produção / Design</SelectItem>
                    <SelectItem value="agendado">📅 Agendado / Pronto</SelectItem>
                    <SelectItem value="publicado">✅ Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Legenda / Copy / Roteiro (Opcional)</Label>
              <Textarea
                rows={3}
                value={formData.caption || ""}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Rascunho da legenda, hashtags ou orientações para o designer..."
                className="bg-black/60 border-white/10 text-white text-xs rounded-xl resize-none"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-white/10">
              {formData.id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(formData.id!)}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs"
                >
                  <Trash2 className="size-3.5 mr-1" /> Excluir
                </Button>
              ) : <div />}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-transparent border-white/10 text-white text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="gradient-brand text-black font-semibold text-xs px-5"
                >
                  {saveMutation.isPending ? "Salvando..." : "Salvar Agendamento"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
