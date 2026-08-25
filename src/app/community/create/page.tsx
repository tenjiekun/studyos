"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import { getSupabase } from "@/lib/supabase/client";
import { ArrowLeft, Flame, Loader2, Crown, Lock } from "lucide-react";
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

export default function CreateGroupPage() {
  const { user, isBypass } = useAuth();
  const { isPro } = usePro();
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
        // Try to get more details about the error
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
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Create Group
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start a new study group
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
        {/* Group Image */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Group"
                className="w-full h-full object-cover"
              />
            ) : (
              <Flame className="w-8 h-8 text-primary/40" />
            )}
          </div>
          <div>
            <Label
              htmlFor="group-image"
              className="text-sm font-medium cursor-pointer hover:underline"
            >
              Choose group image
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional, max 10MB
            </p>
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
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
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
              <p className="text-[10px] text-muted-foreground text-right">
                {description.length}/200
              </p>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
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
                  onClick={() => {
                    if (!isPro) return;
                    setPrivacy("private");
                  }}
                  disabled={!isPro}
                >
                  {!isPro && <Lock className="w-3 h-3 mr-1" />}
                  Private
                  {!isPro && <Crown className="w-3 h-3 ml-1" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {privacy === "public"
                  ? "Anyone can find and join this group"
                  : isPro
                    ? "Only invited members can join"
                    : "Upgrade to Pro to create private groups"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-11 gap-2"
          disabled={submitting || !name.trim()}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          {submitting ? "Creating..." : "Create Group"}
        </Button>
      </form>
    </div>
  );
}
