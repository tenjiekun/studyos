"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchYearPlans, fetchGoals, fetchTests, fetchSyllabus,
  fetchBlocks, calculateSyllabusProgress,
} from "@/lib/planner";
import { YearPlan, PlanGoal, Test, SyllabusItem, ScheduledBlock } from "@/lib/types";
import { getTodayStr, formatMinutes } from "@/lib/helpers";
import { CalendarDays, Target, BookOpen, ListChecks, Clock, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function PlannerOverview() {
  const { user } = useAuth();
  const { sessions, tasks, settings } = useStudyData();
  const [yearPlan, setYearPlan] = useState<YearPlan | null>(null);
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [todayBlocks, setTodayBlocks] = useState<ScheduledBlock[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = getTodayStr();
    const monthStart = today.slice(0, 7) + "-01";
    const monthEnd = today.slice(0, 7) + "-31";
    const twoWeeksLater = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

    Promise.all([
      fetchYearPlans(user.id),
      fetchGoals(user.id, "year"),
      fetchTests(user.id, undefined, today, twoWeeksLater),
      fetchSyllabus(user.id),
      fetchBlocks(user.id, today + "T00:00:00", today + "T23:59:59"),
    ]).then(([yp, g, t, s, b]) => {
      setYearPlan(yp[0] || null);
      setGoals(g);
      setUpcomingTests(t);
      setSyllabus(s);
      setTodayBlocks(b);
      setMounted(true);
    });
  }, [user]);

  if (!mounted || !user) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const today = getTodayStr();
  const todaySessions = sessions.filter((s) => s.start_time.slice(0, 10) === today);
  const todayMinutes = todaySessions.reduce((a, s) => a + s.duration_minutes, 0);
  const todayTasks = tasks.filter((t) => t.scheduled_date === today);
  const completedTasks = todayTasks.filter((t) => t.completed).length;
  const syllabusProgress = calculateSyllabusProgress(syllabus);
  const plannedMinutes = settings.daily_goal_minutes * 60;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Planner</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">
          {yearPlan ? yearPlan.title : "Plan your academic year"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Study", value: formatMinutes(todayMinutes), sub: `of ${formatMinutes(plannedMinutes / 60)} planned`, icon: Clock, color: "text-primary" },
          { label: "Tasks Done", value: `${completedTasks}/${todayTasks.length}`, sub: "today", icon: ListChecks, color: "text-emerald-500" },
          { label: "Syllabus", value: `${syllabusProgress.percentage}%`, sub: `${syllabusProgress.completed}/${syllabusProgress.total} chapters`, icon: BookOpen, color: "text-amber-500" },
          { label: "Goals", value: goals.filter((g) => g.status === "completed").length.toString(), sub: `of ${goals.length} completed`, icon: Target, color: "text-blue-500" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl border border-border/50 bg-card/30 space-y-1">
            <div className="flex items-center gap-1.5 mb-2">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's Schedule + Upcoming Tests */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Today&apos;s Schedule</h2>
            <Link href="/planner/day">
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <div className="space-y-1">
            {todayBlocks.length === 0 ? (
              <div className="py-8 text-center">
                <CalendarDays className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No schedule for today</p>
                <Link href="/planner/day">
                  <button className="text-xs text-primary mt-2 hover:underline">Plan your day</button>
                </Link>
              </div>
            ) : (
              todayBlocks.slice(0, 6).map((block) => {
                const start = new Date(block.start_time);
                const end = new Date(block.end_time);
                return (
                  <div key={block.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="text-[11px] text-muted-foreground font-medium w-16 text-right shrink-0">
                      {start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </div>
                    <div className="w-0.5 h-8 rounded-full bg-primary/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{block.title}</p>
                      <p className="text-[11px] text-muted-foreground">{block.subject || block.type}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Tests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">Upcoming Tests</h2>
            <Link href="/planner/tests">
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <div className="space-y-1">
            {upcomingTests.length === 0 ? (
              <div className="py-8 text-center">
                <ListChecks className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming tests</p>
              </div>
            ) : (
              upcomingTests.slice(0, 5).map((test) => (
                <Link key={test.id} href="/planner/tests">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">
                        {new Date(test.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{test.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {test.type === "mock" ? "Mock" : "Test"} · {test.duration_minutes}min
                        {test.target_marks ? ` · Target: ${test.target_marks}/${test.max_marks}` : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Goals */}
      {goals.filter((g) => g.status !== "completed").length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Active Goals</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {goals.filter((g) => g.status !== "completed").slice(0, 4).map((goal) => (
              <div key={goal.id} className="px-4 py-3 rounded-2xl border border-border/50 bg-card/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-medium truncate">{goal.title}</p>
                  <span className="text-[11px] text-muted-foreground">{goal.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                </div>
                {goal.subject && <p className="text-[11px] text-muted-foreground mt-1.5">{goal.subject}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
