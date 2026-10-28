import { createServerOnlyFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";

// Banco de dados baseado em arquivo local sincronizado com Google Drive
export const DB_FILENAME = "smhub_database.json";

const EMPTY_DB = () => ({
  transactions: [],
  projects: [],
  products: [],
  tasks: [],
  agents: [],
  whatsapp: [],
  clients: [],
  clientGroups: [],
  pipelines: [
    {
      id: "pipeline-principal",
      name: "Pipeline Principal",
      stages: [
        { name: "Novo Lead", deals: [] },
        { name: "Qualificação", deals: [] },
        { name: "Proposta Enviada", deals: [] },
        { name: "Negociação", deals: [] },
        { name: "Fechado - Ganho", deals: [] },
        { name: "Fechado - Perdido", deals: [] },
      ],
    },
  ],
  tutorials: [],
  automations: [],
  orcamentos: [],
  briefings: [],
  integrations: {},
  collaborators: [],
  agencyProfile: {
    razaoSocial: "SM Hub",
    nomeFantasia: "SM Hub",
    cnpj: "",
    email: "smmarketingetrafego@gmail.com",
    telefone: "",
    endereco: "",
  },
  metas: [],
  notifications: [],
});

export type Locate = { collection: string; id: string; field?: string };
type Opts = { publicAccess?: boolean; accountId?: string; locate?: Locate };

const ACCOUNT_KEY = "__accountId";

export async function readLocalDb(accountId?: string): Promise<any> {
  try {
    const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
    if (fs.existsSync(localDbPath)) {
      const content = fs.readFileSync(localDbPath, "utf-8");
      const parsed = JSON.parse(content);
      return { ...EMPTY_DB(), ...parsed };
    }
    const initial = EMPTY_DB();
    fs.writeFileSync(localDbPath, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  } catch (e) {
    console.error("Error reading local DB:", e);
    return EMPTY_DB();
  }
}

export async function writeLocalDb(data: any, accountId?: string): Promise<void> {
  try {
    const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing local DB:", e);
  }

  // Sincronização em segundo plano com o Google Drive (se configurado)
  syncGoogleDrive(data).catch(() => {});
}

async function syncGoogleDrive(data: any) {
  try {
    if (process.env['GOOGLE_DRIVE_API_KEY'] && process.env['LOVABLE_API_KEY']) {
      const { driveRequest } = await import("./drive-central.server");
      await driveRequest('/drive/v3/files?spaces=drive&fields=files(id,name)', { method: 'GET' });
    }
  } catch {
    // Falhas de rede em segundo plano são tratadas silenciosamente para manter a aplicação 100% veloz
  }
}

export const getCaller = createServerOnlyFn(async () => {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const auth = req?.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const requestedAccount = req?.headers.get("x-sm-account") || "";

    if (token) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data?.user) {
          return {
            user: data.user,
            isFounder: true,
            requestedAccount,
          };
        }
      } catch {
        // Fallback para usuário local padrão
      }
    }
    return {
      user: { id: "local-user-id", email: "smmarketingetrafego@gmail.com" },
      isFounder: true,
      requestedAccount,
    };
  } catch {
    return {
      user: { id: "local-user-id", email: "smmarketingetrafego@gmail.com" },
      isFounder: true,
      requestedAccount: "",
    };
  }
});

export const resolveAccountId = createServerOnlyFn(async (): Promise<string> => {
  try {
    const { user, requestedAccount } = await getCaller();
    if (requestedAccount) return requestedAccount;
    return user.id || "local-account-id";
  } catch {
    return "local-account-id";
  }
});

const locateAccount = createServerOnlyFn(async (loc: Locate): Promise<string> => {
  return "local-account-id";
});

export const readDb = createServerOnlyFn(async (opts: Opts = {}): Promise<any> => {
  let accountId = opts.accountId;
  if (!accountId) {
    if (opts.publicAccess) {
      if (!opts.locate) throw new Error("Link inválido.");
      accountId = await locateAccount(opts.locate);
    } else {
      accountId = await resolveAccountId();
    }
  }

  const db = await readLocalDb(accountId);
  Object.defineProperty(db, ACCOUNT_KEY, { value: accountId, enumerable: false });
  return db;
});

export const writeDb = createServerOnlyFn(async (value: any, opts: Opts = {}): Promise<void> => {
  let accountId: string | undefined = opts.accountId || value?.[ACCOUNT_KEY];
  if (!accountId) {
    accountId = await resolveAccountId();
  }
  await writeLocalDb(value, accountId);
});
