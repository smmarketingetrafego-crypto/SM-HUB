import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AccessGate } from "@/components/layout/access-gate";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBar } from "@/components/layout/mobile-bar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";
import { AuthSplash, useAuthState } from "@/lib/auth-gate";
import { useStoreHydration } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { GlobalVideoModal } from "@/components/layout/video-modal";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { MandatoryOnboardingModal } from "@/components/auth/mandatory-onboarding-modal";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Essa tela não existe ou foi movida para outro módulo.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Essa tela não carregou</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado por aqui. Tente novamente ou volte ao dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium"
          >
            Ir para o dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SM Hub — Plataforma de Gestão para Agências & Criativos" },
      {
        name: "description",
        content:
          "SM Hub reúne CRM, propostas, financeiro, agentes de IA e atendimento em uma só plataforma.",
      },
      { name: "theme-color", content: "#C9A227" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "SM Hub" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var a = localStorage.getItem("smhub_page_appearances");
                var t = localStorage.getItem("smhub_theme") || "dark";
                var c = localStorage.getItem("smhub_accent") || "#C9A227";
                if (a) {
                  var p = JSON.parse(a);
                  if (p && p.system) {
                    if (p.system.theme) t = p.system.theme;
                    if (p.system.accentColor && p.system.accentColor.startsWith("#")) c = p.system.accentColor;
                  }
                } else {
                  var p2 = localStorage.getItem("smhub_preferences");
                  if (p2) {
                    var pr = JSON.parse(p2);
                    if (pr.theme) t = pr.theme;
                    if (pr.accentColor && pr.accentColor.startsWith("#")) c = pr.accentColor;
                  }
                }
                var root = document.documentElement;
                var isDark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                if (isDark) {
                  root.classList.add("dark");
                  root.classList.remove("light");
                } else {
                  root.classList.remove("dark");
                  root.classList.add("light");
                }
                root.style.setProperty("--primary", c);
                root.style.setProperty("--color-brand", c);
                root.style.setProperty("--color-primary", c);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthRedirect({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    router.navigate({ to: "/auth", replace: true });
  }, [enabled, router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [collapsed, setCollapsed] = useState(false);
  useStoreHydration();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.debug("PWA service worker registration notice:", err);
        });
      });
    }
  }, []);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const clientView =
    pathname.startsWith("/b/") ||
    pathname.startsWith("/cadastro-cliente/") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/proposta/") ||
    pathname.startsWith("/portal");
  const authState = useAuthState();

  if (clientView) {
    return (
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId="dummy_ui_client_id">
          <ThemeProvider>
            <div className="min-h-dvh w-full bg-background">
              <Outlet />
            </div>
            <Toaster />
            <GlobalVideoModal />
          </ThemeProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    );
  }

  if (authState !== "authed") {
    return (
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId="dummy_ui_client_id">
          <ThemeProvider>
            <AuthRedirect enabled={authState === "anon"} />
            <AuthSplash />
            <Toaster />
            <GlobalVideoModal />
          </ThemeProvider>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId="dummy_ui_client_id">
        <ThemeProvider>
          <AccessGate>
            <div className="flex min-h-dvh w-full bg-background">
              <div className="sticky top-0 hidden h-dvh md:block">
                <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                <FounderAccountBanner />
                <main className="flex-1 space-y-6 px-5 py-6 md:px-8 md:py-8">
                  {/* Required: nested routes render here. */}
                  <Outlet />
                </main>
                <MobileBar />
              </div>
            </div>
          </AccessGate>
          <Toaster />
          <GlobalVideoModal />
          <MandatoryOnboardingModal />
        </ThemeProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}

function FounderAccountBanner() {
  const [label, setLabel] = useState("");
  useEffect(() => { setLabel(sessionStorage.getItem("smhub-founder-account-label") ?? ""); }, []);
  if (!label) return null;
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary px-6 py-3 text-sm text-secondary-foreground"><span>Founder Master · Conta aberta: {label}</span><a href="/fundador" className="underline" onClick={() => { sessionStorage.removeItem("smhub-founder-account"); sessionStorage.removeItem("smhub-founder-account-label"); }}>Voltar à minha conta</a></div>;
}
