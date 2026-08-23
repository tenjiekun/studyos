import { getSupabase } from "@/lib/supabase/client";
import {
  GroupWithMembers,
  Message,
  Profile,
  Group,
  GroupMember,
} from "@/lib/types";

// ===== Groups =====

export async function fetchMyGroups(userId: string): Promise<GroupWithMembers[]> {
  const sb = getSupabase();
  if (!sb) return [];

  // Ensure profile exists first
  try {
    await sb.from("profiles").upsert(
      { id: userId, name: "Student" },
      { onConflict: "id" }
    );
  } catch {}

  // Get groups the user is a member of
  const { data: memberships, error: memberError } = await sb
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", userId);

  console.log("fetchMyGroups memberships:", memberships, "error:", memberError);

  if (memberError) {
    console.error("Membership fetch error:", memberError.message);
    return [];
  }
  if (!memberships?.length) return [];

  const groupIds = memberships.map((m) => m.group_id);

  const { data: groups } = await sb
    .from("groups")
    .select("*")
    .in("id", groupIds);

  if (!groups) return [];

  // Get member counts
  const { data: memberCounts } = await sb
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  // Get last message for each group
  const groupsWithMeta: GroupWithMembers[] = await Promise.all(
    groups.map(async (group) => {
      const { data: lastMsg } = await sb
        .from("messages")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const membership = memberships.find((m) => m.group_id === group.id);
      const count = memberCounts?.filter((m) => m.group_id === group.id).length || 0;

      return {
        ...group,
        member_count: count,
        last_message: lastMsg as Message | null,
        my_role: membership?.role || null,
      };
    })
  );

  return groupsWithMeta.sort(
    (a, b) =>
      new Date(b.last_message?.created_at || b.created_at).getTime() -
      new Date(a.last_message?.created_at || a.created_at).getTime()
  );
}

export async function fetchDiscoverGroups(): Promise<GroupWithMembers[]> {
  const sb = getSupabase();
  if (!sb) return [];

  console.log("Fetching discover groups...");

  const { data: groups } = await sb
    .from("groups")
    .select("*")
    .eq("privacy", "public")
    .order("created_at", { ascending: false });

  if (!groups) return [];

  const groupIds = groups.map((g) => g.id);

  const { data: memberCounts } = await sb
    .from("group_members")
    .select("group_id")
    .in("group_id", groupIds);

  return groups.map((group) => ({
    ...group,
    member_count: memberCounts?.filter((m) => m.group_id === group.id).length || 0,
  }));
}

export async function createGroup(
  group: Omit<Group, "id" | "created_at">,
  userId: string
): Promise<Group | null> {
  const sb = getSupabase();
  if (!sb) return null;

  // Ensure profile exists using upsert (creates or updates)
  await sb.from("profiles").upsert(
    { id: userId, name: "Student" },
    { onConflict: "id" }
  );
  await sb.from("user_settings").upsert(
    { user_id: userId },
    { onConflict: "user_id" }
  );

  const { data, error } = await sb
    .from("groups")
    .insert({ ...group, created_by: userId })
    .select()
    .single();

  if (error) {
    console.error("Group create error:", error.message, error);
    return null;
  }

  // Add creator as admin
  await sb.from("group_members").insert({
    group_id: data.id,
    user_id: userId,
    role: "admin",
  });

  return data;
}

export async function joinGroup(
  groupId: string,
  userId: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from("group_members").insert({
    group_id: groupId,
    user_id: userId,
    role: "member",
  });

  return !error;
}

export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  return !error;
}

export async function checkMembership(
  groupId: string,
  userId: string
): Promise<{ isMember: boolean; role: "admin" | "member" | null }> {
  const sb = getSupabase();
  if (!sb) return { isMember: false, role: null };

  const { data } = await sb
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();

  return { isMember: !!data, role: data?.role || null };
}

// ===== Messages =====

const MESSAGES_PAGE_SIZE = 50;

export async function fetchMessages(
  groupId: string,
  before?: string
): Promise<Message[]> {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages } = await query;
  if (!messages) return [];

  // Fetch profiles for all unique user_ids
  const userIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<string, Profile>();
  profiles?.forEach((p) => profileMap.set(p.id, p as Profile));

  return messages
    .map((m) => ({
      ...m,
      profiles: profileMap.get(m.user_id) || undefined,
    }))
    .reverse();
}

export async function sendMessage(
  groupId: string,
  userId: string,
  messageType: "text" | "image" | "audio",
  text?: string,
  mediaUrl?: string
): Promise<Message | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("messages")
    .insert({
      group_id: groupId,
      user_id: userId,
      message_type: messageType,
      text: text || null,
      media_url: mediaUrl || null,
    })
    .select()
    .single();

  if (error || !data) return null;

  // Fetch profile
  const { data: profile } = await sb
    .from("profiles")
    .select("id, name, avatar_url")
    .eq("id", userId)
    .single();

  return {
    ...data,
    profiles: (profile as Profile) || undefined,
  };
}

export async function deleteMessage(
  messageId: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.from("messages").delete().eq("id", messageId);
  return !error;
}

// ===== Profiles =====

export async function getProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return (data as Profile) || null;
}

// ===== Storage =====

export async function uploadImage(
  bucket: string,
  filePath: string,
  file: File | Blob
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { error } = await sb.storage.from(bucket).upload(filePath, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) return null;

  // Try public URL first, fall back to signed URL
  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(filePath);
  if (urlData.publicUrl) return urlData.publicUrl;

  // For private buckets, create a signed URL (valid for 1 hour)
  const { data: signedData } = await sb.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);
  return signedData?.signedUrl || null;
}

export async function uploadVoiceNote(
  groupId: string,
  userId: string,
  blob: Blob
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const ext = blob.type.includes("webm") ? "webm" : "mp4";
  const path = `${groupId}/${userId}/${Date.now()}.${ext}`;

  const { error } = await sb.storage.from("voice-notes").upload(path, blob, {
    contentType: blob.type,
  });

  if (error) {
    console.error("Voice upload error:", error.message);
    return null;
  }

  // Try public URL first
  const { data: urlData } = sb.storage.from("voice-notes").getPublicUrl(path);
  if (urlData.publicUrl) return urlData.publicUrl;

  // Fall back to signed URL for private buckets
  const { data: signedData } = await sb.storage
    .from("voice-notes")
    .createSignedUrl(path, 3600);
  return signedData?.signedUrl || null;
}

// ===== Local Storage (Bypass Mode) =====

const LOCAL_COMMUNITY_KEY = "study-os-community";

function loadLocalCommunity(): {
  groups: GroupWithMembers[];
  messages: Record<string, Message[]>;
} {
  if (typeof window === "undefined")
    return { groups: [], messages: {} };
  try {
    const raw = localStorage.getItem(LOCAL_COMMUNITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { groups: [], messages: {} };
}

function saveLocalCommunity(data: {
  groups: GroupWithMembers[];
  messages: Record<string, Message[]>;
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_COMMUNITY_KEY, JSON.stringify(data));
}

export function localFetchMyGroups(userId: string): GroupWithMembers[] {
  const data = loadLocalCommunity();
  return data.groups.filter((g) =>
    g.members?.some((m) => m.user_id === userId)
  );
}

export function localFetchDiscoverGroups(): GroupWithMembers[] {
  const data = loadLocalCommunity();
  return data.groups.filter((g) => g.privacy === "public");
}

export function localCreateGroup(
  group: Omit<Group, "id" | "created_at">,
  userId: string
): Group {
  const data = loadLocalCommunity();
  const newGroup: GroupWithMembers = {
    ...group,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    member_count: 1,
    members: [
      {
        id: crypto.randomUUID(),
        group_id: "",
        user_id: userId,
        role: "admin",
        joined_at: new Date().toISOString(),
      },
    ],
  };
  newGroup.members![0].group_id = newGroup.id;
  data.groups.push(newGroup);
  saveLocalCommunity(data);
  return newGroup;
}

export function localFetchMessages(groupId: string): Message[] {
  const data = loadLocalCommunity();
  return data.messages[groupId] || [];
}

export function localSendMessage(
  groupId: string,
  userId: string,
  messageType: "text" | "image" | "audio",
  text?: string,
  mediaUrl?: string,
  profile?: Profile
): Message {
  const data = loadLocalCommunity();
  const msg: Message = {
    id: crypto.randomUUID(),
    group_id: groupId,
    user_id: userId,
    message_type: messageType,
    text: text || null,
    media_url: mediaUrl || null,
    created_at: new Date().toISOString(),
    profiles: profile,
  };
  if (!data.messages[groupId]) data.messages[groupId] = [];
  data.messages[groupId].push(msg);
  saveLocalCommunity(data);
  return msg;
}

export function localJoinGroup(groupId: string, userId: string): boolean {
  const data = loadLocalCommunity();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return false;
  if (!group.members) group.members = [];
  if (group.members.some((m) => m.user_id === userId)) return false;
  group.members.push({
    id: crypto.randomUUID(),
    group_id: groupId,
    user_id: userId,
    role: "member",
    joined_at: new Date().toISOString(),
  });
  group.member_count = (group.member_count || 0) + 1;
  saveLocalCommunity(data);
  return true;
}

export function localLeaveGroup(groupId: string, userId: string): boolean {
  const data = loadLocalCommunity();
  const group = data.groups.find((g) => g.id === groupId);
  if (!group) return false;
  if (!group.members) return false;
  group.members = group.members.filter((m) => m.user_id !== userId);
  group.member_count = Math.max((group.member_count || 1) - 1, 0);
  saveLocalCommunity(data);
  return true;
}
