import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AuthState = "loading" | "authed" | "anon";

export function useAuthState(): AuthState {
  return "authed";
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
