"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  User,
  AtSign,
  CheckCircle2,
  XCircle,
  Copy,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase/client";
import { getProfile, uploadImage } from "@/lib/community/client";
import { checkUsernameAvailable } from "@/lib/community/dm";
import { Profile } from "@/lib/types";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function ProfilePage() {
  const { user, isBypass } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameError, setUsernameError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalUsername = useRef<string | null>(null);

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
        setUsername(p.username || "");
        originalUsername.current = p.username || null;
        setAvatarPreview(p.avatar_url);
        if (p.username) setUsernameStatus("idle");
      }
      setLoading(false);
    }
    load();
  }, [user, isBypass]);

  // Debounced username availability check
  const checkUsername = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setUsernameStatus("idle");
        setUsernameError("");
        return;
      }

      const trimmed = value.trim().toLowerCase();

      // Format validation
      if (trimmed.length < 3) {
        setUsernameStatus("invalid");
        setUsernameError("Must be at least 3 characters");
        return;
      }
      if (trimmed.length > 20) {
        setUsernameStatus("invalid");
        setUsernameError("Must be 20 characters or less");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(trimmed)) {
        setUsernameStatus("invalid");
        setUsernameError("Only letters, numbers, and underscores");
        return;
      }

      // If it hasn't changed from original, skip check
      if (trimmed === (originalUsername.current || "").toLowerCase()) {
        setUsernameStatus("available");
        setUsernameError("");
        return;
      }

      setUsernameStatus("checking");
      setUsernameError("");

      try {
        const result = await checkUsernameAvailable(trimmed, user?.id);
        if (result.available) {
          setUsernameStatus("available");
          setUsernameError("");
        } else {
          setUsernameStatus("taken");
          setUsernameError(result.error || "Username is taken");
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameError("");
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    if (!username.trim()) {
      setUsernameStatus("idle");
      setUsernameError("");
      return;
    }
    usernameCheckTimer.current = setTimeout(() => {
      checkUsername(username);
    }, 500);
    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    };
  }, [username, checkUsername]);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!user || !name.trim()) return;

    // Validate username if changed
    if (username.trim() && usernameStatus !== "available") {
      if (usernameStatus === "checking") {
        toast.error("Please wait for username check to complete");
        return;
      }
      if (usernameStatus === "taken") {
        toast.error("Username is already taken");
        return;
      }
      if (usernameStatus === "invalid") {
        toast.error(usernameError || "Invalid username");
        return;
      }
    }

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
        const updateData: { name: string; avatar_url: string | null; username?: string } = {
          name: name.trim(),
          avatar_url: avatarUrl,
        };

        // Only update username if it was changed and is valid
        const trimmedUsername = username.trim().toLowerCase();
        if (trimmedUsername && (usernameStatus === "available" || trimmedUsername === (originalUsername.current || "").toLowerCase())) {
          updateData.username = trimmedUsername;
        }

        const { error } = await sb
          .from("profiles")
          .update(updateData)
          .eq("id", user.id);

        if (error) {
          if (error.message.includes("username")) {
            toast.error("Username is already taken");
          } else {
            toast.error("Failed to save profile");
          }
          setSaving(false);
          return;
        }

        originalUsername.current = trimmedUsername || originalUsername.current;
      }
    }

    toast.success("Profile updated!");
    setSaving(false);
  }

  function copyUsername() {
    if (!username) return;
    navigator.clipboard.writeText(`@${username}`);
    toast.success("Username copied!");
  }

  function shareUsername() {
    if (!username) return;
    const text = `Find me on StudyOS: @${username}`;
    if (navigator.share) {
      navigator.share({ title: "My StudyOS Username", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
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
              <p className="text-sm font-medium">Profile Photo</p>                <p className="text-xs text-muted-foreground">
                JPG or PNG, max 10MB
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

          {/* Username / Unique User ID */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" />
              Unique Username
            </Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setUsername(val);
                  if (!val) setUsernameStatus("idle");
                }}
                placeholder="e.g. study_master42"
                className="pl-9 pr-10 h-10"
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {usernameStatus === "available" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {usernameStatus === "taken" && (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                {usernameStatus === "invalid" && (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              3–20 characters. Letters, numbers, and underscores only.
            </p>
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
            {usernameStatus === "available" && username.trim() !== (originalUsername.current || "").toLowerCase() && (
              <p className="text-xs text-emerald-600">Username is available!</p>
            )}
          </div>

          {/* Current username display + share */}
          {profile?.username && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <AtSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium flex-1">
                @{profile.username}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1"
                onClick={copyUsername}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1"
                onClick={shareUsername}
              >
                <Share2 className="w-3 h-3" />
              </Button>
            </div>
          )}

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
