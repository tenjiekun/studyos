"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Profile } from "@/lib/types";
import {
  fetchConversations,
  searchUsers,
  getOrCreateConversation,
} from "@/lib/community/dm";
import { formatDistanceToNow } from "date-fns";

export default function DMListPage() {
  const { user, isBypass } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<
    { conversation: { id: string; user1_id: string; user2_id: string; created_at: string }; otherUser: Profile | null; lastMessage: { text: string | null; created_at: string } | null }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!user || isBypass) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchConversations(user.id);
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
    setLoading(false);
  }, [user, isBypass]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Debounced search
  useEffect(() => {
    if (!user || isBypass || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchUsers(searchQuery, user.id);
      setSearchResults(results);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, user, isBypass]);

  async function handleStartDM(profileId: string) {
    if (!user) return;
    const convo = await getOrCreateConversation(user.id, profileId);
    if (convo) {
      router.push(`/community/dm/${convo.id}`);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[600px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Chat privately with other students
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-xs font-medium text-muted-foreground">
            Search Results
          </p>
          {searchResults.map((profile) => (
            <Card
              key={profile.id}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleStartDM(profile.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-primary">
                      {profile.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile.name}
                  </p>
                  {profile.username && (
                    <p className="text-xs text-muted-foreground">
                      @{profile.username}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Message
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Conversations */}
      <div className="space-y-2 animate-fade-in">
        <p className="text-xs font-medium text-muted-foreground">
          {conversations.length > 0 ? "Recent Conversations" : "No conversations yet"}
        </p>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))
        ) : conversations.length === 0 && !searchQuery ? (
          <div className="text-center py-12">
            <MessageCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Search for a user to start chatting!
            </p>
          </div>
        ) : (
          conversations.map((item) => (
            <Link
              key={item.conversation.id}
              href={`/community/dm/${item.conversation.id}`}
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {item.otherUser?.avatar_url ? (
                      <img
                        src={item.otherUser.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-primary">
                        {item.otherUser?.name?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.otherUser?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.lastMessage?.text || "No messages yet"}
                    </p>
                  </div>
                  {item.lastMessage && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(item.lastMessage.created_at), {
                        addSuffix: false,
                      })}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
