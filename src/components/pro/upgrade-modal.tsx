"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import { formatPrice } from "@/lib/payments/config";
import { PLANS } from "@/lib/payments/config";
import { Crown, Check, X, Loader2, Shield, Zap, Users, Sparkles, Lock } from "lucide-react";

const PRO_PLAN = PLANS.community_pro;

const PRO_FEATURES = [
  { icon: Users, text: "Create private study groups" },
  { icon: Shield, text: "Advanced group management" },
  { icon: Zap, text: "Larger group limits" },
  { icon: Sparkles, text: "Advanced collaboration tools" },
  { icon: Crown, text: "Shared study goals & task planning" },
];

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export function UpgradeModal({ open, onClose, onPaymentSuccess }: UpgradeModalProps) {
  const { user } = useAuth();
  const { refresh } = usePro();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, planId: "community_pro" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "StudyOS",
        description: "Community Pro — 30 Days",
        order_id: data.providerOrderId,
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
                orderId: data.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                userId: user.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");

            await refresh();
            onPaymentSuccess?.();
            onClose();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Payment verified but activation failed";
            setError(msg);
          }
        },
        prefill: {
          email: user.email || "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response: unknown) {
          const resp = response as { error?: { description?: string } };
          setError(resp.error?.description || "Payment failed");
          setLoading(false);
        });
        rzp.open();
      } else {
        setError("Razorpay SDK not loaded. Please add Razorpay script to your page.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Unlock Community Pro</h2>
              <p className="text-sm text-muted-foreground">Premium community features</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold">{formatPrice(PRO_PLAN.price_paise)}</span>
            <span className="text-sm text-muted-foreground">/ {PRO_PLAN.duration_days} Days</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">One-time payment · No automatic renewal</p>
        </div>
        <div className="px-6 py-4 space-y-3">
          {PRO_FEATURES.map((feat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <feat.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm">{feat.text}</span>
              <Check className="w-4 h-4 text-green-500 ml-auto shrink-0" />
            </div>
          ))}
        </div>
        {error && (
          <div className="mx-6 mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="px-6 pb-6">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4" /> Pay {formatPrice(PRO_PLAN.price_paise)} with UPI</>}
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-3">Secure payment powered by Razorpay · UPI · Cards · Netbanking</p>
        </div>
      </div>
    </div>
  );
}
