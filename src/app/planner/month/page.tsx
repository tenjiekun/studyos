"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects, fetchChapters, fetchDistributions, fetchYearPlan,
} from "@/lib/planner-v2";
import { calculateSyllabusStats, getMonthStatus } from "@/lib/planner-v2";
import { Plus, ChevronLeft, ChevronRight, Target, BookOpen, Clock, Check } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function MonthPage() {
  const { user } = useAuth();
  const { sessions, tasks } = useStudyData();
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

    // Try to load distributions from any active year plan
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

  const monthLabel = MONTH_NAMES[parseInt(currentMonth.split("-")[1]) - 1] + " " + currentMonth.split("-")[0];

  // Filter distributions for this month
  const monthDists = distributions.filter((d) => d.month === currentMonth);
  const totalPlannedHours = monthDists.reduce((a, d) => a + (d.planned_hours || 0), 0);
  const totalPlannedChapters = monthDists.reduce((a, d) => a + (d.planned_chapters || 0), 0);
  const totalActualHours = monthDists.reduce((a, d) => a + (d.actual_hours || 0), 0);
  const totalActualChapters = monthDists.reduce((a, d) => a + (d.actual_chapters || 0), 0);

  // Actual study sessions this month
  const monthSessions = sessions.filter((s) => s.start_time?.slice(0, 7) === currentMonth);
  const actualStudyMinutes = monthSessions.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const actualStudyHours = Math.round(actualStudyMinutes / 60 * 10) / 10;

  // Tasks this month
  const monthTasks = tasks.filter((t) => t.scheduled_date?.slice(0, 7) === currentMonth);
  const completedTasks = monthTasks.filter((t) => t.completed).length;

  // Progress
  const completionPct = totalPlannedChapters > 0 ? Math.round((totalActualChapters / totalPlannedChapters) * 100) : 0;
  const hourPct = totalPlannedHours > 0 ? Math.round((actualStudyHours / totalPlannedHours) * 100) : 0;

  const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7);
  const isPast = currentMonth < new Date().toISOString().slice(0, 7);

  const navigateMonth = (offset: number) => {
    const d = new Date(currentMonth + "-15");
    d.setMonth(d.getMonth() + offset);
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">CHAPTERS</p>
          <p className="text-3xl font-light">{totalActualChapters}/{totalPlannedChapters}</p>
          <p className="text-xs text-muted-foreground mt-1">{completionPct}% complete</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">TASKS</p>
          <p className="text-3xl font-light">{completedTasks}/{monthTasks.length}</p>
          <p className="text-xs text-muted-foreground mt-1">completed</p>
        </div>
      </div>

      {/* Progress Bar */}
      {totalPlannedHours > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Month Progress</p>
            <p className="text-sm font-medium">{hourPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(hourPct, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{actualStudyHours}h studied</span>
            <span className="text-xs text-muted-foreground">{totalPlannedHours}h planned</span>
          </div>
        </div>
      )}

      {/* No distribution message */}
      {monthDists.length === 0 && (
        <div className="text-center py-12 rounded-2xl bg-card border border-border/30">
          <BookOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No plan for this month</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Go to Year Plan → Distribute to generate monthly plans</p>
        </div>
      )}

      {/* Subject Breakdown */}
      {monthDists.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Subject Breakdown</p>
          {monthDists.map((d) => {
            const sub = subjects.find((s) => s.id === d.subject_id);
            if (!sub) return null;
            const subChapters = chapters.filter((c) => c.subject_id === d.subject_id);
            const subCompleted = subChapters.filter((c) => c.status === "completed").length;
            const subPct = subChapters.length > 0 ? Math.round((subCompleted / subChapters.length) * 100) : 0;

            return (
              <div key={d.id} className="p-5 rounded-2xl bg-card border border-border/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color || "#6366f1" }} />
                  <p className="text-sm font-medium flex-1">{sub.name}</p>
                  <p className="text-sm text-muted-foreground">{d.planned_hours}h planned · {d.planned_chapters} chapters</p>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${subPct}%`, backgroundColor: sub.color || "#6366f1" }} />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[11px] text-muted-foreground">{subCompleted}/{subChapters.length} chapters done</span>
                  <span className="text-[11px] text-muted-foreground">{subPct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Study Sessions */}
      {monthSessions.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Recent Sessions</p>
          <div className="space-y-1.5">
            {monthSessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.subject || "Study Session"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(s.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{s.duration_minutes}m</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
