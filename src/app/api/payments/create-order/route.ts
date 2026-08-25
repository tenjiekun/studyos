// POST /api/payments/create-order
// Creates a new payment order server-side with amount protection

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/payments/server-db";
import { PLANS, type PlanId } from "@/lib/payments/config";
import { RazorpayProvider } from "@/lib/payments/providers/razorpay";
import { logPaymentEvent } from "@/lib/payments/audit";

const razorpay = new RazorpayProvider();

export async function POST(request: NextRequest) {
  try {
    const { userId, planId } = await request.json();

    if (!userId || !planId) {
      return NextResponse.json({ error: "userId and planId required" }, { status: 400 });
    }

    // Server-side plan lookup — NEVER trust client amount
    const plan = PLANS[planId as PlanId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!plan.price_paise || plan.price_paise <= 0) {
      return NextResponse.json({ error: "Plan not available" }, { status: 400 });
    }

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Expire any old pending orders for this user
    await sb.rpc("expire_old_orders");

    // Generate internal order number
    const { count } = await sb
      .from("payment_orders")
      .select("id", { count: "exact", head: true });

    const seq = (count || 0) + 1;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `STUDYOS-${dateStr}-${String(seq).padStart(6, "0")}`;

    // Create order record in database
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await sb
      .from("payment_orders")
      .insert({
        user_id: userId,
        order_number: orderNumber,
        plan_id: plan.plan_id,
        expected_amount_paise: plan.price_paise,
        currency: plan.currency,
        provider: "razorpay",
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Log audit event
    await logPaymentEvent({
      userId,
      orderId: order.id,
      eventType: "order_created",
      details: { order_number: orderNumber, plan_id: plan.plan_id, amount: plan.price_paise },
    });

    // Create Razorpay order
    const providerOrder = await razorpay.createOrder({
      userId,
      plan,
      internalOrderId: orderNumber,
    });

    // Update order with provider order ID
    await sb
      .from("payment_orders")
      .update({
        provider_order_id: providerOrder.providerOrderId,
        status: "pending",
        updated_at: now.toISOString(),
      })
      .eq("id", order.id);

    await logPaymentEvent({
      userId,
      orderId: order.id,
      eventType: "checkout_initiated",
      details: { provider_order_id: providerOrder.providerOrderId },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      providerOrderId: providerOrder.providerOrderId,
      amount: plan.price_paise,
      currency: plan.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    console.error("Create order error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
