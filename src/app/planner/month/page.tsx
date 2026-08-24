"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects, fetchChapters, fetchDistributions, fetchYearPlan,
  updateChapter,
} from "@/lib/planner-v2";
import { getMonthStatus } from "@/lib/planner-v2";
import { ChevronLeft, ChevronRight, Check, Clock, BookOpen, Target } from "lucide-react";

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
                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <span className="text-[10px] text-emerald-500 font-medium">Done</span>
                          )}
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
    </div>
  );
}
