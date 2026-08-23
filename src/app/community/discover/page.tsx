"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupWithMembers, GROUP_CATEGORIES } from "@/lib/types";
import {
  fetchDiscoverGroups,
  joinGroup,
  leaveGroup,
  localFetchDiscoverGroups,
  localJoinGroup,
  localLeaveGroup,
} from "@/lib/community/client";

export default function DiscoverPage() {
  const { user, isBypass } = useAuth();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    if (isBypass) {
      setGroups(localFetchDiscoverGroups());
    } else {
      const data = await fetchDiscoverGroups();
      setGroups(data);
    }
    setLoading(false);
  }, [isBypass]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Check membership for each group
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || isBypass) return;
    async function checkMemberships() {
      const { getSupabase } = await import("@/lib/supabase/client");
      const sb = getSupabase();
      if (!sb) return;
      const { data } = await sb
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);
      if (data) setMyGroupIds(new Set(data.map((m) => m.group_id)));
    }
    checkMemberships();
  }, [user, isBypass, groups]);

  const filtered = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      category === "all" || g.category === category;
    return matchesSearch && matchesCategory;
  });

  async function handleJoin(groupId: string) {
    if (!user) return;
    if (isBypass) {
      localJoinGroup(groupId, user.id);
      setMyGroupIds((prev) => new Set(prev).add(groupId));
      return;
    }
    const ok = await joinGroup(groupId, user.id);
    if (ok) setMyGroupIds((prev) => new Set(prev).add(groupId));
  }

  async function handleLeave(groupId: string) {
    if (!user) return;
    if (isBypass) {
      localLeaveGroup(groupId, user.id);
      setMyGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
      return;
    }
    const ok = await leaveGroup(groupId, user.id);
    if (ok) {
      setMyGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(groupId);
        return next;
      });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Groups
        </Link>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Discover Groups
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Find study groups that match your interests
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger className="w-[160px] h-10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {GROUP_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No groups found. Try a different search or create your own group!
          </p>
          <Link href="/community/create">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Create Group
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {filtered.map((group) => {
            const isMember =
              isBypass
                ? group.members?.some((m) => m.user_id === user?.id)
                : myGroupIds.has(group.id);
            return (
              <Card key={group.id} className="hover:bg-muted/50 transition-colors">
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
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {group.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {group.description || "No description"}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {group.member_count || 0} members
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {isMember ? (
                      <>
                        <Link href={`/community/${group.id}`}>
                          <Button size="sm" variant="default" className="text-xs h-8">
                            Open
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 text-muted-foreground gap-1"
                          onClick={() => handleLeave(group.id)}
                        >
                          <LogOut className="w-3 h-3" />
                          Leave
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => handleJoin(group.id)}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
