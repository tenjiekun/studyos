// Server-side plan configuration — source of truth for pricing
// Never trust client-sent amounts

export const PLANS = {
  community_pro: {
    plan_id: "community_pro",
    name: "Community Pro",
    description: "30 days of premium community features",
    price_paise: 4900,
    currency: "INR",
    duration_days: 30,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlan(planId: string): (typeof PLANS)[PlanId] | null {
  return (PLANS as Record<string, (typeof PLANS)[PlanId]>)[planId] || null;
}

export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

export function formatPriceDecimal(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatExpiryDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calculateNewExpiry(currentExpiry: string | null): Date {
  const plan = PLANS.community_pro;
  const base =
    currentExpiry && new Date(currentExpiry) > new Date()
      ? new Date(currentExpiry)
      : new Date();

  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + plan.duration_days);
  return newExpiry;
}

// Internal order ID generator: STUDYOS-20260825-000123
export function generateOrderNumber(seq: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `STUDYOS-${date}-${String(seq).padStart(6, "0")}`;
}
