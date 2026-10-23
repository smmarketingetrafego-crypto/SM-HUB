// Sends push notices to every registered device of the given users. Never throws.
export async function sendPush(userIds: string[], notice: { title: string; body?: string; link?: string }) {
  try {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !connKey || !userIds.length) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("token").in("user_id", userIds);
    const link = notice.link || "/";
    await Promise.allSettled(
      (rows ?? []).map(async ({ token }) => {
        const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: notice.title.slice(0, 200), body: (notice.body ?? "").slice(0, 500) },
              data: { link },
              webpush: { fcm_options: { link }, notification: { icon: "/icon-192.png" } },
            },
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          if (res.status === 404 || (res.status === 400 && txt.includes("INVALID_ARGUMENT")) || txt.includes("UNREGISTERED")) {
            await supabaseAdmin.from("push_tokens").delete().eq("token", token);
          } else console.error(`FCM send failed [${res.status}]: ${txt}`);
        }
      }),
    );
  } catch (e) {
    console.error("sendPush failed:", e);
  }
}
