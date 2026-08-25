// GET /api/payments/plan
// Returns the active plan configuration — frontend uses this, never hardcodes

import { NextResponse } from "next/server";
import { PLANS } from "@/lib/payments/config";

export async function GET() {
  return NextResponse.json({
    plans: Object.values(PLANS).filter((p) => p.price_paise > 0),
  });
}
