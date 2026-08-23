"use client";

import { useEffect, useState } from "react";
import { useStudyData } from "@/lib/use-study-data";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { formatMinutes } from "@/lib/helpers";
import { Moon, Sun, Monitor, Target, Zap, LogOut, Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const { settings, updateSettings, loading } = useStudyData();
  const { user, signOut, isBypass } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [focusDur, setFocusDur] = useState(settings.pomodoro.focus_duration);
  const [shortBreak, setShortBreak] = useState(settings.pomodoro.short_break_duration);
  const [longBreak, setLongBreak] = useState(settings.pomodoro.long_break_duration);
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(settings.pomodoro.sessions_before_long_break);
  const [dailyGoal, setDailyGoal] = useState(settings.daily_goal_minutes);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading) {
      setFocusDur(settings.pomodoro.focus_duration);
      setShortBreak(settings.pomodoro.short_break_duration);
      setLongBreak(settings.pomodoro.long_break_duration);
      setSessionsBeforeLong(settings.pomodoro.sessions_before_long_break);
      setDailyGoal(settings.daily_goal_minutes);
    }
  }, [loading, settings]);

  // Load profile from Supabase
  useEffect(() => {
    if (!user || isBypass) {
      setProfileName(user?.user_metadata?.full_name || "Local User");
      return;
    }
    async function loadProfile() {
      const { getSupabase } = await import("@/lib/supabase/client");
      const sb = getSupabase();
      if (!sb) return;
      const { data } = await sb.from("profiles").select("name, avatar_url").eq("id", user!.id).maybeSingle();
      if (data) {
        setProfileName(data.name || "Student");
        setAvatarPreview(data.avatar_url);
      } else {
        setProfileName(user!.user_metadata?.full_name || "Student");
      }
    }
    loadProfile();
  }, [user, isBypass]);

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-[700px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function saveProfile() {
    if (!profileName.trim()) return;
    setSavingProfile(true);

    let avatarUrl = avatarPreview;

    if (avatarFile && !isBypass) {
      const { getSupabase } = await import("@/lib/supabase/client");
      const sb = getSupabase();
      if (sb && user) {
        const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
        const { error } = await sb.storage.from("avatars").upload(path, avatarFile, {
          contentType: avatarFile.type,
        });
        if (!error) {
          const { data } = sb.storage.from("avatars").getPublicUrl(path);
          avatarUrl = data.publicUrl;
        }
      }
    }

    if (!isBypass) {
      const { getSupabase } = await import("@/lib/supabase/client");
      const sb = getSupabase();
      if (sb && user) {
        await sb.from("profiles").upsert({
          id: user.id,
          name: profileName.trim(),
          avatar_url: avatarUrl,
        }, { onConflict: "id" });
      }
    }

    toast.success("Profile updated!");
    setSavingProfile(false);
    setAvatarFile(null);
  }

  async function savePomodoro() {
    await updateSettings({
      pomodoro: {
        focus_duration: focusDur,
        short_break_duration: shortBreak,
        long_break_duration: longBreak,
        sessions_before_long_break: sessionsBeforeLong,
      },
    });
    toast.success("Pomodoro settings saved!");
  }

  async function saveGoal() {
    await updateSettings({ daily_goal_minutes: dailyGoal });
    toast.success("Goal saved!");
  }

  const themes: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[700px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your study experience</p>
      </div>

      {/* Profile Card */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{profileName?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="profile-name" className="text-xs">Display Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                maxLength={30}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground flex-1">{user?.email || "Local mode"}</p>
            <Button onClick={saveProfile} size="sm" disabled={savingProfile || !profileName.trim()}>
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.email || "Local User"}</p>
              <p className="text-xs text-muted-foreground">{isBypass ? "Bypass mode" : "Signed in"}</p>
            </div>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={signOut}>
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">Appearance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <t.icon className={`w-5 h-5 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === t.value ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Settings */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">Pomodoro Timer</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Focus (min)</Label>
              <Input type="number" min={5} max={120} value={focusDur} onChange={(e) => setFocusDur(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Short Break (min)</Label>
              <Input type="number" min={1} max={30} value={shortBreak} onChange={(e) => setShortBreak(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Long Break (min)</Label>
              <Input type="number" min={5} max={60} value={longBreak} onChange={(e) => setLongBreak(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sessions Before Long</Label>
              <Input type="number" min={2} max={8} value={sessionsBeforeLong} onChange={(e) => setSessionsBeforeLong(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={savePomodoro} size="sm">Save Pomodoro</Button>
        </CardContent>
      </Card>

      {/* Daily Goal */}
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">Study Goal</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Daily Focus Goal (minutes)</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min={30} max={720} step={30} value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} className="w-[140px]" />
              <span className="text-sm text-muted-foreground">= {formatMinutes(dailyGoal)}</span>
            </div>
          </div>
          <Button onClick={saveGoal} size="sm">Save Goal</Button>
        </CardContent>
      </Card>

      <Card className="animate-fade-in">
        <CardContent className="p-5">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">StudyOS</p>
            <p className="text-xs text-muted-foreground">Your personal study command center</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
