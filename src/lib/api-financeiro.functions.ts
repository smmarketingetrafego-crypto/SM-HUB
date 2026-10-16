import { createServerFn } from "@tanstack/react-start";
import { readDb, writeDb } from "./db-drive.server";

export const getTransactions = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await readDb();
    return db.transactions || [];
  } catch (e) {
    console.error("Failed to read DB:", e);
    return [];
  }
});

export const addTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.transactions) db.transactions = [];
      const newTx = { id: Date.now().toString(), ...data };
      db.transactions.push(newTx);
      await writeDb(db);
      return { success: true, transaction: newTx };
    } catch (e: any) {
      console.error("Failed to write to DB:", e);
      return { success: false, error: e.message };
    }
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const db = await readDb();
      if (!db.transactions) return { success: true };
      db.transactions = db.transactions.filter((tx: any) => tx.id !== id);
      await writeDb(db);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    try {
      const db = await readDb();
      if (!db.transactions) return { success: false, error: "No transactions found" };
      const index = db.transactions.findIndex((tx: any) => tx.id === data.id);
      if (index === -1) return { success: false, error: "Transaction not found" };
      db.transactions[index] = { ...db.transactions[index], ...data };
      await writeDb(db);
      return { success: true, transaction: db.transactions[index] };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });
