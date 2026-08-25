"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { checkProStatus, ProStatus } from "./entitlements";

interface ProContextType {
  isPro: boolean;
  expiresAt: string | null;
  daysRemaining: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ProContext = createContext<ProContextType>({
  isPro: false,
  expiresAt: null,
  daysRemaining: 0,
  loading: true,
  refresh: async () => {},
});

export function ProProvider({ children }: { children: ReactNode }) {
  const { user, isBypass } = useAuth();
  const [status, setStatus] = useState<ProStatus>({
    isPro: false,
    expiresAt: null,
    daysRemaining: 0,
    entitlement: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || isBypass) {
      setStatus({ isPro: false, expiresAt: null, daysRemaining: 0, entitlement: null });
      setLoading(false);
      return;
    }
    try {
      const s = await checkProStatus(user.id);
      setStatus(s);
    } catch {
      setStatus({ isPro: false, expiresAt: null, daysRemaining: 0, entitlement: null });
    } finally {
      setLoading(false);
    }
  }, [user, isBypass]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription for entitlements changes
  useEffect(() => {
    if (!user || isBypass) return;

    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    const channelName = `entitlements-${user.id}`;

    // Remove stale channels
    const existing = sb.getChannels().find((ch) => ch.topic === channelName);
    if (existing) sb.removeChannel(existing);

    const channel = sb
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_entitlements",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (!cancelled) refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, [user, isBypass, refresh]);

  return (
    <ProContext.Provider value={{ ...status, loading, refresh }}>
      {children}
    </ProContext.Provider>
  );
}

export function usePro() {
  return useContext(ProContext);
}
