"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import { fetchBlocks, createBlock, updateBlock, deleteBlock } from "@/lib/planner";
import { ScheduledBlock, BLOCK_TYPES } from "@/lib/types";
import { formatMinutes } from "@/lib/helpers";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS } from "@/lib/types";

function getWeekRange(offset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday, startStr: monday.toISOString().slice(0, 10), endStr: sunday.toISOString().slice(0, 10) };
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekPage() {
  const { user } = useAuth();
  const { sessions } = useStudyData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ title: "", type: "study", subject: "", date: "", start_time: "09:00", end_time: "10:00" });
  const [mounted, setMounted] = useState(false);

  const week = getWeekRange(weekOffset);

  useEffect(() => {
    if (!user) return;
    fetchBlocks(user.id, week.startStr + "T00:00:00", week.endStr + "T23:59:59").then((b) => { setBlocks(b); setMounted(true); });
  }, [user, weekOffset]);

  if (!mounted || !user) {
    return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-[400px] rounded-2xl" /></div>;
  }

  const weekLabel = `${week.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${week.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  async function addBlock() {
    if (!form.title.trim() || !form.date) return;
    const startDT = new Date(form.date + "T" + form.start_time).toISOString();
    const endDT = new Date(form.date + "T" + form.end_time).toISOString();
    const block = await createBlock({
      user_id: user!.id, type: form.type as any, title: form.title, subject: form.subject || null,
      start_time: startDT, end_time: endDT, status: "planned",
      task_id: null, actual_minutes: null, syllabus_item_id: null, test_id: null,
      notes: null, google_event_id: null, recurrence: null,
    });
    if (block) setBlocks((prev) => [...prev, block].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    setAddDialog(false);
    setForm({ title: "", type: "study", subject: "", date: "", start_time: "09:00", end_time: "10:00" });
  }

  async function removeBlock(id: string) {
    await deleteBlock(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  // Group blocks by day
  const daysMap: Record<string, ScheduledBlock[]> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(week.start);
    d.setDate(d.getDate() + i);
    daysMap[d.toISOString().slice(0, 10)] = [];
  }
  blocks.forEach((b) => {
    const day = b.start_time.slice(0, 10);
    if (daysMap[day]) daysMap[day].push(b);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Weekly Plan</h1>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">{weekLabel}</span>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add block button */}
      <Button onClick={() => { setForm({ ...form, date: week.startStr }); setAddDialog(true); }}
        className="gap-1.5 h-10 px-5 rounded-xl shadow-sm shadow-primary/10">
        <Plus className="w-4 h-4" /> Add Block
      </Button>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {DAY_NAMES.map((day, i) => {
          const d = new Date(week.start);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          const isToday = key === new Date().toISOString().slice(0, 10);
          const dayBlocks = daysMap[key] || [];
          const dayMinutes = dayBlocks.reduce((a, b) => {
            const dur = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000;
            return a + dur;
          }, 0);

          return (
            <div key={key} className={`rounded-2xl border ${isToday ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card/30"} p-2 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                <span className={`text-[10px] ${isToday ? "text-primary font-medium" : "text-muted-foreground/60"}`}>{d.getDate()}</span>
              </div>
              {dayBlocks.length > 0 && (
                <p className="text-[10px] text-muted-foreground mb-2">{formatMinutes(dayMinutes)}</p>
              )}
              <div className="space-y-1">
                {dayBlocks.slice(0, 4).map((b) => {
                  const typeInfo = BLOCK_TYPES.find((bt) => bt.value === b.type);
                  return (
                    <div key={b.id} className="group relative px-1.5 py-1 rounded-lg text-[10px] truncate" style={{ borderLeft: `2px solid ${typeInfo?.color || "#6366F1"}` }}>
                      <p className="font-medium truncate">{b.title}</p>
                      <p className="text-muted-foreground">{new Date(b.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                      <button onClick={() => removeBlock(b.id)} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                {dayBlocks.length > 4 && <p className="text-[10px] text-muted-foreground px-1">+{dayBlocks.length - 4} more</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Block Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
          <div className="p-6 pb-4">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-lg font-semibold">Add Study Block</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Title</Label>
                <Input className="h-11 rounded-xl" placeholder="e.g. Physics — Electrostatics" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Type</Label>
                  <Select value={form.type || "study"} onValueChange={(v) => setForm({ ...form, type: v ?? "study" })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v ?? "" })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Date</Label>
                <Input type="date" className="h-11 rounded-xl" value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Start</Label>
                  <Input type="time" className="h-11 rounded-xl" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">End</Label>
                  <Input type="time" className="h-11 rounded-xl" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setAddDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={addBlock} disabled={!form.title.trim()} className="rounded-xl px-6">Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
