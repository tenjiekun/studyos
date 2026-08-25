// Razorpay SDK integration — official package

import Razorpay from "razorpay";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

// Lazily initialized Razorpay instance
let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpay) {
    if (!KEY_ID || !KEY_SECRET) {
      throw new Error("Razorpay credentials not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local");
    }
    razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }
  return razorpay;
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(params: {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const instance = getRazorpay();

  const order = await instance.orders.create({
    amount: params.amount, // in paise
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes || {},
  });

  return order;
}

/**
 * Fetch payments for a Razorpay order
 */
export async function fetchOrderPayments(orderId: string) {
  const instance = getRazorpay();
  const result = await instance.orders.fetchPayments(orderId);
  return result.items || [];
}

/**
 * Fetch a specific Razorpay payment
 */
export async function fetchPayment(paymentId: string) {
  const instance = getRazorpay();
  const payment = await instance.payments.fetch(paymentId);
  return payment;
}

/**
 * Verify Razorpay payment signature
 * HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!KEY_SECRET) return false;

  const body = orderId + "|" + paymentId;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(body)
    .digest("hex");

  return expected === signature;
}

/**
 * Verify Razorpay webhook signature
 */
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
