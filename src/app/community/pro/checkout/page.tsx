"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import { formatPrice } from "@/lib/payments/config";
import { PLANS } from "@/lib/payments/config";
const PRO_PLAN = PLANS.community_pro;
import {
  ArrowLeft,
  Crown,
  Check,
  Shield,
  Zap,
  Users,
  Sparkles,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  Smartphone,
} from "lucide-react";

const FEATURES = [
  { icon: Users, text: "Create private study groups" },
  { icon: Shield, text: "Advanced group management" },
  { icon: Zap, text: "Larger group limits" },
  { icon: Sparkles, text: "Advanced collaboration tools" },
  { icon: Crown, text: "Shared study goals & task planning" },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { refresh } = usePro();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"info" | "payment" | "success">("info");

  async function initiatePayment() {
    if (!user) return;
    setStep("payment");
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
            if (!verifyRes.ok) throw new Error(verifyData.error);

            await refresh();
            setStep("success");
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Verification failed";
            setError(msg);
          }
        },
        prefill: { email: user.email || "" },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStep("info");
          },
        },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: unknown) => {
          const resp = response as { error?: { description?: string } };
          setError(resp.error?.description || "Payment failed. Please try again.");
          setLoading(false);
          setStep("info");
        });
        rzp.open();
      } else {
        setError("Payment system not available. Please ensure Razorpay SDK is loaded.");
        setLoading(false);
        setStep("info");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setLoading(false);
      setStep("info");
    }
  }

  // Success state
  if (step === "success") {
    return (
      <div className="p-4 md:p-8 max-w-[500px] mx-auto">
        <div className="animate-fade-in text-center py-12">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful 🎉</h1>
          <p className="text-muted-foreground mb-1">Community Pro is now active</p>
          <div className="flex items-baseline justify-center gap-1 mt-4">
            <span className="text-2xl font-bold">{formatPrice(PRO_PLAN.price_paise)}</span>
            <span className="text-muted-foreground">/ {PRO_PLAN.duration_days} Days</span>
          </div>
          <button
            onClick={() => router.push("/community")}
            className="mt-8 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            Go to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[500px] mx-auto space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <Link
          href="/community/pro"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Upgrade to Pro
        </h1>
      </div>

      {/* Plan Card */}
      <div className="animate-fade-in rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Community Pro</h2>
            <p className="text-sm text-muted-foreground">Premium community access</p>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold">{formatPrice(PRO_PLAN.price_paise)}</span>
          <span className="text-muted-foreground">/ {PRO_PLAN.duration_days} Days</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          One-time payment · No automatic renewal
        </p>
      </div>

      {/* Features */}
      <div className="animate-fade-in rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-sm mb-3">What you get:</h3>
        {FEATURES.map((feat, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <feat.icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm">{feat.text}</span>
            <Check className="w-4 h-4 text-green-500 ml-auto shrink-0" />
          </div>
        ))}
      </div>

      {/* Payment Methods Info */}
      <div className="animate-fade-in rounded-2xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-3">Supported payment methods:</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">UPI Intent</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50">
            <QrCode className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">UPI QR</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">Cards</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Pay Button */}
      <div className="animate-fade-in space-y-3">
        <button
          onClick={initiatePayment}
          disabled={loading || !user}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
            hover:bg-primary/90 transition-all flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay {formatPrice(PRO_PLAN.price_paise)} with UPI
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          Secured by Razorpay · 256-bit encryption
        </div>
      </div>

      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
