import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/payments/razorpay";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const order = await createRazorpayOrder(userId);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    console.error("Create order error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
