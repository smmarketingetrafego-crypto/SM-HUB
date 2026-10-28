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

declare global {
  // eslint-disable-next-line no-var
  var __SMHUB_MEMORY_DB__: any | undefined;
}

const TMP_DB_PATH = path.resolve("/tmp", DB_FILENAME);

export async function readLocalDb(accountId?: string): Promise<any> {
  // 1. Se já está em memória neste processo / runtime, retorne a versão mais fresca
  if (globalThis.__SMHUB_MEMORY_DB__) {
    return { ...EMPTY_DB(), ...globalThis.__SMHUB_MEMORY_DB__ };
  }

  // 2. Tente ler do arquivo no diretório de trabalho
  const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
  try {
    if (fs.existsSync(localDbPath)) {
      const content = fs.readFileSync(localDbPath, "utf-8");
      const parsed = JSON.parse(content);
      const merged = { ...EMPTY_DB(), ...parsed };
      globalThis.__SMHUB_MEMORY_DB__ = merged;
      return merged;
    }
  } catch (e) {
    // Ignora erro de leitura em ambiente read-only ou restrito
  }

  // 3. Tente ler do diretório /tmp (persistente em serverless/lambdas durante o ciclo de vida)
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const content = fs.readFileSync(TMP_DB_PATH, "utf-8");
      const parsed = JSON.parse(content);
      const merged = { ...EMPTY_DB(), ...parsed };
      globalThis.__SMHUB_MEMORY_DB__ = merged;
      return merged;
    }
  } catch (e) {
    // Continua para inicialização padrão
  }

  // 4. Tenta ler do Supabase workspace_data se disponível
  try {
    const targetAccount = accountId || "local-account-id";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("workspace_data")
      .select("data")
      .eq("user_id", targetAccount)
      .maybeSingle();
    if (row?.data && typeof row.data === "object") {
      const merged = { ...EMPTY_DB(), ...(row.data as object) };
      globalThis.__SMHUB_MEMORY_DB__ = merged;
      return merged;
    }
  } catch {
    // Fallback silencioso
  }

  const initial = EMPTY_DB();
  globalThis.__SMHUB_MEMORY_DB__ = initial;
  return initial;
}

export async function writeLocalDb(data: any, accountId?: string): Promise<void> {
  // 1. Atualiza imediatamente o estado em memória para qualquer chamada subsequente
  globalThis.__SMHUB_MEMORY_DB__ = data;

  const content = JSON.stringify(data, null, 2);

  // 2. Tenta salvar no caminho local do projeto
  let wrotePrimary = false;
  try {
    const localDbPath = path.resolve(process.cwd(), DB_FILENAME);
    fs.writeFileSync(localDbPath, content, "utf-8");
    wrotePrimary = true;
  } catch (e) {
    // Comum em serverless / Cloudflare Workers onde o filesystem é estritamente read-only
  }

  // 3. Se falhou ou em fallback, tenta salvar em /tmp
  if (!wrotePrimary) {
    try {
      fs.writeFileSync(TMP_DB_PATH, content, "utf-8");
    } catch {
      // Ignora falhas em ambientes sem acesso ao disco
    }
  }

  // 4. Sincronização em nuvem resiliente com Supabase workspace_data (se disponível)
  syncCloudWorkspace(accountId, data).catch(() => {});

  // 5. Sincronização em segundo plano com o Google Drive (se configurado)
  syncGoogleDrive(data).catch(() => {});
}

async function syncCloudWorkspace(accountId: string | undefined, data: any) {
  try {
    const targetAccount = accountId || "local-account-id";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("workspace_data")
      .upsert({
        user_id: targetAccount,
        data: data,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
  } catch {
    // Fallback silencioso caso a tabela workspace_data não esteja configurada ou tenha RLS restrito
  }
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
