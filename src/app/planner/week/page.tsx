"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects,
  fetchChapters,
  fetchDistributions,
  fetchYearPlan,
  updateChapter,
  deleteChapter,
} from "@/lib/planner-v2";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  BookOpen,
  Pencil,
  Trash2,
} from "lucide-react";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekRange(offset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return {
    start: days[0],
    end: days[6],
    days,
  };
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

  const week = getWeekRange(weekOffset);

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

  const weekLabel = `${new Date(week.start + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(week.end + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Distribute chapters across 7 days
  const totalHours = chapters.reduce(
    (a, c) => a + (c.estimated_hours || 5),
    0
  );
  const hoursPerDay = 7 > 0 ? totalHours / 7 : 0;

  const dayAssignments: Array<{
    date: string;
    dayName: string;
    dayShort: string;
    chapters: any[];
    hours: number;
  }> = week.days.map((d, i) => ({
    date: d,
    dayName: DAY_NAMES[i],
    dayShort: DAY_SHORT[i],
    chapters: [],
    hours: 0,
  }));

  // Sort chapters by sort_order
  const sortedChapters = [...chapters].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  // Distribute chapters to days based on estimated hours
  let dayIdx = 0;
  let dayUsedHours = 0;
  sortedChapters.forEach((ch) => {
    if (dayIdx >= 7) dayIdx = 6;
    const chHours = ch.estimated_hours || 5;

    if (dayUsedHours + chHours > hoursPerDay * 1.3 && dayIdx < 6) {
      dayIdx++;
      dayUsedHours = 0;
    }

    dayAssignments[dayIdx].chapters.push(ch);
    dayAssignments[dayIdx].hours += chHours;
    dayUsedHours += chHours;
  });

  // Sessions this week
  const weekSessions = sessions.filter((s) => {
    if (!s.start_time) return false;
    const d = s.start_time.slice(0, 10);
    return d >= week.start && d <= week.end;
  });
  const actualStudyHours =
    Math.round(
      (weekSessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60) *
        10
    ) / 10;

  const completedChapters = chapters.filter(
    (c) => c.status === "completed"
  ).length;
  const completionPct =
    chapters.length > 0
      ? Math.round((completedChapters / chapters.length) * 100)
      : 0;

  // Toggle chapter
  const handleToggleChapter = async (ch: any) => {
    const newStatus = ch.status === "completed" ? "not_started" : "completed";
    await updateChapter(ch.id, {
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === ch.id
          ? {
              ...c,
              status: newStatus,
              completed_at:
                newStatus === "completed" ? new Date().toISOString() : null,
            }
          : c
      )
    );
  };

  // Delete chapter
  const handleDeleteChapter = async (ch: any) => {
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
          ? {
              ...c,
              name: editForm.name,
              subject_id: editForm.subject_id,
              estimated_hours: editForm.estimated_hours,
              priority: editForm.priority,
              status: editForm.status,
            }
          : c
      )
    );
    setEditingChapter(null);
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
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="h-9 px-3 rounded-xl bg-card border border-border/50 text-xs font-medium hover:bg-muted transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            CHAPTERS
          </p>
          <p className="text-3xl font-light">
            {completedChapters}/{chapters.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPct}% complete
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            PLANNED
          </p>
          <p className="text-3xl font-light">
            {Math.round(totalHours)}h
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {chapters.length} chapters
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            ACTUAL
          </p>
          <p className="text-3xl font-light">{actualStudyHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">
            {weekSessions.length} sessions
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            STATUS
          </p>
          <p className="text-3xl font-light">
            {completionPct >= 90
              ? "🎉"
              : completionPct >= 50
              ? "📊"
              : completionPct > 0
              ? "📝"
              : "📋"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPct >= 90
              ? "Almost done!"
              : completionPct >= 50
              ? "On track"
              : completionPct > 0
              ? "In progress"
              : "Not started"}
          </p>
        </div>
      </div>

      {/* Progress */}
      {chapters.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Week Progress
            </p>
            <p className="text-sm font-medium">{completionPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* No chapters */}
      {chapters.length === 0 && (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/30">
          <BookOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No chapters to study this week
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Go to Year Plan → Syllabus to add subjects and chapters
          </p>
        </div>
      )}

      {/* Day-by-day breakdown */}
      {chapters.length > 0 && (
        <div className="space-y-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Daily Breakdown
          </p>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {dayAssignments.map((day) => {
              const isToday =
                day.date === new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={day.date}
                  className={`rounded-2xl border overflow-hidden ${
                    isToday
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/30 bg-card"
                  }`}
                >
                  {/* Day header */}
                  <div
                    className={`px-3 py-2.5 border-b ${
                      isToday
                        ? "border-primary/10 bg-primary/5"
                        : "border-border/10"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {day.dayShort}
                    </p>
                    <p
                      className={`text-[10px] ${
                        isToday
                          ? "text-primary/70"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {new Date(day.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </p>
                  </div>

                  {/* Hours */}
                  {day.chapters.length > 0 && (
                    <div className="px-3 pt-2">
                      <p className="text-[10px] text-muted-foreground">
                        {Math.round(day.hours)}h
                      </p>
                    </div>
                  )}

                  {/* Chapters */}
                  <div className="p-2 space-y-1.5">
                    {day.chapters.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/40 px-1 py-2 text-center">
                        Free
                      </p>
                    ) : (
                      day.chapters.map((ch: any) => {
                        const sub = subjects.find(
                          (s) => s.id === ch.subject_id
                        );
                        const isCompleted = ch.status === "completed";
                        return (
                          <div
                            key={ch.id}
                            className="group rounded-lg bg-background/50 px-2 py-1.5 relative"
                          >
                            <div className="flex items-start gap-1.5">
                              <button
                                onClick={() => handleToggleChapter(ch)}
                                className={`mt-0.5 w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-border/50 hover:border-primary/40"
                                }`}
                              >
                                {isCompleted && (
                                  <Check className="w-2 h-2" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-[10px] leading-tight ${
                                    isCompleted
                                      ? "line-through text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  {ch.name}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {sub && (
                                    <span
                                      className="text-[8px] px-1 py-px rounded font-medium"
                                      style={{
                                        backgroundColor:
                                          (sub.color || "#6366f1") + "15",
                                        color: sub.color || "#6366f1",
                                      }}
                                    >
                                      {sub.name}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-muted-foreground">
                                    {ch.estimated_hours || 5}h
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="absolute top-1 right-1 flex items-center gap-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(ch);
                                }}
                                className="w-5 h-5 rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all flex items-center justify-center"
                                title="Edit chapter"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Delete "${ch.name}"?`
                                    )
                                  )
                                    handleDeleteChapter(ch);
                                }}
                                className="w-5 h-5 rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center"
                                title="Delete chapter"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
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
      )}

      {/* Edit Modal */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setEditingChapter(null)}
          />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Edit Chapter</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Chapter Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Subject
                </label>
                <select
                  value={editForm.subject_id}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, subject_id: e.target.value }))
                  }
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={editForm.estimated_hours}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        estimated_hours: Number(e.target.value),
                      }))
                    }
                    min={1}
                    max={100}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                    Priority
                  </label>
                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, priority: e.target.value }))
                    }
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, status: e.target.value }))
                  }
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer"
                >
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
              <button
                onClick={() => setEditingChapter(null)}
                className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
