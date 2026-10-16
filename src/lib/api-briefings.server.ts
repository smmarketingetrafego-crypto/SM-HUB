import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive.server";

export interface BriefingQuestion {
  id: string;
  label: string;
  description?: string;
  type: "text" | "textarea" | "select" | "multiple";
  options?: string[];
  required?: boolean;
}

export interface BriefingTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  questions: BriefingQuestion[];
}

export interface BriefingRecord {
  id: string;
  title: string;
  client: string;
  clientEmail?: string;
  clientPhone?: string;
  category: string;
  status: "aguardando" | "em andamento" | "concluído";
  createdAt: string;
  respondedAt?: string;
  questions: BriefingQuestion[];
  answers?: Record<string, any>;
  link: string;
}

export const DEFAULT_BRIEFING_TEMPLATES: BriefingTemplate[] = [
  {
    id: "tpl-identidade-visual",
    title: "Briefing — Identidade Visual & Branding",
    category: "Design & Marca",
    description: "Alinhe posicionamento, valores, preferências visuais e público-alvo para criação de logotipos e manuais de marca.",
    questions: [
      { id: "q1", label: "Nome exato da marca ou empresa", type: "text", required: true },
      { id: "q2", label: "Qual é o nicho de mercado e principal produto/serviço oferecido?", type: "textarea", required: true },
      { id: "q3", label: "Quem é o cliente ideal (público-alvo) da sua empresa?", type: "textarea", required: true },
      { id: "q4", label: "Quais são os 3 a 5 adjetivos que definem o tom da sua marca?", description: "Ex: Moderno, Elegante, Minimalista, Jovem, Tradicional, Tecnológico", type: "text", required: true },
      { id: "q5", label: "Cores preferidas ou cores que devem ser evitadas a todo custo", type: "textarea" },
      { id: "q6", label: "Links de perfis, sites ou marcas que você admira visualmente (Referências)", type: "textarea" },
    ]
  },
  {
    id: "tpl-trafego-pago",
    title: "Briefing — Tráfego Pago & Performance Meta/Google",
    category: "Marketing & Tráfego",
    description: "Levantamento de orçamento, personas, produtos carro-chefe e metas de ROI para campanhas de anúncios.",
    questions: [
      { id: "q1", label: "Qual é o principal objetivo das campanhas?", description: "Ex: Geração de Leads no WhatsApp, Vendas no E-commerce, Reconhecimento Local", type: "select", options: ["Leads para WhatsApp", "Vendas E-commerce", "Agendamentos de Consultório", "Reconhecimento / Seguidores"], required: true },
      { id: "q2", label: "Qual é o produto ou serviço carro-chefe que mais gera margem de lucro?", type: "textarea", required: true },
      { id: "q3", label: "Qual é o ticket médio do seu produto/serviço?", type: "text", required: true },
      { id: "q4", label: "Qual é a verba mensal inicial planejada para investir nas plataformas de anúncios?", type: "text", required: true },
      { id: "q5", label: "Região geográfica de atendimento", description: "Ex: Apenas na cidade de São Paulo, raio de 15km, ou Brasil inteiro", type: "text", required: true },
      { id: "q6", label: "Quais são as principais dúvidas e objeções que seus clientes trazem antes de comprar?", type: "textarea" },
    ]
  },
  {
    id: "tpl-website-landing",
    title: "Briefing — Website & Landing Page de Alta Conversão",
    category: "Desenvolvimento Web",
    description: "Estrutura, chamadas para ação (CTA), seções essenciais e integrações para sites e landing pages.",
    questions: [
      { id: "q1", label: "Qual é a ação número 1 que o visitante deve realizar na página?", type: "select", options: ["Clicar no botão do WhatsApp", "Preencher formulário de contato", "Comprar produto diretamente", "Agendar reunião"], required: true },
      { id: "q2", label: "Você já possui domínio próprio registrado e hospedagem?", type: "text" },
      { id: "q3", label: "Quais seções você considera indispensáveis na página?", description: "Ex: Depoimentos, Tabela de Preços, FAQ, Sobre Nós, Formulário, Vídeo Explicativo", type: "textarea", required: true },
      { id: "q4", label: "Links de 2 a 3 sites concorrentes ou de referência que você gosta", type: "textarea" },
    ]
  },
  {
    id: "tpl-social-media",
    title: "Briefing — Gestão de Redes Sociais & Conteúdo",
    category: "Social Media",
    description: "Frequência de postagens, pilares editoriais, tom de comunicação e expectativas de crescimento.",
    questions: [
      { id: "q1", label: "Quais redes sociais serão o foco principal?", type: "text", required: true },
      { id: "q2", label: "Qual a frequência desejada de publicações por semana?", type: "select", options: ["3 posts por semana", "4 a 5 posts por semana", "Postagens diárias (7/semana)"], required: true },
      { id: "q3", label: "Quais são os 3 maiores pilares de conteúdo do seu negócio?", description: "Ex: Dicas práticas, Casos de Sucesso, Bastidores/Autoridade", type: "textarea", required: true },
      { id: "q4", label: "Quem fará a gravação de vídeos/stories? A agência ou alguém interno da empresa?", type: "text" },
    ]
  }
];

// Helper para ler briefings
export const getBriefings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.briefings || db.briefings.length === 0) {
      // Cria registros iniciais baseados nos templates para demonstração imediata
      db.briefings = [
        {
          id: "brf-001",
          title: "Briefing — Identidade Visual & Branding",
          client: "Maria Silva",
          clientEmail: "maria@silvadesign.com",
          clientPhone: "11988887777",
          category: "Design & Marca",
          status: "concluído",
          createdAt: "10/10/2026",
          respondedAt: "11/10/2026 às 15:30",
          questions: DEFAULT_BRIEFING_TEMPLATES[0].questions,
          answers: {
            q1: "Silva Cosméticos & Bem-Estar",
            q2: "Linha de cosméticos veganos e sustentáveis para cuidados diários.",
            q3: "Mulheres entre 25 e 45 anos que buscam autocuidado com produtos naturais.",
            q4: "Minimalista, Sofisticado, Natural, Transparente",
            q5: "Preferência por tons terrosos, verde oliva e bege. Evitar vermelho neon e preto pesado.",
            q6: "Instagram: @aesop, @simpleorganic"
          },
          link: "/briefing/brf-001"
        },
        {
          id: "brf-002",
          title: "Briefing — Tráfego Pago & Performance Meta/Google",
          client: "João Pereira",
          clientEmail: "joao@pereira.com.br",
          clientPhone: "11977776666",
          category: "Marketing & Tráfego",
          status: "aguardando",
          createdAt: "14/10/2026",
          questions: DEFAULT_BRIEFING_TEMPLATES[1].questions,
          answers: {},
          link: "/briefing/brf-002"
        }
      ];
      await writeDb(db);
    }
    return {
      templates: DEFAULT_BRIEFING_TEMPLATES,
      briefings: db.briefings as BriefingRecord[]
    };
  } catch (e: any) {
    console.error("Erro ao ler briefings:", e);
    return {
      templates: DEFAULT_BRIEFING_TEMPLATES,
      briefings: []
    };
  }
});

// Busca briefing pelo ID (usado pela tela pública do cliente)
export const getBriefingById = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb({ publicAccess: true });
      const briefings: BriefingRecord[] = db.briefings || [];
      const found = briefings.find((b) => b.id === id);
      if (found) return found;

      // Se for um template que virou link público direto
      const template = DEFAULT_BRIEFING_TEMPLATES.find((t) => t.id === id);
      if (template) {
        return {
          id: template.id,
          title: template.title,
          client: "Cliente",
          category: template.category,
          status: "aguardando",
          createdAt: new Date().toLocaleDateString("pt-BR"),
          questions: template.questions,
          link: `/briefing/${template.id}`
        } as BriefingRecord;
      }

      return null;
    } catch {
      return null;
    }
  });

// Cria novo briefing e gera link
export const createBriefing = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; client: string; clientPhone?: string; clientEmail?: string; category: string; questions: BriefingQuestion[] }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.briefings) db.briefings = [];

      const id = `brf-${Date.now()}`;
      const newBriefing: BriefingRecord = {
        id,
        title: data.title,
        client: data.client,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        category: data.category || "Geral",
        status: "aguardando",
        createdAt: new Date().toLocaleDateString("pt-BR"),
        questions: data.questions || DEFAULT_BRIEFING_TEMPLATES[0].questions,
        answers: {},
        link: `/briefing/${id}`
      };

      db.briefings.unshift(newBriefing);
      await writeDb(db);

      return { success: true, briefing: newBriefing };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

// Salva respostas do cliente na página pública
export const submitBriefingResponse = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; answers: Record<string, any>; clientName?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb({ publicAccess: true });
      if (!db.briefings) db.briefings = [];

      const index = db.briefings.findIndex((b: any) => b.id === data.id);
      if (index === -1) {
        // Se ainda não existia no banco, adiciona
        const newRecord: BriefingRecord = {
          id: data.id,
          title: "Briefing Preenchido pelo Cliente",
          client: data.clientName || "Cliente",
          category: "Geral",
          status: "concluído",
          createdAt: new Date().toLocaleDateString("pt-BR"),
          respondedAt: new Date().toLocaleString("pt-BR"),
          questions: [],
          answers: data.answers,
          link: `/briefing/${data.id}`
        };
        db.briefings.unshift(newRecord);
      } else {
        db.briefings[index].answers = data.answers;
        db.briefings[index].status = "concluído";
        db.briefings[index].respondedAt = new Date().toLocaleString("pt-BR");
        if (data.clientName) db.briefings[index].client = data.clientName;
      }

      // Adiciona notificação urgente no sistema
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        title: "📋 Novo Briefing Respondido!",
        message: `O cliente ${data.clientName || "Cliente"} acabou de enviar as respostas do briefing.`,
        date: new Date().toISOString(),
        read: false,
        priority: "high"
      });

      await writeDb(db, { publicAccess: true });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

// Deletar briefing
export const deleteBriefing = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.briefings) return { success: true };
      db.briefings = db.briefings.filter((b: any) => b.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
