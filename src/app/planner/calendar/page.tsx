"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function CalendarPage() {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<"disconnected" | "connected" | "syncing">("disconnected");

  const handleConnect = () => {
    // Google Calendar OAuth would redirect here
    // For now, show the connection flow
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus("connected");
    }, 2000);
  };

  const handleDisconnect = () => {
    setSyncStatus("disconnected");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Google Calendar
        </p>
        <h1 className="text-3xl font-light tracking-tight">
          Sync with Google Calendar
        </h1>
      </div>

      {/* Connection Status */}
      <div className="p-6 rounded-2xl bg-card border border-border/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
            📅
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-medium">Google Calendar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {syncStatus === "connected"
                ? "Synced and active"
                : syncStatus === "syncing"
                ? "Connecting..."
                : "Not connected"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncStatus === "connected" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Synced
              </div>
            )}
            {syncStatus === "syncing" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Syncing...
              </div>
            )}
            {syncStatus === "disconnected" && (
              <button
                onClick={handleConnect}
                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.97]"
              >
                Connect
              </button>
            )}
            {syncStatus === "connected" && (
              <button
                onClick={handleDisconnect}
                className="h-10 px-5 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          What gets synced
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              icon: "📚",
              title: "Study Sessions",
              desc: "Focus sessions appear as calendar events",
            },
            {
              icon: "📝",
              title: "Scheduled Tasks",
              desc: "Planned study blocks sync to your calendar",
            },
            {
              icon: "🧪",
              title: "Tests & Exams",
              desc: "Test dates and exam schedules",
            },
            {
              icon: "🔄",
              title: "Two-Way Sync",
              desc: "Changes in either direction are reflected",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-2xl bg-card border border-border/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{feature.icon}</span>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Categories */}
      <div className="space-y-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Event Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Study", color: "bg-primary/10 text-primary" },
            { label: "Test", color: "bg-orange-500/10 text-orange-600" },
            { label: "Mock Test", color: "bg-amber-500/10 text-amber-600" },
            { label: "Revision", color: "bg-violet-500/10 text-violet-600" },
            { label: "Personal", color: "bg-emerald-500/10 text-emerald-600" },
            { label: "Break", color: "bg-muted text-muted-foreground" },
          ].map((cat) => (
            <span
              key={cat.label}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${cat.color}`}
            >
              {cat.label}
            </span>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 rounded-2xl bg-muted/30 border border-border/20">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Google Calendar integration uses secure OAuth authentication. Your
          credentials are never exposed to the browser. Only calendar-related
          permissions are requested. You can disconnect at any time.
        </p>
      </div>
    </div>
  );
}
