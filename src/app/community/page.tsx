"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { usePro } from "@/lib/payments/pro-context";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  User,
  Mail,
  Crown,
  Lock,
  Camera,
  Image as ImageIcon,
  Mic,
  Check,
  X,
  Target,
  Settings,
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
import { ProPaywall } from "@/components/pro/pro-paywall";
import { UpgradeModal } from "@/components/pro/upgrade-modal";

// ===== MOCK PREVIEW DATA (safe, no real data exposed) =====
const MOCK_GROUPS = [
  { name: "JEE 2027 Aspirants", members: 234, desc: "Physics, Chemistry, Math preparation" },
  { name: "NEET Biology Hub", members: 187, desc: "Biology study group for NEET" },
  { name: "CBSE Class 12", members: 156, desc: "Board exam preparation" },
  { name: "Gate CS Preparation", members: 98, desc: "Computer Science gate prep" },
];

export default function CommunityPage() {
  const { user, isBypass } = useAuth();
  const { isPro, loading: proLoading } = usePro();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      if (isBypass) {
        setGroups(localFetchMyGroups(user.id));
      } else {
        const data = await fetchMyGroups(user.id);
        setGroups(data);
        if (data.length === 0) {
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

  const displayGroups = isPro ? filtered : MOCK_GROUPS;

  return (
    <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-6">
      {/* ===== HEADER — always visible, never blurred ===== */}
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
          <Link href="/community/pro">
            <Button
              size="sm"
              variant={isPro ? "default" : "outline"}
              className={`gap-1.5 ${isPro ? "bg-gradient-to-r from-primary to-primary/80" : ""}`}
            >
              <Crown className="w-3.5 h-3.5" />
              {!proLoading && (
                <span className="text-xs">{isPro ? "Pro" : "Upgrade"}</span>
              )}
            </Button>
          </Link>
          <Link href="/community/profile">
            <Button size="sm" variant="outline" className="gap-1.5 h-9 w-9 p-0">
              <User className="w-4 h-4" />
            </Button>
          </Link>
          {isPro ? (
            <Link href="/community/create">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Create Group
              </Button>
            </Link>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={() => setShowUpgradeModal(true)}>
              <Plus className="w-4 h-4" />
              Create Group
              <span className="px-1 py-0 rounded bg-primary-foreground/20 text-[9px] font-bold">PRO</span>
            </Button>
          )}
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
        <Link href={isPro ? "/community/dm" : "#"}>
          <Badge
            variant="secondary"
            className={`cursor-pointer px-3 py-1.5 ${isPro ? "hover:bg-muted" : ""}`}
            onClick={(e) => {
              if (!isPro) {
                e.preventDefault();
                setShowUpgradeModal(true);
              }
            }}
          >
            <Mail className="w-3 h-3 mr-1" />
            DMs
            {!isPro && <Lock className="w-2.5 h-2.5 ml-1" />}
          </Badge>
        </Link>
      </div>

      {/* Search */}
      <div className="relative animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={isPro ? "Search your groups..." : "Search community..."}
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

      {/* ===== PRO USER: Normal community experience ===== */}
      {isPro ? (
        <>
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
        </>
      ) : (
        /* ===== FREE USER: Blurred preview + Paywall ===== */
        <div className="space-y-6">
          {/* Blurred content area */}
          <div className="relative">
            {/* Blurred mock content */}
            <div className="blur-[6px] opacity-40 pointer-events-none select-none space-y-2">
              {MOCK_GROUPS.map((group, i) => (
                <Card key={i} className="cursor-default">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{group.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{group.desc}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">{group.members} members</span>
                        <span className="text-[10px] text-muted-foreground">2h ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Extra mock: DM preview */}
              <Card className="cursor-default">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">Study Partner</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Hey, did you finish today&apos;s Physics target?
                    </p>
                    <span className="text-[10px] text-muted-foreground">5m ago</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lock overlay card */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full max-w-sm mx-4">
                <div className="rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Community Pro</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Join groups, chat privately, share photos & voice notes
                  </p>

                  {/* Quick feature pills */}
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" /> Groups
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                      <MessageCircle className="w-2.5 h-2.5" /> DMs
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" /> Photos
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                      <Mic className="w-2.5 h-2.5" /> Voice
                    </span>
                  </div>

                  <div className="flex items-baseline justify-center gap-1 mb-4">
                    <span className="text-2xl font-bold">₹49</span>
                    <span className="text-xs text-muted-foreground">/ 30 Days</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-4">
                    One-time payment · No automatic renewal
                  </p>

                  <Link href="/community/pro/checkout">
                    <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Upgrade to Pro
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Pro Feature Summary Card */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Everything you need to study together</h3>
                <p className="text-xs text-muted-foreground">₹49 / 30 Days · One-time payment</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { icon: Users, text: "Create your own groups" },
                { icon: Lock, text: "Private study groups" },
                { icon: MessageCircle, text: "One-to-one DMs" },
                { icon: Camera, text: "Photos + camera" },
                { icon: ImageIcon, text: "Gallery uploads" },
                { icon: Mic, text: "Voice notes" },
                { icon: Target, text: "Shared study goals" },
                { icon: Settings, text: "Advanced group management" },
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <feat.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs">{feat.text}</span>
                </div>
              ))}
            </div>

            <Link href="/community/pro/checkout">
              <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all">
                Upgrade to Pro — ₹49
              </button>
            </Link>
          </div>

          {/* Free vs Pro Comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-xs font-bold text-muted-foreground mb-3">FREE</h4>
              <div className="space-y-2">
                {[
                  { text: "Browse community", ok: true },
                  { text: "Join public groups", ok: true },
                  { text: "Basic discussions", ok: true },
                  { text: "Create groups", ok: false },
                  { text: "Private groups", ok: false },
                  { text: "Private DMs", ok: false },
                  { text: "Photos & media", ok: false },
                  { text: "Voice notes", ok: false },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {f.ok ? (
                      <Check className="w-3 h-3 text-green-500 shrink-0" />
                    ) : (
                      <X className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={`text-[11px] ${f.ok ? "" : "text-muted-foreground/50 line-through"}`}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="text-xs font-bold text-primary mb-3 flex items-center gap-1">
                <Crown className="w-3 h-3" /> PRO
              </h4>
              <div className="space-y-2">
                {[
                  "Create your own groups",
                  "Private groups",
                  "Private DM chat",
                  "Advanced discussions",
                  "Photos, camera, gallery",
                  "Voice notes",
                  "Shared study goals",
                  "Group planning",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[11px] font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strong value message */}
          <div className="text-center pb-4">
            <p className="text-sm text-muted-foreground">
              Free lets you <span className="text-foreground font-medium">discover</span> the community.
            </p>
            <p className="text-sm text-muted-foreground">
              Pro lets you actually <span className="text-primary font-medium">build and use it fully</span>.
            </p>
          </div>
        </div>
      )}

      {/* Upgrade Modal (for Create Group button) */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
