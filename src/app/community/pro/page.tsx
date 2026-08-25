"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import { formatPrice, formatExpiryDate } from "@/lib/payments/entitlements";
import { PRO_PLAN } from "@/lib/payments/razorpay";
import { getSupabase } from "@/lib/supabase/client";
import {
  Crown,
  ArrowLeft,
  Check,
  Clock,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function ProMembershipPage() {
  const { user, isBypass } = useAuth();
  const { isPro, expiresAt, daysRemaining, loading: proLoading, refresh } = usePro();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!user || isBypass) {
      setLoadingPayments(false);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setLoadingPayments(false);
      return;
    }
    const { data } = await sb
      .from("payments")
      .select("id, amount, status, payment_method, paid_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setPayments(data || []);
    setLoadingPayments(false);
  }, [user, isBypass]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  async function handleRenew() {
    if (!user) return;
    setRenewing(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "StudyOS",
        description: "Community Pro Renewal — 30 Days",
        order_id: data.orderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                userId: user.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);

            await refresh();
            await loadPayments();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Verification failed";
            setError(msg);
          }
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => setRenewing(false),
        },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: unknown) => {
          const resp = response as { error?: { description?: string } };
          setError(resp.error?.description || "Payment failed");
          setRenewing(false);
        });
        rzp.open();
      } else {
        setError("Payment system not available. Please ensure Razorpay is configured.");
        setRenewing(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setRenewing(false);
    }
  }

  if (proLoading) {
    return (
      <div className="p-4 md:p-8 max-w-[600px] mx-auto">
        <div className="h-8 bg-muted rounded animate-pulse w-48 mb-4" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[600px] mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          My Pro Membership
        </h1>
      </div>

      {/* Status Card */}
      <div className="animate-fade-in">
        {isPro ? (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Community Pro</h2>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Your premium membership</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-semibold">{formatPrice(PRO_PLAN.price_paise)} / {PRO_PLAN.duration_days} Days</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining</p>
                  <p className="font-semibold">{daysRemaining} days</p>
                </div>
                {expiresAt && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Purchased</p>
                      <p className="font-semibold">—</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-semibold">{formatExpiryDate(expiresAt)}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                    style={{ width: `${Math.max(5, (daysRemaining / 30) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {daysRemaining} of 30 days remaining
                </p>
              </div>
            </div>

            <div className="border-t border-green-500/10 p-4">
              <button
                onClick={handleRenew}
                disabled={renewing}
                className="w-full h-10 rounded-xl border border-green-500/30 text-green-600 font-medium text-sm
                  hover:bg-green-500/10 transition-all flex items-center justify-center gap-2
                  disabled:opacity-50"
              >
                {renewing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {renewing ? "Processing..." : `Renew Pro — ${formatPrice(PRO_PLAN.price_paise)}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-primary/40" />
              </div>
              <h2 className="text-lg font-bold mb-1">You&apos;re on Free Plan</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Unlock premium community features with Community Pro
              </p>
              <p className="text-sm font-semibold mt-2">
                {formatPrice(PRO_PLAN.price_paise)} / {PRO_PLAN.duration_days} Days
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                One-time payment · No automatic renewal
              </p>
            </div>

            <div className="border-t border-border p-4">
              <Link
                href="/community/pro/checkout"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Expiry Warning */}
      {isPro && daysRemaining <= 7 && daysRemaining > 0 && (
        <div className="animate-fade-in p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Your Pro access expires in {daysRemaining} days</p>
            <p className="text-xs text-muted-foreground">Renew to keep your premium features</p>
          </div>
          <button
            onClick={handleRenew}
            disabled={renewing}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-medium hover:bg-amber-500/20 transition-colors"
          >
            Renew
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Payment History */}
      <div className="animate-fade-in">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Payment History
        </h3>

        {loadingPayments ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No payments yet
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    p.status === "successful"
                      ? "bg-green-500/10"
                      : p.status === "refunded"
                        ? "bg-amber-500/10"
                        : "bg-red-500/10"
                  }`}
                >
                  {p.status === "successful" ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : p.status === "refunded" ? (
                    <RefreshCw className="w-5 h-5 text-amber-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{formatPrice(p.amount)}</p>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        p.status === "successful"
                          ? "bg-green-500/10 text-green-600"
                          : p.status === "refunded"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Community Pro · {p.payment_method?.toUpperCase() || "UPI"} ·{" "}
                    {p.paid_at
                      ? new Date(p.paid_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
