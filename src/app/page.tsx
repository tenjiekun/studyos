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
import {
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  Play,
  TrendingUp,
  Plus,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export default function DashboardPage() {
  const { tasks, sessions, heatmapData, toggleTask, loading } = useStudyData();
  const [heatmapRange, setHeatmapRange] = useState<"30d" | "3m" | "6m" | "1y">("6m");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-48 bg-muted rounded-xl" />
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
    return {
      day: getWeekDayName(key),
      minutes: heatmapData[key] || 0,
      date: key,
    };
  });

  const maxWeekMinutes = Math.max(...weekData.map((d) => d.minutes), 1);
  const hasData = tasks.length > 0 || sessions.length > 0;

  // Build per-day task counts for heatmap tooltip
  const tasksPerDay: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.completed) {
      tasksPerDay[t.scheduled_date] = (tasksPerDay[t.scheduled_date] || 0) + 1;
    }
  });

  // Build per-day pomodoro counts for heatmap tooltip
  const pomodorosPerDay: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.session_type === "pomodoro") {
      const dayKey = s.start_time.slice(0, 10);
      pomodorosPerDay[dayKey] = (pomodorosPerDay[dayKey] || 0) + 1;
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {getGreeting()} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatDate(new Date())}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4 animate-fade-in">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground font-medium">Tasks</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold tracking-tight">
              {completedToday}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}/ {todayTasks.length}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Focus</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold tracking-tight">
              {formatMinutes(totalTodayMinutes)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Streak</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold tracking-tight">
              {streak.current}
              <span className="text-muted-foreground text-sm font-normal"> days</span>
              {streak.current > 0 && <span className="text-base ml-1">🔥</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Study Consistency</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(heatmapData).length > 0 ? (
            <StudyHeatmap
              data={heatmapData}
              range={heatmapRange}
              onRangeChange={setHeatmapRange}
              tasksPerDay={tasksPerDay}
              pomodorosPerDay={pomodorosPerDay}
            />
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Start a focus session to see your heatmap
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-5 gap-4 animate-fade-in">
        <Card className="md:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Today&apos;s Tasks</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  No tasks for today yet
                </p>
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
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        task.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.subject} · {task.estimated_minutes}min
                    </p>
                  </div>
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: getSubjectColor(task.subject) }}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Focus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-4xl font-semibold timer-display tracking-tight">
                {formatMinutes(totalTodayMinutes)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">studied today</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Daily Goal</span>
                <span className="font-medium">
                  {formatMinutes(totalTodayMinutes)} / 6h
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min((totalTodayMinutes / 360) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
            <Link href="/focus" className="block">
              <Button className="w-full gap-2" size="lg">
                <Play className="w-4 h-4" />
                Start Focus Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>
                {formatMinutes(weekData.reduce((a, d) => a + d.minutes, 0))} total
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="flex items-end gap-2 h-32">
              {weekData.map((day, i) => {
                const height =
                  day.minutes > 0
                    ? Math.max((day.minutes / maxWeekMinutes) * 100, 4)
                    : 2;
                const isToday = day.date === today;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${
                        isToday ? "bg-primary" : "bg-primary/25"
                      }`}
                      style={{ height: `${height}%`, minHeight: "2px" }}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Study data will appear here once you start tracking
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
