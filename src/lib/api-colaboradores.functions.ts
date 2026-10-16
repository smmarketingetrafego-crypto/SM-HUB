import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive.server";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: "Direção" | "Tráfego" | "Design" | "Conteúdo" | "Tecnologia" | "Comercial" | "Atendimento" | "Operações";
  permissionLevel: "admin" | "manager" | "member" | "viewer";
  salaryOrRate?: number;
  remunerationType?: "mensal" | "por_projeto" | "comissao";
  status: "Ativo" | "Férias" | "Inativo";
  joinedAt: string;
  avatar?: string;
  pixKey?: string;
  notes?: string;
}

export const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    id: "colab-1",
    name: "Silas Maroto",
    email: "silas@smhub.com.br",
    phone: "99985501962",
    role: "Diretor Geral & Estrategista",
    department: "Direção",
    permissionLevel: "admin",
    remunerationType: "mensal",
    salaryOrRate: 15000,
    status: "Ativo",
    joinedAt: "2024-01-10",
  },
  {
    id: "colab-2",
    name: "Lucas Rocha",
    email: "lucas.trafego@smhub.com.br",
    phone: "11988882222",
    role: "Gestor de Tráfego & Performance",
    department: "Tráfego",
    permissionLevel: "manager",
    remunerationType: "mensal",
    salaryOrRate: 4500,
    status: "Ativo",
    joinedAt: "2024-03-15",
  },
  {
    id: "colab-3",
    name: "Ana Beatriz",
    email: "ana.design@smhub.com.br",
    phone: "21977773333",
    role: "Designer & Direção de Arte",
    department: "Design",
    permissionLevel: "member",
    remunerationType: "mensal",
    salaryOrRate: 4000,
    status: "Ativo",
    joinedAt: "2024-04-01",
  },
  {
    id: "colab-4",
    name: "Carla Souza",
    email: "carla.copy@smhub.com.br",
    phone: "31966664444",
    role: "Copywriter & Roteirista",
    department: "Conteúdo",
    permissionLevel: "member",
    remunerationType: "por_projeto",
    salaryOrRate: 3500,
    status: "Ativo",
    joinedAt: "2024-05-20",
  },
  {
    id: "colab-5",
    name: "Felipe Matos",
    email: "felipe.tech@smhub.com.br",
    phone: "41955555555",
    role: "Desenvolvedor Web & Fullstack",
    department: "Tecnologia",
    permissionLevel: "member",
    remunerationType: "mensal",
    salaryOrRate: 6000,
    status: "Ativo",
    joinedAt: "2024-06-01",
  },
];

export const getCollaborators = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.collaborators || db.collaborators.length === 0) {
      db.collaborators = [...INITIAL_COLLABORATORS];
      await writeDb(db);
    }
    return db.collaborators as Collaborator[];
  } catch (err: any) {
    console.error("Failed to read collaborators:", err);
    return INITIAL_COLLABORATORS;
  }
});

export const addCollaborator = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<Collaborator, "id" | "joinedAt">) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.collaborators) db.collaborators = [...INITIAL_COLLABORATORS];

      const newColab: Collaborator = {
        ...data,
        id: `colab-${Date.now()}`,
        joinedAt: new Date().toISOString().split("T")[0],
        status: data.status || "Ativo",
      };

      db.collaborators.push(newColab);
      await writeDb(db);

      return { success: true, collaborator: newColab };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

export const updateCollaborator = createServerFn({ method: "POST" })
  .inputValidator((data: Collaborator) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.collaborators) db.collaborators = [...INITIAL_COLLABORATORS];

      const index = db.collaborators.findIndex((c: Collaborator) => c.id === data.id);
      if (index === -1) {
        return { success: false, error: "Colaborador não encontrado." };
      }

      db.collaborators[index] = {
        ...db.collaborators[index],
        ...data,
      };

      await writeDb(db);
      return { success: true, collaborator: db.collaborators[index] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

export const deleteCollaborator = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.collaborators) return { success: true };

      db.collaborators = db.collaborators.filter((c: Collaborator) => c.id !== id);
      await writeDb(db);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
