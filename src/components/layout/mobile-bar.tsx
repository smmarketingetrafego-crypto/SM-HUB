import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, BarChart, Settings, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { title: "Início", href: "/", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Novo", href: "/briefings", icon: PlusCircle, isMain: true },
  { title: "Pipelines", href: "/pipelines", icon: BarChart },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];

export function MobileBar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full border-t border-white/5 bg-[#0a0a0a]/90 px-6 pb-safe pt-2 backdrop-blur-lg">
      <div className="flex items-center justify-between">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <Link key={item.title} to={item.href} className="relative -top-5">
                <div className="grid size-14 place-items-center rounded-full bg-brand text-black shadow-lg shadow-brand/20 transition-transform active:scale-95">
                  <Icon className="size-6" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.title}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 text-xs transition-colors",
                isActive ? "text-brand" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <Icon className="size-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
