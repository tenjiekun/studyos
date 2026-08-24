"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import type {
  ScheduledBlock,
  FreeTimeLog,
  StudySession,
} from "@/lib/types";

const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 24;

const CATEGORIES: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  study: {
    bg: "bg-primary/8",
    border: "border-l-primary",
    text: "text-primary",
    label: "Study",
  },
  school: {
    bg: "bg-muted",
    border: "border-l-muted-foreground/30",
    text: "text-muted-foreground",
    label: "School",
  },
  test: {
    bg: "bg-orange-500/8",
    border: "border-l-orange-500",
    text: "text-orange-600",
    label: "Test",
  },
  break: {
    bg: "bg-emerald-500/8",
    border: "border-l-emerald-500",
    text: "text-emerald-600",
    label: "Free",
  },
  personal: {
    bg: "bg-violet-500/8",
    border: "border-l-violet-500",
    text: "text-violet-600",
    label: "Personal",
  },
};

export default function DayPlannerPage() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [freeTimeLogs, setFreeTimeLogs] = useState<FreeTimeLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({
    title: "",
    type: "study" as string,
    start_time: "09:00",
    end_time: "10:00",
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    const dayStart = `${selectedDate}T00:00:00`;
    const dayEnd = `${selectedDate}T23:59:59`;

    const [blocksRes, sessionsRes, freeRes] = await Promise.all([
      sb
        .from("scheduled_blocks" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", dayStart)
        .lte("end_time", dayEnd)
        .order("start_time"),
      sb
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time"),
      sb
        .from("free_time_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("date", selectedDate)
        .order("created_at"),
    ]);

    setBlocks((blocksRes.data as any) || []);
    setSessions((sessionsRes.data as any) || []);
    setFreeTimeLogs((freeRes.data as any) || []);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addBlock = async () => {
    if (!user || !newBlock.title) return;
    const sb = getSupabase();
    if (!sb) return;

    const startISO = `${selectedDate}T${newBlock.start_time}:00`;
    const endISO = `${selectedDate}T${newBlock.end_time}:00`;

    const { data } = await sb
      .from("scheduled_blocks" as any)
      .insert({
        user_id: user.id,
        title: newBlock.title,
        type: newBlock.type,
        start_time: startISO,
        end_time: endISO,
        status: "planned",
      } as any)
      .select()
      .single();

    if (data) {
      setBlocks((prev) => [...prev, data as any].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    }
    setShowAddBlock(false);
    setNewBlock({ title: "", type: "study", start_time: "09:00", end_time: "10:00" });
  };

  const deleteBlock = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("scheduled_blocks" as any).delete().eq("id", id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const getBlockStyle = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 32);
    return { top, height };
  };

  const hours = Array.from(
    { length: END_HOUR - START_HOUR },
    (_, i) => i + START_HOUR
  );

  const totalPlanned = blocks.reduce((acc, b) => {
    const diff =
      (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) /
      60000;
    return acc + diff;
  }, 0);

  const totalStudied = sessions.reduce(
    (acc, s) => acc + (s.duration_minutes || 0),
    0
  );

  const totalFreeTime = freeTimeLogs.reduce(
    (acc, l) => acc + (l.duration_minutes || 0),
    0
  );

  const freeMinutes =
    16 * 60 - (totalPlanned + totalStudied + totalFreeTime);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Daily Planner
          </p>
          <h1 className="text-3xl font-light tracking-tight">
            {formatDate(selectedDate)}
          </h1>
        </div>
        <button
          onClick={() => setShowAddBlock(true)}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.97]"
        >
          + Add Block
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

      {/* Daily Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "PLANNED",
            value: `${Math.floor(totalPlanned / 60)}h ${totalPlanned % 60}m`,
          },
          {
            label: "STUDIED",
            value: `${Math.floor(totalStudied / 60)}h ${totalStudied % 60}m`,
          },
          {
            label: "FREE TIME",
            value: `${Math.max(0, Math.floor(freeMinutes / 60))}h ${Math.max(0, freeMinutes % 60)}m`,
          },
          {
            label: "COMPLETION",
            value:
              totalPlanned > 0
                ? `${Math.round((totalStudied / totalPlanned) * 100)}%`
                : "—",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-2xl bg-card border border-border/30"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
              {item.label}
            </p>
            <p className="text-2xl font-light tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="grid grid-cols-[60px_1fr] gap-0">
          {hours.map((hour) => (
            <div key={hour} className="relative">
              <span className="absolute -top-2 right-3 text-[11px] text-muted-foreground font-medium">
                {hour.toString().padStart(2, "0")}:00
              </span>
              <div
                className="border-t border-border/20"
                style={{ height: HOUR_HEIGHT }}
              />
            </div>
          ))}

          {/* Blocks overlay */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-t border-border/20"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}

            {blocks.map((block) => {
              const style = getBlockStyle(block.start_time, block.end_time);
              const cat = CATEGORIES[block.type] || CATEGORIES.study;
              return (
                <div
                  key={block.id}
                  className={`absolute left-1 right-1 rounded-xl border-l-[3px] ${cat.bg} ${cat.border} p-2.5 group cursor-pointer hover:shadow-sm transition-all duration-200`}
                  style={{ top: style.top, height: style.height }}
                >
                  <p className={`text-xs font-medium ${cat.text} truncate`}>
                    {block.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(block.start_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}{" "}
                    –{" "}
                    {new Date(block.end_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                  <button
                    onClick={() => deleteBlock(block.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-background/80 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Current time indicator */}
            {selectedDate === new Date().toISOString().split("T")[0] && (
              <div
                className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{
                  top: (() => {
                    const now = new Date();
                    const mins = now.getHours() * 60 + now.getMinutes();
                    return ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  })(),
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1 h-px bg-primary/50" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Free Time Activity */}
      {freeTimeLogs.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Free Time Activities
          </p>
          <div className="space-y-1.5">
            {freeTimeLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/30"
              >
                <div>
                  <p className="text-sm font-medium">{log.category}</p>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground">{log.notes}</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {log.duration_minutes}m
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showAddBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowAddBlock(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Add Schedule Block</h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Title
                </label>
                <input
                  type="text"
                  value={newBlock.title}
                  onChange={(e) =>
                    setNewBlock((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  placeholder="e.g. Physics — Electrostatics"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setNewBlock((p) => ({ ...p, type: key }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        newBlock.type === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                    Start
                  </label>
                  <input
                    type="time"
                    value={newBlock.start_time}
                    onChange={(e) =>
                      setNewBlock((p) => ({ ...p, start_time: e.target.value }))
                    }
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                    End
                  </label>
                  <input
                    type="time"
                    value={newBlock.end_time}
                    onChange={(e) =>
                      setNewBlock((p) => ({ ...p, end_time: e.target.value }))
                    }
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddBlock(false)}
                className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addBlock}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
