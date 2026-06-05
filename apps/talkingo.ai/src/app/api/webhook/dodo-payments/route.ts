import { Webhooks } from "@dodopayments/nextjs";

// IMPORTANT: Webhook signature verification is handled by the adapter.
// Ensure DODO_PAYMENTS_WEBHOOK_SECRET is set in your environment (test mode first).
const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_SECRET!;
if (!webhookKey) {
  console.warn(
    "[DodoPayments] Missing DODO_PAYMENTS_WEBHOOK_SECRET. Set it in your .env for webhook signature verification."
  );
}

export const POST = Webhooks({
  webhookKey,
  onPayload: async (payload) => {
    console.log("[DodoPayments] Webhook received:", payload.type);
  },

  // Payments
  onPaymentSucceeded: async (payload) => {
    console.log("[DodoPayments] Payment Succeeded:", { data: payload.data });
  },
  onPaymentFailed: async (payload) => {
    console.log("[DodoPayments] Payment Failed:", { data: payload.data });
  },
  onPaymentProcessing: async (payload) => {
    console.log("[DodoPayments] Payment Processing:", { data: payload.data });
  },
  onPaymentCancelled: async (payload) => {
    console.log("[DodoPayments] Payment Cancelled:", { data: payload.data });
  },

  // Refunds
  onRefundSucceeded: async (payload) => {
    console.log("[DodoPayments] Refund Succeeded:", { data: payload.data });
  },
  onRefundFailed: async (payload) => {
    console.log("[DodoPayments] Refund Failed:", { data: payload.data });
  },

  // Subscriptions
  onSubscriptionActive: async (payload) => {
    console.log("[DodoPayments] Subscription Active:", { data: payload.data });
  },
  onSubscriptionRenewed: async (payload) => {
    console.log("[DodoPayments] Subscription Renewed:", { data: payload.data });
  },
  onSubscriptionPlanChanged: async (payload) => {
    console.log("[DodoPayments] Subscription Plan Changed:", { data: payload.data });
  },
  onSubscriptionCancelled: async (payload) => {
    console.log("[DodoPayments] Subscription Cancelled:", { data: payload.data });
  },
  onSubscriptionFailed: async (payload) => {
    console.log("[DodoPayments] Subscription Failed:", { data: payload.data });
  },
  onSubscriptionExpired: async (payload) => {
    console.log("[DodoPayments] Subscription Expired:", { data: payload.data });
  },
  onSubscriptionUpdated: async (payload) => {
    console.log("[DodoPayments] Subscription Updated:", { data: payload.data });
  },
});