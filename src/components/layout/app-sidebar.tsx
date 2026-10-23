// @ts-nocheck
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  Shield,
  Users,
  GraduationCap,
  Video,
  Wand2,
  LogOut,
  ExternalLink,
  Target,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthUser, openAuthPopup } from "@/lib/auth-popup";
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
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlatformIdentity } from "@/lib/api-admin.functions";

type NavItem = {
  title: string;
  href: string;
  icon: any;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navigation: NavSection[] = [
  {
    title: "Geral",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Painel de Vendas (TV)", href: "/painel-tv", icon: Monitor },
      { title: "Metas & OKRs", href: "/metas", icon: Target },
      { title: "Atualizações", href: "/atualizacoes", icon: Megaphone },
    ],
  },
  {
    title: "Comercial",
    items: [
      { title: "Clientes", href: "/clientes", icon: Users },
      { title: "Pipelines", href: "/pipelines", icon: BarChart },
      { title: "Leads", href: "/leads", icon: FolderOpen },
      { title: "Propostas", href: "/propostas", icon: ClipboardList },
      { title: "Briefings", href: "/briefings", icon: CheckSquare },
    ],
  },
  {
    title: "Operacional",
    items: [
      { title: "Projetos", href: "/projetos", icon: Briefcase },
      { title: "Tarefas", href: "/tarefas", icon: CheckSquare },
      { title: "Conteúdos", href: "/calendario-conteudo", icon: Calendar },
      { title: "Relatórios", href: "/relatorios", icon: BarChart },
    ],
  },
  {
    title: "Atendimento",
    items: [
      { title: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
      { title: "Central de suporte", href: "/suporte", icon: MessageCircle },
      { title: "Integrações", href: "/integracoes", icon: Settings },
    ],
  },
  {
    title: "Serviços",
    items: [
      { title: "Produtos", href: "/produtos", icon: Package },
    ],
  },
  {
    title: "IA & Automação",
    items: [
      { title: "Agentes IA", href: "/agentes-ia", icon: Wand2 },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { title: "Painel Financeiro", href: "/financeiro", icon: CreditCard },
    ],
  },
  {
    title: "Administração",
    items: [
      { title: "Colaboradores", href: "/colaboradores", icon: Users },
      { title: "Integração da Equipe", href: "/integracao-equipe", icon: GraduationCap },
      { title: "Tutoriais", href: "/tutoriais", icon: Video },
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const identityFn = useServerFn(getPlatformIdentity);
  const { data: identity } = useQuery({ queryKey: ["platform-identity"], queryFn: () => identityFn() });
  const sections = identity?.isFounder ? [...navigation, { title: "Founder Master", items: [{ title: "Contas e planos", href: "/fundador", icon: Shield }] }] : navigation;

  const authUser = useAuthUser();
  const currentUser = {
    name: authUser?.name || "Minha Conta",
    email: authUser?.email || "usuario@smhub.com.br",
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
    openAuthPopup({
      mode: "login",
      onSuccess: (user) => {
        toast.success(`Autenticado como ${user.name || user.email}!`);
      },
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/5 bg-[#0a0a0a] transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 shrink-0 items-center px-4 border-b border-white/5">
        {!collapsed ? (
          <Link to="/" className="flex items-center gap-2 group overflow-hidden">
            <img
              src="/smhub-logo.png"
              alt="SM Hub — Sistema de Gestão de Marketing"
              className="h-9.5 w-auto max-w-[200px] object-contain transition-transform group-hover:scale-105 duration-300 rounded"
            />
          </Link>
        ) : (
          <Link to="/" className="mx-auto flex items-center justify-center group" title="SM Hub">
            <img
              src="/sm-mark.png"
              alt="SM Hub"
              className="size-9 object-contain rounded-lg transition-transform group-hover:scale-105 duration-300"
            />
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 p-4">
        <nav className="flex flex-col gap-6">
          {sections.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              {!collapsed && (
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-brand/10 text-brand"
                        : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <Icon className={cn("size-5 shrink-0", !collapsed && "mr-3")} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/5 p-3 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex cursor-pointer items-center rounded-xl transition-colors hover:bg-white/5 text-left focus:outline-none",
                collapsed ? "justify-center p-2" : "justify-start gap-3 p-2 w-full"
              )}
            >
              <div className="size-9 rounded-full bg-gradient-to-tr from-[#ff5722] to-[#ff3d00] flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                {currentUser.name[0]?.toUpperCase() || "S"}
              </div>
              {!collapsed && (
                <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                  <span className="truncate text-sm font-semibold text-neutral-200">{currentUser.name}</span>
                  <span className="truncate text-xs text-neutral-500">{currentUser.email}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="end"
            className="w-64 bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-2 shadow-2xl backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-normal px-3 py-2">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/30">
                    CONTA ATIVA
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

        {!collapsed && (
          <button onClick={onToggle} className="p-2 ml-1 text-neutral-500 hover:text-white transition-colors">
            <ChevronDown className="size-4 rotate-90" />
          </button>
        )}
      </div>
      {collapsed && (
        <button onClick={onToggle} className="absolute -right-3 top-20 bg-[#111] border border-white/10 rounded-full p-1 text-neutral-500 hover:text-white transition-colors z-50">
          <ChevronRight className="size-3" />
        </button>
      )}
    </aside>
  );
}
