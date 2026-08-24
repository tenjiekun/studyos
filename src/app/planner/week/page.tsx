"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects,
  fetchChapters,
  updateChapter,
  deleteChapter,
  createChapter,
} from "@/lib/planner-v2";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDays(offset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  const days: Array<{ name: string; date: string; fullDate: Date }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      name: DAY_NAMES[i],
      date: d.toISOString().slice(0, 10),
      fullDate: d,
    });
  }
  return days;
}

export default function WeekPage() {
  const { user } = useAuth();
  const { sessions } = useStudyData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    subject_id: "",
    estimated_hours: 5,
    priority: "medium",
    status: "not_started",
  });
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    subject_id: "",
    estimated_hours: 5,
  });

  const days = getWeekDays(weekOffset);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subjs, chaps] = await Promise.all([
      fetchSubjects(user.id),
      fetchChapters(user.id),
    ]);
    setSubjects(subjs);
    setChapters(chaps);
    setMounted(true);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-[400px] rounded-2xl" />
      </div>
    );
  }

  const weekLabel = `${new Date(days[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(days[6].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Group chapters by day using target_date
  const dayChapters: Record<string, any[]> = {};
  days.forEach((d) => {
    dayChapters[d.date] = [];
  });
  chapters.forEach((ch) => {
    if (ch.target_date && dayChapters[ch.target_date]) {
      dayChapters[ch.target_date].push(ch);
    }
  });

  // This week's chapters
  const weekChapters = chapters.filter((ch) => {
    if (!ch.target_date) return false;
    return days.some((d) => d.date === ch.target_date);
  });

  // Sessions this week
  const weekSessions = sessions.filter((s) => {
    if (!s.start_time) return false;
    const d = s.start_time.slice(0, 10);
    return days.some((dd) => dd.date === d);
  });
  const actualStudyHours =
    Math.round(
      (weekSessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60) *
        10
    ) / 10;

  const completedChapters = weekChapters.filter(
    (c) => c.status === "completed"
  ).length;
  const totalHours = weekChapters.reduce(
    (a, c) => a + (c.estimated_hours || 5),
    0
  );
  const completionPct =
    weekChapters.length > 0
      ? Math.round((completedChapters / weekChapters.length) * 100)
      : 0;

  // Toggle
  const handleToggleChapter = async (ch: any) => {
    const newStatus = ch.status === "completed" ? "not_started" : "completed";
    await updateChapter(ch.id, {
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === ch.id
          ? { ...c, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }
          : c
      )
    );
  };

  // Unassign
  const handleUnassign = async (ch: any) => {
    await updateChapter(ch.id, { target_date: null });
    setChapters((prev) =>
      prev.map((c) => (c.id === ch.id ? { ...c, target_date: null } : c))
    );
  };

  // Delete
  const handleDelete = async (ch: any) => {
    await deleteChapter(ch.id);
    setChapters((prev) => prev.filter((c) => c.id !== ch.id));
  };

  // Edit
  const openEdit = (ch: any) => {
    setEditingChapter(ch);
    setEditForm({
      name: ch.name,
      subject_id: ch.subject_id,
      estimated_hours: ch.estimated_hours || 5,
      priority: ch.priority || "medium",
      status: ch.status || "not_started",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingChapter) return;
    await updateChapter(editingChapter.id, {
      name: editForm.name,
      subject_id: editForm.subject_id,
      estimated_hours: editForm.estimated_hours,
      priority: editForm.priority,
      status: editForm.status,
    });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === editingChapter.id
          ? { ...c, name: editForm.name, subject_id: editForm.subject_id, estimated_hours: editForm.estimated_hours, priority: editForm.priority, status: editForm.status }
          : c
      )
    );
    setEditingChapter(null);
  };

  // Add to day
  const handleAdd = async (date: string) => {
    if (!addForm.name.trim() || !addForm.subject_id || !user) return;
    const ch = await createChapter({
      user_id: user.id,
      subject_id: addForm.subject_id,
      name: addForm.name,
      estimated_hours: addForm.estimated_hours,
      target_date: date,
    });
    if (ch) setChapters((prev) => [ch, ...prev]);
    setAddingToDay(null);
    setAddForm({ name: "", subject_id: "", estimated_hours: 5 });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Weekly Plan
          </p>
          <h1 className="text-3xl font-light tracking-tight">{weekLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="h-9 px-3 rounded-xl bg-card border border-border/50 text-xs font-medium hover:bg-muted transition-colors">
            This Week
          </button>
          <button onClick={() => setWeekOffset((o) => o + 1)} className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">CHAPTERS</p>
          <p className="text-3xl font-light">{completedChapters}/{weekChapters.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{completionPct}% complete</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">PLANNED</p>
          <p className="text-3xl font-light">{Math.round(totalHours)}h</p>
          <p className="text-xs text-muted-foreground mt-1">{weekChapters.length} chapters</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">ACTUAL</p>
          <p className="text-3xl font-light">{actualStudyHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">{weekSessions.length} sessions</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">STATUS</p>
          <p className="text-3xl font-light">{completionPct >= 90 ? "🎉" : completionPct >= 50 ? "📊" : completionPct > 0 ? "📝" : "📋"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPct >= 90 ? "Almost done!" : completionPct >= 50 ? "On track" : completionPct > 0 ? "In progress" : "Not started"}
          </p>
        </div>
      </div>

      {/* Progress */}
      {weekChapters.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Week Progress</p>
            <p className="text-sm font-medium">{completionPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      )}

      {/* Day-by-day */}
      <div className="space-y-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Plan Your Week</p>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {days.map((day) => {
            const isToday = day.date === new Date().toISOString().slice(0, 10);
            const dayCh = dayChapters[day.date] || [];
            const dayHours = dayCh.reduce((a, c) => a + (c.estimated_hours || 5), 0);

            return (
              <div key={day.date} className={`rounded-2xl border overflow-hidden ${isToday ? "border-primary/30 bg-primary/5" : "border-border/30 bg-card"}`}>
                {/* Day header */}
                <div className={`px-3 py-2.5 border-b flex items-center justify-between ${isToday ? "border-primary/10 bg-primary/5" : "border-border/10"}`}>
                  <div>
                    <p className={`text-[11px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.name}</p>
                    <p className={`text-[10px] ${isToday ? "text-primary/70" : "text-muted-foreground/60"}`}>
                      {day.fullDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => setAddingToDay(addingToDay === day.date ? null : day.date)}
                    className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-primary" />
                  </button>
                </div>

                {/* Hours */}
                {dayCh.length > 0 && (
                  <div className="px-3 pt-2">
                    <p className="text-[10px] text-muted-foreground">{Math.round(dayHours)}h</p>
                  </div>
                )}

                {/* Add form */}
                {addingToDay === day.date && (
                  <div className="px-2 py-2 border-b border-border/10 bg-muted/20 space-y-1.5">
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Chapter name"
                      className="w-full h-7 px-2 rounded bg-background border border-border/50 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/20"
                      autoFocus
                    />
                    <select
                      value={addForm.subject_id}
                      onChange={(e) => setAddForm((p) => ({ ...p, subject_id: e.target.value }))}
                      className="w-full h-7 px-2 rounded bg-background border border-border/50 text-[11px] focus:outline-none cursor-pointer"
                    >
                      <option value="">Subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={addForm.estimated_hours}
                        onChange={(e) => setAddForm((p) => ({ ...p, estimated_hours: Number(e.target.value) }))}
                        min={1} max={100}
                        className="w-14 h-7 px-1 rounded bg-background border border-border/50 text-[11px] text-center focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground self-center">h</span>
                      <div className="flex-1" />
                      <button
                        onClick={() => handleAdd(day.date)}
                        disabled={!addForm.name.trim() || !addForm.subject_id}
                        className="h-7 px-2 rounded bg-primary text-primary-foreground text-[10px] font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingToDay(null); setAddForm({ name: "", subject_id: "", estimated_hours: 5 }); }}
                        className="h-7 px-2 rounded bg-muted text-[10px] text-muted-foreground hover:bg-muted/80"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Chapters */}
                <div className="p-2 space-y-1.5">
                  {dayCh.length === 0 && addingToDay !== day.date ? (
                    <p className="text-[10px] text-muted-foreground/40 px-1 py-2 text-center">Free</p>
                  ) : (
                    dayCh.map((ch: any) => {
                      const sub = subjects.find((s) => s.id === ch.subject_id);
                      const isCompleted = ch.status === "completed";
                      return (
                        <div key={ch.id} className="group rounded-lg bg-background/50 px-2 py-1.5 relative">
                          <div className="flex items-start gap-1.5">
                            <button onClick={() => handleToggleChapter(ch)} className={`mt-0.5 w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/50 hover:border-primary/40"}`}>
                              {isCompleted && <Check className="w-2 h-2" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] leading-tight ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{ch.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {sub && <span className="text-[8px] px-1 py-px rounded font-medium" style={{ backgroundColor: (sub.color || "#6366f1") + "15", color: sub.color || "#6366f1" }}>{sub.name}</span>}
                                <span className="text-[9px] text-muted-foreground">{ch.estimated_hours || 5}h</span>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-1 right-1 flex items-center gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); openEdit(ch); }} className="w-5 h-5 rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all flex items-center justify-center" title="Edit"><Pencil className="w-2.5 h-2.5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); if(confirm(`Delete "${ch.name}"?`)) handleDelete(ch); }} className="w-5 h-5 rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center" title="Delete"><Trash2 className="w-2.5 h-2.5" /></button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setEditingChapter(null)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Edit Chapter</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Chapter Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subject</label>
                <select value={editForm.subject_id} onChange={(e) => setEditForm((p) => ({ ...p, subject_id: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Estimated Hours</label>
                  <input type="number" value={editForm.estimated_hours} onChange={(e) => setEditForm((p) => ({ ...p, estimated_hours: Number(e.target.value) }))} min={1} max={100} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                  <option value="not_started">Not Started</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="revising">Revising</option>
                  <option value="needs_revision">Needs Revision</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingChapter(null)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
