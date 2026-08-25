// Razorpay payment integration for Community Pro
// This file contains server-side Razorpay SDK helpers

import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

export const PRO_PLAN = {
  price_paise: 4900,
  currency: "INR",
  duration_days: 30,
  entitlement: "community_pro",
} as const;

// ===== Server-side Razorpay helpers =====

/**
 * Create a Razorpay order for ₹49 Community Pro purchase
 */
export async function createRazorpayOrder(userId: string) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not configured");
  }

  const receipt = `pro_${userId.slice(0, 8)}_${Date.now()}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: PRO_PLAN.price_paise,
      currency: PRO_PLAN.currency,
      receipt,
      notes: {
        user_id: userId,
        plan: "community_pro",
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.description || "Failed to create Razorpay order");
  }

  return response.json();
}

/**
 * Verify Razorpay payment signature after checkout
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) return false;

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchRazorpayPayment(paymentId: string) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not configured");
  }

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch payment details");
  }

  return response.json();
}
