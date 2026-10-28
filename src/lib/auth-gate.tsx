import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AuthState = "loading" | "authed" | "anon";

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("loading");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setState("authed");
        return;
      }
      try {
        const localUser = localStorage.getItem("smhub_auth_user") || localStorage.getItem("smhub_saved_accounts");
        if (localUser) {
          const parsed = JSON.parse(localUser);
          if (parsed && (parsed.email || (Array.isArray(parsed) && parsed.length > 0))) {
            setState("authed");
            return;
          }
        }
      } catch {}
      setState("anon");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setState("authed");
      } else if (event === "SIGNED_OUT") {
        try {
          localStorage.removeItem("smhub_auth_user");
        } catch {}
        setState("anon");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

export function AuthSplash() {
  return (
    <div className="grid min-h-dvh w-full place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-14 animate-pulse place-items-center rounded-2xl gradient-brand text-lg font-bold text-primary-foreground">
          SM
        </span>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}
