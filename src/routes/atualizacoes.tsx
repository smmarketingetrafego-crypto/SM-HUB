import { createFileRoute } from '@tanstack/react-router';
import { Sparkles, Megaphone, Box, Link as LinkIcon, Edit3, Search, X, CheckCircle2, Zap } from "lucide-react";
import { useState, useMemo } from "react";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/atualizacoes")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Últimas Atualizações — SM Hub' },
      { property: 'og:description', content: 'Changelog e novidades do sistema SM Hub' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Últimas Atualizações — SM Hub" },
      { name: "description", content: "Changelog e novidades do sistema SM Hub" },
    ],
  }),
  component: AtualizacoesPage,
});

const UPDATES_DATA = [
  {
    date: "25 de Agosto de 2026",
    isNew: true,
    version: "v2.4.0",
    items: [
      {
        title: "Agendamento de posts liberado para beta testers",
        description: "Publique direto no Instagram e no Facebook pelo SM Hub: monte o post, escolha as contas, defina data e hora e o sistema publica sozinho. Em fase beta com fila inteligente.",
        icon: Edit3,
        tags: [
          { label: "Conteúdo", color: "bg-gray-800 text-gray-300" },
          { label: "Beta", color: "bg-purple-900/50 text-purple-300 border border-purple-700/50" }
        ]
      },
      {
        title: "Painel de vendas para TV e Segundo Monitor",
        description: "Nova tela em Dashboard -> Painel: números grandes para deixar numa TV ou segundo monitor, com sua logo e cores, ranking de vendedores, gráfico do mês e barra de meta. Quando entra venda, comemora com contador animado.",
        icon: Box,
        tags: [
          { label: "Produtos", color: "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50" },
          { label: "Novo", color: "bg-brand/20 text-brand border border-brand/30" }
        ]
      },
      {
        title: "Encaminhar mensagens em massa no WhatsApp",
        description: "No balão da conversa agora existe o botão de encaminhar — selecione múltiplos contatos de uma só vez e repasse textos, PDFs ou mídias sem precisar copiar e colar.",
        icon: LinkIcon,
        tags: [
          { label: "Integração", color: "bg-gray-800 text-gray-300" },
          { label: "Novo", color: "bg-brand/20 text-brand border border-brand/30" }
        ]
      },
      {
        title: "Assinatura do atendente nas mensagens automáticas",
        description: "Quando a equipe atende por um número centralizado, cada mensagem pode sair automaticamente com o nome de quem escreveu em negrito na primeira linha.",
        icon: LinkIcon,
        tags: [
          { label: "Integração", color: "bg-gray-800 text-gray-300" },
          { label: "Novo", color: "bg-brand/20 text-brand border border-brand/30" }
        ]
      },
      {
        title: "Destacar telas em janelas independentes (Multi-monitor)",
        description: "Tarefas, Agenda e Funil agora podem ser destacados numa janela separada sem o menu lateral, perfeito para quem trabalha com múltiplos monitores ao mesmo tempo.",
        icon: Box,
        tags: [
          { label: "Produtividade", color: "bg-blue-900/40 text-blue-400 border border-blue-800/50" },
          { label: "Novo", color: "bg-brand/20 text-brand border border-brand/30" }
        ]
      },
      {
        title: "Ranking de vendedores com atribuição de propostas",
        description: "Ao aprovar um orçamento ou fechar um negócio no funil, o crédito é imediatamente atribuído ao responsável, alimentando o ranking comercial do SM Hub.",
        icon: Zap,
        tags: [
          { label: "Vendas", color: "bg-amber-900/40 text-amber-400 border border-amber-800/50" },
          { label: "Novo", color: "bg-brand/20 text-brand border border-brand/30" }
        ]
      }
    ]
  },
  {
    date: "10 de Agosto de 2026",
    isNew: false,
    version: "v2.3.0",
    items: [
      {
        title: "Integração oficial de nuvem Google Drive",
        description: "Banco de dados central e backups sincronizados diretamente na sua conta privada do Google Drive, sem depender de servidores terceiros.",
        icon: Box,
        tags: [
          { label: "Nuvem", color: "bg-emerald-900/40 text-emerald-400 border border-emerald-800/50" }
        ]
      },
      {
        title: "Kanban Operacional com filtros rápidos",
        description: "Colunas dinâmicas de A Fazer, Em Andamento e Concluído com contadores de cards e modal rápido de criação.",
        icon: Edit3,
        tags: [
          { label: "Tarefas", color: "bg-blue-900/40 text-blue-400 border border-blue-800/50" }
        ]
      }
    ]
  }
];

const TAG_FILTERS = ["Todos", "Novo", "Beta", "Integração", "Conteúdo", "Produtos", "Vendas"];

function AtualizacoesPage() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("Todos");

  const filteredGroups = useMemo(() => {
    return UPDATES_DATA.map((group) => {
      const items = group.items.filter((item) => {
        const matchesSearch = !search || 
          item.title.toLowerCase().includes(search.toLowerCase()) || 
          item.description.toLowerCase().includes(search.toLowerCase());
        const matchesTag = activeTag === "Todos" || item.tags.some((t) => t.label === activeTag);
        return matchesSearch && matchesTag;
      });
      return { ...group, items };
    }).filter((g) => g.items.length > 0);
  }, [search, activeTag]);

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-8">
      <TutorialBanner location="Atualizações" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(201,162,39,0.2)]">
            <Sparkles className="size-7 text-brand" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-white">Changelog & Novidades</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand text-black">
                v2.4.0
              </span>
            </div>
            <p className="text-gray-400 text-sm">Acompanhe todas as melhorias e novos recursos entregues na plataforma</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar novidades..." 
            className="pl-9 bg-[#111111] border-white/10 rounded-xl h-10 text-white placeholder:text-gray-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tag Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TAG_FILTERS.map((tag) => (
          <Button
            key={tag}
            variant={activeTag === tag ? "default" : "outline"}
            onClick={() => setActiveTag(tag)}
            className={`h-9 px-4 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              activeTag === tag
                ? "bg-brand text-black hover:brightness-110 border-0"
                : "bg-transparent border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {tag}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-12">
        {filteredGroups.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-[#0a0a0a]">
            <Megaphone className="size-10 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Nenhuma novidade encontrada</p>
            <p className="text-gray-500 text-sm">Tente limpar sua pesquisa ou alterar o filtro de categoria.</p>
          </div>
        ) : (
          filteredGroups.map((group, i) => (
            <div key={i} className="space-y-4">
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-brand animate-pulse" />
                  <h2 className="text-xl font-bold text-white">{group.date}</h2>
                </div>
                <span className="text-xs text-gray-500 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5 font-mono">
                  {group.version}
                </span>
                {group.isNew && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand/20 text-brand border border-brand/30">
                    NOVA VERSÃO
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {group.items.map((item, j) => (
                  <div key={j} className="border border-white/5 bg-[#111111] rounded-2xl p-6 flex gap-4 hover:border-brand/30 transition-all duration-300 group">
                    <div className="mt-1 size-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand group-hover:border-brand/30 shrink-0 transition-colors">
                      <item.icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-brand transition-colors">{item.title}</h3>
                        <div className="flex items-center gap-2">
                          {item.tags.map((tag, k) => (
                            <span key={k} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${tag.color}`}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-400 leading-relaxed text-sm">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
