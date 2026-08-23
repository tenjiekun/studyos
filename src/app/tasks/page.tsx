"use client";

import { useEffect, useState } from "react";
import { useStudyData } from "@/lib/use-study-data";
import {
  getTodayStr,
  getWeekStart,
  getMonthStart,
  getSubjectColor,
  formatMinutes,
} from "@/lib/helpers";
import { Task, SUBJECTS } from "@/lib/types";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  Calendar,
  Filter,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  title: "",
  subject: "Mathematics",
  description: "",
  priority: "medium",
  estimated_minutes: 30,
  scheduled_date: getTodayStr(),
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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 bg-muted rounded-lg" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
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
      title: task.title,
      subject: task.subject,
      description: task.description || "",
      priority: task.priority,
      estimated_minutes: task.estimated_minutes,
      scheduled_date: task.scheduled_date,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    if (editingTask) {
      await updateTask(editingTask.id, {
        title: form.title,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        estimated_minutes: form.estimated_minutes,
        scheduled_date: form.scheduled_date,
      });
    } else {
      await addTask({
        title: form.title,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        estimated_minutes: form.estimated_minutes,
        scheduled_date: form.scheduled_date,
        completed: false,
      });
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setDeleteConfirm(null);
  }

  const priorityIcon = (p: string) => {
    if (p === "high") return <ArrowUpRight className="w-3 h-3 text-red-500" />;
    if (p === "low") return <ArrowDownRight className="w-3 h-3 text-blue-500" />;
    return <Minus className="w-3 h-3 text-amber-500" />;
  };

  const views: { value: ViewTab; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "all", label: "All Tasks" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completedTasks} / {totalTasks} completed · {formatMinutes(totalEstimated)} estimated
          </p>
        </div>
        <Button onClick={openNewTask} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      <div className="flex items-center gap-1 animate-fade-in">
        {views.map((v) => (
          <button
            key={v.value}
            onClick={() => setView(v.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              view === v.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap animate-fade-in">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={filterSubject} onValueChange={(v) => v && setFilterSubject(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          {(["all", "todo", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                filterStatus === s
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {(filterSubject !== "all" || filterStatus !== "all") && (
          <button
            onClick={() => {
              setFilterSubject("all");
              setFilterStatus("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="space-y-2 animate-fade-in">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {view === "today"
                  ? "No tasks for today. Add one to get started!"
                  : "No tasks match your filters."}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openNewTask}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={`group transition-all duration-200 hover:shadow-sm ${
                task.completed ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-scale-check" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-medium ${
                          task.completed ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      {priorityIcon(task.priority)}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                        style={{
                          backgroundColor: getSubjectColor(task.subject) + "18",
                          color: getSubjectColor(task.subject),
                          border: `1px solid ${getSubjectColor(task.subject)}30`,
                        }}
                      >
                        {task.subject}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {task.scheduled_date}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ~{task.estimated_minutes}min
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditTask(task)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="What do you need to study?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={form.subject}
                  onValueChange={(v) => v && setForm({ ...form, subject: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => v && setForm({ ...form, priority: v as "low" | "medium" | "high" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>Est. Minutes</Label>
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={form.estimated_minutes}
                  onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Any notes about this task..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.title.trim()}>
              {editingTask ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this task? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
