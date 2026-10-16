import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export const getClients = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    return {
      clients: db.clients || [],
      groups: db.clientGroups || [],
    };
  } catch (e: any) {
    console.error("Failed to read clients:", e);
    return { clients: [], groups: [] };
  }
});

export const addClient = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.clients) db.clients = [];
      const newClient = {
        ...data,
        id: `c_${Date.now()}`,
        createdAt: new Date().toISOString(),
        archived: false,
        source: data.source || "manual",
      };
      db.clients.push(newClient);
      await writeDb(db);
      return { success: true, client: newClient };
    } catch (e: any) {
      console.error("Failed to add client:", e);
      return { success: false, error: e.message };
    }
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.clients) return { success: false, error: "Nenhum cliente cadastrado." };
      const idx = db.clients.findIndex((c: any) => c.id === data.id);
      if (idx === -1) return { success: false, error: "Cliente não encontrado." };
      db.clients[idx] = { ...db.clients[idx], ...data };
      await writeDb(db);
      return { success: true, client: db.clients[idx] };
    } catch (e: any) {
      console.error("Failed to update client:", e);
      return { success: false, error: e.message };
    }
  });

export const archiveClient = createServerFn({ method: "POST" })
  .validator((data: { id: string; archived: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.clients) return { success: false, error: "Nenhum cliente cadastrado." };
      const idx = db.clients.findIndex((c: any) => c.id === data.id);
      if (idx === -1) return { success: false, error: "Cliente não encontrado." };
      db.clients[idx].archived = data.archived;
      await writeDb(db);
      return { success: true, client: db.clients[idx] };
    } catch (e: any) {
      console.error("Failed to archive client:", e);
      return { success: false, error: e.message };
    }
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.clients) return { success: true };
      db.clients = db.clients.filter((c: any) => c.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      console.error("Failed to delete client:", e);
      return { success: false, error: e.message };
    }
  });

export const addClientGroup = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.clientGroups) db.clientGroups = [];
      const newGroup = {
        id: `g_${Date.now()}`,
        name: data.name,
        description: data.description || "",
        color: data.color || "#C9A227",
      };
      db.clientGroups.push(newGroup);
      await writeDb(db);
      return { success: true, group: newGroup };
    } catch (e: any) {
      console.error("Failed to add client group:", e);
      return { success: false, error: e.message };
    }
  });

export const deleteClientGroup = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.clientGroups) return { success: true };
      db.clientGroups = db.clientGroups.filter((g: any) => g.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      console.error("Failed to delete client group:", e);
      return { success: false, error: e.message };
    }
  });
