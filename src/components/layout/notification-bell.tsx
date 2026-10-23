import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Smartphone } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { registerPushToken } from "@/lib/push.functions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

type Notice = { id: string; title: string; body: string; link: string; kind: string; read_at: string | null; created_at: string };

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from("notifications")
      .select("id,title,body,link,kind,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => active && setItems((data as Notice[]) ?? []));
    const channel = supabase
      .channel(`notifications-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setItems((prev) => [payload.new as Notice, ...prev].slice(0, 30));
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unread = items.filter((n) => !n.read_at).length;
  const [pushBusy, setPushBusy] = useState(false);
  const register = useServerFn(registerPushToken);

  const activatePush = async () => {
    setPushBusy(true);
    try {
      const { enablePush } = await import("@/lib/push-client");
      const r = await enablePush();
      if (r.status === "registered") {
        await register({ data: { token: r.token, userAgent: navigator.userAgent.slice(0, 300) } });
        toast.success("Pronto! Este aparelho vai receber os avisos mesmo com o app fechado.");
      } else if (r.status === "open-in-new-tab") toast.error("Abra o SM Hub em uma aba própria (ou no app instalado) e tente de novo.");
      else if (r.status === "denied") toast.error("Permissão negada. Libere as notificações nas configurações do navegador para este site.");
      else if (r.status === "unsupported") toast.error("Este navegador não aceita notificações. No iPhone, instale o app na tela inicial primeiro.");
      else toast.error("As notificações ainda não estão configuradas.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível ativar as notificações neste aparelho.");
    } finally {
      setPushBusy(false);
    }
  };

  const markAll = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).in("id", ids);
  };

  const open = async (n: Notice) => {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      await supabase.from("notifications").update({ read_at: now }).eq("id", n.id);
    }
    if (n.link) navigate({ to: n.link as any });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative text-muted-foreground hover:text-foreground rounded-full">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notificações</p>
          <button onClick={markAll} disabled={!unread} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
            <CheckCheck className="size-3.5" /> Marcar todas como lidas
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
          ) : (
            items.map((n) => (
              <button key={n.id} onClick={() => open(n)} className="w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-accent flex gap-3">
                <span className={`mt-1.5 size-2 rounded-full shrink-0 ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                <span className="flex-1 min-w-0">
                  <span className="flex justify-between gap-2">
                    <span className="text-sm font-medium truncate">{n.title}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                  </span>
                  {n.body && <span className="block text-xs text-muted-foreground truncate">{n.body}</span>}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border p-3">
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={activatePush} disabled={pushBusy}>
            <Smartphone className="size-4" /> {pushBusy ? "Ativando..." : "Receber avisos neste aparelho"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
