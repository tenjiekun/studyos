"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchYearPlans, createYearPlan, fetchGoals, createGoal, updateGoal, deleteGoal } from "@/lib/planner";
import { YearPlan, PlanGoal, SUBJECTS } from "@/lib/types";
import { Plus, Target, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function YearPlanPage() {
  const { user } = useAuth();
  const [yearPlan, setYearPlan] = useState<YearPlan | null>(null);
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [goalDialog, setGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", subject: "", description: "", priority: "medium" as const, target_date: "" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchYearPlans(user.id), fetchGoals(user.id, "year")]).then(([yp, g]) => {
      if (yp.length === 0) {
        createYearPlan(user.id, "Academic Year " + new Date().getFullYear(), new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)).then(setYearPlan);
      } else {
        setYearPlan(yp[0]);
      }
      setGoals(g);
      setMounted(true);
    });
  }, [user]);

  if (!mounted || !user) {
    return <div className="space-y-4"><div className="skeleton h-8 w-48" /><div className="skeleton h-[300px] rounded-2xl" /></div>;
  }

  async function addGoal() {
    if (!newGoal.title.trim()) return;
    const goal = await createGoal({
      user_id: user!.id, plan_id: yearPlan?.id || null, period: "year", period_date: null,
      title: newGoal.title, description: newGoal.description || null, subject: newGoal.subject || null,
      target_date: newGoal.target_date || null, priority: newGoal.priority, status: "not_started", progress: 0,
    });
    if (goal) setGoals((prev) => [goal, ...prev]);
    setGoalDialog(false);
    setNewGoal({ title: "", subject: "", description: "", priority: "medium", target_date: "" });
  }

  async function toggleGoalStatus(goal: PlanGoal) {
    const nextStatus = goal.status === "not_started" ? "in_progress" : goal.status === "in_progress" ? "completed" : "not_started";
    const nextProgress = nextStatus === "completed" ? 100 : nextStatus === "in_progress" ? 50 : 0;
    await updateGoal(goal.id, { status: nextStatus, progress: nextProgress });
    setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: nextStatus, progress: nextProgress } : g));
  }

  async function removeGoal(id: string) {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const statusColor = (s: string) => s === "completed" ? "text-emerald-500" : s === "in_progress" ? "text-primary" : "text-muted-foreground";
  const statusLabel = (s: string) => s === "completed" ? "✅" : s === "in_progress" ? "🔵" : "○";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Year Plan</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            {yearPlan?.academic_year || "Set your academic year goals"}
          </p>
        </div>
        <Button onClick={() => setGoalDialog(true)} className="gap-1.5 h-10 px-5 rounded-xl shadow-sm shadow-primary/10">
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      </div>

      {/* Goals */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Major Goals</h2>
        {goals.length === 0 ? (
          <div className="py-16 text-center">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No goals yet. Add your first goal to start planning.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => (
              <div key={goal.id} className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border/50 bg-card/30 hover:bg-muted/30 transition-colors">
                <button onClick={() => toggleGoalStatus(goal)} className="shrink-0 text-lg">{statusLabel(goal.status)}</button>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium ${goal.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{goal.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {goal.subject && <span className="text-[11px] text-muted-foreground">{goal.subject}</span>}
                    {goal.target_date && <span className="text-[11px] text-muted-foreground">Due: {goal.target_date}</span>}
                  </div>
                </div>
                <div className="w-20 shrink-0">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
                <button onClick={() => removeGoal(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/50 hover:text-destructive shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
          <div className="p-6 pb-4">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-lg font-semibold">Add Year Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Goal</Label>
                <Input className="h-11 rounded-xl" placeholder="e.g. Complete Physics syllabus" value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Subject</Label>
                  <Select value={newGoal.subject} onValueChange={(v) => setNewGoal({ ...newGoal, subject: v ?? "" })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Target Date</Label>
                  <Input type="date" className="h-11 rounded-xl" value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Description (optional)</Label>
                <Textarea className="rounded-xl resize-none" rows={2} value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setGoalDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={addGoal} disabled={!newGoal.title.trim()} className="rounded-xl px-6">Add Goal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
