"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

export function ConnectionIndicator() {
  const { user, isConfigured } = useAuth();
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    if (!isConfigured || !user) return;

    const sb = getSupabase();
    if (!sb) return;

    // Test connection with a lightweight channel
    const channel = sb.channel("connection-check");

    channel
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    // Also check network
    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      sb.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, isConfigured]);

  if (!isConfigured) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
        }`}
      />
      <span className="text-[10px] text-muted-foreground">
        {connected ? "Connected" : "Reconnecting..."}
      </span>
    </div>
  );
}
