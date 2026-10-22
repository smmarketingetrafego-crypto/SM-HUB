import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Users, BarChart, Menu, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/layout/app-sidebar";

const mobileItems = [
  { title: "Início", href: "/", icon: LayoutDashboard },
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Novo", href: "/briefings", icon: PlusCircle, isMain: true },
  { title: "Pipelines", href: "/pipelines", icon: BarChart },
];

export function MobileBar() {
  const pathname = useLocation().pathname;
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0 md:hidden">
          <SheetTitle className="sr-only">Menu completo</SheetTitle>
          <div className="h-dvh">
            <AppSidebar collapsed={false} onToggle={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
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
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn("flex flex-col items-center gap-1 p-2 text-xs transition-colors", open ? "text-brand" : "text-neutral-500")}
          >
            <Menu className="size-5" />
            <span>Menu</span>
          </button>
        </div>
      </div>
    </>
  );
}
