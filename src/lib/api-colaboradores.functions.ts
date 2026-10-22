import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

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

const SAMPLE_IDS = new Set(["colab-1", "colab-2", "colab-3", "colab-4", "colab-5"]);
const real = (list: any[] | undefined) => (list ?? []).filter((c) => !SAMPLE_IDS.has(c?.id));

export const getCollaborators = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    const list = real(db.collaborators);
    if (list.length !== (db.collaborators ?? []).length) {
      db.collaborators = list;
      await writeDb(db);
    }
    return list as Collaborator[];
  } catch (err: any) {
    console.error("Failed to read collaborators:", err);
    return [] as Collaborator[];
  }
});

export const addCollaborator = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<Collaborator, "id" | "joinedAt">) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      db.collaborators = real(db.collaborators);

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
      db.collaborators = real(db.collaborators);

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
