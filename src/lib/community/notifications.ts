import { getSupabase } from "@/lib/supabase/client";
import type { Notification as AppNotification } from "@/lib/types";

// ===== Notifications CRUD =====

export async function fetchNotifications(
  userId: string,
  limit = 50
): Promise<AppNotification[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Fetch notifications error:", error.message);
    return [];
  }

  return (data as AppNotification[]) || [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  const { count, error } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("Get unread count error:", error.message);
    return 0;
  }

  return count || 0;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  return !error;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  return !error;
}

export async function deleteNotification(
  notificationId: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  return !error;
}

// ===== Create Notifications =====

/**
 * Notify all members of a group (except the sender) about a new message
 */
export async function notifyGroupMessage(
  groupId: string,
  senderId: string,
  senderName: string,
  groupName: string,
  messageText: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  // Get all members of the group except the sender
  const { data: members } = await sb
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", senderId);

  if (!members?.length) return;

  const preview =
    messageText.length > 80
      ? messageText.substring(0, 80) + "..."
      : messageText || "📎 Sent a file";

  // Create notifications for each member
  const notifications = members.map((m) => ({
    user_id: m.user_id,
    type: "message" as const,
    title: groupName,
    body: `${senderName}: ${preview}`,
    group_id: groupId,
    sender_id: senderId,
    read: false,
  }));

  // Batch insert (Supabase handles up to 1000 rows at once)
  const { error } = await sb.from("notifications").insert(notifications);

  if (error) {
    console.error("Create notifications error:", error.message);
  }
}

/**
 * Notify a user when someone joins their group
 */
export async function notifyGroupJoin(
  groupId: string,
  groupName: string,
  joinerName: string,
  adminId: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  await sb.from("notifications").insert({
    user_id: adminId,
    type: "group_join",
    title: groupName,
    body: `${joinerName} joined ${groupName}`,
    group_id: groupId,
    read: false,
  });
}

// ===== Browser Notifications =====

let notificationPermissionGranted = false;

export function requestNotificationPermission(): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    notificationPermissionGranted = true;
    return;
  }

  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      notificationPermissionGranted = permission === "granted";
    });
  }
}

export function showBrowserNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `studyos-${Date.now()}`,
      requireInteraction: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch {
    // Notification API may not be available in all contexts
  }
}
