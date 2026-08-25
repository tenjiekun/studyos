"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import { getSupabase } from "@/lib/supabase/client";
import { ArrowLeft, Flame, Loader2, Crown, Lock, Shield, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GROUP_CATEGORIES } from "@/lib/types";
import {
  createGroup,
  uploadImage,
  localCreateGroup,
} from "@/lib/community/client";

function CreateGroupProLock() {
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
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setLoading(false) },
      };

      if (typeof window !== "undefined" && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: unknown) => {
          const resp = response as { error?: { description?: string } };
          setError(resp.error?.description || "Payment failed");
          setLoading(false);
        });
        rzp.open();
      } else {
        setError("Payment system not available.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="text-center py-12 space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
        <Users className="w-8 h-8 text-primary" />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-1">Create Your Own Study Group with Pro</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Build a private space for your study partners. Your batch, your exam, your subject.
        </p>
      </div>

      {/* Mock group creation preview */}
      <div className="max-w-xs mx-auto rounded-xl border border-border bg-card p-4 text-left blur-[4px] opacity-40 pointer-events-none select-none">
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Group Name</p>
            <div className="h-8 rounded-md bg-muted/50 px-3 flex items-center text-xs text-muted-foreground">
              JEE 2027 Aspirants
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Privacy</p>
            <div className="flex gap-2">
              <div className="h-8 flex-1 rounded-md bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground">Public</div>
              <div className="h-8 flex-1 rounded-md bg-primary/20 flex items-center justify-center text-[10px]">Private</div>
            </div>
          </div>
          <div className="h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
            Create Group
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-center gap-1">
        <span className="text-2xl font-bold">₹49</span>
        <span className="text-xs text-muted-foreground">/ 30 Days</span>
      </div>
      <p className="text-[10px] text-muted-foreground">One-time payment · No automatic renewal</p>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm max-w-xs mx-auto">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading || !user}
        className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
          hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mx-auto
          disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Upgrade to Pro
          </>
        )}
      </button>

      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" />
        Secure payment powered by Razorpay
      </p>

      <Link href="/community/pro">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          Learn more about Pro
        </Button>
      </Link>

      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
    </div>
  );
}

export default function CreateGroupPage() {
  const { user, isBypass } = useAuth();
  const { isPro, loading: proLoading } = usePro();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setSubmitting(true);
    setError(null);

    let imageUrl: string | null = null;

    if (imageFile && !isBypass) {
      imageUrl = await uploadImage(
        "group-images",
        `${user.id}/${Date.now()}-${imageFile.name}`,
        imageFile
      );
    }

    if (isBypass) {
      localCreateGroup(
        {
          name: name.trim(),
          description: description.trim(),
          image_url: imagePreview,
          category,
          privacy,
          created_by: user.id,
        },
        user.id
      );
    } else {
      const group = await createGroup(
        {
          name: name.trim(),
          description: description.trim(),
          image_url: imageUrl,
          category,
          privacy,
          created_by: user.id,
        },
        user.id
      );

      if (!group) {
        const sb = getSupabase();
        if (sb) {
          const { data: profile } = await sb.from("profiles").select("id").eq("id", user.id).maybeSingle();
          const { error: testInsert } = await sb.from("groups").insert({
            name: name.trim(),
            description: description.trim(),
            category,
            privacy,
            created_by: user.id,
          });
          console.error("Profile exists:", !!profile, "Insert error:", testInsert);
          setError(`Failed: ${testInsert?.message || "Unknown error"}. Check console for details.`);
        } else {
          setError("Failed to create group. Please try again.");
        }
        setSubmitting(false);
        return;
      }
    }

    router.push("/community");
  }

  return (
    <div className="p-4 md:p-8 max-w-[500px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
          Create Group
          {!proLoading && !isPro && (
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1">
              <Crown className="w-2.5 h-2.5" /> PRO
            </span>
          )}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start a new study group
        </p>
      </div>

      {/* Pro lock screen for free users */}
      {!proLoading && !isPro && <CreateGroupProLock />}

      {/* Full form for Pro users */}
      {isPro && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {imagePreview ? (
                <img src={imagePreview} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <Flame className="w-8 h-8 text-primary/40" />
              )}
            </div>
            <div>
              <Label htmlFor="group-image" className="text-sm font-medium cursor-pointer hover:underline">
                Choose group image
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Optional, max 10MB</p>
              <input
                id="group-image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. JEE 2027 Aspirants"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-[10px] text-muted-foreground text-right">{description.length}/200</p>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Privacy</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={privacy === "public" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPrivacy("public")}
                  >
                    Public
                  </Button>
                  <Button
                    type="button"
                    variant={privacy === "private" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPrivacy("private")}
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                    <ShieldCheck className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {privacy === "public"
                    ? "Anyone can find and join this group"
                    : "Only invited members can join"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full h-11 gap-2" disabled={submitting || !name.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? "Creating..." : "Create Group"}
          </Button>
        </form>
      )}
    </div>
  );
}
