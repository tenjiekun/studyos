import { Task, StudySession } from "./types";

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTimerSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function getMonthStart(date: Date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export function getDaySessions(sessions: StudySession[], dateStr: string): StudySession[] {
  return sessions.filter((s) => s.start_time.slice(0, 10) === dateStr);
}

export function getDayMinutes(sessions: StudySession[], dateStr: string): number {
  return getDaySessions(sessions, dateStr).reduce((acc, s) => acc + s.duration_minutes, 0);
}

export function getTodayTasks(tasks: Task[]): Task[] {
  const today = getTodayStr();
  return tasks.filter((t) => t.scheduled_date === today);
}

export function getWeekTasks(tasks: Task[]): Task[] {
  const start = getWeekStart();
  const today = getTodayStr();
  return tasks.filter((t) => t.scheduled_date >= start && t.scheduled_date <= today);
}

export function getMonthTasks(tasks: Task[]): Task[] {
  const start = getMonthStart();
  const today = getTodayStr();
  return tasks.filter((t) => t.scheduled_date >= start && t.scheduled_date <= today);
}

export function calculateStreak(heatmapData: Record<string, number>): { current: number; longest: number } {
  const sortedDates = Object.keys(heatmapData)
    .filter((d) => heatmapData[d] >= 30) // at least 30 min
    .sort()
    .reverse();

  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let tempStreak = 0;

  // Check current streak from today backwards
  const today = new Date();
  let checkDate = new Date(today);
  
  while (true) {
    const key = checkDate.toISOString().slice(0, 10);
    if (heatmapData[key] >= 30) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Check longest streak
  const allDates = Object.keys(heatmapData)
    .filter((d) => heatmapData[d] >= 30)
    .sort();

  tempStreak = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(allDates[i - 1]);
      const curr = new Date(allDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longest = Math.max(longest, tempStreak);
  }

  return { current, longest };
}

export function getHeatmapLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

export function getWeekDayName(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

export function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    Mathematics: "#6366F1",
    Physics: "#8B5CF6",
    Chemistry: "#EC4899",
    Biology: "#10B981",
    "Computer Science": "#3B82F6",
    English: "#F59E0B",
    History: "#EF4444",
    Other: "#64748B",
  };
  return colors[subject] || colors.Other;
}
