import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface AgentMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  desc: string;
  model: string;
  systemPrompt: string;
  active: boolean;
  chats: number;
  history?: AgentMessage[];
}

export const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: "agent-1",
    name: "IA de Qualificação & SDR",
    role: "Vendas",
    desc: "Aborda leads no WhatsApp, descobre orçamento, dores e agenda reuniões diretamente no seu calendário.",
    model: "GPT-4o (Comercial)",
    systemPrompt: "Você é um SDR consultivo de alta performance para a agência SM Hub. Seu objetivo é acolher o lead com simpatia, identificar se ele precisa de branding, tráfego ou landing page, entender o orçamento estimado e direcioná-lo para uma call com o especialista.",
    active: true,
    chats: 145,
    history: [
      { id: "h1", sender: "user", text: "Olá! Gostaria de saber mais sobre os serviços de vocês.", timestamp: "10:00" },
      { id: "h2", sender: "agent", text: "Olá! Seja muito bem-vindo à SM Hub! 🚀 Eu sou o assistente virtual comercial. Ajudamos empresas a escalarem através de Branding, Tráfego Pago e Landing Pages de alta conversão. Qual é o seu principal objetivo hoje?", timestamp: "10:00" }
    ]
  },
  {
    id: "agent-2",
    name: "Suporte Técnico N1 & Dúvidas",
    role: "Atendimento",
    desc: "Responde dúvidas frequentes de clientes sobre prazos de entrega, status de projetos e links de aprovação.",
    model: "Claude 3.5 Sonnet",
    systemPrompt: "Você é o assistente de suporte técnico da SM Hub. Ajude o cliente a encontrar informações sobre seus entregáveis, prazos e manutenções com objetividade e clareza.",
    active: true,
    chats: 890,
    history: [
      { id: "h1", sender: "user", text: "Onde consigo ver o link do meu projeto?", timestamp: "14:20" },
      { id: "h2", sender: "agent", text: "Você pode acessar o menu 'Projetos' na barra lateral ou conferir a pasta sincronizada do seu Google Drive enviada no seu e-mail de onboarding!", timestamp: "14:20" }
    ]
  },
  {
    id: "agent-3",
    name: "Copywriter Pro & Estrategista",
    role: "Marketing",
    desc: "Cria roteiros para Reels, carrosséis educativos para Instagram e copies persuasivas de alta conversão.",
    model: "DeepSeek V3",
    systemPrompt: "Você é um Copywriter especialista em marketing digital e retenção. Crie ganchos magnéticos, desenvolvimento envolvente e chamadas para ação (CTA) claras para designers e gestores de tráfego.",
    active: false,
    chats: 38,
    history: []
  },
  {
    id: "agent-4",
    name: "Assistente de Cobrança Amigável",
    role: "Financeiro",
    desc: "Notifica clientes sobre vencimento de boletos e chaves Pix com cordialidade e tom humanizado.",
    model: "GPT-4o Mini",
    systemPrompt: "Você é o assistente financeiro da SM Hub. Seu trabalho é enviar lembretes cordiais de faturas a vencer ou pendentes, facilitando o pagamento por código Pix copia-e-cola.",
    active: false,
    chats: 12,
    history: []
  }
];

export const getAgents = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.agents || !Array.isArray(db.agents) || db.agents.length === 0) {
      db.agents = DEFAULT_AGENTS;
      await writeDb(db);
    }
    return db.agents as AIAgent[];
  } catch (e: any) {
    console.error("Failed to read agents:", e);
    return DEFAULT_AGENTS;
  }
});

export const toggleAgent = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.agents) db.agents = [...DEFAULT_AGENTS];
      const agent = db.agents.find((a: any) => a.id === id);
      if (agent) {
        agent.active = !agent.active;
        await writeDb(db);
        return { success: true, agent, agents: db.agents };
      }
      return { success: false, error: "Agente não encontrado" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const saveAgent = createServerFn({ method: "POST" })
  .validator((agent: Partial<AIAgent>) => agent)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.agents) db.agents = [...DEFAULT_AGENTS];
      if (data.id) {
        const idx = db.agents.findIndex((a: any) => a.id === data.id);
        if (idx !== -1) {
          db.agents[idx] = { ...db.agents[idx], ...data };
        } else {
          db.agents.push(data);
        }
      } else {
        const newAgent: AIAgent = {
          id: `agent-${Date.now()}`,
          name: data.name || "Novo Agente IA",
          role: data.role || "Atendimento",
          desc: data.desc || "Agente automatizado inteligente",
          model: data.model || "GPT-4o",
          systemPrompt: data.systemPrompt || "Você é um assistente prestativo.",
          active: true,
          chats: 0,
          history: []
        };
        db.agents.push(newAgent);
      }
      await writeDb(db);
      return { success: true, agents: db.agents };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const chatWithAgent = createServerFn({ method: "POST" })
  .validator((payload: { agentId: string; userMessage: string }) => payload)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.agents) db.agents = [...DEFAULT_AGENTS];
      const agent = db.agents.find((a: any) => a.id === data.agentId);
      if (!agent) return { success: false, error: "Agente não encontrado" };

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (!agent.history) agent.history = [];

      const userMsg: AgentMessage = {
        id: `msg-${Date.now()}-u`,
        sender: "user",
        text: data.userMessage,
        timestamp: timeStr,
      };
      agent.history.push(userMsg);
      agent.chats = (agent.chats || 0) + 1;

      // Resposta contextual através do motor de IA
      const { generateAgentChatResponse } = await import("./ai-support.server");
      const reply = await generateAgentChatResponse(agent, data.userMessage, agent.history);

      const agentMsg: AgentMessage = {
        id: `msg-${Date.now()}-a`,
        sender: "agent",
        text: reply,
        timestamp: timeStr,
      };
      agent.history.push(agentMsg);

      await writeDb(db);
      return { success: true, reply: agentMsg, history: agent.history };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
