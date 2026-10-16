import { createFileRoute } from '@tanstack/react-router';
import { PlayCircle, Video, Play, LayoutGrid, Search, X, Plus, Pencil, Trash2, Check, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore, setStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTutorials, saveTutorialItem, deleteTutorialItem, type TutorialItem } from "@/lib/api-tutoriais.functions";

export const Route = createFileRoute("/tutoriais")({
  head: () => ({
    meta: [
      { title: "Tutoriais — SM Hub" },
      { name: "description", content: "Aprenda a extrair o máximo da plataforma com aulas práticas e passo a passo." },
    ],
  }),
  component: TutoriaisPage,
});

const CATEGORIES = ["Todos", "Iniciante", "Gestão", "Vendas", "Marketing", "Produtividade", "Integrações"];

function TutoriaisPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [editing, setEditing] = useState<Partial<TutorialItem> | null>(null);

  const { data: tutorials = [] } = useQuery({
    queryKey: ['tutorials'],
    queryFn: () => getTutorials(),
  });

  const saveMutation = useMutation({
    mutationFn: async (item: Partial<TutorialItem>) => saveTutorialItem({ data: item }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tutorial salvo com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['tutorials'] });
        setEditing(null);
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteTutorialItem({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tutorial removido.");
        queryClient.invalidateQueries({ queryKey: ['tutorials'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const setActiveVideo = (video: any) => setStore({ activeVideo: video });

  const filtered = useMemo(() => {
    return tutorials.filter((vid) => {
      if (categoryFilter !== "Todos" && vid.category !== categoryFilter) return false;
      if (search && !vid.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tutorials, search, categoryFilter]);

  const featured = tutorials[0] || {};
  const gridVideos = search || categoryFilter !== "Todos" ? filtered : filtered.slice(1);

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(201,162,39,0.15)]">
            <Video className="size-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Central de Aulas & Tutoriais</h1>
            <p className="text-gray-400">Domine cada módulo do SM Hub com treinamentos práticos em vídeo</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar tutorial..." 
              className="pl-9 bg-[#111111] border-white/10 rounded-xl h-10 text-white placeholder:text-gray-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            onClick={() => setEditing({ category: "Iniciante", locations: ["Aba Tutoriais"] })}
            className="gradient-brand hover:brightness-110 text-primary-foreground h-10 px-4 rounded-xl text-sm font-semibold shrink-0 border-0 shadow-[0_0_15px_rgba(201,162,39,0.3)]"
          >
            <Plus className="mr-2 size-4" /> Novo Tutorial
          </Button>
        </div>
      </div>

      {/* Hero Video Section (Hide when filtering) */}
      {!search && categoryFilter === "Todos" && featured.id && (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111] p-1">
          <div className="flex flex-col md:flex-row gap-6 p-5">
            <div 
              onClick={() => setActiveVideo(featured)}
              className="relative w-full md:w-[600px] h-[300px] rounded-xl overflow-hidden bg-black/50 border border-white/5 flex-shrink-0 group cursor-pointer"
            >
              <img src={featured.thumbnail} alt={featured.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-20 rounded-full bg-brand/90 text-white flex items-center justify-center pl-1 shadow-[0_0_40px_rgba(201,162,39,0.5)] group-hover:scale-110 transition-transform">
                  <Play className="size-10" />
                </div>
              </div>
              <div className="absolute bottom-4 right-4 bg-black/80 px-2.5 py-1 rounded-md text-xs font-semibold text-white">
                {featured.duration}
              </div>
              <div className="absolute top-4 left-4 bg-brand/90 text-black px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                {featured.category}
              </div>
            </div>
            
            <div className="flex flex-col justify-center flex-1">
              <div className="flex items-center gap-2 text-brand font-semibold text-sm mb-3">
                <PlayCircle className="size-4" /> Aula em Destaque
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">{featured.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xl">
                {featured.description}
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={() => setActiveVideo(featured)} className="bg-brand hover:brightness-110 text-primary-foreground h-12 px-8 rounded-xl font-bold shadow-[0_0_20px_rgba(201,162,39,0.3)]">
                  <Play className="mr-2 size-5" /> Assistir Aula
                </Button>
                <Button variant="outline" size="icon" onClick={() => setEditing(featured)} className="border-white/10 text-gray-400 hover:text-white h-12 w-12 rounded-xl">
                  <Pencil className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 text-gray-400 bg-[#111111] border border-white/5 rounded-xl hover:text-white" onClick={() => { setSearch(""); setCategoryFilter("Todos"); }}>
          <LayoutGrid className="size-4" />
        </Button>
        {CATEGORIES.map((cat, i) => (
          <Button 
            key={i} 
            variant={cat === categoryFilter ? "default" : "outline"}
            onClick={() => setCategoryFilter(cat)}
            className={`h-10 px-5 rounded-full text-sm font-semibold shrink-0 transition-colors ${
              cat === categoryFilter 
                ? "bg-brand text-primary-foreground hover:brightness-110 border-0 shadow-[0_0_15px_rgba(201,162,39,0.2)]" 
                : "bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Video Grid */}
      {gridVideos.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-white/10 rounded-2xl bg-[#0a0a0a]">
          <Video className="size-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Nenhum tutorial encontrado</p>
          <p className="text-gray-500 text-sm mb-4">Tente buscar por outro termo ou limpe os filtros de categoria.</p>
          <Button variant="outline" className="border-white/10 text-brand" onClick={() => { setSearch(""); setCategoryFilter("Todos"); }}>Limpar filtros</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {gridVideos.map((video) => (
            <div key={video.id} className="group flex flex-col bg-[#111111] border border-white/5 hover:border-brand/30 rounded-2xl overflow-hidden transition-all duration-300">
              <div 
                onClick={() => setActiveVideo(video)}
                className="relative w-full aspect-video overflow-hidden bg-black cursor-pointer"
              >
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="size-12 rounded-full bg-brand/90 text-white flex items-center justify-center pl-1 shadow-[0_0_20px_rgba(201,162,39,0.5)] scale-90 group-hover:scale-100 transition-transform">
                    <Play className="size-5" />
                  </div>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 rounded text-[11px] font-semibold text-white">
                  {video.duration}
                </div>
                <div className="absolute top-3 left-3 bg-[#111111]/90 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                  {video.category}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 
                    onClick={() => setActiveVideo(video)}
                    className="font-bold text-white group-hover:text-brand transition-colors line-clamp-2 cursor-pointer text-base mb-1"
                  >
                    {video.title}
                  </h3>
                  <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-white/5">
                  <button 
                    onClick={() => setActiveVideo(video)}
                    className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
                  >
                    Assistir <ExternalLink className="size-3" />
                  </button>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="size-8 text-gray-500 hover:text-white" onClick={() => setEditing(video)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8 text-red-500/70 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteMutation.mutate(video.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Adicionar / Editar Tutorial */}
      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="bg-[#111111] border-white/10 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editing?.id ? "Editar Tutorial" : "Novo Tutorial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">Título da Aula *</Label>
              <Input
                value={editing?.title || ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Como Cadastrar Clientes no Funil"
                className="bg-[#1A1A1A] border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">URL do Vídeo (YouTube, Vimeo ou MP4) *</Label>
              <Input
                value={editing?.videoUrl || ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="https://www.youtube.com/embed/... ou /videos/meu-video.mp4"
                className="bg-[#1A1A1A] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Duração</Label>
                <Input
                  value={editing?.duration || ""}
                  onChange={(e) => setEditing((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="05:30"
                  className="bg-[#1A1A1A] border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Categoria</Label>
                <Input
                  value={editing?.category || ""}
                  onChange={(e) => setEditing((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Iniciante, Gestão, Vendas..."
                  className="bg-[#1A1A1A] border-white/10 text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">URL da Imagem de Capa (Thumbnail)</Label>
              <Input
                value={editing?.thumbnail || ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, thumbnail: e.target.value }))}
                placeholder="https://images.unsplash.com/..."
                className="bg-[#1A1A1A] border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-gray-300">Descrição</Label>
              <Textarea
                value={editing?.description || ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="O que o aluno ou colaborador vai aprender nesta aula?"
                className="bg-[#1A1A1A] border-white/10 text-white min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">Cancelar</Button>
            <Button
              onClick={() => {
                if (!editing?.title?.trim()) {
                  toast.error("Informe o título da aula");
                  return;
                }
                saveMutation.mutate(editing);
              }}
              className="gradient-brand text-black font-semibold"
              disabled={saveMutation.isPending}
            >
              {editing?.id ? "Salvar Alterações" : "Publicar Tutorial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
