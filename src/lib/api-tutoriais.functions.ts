import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface TutorialItem {
  id: string;
  title: string;
  duration: string;
  category: string;
  thumbnail: string;
  description: string;
  videoUrl?: string;
  locations?: string[];
  driveFileId?: string;
}

export const DEFAULT_TUTORIALS: TutorialItem[] = [
  {
    id: "tut-1",
    title: "BEM VINDO AO SM HUB",
    duration: "02:15",
    category: "Iniciante",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600",
    description: "Bem-vindo ao SM Hub! Assista a este vídeo introdutório para entender os conceitos básicos e a navegação da plataforma.",
    videoUrl: "/videos/BEM VINDO_1080p.mp4",
    locations: ["Aba Tutoriais", "Dashboard"]
  },
  {
    id: "tut-2",
    title: "Cadastro de Clientes — 3 Modos Práticos",
    duration: "05:30",
    category: "Gestão",
    thumbnail: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=600",
    description: "Aprenda os 3 modos diferentes de cadastrar novos clientes no sistema: simples, avançado e link público.",
    videoUrl: "/videos/Cadastro de Clientes   3 Modos_1080p60.mp4",
    locations: ["Aba Tutoriais", "Clientes"]
  },
  {
    id: "tut-3",
    title: "Gestão Financeira & Controle de Caixa",
    duration: "10:45",
    category: "Gestão",
    thumbnail: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600",
    description: "Visão geral completa sobre o painel Financeiro, metas de faturamento, gestão de despesas e controle de fluxo.",
    videoUrl: "/videos/Financeiro_1080p60.mp4",
    locations: ["Aba Tutoriais", "Financeiro"]
  },
  {
    id: "tut-4",
    title: "Funil de Vendas & Negociações (Pipelines)",
    duration: "08:20",
    category: "Vendas",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600",
    description: "Domine o Kanban de leads e pipelines, aprenda a avançar estágios e fechar vendas de alto valor.",
    videoUrl: "/videos/Pipeline, como utilizar_1080p60.mp4",
    locations: ["Aba Tutoriais", "Pipeline"]
  },
  {
    id: "tut-5",
    title: "Produção de Conteúdo & Cronograma",
    duration: "06:12",
    category: "Marketing",
    thumbnail: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=600",
    description: "Como organizar seus posts, briefings e agendamentos no Calendário de Conteúdo da sua agência.",
    videoUrl: "/videos/Produção de Conteudo_1080p60.mp4",
    locations: ["Aba Tutoriais", "Calendário"]
  },
  {
    id: "tut-6",
    title: "Quadro de Tarefas Operacional",
    duration: "04:50",
    category: "Produtividade",
    thumbnail: "https://images.unsplash.com/photo-1507925922837-326f12d9348d?auto=format&fit=crop&q=80&w=600",
    description: "Organize as entregas do dia a dia da equipe com colunas inteligentes e prazos claros.",
    videoUrl: "/videos/Quadro de Tarefas_1080p60.mp4",
    locations: ["Aba Tutoriais", "Tarefas"]
  },
  {
    id: "tut-7",
    title: "Integração ASAAS + Emissão de Boletos",
    duration: "07:18",
    category: "Integrações",
    thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=600",
    description: "Aprenda a conectar a sua chave de API do ASAAS para emitir cobranças, Pix e boletos recorrentes.",
    videoUrl: "/videos/Tutorial Integração ASAAS + DG FLOW_1080p.mp4",
    locations: ["Aba Tutoriais", "Configurações"]
  },
  {
    id: "tut-8",
    title: "Integração com Google Drive para Backups",
    duration: "03:45",
    category: "Integrações",
    thumbnail: "https://images.unsplash.com/photo-1614064641913-6b7140414c71?auto=format&fit=crop&q=80&w=600",
    description: "Como conectar sua conta Google para salvar orçamentos, vídeos e banco de dados de forma 100% segura na nuvem.",
    videoUrl: "/videos/Tutorial Integração com Google Drive_1080p.mp4",
    locations: ["Aba Tutoriais", "Configurações"]
  }
];

export const getTutorials = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.tutorials || !Array.isArray(db.tutorials) || db.tutorials.length === 0) {
      db.tutorials = DEFAULT_TUTORIALS;
      await writeDb(db);
    }
    return db.tutorials as TutorialItem[];
  } catch (e: any) {
    console.error("Failed to read tutorials:", e);
    return DEFAULT_TUTORIALS;
  }
});

export const saveTutorialItem = createServerFn({ method: "POST" })
  .inputValidator((item: Partial<TutorialItem>) => item)
  .handler(async ({ data: item }) => {
    try {
      const db = await readDb();
      if (!db.tutorials) db.tutorials = [...DEFAULT_TUTORIALS];

      if (item.id) {
        const idx = db.tutorials.findIndex((t: any) => t.id === item.id);
        if (idx !== -1) {
          db.tutorials[idx] = { ...db.tutorials[idx], ...item };
        } else {
          db.tutorials.push(item);
        }
      } else {
        const newTutorial: TutorialItem = {
          id: `tut-${Date.now()}`,
          title: item.title || "Novo Tutorial",
          duration: item.duration || "05:00",
          category: item.category || "Geral",
          thumbnail: item.thumbnail || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600",
          description: item.description || "",
          videoUrl: item.videoUrl || "",
          locations: item.locations || ["Aba Tutoriais"],
        };
        db.tutorials.push(newTutorial);
      }

      await writeDb(db);
      return { success: true, tutorials: db.tutorials };
    } catch (e: any) {
      console.error("Failed to save tutorial:", e);
      return { success: false, error: e.message };
    }
  });

export const deleteTutorialItem = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.tutorials) return { success: true };
      db.tutorials = db.tutorials.filter((t: any) => t.id !== id);
      await writeDb(db);
      return { success: true, tutorials: db.tutorials };
    } catch (e: any) {
      console.error("Failed to delete tutorial:", e);
      return { success: false, error: e.message };
    }
  });
