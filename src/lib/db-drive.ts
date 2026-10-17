import { createServerOnlyFn } from "@tanstack/react-start";
// Per-account data store backed by Lovable Cloud.
// Each account (one per signup) has its own workspace_data row keyed by account id.
// Signed-in calls resolve the caller's account; the founder may act on any account
// by sending the `x-sm-account` header. Public flows (portal, proposal, briefing,
// payment webhook) must pass { publicAccess: true, locate } to find the owning account.
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
  pipelines: [],
  tutorials: [],
  automations: [],
  orcamentos: [],
  briefings: [],
  integrations: {},
});

export type Locate = { collection: string; id: string; field?: string };
type Opts = { publicAccess?: boolean; accountId?: string; locate?: Locate };

const ACCOUNT_KEY = "__accountId";

export const getCaller = createServerOnlyFn(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const auth = req?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Faça login para continuar.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão expirada. Faça login novamente.");
  const { data: f } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  return { user: data.user, isFounder: !!f, requestedAccount: req?.headers.get("x-sm-account") || "" };
});

export const resolveAccountId = createServerOnlyFn(async (): Promise<string> => {
  const { user, isFounder, requestedAccount } = await getCaller();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (isFounder && requestedAccount) {
    const { data: target, error } = await supabaseAdmin.from("accounts").select("id").eq("id", requestedAccount).maybeSingle();
    if (error || !target) throw new Error("Conta não encontrada.");
    return target.id;
  }
  const { data: acc } = await supabaseAdmin
    .from("accounts")
    .select("id,status")
    .eq("id", user.id)
    .maybeSingle();
  if (acc) {
    if (acc.status === "suspended" && !isFounder) throw new Error("Conta suspensa. Fale com o suporte.");
    return acc.id;
  }
  const { data: mem } = await supabaseAdmin
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (mem) {
    const { data: teamAccount } = await supabaseAdmin.from("accounts").select("status").eq("id", mem.account_id).maybeSingle();
    if (!teamAccount || (teamAccount.status === "suspended" && !isFounder)) throw new Error("Conta suspensa ou indisponível. Fale com o suporte.");
    return mem.account_id;
  }
  // Safety net if the signup trigger did not run.
  await supabaseAdmin.from("accounts").insert({ id: user.id, owner_id: user.id, email: user.email ?? "" });
  return user.id;
});

const locateAccount = createServerOnlyFn(async (loc: Locate): Promise<string> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const field = loc.field || "id";
  const { data, error } = await supabaseAdmin
    .from("workspace_data")
    .select("user_id")
    .filter(`data->${loc.collection}`, "cs", JSON.stringify([{ [field]: loc.id }]))
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link não encontrado ou expirado.");
  return data.user_id;
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspace_data")
    .select("data")
    .eq("user_id", accountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const db = { ...EMPTY_DB(), ...((data?.data as object) ?? {}) };
  Object.defineProperty(db, ACCOUNT_KEY, { value: accountId, enumerable: false });
  return db;
});

export const writeDb = createServerOnlyFn(async (value: any, opts: Opts = {}): Promise<void> => {
  let accountId: string | undefined = opts.accountId || value?.[ACCOUNT_KEY];
  if (!accountId) {
    if (opts.publicAccess) throw new Error("Conta não identificada.");
    accountId = await resolveAccountId();
  } else if (!opts.publicAccess && !opts.accountId) {
    // Signed-in writes must target the caller's own (or founder-selected) account.
    const mine = await resolveAccountId();
    if (mine !== accountId) throw new Error("Acesso negado.");
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("workspace_data")
    .upsert({ user_id: accountId, data: value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
});

export const readLocalDb = readDb;
export const writeLocalDb = writeDb;
