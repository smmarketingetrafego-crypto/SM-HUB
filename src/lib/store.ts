import { useState, useEffect } from "react";
import type { Pipeline, Briefing } from "@/data/extra";
import type { ClientRecord, ClientGroup } from "@/lib/clients.functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface StoreState {
  view: string;
  clients: ClientRecord[];
  groups: ClientGroup[];
  pipelines: Pipeline[];
  briefings: Briefing[];
  profile: any;
  preferences: any;
  tutorials: {
    id: string;
    title: string;
    duration: string;
    category: string;
    thumbnail: string;
    description: string;
    videoUrl?: string;
    locations?: string[];
    driveFileId?: string;
  }[];
  activeVideo: any | null;
}

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------
const DEFAULT_PIPELINE: Pipeline = {
  id: "pipeline-principal",
  name: "Pipeline Principal",
  stages: [
    { name: "Novo Lead", deals: [] },
    { name: "Qualificação", deals: [] },
    { name: "Proposta Enviada", deals: [] },
    { name: "Negociação", deals: [] },
    { name: "Fechado - Ganho", deals: [] },
    { name: "Fechado - Perdido", deals: [] },
  ],
};

const DEFAULT_STATE: StoreState = {
  view: "visao-geral",
  clients: [],
  groups: [],
  pipelines: [DEFAULT_PIPELINE],
  briefings: [],
  profile: {
    id: "user-1", name: "", email: "", photoUrl: null, avatarUrl: null,
    role: "member", fullName: "", phone: "", jobTitle: "", instagram: "",
    website: "", city: "", bio: "", company: "", docId: "", address: "", addressNumber: "",
    district: "", state: "", zip: "", country: "BR", currency: "BRL", language: "pt-BR",
    publicSlug: "", revenueGoal: 0,
  },
  preferences: {
    theme: "dark", accentColor: "brand", sidebarCollapsed: false,
    emailNotifications: true, whatsappNotifications: false, desktopNotifications: true,
    weeklyReport: true, leadAlerts: true
  },
  tutorials: [
    {
      id: "tut-1", title: "BEM VINDO", duration: "02:15", category: "Iniciante", 
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600", 
      description: "Bem-vindo ao SM Hub! Assista a este vídeo introdutório para entender os conceitos básicos da plataforma.",
      videoUrl: "/videos/BEM VINDO_1080p.mp4",
      locations: ["Aba Tutoriais", "Dashboard"]
    },
    {
      id: "tut-2", title: "Cadastro de Clientes 3 Modos", duration: "05:30", category: "Gestão", 
      thumbnail: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=600",
      description: "Aprenda os 3 modos diferentes de cadastrar novos clientes no sistema.",
      videoUrl: "/videos/Cadastro de Clientes   3 Modos_1080p60.mp4",
      locations: ["Aba Tutoriais", "Clientes"]
    },
    {
      id: "tut-3", title: "Financeiro", duration: "10:45", category: "Gestão", 
      thumbnail: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=600",
      description: "Visão geral completa sobre o painel Financeiro, gestão de cobranças e controle de caixa.",
      videoUrl: "/videos/Financeiro_1080p60.mp4",
      locations: ["Aba Tutoriais", "Financeiro"]
    },
    {
      id: "tut-4", title: "Pipeline, como utilizar", duration: "08:20", category: "Vendas", 
      thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600",
      description: "Domine o funil de vendas e saiba como avançar seus negócios em cada etapa.",
      videoUrl: "/videos/Pipeline, como utilizar_1080p60.mp4",
      locations: ["Aba Tutoriais", "Pipeline"]
    },
    {
      id: "tut-5", title: "Produção de Conteúdo", duration: "06:12", category: "Marketing", 
      thumbnail: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=600",
      description: "Como organizar suas publicações e agendamentos no Calendário de Conteúdo.",
      videoUrl: "/videos/Produção de Conteudo_1080p60.mp4",
      locations: ["Aba Tutoriais", "Calendário"]
    },
    {
      id: "tut-6", title: "Quadro de Tarefas", duration: "04:50", category: "Produtividade", 
      thumbnail: "https://images.unsplash.com/photo-1507925922837-326f12d9348d?auto=format&fit=crop&q=80&w=600",
      description: "Gerencie sua equipe e tarefas individuais no módulo operacional.",
      videoUrl: "/videos/Quadro de Tarefas_1080p60.mp4",
      locations: ["Aba Tutoriais", "Tarefas"]
    },
    {
      id: "tut-7", title: "Integração ASAAS + SM Hub", duration: "07:18", category: "Integrações", 
      thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=600",
      description: "Aprenda a conectar a sua conta do ASAAS para emissão automática de cobranças e boletos.",
      videoUrl: "/videos/Tutorial Integração ASAAS + DG FLOW_1080p.mp4",
      locations: ["Aba Tutoriais", "Configurações"]
    },
    {
      id: "tut-8", title: "Integração com Google Drive", duration: "03:45", category: "Integrações", 
      thumbnail: "https://images.unsplash.com/photo-1614064641913-6b7140414c71?auto=format&fit=crop&q=80&w=600",
      description: "Como sincronizar o armazenamento em nuvem do Google Drive com o seu SM Hub.",
      videoUrl: "/videos/Tutorial Integração com Google Drive_1080p.mp4",
      locations: ["Aba Tutoriais", "Configurações"]
    }
  ],
  activeVideo: null
};

// ---------------------------------------------------------------------------
// SSR-safe localStorage helpers
// ---------------------------------------------------------------------------
function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function loadState(): StoreState {
  if (!isClient()) return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem("smhub_store");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        // Ensure pipelines always has the correct structure
        pipelines: parsed.pipelines?.length ? parsed.pipelines : DEFAULT_STATE.pipelines,
      };
    }
  } catch {}
  return DEFAULT_STATE;
}

function saveState(state: StoreState) {
  if (!isClient()) return;
  try {
    localStorage.setItem("smhub_store", JSON.stringify(state));
  } catch {}
}

// ---------------------------------------------------------------------------
// Simple pub/sub for cross-component updates
// ---------------------------------------------------------------------------
type Listener = (state: StoreState) => void;
const listeners = new Set<Listener>();
let _state: StoreState = DEFAULT_STATE;

function emit() {
  saveState(_state);
  listeners.forEach((fn) => fn({ ..._state }));
}

export function setStore(updater: Partial<StoreState> | ((prev: StoreState) => Partial<StoreState>)) {
  const patch = typeof updater === "function" ? updater(_state) : updater;
  _state = { ..._state, ...patch };
  emit();
}

export function useStore(): StoreState {
  const [state, setState] = useState<StoreState>(_state);
  useEffect(() => {
    // Hydrate from localStorage on client
    const stored = loadState();
    _state = stored;
    setState({ ...stored });
    // Subscribe to future updates
    const handler = (s: StoreState) => setState(s);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);
  return state;
}

export function useStoreHydration() {
  // No-op: useStore handles its own hydration
}

// ---------------------------------------------------------------------------
// Client helpers (replaces useServerFn for clients)
// ---------------------------------------------------------------------------
export function storeAddClient(client: Omit<ClientRecord, "id" | "createdAt" | "archived" | "source">): ClientRecord {
  const newClient: ClientRecord = {
    ...client,
    id: `c_${Date.now()}`,
    createdAt: new Date().toISOString(),
    archived: false,
    source: "manual",
    tags: client.tags ?? [],
    groupIds: client.groupIds ?? [],
  };
  setStore({ clients: [..._state.clients, newClient] });
  return newClient;
}

export function storeUpdateClient(id: string, updates: Partial<ClientRecord>) {
  const clients = _state.clients.map((c) => c.id === id ? { ...c, ...updates } : c);
  setStore({ clients });
}

export function storeArchiveClient(id: string, archived: boolean) {
  storeUpdateClient(id, { archived });
}

export function storeDeleteClient(id: string) {
  setStore({ clients: _state.clients.filter((c) => c.id !== id) });
}

export function storeAddGroup(name: string, description = "", color = "#C9A227"): ClientGroup {
  const group: ClientGroup = {
    id: `g_${Date.now()}`,
    name,
    description,
    color,
    memberCount: 0,
  };
  setStore({ groups: [..._state.groups, group] });
  return group;
}

export function storeDeleteGroup(id: string) {
  setStore({ groups: _state.groups.filter((g) => g.id !== id) });
}

// ---------------------------------------------------------------------------
// Pipeline helpers
// ---------------------------------------------------------------------------
export function addKanbanCard(stage: string, card: { title: string; client: string; priority: string; assignee: string; due: string }) {
  const pipelines = _state.pipelines.map((p) => ({
    ...p,
    stages: p.stages.map((s) =>
      s.name.toLowerCase() === stage.toLowerCase()
        ? { ...s, deals: [...s.deals, { client: card.client, value: 0, stage: s.name }] }
        : s
    ),
  }));
  setStore({ pipelines });
}

export function startQuoteFor(_client: string) {
  // Navigates to propostas - handled by route
}

export function openChatWith(_client: string) {
  // Opens chat - handled by route
}

export function today() {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Briefing helpers
// ---------------------------------------------------------------------------
export function createBriefing(briefing: Omit<Briefing, "id" | "createdAt" | "link">): Briefing {
  const id = `b_${Date.now()}`;
  const newBriefing: Briefing = {
    ...briefing,
    id,
    createdAt: new Date().toISOString(),
    link: `/b/${id}`,
  };
  setStore({ briefings: [..._state.briefings, newBriefing] });
  return newBriefing;
}

export function briefingLink(briefing: Briefing): string {
  return `/b/${briefing.id}`;
}

export function briefingAbsoluteLink(briefing: Briefing): string {
  if (!isClient()) return `/b/${briefing.id}`;
  return `${window.location.origin}/b/${briefing.id}`;
}
