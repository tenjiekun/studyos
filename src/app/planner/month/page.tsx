"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import { fetchGoals, createGoal, updateGoal, fetchMonthlyPlans, createMonthlyPlan } from "@/lib/planner";
import { PlanGoal, MonthlyPlan } from "@/lib/types";
import { formatMinutes, getTodayStr, getMonthStart } from "@/lib/helpers";
import { Plus, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUBJECTS } from "@/lib/types";

export default function MonthPage() {
  const { user } = useAuth();
  const { sessions, tasks } = useStudyData();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  });
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [monthPlan, setMonthPlan] = useState<MonthlyPlan | null>(null);
  const [goalDialog, setGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", subject: "", target_date: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;

    Promise.all([fetchGoals(user.id, "month", currentMonth), fetchMonthlyPlans(user.id)]).then(([g, mp]) => {
      setGoals(g);
      setMonthPlan(mp.find((p) => p.month === currentMonth) || null);
      setMounted(true);
    });
  }, [user, currentMonth]);

  const monthSessions = sessions.filter((s) => s.start_time.slice(0, 7) === currentMonth);
  const actualHours = monthSessions.reduce((a, s) => a + s.duration_minutes, 0) / 60;
  const monthTasks = tasks.filter((t) => t.scheduled_date?.slice(0, 7) === currentMonth);
  const completedTasks = monthTasks.filter((t) => t.completed).length;

  if (!mounted || !user) {
    return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-[300px] rounded-2xl" /></div>;
  }

  const monthLabel = new Date(currentMonth + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const plannedHours = monthPlan?.planned_study_hours || 0;

  async function addGoal() {
    if (!newGoal.title.trim()) return;
    const goal = await createGoal({
      user_id: user!.id, plan_id: null, period: "month", period_date: currentMonth,
      title: newGoal.title, description: null, subject: newGoal.subject || null, target_date: newGoal.target_date || null,
      priority: "medium", status: "not_started", progress: 0,
    });
    if (goal) setGoals((prev) => [goal, ...prev]);
    setGoalDialog(false);
    setNewGoal({ title: "", subject: "", target_date: "" });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{monthLabel}</h1>
          <p className="text-sm text-muted-foreground mt-1">Monthly planning and goals</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(currentMonth + "-01"); d.setMonth(d.getMonth() - 1); setCurrentMonth(d.toISOString().slice(0, 7)); }}
            className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(new Date().toISOString().slice(0, 7))}
            className="h-9 px-3 rounded-xl bg-card border border-border/50 text-xs font-medium hover:bg-muted transition-colors">
            Today
          </button>
          <button onClick={() => { const d = new Date(currentMonth + "-01"); d.setMonth(d.getMonth() + 1); setCurrentMonth(d.toISOString().slice(0, 7)); }}
            className="h-9 w-9 rounded-xl bg-card border border-border/50 flex items-center justify-center hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "PLANNED", value: `${plannedHours}h` },
          { label: "ACTUAL", value: `${Math.round(actualHours)}h` },
          { label: "TASKS", value: `${completedTasks}/${monthTasks.length}` },
          { label: "GOALS", value: `${goals.filter((g) => g.status === "completed").length}/${goals.length}` },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-card border border-border/30">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">{s.label}</p>
            <p className="text-2xl font-light">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Goals */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Monthly Goals</p>
          <button onClick={() => setGoalDialog(true)} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all">
            + Add Goal
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No goals for this month</p>
          </div>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => (
              <div key={goal.id} className="p-4 rounded-2xl bg-card border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{goal.title}</p>
                  <span className="text-xs text-muted-foreground">{goal.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${goal.progress}%` }} />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {goal.subject && <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{goal.subject}</span>}
                  <span className="text-[11px] text-muted-foreground">{goal.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader><DialogTitle className="text-lg font-medium">Add Monthly Goal</DialogTitle></DialogHeader>
          <div className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium">Goal</Label>
              <Input className="h-11 rounded-xl" placeholder="e.g. Complete 4 Physics chapters" value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Subject</Label>
                <Select value={newGoal.subject} onValueChange={(v) => setNewGoal({ ...newGoal, subject: v ?? "" })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Target Date</Label>
                <Input type="date" className="h-11 rounded-xl" value={newGoal.target_date}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setGoalDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={addGoal} disabled={!newGoal.title.trim()} className="rounded-xl px-6">Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
