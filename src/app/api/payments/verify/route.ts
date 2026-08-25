import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature, PRO_PLAN } from "@/lib/payments/razorpay";
import { calculateNewExpiry } from "@/lib/payments/entitlements";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role for entitlement management
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, userId } =
      await request.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify signature
    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 2. Check for duplicate payment (idempotency)
    const { data: existingPayment } = await sb
      .from("payments")
      .select("id, status")
      .eq("provider_payment_id", razorpayPaymentId)
      .maybeSingle();

    if (existingPayment && existingPayment.status === "successful") {
      // Already processed — return existing entitlement
      const { data: entitlement } = await sb
        .from("user_entitlements")
        .select("expires_at")
        .eq("user_id", userId)
        .eq("entitlement", PRO_PLAN.entitlement)
        .eq("status", "active")
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        expiresAt: entitlement?.expires_at,
      });
    }

    // 3. Save payment record
    const paymentData = {
      user_id: userId,
      provider: "razorpay",
      provider_payment_id: razorpayPaymentId,
      provider_order_id: razorpayOrderId,
      amount: PRO_PLAN.price_paise,
      currency: PRO_PLAN.currency,
      status: "successful",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let paymentId: string;
    if (existingPayment) {
      // Update the existing pending record
      await sb
        .from("payments")
        .update(paymentData)
        .eq("id", existingPayment.id);
      paymentId = existingPayment.id;
    } else {
      const { data: newPayment, error: paymentError } = await sb
        .from("payments")
        .insert(paymentData)
        .select("id")
        .single();

      if (paymentError) {
        console.error("Payment insert error:", paymentError);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
      }
      paymentId = newPayment.id;
    }

    // 4. Check current expiry and extend
    const { data: currentEntitlement } = await sb
      .from("user_entitlements")
      .select("expires_at")
      .eq("user_id", userId)
      .eq("entitlement", PRO_PLAN.entitlement)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newExpiry = calculateNewExpiry(currentEntitlement?.expires_at || null);

    // 5. Create/update entitlement
    const entitlementData = {
      user_id: userId,
      entitlement: PRO_PLAN.entitlement,
      starts_at: currentEntitlement?.expires_at && new Date(currentEntitlement.expires_at) > new Date()
        ? currentEntitlement.expires_at
        : new Date().toISOString(),
      expires_at: newExpiry.toISOString(),
      status: "active",
      source_payment_id: paymentId,
      updated_at: new Date().toISOString(),
    };

    // Expire any old active entitlements first
    await sb
      .from("user_entitlements")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("entitlement", PRO_PLAN.entitlement)
      .eq("status", "active");

    const { error: entitlementError } = await sb
      .from("user_entitlements")
      .insert(entitlementData);

    if (entitlementError) {
      console.error("Entitlement insert error:", entitlementError);
      return NextResponse.json({ error: "Failed to activate Pro" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expiresAt: newExpiry.toISOString(),
      daysRemaining: PRO_PLAN.duration_days,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    console.error("Verify payment error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
