"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Profile, DMMessage } from "@/lib/types";
import {
  fetchDMMessages,
  sendDMMessage,
} from "@/lib/community/dm";
import { formatDistanceToNow } from "date-fns";

export default function DMChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user, isBypass } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages and other user
  const loadConversation = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      // Get conversation details to find the other user
      const sb = getSupabase();
      if (!sb) return;

      const { data: convo } = await sb
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (!convo) {
        setLoading(false);
        return;
      }

      const otherId =
        convo.user1_id === user.id ? convo.user2_id : convo.user1_id;

      const { data: profile } = await sb
        .from("profiles")
        .select("id, name, avatar_url, username")
        .eq("id", otherId)
        .single();

      setOtherUser(profile as Profile);

      // Load messages
      const msgs = await fetchDMMessages(conversationId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load DM:", err);
    } finally {
      setLoading(false);
    }
  }, [user, conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Real-time subscription for new DM messages
  useEffect(() => {
    if (!user || !conversationId || isBypass) return;

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as DMMessage;

          // Don't duplicate our own messages
          if (messages.some((m) => m.id === newMsg.id)) return;

          // Fetch sender profile
          const { data: profile } = await sb
            .from("profiles")
            .select("id, name, avatar_url, username")
            .eq("id", newMsg.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, profiles: profile as Profile },
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const deleted = payload.old as DMMessage;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [user, conversationId, isBypass, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  async function handleSend() {
    if (!user || !inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const msg = await sendDMMessage(
        conversationId,
        user.id,
        "text",
        text
      );

      if (msg) {
        // Add optimistically if realtime hasn't fired yet
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } catch (err) {
      console.error("Failed to send DM:", err);
      setInputText(text); // Restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // Delete message
  async function handleDelete(msgId: string) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("dm_messages").delete().eq("id", msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }

  if (isBypass) {
    return (
      <div className="p-4 md:p-8 max-w-[600px] mx-auto">
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            DMs are only available when signed in with Supabase.
          </p>
          <Link href="/community">
            <Button variant="outline" size="sm" className="mt-4">
              Back to Community
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <Link href="/community/dm">
          <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-primary">
              {otherUser?.name?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {otherUser?.name || "Loading..."}
          </p>
          {otherUser?.username && (
            <p className="text-[10px] text-muted-foreground">
              @{otherUser.username}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Say hello to {otherUser?.name || "this person"} 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"} group`}
              >
                <div className="flex items-end gap-2 max-w-[75%]">
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {msg.profiles?.avatar_url ? (
                        <img
                          src={msg.profiles.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-primary">
                          {msg.profiles?.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {msg.message_type === "text" && msg.text}
                      {msg.message_type === "image" && msg.media_url && (
                        <img
                          src={msg.media_url}
                          alt="Shared image"
                          className="rounded-lg max-w-[250px] max-h-[200px] object-cover"
                        />
                      )}
                      {msg.message_type === "audio" && msg.media_url && (
                        <audio controls src={msg.media_url} className="max-w-[200px]" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {isMine && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 h-10"
            disabled={sending}
          />
          <Button
            size="sm"
            className="w-10 h-10 p-0 rounded-full"
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
