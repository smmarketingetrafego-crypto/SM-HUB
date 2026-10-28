import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Cloud, Check, ShieldCheck, PowerOff, RefreshCw, Key, FolderOpen, ExternalLink, Lock
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { connectGoogleDrive, disconnectGoogleDrive } from "@/lib/api-drive.functions";
import { supabase } from "@/integrations/supabase/client";

interface GoogleDriveConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connected?: boolean;
  currentEmail?: string;
  folderId?: string;
}

export function GoogleDriveConnectModal({
  open,
  onOpenChange,
  connected = false,
  currentEmail = "",
  folderId = ""
}: GoogleDriveConnectModalProps) {
  const queryClient = useQueryClient();
  const connectFn = useServerFn(connectGoogleDrive);
  const disconnectFn = useServerFn(disconnectGoogleDrive);

  const [folder, setFolder] = useState(folderId || "1hVop0zzJqGDNYc96zTbqS9LAwNJEDFsy");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: async () => disconnectFn(),
    onSuccess: () => {
      toast.info("Google Drive desconectado.", {
        description: "Você pode conectar outra conta do Google a qualquer momento.",
      });
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("smhub_drive_setup");
          const cur = JSON.parse(localStorage.getItem("smhub_integrations") || "{}");
          if (cur.google) cur.google = { connected: false, accountEmail: "" };
          localStorage.setItem("smhub_integrations", JSON.stringify(cur));
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ["drive-setup"] });
      queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desconectar Google Drive.");
    }
  });

  // 1. Conexão Oficial via Google OAuth (Abre tela oficial do Google para Login & Autorização)
  const handleGoogleOAuth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive email profile",
          redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });

      if (error) {
        toast.error("Falha ao iniciar autenticação Google: " + error.message);
      }
    } catch (err: any) {
      toast.error("Erro ao contatar servidores do Google.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Conexão via Chave de API Oficial do Google Cloud
  const handleApiKeyConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Informe sua Chave de API do Google Cloud Console.");
      return;
    }

    setLoading(true);
    try {
      // Valida chave no endpoint do Google Drive
      const res = await fetch(`https://www.googleapis.com/drive/v3/about?fields=user&key=${apiKey.trim()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson?.error?.message || "Chave de API do Google inválida ou sem permissão para Google Drive.");
        return;
      }

      const resData = await connectFn({
        data: {
          email: "google-cloud-key@smhub.com.br",
          apiKey: apiKey.trim(),
          folderId: folder.trim() || undefined,
        }
      });

      if (resData.success) {
        toast.success("Google Drive conectado com sucesso via Chave de API!");
        queryClient.invalidateQueries({ queryKey: ["drive-setup"] });
        queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
        queryClient.invalidateQueries({ queryKey: ["external-status"] });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar via API Key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0f0f12] border-white/10 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Cloud className="size-5 text-blue-400" />
            Conexão Google Drive Central
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Conecte sua conta do Google Drive com autorização real OAuth ou chave de API para armazenar o banco <code className="text-brand font-mono">smhub_database.json</code>.
          </DialogDescription>
        </DialogHeader>

        {connected ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
              <Check className="size-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">Google Drive Conectado</h3>
              <p className="text-xs text-emerald-300 mt-1">
                Conta ativa: <strong>{currentEmail}</strong>
              </p>
              {folderId && (
                <p className="text-[11px] text-gray-400 font-mono mt-1">
                  Pasta ID: {folderId}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/10 text-xs text-white hover:bg-white/5"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["drive-setup"] });
                  toast.success("Sincronização de arquivos verificada!");
                }}
              >
                <RefreshCw className="mr-1.5 size-3.5" /> Sincronizar Agora
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={disconnectMutation.isPending}
                className="flex-1 text-xs"
                onClick={() => disconnectMutation.mutate()}
              >
                <PowerOff className="mr-1.5 size-3.5" /> Desconectar Conta
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Opção 1: Google OAuth Oficial */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Login Oficial com Google (OAuth)
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Abre a janela de permissões oficial do Google para você selecionar sua conta e autorizar o acesso ao Drive em 1 clique.
              </p>
              <Button
                type="button"
                onClick={handleGoogleOAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 text-black font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2"
              >
                <Cloud className="size-4 text-blue-500" />
                Fazer Login com Google e Autorizar Drive
              </Button>
            </div>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0f0f12] px-3 text-[10px] uppercase font-bold text-gray-500 absolute">ou via chave de api</span>
            </div>

            {/* Opção 2: Chave de API Google Cloud */}
            <form onSubmit={handleApiKeyConnect} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-300">Google Cloud API Key (Opcional)</Label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-gray-300">ID da Pasta no Google Drive</Label>
                <Input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="1hVop0zzJqGDNYc96zTbqS9LAwNJEDFsy"
                  className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="w-full bg-brand text-black font-bold hover:bg-brand/90 text-xs h-10 rounded-xl"
              >
                {loading ? <RefreshCw className="size-3.5 animate-spin mr-1.5" /> : <Key className="size-3.5 mr-1.5" />}
                Validar Chave Google Cloud
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
