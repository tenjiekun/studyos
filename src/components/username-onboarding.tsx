"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtSign, CheckCircle2, XCircle, Loader2, ArrowRight, Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { checkUsernameAvailable } from "@/lib/community/dm";
import { getProfile } from "@/lib/community/client";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function UsernameOnboarding() {
  const { user, isBypass } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameError, setUsernameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user || isBypass) {
      setLoading(false);
      return;
    }

    async function check() {
      try {
        const profile = await getProfile(user!.id);
        if (profile && !profile.username) {
          // Show onboarding after a short delay
          setTimeout(() => setOpen(true), 1500);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    check();
  }, [user, isBypass]);

  const checkUsername = useCallback(
    async (value: string) => {
      const trimmed = value.trim().toLowerCase();
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

  async function handleSave() {
    if (!user || !username.trim() || usernameStatus !== "available") return;
    setSaving(true);

    try {
      const sb = getSupabase();
      if (sb) {
        const { error } = await sb
          .from("profiles")
          .update({ username: username.trim().toLowerCase() })
          .eq("id", user.id);

        if (error) {
          setUsernameError("Failed to save username. Try another.");
          setSaving(false);
          return;
        }
      }
      setOpen(false);
    } catch {
      setUsernameError("Something went wrong");
    }
    setSaving(false);
  }

  function handleSkip() {
    setOpen(false);
  }

  // Don't show for bypass users or if already has username
  if (isBypass || loading) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">
            Set Your Unique Username
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Choose a username so other students can find and DM you. You can always change it later in your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="onboarding-username">Username</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="onboarding-username"
                value={username}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setUsername(val);
                  if (!val) setUsernameStatus("idle");
                }}
                placeholder="e.g. study_master42"
                className="pl-9 pr-10 h-10"
                maxLength={20}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {usernameStatus === "available" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {(usernameStatus === "taken" || usernameStatus === "invalid") && (
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
            {usernameStatus === "available" && (
              <p className="text-xs text-emerald-600">Username is available!</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={saving || usernameStatus !== "available"}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
