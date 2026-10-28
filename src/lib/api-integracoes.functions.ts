import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface WhatsAppConnection {
  connected: boolean;
  phone?: string;
  deviceName?: string;
  connectedAt?: string;
  mode?: "qrcode" | "phone" | "direct" | "gateway" | "meta_cloud";
  qrCodeData?: string;
}

export interface AIProviderConnection {
  connected: boolean;
  authMethod?: "google" | "account" | "apikey";
  accountEmail?: string;
  accountName?: string;
  planName?: string;
  apiKey?: string;
  defaultModel?: string;
  organizationId?: string;
  updatedAt?: string;
}

export interface PaymentGatewayConnection {
  connected: boolean;
  authMethod?: "oauth" | "account" | "apikey";
  accountEmail?: string;
  accountName?: string;
  pixKey?: string;
  apiKey?: string;
  secretKey?: string;
  publishableKey?: string;
  accessToken?: string;
  environment?: "production" | "sandbox";
  walletId?: string;
  updatedAt?: string;
}

export interface IntegrationsData {
  whatsapp: WhatsAppConnection;
  google: AIProviderConnection;
  openai: AIProviderConnection;
  claude: AIProviderConnection;
  deepseek: AIProviderConnection;
  asaas: PaymentGatewayConnection;
  stripe: PaymentGatewayConnection;
  mercadopago: PaymentGatewayConnection;
  [key: string]: any;
}

export const DEFAULT_INTEGRATIONS: IntegrationsData = {
  whatsapp: {
    connected: false,
    phone: "",
    deviceName: "",
    connectedAt: "",
    mode: "qrcode",
  },
  google: {
    connected: false,
    authMethod: "google",
    accountEmail: "",
    accountName: "",
    planName: "",
    updatedAt: "",
  },
  openai: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    accountName: "",
    defaultModel: "gpt-4o",
  },
  claude: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    accountName: "",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  deepseek: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    defaultModel: "deepseek-chat",
  },
  asaas: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    environment: "production",
  },
  stripe: {
    connected: false,
    authMethod: "oauth",
    accountEmail: "",
  },
  mercadopago: {
    connected: false,
    authMethod: "oauth",
    accountEmail: "",
  },
};

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.integrations) {
      db.integrations = structuredClone(DEFAULT_INTEGRATIONS);
      await writeDb(db);
    }
    return {
      ...DEFAULT_INTEGRATIONS,
      ...db.integrations,
    } as IntegrationsData;
  } catch (e: any) {
    console.error("Failed to read integrations:", e);
    return structuredClone(DEFAULT_INTEGRATIONS);
  }
});

export const getExternalStatus = createServerFn({ method: "GET" }).handler(async () => {
  const db = await readDb();
  const integrations = db.integrations || {};
  return {
    asaasConfigured: !!(process.env['ASAAS_API_KEY'] || (integrations.asaas?.connected && (integrations.asaas?.apiKey || integrations.asaas?.accountEmail))),
    webhookConfigured: !!(process.env['ASAAS_WEBHOOK_TOKEN'] || (integrations.asaas?.connected && integrations.asaas?.webhookToken)),
    emailConfigured: !!(process.env['RESEND_API_KEY'] || (integrations.email?.connected && integrations.email?.apiKey)),
    aiConfigured: !!(
      process.env['OPENAI_API_KEY'] ||
      process.env['LOVABLE_API_KEY'] ||
      process.env['DEEPSEEK_API_KEY'] ||
      (integrations.openai?.connected && (integrations.openai?.apiKey || integrations.openai?.accountEmail)) ||
      (integrations.claude?.connected && (integrations.claude?.apiKey || integrations.claude?.accountEmail)) ||
      (integrations.deepseek?.connected && (integrations.deepseek?.apiKey || integrations.deepseek?.accountEmail)) ||
      (integrations.google?.connected && integrations.google?.apiKey)
    ),
    driveConnected: !!(process.env['GOOGLE_DRIVE_API_KEY'] || (integrations.google?.connected && integrations.google?.accountEmail)),
  };
});

export const testAsaasConnection = createServerFn({ method: "POST" })
  .validator((p: { apiKey: string; environment?: "production" | "sandbox" }) => p)
  .handler(async ({ data }) => {
    try {
      const baseUrl = data.environment === "sandbox" ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";
      const res = await fetch(`${baseUrl}/finance/balance`, {
        headers: { "access_token": data.apiKey }
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, balance: json.balance };
      }
      return { success: false, error: "Chave inválida ou não autorizada no Asaas." };
    } catch (e: any) {
      return { success: false, error: e.message || "Erro de conexão com Asaas." };
    }
  });

export const testAiKey = createServerFn({ method: "POST" })
  .validator((p: { provider: string; apiKey: string }) => p)
  .handler(async ({ data }) => {
    try {
      if (data.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${data.apiKey}` }
        });
        if (res.ok) return { success: true };
        return { success: false, error: 'Chave de API OpenAI inválida ou sem permissão.' };
      }
      if (data.provider === 'deepseek') {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { 'Authorization': `Bearer ${data.apiKey}` }
        });
        if (res.ok) return { success: true };
        return { success: false, error: 'Chave de API DeepSeek inválida.' };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao validar chave.' };
    }
  });

export const saveIntegration = createServerFn({ method: "POST" })
  .validator((p: { service: string; data: unknown }) => p)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.integrations) db.integrations = structuredClone(DEFAULT_INTEGRATIONS);
      const current = db.integrations[data.service] || {};
      db.integrations[data.service] = {
        ...current,
        ...(data.data as object),
        connected: true,
        updatedAt: new Date().toISOString(),
      };
      await writeDb(db);
      return { success: true, integrations: db.integrations };
    } catch (e: any) {
      console.error("Failed to save integration:", e);
      return { success: false, error: e.message };
    }
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .validator((p: string) => p)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (db.integrations && db.integrations[data]) {
        db.integrations[data] = {
          ...(DEFAULT_INTEGRATIONS[data as keyof IntegrationsData] || { connected: false }),
          connected: false,
        };
        await writeDb(db);
      }
      return { success: true, integrations: db.integrations || DEFAULT_INTEGRATIONS };
    } catch (e: any) {
      console.error("Failed to disconnect integration:", e);
      return { success: false, error: e.message };
    }
  });

export const generateWhatsAppSession = createServerFn({ method: "POST" }).handler(async () => {
  const sessionToken = `smhub_wa_${Date.now()}`;
  return {
    success: true,
    qrCodeData: `2@${sessionToken},${Date.now()},SM-HUB-WEB`,
    expiresInSeconds: 60,
  };
});

export const pairWhatsAppWithPhone = createServerFn({ method: "POST" })
  .validator((phone: string) => phone)
  .handler(async ({ data: phone }) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let part1 = "";
    let part2 = "";
    for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
    const pairingCode = `${part1}-${part2}`;

    return {
      success: true,
      pairingCode,
      phone,
    };
  });

export const testWhatsAppGateway = createServerFn({ method: "POST" })
  .validator((p: { gatewayUrl: string; apiKey?: string; instanceName?: string }) => p)
  .handler(async ({ data }) => {
    try {
      const url = data.gatewayUrl.replace(/\/+$/, '');
      const res = await fetch(`${url}/instance/connectionState/${data.instanceName || 'default'}`, {
        headers: data.apiKey ? { "apikey": data.apiKey } : {}
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, state: json };
      }
      return { success: false, error: "Instância não respondeu ou credenciais inválidas." };
    } catch (e: any) {
      return { success: false, error: "Não foi possível conectar ao endereço do gateway informado." };
    }
  });
