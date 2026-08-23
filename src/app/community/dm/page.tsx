"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  AtSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Profile } from "@/lib/types";
import {
  fetchConversations,
  searchUsers,
  getOrCreateConversation,
  findByUsername,
} from "@/lib/community/dm";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function DMListPage() {
  const { user, isBypass } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<
    { conversation: { id: string; user1_id: string; user2_id: string; created_at: string }; otherUser: Profile | null; lastMessage: { text: string | null; created_at: string } | null }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [usernameQuery, setUsernameQuery] = useState("");
  const [usernameResult, setUsernameResult] = useState<Profile | null>(null);
  const [usernameSearching, setUsernameSearching] = useState(false);
  const [usernameNotFound, setUsernameNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myUsername, setMyUsername] = useState<string | null>(null);

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

  // Fetch my username for the share button
  useEffect(() => {
    if (!user || isBypass) return;
    async function fetchMyUsername() {
      const sb = (await import("@/lib/supabase/client")).getSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("profiles")
        .select("username")
        .eq("id", user!.id)
        .single();
      setMyUsername(data?.username || null);
    }
    fetchMyUsername();
  }, [user, isBypass]);

  // Debounced name/username search
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

  async function handleUsernameSearch() {
    if (!usernameQuery.trim()) return;
    setUsernameSearching(true);
    setUsernameNotFound(false);
    setUsernameResult(null);

    try {
      const result = await findByUsername(usernameQuery.trim());
      if (result) {
        setUsernameResult(result);
      } else {
        setUsernameNotFound(true);
      }
    } catch {
      setUsernameNotFound(true);
    }
    setUsernameSearching(false);
  }

  function copyMyUsername() {
    if (!myUsername) return;
    navigator.clipboard.writeText(`@${myUsername}`);
    toast.success("Username copied!");
  }

  function shareMyUsername() {
    if (!myUsername) return;
    const text = `Find me on StudyOS: @${myUsername}`;
    if (navigator.share) {
      navigator.share({ title: "My StudyOS Username", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
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

      {/* My Username / Share */}
      {myUsername && (
        <Card className="animate-fade-in bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center gap-3">
            <AtSign className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Your Username</p>
              <p className="text-sm font-semibold">@{myUsername}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={copyMyUsername}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={shareMyUsername}>
              <Share2 className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {!myUsername && !isBypass && (
        <Card className="animate-fade-in border-dashed">
          <CardContent className="p-3 flex items-center gap-3">
            <AtSign className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                You haven&apos;t set a username yet.{" "}
                <Link href="/community/profile" className="text-primary hover:underline font-medium">
                  Set one now
                </Link>{" "}
                so others can find and DM you!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Search by name / Find by username */}
      <Tabs defaultValue="search" className="animate-fade-in">
        <TabsList className="w-full">
          <TabsTrigger value="search" className="flex-1 gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Search by Name
          </TabsTrigger>
          <TabsTrigger value="username" className="flex-1 gap-1.5">
            <AtSign className="w-3.5 h-3.5" />
            Find by Username
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
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
        </TabsContent>

        <TabsContent value="username" className="space-y-4 mt-4">
          {/* Exact username search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter exact username..."
                value={usernameQuery}
                onChange={(e) => {
                  setUsernameQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                  setUsernameNotFound(false);
                  setUsernameResult(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUsernameSearch(); }}
                className="pl-9 h-10"
                maxLength={20}
              />
            </div>
            <Button
              onClick={handleUsernameSearch}
              disabled={!usernameQuery.trim() || usernameSearching}
              className="gap-1.5"
            >
              {usernameSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Find
            </Button>
          </div>

          {/* Username result */}
          {usernameResult && (
            <Card
              className="hover:bg-muted/50 transition-colors cursor-pointer border-emerald-500/30"
              onClick={() => handleStartDM(usernameResult.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  {usernameResult.avatar_url ? (
                    <img
                      src={usernameResult.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-primary">
                      {usernameResult.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {usernameResult.name}
                  </p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    @{usernameResult.username}
                  </p>
                </div>
                <Button size="sm" className="gap-1 text-xs">
                  <MessageCircle className="w-3.5 h-3.5" />
                  DM
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Not found */}
          {usernameNotFound && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <XCircle className="w-4 h-4 shrink-0" />
              No user found with that username. Double-check the spelling.
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Ask your study partner for their username to connect directly.
          </p>
        </TabsContent>
      </Tabs>

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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {item.otherUser?.name || "Unknown"}
                      </p>
                      {item.otherUser?.username && (
                        <span className="text-[10px] text-muted-foreground">
                          @{item.otherUser.username}
                        </span>
                      )}
                    </div>
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
