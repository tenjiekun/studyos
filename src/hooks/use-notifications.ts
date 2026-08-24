"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/community/notifications";
import { Notification } from "@/lib/types";

export function useNotifications() {
  const { user, isBypass } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastNotificationId = useRef<string | null>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user || isBypass) {
      setLoading(false);
      return;
    }

    try {
      const [notifs, count] = await Promise.all([
        fetchNotifications(user.id),
        getUnreadCount(user.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isBypass]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (!user || isBypass) return;
    requestNotificationPermission();
  }, [user, isBypass]);

  // Real-time subscription
  useEffect(() => {
    if (!user || isBypass) return;

    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    // Unique name per mount avoids collision in React Strict Mode
    const mountId = Math.random().toString(36).slice(2, 9);
    const channelName = `notifications-${user.id}-${mountId}`;

    const channel = sb
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const newNotif = payload.new as Notification;

          // Don't show notification for own actions
          if (newNotif.sender_id === user.id) return;

          // Deduplicate
          if (lastNotificationId.current === newNotif.id) return;
          lastNotificationId.current = newNotif.id;

          // Update state
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show browser notification
          showBrowserNotification(newNotif.title, newNotif.body, () => {
            if (newNotif.group_id) {
              window.location.href = `/community/${newNotif.group_id}`;
            }
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          if (updated.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const deleted = payload.old as Notification;
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          if (!deleted.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Polling fallback every 8 seconds
    const pollInterval = setInterval(() => {
      if (!cancelled) loadNotifications();
    }, 8000);

    // Refresh on tab focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        loadNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, isBypass, loadNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return;
    const success = await markAllAsRead(user.id);
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadNotifications,
  };
}
