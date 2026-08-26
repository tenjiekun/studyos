"use client";

import { useState, useEffect } from "react";
import { useStudyData } from "@/lib/use-study-data";
import {
  getGreeting,
  formatDate,
  formatMinutes,
  getTodayStr,
  getTodayTasks,
  getDayMinutes,
  calculateStreak,
  getWeekDayName,
  getSubjectColor,
} from "@/lib/helpers";
import { StudyHeatmap } from "@/components/heatmap";
import { RealtimeStatus } from "@/components/realtime-status";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Play,
  Plus,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export default function DashboardPage() {
  const { tasks, sessions, heatmapData, toggleTask, loading } = useStudyData();
  const [heatmapRange, setHeatmapRange] = useState<"30d" | "3m" | "6m" | "1y">("6m");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
        <div className="space-y-3">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-4 w-36" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="skeleton h-[200px] rounded-2xl" />
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 skeleton h-[300px] rounded-2xl" />
          <div className="md:col-span-2 skeleton h-[300px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const today = getTodayStr();
  const todayTasks = getTodayTasks(tasks);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const totalTodayMinutes = getDayMinutes(sessions, today);
  const streak = calculateStreak(heatmapData);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: getWeekDayName(key), minutes: heatmapData[key] || 0, date: key };
  });

  const tasksPerDay: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.completed) tasksPerDay[t.scheduled_date] = (tasksPerDay[t.scheduled_date] || 0) + 1;
  });

  const pomodorosPerDay: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.session_type === "pomodoro") {
      const dayKey = s.start_time.slice(0, 10);
      pomodorosPerDay[dayKey] = (pomodorosPerDay[dayKey] || 0) + 1;
    }
  });

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-10">
      {/* Greeting */}
      <div className="animate-fade-in flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            {getGreeting()} 👋
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            {formatDate(new Date())}
          </p>
        </div>
        <RealtimeStatus />
      </div>

      {/* Metrics — typography-first, Apple style */}
      <div className="grid grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Tasks
          </p>
          <p className="text-3xl font-semibold tracking-tight">
            {completedToday}
            <span className="text-lg text-muted-foreground font-normal">/{todayTasks.length}</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Focus
          </p>
          <p className="text-3xl font-semibold tracking-tight">
            {formatMinutes(totalTodayMinutes)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Streak
          </p>
          <p className="text-3xl font-semibold tracking-tight">
            {streak.current}
            <span className="text-lg text-muted-foreground font-normal"> days</span>
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Study Consistency</h2>
        <div className="p-5 rounded-2xl border border-border/50 bg-card/50">
          {Object.keys(heatmapData).length > 0 ? (
            <StudyHeatmap
              data={heatmapData}
              range={heatmapRange}
              onRangeChange={setHeatmapRange}
              tasksPerDay={tasksPerDay}
              pomodorosPerDay={pomodorosPerDay}
            />
          ) : (
            <div className="text-center py-10">
              <BookOpen className="w-7 h-7 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Start a focus session to see your heatmap</p>
            </div>
          )}
        </div>
      </div>

      {/* Tasks + Focus */}
      <div className="grid md:grid-cols-5 gap-6 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        {/* Today's Tasks */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-muted-foreground">Today&apos;s Tasks</h2>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <div className="space-y-1">
            {todayTasks.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No tasks for today yet</p>
                <Link href="/tasks">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add a task
                  </Button>
                </Link>
              </div>
            ) : (
              todayTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors duration-150 group"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate transition-all duration-300 ${
                      task.completed ? "line-through text-muted-foreground" : "text-foreground"
                    }`}>
                      {task.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {task.subject} · {task.estimated_minutes}min
                    </p>
                  </div>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60"
                    style={{ backgroundColor: getSubjectColor(task.subject) }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Focus */}
        <div className="md:col-span-2">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Quick Focus</h2>
          <div className="p-6 rounded-2xl border border-border/50 bg-card/50 text-center space-y-5">
            <div>
              <p className="text-4xl font-semibold tracking-tight timer-display">
                {formatMinutes(totalTodayMinutes)}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">studied today</p>
            </div>
            <div className="space-y-2 px-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Daily Goal</span>
                <span className="font-medium text-foreground">{formatMinutes(totalTodayMinutes)} / 6h</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((totalTodayMinutes / 360) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Link href="/focus" className="block">
              <Button className="w-full gap-2 h-11 rounded-xl" size="lg">
                <Play className="w-4 h-4" fill="currentColor" />
                Start Focus
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* This Week — bar chart */}
      <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">This Week</h2>
          <p className="text-xs text-muted-foreground">
            {formatMinutes(weekData.reduce((a, d) => a + d.minutes, 0))} total
          </p>
        </div>
        <div className="p-5 rounded-2xl border border-border/50 bg-card/50">
          <div className="flex items-end gap-3 h-28">
            {weekData.map((day, i) => {
              const maxMin = Math.max(...weekData.map((d) => d.minutes), 1);
              const height =
                day.minutes > 0
                  ? Math.max((day.minutes / maxMin) * 100, 6)
                  : 3;
              const isToday = day.date === today;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ease-out ${
                      isToday ? "bg-primary" : "bg-primary/20"
                    }`}
                    style={{ height: `${height}%`, minHeight: "3px" }}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      isToday ? "text-primary" : "text-muted-foreground/60"
                    }`}
                  >
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
