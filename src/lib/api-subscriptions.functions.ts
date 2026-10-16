import { createServerFn } from "@tanstack/react-start";
import { getCaller, resolveAccountId } from "./db-drive";

export interface PlanRow {
  id: string;
  name: string;
  price: number;
  cycle: string;
  description: string;
  features: string[];
  active: boolean;
  sort: number;
}

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("plans").select("*").eq("active", true).order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price), features: (p.features as string[]) ?? [] })) as PlanRow[];
});

export const getActiveSubscription = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { isFounder } = await getCaller();
    const accountId = await resolveAccountId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: acc } = await supabaseAdmin
      .from("accounts")
      .select("id,plan_id,plan_status,plan_valid_until,lifetime,status, plans(name,price)")
      .eq("id", accountId)
      .maybeSingle();
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(20);
    const lifetime = !!acc?.lifetime;
    const validUntil = acc?.plan_valid_until ? new Date(acc.plan_valid_until).getTime() : 0;
    const daysRemaining = lifetime ? 999999 : Math.max(0, Math.ceil((validUntil - Date.now()) / 86400000));
    const active = lifetime || (acc?.plan_status === "active" && daysRemaining > 0);
    const plan = (acc as any)?.plans;
    return {
      success: true,
      isFounder,
      subscription: {
        planId: acc?.plan_id ?? null,
        planName: lifetime ? "Fundador Master Vitalício" : plan?.name ?? "Sem plano",
        amount: lifetime ? 0 : Number(plan?.price ?? 0),
        status: lifetime ? "lifetime" : active ? "active" : acc?.plan_status === "none" ? "none" : "expired",
        isOwner: lifetime,
        validUntil: acc?.plan_valid_until ?? null,
        daysRemaining,
        isExpired: !active,
      },
      transactions: payments ?? [],
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    (p: { planId: string; billingType: "PIX" | "BOLETO" | "CREDIT_CARD"; name: string; cpfCnpj: string; phone?: string }) => {
      if (!p?.planId || !p.name?.trim()) throw new Error("Dados incompletos.");
      const doc = (p.cpfCnpj || "").replace(/\D/g, "");
      if (doc.length !== 11 && doc.length !== 14) throw new Error("Informe um CPF ou CNPJ válido.");
      if (!["PIX", "BOLETO", "CREDIT_CARD"].includes(p.billingType)) throw new Error("Forma de pagamento inválida.");
      return { ...p, cpfCnpj: doc, name: p.name.trim().slice(0, 120), phone: (p.phone || "").replace(/\D/g, "") };
    },
  )
  .handler(async ({ data }) => {
    try {
      const { user } = await getCaller();
      const accountId = await resolveAccountId();
      const { asaas } = await import("./asaas.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", data.planId).eq("active", true).maybeSingle();
      if (!plan) return { success: false, error: "Plano não encontrado." };
      const { data: acc } = await supabaseAdmin.from("accounts").select("*").eq("id", accountId).single();

      let customerId = acc.asaas_customer_id as string | null;
      if (!customerId) {
        const c = await asaas<{ id: string }>("/customers", {
          method: "POST",
          body: {
            name: data.name,
            cpfCnpj: data.cpfCnpj,
            email: acc.email || user.email,
            mobilePhone: data.phone || undefined,
            externalReference: accountId,
          },
        });
        customerId = c.id;
        await supabaseAdmin.from("accounts").update({ asaas_customer_id: customerId }).eq("id", accountId);
      }

      const { data: row, error: rowErr } = await supabaseAdmin
        .from("payments")
        .insert({
          account_id: accountId,
          kind: "subscription",
          reference: plan.id,
          description: `Plano ${plan.name} — SM Hub`,
          amount: plan.price,
          billing_type: data.billingType,
        })
        .select()
        .single();
      if (rowErr) throw new Error(rowErr.message);

      const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const pay = await asaas<any>("/payments", {
        method: "POST",
        body: {
          customer: customerId,
          billingType: data.billingType,
          value: Number(plan.price),
          dueDate: due,
          description: `Plano ${plan.name} — SM Hub`,
          externalReference: row.id,
        },
      });
      let pixPayload: string | null = null;
      let pixImage: string | null = null;
      if (data.billingType === "PIX") {
        const qr = await asaas<any>(`/payments/${pay.id}/pixQrCode`);
        pixPayload = qr.payload;
        pixImage = qr.encodedImage;
      }
      const { data: saved } = await supabaseAdmin
        .from("payments")
        .update({ asaas_payment_id: pay.id, invoice_url: pay.invoiceUrl, pix_payload: pixPayload, pix_image: pixImage })
        .eq("id", row.id)
        .select()
        .single();
      return { success: true, payment: saved };
    } catch (err: any) {
      return { success: false, error: err.message || "Falha ao gerar cobrança." };
    }
  });

export const getPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const accountId = await resolveAccountId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("payments").select("status").eq("id", id).eq("account_id", accountId).maybeSingle();
    return { status: data?.status ?? "UNKNOWN", isPaid: data?.status === "RECEIVED" || data?.status === "CONFIRMED" };
  });
