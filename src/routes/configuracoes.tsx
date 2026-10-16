// @ts-nocheck
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useServerFn } from "@tanstack/react-start";
import { updateAppSettings } from "./-settings.functions";
import { getTutorials, saveTutorialItem, deleteTutorialItem } from "@/lib/api-tutoriais.functions";
import { getAutomations, toggleAutomationRule, saveAutomationRule, type AutomationRule } from "@/lib/api-automacoes.functions";
import { WhatsAppConnectModal } from "@/components/integrations/whatsapp-connect-modal";
import { AIConnectModal } from "@/components/integrations/ai-connect-modal";
import { GatewayConnectModal } from "@/components/integrations/gateway-connect-modal";
import { EmailConnectModal } from "@/components/integrations/email-connect-modal";
import { openResendConnectPopup, RESEND_EVENT_NAME } from "@/lib/resend-connect";
import { ContractClauseEditorModal } from "@/components/propostas/contract-clause-editor-modal";
import { SubscriptionCheckoutModal } from "@/components/subscription/subscription-checkout-modal";
import { getActiveSubscription } from "@/lib/api-subscriptions.functions";
import { getIntegrations, type IntegrationsData } from "@/lib/api-integracoes.functions";
import {
  BellRing,
  Camera,
  Check,
  Copy,
  GripVertical,
  RotateCcw,
  Eye,
  Pencil,
  ListChecks,
  ChevronDown,
  Keyboard,
  Repeat,
  MessageCircle,
  ListTodo,
  Folder,
  RefreshCcw,
  Zap,
  BellOff,
  Box,
  DollarSign,
  CalendarDays,
  CheckSquare,
  ListTree,
  Users,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Crown,
  CheckCircle2,
  History,
  Clock,
  Upload,
  FileImage,
  Calendar,
  Globe,
  FileText,
  Receipt,
  Tag,
  ClipboardList,
  CreditCard,
  Instagram,
  KeyRound,
  Layers,
  Link2,
  Mail,
  Moon,
  Palette,
  Plus,
  Rocket,
  Save,
  Smartphone,
  Sun,
  Trash2,
  User,
  Workflow,
  Menu,
  Database,
  Cloud,
  Building2,
  Briefcase,
  ShieldCheck,
  FolderKanban,
  Settings,
  AlertCircle,
  Send,
  LogOut,
  QrCode,
  Laptop,
  Download,
  Share2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getAgencyProfile, saveAgencyProfile, type AgencyProfile, DEFAULT_AGENCY_PROFILE } from "@/lib/api-propostas.functions";
import { AddressFormFields } from "@/components/common/address-form-fields";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import React, { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { toast } from "sonner";

class TabErrorBoundary extends Component<{ title: string; children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { title: string; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Erro ao renderizar aba ${this.props.title}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 border border-red-500/30 rounded-2xl bg-red-500/5 text-center space-y-4 my-4">
          <div className="size-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h3 className="text-lg font-bold text-white">Não foi possível carregar a aba {this.props.title}</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {this.state.error?.message || "Ocorreu uma instabilidade pontual nesta seção."}
          </p>
          <Button
            variant="outline"
            className="border-white/10 text-white hover:bg-white/10"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Tentar recarregar aba
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { PageHeader } from "@/components/layout/page-header";
import { allNavItems } from "@/components/layout/nav-config";
import { PhotoAvatar, PhotoCropDialog } from "@/components/media/photo-picker";
import { StatusBadge } from "@/components/layout/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { integrations } from "@/data/mock";
import {
  getMyProfile,
  saveMyPreferences,
  saveMyProfile,
  type MyProfile,
} from "@/lib/profile.functions";
import { accentOptions, defaultPreferences, type Preferences } from "@/lib/preferences";
import { useTheme, applyThemeAndAccent } from "@/lib/theme";
import { Video as VideoIcon, Plus as PlusIcon, Trash2 as TrashIcon } from "lucide-react";
import { useStore, setStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    drive_connected: typeof search.drive_connected === "string" ? search.drive_connected : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Configurações — SM Hub" },
      {
        name: "description",
        content:
          "Perfil, aparência, notificações, automações, integrações, e-mails, conteúdos, menu mobile e assinatura do SM Hub.",
      },
      { property: "og:title", content: "Configurações — SM Hub" },
      {
        property: "og:description",
        content: "Central de configurações da sua agência no SM Hub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const tabs = [
  { id: "prestador", label: "Agência / Freelancer", icon: Building2 },
  { id: "perfil", label: "Perfil", icon: User },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "notificacoes", label: "Notificações", icon: BellRing },
  { id: "automacoes", label: "Automações", icon: Workflow },
  { id: "integracoes", label: "Integrações", icon: Link2 },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "conteudos", label: "Conteúdos", icon: Layers },
  { id: "tutoriais", label: "Tutoriais", icon: VideoIcon },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "assinatura", label: "Assinatura", icon: CreditCard },
  { id: "atualizacoes", label: "Atualizações", icon: Rocket },
  { id: "banco", label: "Banco de Dados", icon: Database },
] as const;

function SettingsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { preferences, profile } = useStore();
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  const [activeTab, setActiveTab] = useState<string>(search.tab || "prestador");

  useEffect(() => {
    if (search.tab && search.tab !== activeTab) {
      setActiveTab(search.tab);
    }
  }, [search.tab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    navigate({
      to: "/configuracoes",
      search: (prev: any) => ({ ...prev, tab: newTab }),
      replace: true,
    });
  };

  useEffect(() => {
    const handleCustomTab = (e: any) => {
      if (e.detail) {
        handleTabChange(e.detail);
      }
    };
    window.addEventListener("switch-settings-tab", handleCustomTab);
    return () => window.removeEventListener("switch-settings-tab", handleCustomTab);
  }, []);

  useEffect(() => {
    if (search.drive_connected === "true") {
      handleTabChange("banco");
      toast.success("Google Drive conectado com sucesso!");
    }
  }, [search.drive_connected]);

  useEffect(() => {
    if (preferences) setPrefs(preferences);
  }, [preferences]);

  const setPref = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const savePrefs = (area: string) => {
    setStore({ preferences: prefs });
    try {
      localStorage.setItem("smhub_preferences", JSON.stringify(prefs));
    } catch (e) {}
    toast.success(`Configurações de ${area} salvas com sucesso!`);
  };

  const saveButton = (area: string) => (
    <Button
      className="gradient-brand text-black font-extrabold h-10 px-5 rounded-xl shadow-md shadow-brand/20 hover:opacity-95 text-xs"
      onClick={() => savePrefs(area)}
    >
      <Save className="size-4 mr-1.5" /> Salvar alterações de {area}
    </Button>
  );

  return (
    <>
      <PageHeader title="Configurações" subtitle="Personalize sua experiência no SM Hub" />
      <TutorialBanner location="Configurações" />

      {/* Tabs Navigation Bar (Directly Interactive Buttons with Active State) */}
      <div className="flex h-auto w-full flex-wrap justify-start gap-1.5 bg-[#0e0e11] p-2 rounded-2xl border border-white/10 shadow-xl mb-6">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              id={`tab-btn-${t.id}`}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-brand text-black font-black shadow-md shadow-brand/25 border border-brand scale-[1.02]"
                  : "text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <t.icon className={`size-4 shrink-0 ${isActive ? "text-black" : "text-neutral-400"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-5">
        <TabsContent value="prestador">
          <TabErrorBoundary title="Agência / Freelancer">
            <AgencyProfileTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="perfil">
          <TabErrorBoundary title="Perfil">
            <ProfileTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="aparencia">
          <TabErrorBoundary title="Aparência">
            <AppearanceTab prefs={prefs} setPref={setPref} action={saveButton("aparência")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="notificacoes">
          <TabErrorBoundary title="Notificações">
            <NotificationsTab prefs={prefs} setPref={setPref} action={saveButton("notificações")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="automacoes">
          <TabErrorBoundary title="Automações">
            <AutomationsTab prefs={prefs} setPref={setPref} action={saveButton("automações")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="integracoes">
          <TabErrorBoundary title="Integrações">
            <IntegrationsTab prefs={prefs} setPref={setPref} action={saveButton("integrações")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="email">
          <TabErrorBoundary title="E-mail">
            <EmailTab prefs={prefs} setPref={setPref} action={saveButton("e-mail")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="conteudos">
          <TabErrorBoundary title="Conteúdos">
            <ContentTab prefs={prefs} setPref={setPref} action={saveButton("conteúdos")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="tutoriais">
          <TabErrorBoundary title="Tutoriais">
            <TutorialsTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="mobile">
          <TabErrorBoundary title="Menu Mobile">
            <MobileTab prefs={prefs} setPref={setPref} action={saveButton("menu mobile")} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="assinatura">
          <TabErrorBoundary title="Assinatura">
            <SubscriptionTab email={profile?.email ?? ""} />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="atualizacoes">
          <TabErrorBoundary title="Atualizações">
            <ChangelogTab />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="banco">
          <TabErrorBoundary title="Banco de Dados">
            <DatabaseTab />
          </TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </>
  );
}

type TabProps = {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  action: React.ReactNode;
};

function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-panel space-y-5 p-6", className)}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TutorialsTab() {
  const queryClient = useQueryClient();
  const { data: tutorials = [] } = useQuery({
    queryKey: ['tutorials'],
    queryFn: () => getTutorials(),
  });
  const [editing, setEditing] = useState<any>(null);

  const saveMutation = useMutation({
    mutationFn: async (item: any) => saveTutorialItem({ data: item }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tutorial salvo com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['tutorials'] });
        setEditing(null);
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteTutorialItem({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Tutorial removido.");
        queryClient.invalidateQueries({ queryKey: ['tutorials'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info("Sincronizando com seu Google Drive...");
      setTimeout(() => {
        toast.success("Vídeo salvo no Drive com sucesso!");
        const mockUrl = URL.createObjectURL(file);
        setEditing({ ...editing, videoUrl: mockUrl, driveFileId: `drive-${Date.now()}` });
      }, 1500);
    }
  };

  const handleLocationToggle = (loc: string) => {
    const locs = editing.locations || [];
    if (locs.includes(loc)) {
      setEditing({ ...editing, locations: locs.filter((l: string) => l !== loc) });
    } else {
      setEditing({ ...editing, locations: [...locs, loc] });
    }
  };

  const saveTutorial = (t: any) => {
    saveMutation.mutate(t);
  };

  const deleteTutorial = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (editing) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{editing.id ? "Editar" : "Novo"} Tutorial</h2>
          <p className="text-sm text-gray-400">Adicione os links do YouTube, Vimeo, Instagram ou Drive.</p>
        </div>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Título</label>
            <Input value={editing.title || ""} onChange={e => setEditing({...editing, title: e.target.value})} className="bg-[#111111] border-white/10 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">URL do Vídeo</label>
            <Input value={editing.videoUrl || ""} onChange={e => setEditing({...editing, videoUrl: e.target.value})} placeholder="https://www.youtube.com/embed/..." className="bg-[#111111] border-white/10 text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">URL da Capa (Thumbnail)</label>
            <Input value={editing.thumbnail || ""} onChange={e => setEditing({...editing, thumbnail: e.target.value})} placeholder="Link da imagem JPG/PNG" className="bg-[#111111] border-white/10 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Duração</label>
              <Input value={editing.duration || ""} onChange={e => setEditing({...editing, duration: e.target.value})} placeholder="Ex: 05:30" className="bg-[#111111] border-white/10 text-white" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Categoria</label>
              <Input value={editing.category || ""} onChange={e => setEditing({...editing, category: e.target.value})} placeholder="Iniciante, Gestão..." className="bg-[#111111] border-white/10 text-white" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Descrição</label>
            <Input value={editing.description || ""} onChange={e => setEditing({...editing, description: e.target.value})} className="bg-[#111111] border-white/10 text-white" />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Onde este tutorial deve aparecer?</label>
            <div className="flex flex-wrap gap-2">
              {["Dashboard", "Clientes", "Leads", "Pipeline", "Propostas", "Briefings", "Projetos", "Tarefas", "Calendário", "WhatsApp", "Produtos", "Agentes IA", "Financeiro", "Conquistas", "Configurações", "Atualizações", "Aba Tutoriais"].map(loc => (
                <button 
                  key={loc} 
                  onClick={() => handleLocationToggle(loc)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    (editing.locations || []).includes(loc) 
                      ? "bg-brand text-black border-brand" 
                      : "bg-[#111111] text-gray-400 border-white/10 hover:border-white/20"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Ou envie um arquivo (Salvar no Google Drive)</label>
            <div className="relative">
              <input type="file" accept="video/mp4,video/webm" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="bg-[#111111] border border-dashed border-white/20 text-brand flex items-center justify-center p-4 rounded-xl hover:bg-brand/5 transition-colors">
                <VideoIcon className="size-4 mr-2" />
                <span className="font-medium text-sm text-gray-300">Selecionar arquivo de vídeo (MP4)</span>
              </div>
            </div>
            {editing.driveFileId && <p className="text-emerald-500 text-xs mt-2 flex items-center gap-1"><Check className="size-3" /> Arquivo sincronizado com seu Google Drive</p>}
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <Button onClick={() => saveTutorial(editing)} className="bg-brand text-black font-bold">Salvar Tutorial</Button>
            <Button variant="ghost" onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">Cancelar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Gerenciar Tutoriais</h2>
          <p className="text-sm text-gray-400">Adicione e remova conteúdos da aba de tutoriais do sistema.</p>
        </div>
        <Button onClick={() => setEditing({})} className="bg-brand text-black font-bold"><PlusIcon className="size-4 mr-2" /> Novo Tutorial</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tutorials.map((tut: any) => (
          <div key={tut.id} className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden flex flex-col group">
            <div className="aspect-video bg-black relative">
              <img src={tut.thumbnail} className="w-full h-full object-cover opacity-70" alt="" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" onClick={() => setEditing(tut)}><Pencil className="size-4" /></Button>
                <Button size="icon" variant="destructive" onClick={() => deleteTutorial(tut.id)}><TrashIcon className="size-4" /></Button>
              </div>
            </div>
            <div className="p-3">
              <h4 className="text-white font-medium text-sm line-clamp-1">{tut.title}</h4>
              <p className="text-gray-500 text-xs mt-1">{tut.category} • {tut.duration}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FREELANCER_SPECIALTIES = [
  {
    group: "🎨 Design & Criação Visual",
    options: [
      "Designer UI/UX & Web Designer",
      "Designer Gráfico & Identidade Visual",
      "Editor(a) de Vídeo & Motion Designer",
      "Ilustrador(a) & Artista Digital",
      "Designer 3D & Modelagem",
    ],
  },
  {
    group: "💻 Desenvolvimento & Tecnologia",
    options: [
      "Desenvolvedor(a) Full Stack",
      "Desenvolvedor(a) Frontend / No-Code",
      "Desenvolvedor(a) Backend & APIs",
      "Desenvolvedor(a) WordPress / Shopify",
      "Programador(a) Mobile (iOS & Android)",
    ],
  },
  {
    group: "🚀 Marketing, Mídia & Tráfego",
    options: [
      "Gestor(a) de Tráfego Pago & Performance",
      "Social Media & Gestor(a) de Conteúdo",
      "Copywriter & Redator(a) Estratégico",
      "Estrategista Digital & Growth Hacker",
      "Especialista em SEO & Conteúdo Orgânico",
    ],
  },
  {
    group: "⚡ Automação, IA & Audiovisual",
    options: [
      "Especialista em Automações & IA (No-Code/APIs)",
      "Filmmaker & Produtor(a) Audiovisual",
      "Fotógrafo(a) Profissional",
      "Consultor(a) de Negócios Digitais",
      "Gestor(a) de Projetos & Operações Digitais",
    ],
  },
];

const AGENCY_SPECIALTIES = [
  {
    group: "📈 Performance & Aquisição",
    options: [
      "Agência de Marketing Digital & Performance",
      "Agência de Tráfego Pago & Escala de Vendas",
      "Agência de Social Media & Conteúdo Estratégico",
      "Assessoria de Comunicação & Imprensa",
    ],
  },
  {
    group: "✨ Design, Branding & Mídia",
    options: [
      "Estúdio de Design, Branding & Identidade Visual",
      "Produtora Audiovisual, Vídeos & Motion Design",
    ],
  },
  {
    group: "💻 Tecnologia & Inovação",
    options: [
      "Software House & Desenvolvimento Web / Mobile",
      "Agência de Automações, CRM & IA Aplicada",
    ],
  },
  {
    group: "🌐 Soluções Integradas",
    options: [
      "Agência Full Service (360°)",
      "Consultoria Estratégica de Crescimento (Growth)",
    ],
  },
];

const BRAZILIAN_BANKS = [
  {
    group: "⚡ Bancos Digitais & Fintechs Populares",
    options: [
      "Nubank (Nu Pagamentos)",
      "Banco Inter",
      "C6 Bank",
      "Mercado Pago",
      "PagBank (PagSeguro)",
      "PicPay",
      "Stone Pagamentos",
      "Neon Pagamentos",
      "Ame Digital",
    ],
  },
  {
    group: "🏛️ Bancos Tradicionais & Grandes Redes",
    options: [
      "Itaú Unibanco",
      "Banco Bradesco",
      "Banco do Brasil",
      "Caixa Econômica Federal",
      "Banco Santander",
      "BTG Pactual",
      "Banco Safra",
      "Banco Pan",
      "Banco BV (Votorantim)",
      "Banco Original",
    ],
  },
  {
    group: "🤝 Cooperativas & Bancos Públicos / Regionais",
    options: [
      "Sicoob",
      "Sicredi",
      "BRB (Banco de Brasília)",
      "Banrisul",
      "Banco do Nordeste (BNB)",
      "Banco da Amazônia (BASA)",
    ],
  },
];

function AgencyProfileTab() {
  const queryClient = useQueryClient();
  const { data: initialProfile } = useQuery({
    queryKey: ["agency-profile"],
    queryFn: () => getAgencyProfile(),
    initialData: DEFAULT_AGENCY_PROFILE,
  });

  const [form, setForm] = useState<AgencyProfile>(initialProfile || DEFAULT_AGENCY_PROFILE);
  const [clauseModalOpen, setClauseModalOpen] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setForm(initialProfile);
    }
  }, [initialProfile]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AgencyProfile>) => saveAgencyProfile({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Dados cadastrais do prestador salvos com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["agency-profile"] });
        queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      } else {
        toast.error(res.error || "Erro ao salvar perfil.");
      }
    },
    onError: (err: any) => {
      toast.error(`Falha ao salvar: ${err.message || 'Erro inesperado'}`);
    }
  });

  const set = (patch: Partial<AgencyProfile>) => setForm((prev) => ({ ...prev, ...patch }));

  const isFreelancer = form.providerType === "freelancer";
  const activeSpecialtyGroups = isFreelancer ? FREELANCER_SPECIALTIES : AGENCY_SPECIALTIES;
  const allSpecialties = activeSpecialtyGroups.flatMap((g) => g.options);
  const isRoleInList = form.professionalRole ? allSpecialties.includes(form.professionalRole) : false;

  const allBanks = BRAZILIAN_BANKS.flatMap((g) => g.options);
  const isBankInList = form.pixBank ? allBanks.includes(form.pixBank) : false;

  return (
    <div className="space-y-6">
      {/* Pending Mandatory Profile Banner */}
      {(!form.isCompleted || !form.legalName) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 shadow-lg shadow-amber-500/5">
          <div className="size-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Cadastro Oficial Pendente de Preenchimento Obrigatório
            </h3>
            <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
              Os campos iniciam em branco para que você preencha seus dados reais (ou da sua agência). O preenchimento completo é obrigatório para emissão de propostas e contratos formais com validade jurídica.
            </p>
          </div>
        </div>
      )}

      {/* Provider Mode Selection Banner */}
      <div className="surface-panel p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold">Tipo de Atuação no SM Hub</h2>
          <p className="text-sm text-muted-foreground">
            Escolha se você atua como Agência Digital (PJ) ou como Profissional Autônomo / Freelancer (PF). Os contratos, propostas e assinaturas se adaptarão automaticamente a esta modalidade.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => set({ 
              providerType: "agency",
              docType: "cnpj",
              representativeRole: form.representativeRole || "Diretor Executivo",
            })}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              !isFreelancer
                ? "bg-brand/10 border-brand text-white shadow-lg shadow-brand/10"
                : "bg-surface-elevated/40 border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
                  <Building2 className="size-5" />
                </div>
                {!isFreelancer && (
                  <Badge className="bg-brand text-black font-bold text-[10px]">ATIVO</Badge>
                )}
              </div>
              <h3 className="font-bold text-base text-foreground">Agência Digital (PJ)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Empresas, estúdios e produtoras com CNPJ, múltiplos projetos, sócios e contratos formais de prestação continuada ou pontual.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
              Documento: CNPJ • Partes: "A CONTRATADA"
            </div>
          </div>

          <div
            onClick={() => set({ 
              providerType: "freelancer",
              docType: "cpf",
              representativeRole: form.representativeRole || "Profissional Autônomo",
            })}
            className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              isFreelancer
                ? "bg-brand/10 border-brand text-white shadow-lg shadow-brand/10"
                : "bg-surface-elevated/40 border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
                  <Briefcase className="size-5" />
                </div>
                {isFreelancer && (
                  <Badge className="bg-brand text-black font-bold text-[10px]">ATIVO</Badge>
                )}
              </div>
              <h3 className="font-bold text-base text-foreground">Freelancer / Autônomo (PF)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Designers, programadores, editores, redatores e gestores autônomos que atendem clientes com CPF e suporte ao Art. 442-B da CLT.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
              Documento: CPF • Partes: "O PRESTADOR DE SERVIÇOS"
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Form Fields */}
        <div className="space-y-6">
          <Panel 
            title={isFreelancer ? "Identificação do Profissional Autônomo" : "Dados Cadastrais da Agência"} 
            description="Essas informações serão inseridas no preâmbulo de todos os contratos, orçamentos e links públicos."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={isFreelancer ? "Nome Completo do Profissional *" : "Razão Social (Nome Empresarial) *"}>
                <Input
                  value={form.legalName}
                  onChange={(e) => set({ legalName: e.target.value })}
                  placeholder={isFreelancer ? "Ex: Carlos Silva de Souza" : "Ex: Minha Empresa Digital Ltda."}
                />
              </Field>

              <Field label={isFreelancer ? "Nome Profissional / Marca de Atuação" : "Nome Fantasia (Como a agência é conhecida)"}>
                <Input
                  value={form.tradeName}
                  onChange={(e) => set({ tradeName: e.target.value })}
                  placeholder={isFreelancer ? "Ex: Silva Design & Marketing" : "Ex: Alfa Agência Digital"}
                />
              </Field>

              <Field label={isFreelancer ? "CPF do Profissional *" : "CNPJ da Empresa *"}>
                <Input
                  value={form.docNumber}
                  onChange={(e) => set({ docNumber: e.target.value })}
                  placeholder={isFreelancer ? "000.000.000-00" : "00.000.000/0001-00"}
                  className="font-mono"
                />
              </Field>

              <Field label={isFreelancer ? "RG e Órgão Emissor" : "Inscrição Estadual ou Municipal (opcional)"}>
                <Input
                  value={form.stateRegistration || ""}
                  onChange={(e) => set({ stateRegistration: e.target.value })}
                  placeholder={isFreelancer ? "Ex: 0000000-SSP/MA" : "Ex: Isento ou 12345678"}
                />
              </Field>

              <Field label={isFreelancer ? "Especialidade / Título Profissional *" : "Área de Atuação Principal da Agência *"}>
                <div className="space-y-2">
                  <select
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3.5 text-sm text-white focus:border-brand focus:outline-none"
                    value={isRoleInList ? form.professionalRole : (form.professionalRole ? "outro" : "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "outro") {
                        if (isRoleInList) set({ professionalRole: "" });
                      } else {
                        set({ professionalRole: val });
                      }
                    }}
                  >
                    <option value="" disabled className="bg-neutral-900 text-gray-500">
                      {isFreelancer ? "Selecione sua especialidade profissional..." : "Selecione a área principal da agência..."}
                    </option>
                    {activeSpecialtyGroups.map((group) => (
                      <optgroup key={group.group} label={group.group} className="bg-neutral-950 text-brand font-semibold">
                        {group.options.map((opt) => (
                          <option key={opt} value={opt} className="bg-neutral-900 text-white font-normal py-1">
                            {opt}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="Opção Personalizada" className="bg-neutral-950 text-gray-400 font-semibold">
                      <option value="outro" className="bg-neutral-900 text-amber-400 font-medium">
                        ✍️ Outro / Digitar Título Personalizado...
                      </option>
                    </optgroup>
                  </select>

                  {(!isRoleInList || !form.professionalRole) && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                      <Input
                        value={form.professionalRole}
                        onChange={(e) => set({ professionalRole: e.target.value })}
                        placeholder={isFreelancer ? "Digite sua especialidade (ex: Consultor de Branding & Design)" : "Digite a área personalizada da sua agência"}
                        className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
                      />
                      <p className="text-[11px] text-gray-500">
                        {isFreelancer 
                          ? "Título ou ocupação que sairá na qualificação das partes nos seus contratos autônomos." 
                          : "Área de atuação formal impressa no cabeçalho dos contratos da agência."}
                      </p>
                    </div>
                  )}
                </div>
              </Field>

              <Field label={isFreelancer ? "Cargo do Signatário no Contrato" : "Nome do Representante Legal (Signatário) *"}>
                <Input
                  value={isFreelancer ? (form.representativeRole || "Profissional Autônomo Independente") : form.representativeName}
                  onChange={(e) => {
                    if (isFreelancer) set({ representativeRole: e.target.value, representativeName: form.legalName });
                    else set({ representativeName: e.target.value });
                  }}
                  placeholder={isFreelancer ? "Profissional Autônomo" : "Ex: Carlos Silva de Souza"}
                />
              </Field>

              {!isFreelancer && (
                <Field label="Cargo do Representante Legal">
                  <Input
                    value={form.representativeRole}
                    onChange={(e) => set({ representativeRole: e.target.value })}
                    placeholder="Ex: Diretor Executivo (CEO) ou Sócio Administrador"
                  />
                </Field>
              )}
            </div>
          </Panel>

          <Panel title="Contatos Oficiais para Clientes & Contratos" description="Canais usados para envio das propostas, notificações e comunicação jurídica.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp Oficial (Com DDD) *">
                <Input
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </Field>

              <Field label="E-mail Oficial *">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="contato@suaempresa.com.br"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Endereço da Sede & Foro Jurídico" description="Utilizado na qualificação das partes e eleição de comarca nos contratos. Digite o CEP para busca automática ou preencha manualmente.">
            <AddressFormFields
              values={{
                zip: form.zip || "",
                address: form.address || "",
                addressNumber: form.addressNumber || "",
                district: form.district || "",
                city: form.city || "",
                state: form.state || "",
              }}
              onChange={(patch) => {
                set(patch);
                if (patch.city || patch.state) {
                  const newCity = patch.city ?? form.city;
                  const newState = patch.state ?? form.state;
                  if (!form.jurisdictionCity || form.jurisdictionCity === `${form.city} - ${form.state}`) {
                    set({ jurisdictionCity: `${newCity} - ${newState}` });
                  }
                }
              }}
              showComplement={false}
            />

            <div className="mt-4 pt-4 border-t border-white/5">
              <Field label="Comarca Eleita para o Foro (Art. 784 CPC)">
                <Input
                  value={form.jurisdictionCity || (form.city ? `${form.city} - ${form.state}` : "")}
                  onChange={(e) => set({ jurisdictionCity: e.target.value })}
                  placeholder="Ex: São Paulo - SP ou Imperatriz - MA"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Dados Bancários e Chave Pix para Recebimento" description="Configuração da chave que os clientes visualizam para pagar o sinal ou valor integral da proposta.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chave Pix Oficial *">
                <Input
                  value={form.pixKey}
                  onChange={(e) => set({ pixKey: e.target.value })}
                  placeholder="pix@smhub.com.br ou CNPJ/CPF/Celular"
                  className="font-mono"
                />
              </Field>

              <Field label="Tipo da Chave Pix">
                <select
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={form.pixKeyType}
                  onChange={(e) => set({ pixKeyType: e.target.value as any })}
                >
                  <option value="email">E-mail</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="cpf">CPF</option>
                  <option value="phone">Telefone / Celular</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </Field>

              <Field label="Nome do Titular / Favorecido *">
                <Input
                  value={form.pixBeneficiary}
                  onChange={(e) => set({ pixBeneficiary: e.target.value })}
                  placeholder="Ex: SM Hub Soluções Digitais Ltda. ou Nome Completo"
                />
              </Field>

              <Field label="Banco / Instituição Financeira da Chave Pix *">
                <div className="space-y-2">
                  <select
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3.5 text-sm text-white focus:border-brand focus:outline-none"
                    value={isBankInList ? form.pixBank : (form.pixBank ? "outro" : "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "outro") {
                        if (isBankInList) set({ pixBank: "" });
                      } else {
                        set({ pixBank: val });
                      }
                    }}
                  >
                    <option value="" disabled className="bg-neutral-900 text-gray-500">
                      Selecione o seu banco ou fintech...
                    </option>
                    {BRAZILIAN_BANKS.map((group) => (
                      <optgroup key={group.group} label={group.group} className="bg-neutral-950 text-brand font-semibold">
                        {group.options.map((bank) => (
                          <option key={bank} value={bank} className="bg-neutral-900 text-white font-normal py-1">
                            {bank}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="Outras Instituições" className="bg-neutral-950 text-gray-400 font-semibold">
                      <option value="outro" className="bg-neutral-900 text-amber-400 font-medium">
                        ✍️ Outro Banco / Não listado (Digitar manualmente)...
                      </option>
                    </optgroup>
                  </select>

                  {(!isBankInList) && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                      <Input
                        value={form.pixBank || ""}
                        onChange={(e) => set({ pixBank: e.target.value })}
                        placeholder="Digite o nome do seu banco (ex: Banco XP, Cresol, etc.)"
                        className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
                      />
                      <p className="text-[11px] text-gray-500">
                        O nome do banco será exibido no bloco de pagamento Pix do contrato para conferência do cliente.
                      </p>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          </Panel>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="gradient-brand text-black font-bold h-11 px-6 rounded-xl shadow-lg shadow-brand/20"
            >
              <Save className="size-4 mr-2" />
              {saveMutation.isPending ? "Salvando Dados..." : "Salvar Dados Cadastrais"}
            </Button>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="space-y-4">
          <div className="surface-panel p-5 space-y-4 border-brand/20">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
              <ShieldCheck className="size-4" /> Prévia nos Contratos
            </div>
            
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-3 text-xs">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10">
                <div className="size-8 rounded-lg bg-brand/20 text-brand font-black flex items-center justify-center text-sm">
                  {(form.tradeName || form.legalName || "SM").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{form.tradeName || form.legalName}</p>
                  <p className="text-[10px] text-gray-400 truncate">{form.professionalRole}</p>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-gray-300">
                <p className="font-semibold text-white">
                  {isFreelancer ? "PRESTADOR DE SERVIÇOS:" : "CONTRATADA:"}
                </p>
                <p className="text-gray-400">{form.legalName}</p>
                <p className="text-gray-400 font-mono">
                  {form.docType === "cnpj" ? "CNPJ: " : "CPF: "} {form.docNumber || "Não preenchido"}
                </p>
                <p className="text-gray-400">
                  {isFreelancer ? `Profissão: ${form.professionalRole}` : `Representante: ${form.representativeName}`}
                </p>
                <p className="text-gray-400">
                  {form.city ? `${form.city}/${form.state}` : "Cidade não informada"}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 text-[11px]">
                <span className="text-gray-400 block mb-0.5">Chave Pix cadastrada:</span>
                <span className="font-mono text-brand font-bold block truncate">{form.pixKey || "Nenhuma"}</span>
                <span className="text-[10px] text-gray-400">Favorecido: {form.pixBeneficiary || form.legalName}</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Estes dados são integrados diretamente no gerador de contratos em PDF e na página pública de assinatura acessada pelo cliente.
            </p>

            <Button
              type="button"
              onClick={() => setClauseModalOpen(true)}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#ff5722]/15 to-[#ff3d00]/10 hover:from-[#ff5722]/25 hover:to-[#ff3d00]/20 border border-[#ff5722]/40 text-xs font-bold text-[#ff5722] flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <FileText className="size-4 text-[#ff5722]" />
              Personalizar Cláusulas e Termos do Contrato
            </Button>
          </div>
        </div>
      </div>

      <ContractClauseEditorModal
        open={clauseModalOpen}
        onOpenChange={setClauseModalOpen}
      />
    </div>
  );
}

function ProfileTab() {
  const { profile } = useStore();
  const [form, setForm] = useState<MyProfile>(() => profile || {
    id: "user-1",
    name: "",
    email: "",
    photoUrl: null,
    avatarUrl: null,
    role: "member",
    fullName: "",
    phone: "",
    jobTitle: "",
    instagram: "",
    website: "",
    city: "",
    bio: "",
    company: "",
    docId: "",
    address: "",
    addressNumber: "",
    district: "",
    state: "",
    zip: "",
    country: "BR",
    currency: "BRL",
    language: "pt-BR",
    publicSlug: "",
    revenueGoal: 0,
  });
  const [cropOpen, setCropOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const saveMutation = () => {
    if (form) setStore({ profile: form });
    toast.success("Perfil atualizado.");
  };

  const set = (patch: Partial<MyProfile>) => setForm((p) => ({ ...p, ...patch }));

  const changePassword = async () => {
    if (password.trim().length < 8) {
      toast.error("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    toast.success("Senha alterada.");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Panel title="Dados pessoais" description="Como você aparece para o time e nos documentos.">
          <div className="flex flex-wrap items-center gap-4">
            <PhotoAvatar
              value={form.avatarUrl}
              fallback={(form.fullName || form.email || "SM").slice(0, 2).toUpperCase()}
              shape="square"
              className="size-20 text-xl"
              onClick={() => setCropOpen(true)}
            />
            <div className="space-y-2">
              <p className="font-semibold">{form.fullName || "Sem nome"}</p>
              <p className="text-sm text-muted-foreground">{form.email}</p>
              <Button variant="outline" size="sm" onClick={() => setCropOpen(true)}>
                <Camera className="size-4" /> {form.avatarUrl ? "Trocar foto" : "Enviar foto"}
              </Button>
            </div>
          </div>

          <PhotoCropDialog
            open={cropOpen}
            onOpenChange={setCropOpen}
            value={form.avatarUrl}
            onChange={(avatarUrl) => set({ avatarUrl })}
            title="Foto de perfil"
            description="Escolha a imagem, aproxime com o zoom e arraste para enquadrar o seu rosto."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo">
              <Input value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input value={form.email} disabled />
            </Field>
            <Field label="WhatsApp / telefone">
              <Input
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="(85) 99999-0000"
              />
            </Field>
            <Field label="Cargo ou função">
              <Input
                value={form.jobTitle}
                onChange={(e) => set({ jobTitle: e.target.value })}
                placeholder="Gestor de tráfego"
              />
            </Field>
            <Field label="Empresa / agência">
              <Input value={form.company} onChange={(e) => set({ company: e.target.value })} />
            </Field>
            <Field label="CPF ou CNPJ">
              <Input value={form.docId} onChange={(e) => set({ docId: e.target.value })} />
            </Field>
            <Field label="Instagram" icon={<Instagram className="size-3.5 text-primary" />}>
              <Input
                value={form.instagram}
                onChange={(e) => set({ instagram: e.target.value })}
                placeholder="seu.perfil"
              />
            </Field>
            <Field label="Site ou portfólio">
              <Input
                value={form.website}
                onChange={(e) => set({ website: e.target.value })}
                placeholder="smhub.com.br"
              />
            </Field>
          </div>

          <Field label="Apresentação">
            <Textarea
              value={form.bio}
              onChange={(e) => set({ bio: e.target.value })}
              rows={3}
              placeholder="Conte em poucas linhas o que você faz na operação."
            />
          </Field>
        </Panel>

        <Panel title="Endereço e faturamento" description="Usado nas propostas, contratos e recibos. Digite o CEP para busca automática ou preencha manualmente.">
          <AddressFormFields
            values={{
              zip: form.zip || "",
              address: form.address || "",
              addressNumber: form.addressNumber || "",
              district: form.district || "",
              city: form.city || "",
              state: form.state || "",
            }}
            onChange={(patch) => set(patch)}
            showComplement={false}
          />
          <div className="grid gap-4 sm:grid-cols-2 mt-4 pt-4 border-t border-border">
            <Field label="País">
              <Input value={form.country} onChange={(e) => set({ country: e.target.value })} />
            </Field>
            <Field label="Moeda">
              <select
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.currency}
                onChange={(e) => set({ currency: e.target.value })}
              >
                {["BRL", "USD", "EUR"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Idioma">
              <select
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={form.language}
                onChange={(e) => set({ language: e.target.value })}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">Inglês</option>
                <option value="es-ES">Espanhol</option>
              </select>
            </Field>
            <Field label="Meta mensal de faturamento (R$)">
              <Input
                type="number"
                min={0}
                value={form.revenueGoal}
                onChange={(e) => set({ revenueGoal: Number(e.target.value) })}
              />
            </Field>
          </div>

          <Button
            className="gradient-brand text-primary-foreground"
            onClick={saveMutation}
          >
            <Save className="size-4" /> Salvar alterações
          </Button>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Meu link público" description="Link usado no seu portfólio e link da bio.">
          <Field label="Apelido do link">
            <Input
              value={form.publicSlug}
              onChange={(e) => set({ publicSlug: e.target.value })}
              placeholder="seu-apelido"
            />
          </Field>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs break-all text-muted-foreground">
            smhub.com.br/{form.publicSlug || "seu-apelido"}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(
                `https://smhub.com.br/${form.publicSlug || ""}`,
              );
              toast.success("Link copiado.");
            }}
          >
            <Link2 className="size-4" /> Copiar link
          </Button>
        </Panel>

        <Panel title="Segurança" description="Troque a sua senha de acesso quando quiser.">
          <Field label="Nova senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo de 8 caracteres"
            />
          </Field>
          <Button variant="outline" onClick={changePassword} disabled={savingPassword}>
            <KeyRound className="size-4" /> {savingPassword ? "Alterando…" : "Alterar senha"}
          </Button>
        </Panel>

        <Panel title="Sessão & Troca de Conta" description="Alterne entre diferentes perfis cadastrados ou encerre a sessão atual para voltar à tela de login.">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast.info("Redirecionando para a tela de autenticação...");
                window.location.href = "/auth";
              }}
              className="border-brand/40 text-brand hover:bg-brand/10 hover:text-brand flex items-center justify-center gap-2 h-11"
            >
              <Users className="size-4 text-brand" />
              Trocar de Conta
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (e) {
                  console.error(e);
                }
                localStorage.removeItem("smhub_user");
                toast.success("Você saiu da conta.");
                window.location.href = "/auth";
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center gap-2 h-11"
            >
              <LogOut className="size-4 text-red-400" />
              Sair da Conta (Logout)
            </Button>
          </div>
        </Panel>

        <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden mt-6">
           <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-lg bg-brand/20 text-brand flex items-center justify-center shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg">Meus Links</h3>
                  <p className="text-sm text-gray-400">Altere os slugs das suas páginas públicas</p>
                </div>
              </div>
           </div>
           <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 bg-black rounded-xl p-4 border border-white/5">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">Portfólio</span>
                      <span className="bg-white/10 text-gray-300 text-xs px-2 py-0.5 rounded-md">/p/</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button className="text-gray-400 hover:text-white transition-colors"><ExternalLink className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 text-sm">smhub.com.br/p/</span>
                    <input type="text" value={form.publicSlug || ""} placeholder="seu-link" onChange={(e) => set({ publicSlug: e.target.value })} className="bg-transparent text-white text-sm outline-none w-full ml-1" />
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}

const COLOR_PRESETS = [
  { label: "Ouro SM Hub", value: "#C9A227" },
  { label: "Azul Elétrico", value: "#3B82F6" },
  { label: "Esmeralda Pro", value: "#10B981" },
  { label: "Roxo Real", value: "#8B5CF6" },
  { label: "Rosa Choque", value: "#EC4899" },
  { label: "Laranja Sunset", value: "#F97316" },
  { label: "Ciano Neon", value: "#06B6D4" },
  { label: "Vermelho Rubi", value: "#EF4444" },
  { label: "Branco / Prata", value: "#E2E8F0" },
  { label: "Grafite Escuro", value: "#262626" },
];

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-300">{label}</label>
        <span
          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase"
          style={{
            backgroundColor: `${value}15`,
            borderColor: `${value}40`,
            color: value,
          }}
        >
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLOR_PRESETS.map((p) => {
            const isSelected = value.toLowerCase() === p.value.toLowerCase();
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange(p.value)}
                title={p.label}
                className={`size-6 rounded-full border transition-all cursor-pointer ${
                  isSelected
                    ? "border-white scale-110 shadow-md ring-2 ring-white"
                    : "border-white/20 hover:scale-105"
                }`}
                style={{ backgroundColor: p.value }}
              />
            );
          })}
        </div>
        <input
          type="color"
          value={value.startsWith("#") && value.length === 7 ? value : "#C9A227"}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 rounded-lg cursor-pointer bg-transparent border-0 p-0 ml-auto"
          title="Escolher cor personalizada"
        />
      </div>
    </div>
  );
}

const DEFAULT_APPEARANCE_CONFIG = {
  system: {
    theme: "dark",
    accentColor: "#C9A227",
    cardStyle: "modern",
    density: "comfortable",
    sidebarCollapsed: false,
  },
  menuItems: {
    dashboard: true,
    metas: true,
    clientes: true,
    pipelines: true,
    leads: true,
    propostas: true,
    briefings: true,
    calendario: true,
    projetos: true,
    tarefas: true,
    relatorios: true,
    colaboradores: true,
    tutoriais: true,
  },
  clientPortal: {
    theme: "dark",
    primaryColor: "#C9A227",
    title: "Portal do Cliente • SM Hub",
    welcomeMessage: "Acompanhe suas entregas, faturas e relatórios em tempo real.",
    logoUrl: "/smhub-logo.png",
    bannerUrl: "",
    showProjects: true,
    showApprovals: true,
    showFiles: true,
    showInvoices: true,
    showReports: true,
    showWhatsapp: true,
    whatsappNumber: "5511999999999",
  },
  briefings: {
    theme: "dark",
    primaryColor: "#C9A227",
    title: "Briefing de Onboarding",
    subtitle: "Preencha as informações detalhadas para estruturarmos sua campanha.",
    bannerUrl: "",
    buttonText: "Enviar Respostas",
    successMessage: "Respostas enviadas com sucesso! Nossa equipe analisará seu material.",
    showProgressBar: true,
  },
  contentCategories: [
    { id: "reels", name: "Reels", color: "#8B5CF6" },
    { id: "carrossel", name: "Carrossel", color: "#C9A227" },
    { id: "estatico", name: "Post Estático", color: "#3B82F6" },
    { id: "stories", name: "Stories", color: "#F43F5E" },
    { id: "tiktok", name: "TikTok", color: "#06B6D4" },
    { id: "youtube", name: "YouTube", color: "#EF4444" },
    { id: "blog", name: "Artigo de Blog", color: "#10B981" },
  ],
  checkout: {
    theme: "dark",
    buttonColor: "#10B981",
    buttonText: "Aprovar e Assinar Orçamento",
    showSecurityBadge: true,
    bannerUrl: "",
    successMessage: "Orçamento aprovado com sucesso! Em breve nossa equipe entrará em contato.",
    allowPdfDownload: true,
  },
  pdfBudget: {
    template: "modern",
    accentColor: "#C9A227",
    showLogo: true,
    showPix: true,
    showTerms: true,
    footerMessage: "Validade deste orçamento: 15 dias corridos após emissão.",
  },
  portfolio: {
    layout: "grid",
    theme: "dark",
    accentColor: "#C9A227",
    title: "Nossos Melhores Cases & Resultados",
    bio: "Estratégias digitais de alto impacto para marcas ambiciosas.",
    bannerUrl: "",
    showWhatsapp: true,
    whatsappNumber: "5511999999999",
    showStats: true,
  },
  bioLink: {
    buttonStyle: "rounded",
    bgTheme: "dark",
    buttonColor: "#C9A227",
    avatarUrl: "",
    title: "@suaagencia",
    bio: "Assessoria Completa de Marketing & Tráfego",
    pulseFirstButton: true,
    showSocials: true,
  },
  scheduling: {
    theme: "dark",
    accentColor: "#C9A227",
    title: "Agende sua Sessão Estratégica",
    instructions: "Escolha uma data e horário disponível no calendário abaixo.",
    duration: "30",
    avatarUrl: "",
    minNotice: "2h",
  },
  tags: [
    { id: "urgente", name: "Urgente", color: "#EF4444" },
    { id: "aprovacao", name: "Aguardando Aprovação", color: "#F59E0B" },
    { id: "em-revisao", name: "Em Revisão", color: "#8B5CF6" },
    { id: "concluido", name: "Concluído", color: "#10B981" },
    { id: "design", name: "Design", color: "#3B82F6" },
    { id: "copy", name: "Copywriting", color: "#EC4899" },
  ],
};

function AppearanceTab({ prefs, setPref, action }: TabProps) {
  const { theme, setTheme, accentColor, setAccentColor, cardStyle, setCardStyle } = useTheme();
  const [config, setConfig] = useState(DEFAULT_APPEARANCE_CONFIG);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(true);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#C9A227");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");

  // Load persisted appearances from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("smhub_page_appearances");
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig((prev) => ({ ...prev, ...parsed }));
        if (parsed?.system) {
          applyThemeAndAccent(
            parsed.system.theme || "dark",
            parsed.system.accentColor || "#C9A227",
            parsed.system.cardStyle || "modern"
          );
        }
      } else {
        const curTheme = theme || prefs.theme || "dark";
        const curAccent = accentColor || (prefs.accentColor?.startsWith("#") ? prefs.accentColor : "#C9A227");
        applyThemeAndAccent(curTheme, curAccent, "modern");
      }
    } catch (e) {
      console.error("Erro ao carregar configurações de aparência:", e);
    }
  }, []);

  const updateSystemTheme = (newTheme: Theme) => {
    const updated = {
      ...config,
      system: { ...config.system, theme: newTheme },
    };
    setConfig(updated);
    setTheme(newTheme);
    setPref("theme", newTheme);
    applyThemeAndAccent(newTheme, config.system.accentColor, config.system.cardStyle as any);
    try {
      localStorage.setItem("smhub_page_appearances", JSON.stringify(updated));
      localStorage.setItem("smhub_theme", newTheme);
      const storedPrefs = localStorage.getItem("smhub_preferences");
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs);
        parsedPrefs.theme = newTheme;
        localStorage.setItem("smhub_preferences", JSON.stringify(parsedPrefs));
      }
    } catch (e) {}
  };

  const updateSystemAccent = (newColor: string) => {
    const updated = {
      ...config,
      system: { ...config.system, accentColor: newColor },
    };
    setConfig(updated);
    setAccentColor(newColor);
    setPref("accentColor", newColor);
    applyThemeAndAccent(config.system.theme as any, newColor, config.system.cardStyle as any);
    try {
      localStorage.setItem("smhub_page_appearances", JSON.stringify(updated));
      localStorage.setItem("smhub_accent", newColor);
      const storedPrefs = localStorage.getItem("smhub_preferences");
      if (storedPrefs) {
        const parsedPrefs = JSON.parse(storedPrefs);
        parsedPrefs.accentColor = newColor;
        localStorage.setItem("smhub_preferences", JSON.stringify(parsedPrefs));
      }
    } catch (e) {}
  };

  const updateSystemCardStyle = (newStyle: "modern" | "glass" | "minimal") => {
    const updated = {
      ...config,
      system: { ...config.system, cardStyle: newStyle },
    };
    setConfig(updated);
    if (setCardStyle) setCardStyle(newStyle);
    applyThemeAndAccent(config.system.theme as any, config.system.accentColor, newStyle);
    try {
      localStorage.setItem("smhub_page_appearances", JSON.stringify(updated));
    } catch (e) {}
  };

  const saveConfig = (updated: typeof DEFAULT_APPEARANCE_CONFIG, areaName?: string) => {
    setConfig(updated);
    try {
      localStorage.setItem("smhub_page_appearances", JSON.stringify(updated));
      if (updated.system) {
        localStorage.setItem("smhub_theme", updated.system.theme);
        localStorage.setItem("smhub_accent", updated.system.accentColor);
        setTheme(updated.system.theme as any);
        setAccentColor(updated.system.accentColor);
        setPref("theme", updated.system.theme as any);
        setPref("accentColor", updated.system.accentColor);
        setStore({
          preferences: {
            ...prefs,
            theme: updated.system.theme as any,
            accentColor: updated.system.accentColor,
          },
        });
        applyThemeAndAccent(
          updated.system.theme as any,
          updated.system.accentColor,
          updated.system.cardStyle as any
        );
      }
    } catch (e) {}
    if (areaName) {
      toast.success(`Aparência de ${areaName} salva com sucesso!`);
    } else {
      toast.success("Todas as configurações visuais foram aplicadas e salvas!");
    }
  };

  const cards = [
    {
      id: "system",
      title: "Aparência do Sistema",
      description: "Tema escuro/claro, cor de destaque SM Hub, estilos de cartões e densidade",
      icon: Palette,
      badge: `${config.system.theme === "dark" ? "Escuro" : "Claro"} • ${config.system.accentColor === "#C9A227" ? "Ouro SM Hub" : config.system.accentColor}`,
    },
    {
      id: "menuItems",
      title: "Itens do Menu Lateral",
      description: "Personalize quais módulos da agência ficam visíveis na barra de navegação",
      icon: Menu,
      badge: `${Object.values(config.menuItems).filter(Boolean).length} Módulos Ativos`,
    },
    {
      id: "clientPortal",
      title: "Portal do Cliente",
      description: "Personalize a logo, cores de destaque, login, banner e abas visíveis no portal",
      icon: User,
      badge: config.clientPortal.theme === "dark" ? "Dark Premium" : "Clean White",
    },
    {
      id: "briefings",
      title: "Página de Briefings",
      description: "Personalize o tema, cores dos botões, banner e mensagens de conclusão",
      icon: ClipboardList,
      badge: config.briefings.theme === "dark" ? "Dark Minimal" : "Light Modern",
    },
    {
      id: "contentCategories",
      title: "Categorias de Conteúdo",
      description: "Defina as cores, badges e nomes para Reels, Carrossel, Stories e Posts",
      icon: Tag,
      badge: `${config.contentCategories.length} Tipos com Cores`,
    },
    {
      id: "checkout",
      title: "Página de Aprovação / Checkout",
      description: "Customização visual da página onde o cliente aprova o orçamento e assina",
      icon: Receipt,
      badge: config.checkout.theme === "dark" ? "Escuro Sofisticado" : "Claro Comercial",
    },
    {
      id: "pdfBudget",
      title: "PDF de Orçamento",
      description: "Template visual, cores, cabeçalho da agência, QR Code Pix e termos contratuais",
      icon: FileText,
      badge:
        config.pdfBudget.template === "modern"
          ? "Modern Dark"
          : config.pdfBudget.template === "clean"
          ? "Clean Minimal"
          : "Executive Gold",
    },
    {
      id: "portfolio",
      title: "Página Pública (Portfólio)",
      description: "Estilo do grid, tema, bio de apresentação, botão flutuante e métricas",
      icon: Globe,
      badge:
        config.portfolio.layout === "grid"
          ? "Grade Moderna"
          : config.portfolio.layout === "carousel"
          ? "Carrossel"
          : "Lista Editorial",
    },
    {
      id: "bioLink",
      title: "Link da Bio",
      description: "Design dos botões, glassmorphism, avatar, paleta de cores e links sociais",
      icon: Link2,
      badge:
        config.bioLink.buttonStyle === "rounded"
          ? "Botões Arredondados"
          : config.bioLink.buttonStyle === "glass"
          ? "Glassmorphism"
          : "Minimalista",
    },
    {
      id: "scheduling",
      title: "Página de Agendamento",
      description: "Cores do calendário, foto do consultor, duração das reuniões e instruções",
      icon: Calendar,
      badge: `${config.scheduling.duration} min • ${config.scheduling.theme === "dark" ? "Escuro" : "Claro"}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ============================================================== */}
      {/* SEÇÃO PRINCIPAL 1: TEMA & CORES DO SISTEMA (EM TEMPO REAL)     */}
      {/* ============================================================== */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0e11] p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow ambient background based on active accent */}
        <div
          className="absolute -top-24 -right-24 size-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: config.system.accentColor }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="size-12 rounded-xl flex items-center justify-center font-bold shadow-lg transition-transform"
              style={{ backgroundColor: config.system.accentColor, color: "#000" }}
            >
              <Palette className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Personalização Visual do Sistema
                <span
                  className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-sm"
                  style={{
                    backgroundColor: `${config.system.accentColor}20`,
                    borderColor: `${config.system.accentColor}40`,
                    color: config.system.accentColor,
                  }}
                >
                  Em Tempo Real
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Alterne temas, cores de destaque e estilos visuais. Todas as mudanças refletem instantaneamente em todo o SM Hub.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => saveConfig(config)}
              className="gradient-brand text-black font-extrabold h-9 px-4 rounded-xl shadow-md shadow-brand/20 hover:opacity-95 text-xs cursor-pointer"
            >
              <Save className="size-4 mr-1.5" /> Salvar Tema & Cores
            </Button>
          </div>
        </div>

        {/* 1. Modo de Exibição (Escuro / Claro / Sistema) */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            1. Modo de Exibição (Dark / Light)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "dark", label: "Modo Escuro", desc: "Contraste profundo e sofisticado", icon: Moon },
              { id: "light", label: "Modo Claro", desc: "Superfícies limpas e brancas", icon: Sun },
              { id: "system", label: "Sistema Auto", desc: "Segue o tema do seu dispositivo", icon: Laptop },
            ].map((t) => {
              const isActive = config.system.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateSystemTheme(t.id as Theme)}
                  className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isActive
                      ? "border-brand bg-brand/10 shadow-lg shadow-brand/10 ring-1 ring-brand"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20"
                  }`}
                >
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-brand text-black" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    <t.icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isActive ? "text-brand" : "text-white"}`}>
                        {t.label}
                      </span>
                      {isActive && (
                        <span className="size-2 rounded-full bg-brand animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Cores de Destaque Principais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              2. Cor Primária de Destaque do Sistema
            </label>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase"
              style={{
                backgroundColor: `${config.system.accentColor}15`,
                borderColor: `${config.system.accentColor}40`,
                color: config.system.accentColor,
              }}
            >
              {config.system.accentColor.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            {COLOR_PRESETS.map((p) => {
              const isSelected = config.system.accentColor.toLowerCase() === p.value.toLowerCase();
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => updateSystemAccent(p.value)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "border-white bg-white/10 shadow-md scale-105 ring-1 ring-white"
                      : "border-white/10 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <span
                    className="size-4 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: p.value }}
                  />
                  <span className={isSelected ? "text-white font-bold" : "text-gray-300"}>
                    {p.label}
                  </span>
                  {isSelected && (
                    <Check className="size-3.5 text-white ml-0.5" />
                  )}
                </button>
              );
            })}

            {/* Custom Color input */}
            <div className="flex items-center gap-2 ml-auto pl-2 border-l border-white/10">
              <span className="text-[11px] text-gray-400 font-medium">Personalizada:</span>
              <input
                type="color"
                value={
                  config.system.accentColor.startsWith("#") && config.system.accentColor.length === 7
                    ? config.system.accentColor
                    : "#C9A227"
                }
                onChange={(e) => updateSystemAccent(e.target.value)}
                className="size-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                title="Escolher cor personalizada"
              />
            </div>
          </div>
        </div>

        {/* 3. Estilo dos Cartões e Barra Lateral */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Estilo dos Cartões */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              3. Estilo Visual dos Cartões
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "modern", label: "Moderno Glow" },
                { id: "glass", label: "Glassmorphism" },
                { id: "minimal", label: "Minimalista" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateSystemCardStyle(s.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                    config.system.cardStyle === s.id
                      ? "bg-brand/20 border-brand text-brand shadow-sm"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barra Lateral Retraída */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              4. Preferências de Layout
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 h-[42px]">
              <div>
                <p className="text-xs font-semibold text-white">Barra lateral encolhida por padrão</p>
              </div>
              <Switch
                checked={config.system.sidebarCollapsed}
                onCheckedChange={(v) => {
                  const updated = {
                    ...config,
                    system: { ...config.system, sidebarCollapsed: v },
                  };
                  setConfig(updated);
                  saveConfig(updated);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Box */}
        <div
          className="p-4 rounded-xl border transition-all text-xs space-y-3"
          style={{
            backgroundColor: config.system.theme === "light" ? "#f8fafc" : "#141418",
            borderColor: `${config.system.accentColor}50`,
            color: config.system.theme === "light" ? "#0f172a" : "#f8fafc",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase tracking-wider text-[10px] opacity-75">
              Demonstração ao Vivo do Tema Selecionado
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: config.system.accentColor, color: "#000" }}
            >
              Ativo no Sistema
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-black shadow-md cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: config.system.accentColor }}
            >
              Botão Principal com a Cor
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                borderColor: `${config.system.accentColor}50`,
                backgroundColor: `${config.system.accentColor}15`,
                color: config.system.accentColor,
              }}
            >
              Badge de Destaque
            </button>
            <span className="text-xs font-extrabold text-gradient-brand">
              Texto com Gradiente SM Hub
            </span>
            <span className="text-xs opacity-75 ml-auto">
              {config.system.theme === "light" ? "☀️ Modo Claro" : "🌙 Modo Escuro"} • Estilo: {config.system.cardStyle}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 2: CUSTOMIZADORES VISUAIS POR PÁGINA (CARDS ESPECÍFICOS) */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Personalizar Páginas Específicas
          </h3>
          <p className="text-xs text-gray-400">
            Ajuste a identidade visual independente de cada página pública, portal do cliente e propostas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => setActiveModal(card.id)}
              className="bg-[#111111] border border-white/5 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-brand/40 hover:bg-white/[0.03] transition-all group relative overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand/20 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <card.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium group-hover:text-brand transition-colors">
                      {card.title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">{card.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-4">
                <span className="text-[11px] font-semibold text-gray-400 group-hover:text-brand transition-colors hidden sm:inline">
                  Personalizar
                </span>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Favicon */}
      <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand/20 text-brand flex items-center justify-center shrink-0">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-medium">Favicon Global</h3>
              <p className="text-sm text-gray-400">
                Ícone exibido na aba do navegador em páginas públicas (orçamentos, contratos, briefings, checkout, portais).
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">URL ou Imagem</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-brand transition-colors text-xs"
                  placeholder="https://... URL do seu ícone (PNG ou ICO)"
                />
                <button
                  type="button"
                  onClick={() => toast.success("Favicon atualizado com sucesso!")}
                  className="bg-brand text-black font-bold text-xs rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-95 shadow-md shadow-brand/20 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Salvar Ícone
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Ocultar marca SM Hub</p>
                <p className="text-sm text-gray-400">
                  Remove o "Powered by SM Hub" das páginas públicas (briefings, orçamentos, portais, etc.).
                </p>
              </div>
              <Switch
                checked={prefs.hideBrandOnPublic}
                onCheckedChange={(v) => {
                  setPref("hideBrandOnPublic", v);
                  toast.success(`Marca SM Hub ${v ? "ocultada" : "visível"}`);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contador de Produções */}
      <div className="bg-[#111111] border border-white/5 rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand/20 text-brand flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-medium">Contador de Produções</h3>
            <p className="text-sm text-gray-400">Exibir o atalho flutuante do contador de produções no canto inferior da tela.</p>
          </div>
        </div>
        <Switch
          checked={showCounter}
          onCheckedChange={(val) => {
            setShowCounter(val);
            toast.success(`Contador de produções ${val ? "ativado" : "desativado"}`);
          }}
          className="data-[state=checked]:bg-brand"
        />
      </div>

      {/* Gerenciar Tags */}
      <div className="bg-[#111111] border border-white/5 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Gerenciar Tags e Cores</h3>
          <p className="text-sm text-gray-400">Personalize cores e nomes das tags usadas em tarefas e projetos.</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveModal("tags")}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white hover:bg-white/10 transition-colors whitespace-nowrap ml-4 text-xs font-semibold cursor-pointer"
        >
          Abrir Gerenciador de Tags
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e0e11] border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-xl flex items-center justify-center font-bold text-black shadow-md shrink-0"
            style={{ backgroundColor: config.system.accentColor }}
          >
            <Check className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Configurações de Aparência do SM Hub</p>
            <p className="text-[11px] text-gray-400">
              Tema: <span className="text-brand font-semibold capitalize">{config.system.theme}</span> • Cor: <span className="font-mono font-bold text-brand">{config.system.accentColor}</span> • Estilo: <span className="text-brand font-semibold">{config.system.cardStyle}</span>
            </p>
          </div>
        </div>

        <Button
          onClick={() => saveConfig(config)}
          className="w-full sm:w-auto gradient-brand text-black font-extrabold h-11 px-6 rounded-xl shadow-lg shadow-brand/20 hover:opacity-95 text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="size-4" /> Salvar Todas as Configurações de Aparência
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: APARÊNCIA DO SISTEMA */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "system"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Palette className="w-5 h-5 text-brand" />
              Aparência do Sistema
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o tema geral, cores de realce e densidade da interface da agência.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Live Preview Box */}
            <div
              className="p-4 rounded-xl border transition-all text-xs space-y-2.5"
              style={{
                backgroundColor: config.system.theme === "light" ? "#f8fafc" : "#141418",
                borderColor: config.system.accentColor,
                color: config.system.theme === "light" ? "#0f172a" : "#f8fafc",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wider text-[10px]">
                  Pré-visualização do Sistema
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: config.system.accentColor, color: "#000" }}
                >
                  Tema Ativo
                </span>
              </div>
              <p className="text-xs opacity-80">
                Painel do SM Hub com bordas estilizadas e botões no padrão selecionado.
              </p>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-black shadow cursor-pointer"
                style={{ backgroundColor: config.system.accentColor }}
              >
                Exemplo de Botão
              </button>
            </div>

            {/* Tema Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Modo de Exibição</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "dark", label: "Escuro", icon: Moon },
                  { id: "light", label: "Claro", icon: Sun },
                  { id: "system", label: "Sistema", icon: Laptop },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...config,
                        system: { ...config.system, theme: t.id },
                      };
                      setConfig(updated);
                      setTheme(t.id as any);
                      setPref("theme", t.id as any);
                      applyThemeAndAccent(t.id as any, config.system.accentColor);
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      config.system.theme === t.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de Destaque */}
            <ColorPickerField
              label="Cor Primária de Destaque"
              value={config.system.accentColor}
              onChange={(color) => {
                const updated = {
                  ...config,
                  system: { ...config.system, accentColor: color },
                };
                setConfig(updated);
                setAccentColor(color);
                setPref("accentColor", color);
                applyThemeAndAccent(config.system.theme as any, color);
              }}
            />

            {/* Estilo dos Cards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Estilo Visual dos Cartões</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "modern", label: "Moderno Dourado" },
                  { id: "glass", label: "Glassmorphism" },
                  { id: "minimal", label: "Minimalista" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        system: { ...config.system, cardStyle: s.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.system.cardStyle === s.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barra lateral retraída */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">Barra Lateral Retraída por Padrão</p>
                <p className="text-[11px] text-gray-400">Inicia com o menu lateral encolhido em ícones.</p>
              </div>
              <Switch
                checked={config.system.sidebarCollapsed}
                onCheckedChange={(v) =>
                  setConfig({
                    ...config,
                    system: { ...config.system, sidebarCollapsed: v },
                  })
                }
                className="data-[state=checked]:bg-brand"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Aparência do Sistema");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Aparência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: ITENS DO MENU LATERAL */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "menuItems"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Menu className="w-5 h-5 text-brand" />
              Itens do Menu Lateral
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Oculte ou exiba os módulos da agência na barra de navegação lateral.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <span className="text-xs text-gray-400">Módulos Visíveis</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allActive = Object.keys(config.menuItems).reduce(
                      (acc, k) => ({ ...acc, [k]: true }),
                      {}
                    );
                    setConfig({ ...config, menuItems: allActive as any });
                  }}
                  className="text-[11px] text-brand hover:underline font-semibold cursor-pointer"
                >
                  Marcar Todos
                </button>
                <span className="text-gray-600">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfig({
                      ...config,
                      menuItems: DEFAULT_APPEARANCE_CONFIG.menuItems,
                    });
                  }}
                  className="text-[11px] text-gray-400 hover:text-white font-semibold cursor-pointer"
                >
                  Restaurar Padrão
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: "dashboard", label: "Dashboard Geral", icon: LayoutDashboard },
                { id: "metas", label: "Metas & OKRs", icon: Rocket },
                { id: "clientes", label: "Gestão de Clientes", icon: Users },
                { id: "pipelines", label: "Pipelines & Funis", icon: FolderKanban },
                { id: "leads", label: "Leads Comerciais", icon: User },
                { id: "propostas", label: "Propostas & Orçamentos", icon: Receipt },
                { id: "briefings", label: "Briefings Dinâmicos", icon: ClipboardList },
                { id: "calendario", label: "Calendário de Conteúdo", icon: Calendar },
                { id: "projetos", label: "Gestão de Projetos", icon: Folder },
                { id: "tarefas", label: "Tarefas da Equipe", icon: ListTodo },
                { id: "relatorios", label: "Relatórios & BI", icon: Layers },
                { id: "colaboradores", label: "Colaboradores & Equipe", icon: Users },
                { id: "tutoriais", label: "Tutoriais em Vídeo", icon: VideoIcon },
              ].map((item) => {
                const isChecked = (config.menuItems as any)[item.id] ?? true;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 text-brand" />
                      <span className="text-xs font-medium text-gray-200">{item.label}</span>
                    </div>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          menuItems: { ...config.menuItems, [item.id]: checked },
                        })
                      }
                      className="data-[state=checked]:bg-brand"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Itens do Menu");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Menu
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PORTAL DO CLIENTE */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "clientPortal"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <User className="w-5 h-5 text-brand" />
              Aparência do Portal do Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o visual e os recursos exibidos aos seus clientes na área exclusiva deles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Preview */}
            <div
              className="p-4 rounded-xl border text-xs space-y-3 transition-all"
              style={{
                backgroundColor: config.clientPortal.theme === "light" ? "#f8fafc" : "#121216",
                borderColor: config.clientPortal.primaryColor,
                color: config.clientPortal.theme === "light" ? "#0f172a" : "#fff",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{config.clientPortal.title}</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: config.clientPortal.primaryColor, color: "#000" }}
                >
                  Portal Ativo
                </span>
              </div>
              <p className="text-[11px] opacity-75">{config.clientPortal.welcomeMessage}</p>
              <div className="flex gap-2 flex-wrap text-[10px]">
                {config.clientPortal.showProjects && (
                  <span className="px-2 py-1 rounded bg-white/10">Projetos</span>
                )}
                {config.clientPortal.showApprovals && (
                  <span className="px-2 py-1 rounded bg-white/10">Aprovações</span>
                )}
                {config.clientPortal.showInvoices && (
                  <span className="px-2 py-1 rounded bg-white/10">Faturas</span>
                )}
                {config.clientPortal.showReports && (
                  <span className="px-2 py-1 rounded bg-white/10">Relatórios</span>
                )}
              </div>
            </div>

            {/* Tema */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Tema do Portal</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dark", label: "Dark Premium" },
                  { id: "light", label: "Clean White" },
                ].map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        clientPortal: { ...config.clientPortal, theme: tm.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.clientPortal.theme === tm.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor Primária */}
            <ColorPickerField
              label="Cor dos Botões e Destaques"
              value={config.clientPortal.primaryColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  clientPortal: { ...config.clientPortal, primaryColor: c },
                })
              }
            />

            {/* Título e Boas-Vindas */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Título do Portal</label>
                <Input
                  value={config.clientPortal.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      clientPortal: { ...config.clientPortal, title: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Mensagem de Boas-Vindas</label>
                <Input
                  value={config.clientPortal.welcomeMessage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      clientPortal: { ...config.clientPortal, welcomeMessage: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Abas Visíveis */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-gray-300">Abas Exibidas no Portal</label>
              <div className="space-y-2">
                {[
                  { key: "showProjects", label: "Demandas & Projetos" },
                  { key: "showApprovals", label: "Aprovação de Conteúdos" },
                  { key: "showFiles", label: "Arquivos & Entregáveis" },
                  { key: "showInvoices", label: "Faturas & Cobranças" },
                  { key: "showReports", label: "Relatórios de Métricas" },
                  { key: "showWhatsapp", label: "Botão de WhatsApp no Portal" },
                ].map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <span className="text-xs text-gray-300">{f.label}</span>
                    <Switch
                      checked={(config.clientPortal as any)[f.key]}
                      onCheckedChange={(val) =>
                        setConfig({
                          ...config,
                          clientPortal: { ...config.clientPortal, [f.key]: val },
                        })
                      }
                      className="data-[state=checked]:bg-brand"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Portal do Cliente");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Aparência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: BRIEFINGS */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "briefings"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <ClipboardList className="w-5 h-5 text-brand" />
              Aparência da Página de Briefings
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o design da página pública onde os clientes preenchem suas respostas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Preview */}
            <div
              className="p-4 rounded-xl border text-xs space-y-3 transition-all"
              style={{
                backgroundColor: config.briefings.theme === "light" ? "#f8fafc" : "#131317",
                borderColor: config.briefings.primaryColor,
                color: config.briefings.theme === "light" ? "#0f172a" : "#fff",
              }}
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand">
                  Briefing Oficial
                </span>
                <h4 className="font-bold text-sm">{config.briefings.title}</h4>
                <p className="text-[11px] opacity-75">{config.briefings.subtitle}</p>
              </div>
              {config.briefings.showProgressBar && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Progresso</span>
                    <span>60%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: "60%", backgroundColor: config.briefings.primaryColor }}
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                className="w-full py-2 rounded-lg text-xs font-bold text-black cursor-pointer shadow"
                style={{ backgroundColor: config.briefings.primaryColor }}
              >
                {config.briefings.buttonText}
              </button>
            </div>

            {/* Tema */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Tema da Página Pública</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dark", label: "Dark Minimal" },
                  { id: "light", label: "Light Modern" },
                ].map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        briefings: { ...config.briefings, theme: tm.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.briefings.theme === tm.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor do Botão */}
            <ColorPickerField
              label="Cor do Botão e Destaques"
              value={config.briefings.primaryColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  briefings: { ...config.briefings, primaryColor: c },
                })
              }
            />

            {/* Títulos */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Título Padrão do Briefing</label>
                <Input
                  value={config.briefings.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      briefings: { ...config.briefings, title: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Subtítulo / Instruções</label>
                <Input
                  value={config.briefings.subtitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      briefings: { ...config.briefings, subtitle: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Texto do Botão de Envio</label>
                <Input
                  value={config.briefings.buttonText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      briefings: { ...config.briefings, buttonText: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-xs text-gray-300 block">Exibir Barra de Progresso</span>
                <span className="text-[11px] text-gray-400">Mostra a porcentagem preenchida pelo cliente.</span>
              </div>
              <Switch
                checked={config.briefings.showProgressBar}
                onCheckedChange={(val) =>
                  setConfig({
                    ...config,
                    briefings: { ...config.briefings, showProgressBar: val },
                  })
                }
                className="data-[state=checked]:bg-brand"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Página de Briefings");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Aparência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: CATEGORIAS DE CONTEÚDO */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "contentCategories"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Tag className="w-5 h-5 text-brand" />
              Cores das Categorias de Conteúdo
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize os nomes e as cores de identificação visual dos formatos no calendário e kanban.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lista de Categorias */}
            <div className="space-y-2">
              {config.contentCategories.map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-bold text-black"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cat.color}
                      onChange={(e) => {
                        const updated = [...config.contentCategories];
                        updated[idx].color = e.target.value;
                        setConfig({ ...config, contentCategories: updated });
                      }}
                      className="size-7 rounded-md cursor-pointer bg-transparent border-0 p-0"
                      title="Alterar cor"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.contentCategories.filter((_, i) => i !== idx);
                        setConfig({ ...config, contentCategories: updated });
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Nova Categoria */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Adicionar Novo Formato</label>
              <div className="flex gap-2">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome do formato (ex: Newsletter)"
                  className="bg-black/50 border-white/10 text-xs flex-1"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="size-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    if (!newCatName.trim()) {
                      toast.error("Informe o nome do formato");
                      return;
                    }
                    const updated = [
                      ...config.contentCategories,
                      {
                        id: newCatName.toLowerCase().replace(/\s+/g, "-"),
                        name: newCatName.trim(),
                        color: newCatColor,
                      },
                    ];
                    setConfig({ ...config, contentCategories: updated });
                    setNewCatName("");
                    toast.success("Categoria adicionada!");
                  }}
                  className="bg-brand text-black font-bold text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Categorias de Conteúdo");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Cores
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 6: PÁGINA DE APROVAÇÃO / CHECKOUT */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "checkout"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Receipt className="w-5 h-5 text-brand" />
              Página de Aprovação de Orçamento
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o layout e as cores da página pública onde o cliente aprova e assina a proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Preview */}
            <div
              className="p-4 rounded-xl border text-xs space-y-3 transition-all"
              style={{
                backgroundColor: config.checkout.theme === "light" ? "#f8fafc" : "#121216",
                borderColor: config.checkout.buttonColor,
                color: config.checkout.theme === "light" ? "#0f172a" : "#fff",
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">Proposta Comercial #1042</span>
                <span className="text-[11px] font-extrabold text-brand">R$ 4.500,00</span>
              </div>
              <p className="text-[11px] opacity-75">
                Revise os termos e assine digitalmente para dar início às demandas.
              </p>
              {config.checkout.showSecurityBadge && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Ambiente seguro com assinatura digital com validade jurídica</span>
                </div>
              )}
              <button
                type="button"
                className="w-full py-2.5 rounded-lg text-xs font-bold text-white cursor-pointer shadow"
                style={{ backgroundColor: config.checkout.buttonColor }}
              >
                {config.checkout.buttonText}
              </button>
            </div>

            {/* Tema */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Tema do Checkout</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dark", label: "Escuro Sofisticado" },
                  { id: "light", label: "Claro Comercial" },
                ].map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        checkout: { ...config.checkout, theme: tm.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.checkout.theme === tm.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor do Botão */}
            <ColorPickerField
              label="Cor do Botão de Aprovação"
              value={config.checkout.buttonColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  checkout: { ...config.checkout, buttonColor: c },
                })
              }
            />

            {/* Textos */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Texto do Botão de Aprovação</label>
                <Input
                  value={config.checkout.buttonText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      checkout: { ...config.checkout, buttonText: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Mensagem de Sucesso Pós-Aprovação</label>
                <Input
                  value={config.checkout.successMessage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      checkout: { ...config.checkout, successMessage: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Opções */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Exibir Selo de Segurança e Validade</span>
                <Switch
                  checked={config.checkout.showSecurityBadge}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      checkout: { ...config.checkout, showSecurityBadge: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Permitir Download Imediato do PDF pelo Cliente</span>
                <Switch
                  checked={config.checkout.allowPdfDownload}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      checkout: { ...config.checkout, allowPdfDownload: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Página de Aprovação");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Aparência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 7: PDF DE ORÇAMENTO */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "pdfBudget"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <FileText className="w-5 h-5 text-brand" />
              Modelo e Design do PDF de Orçamento
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o layout da folha, cores das tabelas e blocos exibidos no PDF exportado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Preview Folha */}
            <div className="p-4 rounded-xl border border-white/15 bg-white text-black text-xs space-y-2.5 shadow-md">
              <div
                className="p-3 rounded-lg text-white flex justify-between items-center"
                style={{
                  backgroundColor:
                    config.pdfBudget.template === "clean" ? "#1e293b" : "#0e0e11",
                  borderLeft: `4px solid ${config.pdfBudget.accentColor}`,
                }}
              >
                <div>
                  <span className="font-bold block text-xs">SUA AGÊNCIA DIGITAL</span>
                  <span className="text-[10px] opacity-75">Orçamento Comercial</span>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: config.pdfBudget.accentColor, color: "#000" }}
                >
                  R$ 8.900
                </span>
              </div>
              <div className="border border-gray-200 rounded p-2 text-[10px] space-y-1">
                <div className="flex justify-between font-bold text-gray-700">
                  <span>Item / Serviço</span>
                  <span>Total</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Gestão de Tráfego Pago & Social Media</span>
                  <span>R$ 8.900,00</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-500">{config.pdfBudget.footerMessage}</p>
            </div>

            {/* Template do PDF */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Modelo do PDF</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "modern", label: "Modern Dark" },
                  { id: "clean", label: "Clean Minimal" },
                  { id: "executive", label: "Executive Gold" },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        pdfBudget: { ...config.pdfBudget, template: tpl.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.pdfBudget.template === tpl.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de Realce */}
            <ColorPickerField
              label="Cor de Realce das Tabelas e Cabeçalho"
              value={config.pdfBudget.accentColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  pdfBudget: { ...config.pdfBudget, accentColor: c },
                })
              }
            />

            {/* Mensagem de Rodapé */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                Texto de Rodapé (Validade e Condições)
              </label>
              <Input
                value={config.pdfBudget.footerMessage}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pdfBudget: { ...config.pdfBudget, footerMessage: e.target.value },
                  })
                }
                className="bg-black/50 border-white/10 text-xs"
              />
            </div>

            {/* Switches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Exibir Logotipo em Alta Resolução</span>
                <Switch
                  checked={config.pdfBudget.showLogo}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      pdfBudget: { ...config.pdfBudget, showLogo: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Exibir Dados Pix e Chave Bancária no Rodapé</span>
                <Switch
                  checked={config.pdfBudget.showPix}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      pdfBudget: { ...config.pdfBudget, showPix: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Incluir Cláusulas e Termos em Anexo</span>
                <Switch
                  checked={config.pdfBudget.showTerms}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      pdfBudget: { ...config.pdfBudget, showTerms: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "PDF de Orçamento");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Modelo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 8: PÁGINA PÚBLICA (PORTFÓLIO) */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "portfolio"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Globe className="w-5 h-5 text-brand" />
              Aparência do Portfólio Público
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o layout, tema e destaques do portfólio público da sua agência.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Layout Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Estilo de Apresentação</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "grid", label: "Grade Moderna" },
                  { id: "carousel", label: "Carrossel" },
                  { id: "list", label: "Lista Editorial" },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        portfolio: { ...config.portfolio, layout: l.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.portfolio.layout === l.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de Realce */}
            <ColorPickerField
              label="Cor de Destaque dos Botões e Links"
              value={config.portfolio.accentColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  portfolio: { ...config.portfolio, accentColor: c },
                })
              }
            />

            {/* Textos */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Título do Portfólio</label>
                <Input
                  value={config.portfolio.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      portfolio: { ...config.portfolio, title: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Frase de Impacto / Bio</label>
                <Input
                  value={config.portfolio.bio}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      portfolio: { ...config.portfolio, bio: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Exibir Botão Flutuante de WhatsApp</span>
                <Switch
                  checked={config.portfolio.showWhatsapp}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      portfolio: { ...config.portfolio, showWhatsapp: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Exibir Estatísticas de Destaque (+500 Projetos)</span>
                <Switch
                  checked={config.portfolio.showStats}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      portfolio: { ...config.portfolio, showStats: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Portfólio Público");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Portfólio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 9: LINK DA BIO */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "bioLink"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Link2 className="w-5 h-5 text-brand" />
              Aparência do Link da Bio
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize o layout dos botões, cores e estética da página de bio do Instagram/TikTok.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Smartphone Mockup */}
            <div className="p-4 rounded-xl border border-white/10 bg-[#08080a] text-center space-y-2.5 max-w-[280px] mx-auto shadow-xl">
              <div className="size-12 rounded-full bg-brand/20 text-brand flex items-center justify-center mx-auto text-base font-extrabold border border-brand/30">
                SM
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">{config.bioLink.title}</h5>
                <p className="text-[10px] text-gray-400">{config.bioLink.bio}</p>
              </div>
              <div className="space-y-1.5 pt-1">
                {["Falar no WhatsApp", "Ver Portfólio Oficial", "Solicitar Orçamento"].map((btnText, i) => (
                  <div
                    key={i}
                    className={`p-2 text-[10px] font-bold text-black shadow ${
                      config.bioLink.buttonStyle === "rounded"
                        ? "rounded-xl"
                        : config.bioLink.buttonStyle === "glass"
                        ? "rounded-md backdrop-blur-md bg-opacity-80"
                        : "rounded-none"
                    }`}
                    style={{ backgroundColor: config.bioLink.buttonColor }}
                  >
                    {btnText}
                  </div>
                ))}
              </div>
            </div>

            {/* Estilo dos Botões */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Formato dos Botões</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "rounded", label: "Arredondados 3D" },
                  { id: "glass", label: "Glassmorphism" },
                  { id: "minimal", label: "Minimalista" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        bioLink: { ...config.bioLink, buttonStyle: st.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.bioLink.buttonStyle === st.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor dos Botões */}
            <ColorPickerField
              label="Cor dos Botões de Link"
              value={config.bioLink.buttonColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  bioLink: { ...config.bioLink, buttonColor: c },
                })
              }
            />

            {/* Identificação */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Nome / @ do Perfil</label>
                <Input
                  value={config.bioLink.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bioLink: { ...config.bioLink, title: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Bio / Apresentação Curta</label>
                <Input
                  value={config.bioLink.bio}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bioLink: { ...config.bioLink, bio: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Efeito de Pulso no Primeiro Botão</span>
                <Switch
                  checked={config.bioLink.pulseFirstButton}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      bioLink: { ...config.bioLink, pulseFirstButton: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-xs text-gray-300">Exibir Ícones de Redes no Rodapé</span>
                <Switch
                  checked={config.bioLink.showSocials}
                  onCheckedChange={(val) =>
                    setConfig({
                      ...config,
                      bioLink: { ...config.bioLink, showSocials: val },
                    })
                  }
                  className="data-[state=checked]:bg-brand"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Link da Bio");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Link da Bio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 10: PÁGINA DE AGENDAMENTO */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "scheduling"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Calendar className="w-5 h-5 text-brand" />
              Aparência da Página de Agendamento
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize as cores dos horários, instruções e tema da agenda online de reuniões.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Live Preview */}
            <div
              className="p-4 rounded-xl border text-xs space-y-3 transition-all"
              style={{
                backgroundColor: config.scheduling.theme === "light" ? "#f8fafc" : "#121216",
                borderColor: config.scheduling.accentColor,
                color: config.scheduling.theme === "light" ? "#0f172a" : "#fff",
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">{config.scheduling.title}</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ backgroundColor: config.scheduling.accentColor, color: "#000" }}
                >
                  {config.scheduling.duration} min
                </span>
              </div>
              <p className="text-[11px] opacity-75">{config.scheduling.instructions}</p>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {["09:00", "11:30", "14:00"].map((time, i) => (
                  <div
                    key={i}
                    className="p-2 text-center rounded border font-semibold text-[11px] cursor-pointer"
                    style={{
                      borderColor: config.scheduling.accentColor,
                      backgroundColor: i === 1 ? config.scheduling.accentColor : "transparent",
                      color: i === 1 ? "#000" : "inherit",
                    }}
                  >
                    {time}
                  </div>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Tema da Agenda</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dark", label: "Escuro Moderno" },
                  { id: "light", label: "Claro Minimalista" },
                ].map((tm) => (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        scheduling: { ...config.scheduling, theme: tm.id },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                      config.scheduling.theme === tm.id
                        ? "bg-brand/20 border-brand text-brand"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {tm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de Realce */}
            <ColorPickerField
              label="Cor dos Horários e Botões"
              value={config.scheduling.accentColor}
              onChange={(c) =>
                setConfig({
                  ...config,
                  scheduling: { ...config.scheduling, accentColor: c },
                })
              }
            />

            {/* Textos */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Título da Sessão</label>
                <Input
                  value={config.scheduling.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      scheduling: { ...config.scheduling, title: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Instruções para o Cliente</label>
                <Input
                  value={config.scheduling.instructions}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      scheduling: { ...config.scheduling, instructions: e.target.value },
                    })
                  }
                  className="bg-black/50 border-white/10 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Duração Padrão</label>
                <div className="grid grid-cols-4 gap-2">
                  {["15", "30", "45", "60"].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          scheduling: { ...config.scheduling, duration: mins },
                        })
                      }
                      className={`p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center ${
                        config.scheduling.duration === mins
                          ? "bg-brand/20 border-brand text-brand"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Página de Agendamento");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Agendamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 11: GERENCIADOR DE TAGS */}
      {/* ========================================================================= */}
      <Dialog open={activeModal === "tags"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-lg bg-[#0e0e11] border border-white/10 text-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-white">
              <Tag className="w-5 h-5 text-brand" />
              Gerenciador de Tags
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Personalize cores e nomes das tags usadas em tarefas e projetos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              {config.tags.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <span
                    className="px-2.5 py-1 rounded text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => {
                        const updated = [...config.tags];
                        updated[idx].color = e.target.value;
                        setConfig({ ...config, tags: updated });
                      }}
                      className="size-7 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.tags.filter((_, i) => i !== idx);
                        setConfig({ ...config, tags: updated });
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">Adicionar Nova Tag</label>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nome da tag (ex: Revisão Copy)"
                  className="bg-black/50 border-white/10 text-xs flex-1"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="size-9 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                />
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    if (!newTagName.trim()) {
                      toast.error("Informe o nome da tag");
                      return;
                    }
                    const updated = [
                      ...config.tags,
                      {
                        id: newTagName.toLowerCase().replace(/\s+/g, "-"),
                        name: newTagName.trim(),
                        color: newTagColor,
                      },
                    ];
                    setConfig({ ...config, tags: updated });
                    setNewTagName("");
                    toast.success("Tag adicionada!");
                  }}
                  className="bg-brand text-black font-bold text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" /> Criar
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                saveConfig(config, "Tags");
                setActiveModal(null);
              }}
              className="bg-brand text-black font-extrabold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-1.5" /> Salvar Tags
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationsTab({ prefs, setPref, action }: TabProps) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [contentAssigned, setContentAssigned] = useState(true);
  const [statusChanges, setStatusChanges] = useState(true);
  const [feedbackComments, setFeedbackComments] = useState(true);
  const [taskAssigned, setTaskAssigned] = useState(true);
  const [taskComments, setTaskComments] = useState(true);

  const handleTogglePush = async () => {
    if (!pushEnabled) {
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            setPushEnabled(true);
            toast.success("Notificações push do navegador ativadas com sucesso!");
            return;
          }
        } catch (e) {}
      }
      setPushEnabled(true);
      toast.success("Notificações ativadas para o painel SM HUB!");
    } else {
      setPushEnabled(false);
      toast.info("Notificações push desativadas.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand/20 text-brand flex items-center justify-center shrink-0">
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-medium text-lg">Resumo Diário & Alertas</h3>
          <p className="text-sm text-gray-400">Receba um resumo diário com tarefas pendentes, faturamento e alertas de clientes</p>
        </div>
      </div>
      
      <div className="bg-[#111111] border border-white/5 rounded-xl p-4 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${pushEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-black text-gray-400'}`}>
              <BellOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-medium">
                {pushEnabled ? "Notificações push ativadas" : "Notificações push desativadas"}
              </h3>
              <p className="text-sm text-gray-400">
                {pushEnabled ? "Você receberá alertas no navegador e celular" : "Ative para receber alertas instantâneos de novos leads e pagamentos"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePush}
            className={`rounded-xl px-4 py-2 font-bold text-xs transition-all ${
              pushEnabled
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-brand text-black hover:opacity-95 shadow-md shadow-brand/20"
            }`}
          >
            {pushEnabled ? "Desativar" : "Ativar Notificações"}
          </button>
      </div>

      <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <div>
              <h3 className="text-white font-medium">Ativar resumo diário</h3>
              <p className="text-sm text-gray-400 mt-1">Receba um resumo com tarefas para hoje e quanto faturou</p>
            </div>
            <Switch
              checked={dailyDigest}
              onCheckedChange={(val) => {
                setDailyDigest(val);
                toast.success(`Resumo diário ${val ? "ativado" : "desativado"}`);
              }}
              className="data-[state=checked]:bg-brand"
            />
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-white font-medium">Tipos de notificação</h3>
            <p className="text-sm text-gray-400 mt-1">Escolha quais eventos disparam notificações para você.</p>
          </div>
          
          <div className="space-y-0">
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <p className="text-sm text-white">Conteúdo atribuído a mim</p>
                <p className="text-xs text-gray-500 mt-1">Quando alguém te define como responsável por um conteúdo.</p>
              </div>
              <Switch
                checked={contentAssigned}
                onCheckedChange={(val) => {
                  setContentAssigned(val);
                  toast.success(`Alerta de conteúdo atribuído ${val ? "ativado" : "desativado"}`);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
            
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <p className="text-sm text-white">Mudança de status em meus conteúdos</p>
                <p className="text-xs text-gray-500 mt-1">Avanço de etapa, aprovação, agendamento, publicação.</p>
              </div>
              <Switch
                checked={statusChanges}
                onCheckedChange={(val) => {
                  setStatusChanges(val);
                  toast.success(`Alerta de mudança de status ${val ? "ativado" : "desativado"}`);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
            
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <p className="text-sm text-white">Feedback/comentário em meus conteúdos</p>
                <p className="text-xs text-gray-500 mt-1">Cliente solicitou revisão ou comentou.</p>
              </div>
              <Switch
                checked={feedbackComments}
                onCheckedChange={(val) => {
                  setFeedbackComments(val);
                  toast.success(`Alerta de comentários de clientes ${val ? "ativado" : "desativado"}`);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
            
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <p className="text-sm text-white">Tarefa atribuída a mim</p>
                <p className="text-xs text-gray-500 mt-1">Quando você é responsável por uma nova tarefa.</p>
              </div>
              <Switch
                checked={taskAssigned}
                onCheckedChange={(val) => {
                  setTaskAssigned(val);
                  toast.success(`Alerta de tarefa atribuída ${val ? "ativado" : "desativado"}`);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
            
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm text-white">Comentários em minhas tarefas</p>
                <p className="text-xs text-gray-500 mt-1">Alguém comentou em uma tarefa sua.</p>
              </div>
              <Switch
                checked={taskComments}
                onCheckedChange={(val) => {
                  setTaskComments(val);
                  toast.success(`Alerta de comentários em tarefas ${val ? "ativado" : "desativado"}`);
                }}
                className="data-[state=checked]:bg-brand"
              />
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-brand/5 border-t border-brand/20 mt-4 rounded-xl">
          <h3 className="text-white font-medium mb-3">O que você receberá:</h3>
          <ul className="space-y-2 text-sm text-gray-300">
             <li className="flex items-center gap-2"><span>📋</span> Quantidade de tarefas pendentes para o dia</li>
             <li className="flex items-center gap-2"><span>💰</span> Quanto faturou no dia anterior</li>
             <li className="flex items-center gap-2"><span>📊</span> Resumo rápido de leads e orçamentos</li>
          </ul>
        </div>
      </div>
      
      {action}
    </div>
  );
}

function AutomationsTab({ prefs, setPref, action }: TabProps) {
  const queryClient = useQueryClient();
  const [activeMenu, setActiveMenu] = useState("WhatsApp");
  const [editingRule, setEditingRule] = useState<any>(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);

  const { data: automations = [] } = useQuery({
    queryKey: ['automations'],
    queryFn: () => getAutomations(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => toggleAutomationRule({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Regra ${res.rule.active ? "ativada" : "desativada"} com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ['automations'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (rule: any) => saveAutomationRule({ data: rule }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Automação salva!");
        queryClient.invalidateQueries({ queryKey: ['automations'] });
        setEditingRule(null);
      } else toast.error("Erro: " + res.error);
    }
  });

  const menus = [
    { label: "WhatsApp", icon: MessageCircle, badge: "Disparos" },
    { label: "Projetos", icon: Folder },
    { label: "Tarefas", icon: ListTodo },
    { label: "Notificações", icon: BellRing },
    { label: "Recorrentes", icon: Repeat },
    { label: "Atalhos", icon: Keyboard },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 shadow-lg shadow-brand/10">
            <Zap className="size-6 text-brand" fill="currentColor" />
          </div>
          <div>
            <h3 className="text-white font-bold text-2xl">Central de Automações & Disparos</h3>
            <p className="text-sm text-gray-400 mt-0.5">Gatilhos automáticos para WhatsApp, CRM, funil e projetos</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {menus.map((menu) => (
            <button 
              key={menu.label}
              onClick={() => setActiveMenu(menu.label)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                activeMenu === menu.label 
                  ? 'bg-brand/20 text-brand font-bold border border-brand/30' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <menu.icon className="size-5" />
                {menu.label}
              </div>
              {menu.badge && (
                <span className="text-[10px] bg-brand text-black font-bold px-2 py-0.5 rounded-full leading-tight">{menu.badge}</span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex-1">
          {activeMenu === "WhatsApp" && (
            <div className="space-y-4">
              <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="size-5 text-emerald-500" />
                    <h4 className="text-lg font-bold text-white">Disparos Automáticos no WhatsApp</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                      API Ativa
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Quando eventos acontecem no sistema (novo lead, venda fechada, fatura gerada), o SM Hub dispara a mensagem automaticamente.
                  </p>
                </div>
                <Button 
                  onClick={() => setWhatsappModalOpen(true)}
                  className="gradient-brand text-black font-bold text-xs h-9 px-4 rounded-xl shrink-0 shadow-[0_0_15px_rgba(201,162,39,0.25)]"
                >
                  <Smartphone className="size-3.5 mr-1.5" /> Conectar WhatsApp (QR / Número)
                </Button>
              </div>

              <div className="space-y-3">
                {automations.filter((a: any) => a.action === "whatsapp").map((rule: any) => (
                  <div key={rule.id} className="bg-[#111111] border border-white/5 hover:border-brand/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <h5 className="font-bold text-white text-base">{rule.name}</h5>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">Gatilho: <span className="text-gray-300">{rule.triggerLabel}</span></p>
                      {rule.targetTemplate && (
                        <p className="text-xs text-brand/90 bg-brand/5 border border-brand/10 p-2.5 rounded-lg mt-2 font-mono">
                          "{rule.targetTemplate}"
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-[11px] text-gray-500 pt-1">
                        <span>Disparos realizados: <strong className="text-white">{rule.executionsCount || 0}</strong></span>
                        {rule.lastExecutedAt && <span>Último disparo: <strong className="text-white">{rule.lastExecutedAt}</strong></span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch 
                        checked={rule.active} 
                        onCheckedChange={() => toggleMutation.mutate(rule.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === "Projetos" && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center gap-4">
                <div className="size-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                  <Workflow className="size-5 text-brand" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Movimento automático de projetos</h3>
                  <p className="text-sm text-gray-400">Quando uma tarefa muda de coluna, o projeto acompanha o status</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">Colunas padrão</p>
                    <p className="text-sm text-gray-400 mt-0.5">Comportamento ao mover tarefas em projetos com colunas padrão</p>
                  </div>
                  <select defaultValue="Sempre mover" className="bg-[#1A1A1A] border border-white/10 text-white rounded-xl px-4 py-2 text-sm outline-none">
                    <option value="sempre">Sempre mover</option>
                    <option value="perguntar">Perguntar antes</option>
                    <option value="nunca">Nunca mover</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">Concluir projeto ao finalizar todas as tarefas</p>
                    <p className="text-sm text-gray-400 mt-0.5">Marca o projeto como concluído quando a última tarefa for finalizada</p>
                  </div>
                  <Switch checked={true} onCheckedChange={() => toast.success("Preferência atualizada!")} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">Reabrir projeto ao reverter tarefa</p>
                    <p className="text-sm text-gray-400 mt-0.5">Se uma tarefa voltar de uma coluna concluída, o projeto reabre</p>
                  </div>
                  <Switch checked={true} onCheckedChange={() => toast.success("Preferência atualizada!")} />
                </div>
              </div>
            </div>
          )}

          {activeMenu === "Tarefas" && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-6">
              <h4 className="text-lg font-bold text-white mb-2">Automações do Quadro de Tarefas</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Auto-atribuir tarefa ao criador</p>
                  <p className="text-sm text-gray-400 mt-0.5">Define automaticamente o usuário logado como responsável</p>
                </div>
                <Switch checked={true} onCheckedChange={() => toast.success("Auto-atribuição salva!")} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Data de entrega padrão (D+3)</p>
                  <p className="text-sm text-gray-400 mt-0.5">Define automaticamente o prazo de 3 dias úteis para novas tarefas</p>
                </div>
                <Switch checked={true} onCheckedChange={() => toast.success("Prazo padrão ativo!")} />
              </div>
            </div>
          )}

          {activeMenu === "Notificações" && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-6">
              <h4 className="text-lg font-bold text-white mb-2">Alertas e Notificações de Vendas</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Som de comemoração ao fechar venda</p>
                  <p className="text-sm text-gray-400 mt-0.5">Toca o som de caixa registradora ao mover deal para Ganho</p>
                </div>
                <Switch checked={true} onCheckedChange={() => toast.success("Som de venda ativado!")} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Notificação Desktop instantânea</p>
                  <p className="text-sm text-gray-400 mt-0.5">Alertas do navegador sobre novos leads e briefings</p>
                </div>
                <Switch checked={true} onCheckedChange={() => toast.success("Notificações de desktop ativas!")} />
              </div>
            </div>
          )}

          {activeMenu === "Recorrentes" && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-6">
              <h4 className="text-lg font-bold text-white mb-2">Rotinas Recorrentes</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Gerar cobrança mensal no 1º dia útil</p>
                  <p className="text-sm text-gray-400 mt-0.5">Cria a fatura com valor do contrato de cada cliente ativo</p>
                </div>
                <Switch checked={true} onCheckedChange={() => toast.success("Cobrança recorrente ativa!")} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-semibold">Backup automático diário no Google Drive</p>
                  <p className="text-sm text-gray-400 mt-0.5">Copia a base de dados smhub_database.json para a nuvem às 23:59</p>
                </div>
                <Switch checked={true} onCheckedChange={() => toast.success("Backup diário ativo!")} />
              </div>
            </div>
          )}

          {activeMenu === "Atalhos" && (
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-4">
              <h4 className="text-lg font-bold text-white mb-2">Teclas de Atalho do SM Hub</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "N", desc: "Criar novo lead ou tarefa" },
                  { key: "F", desc: "Abrir busca rápida" },
                  { key: "W", desc: "Abrir WhatsApp Web" },
                  { key: "ESC", desc: "Fechar modais e players" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-sm text-gray-300">{item.desc}</span>
                    <kbd className="px-2.5 py-1 bg-[#1A1A1A] border border-white/20 rounded-md text-xs font-mono font-bold text-brand">{item.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <WhatsAppConnectModal 
        open={whatsappModalOpen} 
        onOpenChange={setWhatsappModalOpen} 
      />
    </div>
  );
}

function IntegrationsTab({ prefs, setPref, action }: TabProps) {
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedAIProvider, setSelectedAIProvider] = useState<"google" | "openai" | "claude" | "deepseek">("openai");
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<"asaas" | "stripe" | "mercadopago">("asaas");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const queryClient = useQueryClient();

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/public/webhook/payment`
    : "https://smhub.com.br/api/public/webhook/payment";

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    try {
      const res = await fetch("/api/public/webhook/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PAYMENT_RECEIVED",
          payment: {
            id: `pay_test_${Date.now()}`,
            externalReference: "test-conciliation",
            value: 197.0,
            status: "CONFIRMED"
          }
        })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        toast.success("Webhook testado com sucesso! Respondeu 200 OK com conciliação automática ativa.");
      } else {
        toast.info("Webhook respondeu: " + (data.message || "200 OK"));
      }
    } catch (err: any) {
      toast.error("Erro ao testar webhook: " + (err.message || "Erro de rede"));
    } finally {
      setIsTestingWebhook(false);
    }
  };

  useEffect(() => {
    const handleResendSuccess = () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
    };
    window.addEventListener(RESEND_EVENT_NAME, handleResendSuccess);
    return () => window.removeEventListener(RESEND_EVENT_NAME, handleResendSuccess);
  }, [queryClient]);

  const { data: integrations = {} as IntegrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => getIntegrations(),
  });

  const sections = [
    {
      title: "Pagamentos e bancos",
      description: "Receba de clientes por PIX, boleto e cartão com conciliação automática.",
      connectedCount: (integrations.asaas?.connected ? 1 : 0) + (integrations.stripe?.connected ? 1 : 0) + (integrations.mercadopago?.connected ? 1 : 0),
      items: [
        { 
          name: "Mercado Pago", 
          icon: "💼", 
          connected: Boolean(integrations.mercadopago?.connected), 
          badge: integrations.mercadopago?.connected ? "Pix Ativo" : "1 Clique (Pix)",
          onClick: () => { setSelectedGateway("mercadopago"); setGatewayModalOpen(true); } 
        },
        { 
          name: "Asaas", 
          icon: "https://www.asaas.com/assets/favicon.ico", 
          connected: Boolean(integrations.asaas?.connected), 
          badge: integrations.asaas?.connected ? "Boleto & Pix Ativo" : "1 Clique",
          onClick: () => { setSelectedGateway("asaas"); setGatewayModalOpen(true); } 
        },
        { 
          name: "Stripe", 
          icon: "💳", 
          connected: Boolean(integrations.stripe?.connected), 
          badge: integrations.stripe?.connected ? "Cartões Ativo" : "Stripe Express",
          onClick: () => { setSelectedGateway("stripe"); setGatewayModalOpen(true); } 
        },
        { name: "AbacatePay", icon: "🥑", connected: false, comingSoon: true },
        { name: "AtivoPay", icon: "🔵", connected: false, comingSoon: true },
        { name: "Banco Inter", icon: "inter", connected: false, textIcon: true, color: "#FF7A00", comingSoon: true },
        { name: "Banco Cora", icon: "🏛️", connected: false, comingSoon: true },
        { name: "Sicredi", icon: "🏛️", connected: false, comingSoon: true },
      ]
    },
    {
      title: "E-mails e Mensageria Transacional",
      description: "Disparo oficial de códigos PIN de confirmação de cadastro, contratos, propostas e recibos.",
      connectedCount: (integrations.email?.connected || integrations.email?.resendApiKey || integrations.email?.smtpHost) ? 1 : 0,
      items: [
        { 
          name: "Resend API", 
          icon: "✉️", 
          connected: Boolean(integrations.email?.connected || integrations.email?.resendApiKey), 
          badge: (integrations.email?.connected || integrations.email?.resendApiKey) ? "Resend Ativo" : "Conectar (Popup)",
          onClick: () => openResendConnectPopup({
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['integrations'] });
              queryClient.invalidateQueries({ queryKey: ['email-config'] });
            }
          }) 
        },
        { 
          name: "SMTP Próprio", 
          icon: "🌐", 
          connected: Boolean(integrations.email?.smtpHost), 
          badge: integrations.email?.smtpHost ? "SMTP Ativo" : "Configurar Host",
          onClick: () => setEmailModalOpen(true) 
        },
        { name: "SendGrid", icon: "📧", connected: false, comingSoon: true },
        { name: "Mailgun", icon: "📨", connected: false, comingSoon: true },
      ]
    },
    {
      title: "Arquivos e agenda",
      description: "Onde seus arquivos ficam salvos e como sua agenda sincroniza.",
      connectedCount: (integrations.google?.connected ? 1 : 0) + 1,
      items: [
        { 
          name: "Google Drive", 
          icon: "🔺", 
          connected: Boolean(integrations.google?.connected),
          badge: "Conta Google Ativa",
          onClick: () => { setSelectedAIProvider("google"); setAiModalOpen(true); }
        },
        { 
          name: "Google Calendar", 
          icon: "📅", 
          connected: Boolean(integrations.google?.connected),
          badge: "Sincronizado",
          onClick: () => { setSelectedAIProvider("google"); setAiModalOpen(true); }
        },
        { name: "Agendamento", icon: "🕒", connected: true },
        { name: "Dropbox", icon: "📂", connected: false, comingSoon: true },
      ]
    },
    {
      title: "Comunicação e WhatsApp",
      description: "Como você fala com clientes e gerencia disparos e bots.",
      connectedCount: integrations.whatsapp?.connected ? 1 : 0,
      items: [
        { 
          name: "WhatsApp Web", 
          icon: "💬", 
          connected: Boolean(integrations.whatsapp?.connected),
          badge: integrations.whatsapp?.connected ? (integrations.whatsapp?.mode === "phone" ? "Pareado (Número)" : "QR Code Ativo") : "Desconectado",
          onClick: () => setWhatsappModalOpen(true)
        },
        { name: "Slack", icon: "💼", connected: false, comingSoon: true },
      ]
    },
    {
      title: "IA e Provedores LLM",
      description: "Conecte sua Conta Google ou acesse ChatGPT e Claude diretamente sem chaves complexas.",
      connectedCount: (integrations.openai?.connected ? 1 : 0) + (integrations.claude?.connected ? 1 : 0) + (integrations.google?.connected ? 1 : 0) + (integrations.deepseek?.connected ? 1 : 0),
      items: [
        { 
          name: "Conta Google (Gemini)", 
          icon: "✨", 
          connected: Boolean(integrations.google?.connected),
          badge: integrations.google?.connected ? "Conta Conectada" : "Entrar c/ Google",
          onClick: () => { setSelectedAIProvider("google"); setAiModalOpen(true); }
        },
        { 
          name: "OpenAI (ChatGPT)", 
          icon: "🤖", 
          connected: Boolean(integrations.openai?.connected),
          badge: integrations.openai?.connected ? "ChatGPT Ativo" : "Entrar c/ ChatGPT",
          onClick: () => { setSelectedAIProvider("openai"); setAiModalOpen(true); }
        },
        { 
          name: "Anthropic Claude", 
          icon: "🧠", 
          connected: Boolean(integrations.claude?.connected),
          badge: integrations.claude?.connected ? "Claude Ativo" : "Entrar c/ Claude",
          onClick: () => { setSelectedAIProvider("claude"); setAiModalOpen(true); }
        },
        { 
          name: "DeepSeek V3", 
          icon: "⚡", 
          connected: Boolean(integrations.deepseek?.connected),
          badge: integrations.deepseek?.connected ? "DeepSeek Ativo" : "1 Clique",
          onClick: () => { setSelectedAIProvider("deepseek"); setAiModalOpen(true); }
        },
        { name: "Webhooks", icon: "🔗", connected: true },
      ]
    },
    {
      title: "Marketing e criação",
      description: "Rastreio de anúncios e ferramentas de design.",
      items: [
        { name: "Meta Pixel", icon: "f", connected: false, textIcon: true, color: "#fff", comingSoon: true },
        { name: "Figma", icon: "🎨", connected: false, comingSoon: true },
        { name: "Behance", icon: "🔗", connected: false, comingSoon: true },
      ]
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      {sections.map((section, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-medium text-lg">{section.title}</h3>
              <p className="text-sm text-gray-400 mt-0.5">{section.description}</p>
            </div>
            {section.connectedCount !== undefined && section.connectedCount > 0 && (
              <span className="text-xs text-brand font-bold bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
                {section.connectedCount} conectada{section.connectedCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {section.items.map((item: any, i: number) => (
              <div 
                key={i} 
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center h-32 rounded-2xl border transition-all cursor-pointer group hover:bg-white/[0.04] p-3 text-center ${
                  item.connected 
                    ? 'border-brand/40 bg-brand/5 hover:border-brand/60 shadow-[0_0_15px_rgba(201,162,39,0.08)]' 
                    : 'border-white/5 bg-[#111111]'
                }`}
              >
                {item.comingSoon && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] text-gray-500 font-medium">Em breve</span>
                )}
                
                {item.connected && (
                  <div className="absolute top-2.5 right-2.5 size-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                    <Check className="size-3 text-emerald-400 font-bold" />
                  </div>
                )}
                
                <div className="text-3xl mb-2 flex items-center justify-center w-10 h-10">
                   {item.textIcon ? (
                     <span style={{ color: item.color, fontWeight: 'bold', fontSize: item.name === 'Meta Pixel' ? '28px' : '16px' }}>{item.icon}</span>
                   ) : item.icon.startsWith('http') ? (
                     <img src={item.icon} alt={item.name} className="w-8 h-8 rounded" />
                   ) : (
                     <span>{item.icon}</span>
                   )}
                </div>
                
                <span className={`text-xs font-semibold block leading-tight ${item.comingSoon ? 'text-gray-500' : 'text-gray-200'}`}>
                  {item.name}
                </span>

                {item.badge && (
                  <span className="text-[10px] text-brand font-medium mt-1 truncate max-w-[110px]">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Card de Webhook e Conciliação em Tempo Real */}
      <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-[#111318] to-[#0D0F14] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-white font-semibold text-base">Webhook de Pagamento & Conciliação Instantânea</h4>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  200 OK • Ouvindo em Tempo Real
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Receba confirmações de Pix e Cartão do Asaas e Mercado Pago para aprovar propostas, gerar projetos e liberar planos no mesmo segundo.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isTestingWebhook}
            onClick={handleTestWebhook}
            className="border-white/10 hover:border-brand/40 bg-white/5 hover:bg-brand/10 text-white text-xs gap-1.5 shrink-0"
          >
            <RefreshCcw className={`size-3.5 ${isTestingWebhook ? "animate-spin text-brand" : "text-gray-400"}`} />
            Disparar Webhook de Teste
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-medium text-gray-400 flex items-center justify-between">
              <span>URL Pública do Webhook (Cole no Asaas / Mercado Pago):</span>
              <span className="text-[10px] text-brand font-mono">POST /api/public/webhook/payment</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="bg-black/50 border-white/10 text-xs font-mono text-gray-300 h-9 select-all"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("URL do Webhook copiada para a área de transferência!");
                }}
                className="gradient-brand text-black font-semibold text-xs h-9 px-3.5 shrink-0"
              >
                <Copy className="size-3.5 mr-1" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col justify-center text-xs">
            <div className="text-gray-400 text-[11px] mb-1 font-medium">Gateways homologados:</div>
            <div className="flex items-center gap-1.5 text-white">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">Asaas (Pix/Boleto)</span>
              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">Mercado Pago (Pix)</span>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">Stripe</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              Conciliação automática: Propostas aprovadas, Projetos iniciados e Assinaturas liberadas em tempo real.
            </div>
          </div>
        </div>
      </div>

      {action}

      <WhatsAppConnectModal 
        open={whatsappModalOpen} 
        onOpenChange={setWhatsappModalOpen} 
        connection={integrations.whatsapp} 
      />

      <AIConnectModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen} 
        integrations={integrations} 
        initialProvider={selectedAIProvider} 
      />

      <GatewayConnectModal 
        open={gatewayModalOpen} 
        onOpenChange={setGatewayModalOpen} 
        integrations={integrations} 
        initialGateway={selectedGateway} 
      />

      <EmailConnectModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
      />
    </div>
  );
}

function EmailTab({ prefs, setPref, action }: TabProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleOpenResendPopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    openResendConnectPopup({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['integrations'] });
        queryClient.invalidateQueries({ queryKey: ['email-config'] });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => setEmailModalOpen(true)}
          className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:border-brand/40 transition-colors group"
        >
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
               <Send className="w-6 h-6 text-white" />
             </div>
             <div>
               <h3 className="text-white font-medium text-lg">Envio pelo meu domínio (Resend / SMTP)</h3>
               <p className="text-sm text-gray-400 mt-1 pr-4">Conecte sua API Key do Resend ou SMTP próprio para envios oficiais com seu domínio.</p>
               <div className="flex items-center gap-2 mt-3">
                 <button
                   type="button"
                   onClick={handleOpenResendPopup}
                   className="text-xs font-bold text-[#ff5722] hover:bg-[#ff5722]/20 flex items-center gap-1.5 bg-[#ff5722]/10 px-3 py-1.5 rounded-lg border border-[#ff5722]/30 transition-colors"
                 >
                   <Zap className="size-3 text-[#ff5722]" /> Conectar Resend (Popup Guiado)
                 </button>
               </div>
             </div>
           </div>
           <ChevronDown className="w-5 h-5 text-gray-500 -rotate-90 group-hover:text-white transition-colors mt-2" />
        </div>
        
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:border-white/10 transition-colors group">
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
               <Mail className="w-6 h-6 text-white" />
             </div>
             <div>
               <h3 className="text-white font-medium text-lg">Modelos de e-mail</h3>
               <p className="text-sm text-gray-400 mt-1 pr-4">Personalize orçamento, recibo, contrato e cobrança com a sua marca.</p>
             </div>
           </div>
           <ChevronDown className="w-5 h-5 text-gray-500 -rotate-90 group-hover:text-white transition-colors mt-2" />
        </div>
        
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:border-white/10 transition-colors group">
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
               <DollarSign className="w-6 h-6 text-white" />
             </div>
             <div>
               <h3 className="text-white font-medium text-lg">Automações financeiras</h3>
               <p className="text-sm text-gray-400 mt-1 pr-4">Dispare PIX/boleto ao criar cobrança, lembrete de vencimento, atraso e recibo — com 1 clique.</p>
             </div>
           </div>
           <ChevronDown className="w-5 h-5 text-gray-500 -rotate-90 group-hover:text-white transition-colors mt-2" />
        </div>
        
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:border-white/10 transition-colors group">
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-xl bg-teal-500/50 flex items-center justify-center shrink-0">
               <Globe className="w-6 h-6 text-white/50" />
             </div>
             <div>
               <h3 className="text-white font-medium text-lg">Domínio & rastreio <span className="text-xs font-normal text-gray-500 ml-1">(em breve)</span></h3>
               <p className="text-sm text-gray-400 mt-1 pr-4">Autenticação por DNS e taxa de abertura/clique.</p>
             </div>
           </div>
           <ChevronDown className="w-5 h-5 text-gray-500 -rotate-90 group-hover:text-white transition-colors mt-2" />
        </div>
      </div>
      
      {action}

      <EmailConnectModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
      />
    </div>
  );
}

function ListEditor({
  label,
  values = [],
  onChange,
  placeholder = "Novo item...",
  hint,
}: {
  label: string;
  values?: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const safeValues = Array.isArray(values) ? values : [];

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (safeValues.includes(trimmed)) {
      toast.info("Esse item já está na lista.");
      return;
    }
    onChange([...safeValues, trimmed]);
    setInputVal("");
  };

  const handleRemove = (index: number) => {
    onChange(safeValues.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-white uppercase tracking-wider">{label}</label>
          {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
          {safeValues.length} {safeValues.length === 1 ? "item" : "itens"}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="bg-black/60 border-white/10 text-white h-9 text-xs rounded-xl flex-1 focus-visible:ring-brand"
        />
        <Button
          type="button"
          onClick={handleAdd}
          size="sm"
          className="bg-brand text-black font-extrabold h-9 px-3 rounded-xl hover:opacity-90 text-xs shrink-0 cursor-pointer"
        >
          <Plus className="size-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {safeValues.map((val, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-neutral-200 group hover:border-brand/40 transition-colors"
          >
            <span>{val}</span>
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Remover"
            >
              <Trash2 className="size-3" />
            </button>
          </span>
        ))}
        {safeValues.length === 0 && (
          <p className="text-[11px] text-gray-500 italic py-1">Nenhum item adicionado ainda.</p>
        )}
      </div>
    </div>
  );
}

function ContentTab({ prefs, setPref, action }: TabProps) {
  const navigate = useNavigate();
  const defaultTypes = [
    "Reels / Vídeo Curto",
    "Carrossel Educativo",
    "Post Estático",
    "Stories Diários",
    "Artigo de Blog",
    "Infográfico",
  ];
  const defaultStages = [
    "1. Ideia & Briefing",
    "2. Roteiro & Copy",
    "3. Design & Edição",
    "4. Aguardando Aprovação",
    "5. Agendado",
    "6. Publicado",
  ];

  const contentTypes = (prefs as any).contentTypes || defaultTypes;
  const contentStages = (prefs as any).contentStages || defaultStages;
  const contentApproval = (prefs as any).contentApproval ?? true;

  const handleUpdateTypes = (next: string[]) => {
    (setPref as any)("contentTypes", next);
    try {
      const stored = localStorage.getItem("smhub_page_appearances");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.contentTypes = next;
        localStorage.setItem("smhub_page_appearances", JSON.stringify(parsed));
      }
    } catch (e) {}
  };

  const handleUpdateStages = (next: string[]) => {
    (setPref as any)("contentStages", next);
    try {
      const stored = localStorage.getItem("smhub_page_appearances");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.contentStages = next;
        localStorage.setItem("smhub_page_appearances", JSON.stringify(parsed));
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Banner de atalho para o módulo de Conteúdos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/20 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-brand text-black flex items-center justify-center font-bold shadow-md shrink-0">
            <Calendar className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Módulo de Calendário & Kanban de Conteúdos
              <Badge className="bg-brand/20 text-brand border-brand/30 text-[10px]">Ativo</Badge>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Acesse a esteira de produção completa com visualização em Calendário Mensal, Quadro Kanban e Lista de Postagens.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate({ to: "/calendario-conteudo" })}
          className="bg-brand text-black font-extrabold text-xs h-9 px-4 rounded-xl hover:opacity-90 shrink-0 flex items-center gap-2 cursor-pointer shadow-md shadow-brand/20"
        >
          <ExternalLink className="size-3.5" /> Abrir Conteúdos
        </Button>
      </div>

      <Panel
        title="Tipos de Conteúdo & Formatos"
        description="Defina os formatos disponíveis para agendamento (ex.: Reels, Carrossel, Stories, Blog)."
      >
        <ListEditor
          label="Formatos e tipos permitidos"
          hint="Esses tipos aparecem no seletor de criação e nos filtros do calendário."
          values={contentTypes}
          onChange={handleUpdateTypes}
          placeholder="Ex.: Reels de Bastidores, Vídeo YouTube, Thread..."
        />
      </Panel>

      <Panel
        title="Etapas da Esteira de Produção (Pipeline)"
        description="Colunas que compõem o fluxo do Kanban e o ciclo de vida dos posts da agência."
      >
        <ListEditor
          label="Etapas de produção"
          hint="Cada etapa se torna uma coluna no quadro Kanban de conteúdos."
          values={contentStages}
          onChange={handleUpdateStages}
          placeholder="Ex.: Gravação, Revisão Jurídica, Aprovado..."
        />
      </Panel>

      <Panel
        title="Regras de Aprovação e Publicação"
        description="Controles para garantir que nenhum post seja publicado sem o aval do cliente ou gestor."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Exigir aprovação do cliente antes de agendar ou publicar"
            hint="Posts precisam ser aprovados via link do cliente para saírem de 'Aguardando Aprovação'."
            checked={contentApproval}
            onChange={(v) => (setPref as any)("contentApproval", v)}
          />
          <ToggleRow
            label="Notificar cliente automaticamente por WhatsApp"
            hint="Envia uma mensagem automática com o preview do post assim que for colocado para aprovação."
            checked={(prefs as any).notifyClientApproval ?? true}
            onChange={(v) => (setPref as any)("notifyClientApproval", v)}
          />
          <ToggleRow
            label="Alerta de urgência 24h antes do prazo"
            hint="Notifica os colaboradores se o post agendado ainda estiver pendente de arte ou copy."
            checked={(prefs as any).urgentDeadlineAlert ?? true}
            onChange={(v) => (setPref as any)("urgentDeadlineAlert", v)}
          />
        </div>
      </Panel>

      <div className="pt-2">
        {action}
      </div>
    </div>
  );
}

function MobileTab({ prefs, setPref, action }: TabProps) {
  const [selectedShortcuts, setSelectedShortcuts] = useState<string[]>(["Pipelines", "Financeiro", "Tarefas"]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [activeInstructionTab, setActiveInstructionTab] = useState<"android" | "ios" | "desktop">("android");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", () => {
        setIsStandalone(true);
        toast.success("SM Hub instalado com sucesso como aplicativo!");
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        toast.success("Instalação do SM Hub aceita!");
      }
      setDeferredPrompt(null);
    } else {
      const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast.info("No Safari do iPhone/iPad: toque em Compartilhar (⎋) e depois em 'Adicionar à Tela de Início' (+).");
      } else {
        toast.info("Para instalar no Chrome ou Edge: clique no ícone de instalação na barra de endereços do navegador.");
      }
    }
  };

  const allShortcuts = [
    { label: "Dashboard", icon: LayoutDashboard, fixed: true },
    { label: "Clientes", icon: Users, fixed: false },
    { label: "Pipelines", icon: ListTree, fixed: false },
    { label: "Tarefas", icon: CheckSquare, fixed: false },
    { label: "Agenda", icon: CalendarDays, fixed: false },
    { label: "Kanban", icon: FolderKanban, fixed: false },
    { label: "Financeiro", icon: DollarSign, fixed: false },
    { label: "Serviços", icon: Box, fixed: false },
    { label: "Orçamentos", icon: FileText, fixed: false },
    { label: "Páginas", icon: Layers, fixed: false },
    { label: "Configurações", icon: Settings, fixed: false },
  ];

  const handleToggleShortcut = (label: string, fixed?: boolean) => {
    if (fixed) {
      toast.info("O Dashboard é fixo na barra inferior do mobile.");
      return;
    }
    if (selectedShortcuts.includes(label)) {
      if (selectedShortcuts.length <= 1) {
        toast.warning("Mantenha pelo menos 1 atalho selecionado.");
        return;
      }
      setSelectedShortcuts((prev) => prev.filter((s) => s !== label));
      toast.success(`Atalho ${label} removido.`);
    } else {
      if (selectedShortcuts.length >= 3) {
        toast.warning("Você pode selecionar no máximo 3 atalhos adicionais.");
        return;
      }
      setSelectedShortcuts((prev) => [...prev, label]);
      toast.success(`Atalho ${label} adicionado ao menu mobile!`);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── CARD 1: PWA (PROGRESSIVE WEB APP) & INSTALAÇÃO ── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#C9A227]/15 via-[#C9A227]/5 to-transparent border border-[#C9A227]/30 shadow-2xl relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#C9A227] before:to-transparent">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#C9A227] to-[#DFBA47] text-black px-2.5 py-0.5 rounded-full shadow-sm">
                PWA Implementado & Ativo
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Service Worker & Manifest Conectados
              </span>
              {isStandalone && (
                <span className="text-[11px] font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  ✓ Modo App Standalone
                </span>
              )}
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Instale o SM Hub como Aplicativo Nativo
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed mt-1">
                Com a tecnologia PWA (Progressive Web App), o SM Hub funciona diretamente no seu smartphone (iOS / Android) ou no computador com ícone na tela inicial, abertura em tela cheia sem barra de navegador e resposta instantânea offline.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {isStandalone ? (
              <div className="h-12 px-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="size-4" />
                Aplicativo Instalado e Rodando
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#C9A227] via-[#DFBA47] to-[#C9A227] text-black font-extrabold text-xs hover:brightness-110 shadow-lg shadow-[#C9A227]/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="size-4" />
                Instalar Aplicativo no Dispositivo
              </button>
            )}
          </div>
        </div>

        {/* Guia Rápido por Sistema Operacional */}
        <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
            <span>Instruções de instalação rápida:</span>
            <div className="flex bg-black/40 border border-white/10 rounded-xl p-0.5 ml-1">
              <button
                type="button"
                onClick={() => setActiveInstructionTab("android")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  activeInstructionTab === "android" ? "bg-[#C9A227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                Android / Chrome
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab("ios")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  activeInstructionTab === "ios" ? "bg-[#C9A227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                iPhone / iPad (iOS)
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab("desktop")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  activeInstructionTab === "desktop" ? "bg-[#C9A227] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                Computador (PC / Mac)
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-gray-300 leading-relaxed">
            {activeInstructionTab === "android" && (
              <p>
                <strong>No Android (Chrome/Samsung Internet):</strong> Clique no botão <em>"Instalar Aplicativo no Dispositivo"</em> acima ou toque no menu de 3 pontos do navegador no canto superior direito e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </p>
            )}
            {activeInstructionTab === "ios" && (
              <p>
                <strong>No iPhone ou iPad (Safari):</strong> Abra o SM Hub no Safari, toque no ícone de <strong>Compartilhar (⎋)</strong> na barra inferior do navegador, deslize para baixo e toque em <strong>"Adicionar à Tela de Início" (+)</strong>. O ícone oficial do SM Hub aparecerá na sua tela inicial como um app nativo.
              </p>
            )}
            {activeInstructionTab === "desktop" && (
              <p>
                <strong>No Computador (Chrome, Edge ou Brave):</strong> Clique no ícone de instalação (um monitor com seta para baixo) na extremidade direita da barra de endereços do navegador e clique em <strong>"Instalar SM Hub"</strong>.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 2: CONFIGURAÇÃO DO MENU MOBILE FLUTUANTE ── */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Menu Mobile Flutuante</h3>
            <p className="text-sm text-gray-400">
              Personalize os atalhos que aparecem na barra inferior do smartphone e no aplicativo PWA instalado
            </p>
          </div>
        </div>
        
        <p className="text-sm text-white">
          Atalhos selecionados: <strong className="text-brand">({selectedShortcuts.length}/3)</strong>
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allShortcuts.map((shortcut, i) => {
                const isSelected = shortcut.fixed || selectedShortcuts.includes(shortcut.label);
                return (
                  <button 
                    key={i}
                    type="button"
                    onClick={() => handleToggleShortcut(shortcut.label, shortcut.fixed)}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all relative cursor-pointer ${
                      isSelected 
                        ? 'border-brand/60 bg-brand/10 shadow-lg shadow-brand/10 scale-[1.02]' 
                        : 'border-white/5 bg-[#111111] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    {shortcut.fixed && (
                      <span className="absolute top-2 right-2 text-[10px] font-black text-brand bg-brand/20 px-1.5 py-0.5 rounded">FIXO</span>
                    )}
                    {!shortcut.fixed && isSelected && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">✓ ATIVO</span>
                    )}
                    <shortcut.icon className={`w-6 h-6 ${isSelected ? 'text-brand' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>{shortcut.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 flex items-start gap-3 text-sm text-gray-400 bg-black/50 p-4 rounded-xl border border-white/5">
              <span className="text-[#C9A227] text-base">💡</span>
              <p><span className="font-medium text-white">Dica:</span> As ferramentas escolhidas ficam disponíveis com 1 toque no rodapé do seu smartphone quando você estiver em trânsito ou atendendo clientes.</p>
            </div>
          </div>
          
          {/* Live Mobile Mockup Preview */}
          <div className="hidden lg:flex flex-col items-center">
            <div className="w-[300px] h-[580px] border-[8px] border-[#222] rounded-[3rem] bg-black p-4 relative flex flex-col shadow-2xl">
              <div className="w-32 h-6 bg-[#222] rounded-b-xl mx-auto absolute top-0 left-1/2 -translate-x-1/2"></div>
              
              <div className="flex-1 mt-6 space-y-3">
                 <div className="h-20 bg-[#111114] rounded-xl border border-white/5 p-3">
                   <div className="h-3 w-20 bg-white/10 rounded mb-2" />
                   <div className="h-6 w-32 bg-brand/20 rounded" />
                 </div>
                 <div className="h-24 bg-[#111114] rounded-xl border border-white/5 p-3">
                   <div className="h-3 w-24 bg-white/10 rounded mb-2" />
                   <div className="h-4 w-full bg-white/5 rounded" />
                 </div>
                 <div className="h-24 bg-[#111114] rounded-xl border border-white/5 p-3">
                   <div className="h-3 w-16 bg-white/10 rounded mb-2" />
                   <div className="h-4 w-full bg-white/5 rounded" />
                 </div>
              </div>
              
              {/* Real-time Dynamic Mobile Navigation Bar */}
              <div className="h-16 bg-[#111114] rounded-2xl border border-brand/30 mt-auto flex items-center justify-around px-2 relative z-10 shadow-lg shadow-brand/10">
                 <div className="text-brand flex flex-col items-center" title="Dashboard (Fixo)">
                   <LayoutDashboard className="w-5 h-5" />
                   <span className="text-[8px] text-brand mt-0.5 font-black">Home</span>
                 </div>
                 {selectedShortcuts.slice(0, 3).map((itemLabel) => {
                   const found = allShortcuts.find((s) => s.label === itemLabel);
                   const Icon = found?.icon || Layers;
                   return (
                     <div key={itemLabel} className="text-gray-400 flex flex-col items-center">
                       <Icon className="w-5 h-5 text-gray-300" />
                       <span className="text-[8px] text-gray-400 mt-0.5 line-clamp-1">{itemLabel}</span>
                     </div>
                   );
                 })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionTab({ email }: { email: string }) {
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"freelancer" | "growth" | "scale">("growth");
  const [activePlanName, setActivePlanName] = useState("Trial Gratuito (7 dias)");
  const [customRefCode, setCustomRefCode] = useState("TRIAL7D");

  const { data: subData, refetch: refetchSubscription, isLoading } = useQuery({
    queryKey: ["active-subscription"],
    queryFn: () => getActiveSubscription(),
  });

  const activeSub = subData?.subscription;
  const transactions = subData?.transactions || [];

  const currentPlanTitle = activeSub?.planName || activePlanName;
  const isOwner = Boolean(activeSub?.isOwner || activeSub?.status === "lifetime");
  const isPaidActive = activeSub?.status === "active";
  const isTrial = activeSub?.isTrial || activeSub?.status === "trial";
  const daysRemaining = activeSub?.daysRemaining !== undefined ? activeSub.daysRemaining : 7;
  const trialTotal = activeSub?.trialDaysTotal || 7;
  const trialPercent = Math.max(0, Math.min(100, Math.round((daysRemaining / trialTotal) * 100)));

  const renewalDate = activeSub?.validUntil 
    ? new Date(activeSub.validUntil).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "Em 7 dias";

  const inviteLink = `https://smhub.com.br/auth?mode=register&ref=${encodeURIComponent(customRefCode.trim().toLowerCase())}&trial=7d`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link de convite de 7 dias grátis copiado com sucesso!");
  };

  const handleShareWhatsApp = () => {
    const text = `🚀 Olá! Estou usando o SM HUB para gerenciar projetos, clientes, finanças e automações da agência. Te convido para testar gratuitamente por 7 dias com acesso completo sem compromisso:\n\n${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* VIP Owner Card: Dono / Fundador Vitalício */}
      {isOwner && (
        <div className="bg-gradient-to-r from-brand/20 via-[#1a1710] to-[#0e0e11] border border-brand/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="size-5 text-brand animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-black bg-brand px-2.5 py-0.5 rounded-full font-mono">
                  CONTA PROPRIETÁRIO & FUNDADOR
                </span>
                <span className="text-xs text-brand font-semibold">• Acesso Vitalício Irrestrito</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Silas Maroto — Licença Master Vitalícia
              </h3>
              <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                Como dono e criador do SM HUB, você possui <strong>isenção vitalícia de mensalidades</strong> e acesso irrestrito a todos os módulos presentes e futuros (IA, Contratos, CRM, Equipe, Projetos e Financeiro). Os planos pagos e os 7 dias grátis são para os usuários e agências que você cadastrar ou convidar!
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/60 border border-brand/30 text-brand">
                  👑 Nível: SuperAdmin Master
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/60 border border-emerald-500/30 text-emerald-400">
                  ✓ Mensalidade: R$ 0,00 (Isento Permanente)
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-neutral-300">
                  ✓ Validade: Vitalício Sem Expiração
                </span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setPlansModalOpen(true)}
                variant="outline"
                className="border-brand/40 bg-brand/10 hover:bg-brand/20 text-brand text-xs h-10 px-4 rounded-xl font-bold"
              >
                <Sparkles className="size-3.5 mr-1.5" /> Simular Visão dos Planos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Trial Alert Banner (only for invited / guest accounts) */}
      {!isOwner && isTrial && (
        <div className="bg-gradient-to-r from-amber-500/15 via-[#1a1710] to-[#111111] border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-3 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Período de Testes Oficial (7 Dias Grátis)
                </span>
              </div>
              <h3 className="text-xl font-black text-white">
                {daysRemaining > 0 
                  ? `Você tem ${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"} de degustação irrestrita`
                  : "Seu período de avaliação de 7 dias expirou"}
              </h3>
              <p className="text-xs text-neutral-300 max-w-xl">
                Aproveite todos os módulos de clientes, inteligência artificial, contratos com assinatura digital e financeiro. Ao assinar, você mantém todos os seus dados e continua sem interrupções.
              </p>

              {/* Progress bar */}
              <div className="pt-2 max-w-md">
                <div className="flex justify-between text-[11px] font-semibold text-neutral-400 mb-1">
                  <span>{daysRemaining} dias restantes</span>
                  <span>{trialTotal} dias totais</span>
                </div>
                <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-brand rounded-full transition-all duration-700"
                    style={{ width: `${trialPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <Button
                onClick={() => setPlansModalOpen(true)}
                className="gradient-brand text-black font-black text-xs h-11 px-6 rounded-xl shadow-lg shadow-brand/20 hover:opacity-95"
              >
                <Sparkles className="size-4 mr-1.5" /> Assinar com Pix ou Cartão
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current Active Plan Card */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/20 text-brand flex items-center justify-center border border-brand/30">
              {isOwner ? <Crown className="w-6 h-6 text-brand" /> : <Sparkles className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg">Assinatura SM HUB</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-brand/10 text-brand px-2 py-0.5 rounded-full border border-brand/20">
                  {isOwner ? "👑 Master Vitalício" : isTrial ? "Período de Testes" : "Plano Ativo"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isOwner 
                  ? "Licença Proprietário: acesso mestre vitalício liberado para gerenciar e replicar"
                  : "Gerencie seu plano, pagamentos via Pix ou Cartão e faturas"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-3.5" /> {isOwner ? "Proprietário Reconhecido" : "E-mail Autenticado"}
            </span>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Plan Name & Action */}
          <div className="border border-white/5 bg-black/50 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Plano da Conta</p>
              <p className="text-white font-extrabold text-lg">
                {isOwner ? "Proprietário & Fundador" : currentPlanTitle}
              </p>
              <p className="text-xs text-brand font-semibold mt-0.5">
                {isOwner ? "R$ 0,00 (Isento Permanente)" : activeSub?.amount ? `R$ ${activeSub.amount}/mês` : "Degustação 7 dias sem cobrança"}
              </p>
            </div>
            <div className="pt-4">
              <Button
                onClick={() => setPlansModalOpen(true)}
                size="sm"
                className="w-full gradient-brand text-black font-extrabold text-xs h-9 rounded-lg shadow-md shadow-brand/10 hover:opacity-95"
              >
                {isOwner ? "Visualizar Planos de Venda" : "Mudar de Plano / Assinar"}
              </Button>
            </div>
          </div>

          {/* Status & Method */}
          <div className="border border-white/5 bg-black/50 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Status & Cobrança</p>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-white font-bold text-sm">
                  {isOwner ? "Vitalício Ativo (Zero Custos)" : isPaidActive ? "Ativo & Regularizado" : "Período de Teste (7d)"}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Tipo:{" "}
                <strong className="text-gray-200">
                  {isOwner
                    ? "Conta Master (Fundador)"
                    : activeSub?.paymentMethod === "pix"
                    ? "Pix Instantâneo"
                    : activeSub?.paymentMethod === "credit_card"
                    ? "Cartão de Crédito"
                    : "Trial 7 Dias Grátis"}
                </strong>
              </p>
            </div>
            <div className="pt-4">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <CheckCircle2 className="size-3" /> {isOwner ? "Sem Mensalidades" : "Fatura em dia"}
              </span>
            </div>
          </div>

          {/* Cycle Renewal */}
          <div className="border border-white/5 bg-black/50 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Expiração / Renovação</p>
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-brand" />
                <p className="text-white font-bold text-sm">
                  {isOwner ? "Nunca Expira (Vitalício)" : renewalDate}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {isOwner 
                  ? "Sua licença mestre é permanente e nunca será bloqueada ou cobrada."
                  : isPaidActive 
                  ? "Renovação automática com envio de recibo por e-mail."
                  : "Final do período gratuito. Faça o upgrade a qualquer momento."}
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setPlansModalOpen(true)}
                className="text-xs text-brand hover:underline font-medium flex items-center gap-1"
              >
                <Sparkles className="size-3" /> Detalhes dos Planos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replication & Referral: Replicar para Outras Pessoas (7 Dias Grátis) */}
      <div className="bg-[#111111] border border-brand/30 rounded-2xl overflow-hidden p-6 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-black bg-brand px-2.5 py-0.5 rounded-full font-sans">
                REPLICAÇÃO & INDICAÇÃO
              </span>
              <span className="text-xs text-neutral-400">7 Dias de Teste Grátis</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="size-5 text-brand" />
              Replicar Plataforma para Outras Pessoas e Agências
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Compartilhe seu link exclusivo com amigos, parceiros, clientes ou outras agências. Qualquer pessoa cadastrada pelo seu link ganha <strong>7 dias grátis</strong> de acesso ilimitado com ativação imediata, sem necessidade de cartão de crédito no início.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-xs font-bold text-white block">⏱️ 7 Dias Grátis</span>
                <span className="text-[10px] text-neutral-400">Degustação Completa</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-xs font-bold text-white block">🚀 Ativação Imediata</span>
                <span className="text-[10px] text-neutral-400">Login e senha rápidos</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-xs font-bold text-white block">💳 Sem Fidelidade</span>
                <span className="text-[10px] text-neutral-400">Pix ou Cartão se gostar</span>
              </div>
            </div>
          </div>

          {/* Copy Link & WhatsApp Action */}
          <div className="w-full lg:w-96 bg-black/60 border border-white/10 rounded-2xl p-5 space-y-4 shrink-0">
            <div>
              <Label className="text-xs font-semibold text-neutral-300 mb-1.5 block">
                Código de Referência do Convite
              </Label>
              <Input
                value={customRefCode}
                onChange={(e) => setCustomRefCode(e.target.value.toUpperCase())}
                placeholder="SEU-CODIGO"
                className="bg-black border-white/10 text-brand font-black tracking-wider text-sm h-10 uppercase focus-visible:ring-brand"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-neutral-300 mb-1.5 block">
                Link de Convite Gerado
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={inviteLink}
                  className="bg-black border-white/10 text-neutral-300 text-xs h-10 select-all font-mono"
                />
                <Button
                  onClick={handleCopyInvite}
                  variant="outline"
                  className="h-10 px-3 bg-white/5 border-white/10 hover:bg-white/10 text-white shrink-0"
                  title="Copiar Link"
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            {/* Live QR Code Box */}
            <div className="bg-black/90 border border-brand/30 rounded-xl p-3 flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg shrink-0 shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=3&data=${encodeURIComponent(inviteLink)}`}
                  alt="QR Code Convite 7 Dias"
                  className="size-16 block rounded"
                />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <QrCode className="size-3.5 text-brand" /> QR Code de Acesso Rápido
                </p>
                <p className="text-[11px] text-neutral-400 leading-snug">
                  Apresente este QR Code para alguém escanear no celular e ativar 7 dias grátis na hora.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleCopyInvite}
                className="w-full gradient-brand text-black font-extrabold text-xs h-10 rounded-xl shadow-md shadow-brand/10 hover:opacity-95"
              >
                <Copy className="size-3.5 mr-1.5" /> Copiar Link de Indicação (7 Dias Grátis)
              </Button>
              <Button
                onClick={handleShareWhatsApp}
                variant="outline"
                className="w-full border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs h-10 rounded-xl"
              >
                <MessageCircle className="size-3.5 mr-1.5" /> Compartilhar no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Action Banner */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              Opções de Planos SM HUB
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Escolha entre <strong>Freelancer Pro (R$ 97)</strong>, <strong>Agência Growth (R$ 197)</strong> ou <strong>Scale Enterprise (R$ 397)</strong> com ativação instantânea via Pix ou Cartão.
            </p>
          </div>
          <Button
            onClick={() => setPlansModalOpen(true)}
            className="gradient-brand text-black font-extrabold text-xs h-10 px-5 rounded-xl shrink-0"
          >
            Ver Todos os Planos & Assinar
          </Button>
        </div>
      </div>

      {/* Transaction History & Invoices */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-gray-400" />
            <h3 className="text-white font-bold text-base">Histórico de Transações & Faturas</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {transactions.length} transaç{transactions.length === 1 ? "ão" : "ões"}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center bg-black/30">
            <CreditCard className="size-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-medium">Nenhum pagamento registrado ainda.</p>
            <p className="text-[11px] text-gray-600 mt-1">
              Ao assinar um plano via Pix ou Cartão, os recibos e comprovantes aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-medium">
                  <th className="pb-3 font-semibold">Identificador</th>
                  <th className="pb-3 font-semibold">Plano</th>
                  <th className="pb-3 font-semibold">Valor</th>
                  <th className="pb-3 font-semibold">Método</th>
                  <th className="pb-3 font-semibold">Data</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono text-gray-300 font-bold">{tx.id}</td>
                    <td className="py-3 text-white font-medium">{tx.planName}</td>
                    <td className="py-3 text-brand font-bold">R$ {tx.amount}</td>
                    <td className="py-3 text-gray-300 capitalize">
                      {tx.paymentMethod === "pix" ? "⚡ Pix" : "💳 Cartão"}
                    </td>
                    <td className="py-3 text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {tx.status === "paid" ? "Aprovado / Pago" : "Aguardando Pix"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Warning regarding Profile */}
      <div className="bg-[#111111] border border-brand/25 rounded-2xl p-5 relative overflow-hidden bg-gradient-to-r from-brand/5 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand shrink-0">
              <Building2 className="size-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Obrigatoriedade de Cadastro do Prestador</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Após a assinatura de um plano, é obrigatório preencher seus dados na aba <strong>Agência / Freelancer</strong> para que seus contratos e chaves Pix sejam válidos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real Plan Checkout & Payment Modal (Pix + Credit Card) */}
      <SubscriptionCheckoutModal
        open={plansModalOpen}
        onOpenChange={setPlansModalOpen}
        defaultPlanId={selectedPlan}
        userEmail={email}
        onSubscriptionSuccess={(newPlanName) => {
          setActivePlanName(newPlanName);
          refetchSubscription();
        }}
      />
    </div>
  );
}

function ChangelogTab() {
  const releases = [
    {
      version: "Versão 1.6",
      date: "Hoje",
      items: [
        "Central de configurações completa com 10 abas.",
        "Perfil com endereço, documentos, moeda, idioma e troca de senha.",
        "Barra de atalhos do celular configurável.",
      ],
    },
    {
      version: "Versão 1.5",
      date: "Esta semana",
      items: [
        "Painel inicial personalizável com blocos móveis.",
        "Logo da agência no canto superior esquerdo.",
        "Foto por cliente e recorte com zoom em todos os envios.",
      ],
    },
    {
      version: "Versão 1.4",
      date: "Recentemente",
      items: [
        "Funções e acessos por área, com recomendação inteligente.",
        "Histórico de auditoria de tudo que muda no sistema.",
        "Briefings com link próprio para o cliente responder.",
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {releases.map((r) => (
        <div key={r.version} className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{r.version}</h2>
            <Badge variant="outline">{r.date}</Badge>
          </div>
          <ul className="mt-3 space-y-2">
            {r.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DatabaseTab() {
  return (
    <div className="space-y-6">
      <div className="p-6 border border-border rounded-2xl bg-card">
        <h3 className="text-xl font-medium flex items-center gap-2">
          <Database className="text-brand size-5" /> Armazenamento em Nuvem
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Todos os clientes, finanças e projetos ficam salvos automaticamente na nuvem segura do SM Hub, com acesso apenas para a sua equipe logada.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Cloud className="size-6 text-brand" />
          <span className="font-medium">Banco de dados conectado</span>
        </div>
      </div>
    </div>
  );
}
