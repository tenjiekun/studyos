"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects, fetchChapters, fetchDistributions, fetchYearPlan,
  updateChapter, deleteChapter,
} from "@/lib/planner-v2";
import { getMonthStatus } from "@/lib/planner-v2";
import { ChevronLeft, ChevronRight, Check, Clock, BookOpen, Target, Pencil, Trash2, MoreHorizontal } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MonthPage() {
  const { user } = useAuth();
  const { sessions } = useStudyData();
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", subject_id: "", estimated_hours: 5, priority: "medium", status: "not_started" });

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subjs, chaps] = await Promise.all([
      fetchSubjects(user.id),
      fetchChapters(user.id),
    ]);
    setSubjects(subjs);
    setChapters(chaps);
    const yp = await fetchYearPlan(user.id);
    if (yp) {
      const dists = await fetchDistributions(yp.id);
      setDistributions(dists);
    }
    setMounted(true);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!mounted) {
    return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-[300px] rounded-2xl" /></div>;
  }

  const monthNum = parseInt(currentMonth.split("-")[1]);
  const year = parseInt(currentMonth.split("-")[0]);
  const monthLabel = MONTH_NAMES[monthNum - 1] + " " + year;

  // Get distributions for this month
  const monthDists = distributions.filter((d) => d.month === currentMonth);

  // Get the month's total planned chapters and hours
  const totalPlannedChapters = monthDists.reduce((a, d) => a + (d.planned_chapters || 0), 0);
  const totalPlannedHours = monthDists.reduce((a, d) => a + (d.planned_hours || 0), 0);

  // Get all chapters that belong to subjects in this month's distribution
  const monthSubjectIds = monthDists.map((d) => d.subject_id);

  // Distribute chapters across 4 weeks of the month
  // Get all chapters for the subjects in this month's plan, sorted by sort_order
  const monthChapters = chapters
    .filter((c) => monthSubjectIds.includes(c.subject_id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Calculate which chapters go to which week based on estimated hours
  const weeksInMonth = 4;
  const hoursPerWeek = weeksInMonth > 0 ? totalPlannedHours / weeksInMonth : 0;

  // Build weekly assignments
  const weekAssignments: Array<{
    week: number;
    label: string;
    chapters: any[];
    plannedHours: number;
  }> = [];

  let currentWeekHours = 0;
  let currentWeekChapters: any[] = [];
  let weekNum = 0;

  // Get days in month for week labels
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  for (let w = 0; w < weeksInMonth; w++) {
    const weekStart = w * 7 + 1;
    const weekEnd = Math.min((w + 1) * 7, daysInMonth);
    weekAssignments.push({
      week: w + 1,
      label: `${MONTH_NAMES[monthNum - 1].slice(0, 3)} ${weekStart}–${weekEnd}`,
      chapters: [],
      plannedHours: 0,
    });
  }

  // Distribute chapters to weeks based on estimated hours
  let weekIdx = 0;
  let weekUsedHours = 0;
  monthChapters.forEach((ch) => {
    if (weekIdx >= weeksInMonth) weekIdx = weeksInMonth - 1;
    const chHours = ch.estimated_hours || 5;

    // If this chapter would exceed the week's capacity, move to next week
    if (weekUsedHours + chHours > hoursPerWeek * 1.3 && weekIdx < weeksInMonth - 1) {
      weekIdx++;
      weekUsedHours = 0;
    }

    weekAssignments[weekIdx].chapters.push(ch);
    weekAssignments[weekIdx].plannedHours += chHours;
    weekUsedHours += chHours;
  });

  // Actual sessions this month
  const monthSessions = sessions.filter((s) => s.start_time?.slice(0, 7) === currentMonth);
  const actualStudyHours = Math.round(monthSessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60 * 10) / 10;

  // Count completed chapters
  const completedChapters = monthChapters.filter((c) => c.status === "completed").length;
  const completionPct = monthChapters.length > 0 ? Math.round((completedChapters / monthChapters.length) * 100) : 0;

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
          ? { ...c, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }
          : c
      )
    );
  };

  // Delete chapter
  const handleDeleteChapter = async (ch: any) => {
    await deleteChapter(ch.id);
    setChapters((prev) => prev.filter((c) => c.id !== ch.id));
  };

  // Open edit dialog
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

  // Save edit
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

  const navigateMonth = (offset: number) => {
    const d = new Date(year, monthNum - 1 + offset, 15);
    setCurrentMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1">Monthly Plan</p>
          <h1 className="text-3xl font-light tracking-tight">{monthLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(new Date().toISOString().slice(0, 7))} className="h-9 px-3 rounded-xl bg-card border border-border/50 text-xs font-medium hover:bg-muted transition-colors">
            Today
          </button>
          <button onClick={() => navigateMonth(1)} className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">CHAPTERS</p>
          <p className="text-3xl font-light">{completedChapters}/{monthChapters.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{completionPct}% complete</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">PLANNED</p>
          <p className="text-3xl font-light">{totalPlannedHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">{totalPlannedChapters} chapters</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">ACTUAL</p>
          <p className="text-3xl font-light">{actualStudyHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">{monthSessions.length} sessions</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">STATUS</p>
          <p className="text-3xl font-light">
            {completionPct >= 90 ? "🎉" : completionPct >= 50 ? "📊" : completionPct > 0 ? "📝" : "📋"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPct >= 90 ? "Almost done!" : completionPct >= 50 ? "On track" : completionPct > 0 ? "In progress" : "Not started"}
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      {monthChapters.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Month Progress</p>
            <p className="text-sm font-medium">{completionPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      )}

      {/* No distribution */}
      {monthChapters.length === 0 && (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/30">
          <BookOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No chapters planned for this month</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Go to Year Plan → Distribute to generate monthly plans</p>
        </div>
      )}

      {/* ===== WEEKLY BREAKDOWN ===== */}
      {monthChapters.length > 0 && (
        <div className="space-y-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Weekly Breakdown</p>

          {weekAssignments.map((week) => (
            <div key={week.week} className="rounded-2xl bg-card border border-border/30 overflow-hidden">
              {/* Week Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                    week.chapters.some((c: any) => c.status === "completed")
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    W{week.week}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Week {week.week}</p>
                    <p className="text-[11px] text-muted-foreground">{week.label}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{week.chapters.length} chapters</p>
                  <p className="text-[11px] text-muted-foreground">{Math.round(week.plannedHours)}h planned</p>
                </div>
              </div>

              {/* Week Progress */}
              <div className="px-4 pt-3">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{
                      width: week.chapters.length > 0
                        ? `${Math.round((week.chapters.filter((c: any) => c.status === "completed").length / week.chapters.length) * 100)}%`
                        : "0%"
                    }}
                  />
                </div>
              </div>

              {/* Chapters */}
              {week.chapters.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">No chapters assigned</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {week.chapters.map((ch: any) => {
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
                          <p className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {ch.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {sub && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor: (sub.color || "#6366f1") + "15",
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
                            <span className="text-[10px] text-emerald-500 font-medium mr-1">Done</span>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); openEdit(ch); }} className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all flex items-center justify-center" title="Edit chapter">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); if(confirm(`Delete \"${ch.name}\"?`)) handleDeleteChapter(ch); }} className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center" title="Delete chapter">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== EDIT CHAPTER MODAL ===== */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setEditingChapter(null)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Edit Chapter</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Chapter Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subject</label>
                <select value={editForm.subject_id} onChange={(e) => setEditForm((p) => ({ ...p, subject_id: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Estimated Hours</label>
                  <input type="number" value={editForm.estimated_hours} onChange={(e) => setEditForm((p) => ({ ...p, estimated_hours: Number(e.target.value) }))} min={1} max={100}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
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
