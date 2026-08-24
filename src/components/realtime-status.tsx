"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

type Status = "connected" | "polling" | "offline";

export function RealtimeStatus() {
  const { user, isConfigured } = useAuth();
  const [status, setStatus] = useState<Status>("offline");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!isConfigured || !user) {
      setStatus("offline");
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setStatus("offline");
      return;
    }

    // Test realtime by subscribing to a test channel
    const channelName = `status-check-${user.id}-${Date.now()}`;
    let connected = false;

    const channel = sb
      .channel(channelName)
      .on("presence", { event: "sync" }, () => {})
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          connected = true;
          setStatus("connected");
          setLastUpdate(new Date());
        }
      });

    // If not connected within 3s, fall back to polling indicator
    const fallback = setTimeout(() => {
      if (!connected) {
        setStatus("polling");
        setLastUpdate(new Date());
      }
    }, 3000);

    // Polling updates the timestamp
    const pollInterval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => {
      clearTimeout(fallback);
      clearInterval(pollInterval);
      sb.removeChannel(channel);
    };
  }, [isConfigured, user]);

  if (!isConfigured || !user) return null;

  const statusConfig = {
    connected: {
      icon: <Wifi className="w-3 h-3" />,
      label: "Live",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      dot: "bg-emerald-500",
    },
    polling: {
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
      label: "Syncing",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      dot: "bg-amber-500",
    },
    offline: {
      icon: <WifiOff className="w-3 h-3" />,
      label: "Offline",
      color: "text-red-500",
      bg: "bg-red-500/10",
      dot: "bg-red-500",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${config.color} ${config.bg}`}
      title={lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : ""}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === "connected" ? "animate-pulse" : ""}`} />
      {config.icon}
      {config.label}
    </div>
  );
}
