// Entitlement checking utilities

import { getSupabase } from "@/lib/supabase/client";
import { PLANS } from "./config";

const PRO_PLAN = PLANS.community_pro;

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

  // Expire any old entitlements
  await sb.rpc("expire_old_entitlements");

  const { data } = await sb
    .from("user_entitlements")
    .select("entitlement, expires_at, status")
    .eq("user_id", userId)
    .eq("entitlement", PRO_PLAN.plan_id)
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
