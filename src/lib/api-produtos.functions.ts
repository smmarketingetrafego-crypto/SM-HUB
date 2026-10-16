import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive.server";

export const INITIAL_PRODUCTS = [
  {
    id: "prod-1",
    name: "Gestão de Tráfego Pago (Meta Ads & Google)",
    desc: "Criação de campanhas, otimização de ROAS, relatórios semanais e pixel tracking.",
    price: 2500,
    category: "Serviço",
    active: true
  },
  {
    id: "prod-2",
    name: "Identidade Visual & Branding Completo",
    desc: "Manual da marca, paleta de cores, tipografia e pacote de logos em alta resolução.",
    price: 4500,
    category: "Serviço",
    active: true
  },
  {
    id: "prod-3",
    name: "Desenvolvimento de Landing Page de Alta Conversão",
    desc: "Design responsivo, copy persuasiva e integração com CRM e WhatsApp.",
    price: 1800,
    category: "Serviço",
    active: true
  },
  {
    id: "prod-4",
    name: "Produção de Conteúdo & Vídeos Reels (12 vídeos/mês)",
    desc: "Roteirização, edição dinâmica com legendas e artes para feed/stories.",
    price: 3200,
    category: "Serviço",
    active: true
  },
  {
    id: "prod-5",
    name: "Consultoria Estratégica de Vendas & Processos",
    desc: "Diagnóstico completo, funil de prospecção e treinamento da equipe de vendas.",
    price: 5000,
    category: "Serviço",
    active: true
  },
  {
    id: "prod-6",
    name: "Licença de Agente de IA para Atendimento WhatsApp",
    desc: "Software de atendimento inteligente 24/7 integrado com banco de dados.",
    price: 997,
    category: "Produto",
    active: true
  },
  {
    id: "prod-7",
    name: "Kit de Contratos Jurídicos & Modelos de Briefing",
    desc: "Templates prontos em conformidade com o Art. 442-B da CLT para agências.",
    price: 397,
    category: "Produto",
    active: true
  }
];

export const getProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const db = await readDb();
      if (!db.products || db.products.length <= 1) {
        db.products = [...INITIAL_PRODUCTS];
        await writeDb(db);
      }
      return db.products || [];
    } catch (e: any) {
      console.error(e);
      return INITIAL_PRODUCTS;
    }
  });

export const addProduct = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.products) db.products = [];
      const newProduct = { ...data, id: Date.now().toString() };
      db.products.push(newProduct);
      await writeDb(db);
      return { success: true, product: newProduct };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.products) return { success: false, error: "No products found" };
      const index = db.products.findIndex((p: any) => p.id === data.id);
      if (index === -1) return { success: false, error: "Product not found" };
      db.products[index] = { ...db.products[index], ...data };
      await writeDb(db);
      return { success: true, product: db.products[index] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.products) return { success: true };
      db.products = db.products.filter((p: any) => p.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
