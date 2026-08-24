"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Target,
  BookOpen,
  ClipboardList,
  BarChart3,
  Clock,
  ListChecks,
  Calendar,
  TrendingUp,
} from "lucide-react";

const plannerNav = [
  { href: "/planner", label: "Overview", icon: CalendarDays },
  { href: "/planner/year", label: "Year Plan", icon: Target },
  { href: "/planner/month", label: "Monthly", icon: CalendarDays },
  { href: "/planner/week", label: "Weekly", icon: ClipboardList },
  { href: "/planner/day", label: "Daily", icon: Clock },
  { href: "/planner/syllabus", label: "Syllabus", icon: BookOpen },
  { href: "/planner/tests", label: "Tests", icon: ListChecks },
  { href: "/planner/performance", label: "Performance", icon: TrendingUp },
  { href: "/planner/freetime", label: "Free Time", icon: Clock },
  { href: "/planner/calendar", label: "Calendar", icon: Calendar },
];

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-6">
      {/* Planner sub-nav */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 w-fit overflow-x-auto animate-fade-in">
        {plannerNav.map((item) => {
          const isActive =
            item.href === "/planner"
              ? pathname === "/planner"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
