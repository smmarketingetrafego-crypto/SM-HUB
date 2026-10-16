import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface PlanDefinition {
  id: "freelancer" | "growth" | "scale";
  name: string;
  price: number;
  priceFormatted: string;
  period: string;
  tagline: string;
  popular?: boolean;
  features: string[];
}

export const SYSTEM_PLANS: PlanDefinition[] = [
  {
    id: "freelancer",
    name: "Freelancer Pro",
    price: 97,
    priceFormatted: "R$ 97",
    period: "/mês",
    tagline: "Ideal para designers, desenvolvedores e profissionais autônomos independentes.",
    features: [
      "1 Usuário Autônomo / Freelancer",
      "Propostas e Contratos Ilimitados",
      "Contrato Amparado no Art. 442-B CLT",
      "Chave Pix Própria nos Orçamentos",
      "Buscador de Endereço via CEP",
      "Upload de Assinatura Digital e Rubrica",
      "Portal do Cliente com Link Seguro",
    ],
  },
  {
    id: "growth",
    name: "Agência Growth",
    price: 197,
    priceFormatted: "R$ 197",
    period: "/mês",
    popular: true,
    tagline: "Desenvolvido para agências de marketing, estúdios criativos e equipes em expansão.",
    features: [
      "Até 5 Usuários da Equipe",
      "Contratos de Prestação de Serviços PJ",
      "Propostas Comerciais Personalizadas",
      "WhatsApp Web Integrado",
      "Gestão Financeira & Múltiplas Moedas",
      "Domínio e Logo Personalizados",
      "Suporte Prioritário Via WhatsApp",
    ],
  },
  {
    id: "scale",
    name: "Scale Enterprise",
    price: 397,
    priceFormatted: "R$ 397",
    period: "/mês",
    tagline: "Para operações de grande volume, software houses e agências consolidadas.",
    features: [
      "Usuários e Membros Ilimitados",
      "Multi-empresas e Múltiplas Marcas",
      "Integrações Avançadas de Gateways (Asaas, Stripe, MP)",
      "Agentes de IA e Automações Ilimitadas",
      "Relatórios Executivos de Performance",
      "Gerente de Conta Dedicado",
      "SLA de 99.9% e Backups Diários",
    ],
  },
];

export interface SubscriptionTransaction {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  paymentMethod: "pix" | "credit_card";
  createdAt: string;
  paidAt?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    docNumber?: string;
  };
  pix?: {
    copiaECola: string;
    qrCodeUrl: string;
    expiresAt: string;
  };
  card?: {
    brand: string;
    last4: string;
    holder: string;
  };
  gateway: "asaas" | "mercadopago" | "stripe" | "internal";
}

// Helper to generate realistic EMV Pix Copia e Cola string
function generatePixCopiaECola(amount: number, transactionId: string): string {
  const formattedAmount = amount.toFixed(2);
  const pixKey = "financeiro@smhub.com.br";
  const merchantName = "SM HUB SOLUCOES";
  const merchantCity = "SAO PAULO";
  
  // Realist standard BR Code Pix format
  return `00020126580014br.gov.bcb.pix0114${pixKey}0214SMHUB-SUB-${transactionId.slice(-6)}520400005303986540${formattedAmount.length}${formattedAmount}5802BR5916${merchantName}6009${merchantCity}62200516${transactionId}6304A1B2`;
}

// 1. Criar transação de assinatura (Pix ou Cartão)
export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .validator(
    (payload: {
      planId: "freelancer" | "growth" | "scale";
      paymentMethod: "pix" | "credit_card";
      customer: {
        name: string;
        email: string;
        phone?: string;
        docNumber?: string;
      };
      cardDetails?: {
        cardNumber: string;
        holderName: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
      };
      gateway?: "asaas" | "mercadopago" | "stripe";
    }) => payload
  )
  .handler(async ({ data }) => {
    try {
      const plan = SYSTEM_PLANS.find((p) => p.id === data.planId) || SYSTEM_PLANS[1];
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

      let transaction: SubscriptionTransaction = {
        id: transactionId,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        status: data.paymentMethod === "credit_card" ? "paid" : "pending",
        paymentMethod: data.paymentMethod,
        createdAt: now.toISOString(),
        customer: data.customer,
        gateway: data.gateway || "asaas",
      };

      if (data.paymentMethod === "pix") {
        const copiaECola = generatePixCopiaECola(plan.price, transactionId);
        // QR Code online generator url compatible with any standard client
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copiaECola)}`;
        
        transaction.pix = {
          copiaECola,
          qrCodeUrl,
          expiresAt,
        };
      } else if (data.paymentMethod === "credit_card" && data.cardDetails) {
        const rawNum = data.cardDetails.cardNumber.replace(/\D/g, "");
        const last4 = rawNum.slice(-4) || "4242";
        let brand = "Visa";
        if (rawNum.startsWith("5")) brand = "Mastercard";
        if (rawNum.startsWith("4")) brand = "Visa";
        if (rawNum.startsWith("3")) brand = "Amex";
        if (rawNum.startsWith("6")) brand = "Elo";

        transaction.card = {
          brand,
          last4,
          holder: data.cardDetails.holderName.toUpperCase(),
        };
        transaction.paidAt = now.toISOString();
      }

      // Salva no banco de dados
      const db = await readDb();
      if (!db.subscriptionTransactions) db.subscriptionTransactions = [];
      db.subscriptionTransactions.unshift(transaction);

      // Se cartão de crédito pago, ativa a assinatura no perfil
      if (transaction.status === "paid") {
        if (!db.activeSubscription) db.activeSubscription = {};
        db.activeSubscription = {
          planId: plan.id,
          planName: plan.name,
          amount: plan.price,
          status: "active",
          startedAt: now.toISOString(),
          validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paymentMethod: data.paymentMethod,
          transactionId,
        };
      }

      await writeDb(db);

      return {
        success: true,
        transaction,
      };
    } catch (err: any) {
      console.error("Erro ao criar checkout de assinatura:", err);
      return {
        success: false,
        error: err.message || "Falha ao processar assinatura.",
      };
    }
  });

// 2. Confirmar pagamento (ex: Pix recebido)
export const confirmSubscriptionPayment = createServerFn({ method: "POST" })
  .validator((transactionId: string) => transactionId)
  .handler(async ({ data: transactionId }) => {
    try {
      const db = await readDb();
      if (!db.subscriptionTransactions) db.subscriptionTransactions = [];

      const tx = db.subscriptionTransactions.find((t: SubscriptionTransaction) => t.id === transactionId);
      if (!tx) {
        return { success: false, error: "Transação não encontrada." };
      }

      const now = new Date();
      tx.status = "paid";
      tx.paidAt = now.toISOString();

      // Ativa assinatura
      db.activeSubscription = {
        planId: tx.planId,
        planName: tx.planName,
        amount: tx.amount,
        status: "active",
        startedAt: now.toISOString(),
        validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: tx.paymentMethod,
        transactionId: tx.id,
      };

      await writeDb(db);

      return {
        success: true,
        transaction: tx,
        subscription: db.activeSubscription,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

// 3. Obter status da assinatura atual com suporte a Dono Vitalício e Trial de 7 Dias para convidados
export const getActiveSubscription = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    
    // Se ainda não existir assinatura configurada, a conta raiz é do Proprietário & Fundador Vitalício (zero cobrança)
    if (!db.activeSubscription) {
      db.activeSubscription = {
        planId: "scale_founder",
        planName: "Proprietário & Fundador Vitalício",
        status: "lifetime",
        isOwner: true,
        isTrial: false,
        amount: 0,
        startedAt: "2024-01-01T00:00:00.000Z",
        validUntil: null,
        paymentMethod: "Acesso Mestre (Proprietário)",
      };
      await writeDb(db);
    }

    const sub = db.activeSubscription;
    const isOwner = sub.isOwner || sub.status === "lifetime";
    const now = Date.now();
    const validUntilTime = new Date(sub.validUntil || now).getTime();
    const daysRemaining = isOwner ? 999999 : Math.max(0, Math.ceil((validUntilTime - now) / (1000 * 60 * 60 * 24)));
    const isExpired = !isOwner && daysRemaining <= 0 && sub.status === "trial";

    return {
      success: true,
      subscription: {
        ...sub,
        isOwner,
        daysRemaining,
        isExpired,
        trialDaysTotal: sub.trialDaysTotal || 7,
      },
      transactions: db.subscriptionTransactions || [],
      replication: {
        inviteUrl: "https://smhub.com.br/auth?mode=register&ref=trial7d",
        terms: "7 dias de acesso completo sem fidelidade e ativação instantânea para convidados.",
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
});

// 4. Gerar link personalizado para replicar a plataforma para outras pessoas com 7 dias grátis
export const generateReplicationInvite = createServerFn({ method: "POST" })
  .validator((payload: { agencyName?: string; customCode?: string }) => payload)
  .handler(async ({ data }) => {
    try {
      const code = data?.customCode?.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
      const agency = data?.agencyName?.trim() || "SM Hub";
      const inviteUrl = `https://smhub.com.br/auth?mode=register&ref=${code}&trial=7d`;
      return {
        success: true,
        inviteUrl,
        code,
        agency,
        trialDays: 7,
        message: `Convite gerado! Compartilhe o link para liberar 7 dias grátis na plataforma ${agency}.`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
