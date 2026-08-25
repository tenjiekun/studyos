// Simplified Razorpay helper — direct API calls

import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

function authHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

export async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("Razorpay credentials not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes || {},
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.description || "Failed to create Razorpay order");
  }

  return response.json();
}

export async function fetchRazorpayPayments(orderId: string) {
  if (!KEY_ID || !KEY_SECRET) return [];

  const response = await fetch(
    `https://api.razorpay.com/v1/orders/${orderId}/payments`,
    { headers: authHeaders() }
  );

  if (!response.ok) return [];
  const data = await response.json();
  return data.items || [];
}

export function verifyRazorpaySignature(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expected === signature;
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expected === signature;
}

export { KEY_ID };
