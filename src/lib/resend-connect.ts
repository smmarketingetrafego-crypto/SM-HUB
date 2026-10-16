import { toast } from "sonner";
import type { EmailIntegrationConfig } from "./api-email.server";

export const RESEND_EVENT_NAME = "smhub_resend_connected";

export interface OpenResendPopupOptions {
  defaultEmail?: string;
  onSuccess?: (config: Partial<EmailIntegrationConfig>) => void;
}

/**
 * Abre a janela popup oficial de Conexão do Resend do SM HUB
 * com retorno automático de status para o nosso sistema.
 */
export function openResendConnectPopup(options?: OpenResendPopupOptions): Window | null {
  if (typeof window === "undefined") return null;

  const width = 600;
  const height = 760;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

  const query = new URLSearchParams();
  query.set("popup", "true");
  if (options?.defaultEmail) query.set("email", options.defaultEmail);

  const popup = window.open(
    `/conectar-resend?${query.toString()}`,
    "SMHUB_RESEND_CONNECT_POPUP",
    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
  );

  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    toast.error("O navegador bloqueou a janela popup. Autorize popups para conectar o Resend diretamente.");
    return null;
  }

  popup.focus();

  // Escuta retorno via postMessage
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === "RESEND_CONNECTION_SUCCESS") {
      toast.success("⚡ Resend conectado com sucesso! Envios de e-mail oficiais ativados.");
      window.dispatchEvent(new CustomEvent(RESEND_EVENT_NAME, { detail: event.data.config }));
      if (options?.onSuccess) {
        options.onSuccess(event.data.config);
      }
      window.removeEventListener("message", handleMessage);
    }
  };

  window.addEventListener("message", handleMessage);

  // Monitora se o popup fechou sem retorno
  const checkTimer = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkTimer);
      window.removeEventListener("message", handleMessage);
    }
  }, 1000);

  return popup;
}

/**
 * Abre o popup direto do Resend para Login
 */
export function openResendDirectLogin(): Window | null {
  if (typeof window === "undefined") return null;
  const width = 560;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

  return window.open(
    "https://resend.com/login",
    "RESEND_OFFICIAL_LOGIN",
    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
  );
}

/**
 * Abre o popup direto do Resend para Cadastro Grátis
 */
export function openResendDirectSignup(): Window | null {
  if (typeof window === "undefined") return null;
  const width = 560;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

  return window.open(
    "https://resend.com/signup",
    "RESEND_OFFICIAL_SIGNUP",
    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
  );
}

/**
 * Abre o popup direto do Resend para Gerar / Copiar Chaves de API
 */
export function openResendDirectApiKeys(): Window | null {
  if (typeof window === "undefined") return null;
  const width = 640;
  const height = 760;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

  return window.open(
    "https://resend.com/api-keys",
    "RESEND_OFFICIAL_APIKEYS",
    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
  );
}

/**
 * Notifica a janela pai que o Resend foi conectado com sucesso
 * e fecha o popup automaticamente.
 */
export function notifyResendSuccess(config: Partial<EmailIntegrationConfig>) {
  if (typeof window === "undefined") return;

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(
        {
          type: "RESEND_CONNECTION_SUCCESS",
          config,
        },
        "*"
      );
    } catch (e) {
      console.warn("Erro ao postar mensagem para window.opener:", e);
    }

    setTimeout(() => {
      try {
        window.close();
      } catch (e) {
        console.warn("Erro ao fechar popup do Resend:", e);
      }
    }, 800);
  }
}
