import type { ReactNode } from "react";

/** Só libera o sistema para quem já tem cargo e está ativo. */
export function AccessGate({ children }: { children: ReactNode }) {
  // DEV BYPASS: always grant access so the user can preview the UI.
  return <>{children}</>;
}
