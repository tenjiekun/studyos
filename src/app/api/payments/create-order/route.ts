// POST /api/payments/create-order
// Creates Razorpay order — simplified, no database dependency for order creation

import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { PLANS } from "@/lib/payments/config";

export async function POST(request: NextRequest) {
  try {
    const { userId, planId } = await request.json();

    if (!userId || !planId) {
      return NextResponse.json({ error: "userId and planId required" }, { status: 400 });
    }

    // Server-side plan lookup — NEVER trust client amount
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Generate internal receipt ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const receipt = `STUDYOS-${dateStr}-${Date.now().toString(36).toUpperCase()}`;

    // Create Razorpay order directly
    const rzpOrder = await createRazorpayOrder({
      amount: plan.price_paise,
      currency: plan.currency,
      receipt,
      notes: { user_id: userId, plan_id: plan.plan_id },
    });

    return NextResponse.json({
      orderId: rzpOrder.id,         // Razorpay order ID
      orderNumber: receipt,          // Internal receipt
      providerOrderId: rzpOrder.id,
      amount: plan.price_paise,
      currency: plan.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    console.error("Create order error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
