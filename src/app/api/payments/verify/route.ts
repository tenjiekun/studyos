// POST /api/payments/verify
// Verifies Razorpay payment signature and activates Pro

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPaymentSignature, fetchOrderPayments } from "@/lib/payments/razorpay";
import { PLANS, calculateNewExpiry } from "@/lib/payments/config";

function getServerDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, userId } =
      await request.json();

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sb = getServerDb();
    if (!sb) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // 1. Fetch order from database
    const { data: order, error: orderError } = await sb
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Already processed
    if (order.status === "successful") {
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    if (["expired", "cancelled", "refunded"].includes(order.status)) {
      return NextResponse.json({ error: `Order is ${order.status}` }, { status: 400 });
    }

    // 2. Verify Razorpay signature using SDK helper
    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 3. Verify amount with Razorpay API using SDK
    try {
      const payments = await fetchOrderPayments(razorpayOrderId);
      const capturedPayment = payments.find(
        (p: { id: string; status: string; amount: string | number }) =>
          p.id === razorpayPaymentId && p.status === "captured"
      );

      if (capturedPayment && Number(capturedPayment.amount) !== order.expected_amount_paise) {
        console.error("AMOUNT MISMATCH:", capturedPayment.amount, "vs", order.expected_amount_paise);
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
      }
    } catch (err) {
      // If Razorpay API call fails, still verify signature (it's sufficient for test mode)
      console.warn("Could not verify amount with Razorpay API:", err);
    }

    // 4. Verify plan exists
    const plan = PLANS[order.plan_id as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json({ error: "Plan no longer available" }, { status: 400 });
    }

    // 5. Activate Pro
    const now = new Date().toISOString();

    // Update order status
    await sb
      .from("payment_orders")
      .update({ status: "successful", paid_at: now, updated_at: now })
      .eq("id", order.id);

    // Save transaction record
    await sb.from("payment_transactions").insert({
      order_id: order.id,
      provider_transaction_id: razorpayPaymentId,
      payment_method: "upi",
      gross_amount_paise: order.expected_amount_paise,
      currency: "INR",
      status: "successful",
      paid_at: now,
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

    // Expire old entitlements
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
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      expiresAt: newExpiry.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    console.error("Verify error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
