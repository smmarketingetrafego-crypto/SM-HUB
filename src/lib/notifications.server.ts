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
  } catch (e) {
    console.error("notifyAccount failed:", e);
  }
});

export function accountOf(db: any): string | undefined {
  return db?.__accountId;
}
