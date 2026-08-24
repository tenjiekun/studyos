"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Timer,
  BarChart3,
  Settings,
  Flame,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/use-notifications";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/community", label: "Community", icon: Users },
];

function NotificationDot() {
  const { unreadCount } = useNotifications();
  if (unreadCount === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — ultra-thin Apple style */}
      <aside className="hidden md:flex flex-col w-[200px] shrink-0 h-screen sticky top-0 border-r border-border/50 bg-background/60">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-8">
          <div className="w-7 h-7 rounded-[10px] bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
            <Flame className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-[13px] tracking-tight text-foreground">
            StudyOS
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform duration-200",
                    "group-hover:scale-105"
                  )}
                />
                <span className="truncate">{item.label}</span>
                {item.href === "/community" && <NotificationDot />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4">
          <Link
            href="/settings"
            className={cn(
              "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200",
              pathname.startsWith("/settings")
                ? "bg-primary/8 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            {pathname.startsWith("/settings") && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary" />
            )}
            <Settings className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:rotate-45" />
            <span className="truncate">Settings</span>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav — refined glass */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl safe-area-bottom">
        <div className="flex items-center justify-around h-[52px] px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-[3px] px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[48px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60"
                )}
              >
                <div className="relative">
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  {item.href === "/community" && <NotificationDot />}
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
