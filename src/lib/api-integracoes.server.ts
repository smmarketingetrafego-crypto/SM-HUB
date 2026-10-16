import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface WhatsAppConnection {
  connected: boolean;
  phone?: string;
  deviceName?: string;
  connectedAt?: string;
  mode?: "qrcode" | "phone";
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
    mode: "qrcode"
  },
  google: {
    connected: false,
    authMethod: "google",
    accountEmail: "",
    accountName: "",
    planName: "",
    updatedAt: ""
  },
  openai: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    accountName: "",
    defaultModel: "gpt-4o"
  },
  claude: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    accountName: "",
    defaultModel: "claude-3-5-sonnet-20241022"
  },
  deepseek: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    defaultModel: "deepseek-chat"
  },
  asaas: {
    connected: false,
    authMethod: "account",
    accountEmail: "",
    environment: "production"
  },
  stripe: {
    connected: false,
    authMethod: "oauth",
    accountEmail: ""
  },
  mercadopago: {
    connected: false,
    authMethod: "oauth",
    accountEmail: ""
  }
};

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.integrations || typeof db.integrations !== "object" || Object.keys(db.integrations).length === 0) {
      db.integrations = DEFAULT_INTEGRATIONS;
      await writeDb(db);
    }
    return { ...DEFAULT_INTEGRATIONS, ...db.integrations } as IntegrationsData;
  } catch (e: any) {
    console.error("Failed to read integrations:", e);
    return DEFAULT_INTEGRATIONS;
  }
});

export const saveIntegration = createServerFn({ method: "POST" })
  .inputValidator((payload: { service: string; data: any }) => payload)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.integrations) db.integrations = { ...DEFAULT_INTEGRATIONS };

      db.integrations[data.service] = {
        ...(db.integrations[data.service] || {}),
        ...data.data,
        connected: true,
        updatedAt: new Date().toISOString()
      };

      await writeDb(db);
      return { success: true, integrations: db.integrations };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .inputValidator((service: string) => service)
  .handler(async ({ data: service }) => {
    try {
      const db = await readDb();
      if (!db.integrations) db.integrations = { ...DEFAULT_INTEGRATIONS };

      db.integrations[service] = {
        connected: false,
        updatedAt: new Date().toISOString()
      };

      await writeDb(db);
      return { success: true, integrations: db.integrations };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const generateWhatsAppSession = createServerFn({ method: "POST" }).handler(async () => {
  const sessionId = `smhub-wpp-${Date.now()}`;
  const qrString = `2@smhub-session-${Math.random().toString(36).substring(2, 15)},${Date.now()},1B8F55C9`;
  return {
    success: true,
    sessionId,
    qrString,
    expiresInSeconds: 60
  };
});

export const pairWhatsAppWithPhone = createServerFn({ method: "POST" })
  .inputValidator((phone: string) => phone)
  .handler(async ({ data: phone }) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codePart1 = "";
    let codePart2 = "";
    for (let i = 0; i < 4; i++) {
      codePart1 += chars.charAt(Math.floor(Math.random() * chars.length));
      codePart2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pairingCode = `${codePart1}-${codePart2}`;

    return {
      success: true,
      phone,
      pairingCode,
      instructions: "No seu celular, toque em Aparelhos Conectados > Conectar com número de telefone e digite o código acima."
    };
  });
