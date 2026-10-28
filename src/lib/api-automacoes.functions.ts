import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "lead_created" | "lead_won" | "lead_lost" | "task_completed" | "invoice_pending";
  triggerLabel: string;
  action: "whatsapp" | "email" | "notification" | "move_stage";
  actionLabel: string;
  targetTemplate?: string;
  active: boolean;
  executionsCount: number;
  lastExecutedAt?: string;
}

export interface WhatsAppMessage {
  id: string;
  contactId: string;
  contactName: string;
  phone: string;
  text: string;
  sender: "me" | "contact" | "automation";
  timestamp: string;
  status: "sent" | "delivered" | "read";
  isAutomation?: boolean;
}

export const DEFAULT_AUTOMATIONS: AutomationRule[] = [];

export const DEFAULT_WHATSAPP_MESSAGES: WhatsAppMessage[] = [];

export const getAutomations = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.automations || !Array.isArray(db.automations) || db.automations.length === 0) {
      db.automations = DEFAULT_AUTOMATIONS;
      await writeDb(db);
    }
    return db.automations as AutomationRule[];
  } catch (e: any) {
    console.error("Failed to read automations:", e);
    return DEFAULT_AUTOMATIONS;
  }
});

export const toggleAutomationRule = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.automations) db.automations = [...DEFAULT_AUTOMATIONS];
      const item = db.automations.find((a: any) => a.id === id);
      if (item) {
        item.active = !item.active;
        await writeDb(db);
        return { success: true, rule: item, automations: db.automations };
      }
      return { success: false, error: "Regra não encontrada" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const saveAutomationRule = createServerFn({ method: "POST" })
  .validator((rule: Partial<AutomationRule>) => rule)
  .handler(async ({ data: rule }) => {
    try {
      const db = await readDb();
      if (!db.automations) db.automations = [...DEFAULT_AUTOMATIONS];
      if (rule.id) {
        const idx = db.automations.findIndex((a: any) => a.id === rule.id);
        if (idx !== -1) {
          db.automations[idx] = { ...db.automations[idx], ...rule };
        } else {
          db.automations.push(rule);
        }
      } else {
        const newRule: AutomationRule = {
          id: `auto-${Date.now()}`,
          name: rule.name || "Nova Automação",
          trigger: rule.trigger || "lead_created",
          triggerLabel: rule.triggerLabel || "Gatilho automático",
          action: rule.action || "whatsapp",
          actionLabel: rule.actionLabel || "Ação de disparo",
          targetTemplate: rule.targetTemplate || "",
          active: true,
          executionsCount: 0,
        };
        db.automations.push(newRule);
      }
      await writeDb(db);
      return { success: true, automations: db.automations };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const getWhatsAppMessages = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.whatsapp || !Array.isArray(db.whatsapp)) {
      db.whatsapp = [];
      await writeDb(db);
    }
    // Remove mensagens mockadas legadas
    return (db.whatsapp as WhatsAppMessage[]).filter(m => m.contactName !== "Maria Silva" && m.contactId !== "c_1");
  } catch (e: any) {
    console.error("Failed to read whatsapp messages:", e);
    return [];
  }
});

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .validator((data: { contactId: string; contactName: string; phone?: string; text: string; sender?: "me" | "automation" }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.whatsapp) db.whatsapp = [];

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newMsg: WhatsAppMessage = {
        id: `msg_${Date.now()}`,
        contactId: data.contactId,
        contactName: data.contactName,
        phone: data.phone || "",
        text: data.text,
        sender: data.sender || "me",
        timestamp: timeStr,
        status: "sent",
        isAutomation: data.sender === "automation",
      };

      db.whatsapp.push(newMsg);
      await writeDb(db);
      return { success: true, message: newMsg };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const triggerFunnelAutomation = createServerFn({ method: "POST" })
  .validator((data: { clientName: string; stageName: string; dealValue?: number }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      const automations = db.automations || [];
      const matching = automations.find((a: any) => a.active);
      if (matching) {
        matching.executionsCount = (matching.executionsCount || 0) + 1;
        matching.lastExecutedAt = new Date().toISOString();
        await writeDb(db);
        return { triggered: true, ruleName: matching.name };
      }
      return { triggered: false };
    } catch {
      return { triggered: false };
    }
  });
