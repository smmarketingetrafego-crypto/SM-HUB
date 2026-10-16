import { createServerFn } from "@tanstack/react-start";

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "apple" | "microsoft";
  verified: boolean;
}

// Configuração do cliente OAuth2 do Google (isolado no servidor sem pré-bundle no cliente)
async function getGoogleOAuthClient(redirectUri?: string) {
  const { google } = await import("googleapis");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const defaultRedirect = process.env.GOOGLE_REDIRECT_URI || "http://localhost:8080/api/auth/social-callback";
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri || defaultRedirect
  );
}

// 1. Gerar URL de Autenticação Oficial
export const getSocialAuthUrl = createServerFn({ method: "POST" })
  .inputValidator((payload: { provider: "google" | "apple" | "microsoft"; redirectOrigin?: string; isPopup?: boolean }) => payload)
  .handler(async ({ data }) => {
    const { provider, redirectOrigin, isPopup } = data;
    const origin = redirectOrigin || "http://localhost:8080";
    const callbackUrl = `${origin}/api/auth/social-callback`;

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return {
          success: false,
          error: "GOOGLE_CLIENT_ID não configurado no ambiente.",
        };
      }

      const client = await getGoogleOAuthClient(callbackUrl);
      const state = JSON.stringify({ provider: "google", isPopup: !!isPopup });
      
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "openid",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
        state,
        prompt: "select_account",
      });

      return { success: true, url };
    }

    if (provider === "microsoft") {
      // Azure AD v2 endpoint oficial
      const clientId = process.env.MICROSOFT_CLIENT_ID || "demo-microsoft-client-id";
      const state = JSON.stringify({ provider: "microsoft", isPopup: !!isPopup });
      const scope = encodeURIComponent("openid profile email User.Read");
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_mode=query&scope=${scope}&state=${encodeURIComponent(state)}`;

      return { success: true, url };
    }

    if (provider === "apple") {
      // Apple ID OAuth oficial
      const clientId = process.env.APPLE_CLIENT_ID || "com.smhub.auth";
      const state = JSON.stringify({ provider: "apple", isPopup: !!isPopup });
      const scope = encodeURIComponent("name email");
      const url = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        callbackUrl
      )}&response_type=code%20id_token&scope=${scope}&response_mode=form_post&state=${encodeURIComponent(state)}`;

      return { success: true, url };
    }

    return { success: false, error: "Provedor desconhecido." };
  });

// 2. Processar retorno de código do Google
export const processGoogleSocialCallback = createServerFn({ method: "POST" })
  .inputValidator((payload: { code: string; redirectOrigin?: string }) => payload)
  .handler(async ({ data }) => {
    try {
      const { google } = await import("googleapis");
      const callbackUrl = `${data.redirectOrigin || "http://localhost:8080"}/api/auth/social-callback`;
      const client = await getGoogleOAuthClient(callbackUrl);
      const { tokens } = await client.getToken(data.code);
      client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const userInfo = await oauth2.userinfo.get();

      if (!userInfo.data || !userInfo.data.email) {
        return { success: false, error: "Não foi possível obter os dados da conta Google." };
      }

      const user: SocialUser = {
        id: userInfo.data.id || String(Date.now()),
        email: userInfo.data.email,
        name: userInfo.data.name || userInfo.data.email.split("@")[0],
        picture: userInfo.data.picture || undefined,
        provider: "google",
        verified: Boolean(userInfo.data.verified_email),
      };

      return { success: true, user };
    } catch (err: any) {
      console.error("[SocialAuth] Erro no callback Google:", err);
      return { success: false, error: err.message || "Falha na troca de token com Google." };
    }
  });
