import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface EmailIntegrationConfig {
  connected: boolean;
  provider: "resend" | "smtp";
  resendApiKey?: string;
  senderEmail?: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  updatedAt?: string;
}

// Template HTML Oficial do SM Hub para E-mails Transacionais
function generateEmailHtml(params: {
  code?: string;
  title: string;
  message: string;
  userName?: string;
  actionUrl?: string;
  actionText?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${params.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050507; color: #ffffff; margin: 0; padding: 24px 0; }
    .container { max-width: 520px; margin: 0 auto; background-color: #0d0d11; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    .icon { width: 36px; height: 36px; background: linear-gradient(135deg, #ff5722 0%, #ff3d00 100%); border-radius: 10px; display: inline-block; text-align: center; line-height: 36px; font-weight: 900; color: #fff; font-size: 16px; }
    .brand { font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
    .brand span { color: #ff5722; }
    h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px; }
    .pin-box { background: rgba(255,87,34,0.08); border: 2px dashed rgba(255,87,34,0.4); border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
    .pin-code { font-family: 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #ff5722; margin: 0; }
    .pin-label { font-size: 11px; text-transform: uppercase; color: #71717a; letter-spacing: 1px; margin-top: 6px; font-weight: 700; }
    .btn { display: inline-block; background: linear-gradient(135deg, #ff5722 0%, #ff3d00 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }
    .footer { font-size: 11px; color: #52525b; text-align: center; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">
      <div class="icon">SM</div>
      <div class="brand">SM <span>HUB</span></div>
    </div>

    <h1>${params.title}</h1>
    <p>Olá${params.userName ? `, <strong>${params.userName}</strong>` : ""}!</p>
    <p>${params.message}</p>

    ${
      params.code
        ? `
      <div class="pin-box">
        <div class="pin-code">${params.code}</div>
        <div class="pin-label">Código de Verificação de Segurança (Válido por 15 min)</div>
      </div>
    `
        : ""
    }

    ${
      params.actionUrl
        ? `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.actionUrl}" class="btn">${params.actionText || "Acessar Plataforma"}</a>
      </div>
    `
        : ""
    }

    <p style="font-size: 12px; color: #71717a;">
      Se você não solicitou esta ação no SM Hub, desconsidere esta mensagem com segurança.
    </p>

    <div class="footer">
      Ambiente seguro com criptografia SSL 256-bit e conformidade com a LGPD.<br>
      © ${new Date().getFullYear()} SM Hub Soluções Digitais. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
  `;
}

// 1. Obter configuração atual de e-mail
export const getEmailConfig = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    const config: EmailIntegrationConfig = db.integrations?.email || {
      connected: !!process.env.RESEND_API_KEY,
      provider: "resend",
      senderEmail: "onboarding@resend.dev",
      senderName: "SM Hub",
    };

    return {
      success: true,
      config,
      hasEnvKey: !!process.env.RESEND_API_KEY,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// 2. Salvar configuração de e-mail (Resend ou SMTP)
export const saveEmailConfig = createServerFn({ method: "POST" })
  .validator((payload: Partial<EmailIntegrationConfig>) => payload)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.integrations) db.integrations = {};

      db.integrations.email = {
        ...db.integrations.email,
        ...data,
        connected: Boolean(data.resendApiKey || data.smtpHost || data.senderEmail),
        updatedAt: new Date().toISOString(),
      };

      await writeDb(db);
      return { success: true, config: db.integrations.email };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

// 2.1 Verificar e Validar Chave do Resend
export const verifyResendConnection = createServerFn({ method: "POST" })
  .validator((payload: { apiKey: string }) => payload)
  .handler(async ({ data }) => {
    await readDb();
    const apiKey = data.apiKey?.trim();
    if (!apiKey) {
      return { success: false, error: "Chave de API do Resend não fornecida." };
    }
    if (!apiKey.startsWith("re_")) {
      return {
        success: false,
        error: "Formato inválido. A chave do Resend deve começar com 're_'.",
      };
    }

    try {
      // Testa a chave buscando domínios na API oficial do Resend
      const response = await fetch("https://api.resend.com/domains", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const json = await response.json().catch(() => ({ data: [] }));
        const domains = (json.data || []).map((d: any) => ({
          name: d.name,
          status: d.status,
        }));

        return {
          success: true,
          message: "Conexão com a API do Resend estabelecida com sucesso!",
          domains,
          verified: true,
        };
      } else {
        const errJson = await response.json().catch(() => ({}));
        const msg =
          errJson.message ||
          (response.status === 401
            ? "Chave do Resend inválida ou sem permissão. Verifique sua chave em resend.com/api-keys."
            : `Erro ao comunicar com o Resend (HTTP ${response.status}).`);
        return { success: false, error: msg };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Falha de rede ao conectar com api.resend.com: ${err.message}`,
      };
    }
  });

// 3. Disparo de E-mail Transacional (com suporte a Resend API oficial + Fallback)
export const sendTransactionalEmail = createServerFn({ method: "POST" })
  .validator(
    (payload: {
      to: string;
      subject?: string;
      code?: string;
      type?: "verification" | "reset" | "welcome" | "subscription";
      userName?: string;
      planName?: string;
    }) => payload
  )
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      const emailConfig: EmailIntegrationConfig | undefined = db.integrations?.email;
      const resendApiKey = process.env["RESEND_API_KEY"];

      const code = data.code || Math.floor(100000 + Math.random() * 900000).toString();
      let title = "Código de Confirmação";
      let message = "Utilize o código de segurança abaixo para confirmar a veracidade do seu e-mail no SM Hub.";

      if (data.type === "reset") {
        title = "Redefinição de Senha";
        message = "Você solicitou a recuperação da sua senha de acesso. Utilize o código de 6 dígitos para continuar:";
      } else if (data.type === "subscription") {
        title = `Assinatura Confirmada — ${data.planName || "SM Hub"}`;
        message = `Sua assinatura do plano ${data.planName || "SM Hub"} foi ativada com sucesso! Conclua seu cadastro oficial para emitir contratos e propostas.`;
      }

      const html = generateEmailHtml({
        code: data.type === "subscription" ? undefined : code,
        title,
        message,
        userName: data.userName,
      });

      const subject = data.subject || `${code} é seu código de segurança SM Hub`;
      const sender = emailConfig?.senderEmail || "SM Hub <onboarding@resend.dev>";

      // Se temos a API Key do Resend configurada, dispara requisição HTTP oficial
      if (resendApiKey && resendApiKey.startsWith("re_")) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: sender,
              to: [data.to],
              subject,
              html,
            }),
          });

          const result = await res.json();
          if (res.ok) {
            console.log(`[Email Service] E-mail enviado com sucesso via Resend para ${data.to}. ID: ${result.id}`);
            return {
              success: true,
              provider: "resend",
              messageId: result.id,
              code,
            };
          } else {
            console.warn(`[Email Service] Resend retornou aviso: ${result.message || JSON.stringify(result)}`);
          }
        } catch (apiErr: any) {
          console.error("[Email Service] Erro ao comunicar com API Resend:", apiErr);
        }
      }

      return { success: false, provider: 'unavailable', error: 'Nenhum e-mail enviado. Serviço de envio não configurado ou indisponível.' };
    } catch (err: any) {
      console.error("[Email Service Error]:", err);
      return {
        success: false,
        error: err.message,
        code: data.code,
      };
    }
  });
