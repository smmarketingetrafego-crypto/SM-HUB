export const DB_FILENAME = "smhub_database.json";

export async function readLocalDb() {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
    if (fs.existsSync(localDbPath)) {
      const content = fs.readFileSync(localDbPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Error reading local DB:", e);
  }
  return {
    transactions: [],
    projects: [],
    products: [],
    tasks: [],
    agents: [],
    whatsapp: [],
    clients: [],
    clientGroups: [],
    pipelines: [],
    tutorials: [],
    automations: [],
    orcamentos: [],
    integrations: {},
  };
}

export async function writeLocalDb(data: any) {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing local DB:", e);
  }
}

export async function readDb() {
  // Retorna instantaneamente do banco de dados local para zero latência (0ms)
  return await readLocalDb();
}

export async function writeDb(data: any) {
  // Grava imediatamente no arquivo local
  await writeLocalDb(data);

  // Sincroniza com o Drive em segundo plano sem travar a requisição do usuário
  Promise.resolve().then(async () => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const tokensPath = path.resolve(process.cwd(), ".google-tokens.json");
      if (!fs.existsSync(tokensPath)) return;

      const { google } = await import("googleapis");
      const { oauth2Client } = await import("./google-auth");

      const tokens = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const res = await drive.files.list({
        q: `name='${DB_FILENAME}' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
      });
      const fileId = res.data.files && res.data.files.length > 0 ? res.data.files[0].id : null;

      const fileMetadata = {
        name: DB_FILENAME,
        mimeType: "application/json",
      };
      const media = {
        mimeType: "application/json",
        body: JSON.stringify(data, null, 2),
      };

      if (fileId) {
        await drive.files.update({
          fileId: fileId,
          media: media,
        });
      } else {
        await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id",
        });
      }
    } catch {
      // Ignora falhas de rede em segundo plano para manter o sistema sempre 100% veloz
    }
  });
}
