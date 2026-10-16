// @ts-nocheck
import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { 
  Bell, 
  Search, 
  User, 
  Settings, 
  LogOut, 
  Users, 
  Shield, 
  CreditCard,
  ChevronDown,
  Sparkles,
  Clock,
  Crown,
  ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthUser, openAuthPopup } from "@/lib/auth-popup";
import { useQuery } from "@tanstack/react-query";
import { getActiveSubscription } from "@/lib/api-subscriptions.functions";
import { SubscriptionCheckoutModal } from "@/components/subscription/subscription-checkout-modal";

export function Topbar() {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const { data: subData } = useQuery({
    queryKey: ["active-subscription"],
    queryFn: () => getActiveSubscription(),
  });

  const currentUser = {
    name: authUser?.name || "Minha Conta",
    email: authUser?.email || "usuario@smhub.com.br",
    role: authUser?.role || "admin",
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("smhub_user");
    toast.success("Você saiu da conta.");
    window.location.href = "/auth";
  };

  const handleSwitchAccount = () => {
    // Abre a janela popup oficial de autenticação
    openAuthPopup({
      mode: "login",
      onSuccess: (user) => {
        toast.success(`Autenticado como ${user.name || user.email}!`);
      },
    });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-4">
        {/* Mobile Brand Logo */}
        <Link to="/" className="md:hidden flex items-center shrink-0">
          <img
            src="/smhub-logo.png"
            alt="SM Hub — Sistema de Gestão de Marketing"
            className="h-8 w-auto object-contain rounded"
          />
        </Link>

        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input 
            placeholder="Buscar leads, projetos ou faturas..." 
            className="h-10 w-full rounded-full border-white/10 bg-white/5 pl-10 text-sm text-neutral-200 placeholder:text-neutral-500 focus-visible:ring-1 focus-visible:ring-brand"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Master Owner VIP Badge / Guest Trial Pill */}
        {subData?.subscription?.isOwner ? (
          <button
            type="button"
            onClick={() => {
              if (window.location.pathname === "/configuracoes") {
                window.dispatchEvent(new CustomEvent("switch-settings-tab", { detail: "assinatura" }));
              } else {
                navigate({ to: "/configuracoes", search: { tab: "assinatura" } });
              }
            }}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-brand/20 via-amber-500/15 to-brand/10 border border-brand/40 text-brand shadow-[0_0_15px_rgba(201,162,39,0.2)] hover:border-brand transition-all cursor-pointer"
            title="Conta Proprietário / Fundador - Acesso Vitalício Irrestrito (Clique para ver sua central de assinatura e replicação)"
          >
            <Crown className="size-3.5 text-brand" />
            <span>Fundador Master</span>
            <span className="text-[10px] bg-brand text-black px-1.5 py-0.5 rounded-full font-black uppercase">
              VITALÍCIO
            </span>
          </button>
        ) : subData?.subscription?.isTrial ? (
          <button
            type="button"
            onClick={() => {
              setCheckoutModalOpen(true);
              if (window.location.pathname === "/configuracoes") {
                window.dispatchEvent(new CustomEvent("switch-settings-tab", { detail: "assinatura" }));
              }
            }}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm cursor-pointer"
            title="Clique para assinar ou ver planos disponíveis."
          >
            <Clock className="size-3.5 text-amber-400 animate-pulse" />
            <span>
              {subData.subscription.daysRemaining > 0
                ? `Teste: ${subData.subscription.daysRemaining} dias restantes`
                : "Teste 7d Expirado"}
            </span>
            <span className="text-[10px] bg-brand text-black px-1.5 py-0.5 rounded-full font-black tracking-wide">
              ASSINAR
            </span>
          </button>
        ) : null}

        {/* Notificações */}
        <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white rounded-full">
          <Bell className="size-5" />
        </Button>

        {/* Atalho Direto para Configurações */}
        <Button 
          variant="ghost" 
          size="icon" 
          asChild 
          className="text-neutral-400 hover:text-white rounded-full hover:bg-white/5"
          title="Configurações & Perfil"
        >
          <Link to="/configuracoes">
            <Settings className="size-5" />
          </Link>
        </Button>

        {/* Menu do Usuário / Trocar de Conta / Sair */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full hover:bg-white/5 border border-white/10 transition-colors focus:outline-none">
              <div className="size-7 rounded-full bg-gradient-to-tr from-[#ff5722] to-[#ff3d00] flex items-center justify-center text-white font-bold text-xs shadow-md">
                {currentUser.name[0]?.toUpperCase() || "S"}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-neutral-200 max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <ChevronDown className="size-3.5 text-neutral-400 mr-1" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64 bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
            <DropdownMenuLabel className="font-normal px-3 py-2.5">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/30">
                    ADMIN
                  </span>
                </div>
                <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            <DropdownMenuItem asChild className="px-3 py-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer flex items-center gap-2.5">
              <Link to="/configuracoes">
                <Settings className="size-4 text-neutral-400" />
                <span>Configurações & Perfil</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => {
                if (window.location.pathname === "/configuracoes") {
                  window.dispatchEvent(new CustomEvent("switch-settings-tab", { detail: "assinatura" }));
                } else {
                  navigate({ to: "/configuracoes", search: { tab: "assinatura" } });
                }
              }}
              className="px-3 py-2.5 text-xs text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer flex items-center gap-2.5"
            >
              <CreditCard className="size-4 text-brand" />
              <span>Assinatura & Replicação</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={handleSwitchAccount}
              className="px-3 py-2.5 text-xs text-[#ff5722] hover:bg-[#ff5722]/10 rounded-xl cursor-pointer flex items-center justify-between font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Users className="size-4 text-[#ff5722]" />
                <span>Trocar de Conta</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ff5722]/15 text-[#ff5722] flex items-center gap-1">
                <ExternalLink className="size-2.5" /> Popup
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10 my-1" />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl cursor-pointer flex items-center gap-2.5 font-medium"
            >
              <LogOut className="size-4 text-red-400" />
              <span>Sair da Conta (Logout)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Real Subscription & Plans Modal */}
      <SubscriptionCheckoutModal
        open={checkoutModalOpen}
        onOpenChange={setCheckoutModalOpen}
        userEmail={currentUser.email}
        userName={currentUser.name}
      />
    </header>
  );
}
