// POST /api/payments/verify
// Verifies Razorpay payment signature and activates Pro
// Simplified: works without payment_orders table

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { calculateNewExpiry } from "@/lib/payments/config";

function getServerDb() {
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

    // 1. Verify Razorpay signature
    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const sb = getServerDb();
    if (!sb) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const now = new Date().toISOString();

    // 2. Check for early renewal
    const { data: currentEnt } = await sb
      .from("user_entitlements")
      .select("expires_at")
      .eq("user_id", userId)
      .eq("entitlement", "community_pro")
      .eq("status", "active")
      .gt("expires_at", now)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newExpiry = calculateNewExpiry(currentEnt?.expires_at || null);

    // 3. Expire old entitlements
    await sb
      .from("user_entitlements")
      .update({ status: "expired", updated_at: now })
      .eq("user_id", userId)
      .eq("entitlement", "community_pro")
      .eq("status", "active");

    // 4. Create new entitlement
    const { error: entError } = await sb.from("user_entitlements").insert({
      user_id: userId,
      entitlement: "community_pro",
      starts_at:
        currentEnt?.expires_at && new Date(currentEnt.expires_at) > new Date()
          ? currentEnt.expires_at
          : now,
      expires_at: newExpiry.toISOString(),
      status: "active",
    });

    if (entError) {
      console.error("Entitlement creation error:", entError);
      return NextResponse.json({ error: "Failed to activate Pro" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      expiresAt: newExpiry.toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Verification failed";
    console.error("Verify error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
