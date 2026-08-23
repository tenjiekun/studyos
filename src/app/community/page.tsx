"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  User,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GroupWithMembers } from "@/lib/types";
import {
  fetchMyGroups,
  localFetchMyGroups,
} from "@/lib/community/client";
import { formatDistanceToNow } from "date-fns";

export default function CommunityPage() {
  const { user, isBypass } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadGroups = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      console.log("Loading groups - bypass:", isBypass, "user:", user.id);
      if (isBypass) {
        setGroups(localFetchMyGroups(user.id));
      } else {
        const data = await fetchMyGroups(user.id);
        console.log("Groups loaded:", data.length);
        setGroups(data);
        if (data.length === 0) {
          // Try to ensure profile exists
          const sb = (await import("@/lib/supabase/client")).getSupabase();
          if (sb) {
            await sb.from("profiles").upsert({ id: user.id, name: user.email?.split("@")[0] || "Student" }, { onConflict: "id" });
          }
        }
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user, isBypass]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-6">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Community
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Connect, discuss, and learn together
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/community/profile">
            <Button size="sm" variant="outline" className="gap-1.5 h-9 w-9 p-0">
              <User className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/community/create">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </Link>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 animate-fade-in">
        <Link href="/community">
          <Badge variant="default" className="cursor-pointer px-3 py-1.5">
            <MessageCircle className="w-3 h-3 mr-1" />
            My Groups
          </Badge>
        </Link>
        <Link href="/community/discover">
          <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 hover:bg-muted">
            <Search className="w-3 h-3 mr-1" />
            Discover
          </Badge>
        </Link>
        <Link href="/community/dm">
          <Badge variant="secondary" className="cursor-pointer px-3 py-1.5 hover:bg-muted">
            <Mail className="w-3 h-3 mr-1" />
            DMs
          </Badge>
        </Link>
      </div>

      {/* Search */}
      <div className="relative animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search your groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Bypass banner */}
      {isBypass && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm animate-fade-in">
          <span>You&apos;re in local mode. Group data is stored on this device only.</span>
        </div>
      )}

      {/* Group List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? "No groups match your search"
              : "No groups yet. Join a study group and start learning together."}
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/community/discover">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Discover Groups
              </Button>
            </Link>
            <Link href="/community/create">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Create Group
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {filtered.map((group) => (
            <Link key={group.id} href={`/community/${group.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {group.image_url ? (
                      <img
                        src={group.image_url}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">
                        {group.name}
                      </h3>
                      {group.my_role === "admin" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {group.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {group.member_count || 0} members
                      </span>
                      {group.last_message && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(group.last_message.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  {(group.unread_count || 0) > 0 && (
                    <Badge className="px-2 py-0.5 text-xs shrink-0">
                      {group.unread_count}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
