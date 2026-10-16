import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export const getProjects = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const db = await readDb();
      return db.projects || [];
    } catch (e: any) {
      console.error(e);
      return [];
    }
  });

export const addProject = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.projects) db.projects = [];
      const newProject = { ...data, id: Date.now().toString(), progress: 0, status: "Na Fila" };
      db.projects.push(newProject);
      await writeDb(db);
      return { success: true, project: newProject };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const updateProject = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.projects) return { success: false, error: "No projects found" };
      const index = db.projects.findIndex((p: any) => p.id === data.id);
      if (index === -1) return { success: false, error: "Project not found" };
      db.projects[index] = { ...db.projects[index], ...data };
      await writeDb(db);
      return { success: true, project: db.projects[index] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.projects) return { success: true };
      db.projects = db.projects.filter((p: any) => p.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
