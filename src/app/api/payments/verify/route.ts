// POST /api/payments/verify
// Verifies Razorpay payment signature and activates Pro
// SECURITY: Never trust client amounts — verify from server-side order record

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/payments/server-db";
import { RazorpayProvider } from "@/lib/payments/providers/razorpay";
import { PLANS } from "@/lib/payments/config";
import { logPaymentEvent } from "@/lib/payments/audit";
import { calculateNewExpiry } from "@/lib/payments/config";

const razorpay = new RazorpayProvider();

export async function POST(request: NextRequest) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, userId } =
      await request.json();

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // 1. Fetch order from database — this is the source of truth for amount
    const { data: order, error: orderError } = await sb
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Verify the order is in a valid state
    if (order.status === "successful") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        orderNumber: order.order_number,
      });
    }

    if (["expired", "cancelled", "refunded"].includes(order.status)) {
      return NextResponse.json({ error: `Order is ${order.status}` }, { status: 400 });
    }

    // 3. Verify Razorpay signature
    const isValid = razorpay.verifyWebhookSignature(
      razorpayOrderId + "|" + razorpayPaymentId,
      { "x-razorpay-signature": razorpaySignature }
    );

    if (!isValid.verified) {
      // Try direct HMAC verification as fallback
      const crypto = await import("crypto");
      const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
      const expected = crypto.createHmac("sha256", keySecret)
        .update(razorpayOrderId + "|" + razorpayPaymentId)
        .digest("hex");

      if (expected !== razorpaySignature) {
        await logPaymentEvent({
          userId,
          orderId: order.id,
          eventType: "webhook_failed",
          details: { reason: "invalid_signature", source: "verify_endpoint" },
        });
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }
    }

    // 4. Fetch actual payment from Razorpay to verify amount
    const paymentDetails = await razorpay.fetchPaymentStatus(razorpayOrderId);

    if (!paymentDetails) {
      return NextResponse.json({ error: "Could not verify payment with provider" }, { status: 400 });
    }

    // CRITICAL: Verify amount matches server-side order
    if (paymentDetails.amount !== order.expected_amount_paise) {
      console.error("AMOUNT MISMATCH:", paymentDetails.amount, "vs", order.expected_amount_paise);
      await logPaymentEvent({
        userId,
        orderId: order.id,
        eventType: "webhook_failed",
        details: {
          reason: "amount_mismatch",
          client_reported: razorpayPaymentId,
          server_verified_amount: paymentDetails.amount,
          expected: order.expected_amount_paise,
        },
      });
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    // 5. Verify the plan still exists and is active
    const plan = PLANS[order.plan_id as keyof typeof PLANS];
    if (!plan || !plan.price_paise) {
      return NextResponse.json({ error: "Plan no longer available" }, { status: 400 });
    }

    // 6. Activate Pro
    const now = new Date().toISOString();

    // Update order
    await sb
      .from("payment_orders")
      .update({ status: "successful", paid_at: now, updated_at: now })
      .eq("id", order.id);

    // Create transaction
    await sb.from("payment_transactions").insert({
      order_id: order.id,
      provider_transaction_id: razorpayPaymentId,
      payment_method: paymentDetails.method,
      gross_amount_paise: paymentDetails.amount,
      provider_fee_paise: paymentDetails.fee || 0,
      tax_on_fee_paise: paymentDetails.tax || 0,
      net_settlement_paise: paymentDetails.net || paymentDetails.amount,
      currency: "INR",
      status: "successful",
      settlement_status: "pending",
      paid_at: now,
    });

    await logPaymentEvent({
      userId,
      orderId: order.id,
      eventType: "payment_successful",
      details: {
        transaction_id: razorpayPaymentId,
        method: paymentDetails.method,
        gross: paymentDetails.amount,
        fee: paymentDetails.fee,
      },
    });

    // Check for early renewal
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

    // Expire old
    await sb
      .from("user_entitlements")
      .update({ status: "expired", updated_at: now })
      .eq("user_id", userId)
      .eq("entitlement", plan.plan_id)
      .eq("status", "active");

    // Create new entitlement
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
      details: {
        expires_at: newExpiry.toISOString(),
        extended_from: currentEnt?.expires_at || null,
        plan_id: plan.plan_id,
      },
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      expiresAt: newExpiry.toISOString(),
      daysRemaining: plan.duration_days,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    console.error("Verify error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
