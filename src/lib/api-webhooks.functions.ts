import { createServerFn } from "@tanstack/react-start";
import { readDb } from "./db-drive";

// Applies an Asaas payment event to our records. Called only from the
// token-verified webhook route.
export async function handleAsaasEvent(body: any) {
  const p = body?.payment;
  if (!p?.id) return { success: true, ignored: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let { data: row } = await supabaseAdmin.from("payments").select("*").eq("asaas_payment_id", p.id).maybeSingle();
  if (!row && p.externalReference) {
    const r = await supabaseAdmin.from("payments").select("*").eq("id", p.externalReference).maybeSingle();
    row = r.data;
  }
  if (!row) return { success: true, ignored: true };

  const paid = body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED";
  const status = paid
    ? body.event === "PAYMENT_RECEIVED" ? "RECEIVED" : "CONFIRMED"
    : p.status || row.status;
  const alreadyPaid = row.status === "RECEIVED" || row.status === "CONFIRMED";
  await supabaseAdmin
    .from("payments")
    .update({ status, asaas_payment_id: p.id, paid_at: paid ? new Date().toISOString() : row.paid_at })
    .eq("id", row.id);

  if (paid && !alreadyPaid && row.kind === "subscription") {
    const { data: plan } = await supabaseAdmin.from("plans").select("cycle").eq("id", row.reference).maybeSingle();
    const { data: acc } = await supabaseAdmin.from("accounts").select("plan_valid_until").eq("id", row.account_id).single();
    const base = Math.max(Date.now(), acc?.plan_valid_until ? new Date(acc.plan_valid_until).getTime() : 0);
    const days = plan?.cycle === "YEARLY" ? 365 : plan?.cycle === "QUARTERLY" ? 90 : 30;
    await supabaseAdmin
      .from("accounts")
      .update({
        plan_id: row.reference,
        plan_status: "active",
        plan_valid_until: new Date(base + days * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.account_id);
    const { notifyAccount } = await import("./notifications.server");
    await notifyAccount(row.account_id, { kind: "subscription", title: "Assinatura confirmada", body: `Plano ${row.reference} — pagamento recebido`, link: "/fundador" }, null);
  }
  return { success: true };
}

// Public proposal page polls whether the agency marked the proposal approved/paid.
export const checkPaymentStatus = createServerFn({ method: "GET" })
  .validator((params: { type: "orcamento" | "subscription"; id: string }) => params)
  .handler(async ({ data: { type, id } }) => {
    try {
      if (type !== "orcamento") return { success: false, isPaid: false };
      const db = await readDb({ publicAccess: true, locate: { collection: "orcamentos", id } });
      const orc = (db.orcamentos || []).find((o: any) => o.id === id);
      if (!orc) return { success: false, isPaid: false, error: "Orçamento não encontrado" };
      return { success: true, isPaid: orc.status === "aprovado", status: orc.status, aprovadoEm: orc.aprovadoEm };
    } catch (e: any) {
      return { success: false, isPaid: false, error: e.message };
    }
  });
