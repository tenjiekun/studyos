"use client";

import { useEffect, useState } from "react";
import { useStudyData } from "@/lib/use-study-data";
import {
  formatMinutes,
  getTodayStr,
  getWeekStart,
  getMonthStart,
  getWeekDayName,
  calculateStreak,
  getSubjectColor,
} from "@/lib/helpers";
import { StudyHeatmap } from "@/components/heatmap";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Flame,
  Calendar,
  Zap,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ViewTab = "daily" | "weekly" | "monthly" | "yearly";

export default function ProgressPage() {
  const { tasks, sessions, heatmapData, loading } = useStudyData();
  const [view, setView] = useState<ViewTab>("weekly");
  const [heatmapRange, setHeatmapRange] = useState<"30d" | "3m" | "6m" | "1y">("6m");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const today = getTodayStr();
  const todayMinutes = heatmapData[today] || 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayMinutes = heatmapData[yesterdayStr] || 0;
  const diffMinutes = todayMinutes - yesterdayMinutes;

  const weekStart = getWeekStart();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { day: getWeekDayName(key), minutes: heatmapData[key] || 0, date: key };
  });
  const weekTotal = weekDays.reduce((a, d) => a + d.minutes, 0);
  const weekAvg = Math.round(weekTotal / 7);
  const weekTasks = tasks.filter((t) => t.scheduled_date >= weekStart && t.scheduled_date <= today && t.completed);
  const mostProductiveDay = weekDays.reduce((best, d) => (d.minutes > best.minutes ? d : best), weekDays[0]);
  const maxWeekMin = Math.max(...weekDays.map((d) => d.minutes), 1);

  const monthStart = getMonthStart();
  const monthTasks = tasks.filter((t) => t.scheduled_date >= monthStart && t.scheduled_date <= today);
  const monthCompletedTasks = monthTasks.filter((t) => t.completed);

  let monthTotalMinutes = 0;
  let activeDays = 0;
  const monthStartD = new Date(monthStart);
  const todayD = new Date(today);
  const daysInMonth = Math.ceil((todayD.getTime() - monthStartD.getTime()) / (1000 * 60 * 60 * 24));
  for (let i = 0; i <= daysInMonth; i++) {
    const d = new Date(monthStartD);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const mins = heatmapData[key] || 0;
    monthTotalMinutes += mins;
    if (mins >= 30) activeDays++;
  }
  const monthAvg = daysInMonth > 0 ? Math.round(monthTotalMinutes / daysInMonth) : 0;

  const year = new Date().getFullYear();
  let yearTotalMinutes = 0;
  let yearCompletedTasks = 0;
  let maxMonth = "";
  const monthTotals: Record<string, number> = {};
  Object.entries(heatmapData).forEach(([key, mins]) => {
    if (key.startsWith(String(year))) {
      yearTotalMinutes += mins;
      const month = key.slice(0, 7);
      monthTotals[month] = (monthTotals[month] || 0) + mins;
    }
  });
  tasks.forEach((t) => {
    if (t.scheduled_date.startsWith(String(year)) && t.completed) yearCompletedTasks++;
  });
  const sortedMonths = Object.entries(monthTotals).sort((a, b) => b[1] - a[1]);
  if (sortedMonths.length > 0) {
    const [m] = sortedMonths[0];
    maxMonth = new Date(m + "-01").toLocaleDateString("en-US", { month: "long" });
  }

  const streak = calculateStreak(heatmapData);
  const hasData = Object.keys(heatmapData).length > 0 || tasks.length > 0;

  const views: { value: ViewTab; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your study consistency over time</p>
      </div>

      {!hasData && (
        <Card className="animate-fade-in">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No progress data yet. Start a focus session to begin tracking your study time.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-1 animate-fade-in">
        {views.map((v) => (
          <button
            key={v.value}
            onClick={() => setView(v.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              view === v.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "daily" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Today</span>
                </div>
                <p className="text-3xl font-semibold tracking-tight">{formatMinutes(todayMinutes)}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString("en-US", { weekday: "long" })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Yesterday</span>
                </div>
                <p className="text-3xl font-semibold tracking-tight">{formatMinutes(yesterdayMinutes)}</p>
                {diffMinutes !== 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {diffMinutes > 0 ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs text-emerald-500 font-medium">{formatMinutes(Math.abs(diffMinutes))} improvement</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-500 font-medium">{formatMinutes(Math.abs(diffMinutes))} less</span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground font-medium">Streak</span>
                </div>
                <p className="text-3xl font-semibold tracking-tight">
                  {streak.current}<span className="text-base ml-1">🔥</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Longest: {streak.longest} days</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {view === "weekly" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid md:grid-cols-4 gap-4">
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Total Hours</span><p className="text-2xl font-semibold tracking-tight mt-1">{formatMinutes(weekTotal)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Daily Average</span><p className="text-2xl font-semibold tracking-tight mt-1">{formatMinutes(weekAvg)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Tasks Done</span><p className="text-2xl font-semibold tracking-tight mt-1">{weekTasks.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Most Productive</span><p className="text-2xl font-semibold tracking-tight mt-1">{mostProductiveDay?.day}</p><p className="text-xs text-muted-foreground">{formatMinutes(mostProductiveDay?.minutes || 0)}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">This Week</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-40">
                {weekDays.map((day, i) => {
                  const height = day.minutes > 0 ? Math.max((day.minutes / maxWeekMin) * 100, 4) : 2;
                  const isToday = day.date === today;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium">{formatMinutes(day.minutes)}</span>
                      <div className={`w-full rounded-lg transition-all duration-500 ${isToday ? "bg-primary" : "bg-primary/25"}`} style={{ height: `${height}%`, minHeight: "4px" }} />
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day.day}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "monthly" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid md:grid-cols-3 gap-4">
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Total Study</span><p className="text-2xl font-semibold tracking-tight mt-1">{formatMinutes(monthTotalMinutes)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Daily Average</span><p className="text-2xl font-semibold tracking-tight mt-1">{formatMinutes(monthAvg)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Tasks Done</span><p className="text-2xl font-semibold tracking-tight mt-1">{monthCompletedTasks.length}<span className="text-sm text-muted-foreground font-normal"> / {monthTasks.length}</span></p></CardContent></Card>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3"><span className="text-sm font-medium">Active Study Days</span><span className="text-sm font-semibold">{activeDays} days</span></div>
                <Separator className="mb-3" />
                <div className="flex justify-between items-center mb-3"><span className="text-sm font-medium">Current Streak</span><span className="text-sm font-semibold">{streak.current} days 🔥</span></div>
                <Separator className="mb-3" />
                <div className="flex justify-between items-center"><span className="text-sm font-medium">Longest Streak</span><span className="text-sm font-semibold">{streak.longest} days 🏆</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Study by Subject</CardTitle></CardHeader>
              <CardContent>
                <SubjectBreakdown sessions={sessions} monthStart={monthStart} today={today} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Heatmap</CardTitle></CardHeader>
            <CardContent><StudyHeatmap data={heatmapData} range="30d" /></CardContent>
          </Card>
        </div>
      )}

      {view === "yearly" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid md:grid-cols-4 gap-4">
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Total Hours</span><p className="text-2xl font-semibold tracking-tight mt-1">{formatMinutes(yearTotalMinutes)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Tasks Done</span><p className="text-2xl font-semibold tracking-tight mt-1">{yearCompletedTasks}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Best Month</span><p className="text-2xl font-semibold tracking-tight mt-1">{maxMonth || "—"}</p></CardContent></Card>
            <Card><CardContent className="p-5"><span className="text-xs text-muted-foreground font-medium">Longest Streak</span><p className="text-2xl font-semibold tracking-tight mt-1">{streak.longest} <span className="text-sm">🏆</span></p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{year} Year Heatmap</CardTitle></CardHeader>
            <CardContent><StudyHeatmap data={heatmapData} range="1y" /></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SubjectBreakdown({
  sessions,
  monthStart,
  today,
}: {
  sessions: { subject?: string; duration_minutes: number; start_time: string }[];
  monthStart: string;
  today: string;
}) {
  const subjectMinutes: Record<string, number> = {};
  sessions
    .filter((s) => { const d = s.start_time.slice(0, 10); return d >= monthStart && d <= today; })
    .forEach((s) => { const sub = s.subject || "Other"; subjectMinutes[sub] = (subjectMinutes[sub] || 0) + s.duration_minutes; });

  const total = Object.values(subjectMinutes).reduce((a, b) => a + b, 0);
  const sorted = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (sorted.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No sessions this month</p>;

  return (
    <div className="space-y-3">
      {sorted.map(([subject, minutes]) => {
        const pct = total > 0 ? (minutes / total) * 100 : 0;
        return (
          <div key={subject}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(subject) }} />
                <span className="text-xs font-medium">{subject}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatMinutes(minutes)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: getSubjectColor(subject) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
