"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import { formatPrice } from "@/lib/payments/config";
import { PLANS } from "@/lib/payments/config";
import { waitForRazorpaySDK } from "@/lib/payments/wait-for-sdk";
const PRO_PLAN = PLANS.community_pro;
import {
  Crown,
  Check,
  X,
  Loader2,
  Lock,
  Users,
  MessageCircle,
  Camera,
  Image,
  Mic,
  Shield,
  Zap,
  Sparkles,
} from "lucide-react";

const PRO_FEATURES = [
  { icon: Users, text: "Create your own study groups" },
  { icon: Lock, text: "Create private study groups" },
  { icon: MessageCircle, text: "Chat privately with DMs" },
  { icon: Camera, text: "Take and share photos" },
  { icon: Image, text: "Select from gallery" },
  { icon: Mic, text: "Send voice notes" },    { icon: Zap, text: "Shared study goals" },
    { icon: Sparkles, text: "Advanced group management" },
    { icon: Shield, text: "Premium collaboration tools" },
];

const FREE_FEATURES = [
  { text: "Browse community", allowed: true },
  { text: "Join public groups", allowed: true },
  { text: "Basic discussions", allowed: true },
  { text: "Create your own group", allowed: false },
  { text: "Private groups", allowed: false },
  { text: "Private DMs", allowed: false },
  { text: "Photos & media", allowed: false },
  { text: "Voice notes", allowed: false },
  { text: "Advanced collaboration", allowed: false },
];

const PRO_COMPARISON = [
  { text: "Create your own groups", allowed: true },
  { text: "Private groups", allowed: true },
  { text: "Private DM chat", allowed: true },
  { text: "Advanced discussions", allowed: true },
  { text: "Photos, camera, gallery", allowed: true },
  { text: "Voice notes", allowed: true },
  { text: "Shared study goals", allowed: true },
  { text: "Shared group planning", allowed: true },
  { text: "Advanced group management", allowed: true },
  { text: "Premium community features", allowed: true },
];

interface ProPaywallProps {
  showComparison?: boolean;
}

export function ProPaywall({ showComparison = true }: ProPaywallProps) {
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
            if (!verifyRes.ok) throw new Error(verifyData.error);
            await refresh();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Verification failed";
            setError(msg);
          }
        },
        prefill: { email: user.email || "" },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const sdkReady = await waitForRazorpaySDK();
      if (sdkReady && typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: unknown) => {
          const resp = response as { error?: { description?: string } };
          setError(resp.error?.description || "Payment failed");
          setLoading(false);
        });
        rzp.open();
      } else {
        setError("Payment system not available. Please refresh and try again.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Pro Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        <div className="p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-1">Community Pro</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Study together. Connect with other students. Build your own study groups.
          </p>

          <div className="flex items-baseline justify-center gap-1.5 mb-1">
            <span className="text-3xl font-bold">{formatPrice(PRO_PLAN.price_paise)}</span>
            <span className="text-muted-foreground">/ {PRO_PLAN.duration_days} Days</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            One-time payment · No automatic renewal
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left mb-6 max-w-md mx-auto">
            {PRO_FEATURES.map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-background/50">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <feat.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium">{feat.text}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4 max-w-sm mx-auto">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading || !user}
            className="w-full max-w-sm h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
              hover:bg-primary/90 transition-all flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Upgrade to Pro — {formatPrice(PRO_PLAN.price_paise)}
              </>
            )}
          </button>

          <p className="text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Secure payment powered by Razorpay · UPI · Cards · Netbanking
          </p>
        </div>
      </div>

      {/* Free vs Pro Comparison */}
      {showComparison && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <span className="text-muted-foreground">FREE</span>
            </h3>
            <div className="space-y-2">
              {FREE_FEATURES.map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {feat.allowed ? (
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-xs ${feat.allowed ? "" : "text-muted-foreground/50 line-through"}`}>
                    {feat.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary">PRO</span>
            </h3>
            <div className="space-y-2">
              {PRO_COMPARISON.map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-medium">{feat.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Strong value message */}
      <div className="text-center pb-4">
        <p className="text-sm text-muted-foreground">
          Free lets you <span className="text-foreground font-medium">discover</span> the community.
        </p>
        <p className="text-sm text-muted-foreground">
          Pro lets you actually <span className="text-primary font-medium">build and use it fully</span>.
        </p>
      </div>

      {/* Razorpay Script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}
