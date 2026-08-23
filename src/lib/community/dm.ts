import { getSupabase } from "@/lib/supabase/client";
import { Conversation, DMMessage, Profile } from "@/lib/types";

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

  return {
    ...data,
    profiles: (profile as Profile) || undefined,
  };
}

// Search users by username
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
