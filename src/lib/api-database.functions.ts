import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb, DB_FILENAME } from "./db-drive";
import fs from "fs";
import path from "path";

export interface DatabaseStats {
  storageType: "Google Drive + Local JSON";
  dbFilename: string;
  fileSizeBytes: number;
  lastModified: string;
  googleDriveConnected: boolean;
  counts: {
    clients: number;
    pipelines: number;
    leads: number;
    projects: number;
    tasks: number;
    orcamentos: number;
    briefings: number;
    whatsappMessages: number;
    collaborators: number;
    driveFiles: number;
  };
}

export const getDatabaseStats = createServerFn({ method: "GET" }).handler(async (): Promise<DatabaseStats> => {
  const db = await readDb();
  let fileSizeBytes = 0;
  let lastModified = new Date().toISOString();

  try {
    const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
    if (fs.existsSync(localDbPath)) {
      const stat = fs.statSync(localDbPath);
      fileSizeBytes = stat.size;
      lastModified = stat.mtime.toISOString();
    }
  } catch {
    // Non-fatal
  }

  let totalLeads = 0;
  if (Array.isArray(db.pipelines)) {
    for (const pipe of db.pipelines) {
      if (Array.isArray(pipe.stages)) {
        for (const stage of pipe.stages) {
          totalLeads += Array.isArray(stage.deals) ? stage.deals.length : 0;
        }
      }
    }
  }

  return {
    storageType: "Google Drive + Local JSON",
    dbFilename: DB_FILENAME,
    fileSizeBytes,
    lastModified,
    googleDriveConnected: !!(process.env['GOOGLE_DRIVE_API_KEY'] || (db.integrations?.google?.connected && db.integrations?.google?.accountEmail)),
    counts: {
      clients: Array.isArray(db.clients) ? db.clients.length : 0,
      pipelines: Array.isArray(db.pipelines) ? db.pipelines.length : 0,
      leads: totalLeads,
      projects: Array.isArray(db.projects) ? db.projects.length : 0,
      tasks: Array.isArray(db.tasks) ? db.tasks.length : 0,
      orcamentos: Array.isArray(db.orcamentos) ? db.orcamentos.length : 0,
      briefings: Array.isArray(db.briefings) ? db.briefings.length : 0,
      whatsappMessages: Array.isArray(db.whatsapp) ? db.whatsapp.length : 0,
      collaborators: Array.isArray(db.collaborators) ? db.collaborators.length : 0,
      driveFiles: Array.isArray(db.drive_files) ? db.drive_files.length : 0,
    },
  };
});

export const exportDatabaseBackup = createServerFn({ method: "POST" }).handler(async () => {
  const db = await readDb();
  return {
    filename: `smhub_backup_${new Date().toISOString().slice(0, 10)}.json`,
    content: JSON.stringify(db, null, 2),
  };
});

export const syncDriveNow = createServerFn({ method: "POST" }).handler(async () => {
  const db = await readDb();
  // Força reescrita que aciona a rotina syncGoogleDrive em segundo plano
  await writeDb(db);
  return {
    success: true,
    timestamp: new Date().toLocaleTimeString("pt-BR"),
  };
});
