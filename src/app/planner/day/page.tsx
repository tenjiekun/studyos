"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects,
  fetchChapters,
  updateChapter,
  deleteChapter,
  createChapter,
} from "@/lib/planner-v2";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 24;

export default function DayPlannerPage() {
  const { user } = useAuth();
  const { sessions } = useStudyData();
  const [dateOffset, setDateOffset] = useState(0);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    subject_id: "",
    estimated_hours: 5,
    priority: "medium",
    status: "not_started",
  });
  const [addingToHour, setAddingToHour] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({
    name: "",
    subject_id: "",
    estimated_hours: 1,
  });

  const today = new Date();
  today.setDate(today.getDate() + dateOffset);
  const dateStr = today.toISOString().slice(0, 10);
  const dayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    const [subjs, chaps] = await Promise.all([
      fetchSubjects(user.id),
      fetchChapters(user.id),
    ]);
    setSubjects(subjs);
    setChapters(chaps);
    setMounted(true);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-[600px] rounded-2xl" />
      </div>
    );
  }

  // Today's chapters
  const dayChapters = chapters.filter((c) => c.target_date === dateStr);

  // Sessions today
  const daySessions = sessions.filter((s) => s.start_time?.slice(0, 10) === dateStr);
  const actualStudyHours =
    Math.round(
      (daySessions.reduce((a, s) => a + (s.duration_minutes || 0), 0) / 60) *
        10
    ) / 10;

  const completedChapters = dayChapters.filter((c) => c.status === "completed").length;
  const totalHours = dayChapters.reduce((a, c) => a + (c.estimated_hours || 5), 0);
  const completionPct =
    dayChapters.length > 0
      ? Math.round((completedChapters / dayChapters.length) * 100)
      : 0;

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  // Toggle
  const handleToggle = async (ch: any) => {
    const newStatus = ch.status === "completed" ? "not_started" : "completed";
    await updateChapter(ch.id, {
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === ch.id
          ? { ...c, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }
          : c
      )
    );
  };

  // Delete
  const handleDelete = async (ch: any) => {
    await deleteChapter(ch.id);
    setChapters((prev) => prev.filter((c) => c.id !== ch.id));
  };

  // Edit
  const openEdit = (ch: any) => {
    setEditingChapter(ch);
    setEditForm({
      name: ch.name,
      subject_id: ch.subject_id,
      estimated_hours: ch.estimated_hours || 5,
      priority: ch.priority || "medium",
      status: ch.status || "not_started",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingChapter) return;
    await updateChapter(editingChapter.id, {
      name: editForm.name,
      subject_id: editForm.subject_id,
      estimated_hours: editForm.estimated_hours,
      priority: editForm.priority,
      status: editForm.status,
    });
    setChapters((prev) =>
      prev.map((c) =>
        c.id === editingChapter.id
          ? { ...c, name: editForm.name, subject_id: editForm.subject_id, estimated_hours: editForm.estimated_hours, priority: editForm.priority, status: editForm.status }
          : c
      )
    );
    setEditingChapter(null);
  };

  // Add
  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.subject_id || !user) return;
    const ch = await createChapter({
      user_id: user.id,
      subject_id: addForm.subject_id,
      name: addForm.name,
      estimated_hours: addForm.estimated_hours,
      target_date: dateStr,
    });
    if (ch) setChapters((prev) => [ch, ...prev]);
    setAddingToHour(null);
    setAddForm({ name: "", subject_id: "", estimated_hours: 1 });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1">Daily Plan</p>
          <h1 className="text-3xl font-light tracking-tight">{dayLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDateOffset((o) => o - 1)} className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setDateOffset(0)} className="h-9 px-3 rounded-xl bg-card border border-border/50 text-xs font-medium hover:bg-muted transition-colors">
            Today
          </button>
          <button onClick={() => setDateOffset((o) => o + 1)} className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">CHAPTERS</p>
          <p className="text-3xl font-light">{completedChapters}/{dayChapters.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{completionPct}% complete</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">PLANNED</p>
          <p className="text-3xl font-light">{Math.round(totalHours)}h</p>
          <p className="text-xs text-muted-foreground mt-1">{dayChapters.length} chapters</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">ACTUAL</p>
          <p className="text-3xl font-light">{actualStudyHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">{daySessions.length} sessions</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">STATUS</p>
          <p className="text-3xl font-light">{completionPct >= 90 ? "🎉" : completionPct >= 50 ? "📊" : completionPct > 0 ? "📝" : "📋"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPct >= 90 ? "Almost done!" : completionPct >= 50 ? "On track" : completionPct > 0 ? "In progress" : "Not started"}
          </p>
        </div>
      </div>

      {/* Today's chapters list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Plan Your Day</p>
          <button
            onClick={() => setAddingToHour(addingToHour === -1 ? null : -1)}
            className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            Add Chapter
          </button>
        </div>

        {/* Add form */}
        {addingToHour === -1 && (
          <div className="p-4 rounded-2xl bg-card border border-primary/30">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1 block">Chapter Name</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Kinematics" className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" autoFocus />
              </div>
              <div className="w-40">
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1 block">Subject</label>
                <select value={addForm.subject_id} onChange={(e) => setAddForm((p) => ({ ...p, subject_id: e.target.value }))} className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                  <option value="">Select</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="w-20">
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1 block">Hours</label>
                <input type="number" value={addForm.estimated_hours} onChange={(e) => setAddForm((p) => ({ ...p, estimated_hours: Number(e.target.value) }))} min={1} max={12} className="w-full h-9 px-2 rounded-lg bg-background border border-border/50 text-sm text-center focus:outline-none" />
              </div>
              <button onClick={handleAdd} disabled={!addForm.name.trim() || !addForm.subject_id} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">Add</button>
              <button onClick={() => { setAddingToHour(null); setAddForm({ name: "", subject_id: "", estimated_hours: 1 }); }} className="h-9 px-3 rounded-lg bg-muted text-xs text-muted-foreground hover:bg-muted/80">Cancel</button>
            </div>
          </div>
        )}

        {/* Chapter list */}
        {dayChapters.length === 0 && addingToHour !== -1 ? (
          <div className="text-center py-8 rounded-2xl bg-card border border-border/30">
            <p className="text-sm text-muted-foreground">No chapters planned for today</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Chapter" or plan from Monthly/Weekly</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayChapters.map((ch: any) => {
              const sub = subjects.find((s) => s.id === ch.subject_id);
              const isCompleted = ch.status === "completed";
              return (
                <div key={ch.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/30 hover:border-border/50 transition-colors group">
                  <button onClick={() => handleToggle(ch)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/50 hover:border-primary/40"}`}>
                    {isCompleted && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{ch.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sub && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: (sub.color || "#6366f1") + "15", color: sub.color || "#6366f1" }}>{sub.name}</span>}
                      <span className="text-[11px] text-muted-foreground">{ch.estimated_hours || 5}h</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isCompleted && <span className="text-[10px] text-emerald-500 font-medium mr-1">Done</span>}
                    <button onClick={(e) => { e.stopPropagation(); openEdit(ch); }} className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all flex items-center justify-center" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm(`Delete "${ch.name}"?`)) handleDelete(ch); }} className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hourly timeline */}
      <div className="space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Timeline</p>
        <div className="rounded-2xl bg-card border border-border/30 overflow-hidden">
          {hours.map((hour) => {
            const label = `${hour.toString().padStart(2, "0")}:00`;
            const nextLabel = `${(hour + 1).toString().padStart(2, "0")}:00`;
            const isNow = (() => {
              const now = new Date();
              return dateStr === now.toISOString().slice(0, 10) && now.getHours() === hour;
            })();

            return (
              <div key={hour} className={`flex border-b border-border/10 last:border-0 ${isNow ? "bg-primary/5" : ""}`}>
                <div className="w-16 shrink-0 px-3 py-3 text-right border-r border-border/10">
                  <p className={`text-[11px] font-medium ${isNow ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
                </div>
                <div className="flex-1 px-3 py-2 min-h-[48px] flex items-center">
                  <p className="text-[10px] text-muted-foreground/40">{nextLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setEditingChapter(null)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Edit Chapter</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Chapter Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subject</label>
                <select value={editForm.subject_id} onChange={(e) => setEditForm((p) => ({ ...p, subject_id: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Estimated Hours</label>
                  <input type="number" value={editForm.estimated_hours} onChange={(e) => setEditForm((p) => ({ ...p, estimated_hours: Number(e.target.value) }))} min={1} max={100} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none cursor-pointer">
                  <option value="not_started">Not Started</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="revising">Revising</option>
                  <option value="needs_revision">Needs Revision</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingChapter(null)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
