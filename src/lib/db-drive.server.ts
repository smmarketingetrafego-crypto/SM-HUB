// Agency data store backed by Lovable Cloud.
// The whole agency shares one workspace document; only signed-in team members
// can read/write it, except explicitly public flows (client portal, proposals,
// payment webhook) which pass { publicAccess: true }.
export const DB_FILENAME = "smhub_database.json";

const AGENCY_ROW_ID = "00000000-0000-0000-0000-000000000001";

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
  integrations: {},
});

type Opts = { publicAccess?: boolean };

async function assertSignedIn() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const auth = req?.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Faça login para continuar.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão expirada. Faça login novamente.");
  return data.user;
}

export async function readDb(opts: Opts = {}): Promise<any> {
  if (!opts.publicAccess) await assertSignedIn();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("workspace_data")
    .select("data")
    .eq("user_id", AGENCY_ROW_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { ...EMPTY_DB(), ...((data?.data as object) ?? {}) };
}

export async function writeDb(value: any, opts: Opts = {}): Promise<void> {
  if (!opts.publicAccess) await assertSignedIn();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("workspace_data")
    .upsert({ user_id: AGENCY_ROW_ID, data: value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export const readLocalDb = readDb;
export const writeLocalDb = writeDb;
