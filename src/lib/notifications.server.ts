import { createServerOnlyFn } from "@tanstack/react-start";
import { notificationRecipients } from "./notification-rules";

export type NoticeInput = { kind: string; title: string; body?: string; link?: string };

// Records an in-app notice for the account owner and founders. Never throws:
// a failed notice must not break the action that triggered it.
export const notifyAccount = createServerOnlyFn(async (accountId: string | null | undefined, notice: NoticeInput, actorId?: string | null) => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let actor = actorId ?? null;
    if (actorId === undefined) {
      try {
        const { getCaller } = await import("./db-drive");
        actor = (await getCaller()).user.id;
      } catch { actor = null; }
    }
    let owner: string | null = null;
    if (accountId) {
      const { data } = await supabaseAdmin.from("accounts").select("owner_id").eq("id", accountId).maybeSingle();
      owner = data?.owner_id ?? null;
    }
    const { data: founders } = await supabaseAdmin.from("platform_admins").select("user_id");
    const recipients = notificationRecipients(owner, (founders ?? []).map((f) => f.user_id), actor);
    if (!recipients.length) return;
    await supabaseAdmin.from("notifications").insert(
      recipients.map((user_id) => ({
        user_id,
        account_id: accountId ?? null,
        kind: notice.kind,
        title: notice.title.slice(0, 200),
        body: (notice.body ?? "").slice(0, 500),
        link: notice.link ?? "",
      })),
    );
    const { sendPush } = await import("./push.server");
    await sendPush(recipients, notice);
  } catch (e) {
    console.error("notifyAccount failed:", e);
  }
});

export function accountOf(db: any): string | undefined {
  return db?.__accountId;
}

// Finds the signed-in user behind a collaborator e-mail (onboarding link first, then auth).
async function userIdByEmail(admin: any, accountId: string | null | undefined, email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  if (accountId) {
    const { data } = await admin.from("onboarding_journeys").select("user_id").eq("account_id", accountId).ilike("email", e).not("user_id", "is", null).limit(1);
    if (data?.[0]?.user_id) return data[0].user_id;
  }
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const users = data?.users ?? [];
    const hit = users.find((u: any) => (u.email ?? "").toLowerCase() === e);
    if (hit) return hit.id;
    if (users.length < 1000) break;
  }
  return null;
}

// Notifies the collaborator a task was assigned to (matched by name in the account's team). Never throws.
export const notifyAssignee = createServerOnlyFn(async (db: any, assigneeName: string | undefined, notice: NoticeInput) => {
  try {
    const name = (assigneeName ?? "").trim().toLowerCase();
    if (!name) return;
    const colab = (db?.collaborators ?? []).find((c: any) => (c?.name ?? "").trim().toLowerCase() === name);
    if (!colab?.email) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accountId = accountOf(db) ?? null;
    const userId = await userIdByEmail(supabaseAdmin, accountId, colab.email);
    if (!userId) return;
    let actor: string | null = null;
    try { const { getCaller } = await import("./db-drive"); actor = (await getCaller()).user.id; } catch {}
    if (userId === actor) return;
    await supabaseAdmin.from("notifications").insert({
      user_id: userId, account_id: accountId, kind: notice.kind,
      title: notice.title.slice(0, 200), body: (notice.body ?? "").slice(0, 500), link: notice.link ?? "",
    });
    const { sendPush } = await import("./push.server");
    await sendPush([userId], notice);
  } catch (e) {
    console.error("notifyAssignee failed:", e);
  }
});

// Readable summary of a task for notices: priority, due date, assignee and project.
export function taskSummary(t: any): string {
  return [
    t?.priority && `Prioridade ${t.priority}`,
    t?.date && `Prazo ${t.date}`,
    t?.assignee?.name && `Responsável: ${t.assignee.name}`,
    t?.project && `Projeto: ${t.project}`,
  ].filter(Boolean).join(" · ");
}
