import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { processGoogleSocialCallback } from "@/lib/social-auth.server";
import { notifyAuthSuccess } from "@/lib/auth-popup";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/api/auth/social-callback")({
  component: SocialOAuthCallbackPage,
});

function SocialOAuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const stateStr = params.get("state");

    if (error) {
      setStatus("error");
      setErrorMessage(`O provedor retornou um erro: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("Código de autorização não recebido.");
      return;
    }

    let isPopup = false;
    try {
      if (stateStr) {
        const parsedState = JSON.parse(decodeURIComponent(stateStr));
        isPopup = Boolean(parsedState.isPopup);
      }
    } catch {}

    const origin = window.location.origin;

    // Processa código na API
    processGoogleSocialCallback({ data: { code, redirectOrigin: origin } })
      .then((res) => {
        if (res.success && res.user) {
          setStatus("success");
          setUserName(res.user.name || res.user.email);
          toast.success(`Autenticado com sucesso! Olá, ${res.user.name}!`);

          // Salva na conta local
          try {
            const history = JSON.parse(localStorage.getItem("smhub_saved_accounts") || "[]");
            if (!history.find((a: any) => a.email === res.user?.email)) {
              history.push({
                email: res.user.email,
                nome: res.user.name,
                avatar: res.user.picture,
                lastLogin: new Date().toISOString(),
              });
              localStorage.setItem("smhub_saved_accounts", JSON.stringify(history));
            }
          } catch {}

          notifyAuthSuccess({
            email: res.user.email,
            name: res.user.name,
            role: "admin",
            verified: true,
          });

          if (!window.opener && !isPopup) {
            setTimeout(() => {
              navigate({ to: "/" });
            }, 800);
          }
        } else {
          setStatus("error");
          setErrorMessage(res.error || "Falha ao obter credenciais do usuário.");
        }
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Erro inesperado na comunicação.");
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#0d0d11] border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        {status === "loading" && (
          <>
            <div className="size-16 rounded-full bg-[#ff5722]/15 text-[#ff5722] flex items-center justify-center mx-auto border border-[#ff5722]/20 animate-pulse">
              <Loader2 className="size-8 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Autenticando com Conta Google...</h2>
              <p className="text-xs text-gray-400">Estamos validando seu acesso de forma segura e configurando sua sessão no SM HUB.</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Bem-vindo(a), {userName}!</h2>
              <p className="text-xs text-gray-400">Conexão estabelecida com sucesso. Redirecionando para o painel...</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="size-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertCircle className="size-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Erro na Autenticação</h2>
              <p className="text-xs text-gray-400">{errorMessage}</p>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => navigate({ to: "/auth" })}
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                Voltar para a Tela de Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
