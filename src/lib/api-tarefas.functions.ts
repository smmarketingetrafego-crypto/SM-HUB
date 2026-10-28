import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { notifyAccount, notifyAssignee, taskSummary, accountOf } from "./notifications.server";

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
      return (db.tasks || []) as TaskRecord[];
    } catch (e: any) {
      console.error(e);
      return [] as TaskRecord[];
    }
  });

export const addTask = createServerFn({ method: "POST" })
  .validator((data: any) => data)
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
      const summary = taskSummary(newTask);
      await notifyAccount(accountOf(db), { kind: "task", title: `Nova tarefa: ${newTask.title || "sem título"}`, body: summary, link: "/tarefas" });
      await notifyAssignee(db, newTask.assignee?.name, {
        kind: "task",
        title: `Tarefa para você: ${newTask.title || "sem título"}`,
        body: [summary, newTask.desc].filter(Boolean).join(" — "),
        link: "/tarefas",
      });
      return { success: true, task: newTask };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const updateTask = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.tasks) return { success: false, error: "No tasks found" };
      const index = db.tasks.findIndex((p: any) => p.id === data.id);
      if (index === -1) return { success: false, error: "Task not found" };
      const before = db.tasks[index]?.assignee?.name ?? "";
      db.tasks[index] = { ...db.tasks[index], ...data };
      await writeDb(db);
      const t = db.tasks[index];
      if (t.assignee?.name && t.assignee.name !== before) {
        await notifyAssignee(db, t.assignee.name, {
          kind: "task",
          title: `Tarefa atribuída a você: ${t.title || "sem título"}`,
          body: [taskSummary(t), t.desc].filter(Boolean).join(" — "),
          link: "/tarefas",
        });
      }
      return { success: true, task: db.tasks[index] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const deleteTask = createServerFn({ method: "POST" })
  .validator((id: string) => id)
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
