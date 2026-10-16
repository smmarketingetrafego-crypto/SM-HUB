import { createServerFn } from "@tanstack/react-start";
import { readDb } from "./db-drive.server";
import { type Orcamento, type AgencyProfile, DEFAULT_AGENCY_PROFILE, DEFAULT_ORCAMENTOS } from "./api-propostas.server";

export interface ClientPortalData {
  client: {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status: string;
    joinedAt?: string;
  };
  agency: AgencyProfile;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    budget: number;
    deadline?: string;
    progress: number;
    tasksCount?: number;
    deliverables?: Array<{ title: string; url: string; type: string }>;
  }>;
  orcamentos: Orcamento[];
  invoices: Array<{
    id: string;
    description: string;
    amount: number;
    status: "Pago" | "Pendente" | "Atrasado";
    dueDate?: string;
    paidAt?: string;
    pixCode?: string;
  }>;
  sharedLinks: Array<{
    title: string;
    description: string;
    url: string;
    type: "drive" | "figma" | "document" | "other";
  }>;
}

export const getClientPortalData = createServerFn({ method: "GET" })
  .inputValidator((clientIdOrName: string) => clientIdOrName)
  .handler(async ({ data: identifier }): Promise<{ success: boolean; data?: ClientPortalData; error?: string }> => {
    try {
      const db = await readDb({ publicAccess: true });
      const decoded = decodeURIComponent(identifier).trim().toLowerCase();

      // Busca cliente correspondente
      const allClients = db.clients || [];
      const client = allClients.find((c: any) => 
        (c.id && c.id.toLowerCase() === decoded) ||
        (c.name && c.name.toLowerCase() === decoded) ||
        (c.name && decoded.includes(c.name.toLowerCase()))
      ) || {
        id: identifier,
        name: decodeURIComponent(identifier),
        status: "Ativo",
        joinedAt: "Outubro/2026"
      };

      const clientName = client.name || decodeURIComponent(identifier);
      const agency: AgencyProfile = db.agencyProfile || DEFAULT_AGENCY_PROFILE;

      // Projetos vinculados
      const allProjects = db.projects || [];
      const clientProjects = allProjects.filter((p: any) => 
        p.client && p.client.toLowerCase().includes(clientName.toLowerCase())
      );

      // Propostas vinculadas
      const allOrcs: Orcamento[] = db.orcamentos || DEFAULT_ORCAMENTOS;
      const clientOrcs = allOrcs.filter((o: any) => 
        o.cliente && o.cliente.toLowerCase().includes(clientName.toLowerCase())
      );

      // Faturas e recebíveis vinculados
      const allTx = db.transactions || [];
      const clientInvoices = allTx
        .filter((t: any) => t.cliente && t.cliente.toLowerCase().includes(clientName.toLowerCase()))
        .map((t: any) => ({
          id: t.id,
          description: t.description || "Serviço Prestado",
          amount: t.amount,
          status: (t.status === "Recebido" ? "Pago" : "Pendente") as any,
          dueDate: t.date,
          paidAt: t.status === "Recebido" ? t.date : undefined,
          pixCode: agency.pixKey ? `00020126580014br.gov.bcb.pix0114${agency.pixKey}520400005303986540${t.amount}.005802BR5916SM HUB6009SAO PAULO` : undefined
        }));

      // Se não houver faturas manuais, gera faturas a partir das propostas do cliente
      if (clientInvoices.length === 0) {
        clientOrcs.forEach((o) => {
          clientInvoices.push({
            id: `inv-${o.id}`,
            description: `${o.titulo} (${o.numero})`,
            amount: o.valor,
            status: o.status === "aprovado" ? "Pago" : "Pendente",
            dueDate: o.validadeAte || o.criadoEm,
            paidAt: o.aprovadoEm,
            pixCode: agency.pixKey ? `00020126580014br.gov.bcb.pix0114${agency.pixKey}520400005303986540${o.valor}.005802BR5916SM HUB6009SAO PAULO` : undefined
          });
        });
      }

      // Links compartilhados da agência para o cliente
      const sharedLinks = [
        {
          title: "Pasta de Criativos & Mídia (Google Drive)",
          description: "Pasta na nuvem contendo todos os criativos de alta resolução, vídeos e artes aprovadas.",
          url: "https://drive.google.com",
          type: "drive" as const,
        },
        {
          title: "Protótipos & Identidade Visual (Figma)",
          description: "Acesse o painel do projeto no Figma para visualização das telas e diretrizes da marca.",
          url: "https://figma.com",
          type: "figma" as const,
        },
        {
          title: "Cronograma Executivo de Entregas",
          description: "Documento com o roadmap semanal e acompanhamento dos marcos de entrega.",
          url: "#projetos",
          type: "document" as const,
        }
      ];

      return {
        success: true,
        data: {
          client,
          agency,
          projects: clientProjects.length > 0 ? clientProjects : [
            {
              id: "proj-demo-1",
              name: clientOrcs[0]?.titulo || "Assessoria Estratégica & Gestão Digital",
              status: "in_progress",
              budget: clientOrcs[0]?.valor || 3500,
              deadline: clientOrcs[0]?.prazoEntrega || "30 dias",
              progress: 45,
              deliverables: [
                { title: "Briefing & Planejamento Inicial", url: "#", type: "concluído" },
                { title: "Criação de Criativos & Roteiros", url: "#", type: "em andamento" },
                { title: "Setup de Campanhas & Conversão", url: "#", type: "a iniciar" },
              ]
            }
          ],
          orcamentos: clientOrcs.length > 0 ? clientOrcs : allOrcs.slice(0, 2),
          invoices: clientInvoices,
          sharedLinks,
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
