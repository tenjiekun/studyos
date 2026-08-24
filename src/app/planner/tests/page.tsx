"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { fetchTests, createTest, updateTest, deleteTest } from "@/lib/planner";
import { Test, SUBJECTS, TEST_TYPES, TEST_CATEGORIES } from "@/lib/types";
import {
  Plus, TrendingUp, TrendingDown, Target, Award, Trash2, Pencil, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TestForm {
  name: string;
  type: string;
  category: string;
  date: string;
  duration_minutes: number;
  subjects: string[];
  max_marks: number;
  target_marks: string;
  actual_marks: string;
  accuracy: string;
  rank: string;
  correct_answers: string;
  incorrect_answers: string;
  unattempted: string;
  notes: string;
}

const defaultForm: TestForm = {
  name: "", type: "mock", category: "self",
  date: new Date().toISOString().slice(0, 10), duration_minutes: 180,
  subjects: [], max_marks: 200, target_marks: "", actual_marks: "",
  accuracy: "", rank: "", correct_answers: "", incorrect_answers: "",
  unattempted: "", notes: "",
};

export default function TestsPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [form, setForm] = useState<TestForm>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchTests(user.id).then((t) => { setTests(t); setMounted(true); });
  }, [user]);

  if (!mounted || !user) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-10 w-48 rounded-2xl" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
    );
  }

  const filtered = filterType === "all" ? tests : tests.filter((t) => t.type === filterType);
  const mockTests = tests.filter((t) => t.type === "mock");
  const actualTests = tests.filter((t) => t.type === "actual");
  const avgMock = mockTests.length > 0 && mockTests.some((t) => t.actual_marks != null)
    ? Math.round(mockTests.filter((t) => t.actual_marks != null).reduce((a, t) => a + ((t.actual_marks || 0) / t.max_marks * 100), 0) / mockTests.filter((t) => t.actual_marks != null).length)
    : null;
  const avgActual = actualTests.length > 0 && actualTests.some((t) => t.actual_marks != null)
    ? Math.round(actualTests.filter((t) => t.actual_marks != null).reduce((a, t) => a + ((t.actual_marks || 0) / t.max_marks * 100), 0) / actualTests.filter((t) => t.actual_marks != null).length)
    : null;

  function openNew() {
    setEditingTest(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(t: Test) {
    setEditingTest(t);
    setForm({
      name: t.name, type: t.type, category: t.category, date: t.date,
      duration_minutes: t.duration_minutes, subjects: t.subjects || [],
      max_marks: t.max_marks, target_marks: t.target_marks?.toString() || "",
      actual_marks: t.actual_marks?.toString() || "", accuracy: t.accuracy?.toString() || "",
      rank: t.rank?.toString() || "", correct_answers: t.correct_answers?.toString() || "",
      incorrect_answers: t.incorrect_answers?.toString() || "",
      unattempted: t.unattempted?.toString() || "", notes: t.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.date) return;
    const data = {
      user_id: user!.id, name: form.name, type: form.type as any, category: form.category as any,
      date: form.date, duration_minutes: form.duration_minutes, subjects: form.subjects,
      max_marks: form.max_marks,
      target_marks: form.target_marks ? Number(form.target_marks) : null,
      actual_marks: form.actual_marks ? Number(form.actual_marks) : null,
      accuracy: form.accuracy ? Number(form.accuracy) : null,
      rank: form.rank ? Number(form.rank) : null,
      correct_answers: form.correct_answers ? Number(form.correct_answers) : null,
      incorrect_answers: form.incorrect_answers ? Number(form.incorrect_answers) : null,
      unattempted: form.unattempted ? Number(form.unattempted) : null,
      notes: form.notes || null,
      questions_attempted: form.correct_answers && form.incorrect_answers ? Number(form.correct_answers) + Number(form.incorrect_answers) : null,
    };
    if (editingTest) {
      await updateTest(editingTest.id, data);
      setTests((prev) => prev.map((t) => t.id === editingTest.id ? { ...t, ...data } : t));
    } else {
      const created = await createTest(data as any);
      if (created) setTests((prev) => [created, ...prev]);
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    await deleteTest(id);
    setTests((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tests & Exams</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">{tests.length} tests recorded</p>
        </div>
        <Button onClick={openNew} className="gap-1.5 h-10 px-5 rounded-xl shadow-sm shadow-primary/10">
          <Plus className="w-4 h-4" /> Add Test
        </Button>
      </div>

      {/* Performance summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/50 bg-card/30">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Mock Avg</span>
          <p className="text-2xl font-semibold tracking-tight mt-1">{avgMock !== null ? `${avgMock}%` : "—"}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/50 bg-card/30">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actual Avg</span>
          <p className="text-2xl font-semibold tracking-tight mt-1">{avgActual !== null ? `${avgActual}%` : "—"}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/50 bg-card/30">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Mocks</span>
          <p className="text-2xl font-semibold tracking-tight mt-1">{mockTests.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/50 bg-card/30">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Tests</span>
          <p className="text-2xl font-semibold tracking-tight mt-1">{actualTests.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 w-fit">
        {[{ v: "all", l: "All" }, { v: "mock", l: "Mocks" }, { v: "actual", l: "Actual" }, { v: "practice", l: "Practice" }].map(({ v, l }) => (
          <button key={v} onClick={() => setFilterType(v)}
            className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 ${filterType === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Test list */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tests recorded yet</p>
          </div>
        ) : (
          filtered.map((test) => {
            const pct = test.actual_marks != null && test.max_marks > 0 ? Math.round((test.actual_marks / test.max_marks) * 100) : null;
            const diff = test.actual_marks != null && test.target_marks != null ? test.actual_marks - test.target_marks : null;
            return (
              <div key={test.id} className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/40 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                  backgroundColor: test.type === "mock" ? "oklch(0.54 0.24 265 / 10%)" : "oklch(0.70 0.16 155 / 10%)",
                }}>
                  <span className="text-[11px] font-bold" style={{ color: test.type === "mock" ? "oklch(0.65 0.20 265)" : "oklch(0.60 0.18 155)" }}>
                    {new Date(test.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">{test.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {test.type === "mock" ? "Mock" : test.type === "actual" ? "Actual" : test.type} · {new Date(test.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {test.duration_minutes}min
                    {test.subjects.length > 0 && ` · ${test.subjects.join(", ")}`}
                  </p>
                </div>
                {pct !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold tracking-tight">{pct}%</p>
                    <p className="text-[11px] text-muted-foreground">{test.actual_marks}/{test.max_marks}</p>
                  </div>
                )}
                {diff !== null && (
                  <div className={`text-[11px] font-medium shrink-0 ${diff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {diff >= 0 ? "+" : ""}{diff}
                  </div>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={() => openEdit(test)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl text-destructive" onClick={() => setDeleteConfirm(test.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden max-h-[85vh] overflow-y-auto">
          <div className="p-6 pb-4">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-lg font-semibold">{editingTest ? "Edit Test" : "Add Test"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Test Name</Label>
                <Input className="h-11 rounded-xl" placeholder="e.g. Mock Test #12" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Type</Label>
                  <Select value={form.type || "mock"} onValueChange={(v) => setForm({ ...form, type: v ?? "mock" })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Category</Label>
                  <Select value={form.category || "self"} onValueChange={(v) => setForm({ ...form, category: v ?? "self" })}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEST_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Date</Label>
                  <Input type="date" className="h-11 rounded-xl" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Duration (min)</Label>
                  <Input type="number" className="h-11 rounded-xl" value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Max Marks</Label>
                  <Input type="number" className="h-11 rounded-xl" value={form.max_marks}
                    onChange={(e) => setForm({ ...form, max_marks: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Target Marks</Label>
                  <Input type="number" className="h-11 rounded-xl" placeholder="Optional" value={form.target_marks}
                    onChange={(e) => setForm({ ...form, target_marks: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Actual Marks</Label>
                  <Input type="number" className="h-11 rounded-xl" placeholder="After test" value={form.actual_marks}
                    onChange={(e) => setForm({ ...form, actual_marks: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Accuracy %</Label>
                  <Input type="number" className="h-11 rounded-xl" placeholder="Optional" value={form.accuracy}
                    onChange={(e) => setForm({ ...form, accuracy: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Correct</Label>
                  <Input type="number" className="h-11 rounded-xl" value={form.correct_answers}
                    onChange={(e) => setForm({ ...form, correct_answers: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Wrong</Label>
                  <Input type="number" className="h-11 rounded-xl" value={form.incorrect_answers}
                    onChange={(e) => setForm({ ...form, incorrect_answers: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-medium">Unattempted</Label>
                  <Input type="number" className="h-11 rounded-xl" value={form.unattempted}
                    onChange={(e) => setForm({ ...form, unattempted: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Rank (optional)</Label>
                <Input type="number" className="h-11 rounded-xl" value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium">Notes</Label>
                <Textarea className="rounded-xl resize-none" rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()} className="rounded-xl px-6">
              {editingTest ? "Save" : "Add Test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader><DialogTitle className="text-lg font-semibold">Delete Test</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mt-3">This action cannot be undone.</p>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
