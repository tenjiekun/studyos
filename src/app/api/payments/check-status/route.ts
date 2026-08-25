// POST /api/payments/check-status
// Poll payment status — used as fallback when webhook is slow

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/payments/server-db";
import { RazorpayProvider } from "@/lib/payments/providers/razorpay";
import { PLANS, type PlanId, calculateNewExpiry } from "@/lib/payments/config";
import { logPaymentEvent } from "@/lib/payments/audit";

const razorpay = new RazorpayProvider();

export async function POST(request: NextRequest) {
  try {
    const { orderId, userId } = await request.json();

    if (!orderId || !userId) {
      return NextResponse.json({ error: "orderId and userId required" }, { status: 400 });
    }

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // Fetch order from database
    const { data: order } = await sb
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If already successful, return cached result
    if (order.status === "successful") {
      return NextResponse.json({
        status: "successful",
        orderNumber: order.order_number,
        paidAt: order.paid_at,
      });
    }

    // If expired or cancelled, return that
    if (["expired", "cancelled", "failed"].includes(order.status)) {
      return NextResponse.json({ status: order.status });
    }

    // Check if order has expired
    if (new Date(order.expires_at) < new Date()) {
      await sb
        .from("payment_orders")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      return NextResponse.json({ status: "expired" });
    }

    // Poll Razorpay for payment status
    if (order.provider_order_id) {
      const paymentDetails = await razorpay.fetchPaymentStatus(order.provider_order_id);

      if (paymentDetails && paymentDetails.status === "successful") {
        // Verify amount matches
        if (paymentDetails.amount !== order.expected_amount_paise) {
          console.error("Amount mismatch:", paymentDetails.amount, "expected:", order.expected_amount_paise);
          await logPaymentEvent({
            userId,
            orderId: order.id,
            eventType: "webhook_failed",
            details: { reason: "amount_mismatch", received: paymentDetails.amount, expected: order.expected_amount_paise },
          });
          return NextResponse.json({ status: "amount_mismatch" });
        }

        // Payment successful — activate Pro
        await activatePro(sb, order, paymentDetails);

        return NextResponse.json({
          status: "successful",
          orderNumber: order.order_number,
          paidAt: order.paid_at,
        });
      }

      if (paymentDetails && paymentDetails.status === "failed") {
        await sb
          .from("payment_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId);

        return NextResponse.json({ status: "failed" });
      }
    }

    return NextResponse.json({ status: "pending" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Status check failed";
    console.error("Check status error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function activatePro(
  sb: Awaited<ReturnType<typeof getServerSupabase>>,
  order: { id: string; user_id: string; plan_id: string; order_number: string },
  paymentDetails: { providerTransactionId: string; method: string; fee?: number; tax?: number; net?: number; amount: number }
) {
  if (!sb) return;

  const plan = PLANS[order.plan_id as keyof typeof PLANS];
  if (!plan) return;

  // 1. Update order status
  await sb
    .from("payment_orders")
    .update({
      status: "successful",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // 2. Create transaction record
  await sb.from("payment_transactions").insert({
    order_id: order.id,
    provider_transaction_id: paymentDetails.providerTransactionId,
    payment_method: paymentDetails.method,
    gross_amount_paise: paymentDetails.amount,
    provider_fee_paise: paymentDetails.fee || 0,
    tax_on_fee_paise: paymentDetails.tax || 0,
    net_settlement_paise: paymentDetails.net || paymentDetails.amount,
    currency: "INR",
    status: "successful",
    settlement_status: "pending",
    paid_at: new Date().toISOString(),
  });

  await logPaymentEvent({
    userId: order.user_id,
    orderId: order.id,
    eventType: "payment_successful",
    details: {
      transaction_id: paymentDetails.providerTransactionId,
      method: paymentDetails.method,
      gross: paymentDetails.amount,
      fee: paymentDetails.fee,
    },
  });

  // 3. Check existing entitlement for early renewal
  const { data: currentEnt } = await sb
    .from("user_entitlements")
    .select("expires_at")
    .eq("user_id", order.user_id)
    .eq("entitlement", plan.plan_id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newExpiry = calculateNewExpiry(currentEnt?.expires_at || null);

  // 4. Expire old entitlements
  await sb
    .from("user_entitlements")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", order.user_id)
    .eq("entitlement", plan.plan_id)
    .eq("status", "active");

  // 5. Create new entitlement
  await sb.from("user_entitlements").insert({
    user_id: order.user_id,
    entitlement: plan.plan_id,
    starts_at:
      currentEnt?.expires_at && new Date(currentEnt.expires_at) > new Date()
        ? currentEnt.expires_at
        : new Date().toISOString(),
    expires_at: newExpiry.toISOString(),
    status: "active",
    source_payment_id: order.id,
    updated_at: new Date().toISOString(),
  });

  await logPaymentEvent({
    userId: order.user_id,
    orderId: order.id,
    eventType: "entitlement_activated",
    details: {
      expires_at: newExpiry.toISOString(),
      extended_from: currentEnt?.expires_at || null,
    },
  });
}
