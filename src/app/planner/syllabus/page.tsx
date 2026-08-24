"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import type { SyllabusItem } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", color: "bg-muted text-muted-foreground" },
  { value: "in_progress", label: "In Progress", color: "bg-primary/10 text-primary" },
  { value: "completed", label: "Completed", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "revising", label: "Revising", color: "bg-amber-500/10 text-amber-600" },
  { value: "needs_revision", label: "Needs Revision", color: "bg-orange-500/10 text-orange-600" },
] as const;

export default function SyllabusPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    subject: "",
    chapter: "",
    topic: "",
    subtopic: "",
    priority: "medium" as string,
    estimated_minutes: 60,
    planned_date: "",
  });

  const loadItems = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("syllabus_items" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("subject")
      .order("chapter")
      .order("topic");

    setItems((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async () => {
    if (!user || !newItem.subject || !newItem.chapter) return;
    const sb = getSupabase();
    if (!sb) return;

    const { data } = await sb
      .from("syllabus_items" as any)
      .insert({
        user_id: user.id,
        subject: newItem.subject,
        chapter: newItem.chapter,
        topic: newItem.topic || null,
        subtopic: newItem.subtopic || null,
        status: "not_started",
        priority: newItem.priority,
        estimated_minutes: newItem.estimated_minutes,
        planned_date: newItem.planned_date || null,
      } as any)
      .select()
      .single();

    if (data) setItems((prev) => [...prev, data as any]);
    setShowAdd(false);
    setNewItem({ subject: "", chapter: "", topic: "", subtopic: "", priority: "medium", estimated_minutes: 60, planned_date: "" });
  };

  const updateStatus = async (id: string, status: string) => {
    const sb = getSupabase();
    if (!sb) return;

    const updates: any = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();

    await sb.from("syllabus_items" as any).update(updates).eq("id", id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: status as SyllabusItem["status"], completed_at: status === "completed" ? new Date().toISOString() : i.completed_at } : i
      )
    );
  };

  const deleteItem = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("syllabus_items" as any).delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const subjects = [...new Set(items.map((i) => i.subject))];
  const filtered = items.filter((i) => {
    if (filterSubject !== "all" && i.subject !== filterSubject) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  // Group by subject → chapter
  const grouped = filtered.reduce(
    (acc: Record<string, Record<string, SyllabusItem[]>>, item) => {
      if (!acc[item.subject]) acc[item.subject] = {};
      if (!acc[item.subject][item.chapter]) acc[item.subject][item.chapter] = [];
      acc[item.subject][item.chapter].push(item);
      return acc;
    },
    {}
  );

  const getSubjectStats = (subject: string) => {
    const subjItems = items.filter((i) => i.subject === subject);
    const completed = subjItems.filter(
      (i) => i.status === "completed"
    ).length;
    return {
      total: subjItems.length,
      completed,
      pct: subjItems.length > 0 ? Math.round((completed / subjItems.length) * 100) : 0,
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Syllabus Tracker
          </p>
          <h1 className="text-3xl font-light tracking-tight">
            Track your complete syllabus
          </h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-200 active:scale-[0.97]"
        >
          + Add Item
        </button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            TOTAL ITEMS
          </p>
          <p className="text-2xl font-light">{items.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            COMPLETED
          </p>
          <p className="text-2xl font-light text-emerald-600">
            {items.filter((i) => i.status === "completed").length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            IN PROGRESS
          </p>
          <p className="text-2xl font-light text-primary">
            {items.filter((i) => i.status === "in_progress").length}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
            PROGRESS
          </p>
          <p className="text-2xl font-light">
            {items.length > 0
              ? `${Math.round((items.filter((i) => i.status === "completed").length / items.length) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Subject Progress Bars */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Subject Progress
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subjects.map((subject) => {
              const stats = getSubjectStats(subject);
              return (
                <div
                  key={subject}
                  className="p-4 rounded-2xl bg-card border border-border/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.completed}/{stats.total} · {stats.pct}%
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterSubject("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterSubject === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All Subjects
        </button>
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setFilterSubject(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterSubject === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s}
          </button>
        ))}

        <div className="w-px h-6 bg-border/50 mx-1" />

        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value === filterStatus ? "all" : opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Syllabus Tree */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-card border border-border/30 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No syllabus items yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add your first syllabus item to start tracking
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([subject, chapters]) => (
            <div key={subject} className="space-y-3">
              <h2 className="text-lg font-medium tracking-tight">{subject}</h2>
              {Object.entries(chapters).map(([chapter, chapterItems]) => (
                <div
                  key={chapter}
                  className="ml-4 p-4 rounded-2xl bg-card border border-border/30 space-y-2"
                >
                  <p className="text-sm font-medium text-muted-foreground">
                    {chapter}
                  </p>
                  {chapterItems.map((item) => {
                    const statusOpt = STATUS_OPTIONS.find(
                      (s) => s.value === item.status
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/30 transition-colors group"
                      >
                        <button
                          onClick={() =>
                            updateStatus(
                              item.id,
                              item.status === "completed"
                                ? "not_started"
                                : "completed"
                            )
                          }
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.status === "completed"
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-border/50 hover:border-primary/40"
                          }`}
                        >
                          {item.status === "completed" && (
                            <span className="text-[10px]">✓</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              item.status === "completed"
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {item.topic || item.chapter}
                          </p>
                          {item.subtopic && (
                            <p className="text-xs text-muted-foreground">
                              {item.subtopic}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={item.status}
                            onChange={(e) =>
                              updateStatus(item.id, e.target.value)
                            }
                            className="h-7 px-2 rounded-lg bg-transparent border border-border/30 text-[11px] text-muted-foreground focus:outline-none cursor-pointer"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {item.estimated_minutes && (
                            <span className="text-[11px] text-muted-foreground">
                              {item.estimated_minutes}m
                            </span>
                          )}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="w-6 h-6 rounded-md text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Add Syllabus Item</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subject *</label>
                <input
                  type="text"
                  value={newItem.subject}
                  onChange={(e) => setNewItem((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  placeholder="e.g. Physics"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Chapter *</label>
                <input
                  type="text"
                  value={newItem.chapter}
                  onChange={(e) => setNewItem((p) => ({ ...p, chapter: e.target.value }))}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  placeholder="e.g. Electrostatics"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Topic</label>
                  <input
                    type="text"
                    value={newItem.topic}
                    onChange={(e) => setNewItem((p) => ({ ...p, topic: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Coulomb's Law"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subtopic</label>
                  <input
                    type="text"
                    value={newItem.subtopic}
                    onChange={(e) => setNewItem((p) => ({ ...p, subtopic: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Est. Minutes</label>
                  <input
                    type="number"
                    value={newItem.estimated_minutes}
                    onChange={(e) => setNewItem((p) => ({ ...p, estimated_minutes: parseInt(e.target.value) || 60 }))}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAdd(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                Cancel
              </button>
              <button onClick={addItem} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
