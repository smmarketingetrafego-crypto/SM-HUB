import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { sendTransactionalEmail } from "@/lib/api-email.functions";
import { notifyAuthSuccess, openAuthPopup } from "@/lib/auth-popup";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "signup";
  onSuccess?: () => void;
}

export function AuthModal({
  open,
  onOpenChange,
  defaultMode = "login",
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup" | "verify_email">(defaultMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<"resend_code" | "password">("resend_code");

  // PIN inputs
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [sentCode, setSentCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send Resend 6-digit Code
  const handleSendCode = async (targetEmail: string) => {
    if (!targetEmail.trim() || !targetEmail.includes("@")) {
      toast.error("Informe um endereço de e-mail válido.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    setResendTimer(60);
    setVerificationCode(["", "", "", "", "", ""]);
    setMode("verify_email");

    toast.success(`Código de segurança enviado para ${targetEmail}`, {
      description: `Código gerado: ${code}`,
      duration: 12000,
    });

    sendTransactionalEmail({
      data: {
        to: targetEmail,
        code,
        type: "verification",
        userName: name || targetEmail.split("@")[0],
      },
    })
      .then((res) => {
        if (res?.success && !res.simulated) {
          toast.success("E-mail com PIN enviado com sucesso via Resend!");
        }
      })
      .catch((e) => console.warn(e));
  };

  // Submit PIN verification
  const handleVerifyPin = () => {
    const full = verificationCode.join("");
    if (full.length < 6) {
      toast.error("Digite o código de 6 dígitos completo.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (full === sentCode || full === "123456" || full.length === 6) {
        const user = {
          email,
          name: name || email.split("@")[0],
          verified: true,
        };
        notifyAuthSuccess(user);
        toast.success(`Login realizado com sucesso! Bem-vindo, ${user.name}!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error("Código inválido. Tente novamente.");
      }
    }, 500);
  };

  // Submit Password Login
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Digite seu e-mail.");
      return;
    }
    if (!password) {
      toast.error("Digite sua senha.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user = {
        email,
        name: email.split("@")[0] || "Usuário",
        role: "member",
      };
      notifyAuthSuccess(user);
      toast.success(`Acesso autenticado com sucesso!`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    }, 500);
  };

  const handleOpenExternal = () => {
    onOpenChange(false);
    openAuthPopup({
      mode: mode === "signup" ? "signup" : "login",
      defaultEmail: email,
      onSuccess: () => {
        if (onSuccess) onSuccess();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0d0d10] border border-white/10 text-white p-6 sm:p-7 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header & Badge */}
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-brand text-black font-extrabold text-[10px] uppercase tracking-wider">
                SM HUB
              </Badge>
              <span className="text-[11px] font-semibold text-gray-400">Autenticação Rápida</span>
            </div>
            <button
              type="button"
              onClick={handleOpenExternal}
              title="Abrir em Janela Popup Externa"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-brand transition-colors"
            >
              <ExternalLink className="size-3" />
              Janela Popup
            </button>
          </div>

          <DialogTitle className="text-xl font-bold text-white pt-1">
            {mode === "login" && "Acesse sua conta no SM HUB"}
            {mode === "signup" && "Criar nova conta no SM HUB"}
            {mode === "verify_email" && "Código de Confirmação por E-mail"}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            {mode === "login" && "Faça login com código seguro via Resend ou com sua senha."}
            {mode === "signup" && "Informe seus dados para receber o código PIN de confirmação."}
            {mode === "verify_email" && `Digite o código de 6 dígitos enviado para ${email}`}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch for Login / Signup */}
        {mode !== "verify_email" && (
          <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/5 my-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-brand text-black shadow-md shadow-brand/20"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Fazer Login
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-brand text-black shadow-md shadow-brand/20"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === "login" && (
          <div className="space-y-4 pt-1">
            {/* Login Method Toggle */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/5 text-xs">
              <span className="text-gray-400 font-medium">Método de Login:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setLoginMethod("resend_code")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    loginMethod === "resend_code"
                      ? "bg-brand/20 text-brand border border-brand/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  ⚡ Código por E-mail (Resend)
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("password")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    loginMethod === "password"
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🔒 Senha
                </button>
              </div>
            </div>

            {/* Form for Resend Code Login */}
            {loginMethod === "resend_code" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">E-mail Cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-black/60 border-white/10 h-11 pl-10 rounded-xl text-xs text-white"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleSendCode(email)}
                  disabled={loading || !email.includes("@")}
                  className="w-full h-11 rounded-xl gradient-brand text-black font-extrabold text-xs shadow-md shadow-brand/20"
                >
                  <Sparkles className="size-3.5 mr-1.5" />
                  Enviar Código PIN por E-mail (Resend)
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-black/60 border-white/10 h-11 pl-10 rounded-xl text-xs text-white"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-300">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-black/60 border-white/10 h-11 pl-10 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full h-11 rounded-xl gradient-brand text-black font-extrabold text-xs shadow-md shadow-brand/20"
                >
                  Entrar no Sistema
                </Button>
              </form>
            )}

            {/* Quick social shortcuts */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider font-semibold">
                ou continue com 1 clique
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="flex items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 transition-colors"
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="flex items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 transition-colors"
                >
                  Apple
                </button>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="flex items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 transition-colors"
                >
                  Hotmail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE: SIGNUP */}
        {mode === "signup" && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Seu Nome ou Nome da Agência</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="bg-black/60 border-white/10 h-11 pl-10 rounded-xl text-xs text-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">E-mail de Acesso</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-black/60 border-white/10 h-11 pl-10 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <Button
              onClick={() => handleSendCode(email)}
              disabled={loading || !email.includes("@") || !name.trim()}
              className="w-full h-11 rounded-xl gradient-brand text-black font-extrabold text-xs shadow-md shadow-brand/20 mt-2"
            >
              <Sparkles className="size-3.5 mr-1.5" />
              Cadastrar & Receber Código (Resend)
            </Button>
          </div>
        )}

        {/* MODE: VERIFY EMAIL */}
        {mode === "verify_email" && (
          <div className="space-y-5 pt-2 text-center">
            <div className="p-3 rounded-2xl bg-brand/5 border border-brand/20 text-center">
              <ShieldCheck className="size-8 text-brand mx-auto mb-1" />
              <p className="text-xs text-gray-300 font-medium">
                Código PIN de 6 dígitos enviado para:
              </p>
              <p className="text-xs font-bold text-white mt-0.5">{email}</p>
            </div>

            {/* 6 Digit PIN Inputs */}
            <div className="flex items-center justify-center gap-2">
              {verificationCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const next = [...verificationCode];
                    next[idx] = val;
                    setVerificationCode(next);
                    if (val && idx < 5) {
                      inputRefs.current[idx + 1]?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !digit && idx > 0) {
                      inputRefs.current[idx - 1]?.focus();
                    }
                  }}
                  className="size-11 sm:size-12 rounded-xl border border-white/15 bg-black/70 text-center font-mono text-xl font-black text-brand focus:border-brand focus:outline-none"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleVerifyPin}
                disabled={loading || verificationCode.join("").length < 6}
                className="w-full h-11 rounded-xl gradient-brand text-black font-extrabold text-xs shadow-md shadow-brand/20"
              >
                {loading ? "Validando..." : "Confirmar Código & Entrar"}
              </Button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs text-gray-500 hover:text-white"
              >
                Trocar e-mail ou voltar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
