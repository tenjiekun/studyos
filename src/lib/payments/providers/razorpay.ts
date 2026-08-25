// Razorpay Payment Provider Implementation

import crypto from "crypto";
import {
  PaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  PaymentDetails,
  WebhookVerification,
} from "../provider";

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

function authHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

export class RazorpayProvider implements PaymentProvider {
  name = "razorpay";

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!KEY_ID || !KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        amount: params.plan.price_paise,
        currency: params.plan.currency,
        receipt: params.internalOrderId,
        notes: {
          user_id: params.userId,
          plan_id: params.plan.plan_id,
          internal_order_id: params.internalOrderId,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.description || "Failed to create Razorpay order");
    }

    const order = await response.json();
    return {
      providerOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  }

  async fetchPaymentStatus(providerOrderId: string): Promise<PaymentDetails | null> {
    if (!KEY_ID || !KEY_SECRET) return null;

    const response = await fetch(
      `https://api.razorpay.com/v1/orders/${providerOrderId}/payments`,
      { headers: authHeaders() }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const payments = data.items || [];

    // Find the successful payment
    for (const p of payments) {
      if (p.status === "captured") {
        return {
          providerTransactionId: p.id,
          orderId: p.order_id,
          amount: p.amount,
          currency: p.currency,
          method: p.method,
          status: "successful",
          fee: p.fee || 0,
          tax: p.tax || 0,
          net: p.amount - (p.fee || 0) - (p.tax || 0),
        };
      }
    }

    // Return pending if order exists but no captured payment
    if (payments.length > 0) {
      const latest = payments[0];
      return {
        providerTransactionId: latest.id,
        orderId: latest.order_id,
        amount: latest.amount,
        currency: latest.currency,
        method: latest.method || "upi",
        status: latest.status === "failed" ? "failed" : "pending",
      };
    }

    return null;
  }

  verifyWebhookSignature(
    body: string,
    headers: Record<string, string | null>
  ): WebhookVerification {
    const signature = headers["x-razorpay-signature"];

    if (!WEBHOOK_SECRET || !signature) {
      return { verified: false, eventType: "", eventId: "", payload: {} };
    }

    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return { verified: false, eventType: "", eventId: "", payload: {} };
    }

    const payload = JSON.parse(body);
    return {
      verified: true,
      eventType: payload.event || "",
      eventId: payload.payload?.payment?.entity?.id || payload.event + "_" + Date.now(),
      payload,
    };
  }

  async getOrderPayments(providerOrderId: string): Promise<PaymentDetails[]> {
    if (!KEY_ID || !KEY_SECRET) return [];

    const response = await fetch(
      `https://api.razorpay.com/v1/orders/${providerOrderId}/payments`,
      { headers: authHeaders() }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.items || []).map((p: Record<string, unknown>) => ({
      providerTransactionId: p.id as string,
      orderId: p.order_id as string,
      amount: p.amount as number,
      currency: p.currency as string,
      method: p.method as string,
      status: p.status === "captured" ? "successful" as const : p.status === "failed" ? "failed" as const : "pending" as const,
      fee: p.fee as number || 0,
      tax: p.tax as number || 0,
      net: (p.amount as number) - (p.fee as number || 0) - (p.tax as number || 0),
    }));
  }
}
