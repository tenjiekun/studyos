// Entitlement checking utilities

import { getSupabase } from "@/lib/supabase/client";
import { PRO_PLAN } from "./razorpay";

export interface ProStatus {
  isPro: boolean;
  expiresAt: string | null;
  daysRemaining: number;
  entitlement: string | null;
}

/**
 * Client-side: Check if user has active Community Pro
 */
export async function checkProStatus(userId: string): Promise<ProStatus> {
  const sb = getSupabase();
  if (!sb) return { isPro: false, expiresAt: null, daysRemaining: 0, entitlement: null };

  // First, expire any old entitlements
  await sb.rpc("expire_old_entitlements");

  const { data } = await sb
    .from("user_entitlements")
    .select("entitlement, expires_at, status")
    .eq("user_id", userId)
    .eq("entitlement", PRO_PLAN.entitlement)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { isPro: false, expiresAt: null, daysRemaining: 0, entitlement: null };
  }

  const expiresAt = new Date(data.expires_at);
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    isPro: true,
    expiresAt: data.expires_at,
    daysRemaining,
    entitlement: data.entitlement,
  };
}

/**
 * Calculate new expiry date (extend from current expiry or from now)
 */
export function calculateNewExpiry(currentExpiry: string | null): Date {
  const base = currentExpiry && new Date(currentExpiry) > new Date()
    ? new Date(currentExpiry)
    : new Date();

  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + PRO_PLAN.duration_days);
  return newExpiry;
}

/**
 * Format currency for display
 */
export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

/**
 * Format expiry date
 */
export function formatExpiryDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
