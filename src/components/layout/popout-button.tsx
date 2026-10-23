import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pages that can be opened in their own window, without the side menu.
const POPOUT_PAGES: Record<string, string> = {
  "/tarefas": "Tarefas",
  "/calendario-conteudo": "Agenda",
  "/pipelines": "Funil",
};

export function PopoutButton({ pathname }: { pathname: string }) {
  const label = POPOUT_PAGES[pathname];
  if (!label) return null;
  const open = () => {
    const w = Math.min(1400, window.screen.availWidth);
    const h = Math.min(900, window.screen.availHeight);
    window.open(`${pathname}?janela=1`, `smhub-${label}`, `popup=yes,width=${w},height=${h}`);
  };
  return (
    <Button onClick={open} size="sm" variant="outline" className="fixed bottom-24 right-5 z-40 hidden gap-2 rounded-full shadow-lg md:inline-flex md:bottom-6">
      <ExternalLink className="size-4" /> Abrir {label} em nova janela
    </Button>
  );
}
