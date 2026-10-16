import { createAPIFileRoute } from '@tanstack/react-start/api';
import { processPaymentWebhook } from '@/lib/api-webhooks.server';

export const APIRoute = createAPIFileRoute('/api/public/webhook/payment')({
  GET: async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "SM HUB Payment Webhook Endpoint is active and listening for Asaas and Mercado Pago events.",
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  },

  POST: async ({ request }) => {
    try {
      const body = await request.json();

      let gateway: "asaas" | "mercadopago" | "stripe" = "asaas";
      let event = "PAYMENT_RECEIVED";
      let externalReference = "";
      let paymentId = "";
      let amount: number | undefined = undefined;
      let status: "CONFIRMED" | "RECEIVED" | "PENDING" | "FAILED" = "CONFIRMED";

      // Detect Asaas Webhook
      if (body.event && (body.event.startsWith("PAYMENT_") || body.payment)) {
        gateway = "asaas";
        event = body.event;
        const p = body.payment || {};
        paymentId = p.id || "";
        externalReference = p.externalReference || "";
        amount = p.value;
        status = body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED" ? "CONFIRMED" : "PENDING";
      } 
      // Detect Mercado Pago Webhook
      else if (body.action || body.type === "payment" || body.data?.id) {
        gateway = "mercadopago";
        event = body.action || "payment.updated";
        paymentId = body.data?.id || body.id || "";
        externalReference = body.external_reference || "";
        status = "CONFIRMED";
      }
      // Generic payload
      else {
        externalReference = body.externalReference || body.id || "";
        paymentId = body.paymentId || body.id || "";
        amount = body.amount;
      }

      const res = await processPaymentWebhook({
        data: {
          gateway,
          event,
          externalReference,
          paymentId,
          amount,
          status,
          paidAt: new Date().toISOString(),
          customer: body.customer
        }
      });

      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
});
