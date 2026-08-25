import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, PRO_PLAN } from "@/lib/payments/razorpay";
import { calculateNewExpiry } from "@/lib/payments/entitlements";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
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
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    // 2. Handle payment.captured event (successful payment)
    if (event.event === "payment.captured") {
      const payment = event.payload.payment?.entity;
      if (!payment) {
        return NextResponse.json({ received: true });
      }

      const orderId = payment.order_id;
      const paymentId = payment.id;
      const userId = payment.notes?.user_id;
      const method = payment.method;

      if (!userId) {
        console.error("No user_id in payment notes");
        return NextResponse.json({ received: true });
      }

      // Idempotency check
      const { data: existing } = await sb
        .from("payments")
        .select("id, status")
        .eq("provider_payment_id", paymentId)
        .maybeSingle();

      if (existing?.status === "successful") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // Save payment
      const paymentData = {
        user_id: userId,
        provider: "razorpay",
        provider_payment_id: paymentId,
        provider_order_id: orderId,
        provider_event_id: event.id,
        amount: payment.amount || PRO_PLAN.price_paise,
        currency: payment.currency || PRO_PLAN.currency,
        payment_method: method,
        status: "successful",
        paid_at: new Date(payment.created_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      let sourcePaymentId: string;
      if (existing) {
        await sb.from("payments").update(paymentData).eq("id", existing.id);
        sourcePaymentId = existing.id;
      } else {
        const { data: newPayment } = await sb
          .from("payments")
          .insert(paymentData)
          .select("id")
          .single();
        sourcePaymentId = newPayment?.id || "";
      }

      // Extend or create entitlement
      const { data: currentEnt } = await sb
        .from("user_entitlements")
        .select("expires_at")
        .eq("user_id", userId)
        .eq("entitlement", PRO_PLAN.entitlement)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const newExpiry = calculateNewExpiry(currentEnt?.expires_at || null);

      // Expire old
      await sb
        .from("user_entitlements")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("entitlement", PRO_PLAN.entitlement)
        .eq("status", "active");

      // Create new entitlement
      await sb.from("user_entitlements").insert({
        user_id: userId,
        entitlement: PRO_PLAN.entitlement,
        starts_at: currentEnt?.expires_at && new Date(currentEnt.expires_at) > new Date()
          ? currentEnt.expires_at
          : new Date().toISOString(),
        expires_at: newExpiry.toISOString(),
        status: "active",
        source_payment_id: sourcePaymentId,
        updated_at: new Date().toISOString(),
      });
    }

    // 3. Handle payment.failed
    if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        await sb.from("payments").upsert(
          {
            user_id: payment.notes?.user_id || "unknown",
            provider: "razorpay",
            provider_payment_id: payment.id,
            provider_order_id: payment.order_id,
            amount: payment.amount || PRO_PLAN.price_paise,
            currency: payment.currency || PRO_PLAN.currency,
            status: "failed",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider_payment_id" }
        );
      }
    }

    // 4. Handle refund
    if (event.event === "payment.refunded") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        await sb
          .from("payments")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("provider_payment_id", payment.id);

        // Revoke entitlement
        const userId = payment.notes?.user_id;
        if (userId) {
          await sb
            .from("user_entitlements")
            .update({ status: "revoked", updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("entitlement", PRO_PLAN.entitlement)
            .eq("status", "active");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Webhook error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
