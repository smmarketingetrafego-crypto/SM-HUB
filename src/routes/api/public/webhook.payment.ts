import { createFileRoute } from "@tanstack/react-router";
import { handleAsaasEvent } from "@/lib/api-webhooks.functions";

export const Route = createFileRoute("/api/public/webhook/payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Asaas sends the token configured in its webhook settings in this header.
        const expected = process.env["ASAAS_WEBHOOK_TOKEN"];
        const given = request.headers.get("asaas-access-token") || "";
        if (!expected || given !== expected) return new Response("Unauthorized", { status: 401 });
        try {
          const body = await request.json();
          const res = await handleAsaasEvent(body);
          return Response.json(res);
        } catch (err: any) {
          console.error("Asaas webhook error:", err);
          return Response.json({ success: false, error: err.message }, { status: 500 });
        }
      },
    },
  },
});
