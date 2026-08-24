"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import type { FreeTimeLog } from "@/lib/types";

const CATEGORIES = [
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
  { value: "social", label: "Friends / Social", icon: "👥" },
  { value: "hobbies", label: "Hobbies", icon: "🎨" },
  { value: "exercise", label: "Exercise", icon: "💪" },
  { value: "rest", label: "Rest", icon: "😴" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "reading", label: "Reading", icon: "📚" },
  { value: "travel", label: "Travel", icon: "🚗" },
  { value: "other", label: "Other", icon: "✨" },
];

export default function FreeTimePage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FreeTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newLog, setNewLog] = useState({
    category: "rest",
    duration_minutes: 30,
    notes: "",
  });

  const loadLogs = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("free_time_logs" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", selectedDate)
      .order("created_at", { ascending: false });

    setLogs((data as any) || []);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addLog = async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("free_time_logs" as any)
      .insert({
        user_id: user.id,
        date: selectedDate,
        category: newLog.category,
        duration_minutes: newLog.duration_minutes,
        notes: newLog.notes || null,
      } as any)
      .select()
      .single();

    if (data) setLogs((prev) => [data as any, ...prev]);
    setShowAdd(false);
    setNewLog({ category: "rest", duration_minutes: 30, notes: "" });
  };

  const deleteLog = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("free_time_logs" as any).delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const totalMinutes = logs.reduce((a, l) => a + (l.duration_minutes || 0), 0);

  const categoryBreakdown = CATEGORIES.map((cat) => {
    const catLogs = logs.filter((l) => l.category === cat.value);
    const mins = catLogs.reduce((a, l) => a + (l.duration_minutes || 0), 0);
    return { ...cat, minutes: mins, count: catLogs.length };
  }).filter((c) => c.minutes > 0);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Free Time
          </p>
          <h1 className="text-3xl font-light tracking-tight">
            Track how you spend your free time
          </h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.97]"
        >
          + Log Activity
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateDate(-1)}
          className="h-9 w-9 rounded-lg bg-card border border-border/50 flex items-center justify-center text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          ←
        </button>
        <p className="text-sm font-medium">{formatDate(selectedDate)}</p>
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
          className="h-9 px-4 rounded-lg bg-card border border-border/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => navigateDate(1)}
          className="h-9 w-9 rounded-lg bg-card border border-border/50 flex items-center justify-center text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          →
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            FREE TIME TODAY
          </p>
          <p className="text-3xl font-light">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            ACTIVITIES
          </p>
          <p className="text-3xl font-light">{logs.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            TOP ACTIVITY
          </p>
          <p className="text-lg font-medium">
            {categoryBreakdown.length > 0
              ? `${categoryBreakdown[0].icon} ${categoryBreakdown[0].label}`
              : "—"}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Breakdown
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categoryBreakdown.map((cat) => (
              <div
                key={cat.value}
                className="p-4 rounded-2xl bg-card border border-border/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.icon}</span>
                  <p className="text-xs font-medium">{cat.label}</p>
                </div>
                <p className="text-xl font-light">
                  {Math.floor(cat.minutes / 60)}h {cat.minutes % 60}m
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {cat.count} {cat.count === 1 ? "session" : "sessions"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-card border border-border/30 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            No free time logged today
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Free time is a valid part of a healthy schedule
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const cat = CATEGORIES.find((c) => c.value === log.category);
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/30 group"
              >
                <span className="text-xl">{cat?.icon || "✨"}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cat?.label || log.category}</p>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground">{log.notes}</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {log.duration_minutes}m
                </p>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="w-6 h-6 rounded-md text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Log Free Time</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2 block">
                  Activity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() =>
                        setNewLog((p) => ({ ...p, category: cat.value }))
                      }
                      className={`p-3 rounded-xl text-center transition-all ${
                        newLog.category === cat.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <span className="text-lg block">{cat.icon}</span>
                      <span className="text-[10px] block mt-1">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newLog.duration_minutes}
                  onChange={(e) =>
                    setNewLog((p) => ({
                      ...p,
                      duration_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={newLog.notes}
                  onChange={(e) =>
                    setNewLog((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="What did you do?"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addLog}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
