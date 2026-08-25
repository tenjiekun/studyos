// POST /api/payments/webhook
// Razorpay webhook — authoritative payment verification
// SECURITY: Verify signature, check amount, prevent duplicate processing

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/payments/server-db";
import { RazorpayProvider } from "@/lib/payments/providers/razorpay";
import { PLANS, calculateNewExpiry } from "@/lib/payments/config";
import { logPaymentEvent } from "@/lib/payments/audit";
import crypto from "crypto";

const razorpay = new RazorpayProvider();

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // 1. Verify webhook signature
    const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    if (!WEBHOOK_SECRET || !signature) {
      console.error("Missing webhook secret or signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const expectedSig = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expectedSig !== signature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event || "";
    const eventId = event.id || `${eventType}_${Date.now()}`;

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // 2. Idempotency check — never process the same event twice
    const { data: existingEvent } = await sb
      .from("payment_webhook_events")
      .select("id, status")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // 3. Record webhook event
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");

    await sb.from("payment_webhook_events").insert({
      provider: "razorpay",
      provider_event_id: eventId,
      event_type: eventType,
      payload_hash: payloadHash,
      status: "received",
    });

    // 4. Handle payment.captured (successful)
    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) {
        return NextResponse.json({ received: true });
      }

      const providerOrderId = payment.order_id;
      const providerTxId = payment.id;
      const userId = payment.notes?.user_id;
      const method = payment.method;
      const amount = payment.amount;

      if (!userId || !providerOrderId) {
        console.error("Missing userId or orderId in webhook payload");
        return NextResponse.json({ received: true });
      }

      // Find order in database
      const { data: order } = await sb
        .from("payment_orders")
        .select("*")
        .eq("provider_order_id", providerOrderId)
        .eq("user_id", userId)
        .single();

      if (!order) {
        console.error("Order not found for provider order:", providerOrderId);
        await logPaymentEvent({
          userId,
          eventType: "webhook_failed",
          details: { reason: "order_not_found", provider_order_id: providerOrderId },
        });
        return NextResponse.json({ received: true });
      }

      // CRITICAL: Verify amount matches
      if (amount !== order.expected_amount_paise) {
        console.error("AMOUNT MISMATCH in webhook:", amount, "vs", order.expected_amount_paise);
        await logPaymentEvent({
          userId,
          orderId: order.id,
          eventType: "webhook_failed",
          details: {
            reason: "amount_mismatch",
            webhook_amount: amount,
            order_amount: order.expected_amount_paise,
          },
        });
        return NextResponse.json({ received: true });
      }

      // Already processed?
      if (order.status === "successful") {
        return NextResponse.json({ received: true, duplicate: true });
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
        settlement_status: "pending",
        paid_at: now,
      });

      // Update webhook event
      await sb
        .from("payment_webhook_events")
        .update({ status: "verified", order_id: order.id, processed_at: now })
        .eq("provider_event_id", eventId);

      await logPaymentEvent({
        userId,
        orderId: order.id,
        eventType: "webhook_verified",
        details: { transaction_id: providerTxId, amount, method },
      });

      // Activate Pro entitlement
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
          updated_at: now,
        });

        await logPaymentEvent({
          userId,
          orderId: order.id,
          eventType: "entitlement_activated",
          details: { expires_at: newExpiry.toISOString() },
        });
      }
    }

    // 5. Handle payment.failed
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

    // 6. Handle refund
    if (eventType === "payment.refunded") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const { data: order } = await sb
          .from("payment_orders")
          .select("id, user_id, plan_id")
          .eq("provider_order_id", payment.order_id)
          .single();

        if (order) {
          await sb
            .from("payment_orders")
            .update({ status: "refunded", updated_at: new Date().toISOString() })
            .eq("id", order.id);

          await sb
            .from("payment_transactions")
            .update({ status: "refunded" })
            .eq("order_id", order.id);

          // Revoke entitlement
          await sb
            .from("user_entitlements")
            .update({ status: "revoked", updated_at: new Date().toISOString() })
            .eq("user_id", order.user_id)
            .eq("entitlement", order.plan_id)
            .eq("status", "active");

          await logPaymentEvent({
            userId: order.user_id,
            orderId: order.id,
            eventType: "refund_successful",
            details: { amount: payment.amount },
          });
        }

        await sb
          .from("payment_webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
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
