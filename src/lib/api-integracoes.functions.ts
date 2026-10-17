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
  await readDb();
  return structuredClone(DEFAULT_INTEGRATIONS);
});
export const getExternalStatus = createServerFn({ method: "GET" }).handler(async () => {
  await readDb();
  return { asaasConfigured: !!process.env['ASAAS_API_KEY'], webhookConfigured: !!process.env['ASAAS_WEBHOOK_TOKEN'], emailConfigured: !!process.env['RESEND_API_KEY'], aiConfigured: !!process.env['LOVABLE_API_KEY'], driveConnected: false };
});
export const saveIntegration = createServerFn({ method: "POST" }).inputValidator((p: { service: string; data: unknown }) => p).handler(async () => {
  await readDb(); return { success: false, error: 'Conexão indisponível. Configure uma autorização real por formulário seguro.' };
});
export const disconnectIntegration = createServerFn({ method: "POST" }).inputValidator((p: string) => p).handler(async ({ data }) => {
  const db = await readDb(); if (db.integrations) delete db.integrations[data]; await writeDb(db); return { success: true, integrations: DEFAULT_INTEGRATIONS };
});
export const generateWhatsAppSession = createServerFn({ method: "POST" }).handler(async () => { await readDb(); return { success: false, error: 'WhatsApp oficial não configurado.' }; });
export const pairWhatsAppWithPhone = createServerFn({ method: "POST" }).inputValidator((p: string) => p).handler(async () => { await readDb(); return { success: false, error: 'Pareamento não disponível. WhatsApp oficial não configurado.' }; });
