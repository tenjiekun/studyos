// POST /api/payments/webhook
// Razorpay webhook — verifies signature and activates Pro
// Simplified: works without payment_orders table

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { calculateNewExpiry } from "@/lib/payments/config";

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

    // 1. Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event || "";

    // 2. Handle payment.captured
    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) return NextResponse.json({ received: true });

      const userId = payment.notes?.user_id;
      if (!userId) return NextResponse.json({ received: true });

      const sb = getServerDb();
      if (!sb) return NextResponse.json({ error: "Server error" }, { status: 500 });

      const now = new Date().toISOString();

      // Check for early renewal
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

      // Expire old
      await sb
        .from("user_entitlements")
        .update({ status: "expired", updated_at: now })
        .eq("user_id", userId)
        .eq("entitlement", "community_pro")
        .eq("status", "active");

      // Create new
      await sb.from("user_entitlements").insert({
        user_id: userId,
        entitlement: "community_pro",
        starts_at:
          currentEnt?.expires_at && new Date(currentEnt.expires_at) > new Date()
            ? currentEnt.expires_at
            : now,
        expires_at: newExpiry.toISOString(),
        status: "active",
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook error";
    console.error("Webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
