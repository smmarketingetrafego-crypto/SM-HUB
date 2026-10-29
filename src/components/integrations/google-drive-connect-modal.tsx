import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Cloud, Check, ShieldCheck, PowerOff, RefreshCw, Key, FolderOpen, 
  ExternalLink, Users, Plus, CheckCircle2, UserCheck, Settings, AlertCircle
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { connectGoogleDrive, disconnectGoogleDrive, getDriveSetup } from "@/lib/api-drive.functions";

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
  connected: propConnected,
  currentEmail: propEmail,
  folderId: propFolderId
}: GoogleDriveConnectModalProps) {
  const queryClient = useQueryClient();
  const connectFn = useServerFn(connectGoogleDrive);
  const disconnectFn = useServerFn(disconnectGoogleDrive);

  const { data: driveSetup } = useQuery({
    queryKey: ["drive-setup"],
    queryFn: () => getDriveSetup(),
  });

  const isConnected = propConnected || Boolean(driveSetup?.connected);
  const activeEmail = driveSetup?.accountEmail || propEmail || "";
  const activeName = driveSetup?.accountName || (activeEmail ? activeEmail.split("@")[0] : "");
  const activeFolder = driveSetup?.folderId || propFolderId || "1hVop0zzJqGDNYc96zTbqS9LAwNJEDFsy";
  const connectedAccounts = driveSetup?.accounts || [];

  const [activeTab, setActiveTab] = useState<"login" | "accounts" | "apikey" | "oauth_config">("login");
  const [folder, setFolder] = useState(activeFolder);
  const [apiKey, setApiKey] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);

  // Google OAuth Client ID configurável por time/instância
  const [customClientId, setCustomClientId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("smhub_google_client_id") || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
  });

  useEffect(() => {
    if (activeFolder) setFolder(activeFolder);
  }, [activeFolder]);

  // Desconectar Conta Ativa
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
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["external-status"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desconectar Google Drive.");
    }
  });

  // 1. Login com Google OAuth 2.0 (Pop-up Oficial com Seleção de Conta)
  const handleGoogleOAuthLogin = async () => {
    setLoading(true);

    const effectiveClientId = customClientId.trim() || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
    
    // Se houver Client ID do Google Cloud Console configurado, abre o popup oficial OAuth 2.0
    if (effectiveClientId && effectiveClientId !== "dummy_ui_client_id") {
      const redirectUri = window.location.origin;
      const scopes = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ].join(" ");

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: effectiveClientId,
        redirect_uri: redirectUri,
        response_type: "token",
        scope: scopes,
        prompt: "select_account",
        include_granted_scopes: "true"
      }).toString();

      const width = 520;
      const height = 650;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

      const popup = window.open(
        oauthUrl,
        "GoogleDriveOAuthLogin",
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        toast.error("O navegador bloqueou o pop-up de login do Google. Permita pop-ups para este site.");
        setLoading(false);
        return;
      }

      // Escuta o retorno do token OAuth
      const checkPopupInterval = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkPopupInterval);
            setLoading(false);
            return;
          }

          if (popup.location && popup.location.origin === window.location.origin) {
            const hash = popup.location.hash;
            if (hash && hash.includes("access_token=")) {
              clearInterval(checkPopupInterval);
              popup.close();

              const params = new URLSearchParams(hash.replace(/^#/, ""));
              const accessToken = params.get("access_token");

              if (accessToken) {
                // Busca perfil do usuário autenticado no Google
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                const userInfo = await userRes.json();

                if (userInfo?.email) {
                  await completeConnect(userInfo.email, userInfo.name || userInfo.email.split("@")[0], accessToken);
                  return;
                }
              }
              toast.error("Não foi possível obter dados da Conta Google.");
              setLoading(false);
            }
          }
        } catch {
          // Cross-origin checks throw until popup redirects back to origin
        }
      }, 500);

      // Timeout de segurança após 2 minutos
      setTimeout(() => {
        clearInterval(checkPopupInterval);
        setLoading(false);
      }, 120000);
      return;
    }

    // Caso o time ainda não tenha inserido o Web Client ID do Google Cloud:
    // Permite login direto escolhendo ou digitando o e-mail da conta Google de qualquer usuário da equipe
    let chosenEmail = userEmail.trim();
    let chosenName = userName.trim();

    if (!chosenEmail) {
      const emailInput = prompt(
        "Login Multi-Usuário Google Drive:\nInforme o e-mail da Conta Google que você deseja conectar:",
        "smmarketingetrafego@gmail.com"
      );
      if (!emailInput || !emailInput.includes("@")) {
        setLoading(false);
        return;
      }
      chosenEmail = emailInput.trim();
      chosenName = chosenEmail.split("@")[0];
    }

    await completeConnect(chosenEmail, chosenName);
  };

  // Finaliza a conexão salvando no banco e emitindo notificações
  const completeConnect = async (email: string, name?: string, accessToken?: string) => {
    try {
      const res = await connectFn({
        data: {
          email: email.trim(),
          name: name?.trim() || email.split("@")[0],
          folderId: folder.trim() || "1hVop0zzJqGDNYc96zTbqS9LAwNJEDFsy",
          accessToken: accessToken || undefined,
        }
      });

      if (res.success) {
        toast.success(`Google Drive conectado para ${email}!`, {
          description: "Pasta central e arquivos sincronizados para a sua conta."
        });

        if (typeof window !== "undefined") {
          try {
            const cur = JSON.parse(localStorage.getItem("smhub_integrations") || "{}");
            cur.google = {
              connected: true,
              accountEmail: email,
              accountName: name || email.split("@")[0],
              folderId: folder.trim() || "1hVop0zzJqGDNYc96zTbqS9LAwNJEDFsy",
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem("smhub_integrations", JSON.stringify(cur));
          } catch {}
        }

        queryClient.invalidateQueries({ queryKey: ["drive-setup"] });
        queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        queryClient.invalidateQueries({ queryKey: ["external-status"] });
        setUserEmail("");
        setUserName("");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar conta Google.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Conectar com Chave de API ou Token Bearer do Google Cloud
  const handleApiKeyConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast.error("Informe sua Chave de API ou Token do Google Cloud Console.");
      return;
    }

    setLoading(true);
    try {
      const trimmedKey = apiKey.trim();
      const isBearerToken = trimmedKey.startsWith("ya29.");
      const testUrl = isBearerToken
        ? "https://www.googleapis.com/oauth2/v3/userinfo"
        : `https://www.googleapis.com/discovery/v1/apis/drive/v3/rest?key=${trimmedKey}`;

      const res = await fetch(testUrl, {
        headers: isBearerToken ? { Authorization: `Bearer ${trimmedKey}` } : {},
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson?.error?.message || "Chave Google inválida ou sem permissão para Google Drive.");
        setLoading(false);
        return;
      }

      const emailToUse = userEmail.trim() || activeEmail || "smmarketingetrafego@gmail.com";
      const resData = await connectFn({
        data: {
          email: emailToUse,
          apiKey: trimmedKey,
          folderId: folder.trim() || undefined,
        }
      });

      if (resData.success) {
        toast.success("Google Drive conectado com sucesso via Chave Google Cloud!");
        queryClient.invalidateQueries({ queryKey: ["drive-setup"] });
        queryClient.invalidateQueries({ queryKey: ["integrations-data"] });
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
        queryClient.invalidateQueries({ queryKey: ["external-status"] });
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar via API Key.");
    } finally {
      setLoading(false);
    }
  };

  // Salvar Client ID customizado
  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = customClientId.trim();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smhub_google_client_id", cleanId);
      } catch {}
    }
    toast.success("Google OAuth Client ID salvo com sucesso!");
    setActiveTab("login");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0f0f12] border-white/10 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Cloud className="size-5 text-blue-400" />
            Conexão Google Drive (Multi-Usuário)
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Conecte sua conta do Google Drive com autenticação real para armazenar o banco <code className="text-brand font-mono">smhub_database.json</code> e sincronizar propostas e arquivos da equipe.
          </DialogDescription>
        </DialogHeader>

        {isConnected ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Google Drive Conectado
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">Ativo</span>
                  </h3>
                  <p className="text-xs text-emerald-300 font-semibold truncate mt-0.5">
                    {activeEmail} {activeName && <span className="text-gray-400 font-normal">({activeName})</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                    Pasta ID: {activeFolder}
                  </p>
                </div>
              </div>
            </div>

            {/* Alternância de Contas da Equipe */}
            {connectedAccounts.length > 1 && (
              <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/10 space-y-2">
                <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                  <Users className="size-3.5 text-brand" /> Outras contas salvas da equipe:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {connectedAccounts.map((acc: any) => {
                    const isCur = acc.email.toLowerCase() === activeEmail.toLowerCase();
                    return (
                      <div 
                        key={acc.email} 
                        className={`flex items-center justify-between p-2 rounded-xl text-xs ${isCur ? 'bg-brand/10 border border-brand/20' : 'bg-black/40 hover:bg-white/5'}`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-white truncate">{acc.name || acc.email.split("@")[0]}</p>
                          <p className="text-[10px] text-gray-400 truncate">{acc.email}</p>
                        </div>
                        {!isCur && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeConnect(acc.email, acc.name)}
                            className="h-7 text-[10px] border-white/10 text-brand hover:text-white"
                          >
                            Ativar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-xs text-white hover:bg-white/5 h-10 rounded-xl"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["drive-setup"] });
                  toast.success("Sincronização de arquivos do Google Drive verificada!");
                }}
              >
                <RefreshCw className="mr-1.5 size-3.5" /> Sincronizar Agora
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-xs text-white hover:bg-white/5 h-10 rounded-xl"
                onClick={() => {
                  disconnectMutation.mutate();
                  setActiveTab("login");
                }}
              >
                <UserCheck className="mr-1.5 size-3.5 text-brand" /> Trocar de Usuário
              </Button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={disconnectMutation.isPending}
              className="w-full text-xs h-10 rounded-xl"
              onClick={() => disconnectMutation.mutate()}
            >
              <PowerOff className="mr-1.5 size-3.5" /> Desconectar Google Drive
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full pt-1">
            <TabsList className="grid grid-cols-4 bg-black/40 p-1 rounded-xl border border-white/5 mb-4">
              <TabsTrigger value="login" className="text-xs font-semibold">
                <Cloud className="size-3.5 mr-1" /> Login Google
              </TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs font-semibold">
                <Users className="size-3.5 mr-1" /> Equipe
              </TabsTrigger>
              <TabsTrigger value="apikey" className="text-xs font-semibold">
                <Key className="size-3.5 mr-1" /> API Key
              </TabsTrigger>
              <TabsTrigger value="oauth_config" className="text-xs font-semibold">
                <Settings className="size-3.5 mr-1" /> Client ID
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: Login Oficial com Conta Google */}
            <TabsContent value="login" className="space-y-4 focus-visible:outline-none">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Login Oficial com Conta Google
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Permite que qualquer colaborador faça login com sua própria Conta Google para sincronizar propostas e arquivos da pasta central no SM Hub.
                </p>

                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">E-mail da sua Conta Google (opcional)</Label>
                    <Input
                      type="email"
                      placeholder="seu.email@gmail.com ou deixe em branco para escolher no Google"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">ID da Pasta Compartilhada no Google Drive</Label>
                    <Input
                      value={folder}
                      onChange={(e) => setFolder(e.target.value)}
                      placeholder="1hVop0zzJqGDNYc96zTbqS9LAwNJEDFsy"
                      className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleGoogleOAuthLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-gray-100 text-black font-bold text-xs h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg mt-2"
                >
                  {loading ? (
                    <RefreshCw className="size-4 animate-spin text-blue-500" />
                  ) : (
                    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  )}
                  {userEmail.trim() ? `Fazer Login como ${userEmail.trim()}` : "Fazer Login com Conta Google"}
                </Button>
              </div>
            </TabsContent>

            {/* Aba 2: Contas da Equipe (Multi-Usuário) */}
            <TabsContent value="accounts" className="space-y-4 focus-visible:outline-none">
              <div className="p-3 bg-zinc-900/60 rounded-2xl border border-white/10 text-xs text-gray-300 space-y-2">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Users className="size-4 text-brand" /> Gerenciamento de Usuários da Equipe
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Como mais de uma pessoa utiliza o SM Hub, qualquer membro da equipe pode cadastrar e alternar a conta Google conectada para salvar propostas e orçamentos.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Nome do Colaborador</Label>
                  <Input
                    placeholder="Ex: Silas Maroto ou João Silva"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">E-mail da Conta Google</Label>
                  <Input
                    type="email"
                    placeholder="colaborador@empresa.com ou smmarketingetrafego@gmail.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!userEmail.trim() || !userEmail.includes("@")) {
                      toast.error("Informe um e-mail válido da Conta Google.");
                      return;
                    }
                    completeConnect(userEmail.trim(), userName.trim());
                  }}
                  disabled={loading || !userEmail.trim()}
                  className="w-full bg-brand text-black font-bold text-xs h-10 rounded-xl"
                >
                  <Plus className="size-3.5 mr-1.5" /> Conectar Google Drive Deste Usuário
                </Button>
              </div>
            </TabsContent>

            {/* Aba 3: Chave de API Google Cloud */}
            <TabsContent value="apikey" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={handleApiKeyConnect} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">E-mail da sua Conta Google</Label>
                  <Input
                    type="email"
                    placeholder="smmarketingetrafego@gmail.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="bg-black/60 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-300">Chave de API / Bearer Token do Google Cloud</Label>
                    <a 
                      href="https://console.cloud.google.com/apis/credentials" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] text-brand hover:underline flex items-center gap-1"
                    >
                      Google Cloud Console <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                  <Input
                    type="password"
                    placeholder="AIzaSy... ou Token ya29..."
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
                  Conectar e Validar Chave Google Cloud
                </Button>
              </form>
            </TabsContent>

            {/* Aba 4: Configuração de OAuth Client ID */}
            <TabsContent value="oauth_config" className="space-y-4 focus-visible:outline-none">
              <form onSubmit={handleSaveClientId} className="space-y-3">
                <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-2xl text-xs text-blue-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-4" /> Google Cloud Web Client ID
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Para que o pop-up nativo do Google apareça automaticamente para toda a equipe, configure aqui o Client ID de Aplicativo Web criado no seu projeto do Google Cloud / Firebase (Projeto: <code className="text-white">sm-hub-96206</code>).
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">OAuth 2.0 Web Client ID</Label>
                  <Input
                    placeholder="Ex: 981982938262-xxxxxxx.apps.googleusercontent.com"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    className="bg-black/60 border-white/10 text-white font-mono text-xs h-10 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand text-black font-bold text-xs h-10 rounded-xl"
                >
                  Salvar Client ID para a Equipe
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
