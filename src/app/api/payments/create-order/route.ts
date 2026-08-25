// POST /api/payments/create-order
// Creates Razorpay order — server-side amount protection

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { PLANS } from "@/lib/payments/config";

function getServerDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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

    const sb = getServerDb();
    if (!sb) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Generate internal order number
    const { count } = await sb
      .from("payment_orders")
      .select("id", { count: "exact", head: true });

    const seq = (count || 0) + 1;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `STUDYOS-${dateStr}-${String(seq).padStart(6, "0")}`;

    // Create order in database
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

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

    // Create Razorpay order using SDK
    const rzpOrder = await createRazorpayOrder({
      amount: plan.price_paise,
      currency: plan.currency,
      receipt: orderNumber,
      notes: { user_id: userId, plan_id: plan.plan_id },
    });

    // Update order with Razorpay order ID
    await sb
      .from("payment_orders")
      .update({ provider_order_id: rzpOrder.id, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      providerOrderId: rzpOrder.id,
      amount: plan.price_paise,
      currency: plan.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      expiresAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    console.error("Create order error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
