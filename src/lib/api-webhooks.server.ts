import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { type Orcamento, DEFAULT_ORCAMENTOS } from "./api-propostas.server";

export interface WebhookPaymentEvent {
  gateway: "asaas" | "mercadopago" | "stripe" | "manual";
  event: string;
  externalReference?: string;
  paymentId?: string;
  amount?: number;
  status: "CONFIRMED" | "RECEIVED" | "PENDING" | "FAILED";
  paidAt?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

// 1. Processador Central de Webhooks de Pagamento (Asaas, Mercado Pago, Stripe)
export async function handleWebhookPayment(payload: WebhookPaymentEvent) {
  try {
      const db = await readDb();
      if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];
      if (!db.transactions) db.transactions = [];
      if (!db.projects) db.projects = [];
      if (!db.subscriptionTransactions) db.subscriptionTransactions = [];

      const ref = payload.externalReference || payload.paymentId || "";
      const isPaid = payload.status === "CONFIRMED" || payload.status === "RECEIVED";

      let matchedType: "orcamento" | "subscription" | "unknown" = "unknown";
      let updatedEntity: any = null;

      // ── Caso A: Pagamento de Proposta / Orçamento Comercial ──
      const orcIndex = db.orcamentos.findIndex((o: any) => 
        o.id === ref || o.numero === ref || (ref && o.titulo.toLowerCase().includes(ref.toLowerCase()))
      );

      if (orcIndex !== -1 && isPaid) {
        matchedType = "orcamento";
        const orc = db.orcamentos[orcIndex];
        orc.status = "aprovado";
        orc.aprovadoEm = payload.paidAt || new Date().toLocaleString("pt-BR");
        orc.paymentGateway = payload.gateway;
        orc.paymentId = payload.paymentId;

        // Registra receita no financeiro
        const txId = `tx-pix-${Date.now()}`;
        const newTx = {
          id: txId,
          description: `Liquidação Pix: ${orc.titulo} (${orc.numero})`,
          amount: payload.amount || orc.valor,
          type: "in",
          category: "Serviços Digitais",
          date: new Date().toISOString().split("T")[0],
          status: "Recebido",
          gateway: payload.gateway,
          cliente: orc.cliente
        };
        db.transactions.unshift(newTx);
        orc.transacaoId = txId;

        // Cria projeto automaticamente se não existir
        if (!orc.projetoId) {
          const projId = `proj-${Date.now()}`;
          const newProj = {
            id: projId,
            name: orc.titulo,
            client: orc.cliente,
            budget: orc.valor,
            status: "in_progress",
            deadline: orc.prazoEntrega || "30 dias",
            progress: 10,
          };
          db.projects.unshift(newProj);
          orc.projetoId = projId;
        }

        // Notificação automática de confirmação
        if (!db.whatsapp) db.whatsapp = [];
        db.whatsapp.push({
          id: `msg-webhook-${Date.now()}`,
          contactId: `c_${orc.cliente}`,
          contactName: orc.cliente,
          phone: (orc as any).telefone || "",
          text: `✅ Pagamento Pix confirmado via ${payload.gateway.toUpperCase()}! O valor de R$ ${(orc.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} da proposta ${orc.numero} foi liquidado e o kickoff do projeto "${orc.titulo}" já está liberado.`,
          sender: "automation",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          status: "delivered",
          isAutomation: true
        });

        updatedEntity = orc;
      }

      // ── Caso B: Pagamento de Assinatura de Plano SaaS (SM HUB) ──
      const subTxIndex = db.subscriptionTransactions.findIndex((st: any) => 
        st.id === ref || st.planId === ref
      );

      if (subTxIndex !== -1 && isPaid) {
        matchedType = "subscription";
        const subTx = db.subscriptionTransactions[subTxIndex];
        subTx.status = "paid";
        subTx.paidAt = payload.paidAt || new Date().toISOString();

        // Ativa a assinatura
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        db.activeSubscription = {
          planId: subTx.planId,
          planName: subTx.planName,
          amount: subTx.amount,
          status: "active",
          startedAt: new Date().toISOString(),
          validUntil: validUntil.toISOString(),
          paymentMethod: subTx.paymentMethod || "pix",
          transactionId: subTx.id
        };

        updatedEntity = db.activeSubscription;
      }

      await writeDb(db);

      return {
        success: true,
        matchedType,
        updatedEntity,
        receivedPayload: payload
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
}

export const processPaymentWebhook = createServerFn({ method: "POST" })
  .validator((event: WebhookPaymentEvent) => event)
  .handler(async ({ data: payload }) => {
    return handleWebhookPayment(payload);
  });

// 2. Consulta de Status de Pagamento em Tempo Real (Polling)
export const checkPaymentStatus = createServerFn({ method: "GET" })
  .validator((params: { type: "orcamento" | "subscription"; id: string }) => params)
  .handler(async ({ data: { type, id } }) => {
    try {
      const db = await readDb();

      if (type === "orcamento") {
        const orcamentos = db.orcamentos || DEFAULT_ORCAMENTOS;
        const orc = orcamentos.find((o: any) => o.id === id || o.numero === id);
        if (!orc) return { success: false, isPaid: false, error: "Orçamento não encontrado" };

        const isPaid = orc.status === "aprovado";
        return {
          success: true,
          isPaid,
          status: orc.status,
          aprovadoEm: orc.aprovadoEm,
          transacaoId: orc.transacaoId,
          projetoId: orc.projetoId
        };
      }

      if (type === "subscription") {
        const subTxs = db.subscriptionTransactions || [];
        const activeSub = db.activeSubscription;

        const tx = subTxs.find((t: any) => t.id === id);
        const isPaid = (tx && tx.status === "paid") || (activeSub && activeSub.status === "active");

        return {
          success: true,
          isPaid: !!isPaid,
          status: isPaid ? "paid" : "pending",
          activeSubscription: activeSub
        };
      }

      return { success: false, isPaid: false };
    } catch (e: any) {
      return { success: false, isPaid: false, error: e.message };
    }
  });

// 3. Simulador de Disparo de Webhook Pix Instantâneo (Ambiente de Testes da Agência)
export const simulatePaymentConfirmation = createServerFn({ method: "POST" })
  .validator((params: { type: "orcamento" | "subscription"; id: string; gateway?: "asaas" | "mercadopago" }) => params)
  .handler(async ({ data: { type, id, gateway = "asaas" } }) => {
    return processPaymentWebhook({
      data: {
        gateway,
        event: "PAYMENT_RECEIVED",
        externalReference: id,
        paymentId: `sim_${Date.now()}`,
        status: "RECEIVED",
        paidAt: new Date().toLocaleString("pt-BR")
      }
    });
  });
