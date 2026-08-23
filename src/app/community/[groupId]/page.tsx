"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  ArrowLeft,
  Users,
  Send,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
  Trash2,
  X,
  Camera,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Message, Profile, GroupWithMembers } from "@/lib/types";
import {
  fetchMessages,
  sendMessage,
  deleteMessage,
  uploadImage,
  uploadVoiceNote,
  checkMembership,
  getProfile,
  localFetchMessages,
  localSendMessage,
} from "@/lib/community/client";
import { getSupabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { formatDistanceToNow, format } from "date-fns";
import { VoiceRecorder } from "@/components/community/voice-recorder";

export default function GroupDiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, isBypass } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isMember, setIsMember] = useState(false);

  // Image upload
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Voice recorder
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // Messages pagination
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  // Group info panel
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState<{ id: string; user_id: string; role: string; profiles?: Profile }[]>([]);

  // Load members when group info is opened
  useEffect(() => {
    if (!showGroupInfo || isBypass) return;
    async function loadMembers() {
      const sb = getSupabase();
      if (!sb) return;
      const { data: members } = await sb
        .from("group_members")
        .select("id, user_id, role")
        .eq("group_id", groupId);
      if (!members) return;

      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map<string, Profile>();
      profiles?.forEach((p) => profileMap.set(p.id, p as Profile));

      setGroupMembers(
        members.map((m) => ({
          ...m,
          profiles: profileMap.get(m.user_id) || undefined,
        }))
      );
    }
    loadMembers();
  }, [showGroupInfo, isBypass, groupId]);

  // Realtime subscription
  const [connectionState, setConnectionState] = useState<"connected" | "disconnected" | "connecting">("connecting");

  // Load group info and messages
  useEffect(() => {
    if (!user || isBypass) return;

    async function load() {
      const sb = getSupabase();
      if (!sb) return;

      // Load group
      const { data: groupData } = await sb
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (!groupData) {
        router.push("/community");
        return;
      }

      // Check membership
      const membership = await checkMembership(groupId, user!.id);
      if (!membership.isMember) {
        router.push("/community");
        return;
      }

      setIsMember(true);
      setGroup(groupData as GroupWithMembers);

      // Load profile
      const profile = await getProfile(user!.id);
      setMyProfile(profile);

      // Load messages
      const msgs = await fetchMessages(groupId);
      setMessages(msgs);
      setLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }

    if (!isBypass) {
      load();
    }
  }, [groupId, user, isBypass, router]);

  // Load bypass data
  useEffect(() => {
    if (!isBypass || !user) return;

    const msgs = localFetchMessages(groupId);
    setMessages(msgs);
    setGroup({
      id: groupId,
      name: "Local Group",
      description: "Bypass mode group",
      image_url: null,
      category: "General",
      privacy: "public",
      created_by: user.id,
      created_at: new Date().toISOString(),
      member_count: 1,
    });
    setMyProfile({
      id: user.id,
      name: user.user_metadata?.name || "Local User",
      avatar_url: null,
      username: null,
      created_at: new Date().toISOString(),
    });
    setIsMember(true);
    setLoading(false);
  }, [isBypass, user, groupId]);

  // Realtime subscription
  useEffect(() => {
    if (isBypass || !user || !isMember) return;

    const sb = getSupabase();
    if (!sb) return;

    setConnectionState("connecting");

    const channel = sb
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch profile
          const { data: profile } = await sb
            .from("profiles")
            .select("id, name, avatar_url")
            .eq("id", newMsg.user_id)
            .single();

          const msgWithProfile: Message = {
            ...newMsg,
            profiles: (profile as Profile) || undefined,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msgWithProfile.id)) return prev;
            return [...prev, msgWithProfile];
          });

          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setConnectionState(status === "SUBSCRIBED" ? "connected" : "connecting");
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [groupId, user, isBypass, isMember]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || isBypass) return;
    setLoadingMore(true);
    const oldest = messages[0]?.created_at;
    if (!oldest) {
      setLoadingMore(false);
      return;
    }
    const older = await fetchMessages(groupId, oldest);
    if (older.length === 0) {
      setHasMore(false);
    } else {
      setMessages((prev) => [...older, ...prev]);
    }
    setLoadingMore(false);
  }, [groupId, loadingMore, hasMore, isBypass, messages]);

  // Intersection observer for loading older messages
  useEffect(() => {
    if (isBypass) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadOlderMessages();
        }
      },
      { threshold: 0.1 }
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [loadOlderMessages, isBypass]);

  // Send text message with optimistic update
  async function handleSend() {
    const text = inputText.trim();
    if (!text || !user) return;

    setSending(true);
    setInputText("");

    // Optimistic: show message immediately
    const optimisticMsg: Message = {
      id: `optimistic-${Date.now()}`,
      group_id: groupId,
      user_id: user.id,
      message_type: "text",
      text: text,
      media_url: null,
      created_at: new Date().toISOString(),
      profiles: myProfile || undefined,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    if (isBypass) {
      localSendMessage(groupId, user.id, "text", text, undefined, myProfile || undefined);
      setMessages(localFetchMessages(groupId));
    } else {
      const sent = await sendMessage(groupId, user.id, "text", text);
      if (sent) {
        // Replace optimistic with real message
        setMessages((prev) => prev.map((m) =>
          m.id === optimisticMsg.id ? sent : m
        ));
      } else {
        // Remove optimistic on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        setInputText(text); // restore input
      }
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedImages.length > 0) {
        handleSendImages();
      } else {
        handleSend();
      }
    }
  }

  // Image handling
  function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) return;
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
    setSelectedImages((prev) => [...prev, ...valid]);
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSendImages() {
    if (selectedImages.length === 0 || !user) return;
    setUploadingImage(true);

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const compressed = await compressImage(file);
      const url = await uploadImage(
        "chat-images",
        `${groupId}/${user.id}/${Date.now()}-${file.name}`,
        compressed
      );
      if (url) {
        if (isBypass) {
          localSendMessage(groupId, user.id, "image", undefined, url, myProfile || undefined);
        } else {
          await sendMessage(groupId, user.id, "image", undefined, url);
        }
      }
    }

    setSelectedImages([]);
    setImagePreviews([]);
    setUploadingImage(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  // Voice note handling
  async function handleSendVoice(blob: Blob) {
    if (!user) return;
    setShowVoiceRecorder(false);

    if (isBypass) {
      const url = URL.createObjectURL(blob);
      localSendMessage(groupId, user.id, "audio", undefined, url, myProfile || undefined);
      setMessages(localFetchMessages(groupId));
    } else {
      const url = await uploadVoiceNote(groupId, user.id, blob);
      if (url) {
        await sendMessage(groupId, user.id, "audio", undefined, url);
      }
    }
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  // Delete message
  async function handleDeleteMessage(msgId: string) {
    if (isBypass) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } else {
      await deleteMessage(msgId);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => router.push("/community")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {group?.image_url ? (
              <img
                src={group.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{group?.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {group?.member_count || 0} members
              </span>
              {connectionState === "connected" && (
                <span className="text-[10px] text-emerald-500">● Live</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowGroupInfo(!showGroupInfo)}
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Group Info Panel */}
      {showGroupInfo && (
        <div className="shrink-0 border-b border-border bg-card p-4 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {group?.image_url ? (
                <img src={group.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{group?.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {group?.description || "No description"}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className="text-[10px]">
                  {group?.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {group?.member_count || 0} members
                </span>
              </div>
            </div>
          </div>

          {/* Members list */}
          {groupMembers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Members</p>
              <div className="space-y-2">
                {groupMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center gap-3 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {member.profiles?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {member.profiles?.name || "Unknown"}
                      </p>
                    </div>
                    {member.role === "admin" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        Admin
                      </Badge>
                    )}
                    {group?.created_by === user?.id && member.user_id !== user?.id && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Remove ${member.profiles?.name || "this member"}?`)) return;
                          const sb = getSupabase();
                          if (!sb) return;
                          await sb.from("group_members").delete().eq("id", member.id);
                          setGroupMembers((prev) => prev.filter((m) => m.id !== member.id));
                        }}
                        className="text-[10px] text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Controls */}
          {group?.created_by === user?.id && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Admin Controls</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={async () => {
                  const sb = getSupabase();
                  if (!sb) return;
                  const newName = prompt("Edit group name:", group?.name);
                  if (newName && newName.trim()) {
                    await sb.from("groups").update({ name: newName.trim() }).eq("id", group!.id);
                    setGroup({ ...group!, name: newName.trim() });
                  }
                }}
              >
                Edit Group Name
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={async () => {
                  if (!confirm("Delete this group? This cannot be undone.")) return;
                  const sb = getSupabase();
                  if (!sb) return;
                  await sb.from("messages").delete().eq("group_id", group!.id);
                  await sb.from("group_members").delete().eq("group_id", group!.id);
                  await sb.from("groups").delete().eq("id", group!.id);
                  router.push("/community");
                }}
              >
                Delete Group
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {hasMore && !isBypass && (
          <div ref={topSentinelRef} className="text-center py-2">
            {loadingMore && (
              <p className="text-xs text-muted-foreground">Loading older messages...</p>
            )}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg mb-1">👋</p>
              <p className="text-sm text-muted-foreground">
                Start the discussion
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.user_id === user?.id;
            const showAvatar =
              i === 0 || messages[i - 1].user_id !== msg.user_id;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                onDelete={() => handleDeleteMessage(msg.id)}
                currentUserId={user?.id}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Previews */}
      {imagePreviews.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-4 py-2">
          <div className="flex gap-2 overflow-x-auto">
            {imagePreviews.map((preview, i) => (
              <div key={i} className="relative shrink-0">
                <img
                  src={preview}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-2 w-full h-8"
            onClick={handleSendImages}
            disabled={uploadingImage}
          >
            {uploadingImage ? "Uploading..." : `Send ${selectedImages.length} image(s)`}
          </Button>
        </div>
      )}

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="shrink-0 border-t border-border bg-card px-4 py-3">
          <VoiceRecorder
            onSend={handleSendVoice}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm px-3 py-2">
        <div className="flex items-end gap-2">
          {/* Camera */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4" />
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleGallerySelect}
            className="hidden"
          />

          {/* Gallery */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGallerySelect}
            className="hidden"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/50 max-h-24 overflow-y-auto"
              style={{ minHeight: "40px" }}
            />
          </div>

          {/* Voice */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          >
            <Mic className="w-4 h-4" />
          </Button>

          {/* Send */}
          <Button
            size="sm"
            className="shrink-0 h-9 w-9 p-0 rounded-xl"
            onClick={() => {
              if (selectedImages.length > 0) {
                handleSendImages();
              } else {
                handleSend();
              }
            }}
            disabled={sending || (!inputText.trim() && selectedImages.length === 0)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== Message Bubble Component =====

function MessageBubble({
  message,
  isOwn,
  showAvatar,
  onDelete,
  currentUserId,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onDelete: () => void;
  currentUserId?: string;
}) {
  const [showActions, setShowActions] = useState(false);
  const profile = message.profiles;

  return (
    <div
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} ${
        showAvatar ? "mt-3" : "mt-0.5"
      }`}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
          {profile?.name?.[0]?.toUpperCase() || "?"}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {showAvatar && !isOwn && (
          <p className="text-[10px] text-muted-foreground mb-0.5 px-1">
            {profile?.name || "Unknown"}
          </p>
        )}
        <div
          className={`relative rounded-2xl px-3 py-2 ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted rounded-tl-md"
          } ${message.message_type !== "text" ? "p-1" : ""}`}
          onDoubleClick={() => setShowActions(!showActions)}
        >
          {message.message_type === "text" && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}

          {message.message_type === "image" && message.media_url && (
            <ImageMessage url={message.media_url} />
          )}

          {message.message_type === "audio" && message.media_url && (
            <AudioMessage url={message.media_url} isOwn={isOwn} />
          )}

          {/* Timestamp */}
          <p
            className={`text-[10px] mt-1 ${
              isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
            }`}
          >
            {format(new Date(message.created_at), "h:mm a")}
          </p>
        </div>

        {/* Actions */}
        {showActions && message.user_id === currentUserId && (
          <div className="flex gap-1 mt-1 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-destructive gap-1"
              onClick={() => {
                onDelete();
                setShowActions(false);
              }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Image Message =====

function ImageMessage({ url }: { url: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div
        className="cursor-pointer rounded-lg overflow-hidden"
        onClick={() => setFullscreen(true)}
      >
        <img
          src={url}
          alt="Shared image"
          className="max-w-[260px] max-h-[200px] object-cover rounded-lg"
          loading="lazy"
        />
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <img
            src={url}
            alt="Shared image"
            className="max-w-full max-h-full object-contain"
          />
          <button className="absolute top-4 right-4 text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}

// ===== Audio Message =====

function AudioMessage({ url, isOwn }: { url: string; isOwn: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      setProgress(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-2 p-2 min-w-[180px]">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 shrink-0 rounded-full"
        onClick={togglePlay}
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <div className="flex-1">
        <div className="h-1 rounded-full bg-current/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-current transition-all"
            style={{
              width: duration > 0 ? `${(progress / duration) * 100}%` : "0%",
            }}
          />
        </div>
      </div>
      <span className="text-[10px] tabular-nums shrink-0">
        {formatTime(playing ? progress : duration)}
      </span>
    </div>
  );
}
