import { getSupabase } from "@/lib/supabase/client";
import { Conversation, DMMessage, Profile, CallLog } from "@/lib/types";
import { showBrowserNotification } from "@/lib/community/notifications";

// Get or create a conversation between two users
export async function getOrCreateConversation(
  user1Id: string,
  user2Id: string
): Promise<Conversation | null> {
  const sb = getSupabase();
  if (!sb) return null;

  // Ensure consistent ordering
  const [a, b] = [user1Id, user2Id].sort();

  // Check if conversation exists
  const { data: existing } = await sb
    .from("conversations")
    .select("*")
    .or(`and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`)
    .single();

  if (existing) return existing as Conversation;

  // Create new conversation
  const { data, error } = await sb
    .from("conversations")
    .insert({ user1_id: a, user2_id: b })
    .select()
    .single();

  if (error || !data) return null;
  return data as Conversation;
}

// Get all conversations for a user
export async function fetchConversations(userId: string): Promise<
  { conversation: Conversation; otherUser: Profile | null; lastMessage: DMMessage | null }[]
> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: convos } = await sb
    .from("conversations")
    .select("*")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!convos) return [];

  const results = await Promise.all(
    convos.map(async (convo) => {
      const otherId =
        convo.user1_id === userId ? convo.user2_id : convo.user1_id;

      const { data: profile } = await sb
        .from("profiles")
        .select("id, name, avatar_url, username")
        .eq("id", otherId)
        .single();

      const { data: lastMsg } = await sb
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", convo.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        conversation: convo as Conversation,
        otherUser: (profile as Profile) || null,
        lastMessage: (lastMsg as DMMessage) || null,
      };
    })
  );

  return results;
}

// Fetch messages in a conversation
export async function fetchDMMessages(
  conversationId: string,
  before?: string
): Promise<DMMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb
    .from("dm_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (before) query = query.lt("created_at", before);

  const { data: messages } = await query;
  if (!messages) return [];

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, name, avatar_url, username")
    .in("id", senderIds);

  const profileMap = new Map<string, Profile>();
  profiles?.forEach((p) => profileMap.set(p.id, p as Profile));

  return messages.map((m) => ({
    ...m,
    profiles: profileMap.get(m.sender_id) || undefined,
  })).reverse();
}

// Send a DM message
export async function sendDMMessage(
  conversationId: string,
  senderId: string,
  messageType: "text" | "image" | "audio",
  text?: string,
  mediaUrl?: string
): Promise<DMMessage | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("dm_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      message_type: messageType,
      text: text || null,
      media_url: mediaUrl || null,
    })
    .select()
    .single();

  if (error || !data) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("id, name, avatar_url, username")
    .eq("id", senderId)
    .single();

  // Create notification for the other user
  try {
    const { data: convo } = await sb
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .single();

    if (convo) {
      const recipientId = convo.user1_id === senderId ? convo.user2_id : convo.user1_id;
      const senderName = (profile as Profile)?.name || "Someone";
      const preview = text?.substring(0, 80) || "📎 Sent a file";

      await sb.from("notifications").insert({
        user_id: recipientId,
        type: "message",
        title: `DM from ${senderName}`,
        body: preview,
        sender_id: senderId,
        read: false,
      });
    }
  } catch {}

  return {
    ...data,
    profiles: (profile as Profile) || undefined,
  };
}

// Search users by username or name
export async function searchUsers(
  query: string,
  currentUserId: string
): Promise<Profile[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("profiles")
    .select("id, name, avatar_url, username")
    .neq("id", currentUserId)
    .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(10);

  return (data as Profile[]) || [];
}

// Find a user by exact username
export async function findByUsername(
  username: string
): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data } = await sb
    .from("profiles")
    .select("id, name, avatar_url, username")
    .ilike("username", username.trim())
    .single();

  return (data as Profile) || null;
}

// Check if a username is available
export async function checkUsernameAvailable(
  username: string,
  currentUserId?: string
): Promise<{ available: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { available: false, error: "Not connected" };

  const trimmed = username.trim().toLowerCase();

  // Validate format: 3-20 chars, alphanumeric + underscores
  if (trimmed.length < 3) {
    return { available: false, error: "Username must be at least 3 characters" };
  }
  if (trimmed.length > 20) {
    return { available: false, error: "Username must be 20 characters or less" };
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return { available: false, error: "Only letters, numbers, and underscores allowed" };
  }

  // Check uniqueness
  let query = sb
    .from("profiles")
    .select("id")
    .ilike("username", trimmed)
    .limit(1);

  const { data } = await query;

  // If exists and not the current user, it's taken
  if (data && data.length > 0) {
    if (currentUserId && data[0].id === currentUserId) {
      return { available: true }; // It's their own username
    }
    return { available: false, error: "Username is already taken" };
  }

  return { available: true };
}

// Local storage DM helpers (bypass mode)
const DM_KEY = "study-os-dm";

function loadLocalDM() {
  if (typeof window === "undefined") return { conversations: [] as Conversation[], messages: {} as Record<string, DMMessage[]> };
  try {
    const raw = localStorage.getItem(DM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { conversations: [] as Conversation[], messages: {} as Record<string, DMMessage[]> };
}

function saveLocalDM(data: ReturnType<typeof loadLocalDM>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DM_KEY, JSON.stringify(data));
}

export function localSearchUsers(query: string, currentUserId: string): Profile[] {
  // In bypass mode, return empty (no other users to DM)
  return [];
}

export function localFetchConversations(userId: string) {
  return [] as { conversation: Conversation; otherUser: Profile | null; lastMessage: DMMessage | null }[];
}

// ===== Call Logs =====

// Start a call log entry
export async function startCallLog(
  conversationId: string,
  callerId: string,
  receiverId: string,
  callType: "audio" | "video"
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("call_logs")
    .insert({
      conversation_id: conversationId,
      caller_id: callerId,
      receiver_id: receiverId,
      call_type: callType,
      status: "completed",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to start call log:", error.message);
    return null;
  }
  return data?.id || null;
}

// End a call log entry
export async function endCallLog(
  callLogId: string,
  status: "completed" | "missed" | "declined"
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const now = new Date().toISOString();

  // Get the started_at to calculate duration
  const { data: log } = await sb
    .from("call_logs")
    .select("started_at")
    .eq("id", callLogId)
    .single();

  let duration = 0;
  if (log) {
    duration = Math.floor(
      (new Date(now).getTime() - new Date(log.started_at).getTime()) / 1000
    );
  }

  await sb
    .from("call_logs")
    .update({
      ended_at: now,
      duration_seconds: duration,
      status,
    })
    .eq("id", callLogId);
}

// Fetch call history for a conversation
export async function fetchCallHistory(
  conversationId: string,
  limit = 20
): Promise<CallLog[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: logs } = await sb
    .from("call_logs")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (!logs) return [];

  // Fetch profiles for callers/receivers
  const userIds = [...new Set(logs.flatMap((l) => [l.caller_id, l.receiver_id]))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, name, avatar_url, username")
    .in("id", userIds);

  const profileMap = new Map<string, Profile>();
  profiles?.forEach((p) => profileMap.set(p.id, p as Profile));

  return logs.map((log) => ({
    ...log,
    caller: profileMap.get(log.caller_id),
    receiver: profileMap.get(log.receiver_id),
  })) as CallLog[];
}
