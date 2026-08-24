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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getWeeksInMonth(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const weeks: Array<{
    week: number;
    start: string;
    end: string;
    label: string;
  }> = [];

  // Find first Monday on or before the 1st
  let current = new Date(firstDay);
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() - 1);
  }

  let weekNum = 1;
  while (current <= lastDay) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const endClamped = weekEnd > lastDay ? lastDay : weekEnd;

    const mShort = MONTH_NAMES[month - 1].slice(0, 3);
    weeks.push({
      week: weekNum,
      start: current.toISOString().slice(0, 10),
      end: endClamped.toISOString().slice(0, 10),
      label: `${mShort} ${current.getDate()}–${endClamped.getDate()}`,
    });

    current.setDate(current.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

export default function MonthPage() {
  const { user } = useAuth();
  const { sessions } = useStudyData();
  const [currentMonth, setCurrentMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
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
  const [addingToWeek, setAddingToWeek] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    subject_id: "",
    estimated_hours: 5,
    priority: "medium",
  });

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
        <div className="skeleton h-[300px] rounded-2xl" />
      </div>
    );
  }

  const monthNum = parseInt(currentMonth.split("-")[1]);
  const year = parseInt(currentMonth.split("-")[0]);
  const monthLabel = MONTH_NAMES[monthNum - 1] + " " + year;
  const weeks = getWeeksInMonth(year, monthNum);

  // Chapters for this month (target_date falls within the month)
  const monthChapters = chapters.filter((c) => {
    if (!c.target_date) return false;
    return c.target_date.startsWith(currentMonth);
  });

  // Chapters not assigned to any date (available to add)
  const unassignedChapters = chapters.filter((c) => !c.target_date);

  // Group month chapters by week
  const weekMap: Record<string, any[]> = {};
  weeks.forEach((w) => {
    weekMap[w.start] = [];
  });
  monthChapters.forEach((ch) => {
    const d = ch.target_date;
    // Find which week this date belongs to
    for (const w of weeks) {
      if (d >= w.start && d <= w.end) {
        weekMap[w.start].push(ch);
        break;
      }
    }
  });

  // Actual sessions this month
  const monthSessions = sessions.filter(
    (s) => s.start_time?.slice(0, 7) === currentMonth
  );
  const actualStudyHours =
    Math.round(
      (monthSessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) /
        60) *
        10
    ) / 10;

  const completedChapters = monthChapters.filter(
    (c) => c.status === "completed"
  ).length;
  const totalPlannedHours = monthChapters.reduce(
    (a, c) => a + (c.estimated_hours || 5),
    0
  );
  const completionPct =
    monthChapters.length > 0
      ? Math.round((completedChapters / monthChapters.length) * 100)
      : 0;

  // Toggle chapter completion
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

  // Assign chapter to a week (set target_date)
  const handleAssignChapter = async (chapterId: string, weekStart: string) => {
    await updateChapter(chapterId, { target_date: weekStart });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId ? { ...c, target_date: weekStart } : c
      )
    );
  };

  // Unassign chapter from week (clear target_date)
  const handleUnassignChapter = async (ch: any) => {
    await updateChapter(ch.id, { target_date: null });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === ch.id ? { ...c, target_date: null } : c
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

  // Add new chapter directly to a week
  const handleAddToWeek = async (weekStart: string) => {
    if (!addForm.name.trim() || !addForm.subject_id || !user) return;
    const ch = await createChapter({
      user_id: user.id,
      subject_id: addForm.subject_id,
      name: addForm.name,
      estimated_hours: addForm.estimated_hours,
      priority: addForm.priority,
      target_date: weekStart,
    });
    if (ch) {
      setChapters((prev) => [ch, ...prev]);
    }
    setAddingToWeek(null);
    setAddForm({ name: "", subject_id: "", estimated_hours: 5, priority: "medium" });
  };

  const navigateMonth = (offset: number) => {
    const d = new Date(year, monthNum - 1 + offset, 15);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Monthly Plan
          </p>
          <h1 className="text-3xl font-light tracking-tight">{monthLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setCurrentMonth(new Date().toISOString().slice(0, 7))
            }
            className="h-9 px-3 rounded-xl bg-card border border-border/50 text-xs font-medium hover:bg-muted transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth(1)}
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
            {completedChapters}/{monthChapters.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPct}% complete
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            PLANNED
          </p>
          <p className="text-3xl font-light">{Math.round(totalPlannedHours)}h</p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthChapters.length} chapters
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            ACTUAL
          </p>
          <p className="text-3xl font-light">{actualStudyHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthSessions.length} sessions
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
      {monthChapters.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Month Progress
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

      {/* Weekly breakdown */}
      <div className="space-y-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Plan Your Month
        </p>

        {weeks.map((week) => {
          const weekChapters = weekMap[week.start] || [];
          const weekHours = weekChapters.reduce(
            (a, c) => a + (c.estimated_hours || 5),
            0
          );
          const isCurrentWeek = (() => {
            const today = new Date().toISOString().slice(0, 10);
            return today >= week.start && today <= week.end;
          })();

          return (
            <div
              key={week.start}
              className={`rounded-2xl bg-card border overflow-hidden ${
                isCurrentWeek ? "border-primary/30" : "border-border/30"
              }`}
            >
              {/* Week Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      weekChapters.some((c: any) => c.status === "completed")
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    W{week.week}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Week {week.week}
                      {isCurrentWeek && (
                        <span className="ml-2 text-[10px] text-primary">
                          This Week
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {week.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {weekChapters.length} chapters
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {Math.round(weekHours)}h planned
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setAddingToWeek(
                        addingToWeek === week.start ? null : week.start
                      )
                    }
                    className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    Add
                  </button>
                </div>
              </div>

              {/* Add chapter form */}
              {addingToWeek === week.start && (
                <div className="px-4 py-3 border-b border-border/20 bg-muted/20">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1 block">
                        Chapter Name
                      </label>
                      <input
                        type="text"
                        value={addForm.name}
                        onChange={(e) =>
                          setAddForm((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. Kinematics"
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                    </div>
                    <div className="w-40">
                      <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1 block">
                        Subject
                      </label>
                      <select
                        value={addForm.subject_id}
                        onChange={(e) =>
                          setAddForm((p) => ({
                            ...p,
                            subject_id: e.target.value,
                          }))
                        }
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none cursor-pointer"
                      >
                        <option value="">Select</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1 block">
                        Hours
                      </label>
                      <input
                        type="number"
                        value={addForm.estimated_hours}
                        onChange={(e) =>
                          setAddForm((p) => ({
                            ...p,
                            estimated_hours: Number(e.target.value),
                          }))
                        }
                        min={1}
                        max={100}
                        className="w-full h-9 px-2 rounded-lg bg-background border border-border/50 text-sm text-center focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleAddToWeek(week.start)}
                      disabled={!addForm.name.trim() || !addForm.subject_id}
                      className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingToWeek(null);
                        setAddForm({
                          name: "",
                          subject_id: "",
                          estimated_hours: 5,
                          priority: "medium",
                        });
                      }}
                      className="h-9 px-3 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Chapters */}
              {weekChapters.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground/60">
                    No chapters planned — click Add or pick from unassigned above
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {weekChapters.map((ch: any) => {
                    const sub = subjects.find((s) => s.id === ch.subject_id);
                    const isCompleted = ch.status === "completed";
                    return (
                      <div
                        key={ch.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group"
                      >
                        <button
                          onClick={() => handleToggleChapter(ch)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-border/50 hover:border-primary/40"
                          }`}
                        >
                          {isCompleted && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              isCompleted
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {ch.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {sub && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor:
                                    (sub.color || "#6366f1") + "15",
                                  color: sub.color || "#6366f1",
                                }}
                              >
                                {sub.name}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {ch.estimated_hours || 5}h
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isCompleted && (
                            <span className="text-[10px] text-emerald-500 font-medium mr-1">
                              Done
                            </span>
                          )}
                          <button
                            onClick={() => handleUnassignChapter(ch)}
                            className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all flex items-center justify-center"
                            title="Remove from week"
                          >
                            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(ch);
                            }}
                            className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all flex items-center justify-center"
                            title="Edit chapter"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${ch.name}"?`))
                                handleDeleteChapter(ch);
                            }}
                            className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center"
                            title="Delete chapter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
