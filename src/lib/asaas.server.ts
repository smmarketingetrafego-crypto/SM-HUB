// Server-only Asaas client. Never import from browser code.
function baseUrl(key: string) {
  // Asaas sandbox keys contain "_hmlg_"; production keys contain "_prod_".
  return key.includes("_hmlg_") ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
}

export function asaasConfigured() {
  return !!process.env["ASAAS_API_KEY"];
}

export async function asaas<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env["ASAAS_API_KEY"];
  if (!key) throw new Error("Pagamentos ainda não configurados. Fale com o suporte.");
  const res = await fetch(`${baseUrl(key)}${path}`, {
    method: init.method ?? "GET",
    headers: { access_token: key, "Content-Type": "application/json", "User-Agent": "SMHub" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Asaas ${path} failed [${res.status}]: ${text}`);
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.errors?.map((e: any) => e.description).join("; ") || text;
    } catch {}
    throw new Error(`Asaas: ${msg}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}
