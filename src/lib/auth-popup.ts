import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface AuthUserData {
  email: string;
  name?: string;
  role?: string;
  verified?: boolean;
}

const AUTH_STORAGE_KEY = "smhub_user";
const AUTH_EVENT_NAME = "smhub_auth_changed";

/**
 * Retorna os dados do usuário atual e escuta alterações em tempo real
 * (tanto entre abas/popups via storage event quanto local via custom event).
 */
export function useAuthUser() {
  const [user, setUser] = useState<AuthUserData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        setUser(stored ? JSON.parse(stored) : null);
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener(AUTH_EVENT_NAME, handleAuthChange);

    // Também escuta mensagens diretas do popup via postMessage
    const handlePostMessage = (event: MessageEvent) => {
      if (event.data?.type === "SMHUB_AUTH_SUCCESS" && event.data.user) {
        toast.success(`Autenticado com sucesso! Bem-vindo, ${event.data.user.name || event.data.user.email}!`);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(event.data.user));
        window.dispatchEvent(new Event(AUTH_EVENT_NAME));
      }
    };
    window.addEventListener("message", handlePostMessage);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener(AUTH_EVENT_NAME, handleAuthChange);
      window.removeEventListener("message", handlePostMessage);
    };
  }, []);

  return user;
}

/**
 * Notifica o sistema que a autenticação foi concluída com sucesso
 * e fecha o popup se estiver rodando em uma janela popup.
 */
export function notifyAuthSuccess(userData: AuthUserData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
  } catch (err) {
    console.error("Erro ao salvar usuário no localStorage:", err);
  }

  // Dispara evento local
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));

  // Notifica a janela pai (opener) se existir
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(
        {
          type: "SMHUB_AUTH_SUCCESS",
          user: userData,
        },
        "*"
      );
    } catch (e) {
      console.warn("Erro ao enviar mensagem para window.opener:", e);
    }

    // Fecha a janela popup após breve delay para usuário ver o sucesso
    setTimeout(() => {
      try {
        window.close();
      } catch (e) {
        console.warn("Erro ao fechar popup:", e);
      }
    }, 600);
  }
}

export interface OpenAuthPopupOptions {
  mode?: "login" | "signup";
  defaultEmail?: string;
  onSuccess?: (user: AuthUserData) => void;
}

/**
 * Abre a janela popup oficial de Login / Cadastro do SM HUB,
 * centralizada na tela, e escuta o retorno para atualizar o sistema.
 */
export function openAuthPopup(options?: OpenAuthPopupOptions): Window | null {
  if (typeof window === "undefined") return null;

  const width = 520;
  const height = 740;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

  const query = new URLSearchParams();
  query.set("popup", "true");
  if (options?.mode) query.set("mode", options.mode);
  if (options?.defaultEmail) query.set("email", options.defaultEmail);

  const url = `/auth?${query.toString()}`;
  const popup = window.open(
    url,
    "SMHUB_LOGIN_POPUP",
    `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
  );

  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    toast.error("O navegador bloqueou a janela popup. Por favor, autorize popups para este site ou faça login diretamente.");
    return null;
  }

  // Foco no popup
  popup.focus();

  // Escuta o fechamento do popup para atualizar o estado
  const timer = setInterval(() => {
    if (popup.closed) {
      clearInterval(timer);
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const user = JSON.parse(stored);
          if (options?.onSuccess) {
            options.onSuccess(user);
          }
        } catch {}
      }
    }
  }, 500);

  return popup;
}
