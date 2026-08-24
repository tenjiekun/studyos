"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStudyData } from "@/lib/use-study-data";
import {
  fetchSubjects, createSubject, updateSubject, deleteSubject,
  fetchChapters, createChapter, updateChapter, deleteChapter, bulkCreateChapters,
  fetchYearPlan, createYearPlan, updateYearPlan,
  fetchDistributions, upsertDistributions,
  fetchAssignments, upsertAssignments,
  calculateAvailableHours, getPlanMonths, distributeChapters,
  calculateSyllabusStats, checkPlanFeasibility,
} from "@/lib/planner-v2";
import { parseSyllabusText, ParsedSubject } from "@/lib/syllabus-parser";
import { Plus, Target, BookOpen, Clock, ChevronRight, ChevronLeft, Upload, Settings, Trash2, GripVertical, Check, AlertTriangle, RefreshCw } from "lucide-react";

type Tab = "overview" | "syllabus";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function YearPlanPage() {
  const { user } = useAuth();
  const { sessions } = useStudyData();
  const [tab, setTab] = useState<Tab>("overview");
  const [yearPlan, setYearPlan] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Syllabus import state
  const [syllabusText, setSyllabusText] = useState("");
  const [parsedSubjects, setParsedSubjects] = useState<ParsedSubject[]>([]);
  const [showImportReview, setShowImportReview] = useState(false);
  const [importStep, setImportStep] = useState<"paste" | "review" | "done">("paste");

  // Subject dialog
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("#6366f1");
  const [newSubjectPriority, setNewSubjectPriority] = useState("medium");

  // Chapter dialog
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [chapterSubjectId, setChapterSubjectId] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterHours, setNewChapterHours] = useState(5);

  // Plan settings dialog
  const [showPlanSettings, setShowPlanSettings] = useState(false);
  const [planStartDate, setPlanStartDate] = useState("2026-04-01");
  const [planEndDate, setPlanEndDate] = useState("2027-03-31");
  const [dailyHours, setDailyHours] = useState(6);
  const [weeklyDays, setWeeklyDays] = useState(6);
  const [bufferPct, setBufferPct] = useState(15);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [yp, subjs, chaps] = await Promise.all([
      fetchYearPlan(user.id),
      fetchSubjects(user.id),
      fetchChapters(user.id),
    ]);
    setYearPlan(yp);
    setSubjects(subjs);
    setChapters(chaps);
    if (yp) {
      const dists = await fetchDistributions(yp.id);
      setDistributions(dists);
      setPlanStartDate(yp.start_date || "2026-04-01");
      setPlanEndDate(yp.end_date || "2027-03-31");
      setDailyHours(yp.daily_study_hours || 6);
      setWeeklyDays(yp.weekly_study_days || 6);
      setBufferPct(yp.buffer_pct || 15);
    }
    setMounted(true);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      </div>
    );
  }

  const stats = calculateSyllabusStats(chapters);
  const capacity = calculateAvailableHours({
    startDate: planStartDate,
    endDate: planEndDate,
    dailyStudyHours: dailyHours,
    weeklyStudyDays: weeklyDays,
    bufferPct,
  });
  const feasibility = checkPlanFeasibility({
    totalRequiredHours: stats.plannedHours,
    totalAvailableHours: capacity.availableHours,
  });
  const months = getPlanMonths(planStartDate, planEndDate);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Subject colors
  const subjectColorMap: Record<string, string> = {};
  subjects.forEach((s) => { subjectColorMap[s.id] = s.color || "#6366f1"; });

  // Create year plan
  async function handleCreatePlan() {
    if (!user) return;
    const plan = await createYearPlan({
      user_id: user.id,
      title: `${planStartDate.slice(0, 4)}–${planEndDate.slice(0, 4)} Study Plan`,
      academic_year: `${planStartDate.slice(0, 4)}–${planEndDate.slice(0, 4)}`,
      start_date: planStartDate,
      end_date: planEndDate,
      daily_study_hours: dailyHours,
      weekly_study_days: weeklyDays,
      buffer_pct: bufferPct,
    });
    if (plan) {
      setYearPlan(plan);
      await updateYearPlan(plan.id, { total_available_hours: capacity.availableHours, total_planned_hours: stats.plannedHours });
    }
    setShowPlanSettings(false);
  }

  // Add subject
  async function handleAddSubject() {
    if (!user || !newSubjectName.trim()) return;
    const sub = await createSubject(user.id, newSubjectName.trim(), newSubjectColor, newSubjectPriority);
    if (sub) setSubjects((prev) => [...prev, sub]);
    setShowSubjectDialog(false);
    setNewSubjectName("");
  }

  // Add chapter
  async function handleAddChapter() {
    if (!user || !chapterSubjectId || !newChapterName.trim()) return;
    const ch = await createChapter({
      user_id: user.id,
      subject_id: chapterSubjectId,
      name: newChapterName.trim(),
      estimated_hours: newChapterHours,
      sort_order: chapters.filter((c) => c.subject_id === chapterSubjectId).length,
    });
    if (ch) setChapters((prev) => [...prev, ch]);
    setShowChapterDialog(false);
    setNewChapterName("");
    setNewChapterHours(5);
  }

  // Parse syllabus
  function handleAnalyzeSyllabus() {
    const parsed = parseSyllabusText(syllabusText);
    setParsedSubjects(parsed);
    setImportStep("review");
    setShowImportReview(true);
  }

  // Import parsed syllabus
  async function handleImportSyllabus() {
    if (!user) return;
    console.log("[Import] Starting import of", parsedSubjects.length, "subjects");
    for (const ps of parsedSubjects) {
      // Check if subject already exists
      let existingSubject = subjects.find((s) => s.name.toLowerCase() === ps.name.toLowerCase());
      if (!existingSubject) {
        console.log("[Import] Creating subject:", ps.name);
        const sub = await createSubject(user.id, ps.name);
        console.log("[Import] Subject result:", sub);
        if (sub) {
          existingSubject = sub;
          setSubjects((prev) => [...prev, sub]);
        } else {
          console.error("[Import] Failed to create subject:", ps.name);
        }
      }
      if (!existingSubject) continue;

      // Create chapters
      const chapterData = ps.chapters.map((ch, idx) => ({
        user_id: user.id,
        subject_id: existingSubject!.id,
        name: ch.name,
        topics: ch.topics.length > 0 ? ch.topics : undefined,
        estimated_hours: ch.estimated_hours || 5,
        sort_order: idx,
      }));

      const created = await bulkCreateChapters(chapterData);
      setChapters((prev) => [...prev, ...created]);
    }

    // Reload data
    const chaps = await fetchChapters(user.id);
    setChapters(chaps);
    setShowImportReview(false);
    setImportStep("done");
    setSyllabusText("");
    setParsedSubjects([]);
  }

  // Delete subject
  async function handleDeleteSubject(id: string) {
    await deleteSubject(id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setChapters((prev) => prev.filter((c) => c.subject_id !== id));
  }

  // Delete chapter
  async function handleDeleteChapter(id: string) {
    await deleteChapter(id);
    setChapters((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1">Year Plan</p>
          <h1 className="text-3xl font-light tracking-tight">
            {yearPlan?.title || `${planStartDate.slice(0, 4)}–${planEndDate.slice(0, 4)} Study Plan`}
          </h1>
        </div>
        <div className="flex gap-2">
          {!yearPlan && (
            <button onClick={() => setShowPlanSettings(true)} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">
              <Plus className="w-4 h-4 inline mr-1.5" /> Create Year Plan
            </button>
          )}
          {yearPlan && (
            <button onClick={() => setShowPlanSettings(true)} className="h-10 px-4 rounded-xl bg-card border border-border/50 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Settings className="w-4 h-4 inline mr-1" /> Settings
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">SYLLABUS</p>
          <p className="text-3xl font-light">{stats.percentage}%</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.completed}/{stats.total} chapters</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">CAPACITY</p>
          <p className="text-3xl font-light">{capacity.availableHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">{capacity.bufferHours}h buffer</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">PLANNED</p>
          <p className="text-3xl font-light">{stats.plannedHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">{feasibility.utilization}% utilization</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">SUBJECTS</p>
          <p className="text-3xl font-light">{subjects.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.inProgress} in progress</p>
        </div>
      </div>

      {/* Feasibility Warning */}
      {!feasibility.fits && yearPlan && (
        <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-500">Your plan may not fit</p>
              <p className="text-xs text-muted-foreground mt-1">
                Required: {stats.plannedHours}h · Available: {capacity.availableHours}h · Gap: {feasibility.gap}h
              </p>
              <p className="text-xs text-muted-foreground mt-1">Consider increasing study hours, adding days, or extending the end date.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {(["overview", "syllabus"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "overview" ? "Overview" : "Syllabus"}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Subjects List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Subjects</p>
              <button onClick={() => setShowSubjectDialog(true)} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all">
                + Add Subject
              </button>
            </div>
            {subjects.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-card border border-border/30">
                <BookOpen className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No subjects yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add subjects to start planning your year</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subjects.map((sub) => {
                  const subChapters = chapters.filter((c) => c.subject_id === sub.id);
                  const subStats = calculateSyllabusStats(subChapters);
                  const pct = sub.allocation_pct || Math.round(100 / subjects.length);
                  return (
                    <div key={sub.id} className="p-4 rounded-2xl bg-card border border-border/30 group">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color || "#6366f1" }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{sub.name}</p>
                            <span className="text-xs text-muted-foreground">{pct}% · {subStats.total} chapters · {subStats.plannedHours}h</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${subStats.percentage}%`, backgroundColor: sub.color || "#6366f1" }} />
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-muted-foreground">{subStats.completed}/{subStats.total} completed</span>
                            <span className="text-[11px] text-muted-foreground">{subStats.percentage}%</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteSubject(sub.id)}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg text-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-all flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== SYLLABUS TAB ===== */}
      {tab === "syllabus" && (
        <div className="space-y-6">
          {/* Import Button */}
          <div className="flex gap-3">
            <button onClick={() => { setTab("syllabus"); setShowImportReview(true); setImportStep("paste"); }}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">
              <Upload className="w-4 h-4 inline mr-2" /> Import Syllabus
            </button>
            <button onClick={() => setShowChapterDialog(true)} className="h-12 px-5 rounded-xl bg-card border border-border/50 text-sm font-medium hover:bg-muted transition-colors">
              <Plus className="w-4 h-4 inline mr-1" /> Add Chapter
            </button>
          </div>

          {/* Syllabus Tree */}
          {subjects.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-card border border-border/30">
              <p className="text-sm text-muted-foreground">No syllabus content yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Import your syllabus or add chapters manually</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjects.map((sub) => {
                const subChapters = chapters.filter((c) => c.subject_id === sub.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                const subStats = calculateSyllabusStats(subChapters);
                return (
                  <div key={sub.id} className="rounded-2xl bg-card border border-border/30 overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-border/20">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color || "#6366f1" }} />
                      <p className="text-sm font-medium flex-1">{sub.name}</p>
                      <span className="text-xs text-muted-foreground">{subStats.completed}/{subStats.total} · {subStats.percentage}%</span>
                    </div>
                    {subChapters.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">No chapters yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/10">
                        {subChapters.map((ch) => (
                          <div key={ch.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group">
                            <button onClick={async () => {
                              const newStatus = ch.status === "completed" ? "not_started" : "completed";
                              await updateChapter(ch.id, { status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null });
                              setChapters((prev) => prev.map((c) => c.id === ch.id ? { ...c, status: newStatus } : c));
                            }} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${ch.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-border/50 hover:border-primary/40"}`}>
                              {ch.status === "completed" && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${ch.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{ch.name}</p>
                              {ch.topics && ch.topics.length > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{ch.topics.join(" · ")}</p>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground">{ch.estimated_hours}h</span>
                            <button onClick={() => handleDeleteChapter(ch.id)}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md text-muted-foreground hover:text-destructive transition-all flex items-center justify-center">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== DISTRIBUTE TAB ===== */}


      {/* ===== IMPORT SYLLABUS MODAL ===== */}
      {showImportReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowImportReview(false)} />
          <div className="relative w-full max-w-3xl mx-4 bg-card border border-border/50 rounded-3xl shadow-xl max-h-[85vh] flex flex-col">
            {importStep === "paste" ? (
              <div className="p-8">
                <h2 className="text-lg font-medium mb-2">Import Syllabus</h2>
                <p className="text-xs text-muted-foreground mb-4">Paste your complete syllabus below. The parser supports multiple formats.</p>
                <textarea value={syllabusText} onChange={(e) => setSyllabusText(e.target.value)}
                  className="w-full h-64 p-4 rounded-2xl bg-background border border-border/50 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={`Physics\n1. Units and Measurements\n2. Kinematics\n3. Laws of Motion\n4. Work, Energy and Power\n\nChemistry\n1. Atomic Structure\n2. Chemical Bonding\n3. Thermodynamics\n\nMathematics\n1. Sets and Relations\n2. Trigonometry\n3. Calculus`} />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowImportReview(false)} className="h-10 px-5 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Cancel</button>
                  <button onClick={handleAnalyzeSyllabus} disabled={!syllabusText.trim()}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">Analyze Syllabus</button>
                </div>
              </div>
            ) : (
              <div className="p-8 overflow-y-auto flex-1">
                <h2 className="text-lg font-medium mb-2">Review Imported Syllabus</h2>
                <p className="text-xs text-muted-foreground mb-4">Review the parsed syllabus before importing. Check for any items marked &quot;Needs Review&quot;.</p>
                <div className="space-y-4">
                  {parsedSubjects.map((ps, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-background border border-border/30">
                      <p className="text-sm font-medium mb-2">{ps.name}</p>
                      <div className="space-y-1">
                        {ps.chapters.map((ch, j) => (
                          <div key={j} className="flex items-center gap-2 text-sm">
                            <Check className={`w-3.5 h-3.5 ${ch.needsReview ? "text-amber-500" : "text-emerald-500"}`} />
                            <span className={ch.needsReview ? "text-amber-500" : ""}>{ch.name}</span>
                            {ch.needsReview && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Needs Review</span>}
                            <span className="text-[11px] text-muted-foreground ml-auto">{ch.estimated_hours}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setImportStep("paste")} className="h-10 px-5 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Back</button>
                  <button onClick={handleImportSyllabus}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">Import Syllabus</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ADD SUBJECT MODAL ===== */}
      {showSubjectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowSubjectDialog(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Add Subject</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subject Name</label>
                <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  placeholder="e.g. Physics" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddSubject()} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#8b5cf6", "#06b6d4", "#f97316"].map((c) => (
                    <button key={c} onClick={() => setNewSubjectColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${newSubjectColor === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  {["high", "medium", "low"].map((p) => (
                    <button key={p} onClick={() => setNewSubjectPriority(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${newSubjectPriority === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowSubjectDialog(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleAddSubject} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD CHAPTER MODAL ===== */}
      {showChapterDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowChapterDialog(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">Add Chapter</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Subject</label>
                <select value={chapterSubjectId} onChange={(e) => setChapterSubjectId(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none">
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Chapter Name</label>
                <input type="text" value={newChapterName} onChange={(e) => setNewChapterName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Kinematics" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddChapter()} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Estimated Hours</label>
                <input type="number" value={newChapterHours} onChange={(e) => setNewChapterHours(Number(e.target.value))} min={1} max={100}
                  className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowChapterDialog(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleAddChapter} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PLAN SETTINGS MODAL ===== */}
      {showPlanSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowPlanSettings(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6">{yearPlan ? "Plan Settings" : "Create Year Plan"}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Start Date</label>
                  <input type="date" value={planStartDate} onChange={(e) => setPlanStartDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">End Date</label>
                  <input type="date" value={planEndDate} onChange={(e) => setPlanEndDate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Daily Study Hours</label>
                  <input type="number" value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} min={1} max={16}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Study Days / Week</label>
                  <input type="number" value={weeklyDays} onChange={(e) => setWeeklyDays(Number(e.target.value))} min={1} max={7}
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5 block">Buffer: {bufferPct}% ({capacity.bufferHours}h reserved)</label>
                <input type="range" value={bufferPct} onChange={(e) => setBufferPct(Number(e.target.value))} min={0} max={40} className="w-full" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowPlanSettings(false)} className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors">Cancel</button>
              <button onClick={handleCreatePlan}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">
                {yearPlan ? "Update Plan" : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
