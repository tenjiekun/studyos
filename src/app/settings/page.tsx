"use client";

import { useEffect, useState } from "react";
import { useStudyData } from "@/lib/use-study-data";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { formatMinutes } from "@/lib/helpers";
import { Moon, Sun, Monitor, Target, Zap, LogOut, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SettingsPage() {
  const { settings, updateSettings, loading } = useStudyData();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [focusDur, setFocusDur] = useState(settings.pomodoro.focus_duration);
  const [shortBreak, setShortBreak] = useState(settings.pomodoro.short_break_duration);
  const [longBreak, setLongBreak] = useState(settings.pomodoro.long_break_duration);
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(settings.pomodoro.sessions_before_long_break);
  const [dailyGoal, setDailyGoal] = useState(settings.daily_goal_minutes);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync local state when settings load from DB
  useEffect(() => {
    if (!loading) {
      setFocusDur(settings.pomodoro.focus_duration);
      setShortBreak(settings.pomodoro.short_break_duration);
      setLongBreak(settings.pomodoro.long_break_duration);
      setSessionsBeforeLong(settings.pomodoro.sessions_before_long_break);
      setDailyGoal(settings.daily_goal_minutes);
    }
  }, [loading, settings]);

  if (!mounted || loading) {
    return (
      <div className="p-4 md:p-8 max-w-[700px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 bg-muted rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
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
  }

  async function saveGoal() {
    await updateSettings({ daily_goal_minutes: dailyGoal });
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

      {/* Account */}
      {user && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={signOut}>
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Label className="text-xs">Focus Duration (minutes)</Label>
              <Input type="number" min={5} max={120} value={focusDur} onChange={(e) => setFocusDur(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Short Break (minutes)</Label>
              <Input type="number" min={1} max={30} value={shortBreak} onChange={(e) => setShortBreak(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Long Break (minutes)</Label>
              <Input type="number" min={5} max={60} value={longBreak} onChange={(e) => setLongBreak(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Sessions Before Long Break</Label>
              <Input type="number" min={2} max={8} value={sessionsBeforeLong} onChange={(e) => setSessionsBeforeLong(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Cycle: {focusDur}min focus → {shortBreak}min break → long break every {sessionsBeforeLong} sessions ({longBreak}min)
          </p>
          <Button onClick={savePomodoro} size="sm">Save Pomodoro Settings</Button>
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
            <p className="text-[10px] text-muted-foreground">Built with Next.js, TypeScript & Tailwind CSS</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
