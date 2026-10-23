import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(20).max(4096), userAgent: z.string().max(300).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_tokens").upsert({
      token: data.token,
      user_id: context.userId,
      user_agent: data.userAgent ?? "",
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("Não foi possível registrar este aparelho.");
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPush } = await import("./push.server");
    await sendPush([context.userId], { title: "SM Hub", body: "Teste: os avisos estão chegando neste aparelho.", link: "/" });
    return { ok: true };
  });
