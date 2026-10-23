import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { notifyAccount, accountOf } from "./notifications.server";

export interface TaskAssignee {
  name: string;
  role: string;
  avatar?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  desc?: string;
  status: "A Fazer" | "Em Andamento" | "Revisão" | "Concluído";
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  date?: string;
  assignee?: TaskAssignee;
  project?: string;
  tags?: string[];
  comments?: number;
}

export const DEFAULT_TEAM_MEMBERS: TaskAssignee[] = [];

export const INITIAL_TASKS: TaskRecord[] = [
  {
    id: "tsk-1",
    title: "Subir campanhas de tráfego pago Meta Ads",
    desc: "Configurar público geográfico, pixel de conversão e subir 4 criativos de vídeo.",
    status: "Em Andamento",
    priority: "Alta",
    date: "16/10/2026",
    assignee: { name: "Lucas Rocha", role: "Gestor de Tráfego" },
    project: "Gestão Estratégica de Tráfego Pago Meta & Google",
    tags: ["Meta Ads", "Tráfego"],
    comments: 2
  },
  {
    id: "tsk-2",
    title: "Finalizar manual de identidade visual",
    desc: "Fechar prancha de cores, tipografia e aplicações do logotipo em mockups.",
    status: "Revisão",
    priority: "Média",
    date: "18/10/2026",
    assignee: { name: "Ana Beatriz", role: "Designer" },
    project: "Branding & Identidade Visual Completa",
    tags: ["Design", "Branding"],
    comments: 1
  },
  {
    id: "tsk-3",
    title: "Redigir copies de anúncios para WhatsApp",
    desc: "3 variações de texto focadas em quebra de objeções e chamada para o zap.",
    status: "A Fazer",
    priority: "Urgente",
    date: "Hoje",
    assignee: { name: "Carla Souza", role: "Copywriter" },
    project: "Campanhas Meta Ads Q4",
    tags: ["Copywriting"],
    comments: 0
  },
  {
    id: "tsk-4",
    title: "Reunião de alinhamento com cliente",
    desc: "Apresentar resultados parciais e validar cronograma da próxima quinzena.",
    status: "Concluído",
    priority: "Média",
    date: "14/10/2026",
    assignee: { name: "Silas Maroto", role: "Diretor" },
    project: "Gestão Estratégica de Tráfego Pago Meta & Google",
    tags: ["Atendimento"],
    comments: 3
  }
];

export const getTasks = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const db = await readDb();
      if (!db.tasks || db.tasks.length === 0) {
        db.tasks = [...INITIAL_TASKS];
        await writeDb(db);
      }
      return db.tasks as TaskRecord[];
    } catch (e: any) {
      console.error(e);
      return INITIAL_TASKS;
    }
  });

export const addTask = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.tasks) db.tasks = [];
      const newTask: TaskRecord = {
        ...data,
        id: `tsk-${Date.now()}`,
        status: data.status || "A Fazer",
        priority: data.priority || "Média"
      };
      db.tasks.unshift(newTask);
      await writeDb(db);
      await notifyAccount(accountOf(db), { kind: "task", title: "Nova tarefa criada", body: newTask.title || "", link: "/tarefas" });
      return { success: true, task: newTask };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.tasks) return { success: false, error: "No tasks found" };
      const index = db.tasks.findIndex((p: any) => p.id === data.id);
      if (index === -1) return { success: false, error: "Task not found" };
      db.tasks[index] = { ...db.tasks[index], ...data };
      await writeDb(db);
      return { success: true, task: db.tasks[index] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.tasks) return { success: true };
      db.tasks = db.tasks.filter((p: any) => p.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
