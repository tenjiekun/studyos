"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";
import { getProfile, uploadImage } from "@/lib/community/client";
import { Profile } from "@/lib/types";

export default function ProfilePage() {
  const { user, isBypass } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      if (isBypass) {
        setProfile({
          id: user!.id,
          name: user!.user_metadata?.name || "Local User",
          avatar_url: null,
          username: null,
          created_at: new Date().toISOString(),
        });
        setName(user!.user_metadata?.name || "Local User");
        setLoading(false);
        return;
      }
      const p = await getProfile(user!.id);
      if (p) {
        setProfile(p);
        setName(p.name);
        setAvatarPreview(p.avatar_url);
      }
      setLoading(false);
    }
    load();
  }, [user, isBypass]);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);

    let avatarUrl = profile?.avatar_url || null;

    if (avatarFile && !isBypass) {
      const uploaded = await uploadImage(
        "avatars",
        `${user.id}/${Date.now()}-${avatarFile.name}`,
        avatarFile
      );
      if (uploaded) avatarUrl = uploaded;
    }

    if (!isBypass) {
      const sb = getSupabase();
      if (sb) {
        const { error } = await sb
          .from("profiles")
          .update({ name: name.trim(), avatar_url: avatarUrl })
          .eq("id", user.id);

        if (error) {
          toast.error("Failed to save profile");
          setSaving(false);
          return;
        }
      }
    }

    toast.success("Profile updated!");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[500px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </div>
    );
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
        <h1 className="text-2xl font-semibold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your community identity
        </p>
      </div>

      <Card className="animate-fade-in">
        <CardContent className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-primary/40" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium">Profile Photo</p>
              <p className="text-xs text-muted-foreground">
                JPG or PNG, max 2MB
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={30}
            />
          </div>

          {/* Email (read-only) */}
          {user?.email && (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={user.email}
                disabled
                className="opacity-60"
              />
              <p className="text-[10px] text-muted-foreground">
                Email cannot be changed here
              </p>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
