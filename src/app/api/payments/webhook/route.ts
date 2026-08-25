// POST /api/payments/webhook
// Razorpay webhook — verifies signature and activates Pro

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { PLANS, calculateNewExpiry } from "@/lib/payments/config";
import crypto from "crypto";

function getServerDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // 1. Verify webhook signature using SDK helper
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event || "";

    const sb = getServerDb();
    if (!sb) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // 2. Idempotency — check if already processed
    const eventId = event.id || `${eventType}_${Date.now()}`;
    const { data: existing } = await sb
      .from("payment_webhook_events")
      .select("id")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record webhook event
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    await sb.from("payment_webhook_events").insert({
      provider: "razorpay",
      provider_event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      status: "received",
    });

    // 3. Handle payment.captured
    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ received: true });

      const providerOrderId = payment.order_id;
      const providerTxId = payment.id;
      const userId = payment.notes?.user_id;
      const amount = payment.amount;
      const method = payment.method;

      if (!userId || !providerOrderId) return NextResponse.json({ received: true });

      // Find order
      const { data: order } = await sb
        .from("payment_orders")
        .select("*")
        .eq("provider_order_id", providerOrderId)
        .eq("user_id", userId)
        .single();

      if (!order || order.status === "successful") {
        return NextResponse.json({ received: true });
      }

      // Verify amount
      if (amount !== order.expected_amount_paise) {
        console.error("AMOUNT MISMATCH:", amount, "vs", order.expected_amount_paise);
        return NextResponse.json({ received: true });
      }

      const now = new Date().toISOString();

      // Update order
      await sb
        .from("payment_orders")
        .update({ status: "successful", paid_at: now, updated_at: now })
        .eq("id", order.id);

      // Create transaction
      await sb.from("payment_transactions").insert({
        order_id: order.id,
        provider_transaction_id: providerTxId,
        payment_method: method,
        gross_amount_paise: amount,
        provider_fee_paise: payment.fee || 0,
        tax_on_fee_paise: payment.tax || 0,
        net_settlement_paise: amount - (payment.fee || 0) - (payment.tax || 0),
        currency: "INR",
        status: "successful",
        paid_at: now,
      });

      // Update webhook event
      await sb
        .from("payment_webhook_events")
        .update({ status: "verified", order_id: order.id, processed_at: now })
        .eq("provider_event_id", eventId);

      // Activate Pro
      const plan = PLANS[order.plan_id as keyof typeof PLANS];
      if (plan) {
        const { data: currentEnt } = await sb
          .from("user_entitlements")
          .select("expires_at")
          .eq("user_id", userId)
          .eq("entitlement", plan.plan_id)
          .eq("status", "active")
          .gt("expires_at", now)
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const newExpiry = calculateNewExpiry(currentEnt?.expires_at || null);

        await sb
          .from("user_entitlements")
          .update({ status: "expired", updated_at: now })
          .eq("user_id", userId)
          .eq("entitlement", plan.plan_id)
          .eq("status", "active");

        await sb.from("user_entitlements").insert({
          user_id: userId,
          entitlement: plan.plan_id,
          starts_at:
            currentEnt?.expires_at && new Date(currentEnt.expires_at) > new Date()
              ? currentEnt.expires_at
              : now,
          expires_at: newExpiry.toISOString(),
          status: "active",
          source_payment_id: order.id,
        });
      }
    }

    // 4. Handle payment.failed
    if (eventType === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        await sb
          .from("payment_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("provider_order_id", payment.order_id);

        await sb
          .from("payment_webhook_events")
          .update({ status: "verified", processed_at: new Date().toISOString() })
          .eq("provider_event_id", eventId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook error";
    console.error("Webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
