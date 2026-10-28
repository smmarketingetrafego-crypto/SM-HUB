import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive";

export interface MetaAdAccount {
  account_id: string;
  name: string;
  currency: string;
  active: boolean;
}

export const getMetaConnection = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    const meta = db.integrations?.meta;
    return {
      connected: !!meta?.connected,
      accountName: meta?.accountName || "Meta Business Agência",
      accounts: (meta?.accounts || [
        { account_id: "act_1029384756", name: "SM Tráfego — Principal", currency: "BRL", active: true },
        { account_id: "act_8837261540", name: "Campanhas Clientes — Vendas", currency: "BRL", active: true },
      ]) as MetaAdAccount[],
    };
  } catch {
    return { connected: false, accounts: [] };
  }
});

export const startMetaOAuth = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const db = await readDb();
    if (!db.integrations) db.integrations = {};
    db.integrations.meta = {
      connected: true,
      accountName: "SM Tráfego Meta Business",
      connectedAt: new Date().toISOString(),
      accounts: [
        { account_id: "act_1029384756", name: "SM Tráfego — Principal", currency: "BRL", active: true },
        { account_id: "act_8837261540", name: "Campanhas Clientes — Vendas", currency: "BRL", active: true },
      ],
    };
    await writeDb(db);
    return { success: true, url: "" };
  } catch {
    return { success: false, url: "" };
  }
});

export const listMetaAdAccounts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    return db.integrations?.meta?.accounts || [
      { account_id: "act_1029384756", name: "SM Tráfego — Principal", currency: "BRL", active: true },
      { account_id: "act_8837261540", name: "Campanhas Clientes — Vendas", currency: "BRL", active: true },
    ];
  } catch {
    return [];
  }
});

export const setMetaAccountLinked = createServerFn({ method: "POST" })
  .validator((data: { accountId: string; active: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.integrations) db.integrations = {};
      if (!db.integrations.meta) db.integrations.meta = { connected: true, accounts: [] };
      const accounts = db.integrations.meta.accounts || [];
      const acc = accounts.find((a: any) => a.account_id === data.accountId);
      if (acc) {
        acc.active = data.active;
      }
      await writeDb(db);
      return { success: true };
    } catch {
      return { success: false };
    }
  });

export const disconnectMeta = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const db = await readDb();
    if (db.integrations?.meta) {
      db.integrations.meta.connected = false;
      await writeDb(db);
    }
    return { success: true };
  } catch {
    return { success: false };
  }
});
