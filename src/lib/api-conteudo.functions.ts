import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface ScheduledPost {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  platform: "instagram" | "tiktok" | "youtube" | "linkedin" | "facebook" | "blog";
  format: "reels" | "carrossel" | "imagem" | "stories" | "artigo" | "video";
  status: "planejado" | "em_producao" | "agendado" | "publicado";
  caption?: string;
  client?: string;
}

export const INITIAL_CALENDAR_POSTS: ScheduledPost[] = [
  {
    id: "post-1",
    title: "Reels: 3 Erros Fatais ao Anunciar no Meta Ads",
    date: "2026-10-16",
    time: "18:00",
    platform: "instagram",
    format: "reels",
    status: "agendado",
    caption: "Você ainda está usando o botão impulsionar? Assista até o final para entender por que você está queimando verba.",
    client: "João Pereira"
  },
  {
    id: "post-2",
    title: "Carrossel: Identidade Visual vs Logotipo",
    date: "2026-10-18",
    time: "12:00",
    platform: "instagram",
    format: "carrossel",
    status: "em_producao",
    caption: "Aprenda a diferença entre uma marca completa e apenas um símbolo solto.",
    client: "Maria Silva"
  },
  {
    id: "post-3",
    title: "Artigo: Tendências de Vendas B2B para 2027",
    date: "2026-10-20",
    time: "09:00",
    platform: "linkedin",
    format: "artigo",
    status: "planejado",
    caption: "Como as grandes consultorias estão estruturando seus times de SDR e automação comercial.",
    client: "Geral"
  },
  {
    id: "post-4",
    title: "Vídeo Longo: Como Estruturamos R$ 100k de Faturamento",
    date: "2026-10-22",
    time: "19:00",
    platform: "youtube",
    format: "video",
    status: "planejado",
    caption: "Estudo de caso completo com bastidores de campanhas e estratégias de aquisição.",
    client: "SM HUB"
  },
  {
    id: "post-5",
    title: "Post de Depoimento de Cliente Satisfeito",
    date: "2026-10-14",
    time: "17:30",
    platform: "instagram",
    format: "imagem",
    status: "publicado",
    caption: "Mais um resultado expressivo gerado este mês com ROAS de 6.4x!",
    client: "João Pereira"
  }
];

export const getScheduledPosts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.contentCalendar || db.contentCalendar.length === 0) {
      db.contentCalendar = [...INITIAL_CALENDAR_POSTS];
      await writeDb(db);
    }
    return db.contentCalendar as ScheduledPost[];
  } catch (e: any) {
    console.error("Erro ao ler calendário de conteúdo:", e);
    return INITIAL_CALENDAR_POSTS;
  }
});

export const saveScheduledPost = createServerFn({ method: "POST" })
  .inputValidator((data: Partial<ScheduledPost>) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.contentCalendar) db.contentCalendar = [];

      if (data.id) {
        const index = db.contentCalendar.findIndex((p: any) => p.id === data.id);
        if (index !== -1) {
          db.contentCalendar[index] = { ...db.contentCalendar[index], ...data };
        } else {
          db.contentCalendar.unshift(data);
        }
      } else {
        const newPost: ScheduledPost = {
          id: `post-${Date.now()}`,
          title: data.title || "Novo Conteúdo",
          date: data.date || new Date().toISOString().split("T")[0],
          time: data.time || "12:00",
          platform: data.platform || "instagram",
          format: data.format || "reels",
          status: data.status || "planejado",
          caption: data.caption || "",
          client: data.client || "Geral"
        };
        db.contentCalendar.unshift(newPost);
      }

      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const deleteScheduledPost = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.contentCalendar) return { success: true };
      db.contentCalendar = db.contentCalendar.filter((p: any) => p.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
