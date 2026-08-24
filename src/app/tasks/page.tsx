"use client";

import { useEffect, useState } from "react";
import { useStudyData } from "@/lib/use-study-data";
import {
  getTodayStr, getWeekStart, getMonthStart, getSubjectColor, formatMinutes,
} from "@/lib/helpers";
import { Task, SUBJECTS } from "@/lib/types";
import {
  Plus, CheckCircle2, Circle, Trash2, Pencil, Calendar, X,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewTab = "today" | "weekly" | "monthly" | "all";

interface TaskFormData {
  title: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimated_minutes: number;
  scheduled_date: string;
}

const defaultForm: TaskFormData = {
  title: "", subject: "Mathematics", description: "", priority: "medium",
  estimated_minutes: 30, scheduled_date: getTodayStr(),
};

export default function TasksPage() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, loading } = useStudyData();
  const [view, setView] = useState<ViewTab>("today");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "todo" | "completed">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [mounted, setMounted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-6">
        <div className="space-y-3">
          <div className="skeleton h-9 w-32" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="skeleton h-10 w-64 rounded-2xl" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
      </div>
    );
  }

  const today = getTodayStr();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const filteredTasks = tasks
    .filter((t) => {
      if (view === "today") return t.scheduled_date === today;
      if (view === "weekly") return t.scheduled_date >= weekStart && t.scheduled_date <= today;
      if (view === "monthly") return t.scheduled_date >= monthStart && t.scheduled_date <= today;
      return true;
    })
    .filter((t) => filterSubject === "all" || t.subject === filterSubject)
    .filter((t) => {
      if (filterStatus === "todo") return !t.completed;
      if (filterStatus === "completed") return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const prio = { high: 0, medium: 1, low: 2 };
      return prio[a.priority] - prio[b.priority];
    });

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.completed).length;
  const totalEstimated = filteredTasks.reduce((a, t) => a + t.estimated_minutes, 0);

  function openNewTask() {
    setEditingTask(null);
    setForm({ ...defaultForm, scheduled_date: today });
    setDialogOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title, subject: task.subject, description: task.description || "",
      priority: task.priority, estimated_minutes: task.estimated_minutes, scheduled_date: task.scheduled_date,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    if (editingTask) {
      await updateTask(editingTask.id, {
        title: form.title, subject: form.subject, description: form.description,
        priority: form.priority, estimated_minutes: form.estimated_minutes, scheduled_date: form.scheduled_date,
      });
    } else {
      await addTask({
        title: form.title, subject: form.subject, description: form.description,
        priority: form.priority, estimated_minutes: form.estimated_minutes,
        scheduled_date: form.scheduled_date, completed: false,
      });
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setDeleteConfirm(null);
  }

  const priorityIcon = (p: string) => {
    if (p === "high") return <ArrowUpRight className="w-3 h-3 text-red-500/80" />;
    if (p === "low") return <ArrowDownRight className="w-3 h-3 text-blue-500/80" />;
    return <Minus className="w-3 h-3 text-amber-500/80" />;
  };

  const views: { value: ViewTab; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "all", label: "All Tasks" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            {completedTasks} / {totalTasks} completed · {formatMinutes(totalEstimated)} estimated
          </p>
        </div>
        <Button onClick={openNewTask} className="gap-1.5 h-10 px-5 rounded-xl shadow-sm shadow-primary/10">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      {/* View tabs — segmented control */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 w-fit animate-fade-in">
        {views.map((v) => (
          <button
            key={v.value}
            onClick={() => setView(v.value)}
            className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 ${
              view === v.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap animate-fade-in">
        <div className="flex items-center gap-2">
          <Select value={filterSubject} onValueChange={(v) => v && setFilterSubject(v)}>
            <SelectTrigger className="w-[140px] h-9 rounded-xl text-[13px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/40">
          {(["all", "todo", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200 capitalize ${
                filterStatus === s
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {(filterSubject !== "all" || filterStatus !== "all") && (
          <button
            onClick={() => { setFilterSubject("all"); setFilterStatus("all"); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-1 animate-fade-in">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {view === "today" ? "No tasks for today. Add one to get started!" : "No tasks match your filters."}
            </p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={openNewTask}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
            </Button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-start gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 hover:bg-muted/40 ${
                task.completed ? "opacity-50" : ""
              }`}
            >
              <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-primary animate-scale-check" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/30 hover:text-primary transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[14px] font-medium transition-all duration-300 ${
                    task.completed ? "line-through text-muted-foreground" : "text-foreground"
                  }`}>
                    {task.title}
                  </h3>
                  {priorityIcon(task.priority)}
                </div>
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: getSubjectColor(task.subject) + "12",
                      color: getSubjectColor(task.subject),
                    }}
                  >
                    {task.subject}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {task.scheduled_date}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    ~{task.estimated_minutes}min
                  </span>
                </div>
                {task.description && (
                  <p className="text-[12px] text-muted-foreground mt-1.5 line-clamp-1">{task.description}</p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => openEditTask(task)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirm(task.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
          <div className="p-6 pb-4">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-lg font-semibold">{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Title</Label>
                <Input
                  placeholder="What do you need to study?"
                  className="h-11 rounded-xl"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => v && setForm({ ...form, subject: v })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => v && setForm({ ...form, priority: v as "low" | "medium" | "high" })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Est. Minutes</Label>
                  <Input type="number" min={5} step={5} className="h-11 rounded-xl"
                    value={form.estimated_minutes} onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Date</Label>
                  <Input type="date" className="h-11 rounded-xl"
                    value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Description (optional)</Label>
                <Textarea placeholder="Any notes about this task..." rows={2} className="rounded-xl resize-none"
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim()} className="rounded-xl px-6">
              {editingTask ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Delete Task</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-3">
              Are you sure you want to delete this task? This cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
