"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getHeatmapLevel, formatMinutes } from "@/lib/helpers";

const LEVEL_COLORS_LIGHT = [
  "bg-gray-100",
  "bg-indigo-100",
  "bg-indigo-200",
  "bg-indigo-400",
  "bg-indigo-600",
];

const LEVEL_COLORS_DARK = [
  "bg-white/5",
  "bg-indigo-500/20",
  "bg-indigo-500/40",
  "bg-indigo-500/65",
  "bg-indigo-500/90",
];

type Range = "30d" | "3m" | "6m" | "1y";

interface HeatmapProps {
  data: Record<string, number>;
  range?: Range;
  onRangeChange?: (range: Range) => void;
  compact?: boolean;
  /** Optional: tasks completed per day for tooltip */
  tasksPerDay?: Record<string, number>;
  /** Optional: pomodoro sessions per day for tooltip */
  pomodorosPerDay?: Record<string, number>;
}

export function StudyHeatmap({
  data,
  range = "6m",
  onRangeChange,
  compact = false,
  tasksPerDay,
  pomodorosPerDay,
}: HeatmapProps) {

  const days = useMemo(() => {
    const now = new Date();
    const totalDays =
      range === "30d" ? 30 : range === "3m" ? 90 : range === "6m" ? 180 : 365;
    const result: { date: string; minutes: number; dayOfWeek: number }[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        date: key,
        minutes: data[key] || 0,
        dayOfWeek: d.getDay(),
      });
    }
    return result;
  }, [data, range]);

  // Group into weeks
  const weeks = useMemo(() => {
    const result: (typeof days)[] = [];
    let current: typeof days = [];
    
    // Pad the first week
    if (days.length > 0) {
      const firstDow = days[0].dayOfWeek;
      for (let i = 0; i < firstDow; i++) {
        current.push({ date: `pad-${i}`, minutes: -1, dayOfWeek: i });
      }
    }

    for (const day of days) {
      current.push(day);
      if (day.dayOfWeek === 6) {
        result.push(current);
        current = [];
      }
    }
    if (current.length > 0) result.push(current);
    return result;
  }, [days]);

  const ranges: { value: Range; label: string }[] = [
    { value: "30d", label: "30 days" },
    { value: "3m", label: "3 months" },
    { value: "6m", label: "6 months" },
    { value: "1y", label: "1 year" },
  ];

  const cellSize = compact ? "w-2.5 h-2.5" : "w-3 h-3";
  const cellGap = compact ? "gap-[2px]" : "gap-[3px]";

  return (
    <div className="animate-fade-in">
      {onRangeChange && (
        <div className="flex items-center gap-1 mb-3">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => onRangeChange(r.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                range === r.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className={`inline-flex flex-col ${cellGap}`}>
          {/* Week labels */}
          <div className={`flex ${cellGap} mb-1`}>
            {weeks[0]?.map((_, i) => (
              <div key={i} className={`${cellSize}`} />
            ))}
          </div>

          {/* Cells */}
          {weeks.map((week, wi) => (
            <div key={wi} className={`flex ${cellGap}`}>
              {week.map((day) => {
                if (day.minutes === -1) {
                  return <div key={day.date} className={cellSize} />;
                }
                const level = getHeatmapLevel(day.minutes);
                const isDark =
                  typeof document !== "undefined" &&
                  document.documentElement.classList.contains("dark");
                const colorClass = isDark
                  ? LEVEL_COLORS_DARK[level]
                  : LEVEL_COLORS_LIGHT[level];
                const dateLabel = new Date(day.date + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                );

                return (
                  <Tooltip key={day.date}>
                    <TooltipTrigger
                      className={`${cellSize} rounded-[3px] ${colorClass} heatmap-cell border border-transparent hover:border-foreground/20`}
                      aria-label={`${dateLabel}: ${formatMinutes(day.minutes)}`}
                    />
                    <TooltipContent side="top" className="text-xs min-w-[140px]">
                      <p className="font-medium">{dateLabel}</p>
                      <p className="text-muted-foreground">
                        Study Time: {formatMinutes(day.minutes)}
                      </p>
                      {tasksPerDay && (
                        <p className="text-muted-foreground">
                          Tasks: {tasksPerDay[day.date] || 0}
                        </p>
                      )}
                      {pomodorosPerDay && (
                        <p className="text-muted-foreground">
                          Pomodoros: {pomodorosPerDay[day.date] || 0}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        {LEVEL_COLORS_DARK.map((_, i) => {
          const isDark =
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark");
          return (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-[2px] ${
                isDark ? LEVEL_COLORS_DARK[i] : LEVEL_COLORS_LIGHT[i]
              }`}
            />
          );
        })}
        <span>More</span>
      </div>
    </div>
  );
}
