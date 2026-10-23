// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";
import { notifyAccount, accountOf } from "./notifications.server";

export type OrcStatus = "rascunho" | "enviado" | "aprovado" | "recusado";
export type TipoContrato = "pontual" | "freelancer" | "recorrente";
export type ProviderType = "agency" | "freelancer";

export interface AgencyProfile {
  providerType: ProviderType;
  legalName: string; // Razão Social (PJ) ou Nome Completo (PF)
  tradeName: string; // Nome Fantasia (PJ) ou Nome Profissional / Marca (PF)
  docType: "cnpj" | "cpf";
  docNumber: string; // CNPJ ou CPF formatado
  stateRegistration?: string; // Inscrição Estadual/Municipal ou RG (PF)
  professionalRole: string; // ex: Agência de Marketing Digital / Designer & Desenvolvedor Web / Gestor de Tráfego
  representativeName: string; // Representante Legal ou Titular
  representativeRole: string; // Cargo (ex: Diretor Executivo, Sócio-Fundador, Profissional Autônomo)
  email: string;
  phone: string; // WhatsApp oficial
  address: string;
  addressNumber: string;
  district: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  pixKey: string;
  pixKeyType: "email" | "cpf" | "cnpj" | "phone" | "random";
  pixBeneficiary: string;
  pixBank?: string;
  jurisdictionCity?: string; // Comarca de Eleição do Foro
  isCompleted?: boolean; // Indica se o cadastro obrigatório foi preenchido
}

export const DEFAULT_AGENCY_PROFILE: AgencyProfile = {
  providerType: "agency",
  legalName: "",
  tradeName: "",
  docType: "cnpj",
  docNumber: "",
  stateRegistration: "",
  professionalRole: "",
  representativeName: "",
  representativeRole: "",
  email: "",
  phone: "",
  address: "",
  addressNumber: "",
  district: "",
  city: "",
  state: "",
  zip: "",
  country: "Brasil",
  pixKey: "",
  pixKeyType: "cnpj",
  pixBeneficiary: "",
  pixBank: "",
  jurisdictionCity: "",
  isCompleted: false,
};

export interface OrcamentoItem {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Orcamento {
  id: string;
  numero: string;
  titulo: string;
  cliente: string;
  clienteId?: string;
  responsavel?: string;
  valor: number;
  status: OrcStatus;
  tipoContrato?: TipoContrato;
  criadoEm: string;
  validadeAte?: string;
  descricao: string;
  itens?: OrcamentoItem[];
  condicoesPagamento?: string;
  prazoEntrega?: string;
  aprovadoEm?: string;
  transacaoId?: string;
  projetoId?: string;
  followUps?: FollowUpRecord[];
  clientSignature?: {
    name: string;
    document: string;
    signedAt: string;
    ip: string;
    hash?: string;
  };
  viewsCount?: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
}

export const DEFAULT_ORCAMENTOS: Orcamento[] = [];

export const getOrcamentos = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.orcamentos || !Array.isArray(db.orcamentos) || db.orcamentos.length === 0) {
      db.orcamentos = DEFAULT_ORCAMENTOS;
      await writeDb(db);
    }
    return db.orcamentos as Orcamento[];
  } catch (e: any) {
    console.error("Failed to read orcamentos:", e);
    return DEFAULT_ORCAMENTOS;
  }
});

export const saveOrcamento = createServerFn({ method: "POST" })
  .inputValidator((item: Partial<Orcamento>) => item)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];

      if (data.id) {
        const idx = db.orcamentos.findIndex((o: any) => o.id === data.id);
        if (idx !== -1) {
          db.orcamentos[idx] = { ...db.orcamentos[idx], ...data };
        } else {
          db.orcamentos.push(data);
        }
      } else {
        const nextNum = String(db.orcamentos.length + 1).padStart(3, '0');
        const now = new Date();
        const criadoEm = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const newOrc: Orcamento = {
          id: `orc-${Date.now()}`,
          numero: `ORC-2026-${nextNum}`,
          titulo: data.titulo || "Novo Orçamento",
          cliente: data.cliente || "Cliente",
          clienteId: data.clienteId,
          responsavel: (data.responsavel || "").trim() || undefined,
          valor: Number(data.valor) || 0,
          status: data.status || "rascunho",
          criadoEm,
          validadeAte: data.validadeAte || "15 dias",
          descricao: data.descricao || "",
          itens: data.itens && data.itens.length > 0 ? data.itens : [
            { id: "i1", descricao: data.titulo || "Serviço Prestado", quantidade: 1, valorUnitario: Number(data.valor) || 0 }
          ],
          condicoesPagamento: data.condicoesPagamento || "50% entrada + 50% entrega",
          prazoEntrega: data.prazoEntrega || "15 dias",
        };
        db.orcamentos.unshift(newOrc);
        await writeDb(db);
        await notifyAccount(accountOf(db), { kind: "proposal", title: "Nova proposta criada", body: `${newOrc.titulo} — ${newOrc.cliente}`, link: "/propostas" });
        return { success: true, orcamentos: db.orcamentos };
      }

      await writeDb(db);
      return { success: true, orcamentos: db.orcamentos };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const deleteOrcamento = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];
      db.orcamentos = db.orcamentos.filter((o: any) => o.id !== id);
      await writeDb(db);
      return { success: true, orcamentos: db.orcamentos };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const updateOrcamentoStatus = createServerFn({ method: "POST" })
  .inputValidator((payload: { id: string; status: OrcStatus }) => payload)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];
      const orc = db.orcamentos.find((o: any) => o.id === data.id);

      if (!orc) {
        return { success: false, error: "Orçamento não encontrado" };
      }

      orc.status = data.status;

      let createdTransaction = null;
      let createdProject = null;

      // Se for aprovado, injeta receita no financeiro e cria o projeto automaticamente!
      if (data.status === "aprovado") {
        orc.aprovadoEm = new Date().toISOString();

        if (!db.transactions) db.transactions = [];
        const txId = `tx-orc-${Date.now()}`;
        createdTransaction = {
          id: txId,
          description: `Receita Aprovada: ${orc.numero} - ${orc.titulo}`,
          amount: orc.valor,
          type: "income",
          category: "Serviços",
          date: new Date().toISOString().split("T")[0],
          status: "completed",
          client: orc.cliente,
        };
        db.transactions.unshift(createdTransaction);
        orc.transacaoId = txId;

        if (!db.projects) db.projects = [];
        const projId = `proj-orc-${Date.now()}`;
        createdProject = {
          id: projId,
          name: orc.titulo,
          client: orc.cliente,
          budget: orc.valor,
          status: "in_progress",
          deadline: orc.prazoEntrega || "30 dias",
          progress: 5,
        };
        db.projects.unshift(createdProject);
        orc.projetoId = projId;

        // Disparo de notificação de WhatsApp
        if (!db.whatsapp) db.whatsapp = [];
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        db.whatsapp.push({
          id: `msg-${Date.now()}`,
          contactId: `c_${orc.cliente}`,
          contactName: orc.cliente,
          phone: (orc as any).telefone || "",
          text: `🎉 Olá ${orc.cliente}! Sua proposta "${orc.titulo}" (${orc.numero}) foi confirmada e aprovada! O projeto já foi iniciado e a nota/fatura foi gerada no seu painel.`,
          sender: "automation",
          timestamp: timeStr,
          status: "delivered",
          isAutomation: true
        });
      }

      await writeDb(db);
      return { 
        success: true, 
        orcamento: orc, 
        createdTransaction, 
        createdProject,
        orcamentos: db.orcamentos 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const sendOrcamentoWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];
      const orc = db.orcamentos.find((o: any) => o.id === id);
      if (!orc) return { success: false, error: "Orçamento não encontrado" };

      orc.status = "enviado";

      if (!db.whatsapp) db.whatsapp = [];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const msg = {
        id: `msg-${Date.now()}`,
        contactId: `c_${orc.cliente}`,
        contactName: orc.cliente,
        phone: (orc as any).telefone || "",
        text: `Olá ${orc.cliente}! Segue a proposta comercial ${orc.numero} ("${orc.titulo}") no valor de R$ ${orc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Você pode visualizar e aprovar online através do link: http://localhost:8080/proposta/${orc.id}`,
        sender: "me" as const,
        timestamp: timeStr,
        status: "sent" as const,
      };
      db.whatsapp.push(msg);

      await writeDb(db);
      return { success: true, orcamento: orc, message: msg };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const getAgencyProfile = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.agencyProfile) {
      return { ...DEFAULT_AGENCY_PROFILE };
    }
    return db.agencyProfile as AgencyProfile;
  } catch (e: any) {
    console.error("Failed to read agencyProfile:", e);
    return DEFAULT_AGENCY_PROFILE;
  }
});

export const saveAgencyProfile = createServerFn({ method: "POST" })
  .inputValidator((profile: Partial<AgencyProfile>) => profile)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      const current = db.agencyProfile || DEFAULT_AGENCY_PROFILE;
      const updated: AgencyProfile = {
        ...current,
        ...data,
      };

      // Avalia se os campos essenciais estão preenchidos
      const isComplete = Boolean(
        updated.legalName?.trim() &&
        updated.docNumber?.trim() &&
        updated.phone?.trim() &&
        updated.pixKey?.trim() &&
        updated.address?.trim() &&
        updated.city?.trim() &&
        updated.state?.trim()
      );
      updated.isCompleted = isComplete;

      db.agencyProfile = updated;
      await writeDb(db);
      return { success: true, profile: db.agencyProfile as AgencyProfile };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const getPublicOrcamento = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb({ publicAccess: true, locate: { collection: "orcamentos", id } });
      if (!db.orcamentos) db.orcamentos = [];
      const orc = db.orcamentos.find((o: any) => o.id === id || o.numero?.toLowerCase() === id?.toLowerCase());
      if (!orc) return { success: false, error: "Orçamento não encontrado" };
      
      const profile: AgencyProfile = db.agencyProfile || DEFAULT_AGENCY_PROFILE;
      return { 
        success: true, 
        orcamento: orc,
        agencyProfile: profile,
        agency: { 
          name: profile.tradeName || profile.legalName, 
          legalName: profile.legalName,
          tradeName: profile.tradeName,
          founder: profile.representativeName, 
          email: profile.email, 
          phone: profile.phone,
          pix: profile.pixKey,
          pixBeneficiary: profile.pixBeneficiary,
          pixBank: profile.pixBank,
          docNumber: profile.docNumber,
          docType: profile.docType,
          providerType: profile.providerType,
          address: `${profile.address}, ${profile.addressNumber} - ${profile.district}, ${profile.city}/${profile.state}`,
          role: profile.professionalRole,
        } 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const clientApproveOrcamento = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; clientName: string; clientDocument?: string; signature?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb({ publicAccess: true, locate: { collection: "orcamentos", id: data.id } });
      if (!db.orcamentos) db.orcamentos = [];
      const orc = db.orcamentos.find((o: any) => o.id === data.id);
      if (!orc) return { success: false, error: "Orçamento não encontrado" };

      orc.status = "aprovado";
      orc.aprovadoEm = new Date().toISOString();
      (orc as any).clientSignature = {
        name: data.clientName,
        document: data.clientDocument || "Autenticado via IP & Navegador Web",
        signedAt: new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR"),
        ip: "189.40.12.84",
      };

      if (!db.transactions) db.transactions = [];
      const txId = `tx-orc-${Date.now()}`;
      db.transactions.unshift({
        id: txId,
        description: `Receita Aprovada Online: ${orc.numero} - ${orc.titulo}`,
        amount: orc.valor,
        type: "income",
        category: "Serviços",
        date: new Date().toISOString().split("T")[0],
        status: "completed",
        client: data.clientName || orc.cliente,
      });
      orc.transacaoId = txId;

      if (!db.projects) db.projects = [];
      const projId = `proj-orc-${Date.now()}`;
      db.projects.unshift({
        id: projId,
        name: orc.titulo,
        client: data.clientName || orc.cliente,
        budget: orc.valor,
        status: "in_progress",
        deadline: orc.prazoEntrega || "30 dias",
        progress: 10,
      });
      orc.projetoId = projId;

      if (!db.whatsapp) db.whatsapp = [];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      db.whatsapp.push({
        id: `msg-${Date.now()}`,
        contactId: `c_${orc.cliente}`,
        contactName: orc.cliente,
        phone: (orc as any).telefone || "",
        text: `🎉 Parabéns ${data.clientName || orc.cliente}! Recebemos sua assinatura digital na proposta ${orc.numero} ("${orc.titulo}"). Seu projeto já está ativo no SM Hub e nossa equipe iniciou o kickoff!`,
        sender: "automation",
        timestamp: timeStr,
        status: "delivered",
        isAutomation: true
      });

      await writeDb(db, { publicAccess: true });
      return { success: true, orcamento: orc };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export interface FollowUpRecord {
  id: string;
  sentAt: string;
  channel: "whatsapp" | "email";
  message: string;
  stage: "24h" | "48h" | "72h" | "custom";
  aiGenerated: boolean;
}

export const triggerProposalFollowUp = createServerFn({ method: "POST" })
  .inputValidator((payload: { id: string; stage?: "24h" | "48h" | "72h" | "custom"; customText?: string }) => payload)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];
      const orc = db.orcamentos.find((o: any) => o.id === data.id);
      if (!orc) return { success: false, error: "Orçamento não encontrado" };

      const stage = data.stage || "48h";
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const origin = "http://localhost:8080";
      const link = `${origin}/proposta/${orc.id}`;

      const profile: AgencyProfile = db.agencyProfile || DEFAULT_AGENCY_PROFILE;
      const senderSign = profile.representativeName || profile.tradeName || "SM Hub";
      const orgName = profile.tradeName || "SM Hub";

      let text = data.customText;
      if (!text) {
        if (stage === "24h") {
          text = `Olá ${orc.cliente}! Tudo bem? Passando para saber se conseguiu dar uma olhada na proposta comercial do projeto "${orc.titulo}" (${orc.numero}). Caso tenha qualquer dúvida ou queira alinhar detalhes do escopo, estou 100% à disposição! Você pode acessar e aprovar online pelo link seguro: ${link} — ${senderSign}`;
        } else if (stage === "48h") {
          text = `Oi ${orc.cliente}! Como estamos fechando o planejamento de cronograma e início dos projetos desta quinzena, passei para verificar se você tem interesse em garantir a vaga para "${orc.titulo}". O valor acordado foi de R$ ${orc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com condições especiais. Veja os detalhes e formalize aqui: ${link} — ${orgName}`;
        } else {
          text = `Olá ${orc.cliente}, tudo bem? Nossa equipe reservou a agenda técnica para a execução de "${orc.titulo}". Como a proposta ${orc.numero} tem validade limitada até ${orc.validadeAte || "os próximos dias"}, recomendo formalizar pelo link para não perder as condições: ${link}`;
        }
      }

      if (!db.whatsapp) db.whatsapp = [];
      const msg = {
        id: `msg-fu-${Date.now()}`,
        contactId: `c_${orc.cliente}`,
        contactName: orc.cliente,
        phone: profile.phone || (orc as any).telefone || "",
        text,
        sender: "automation" as const,
        timestamp: timeStr,
        status: "delivered" as const,
        isAutomation: true,
      };
      db.whatsapp.push(msg);

      if (!orc.followUps) orc.followUps = [];
      const fuRecord: FollowUpRecord = {
        id: `fu-${Date.now()}`,
        sentAt: `${now.toLocaleDateString('pt-BR')} às ${timeStr}`,
        channel: "whatsapp",
        message: text,
        stage,
        aiGenerated: true,
      };
      orc.followUps.unshift(fuRecord);

      await writeDb(db);
      return { 
        success: true, 
        orcamento: orc, 
        message: msg, 
        followUp: fuRecord,
        orcamentos: db.orcamentos 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const autoRunPendingFollowUps = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.orcamentos) db.orcamentos = [...DEFAULT_ORCAMENTOS];
    const profile: AgencyProfile = db.agencyProfile || DEFAULT_AGENCY_PROFILE;
    const orgName = profile.tradeName || "SM Hub";
    const pending = db.orcamentos.filter((o: any) => o.status === "enviado");
    let count = 0;

    for (const orc of pending) {
      const hasRecent = orc.followUps && orc.followUps.length > 0;
      if (!hasRecent) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const link = `http://localhost:8080/proposta/${orc.id}`;
        const text = `Olá ${orc.cliente}! O agente comercial IA da ${orgName} identificou que a proposta ${orc.numero} ("${orc.titulo}") está aguardando sua assinatura. Para liberar o início do cronograma sem atrasos, basta acessar o link: ${link}`;

        if (!db.whatsapp) db.whatsapp = [];
        db.whatsapp.push({
          id: `msg-fu-auto-${Date.now()}-${count}`,
          contactId: `c_${orc.cliente}`,
          contactName: orc.cliente,
          phone: profile.phone || (orc as any).telefone || "",
          text,
          sender: "automation",
          timestamp: timeStr,
          status: "delivered",
          isAutomation: true,
        });

        if (!orc.followUps) orc.followUps = [];
        orc.followUps.unshift({
          id: `fu-auto-${Date.now()}-${count}`,
          sentAt: `${now.toLocaleDateString('pt-BR')} às ${timeStr}`,
          channel: "whatsapp",
          message: text,
          stage: "48h",
          aiGenerated: true,
        });
        count++;
      }
    }

    await writeDb(db);
    return { success: true, count, orcamentos: db.orcamentos };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Telemetria de visualização de propostas em tempo real
export const trackProposalView = createServerFn({ method: "POST" })
  .inputValidator((params: { id: string; userAgent?: string }) => params)
  .handler(async ({ data: { id, userAgent } }) => {
    try {
      const db = await readDb({ publicAccess: true, locate: { collection: "orcamentos", id } });
      if (!db.orcamentos) db.orcamentos = [];
      const orc = db.orcamentos.find((o: any) => o.id === id);
      if (!orc) return { success: false, error: "Orçamento não encontrado" };

      const now = new Date();
      const nowIso = now.toISOString();
      const previousLastView = orc.lastViewedAt;
      
      orc.viewsCount = (orc.viewsCount || 0) + 1;
      if (!orc.firstViewedAt) orc.firstViewedAt = nowIso;
      orc.lastViewedAt = nowIso;

      // Se for a primeira vez ou tiver passado mais de 10 minutos desde a última visualização
      const isNewSession = !previousLastView || (now.getTime() - new Date(previousLastView).getTime() > 10 * 60 * 1000);

      let notified = false;
      if (isNewSession && orc.status !== "aprovado") {
        if (!db.notifications) db.notifications = [];
        db.notifications.unshift({
          id: `notif-view-${Date.now()}`,
          type: "proposal_viewed",
          title: `🔥 ${orc.cliente} abriu sua proposta agora!`,
          message: `A proposta "${orc.titulo}" (${orc.numero}) está sendo visualizada neste instante. Aproveite o momento para tirar dúvidas no WhatsApp.`,
          timestamp: nowIso,
          read: false,
          link: `/propostas`
        });
        notified = true;
      }

      await writeDb(db, { publicAccess: true });
      return { 
        success: true, 
        viewsCount: orc.viewsCount, 
        lastViewedAt: orc.lastViewedAt,
        notified
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });


