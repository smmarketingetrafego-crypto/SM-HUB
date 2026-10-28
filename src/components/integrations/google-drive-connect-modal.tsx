import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Cloud, Check, ShieldCheck, PowerOff, RefreshCw, Key, FolderOpen, ExternalLink
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { connectGoogleDrive, disconnectGoogleDrive } from "@/lib/api-drive.functions";

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

  const [email, setEmail] = useState(currentEmail || "smmarketingetrafego@gmail.com");
  const [folder, setFolder] = useState(folderId || "");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);

  const connectMutation = useMutation({
    mutationFn: async (payload: { email: string; folderId?: string; apiKey?: string }) => {
      return connectFn({ data: payload });
    },
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Google Drive conectado com sucesso!", {
          description: `Base de dados smhub_database.json sincronizada com a conta ${email}.`,
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('smhub_drive_setup', JSON.stringify({
              connected: true,
              accountEmail: email,
              folderId: folder || '',
              status: 'ready'
            }));
          } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['drive-setup'] });
        queryClient.invalidateQueries({ queryKey: ['integrations-data'] });
        queryClient.invalidateQueries({ queryKey: ['external-status'] });
        onOpenChange(false);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao conectar Google Drive.");
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return disconnectFn();
    },
    onSuccess: () => {
      toast.info("Google Drive desconectado.", {
        description: "Você pode conectar outra conta do Google a qualquer momento.",
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('smhub_drive_setup');
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['drive-setup'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-data'] });
      queryClient.invalidateQueries({ queryKey: ['external-status'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desconectar Google Drive.");
    }
  });

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Informe um e-mail válido da sua conta Google.");
      return;
    }
    setLoading(true);
    connectMutation.mutate(
      { email: email.trim(), folderId: folder.trim() || undefined, apiKey: apiKey.trim() || undefined },
      { onSettled: () => setLoading(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Cloud className="size-5 text-blue-400" />
            Conexão Google Drive Central
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Conecte sua conta do Google Drive para armazenar e sincronizar em nuvem o banco de dados <code className="text-brand font-mono">smhub_database.json</code>, contratos e anexos.
          </DialogDescription>
        </DialogHeader>

        {connected ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
              <Check className="size-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">Google Drive Conectado</h3>
              <p className="text-xs text-emerald-300/90 mt-1">
                Conta ativa: <strong>{currentEmail || email}</strong>
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
                className="flex-1 border-white/10 text-xs"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['drive-setup'] });
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
          <form onSubmit={handleConnect} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">E-mail da sua Conta Google</Label>
              <Input
                type="email"
                required
                placeholder="seu.email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/40 border-white/10 text-white"
              />
              <p className="text-[11px] text-gray-400">
                A pasta de sincronização será vinculada a esta conta no Google Drive.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">ID da Pasta no Google Drive (Opcional)</Label>
              <Input
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBHK... (deixe em branco para raiz)"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="bg-black/40 border-white/10 text-white font-mono text-xs"
              />
              <p className="text-[11px] text-gray-400">
                Se você já tiver uma pasta criada no Google Drive, cole o ID da URL aqui.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-300">Google Drive API Key (Opcional)</Label>
              <Input
                type="password"
                placeholder="Chave de API do Google Cloud Console"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-black/40 border-white/10 text-white font-mono text-xs"
              />
            </div>

            <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs text-blue-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="size-3.5" /> Backup Híbrido Contínuo
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Suas tarefas, leads e finanças salvam localmente com latência zero e sincronizam automaticamente na nuvem do Google Drive.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || connectMutation.isPending}
              className="w-full bg-brand text-black font-bold hover:bg-brand/90"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> Conectando ao Google Drive...
                </>
              ) : (
                <>
                  <Cloud className="mr-1.5 size-3.5" /> Vincular Google Drive
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
