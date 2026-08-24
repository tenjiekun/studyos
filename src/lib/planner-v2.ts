"use client";

import { getSupabase } from "@/lib/supabase/client";

// =====================================================
// PLANNER V2: Year → Month → Week → Day Engine
// =====================================================

// ===== SUBJECTS =====
export async function fetchSubjects(userId: string) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from("subjects").select("*").eq("user_id", userId).order("created_at");
    return data || [];
  } catch { return []; }
}

export async function createSubject(userId: string, name: string, color: string = "#6366f1", priority: string = "medium") {
  try {
    const sb = getSupabase();
    if (!sb) { console.error("[PlannerV2] No Supabase client"); return null; }
    console.log("[PlannerV2] Creating subject:", { userId, name, color, priority });
    const { data, error } = await sb.from("subjects").insert({ user_id: userId, name, color, priority }).select().single();
    if (error) { console.error("[PlannerV2] Subject insert error:", error.message, error.code, error.details); return null; }
    console.log("[PlannerV2] Subject created:", data);
    return data;
  } catch (e) { console.error("[PlannerV2] Subject create exception:", e); return null; }
}

export async function updateSubject(id: string, updates: Record<string, unknown>) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("subjects").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  } catch { /* silent */ }
}

export async function deleteSubject(id: string) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("subjects").delete().eq("id", id);
  } catch { /* silent */ }
}

// ===== SYLLABUS CHAPTERS =====
export async function fetchChapters(userId: string, subjectId?: string) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    let query = sb.from("syllabus_chapters").select("*, subjects!inner(id,name,color)").eq("user_id", userId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data } = await query.order("sort_order");
    return data || [];
  } catch { return []; }
}

export async function createChapter(chapter: {
  user_id: string;
  subject_id: string;
  name: string;
  topics?: string[];
  priority?: string;
  estimated_hours?: number;
  target_date?: string;
  sort_order?: number;
}) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("syllabus_chapters").insert(chapter).select().single();
    return data;
  } catch { return null; }
}

export async function updateChapter(id: string, updates: Record<string, unknown>) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("syllabus_chapters").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  } catch { /* silent */ }
}

export async function deleteChapter(id: string) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("syllabus_chapters").delete().eq("id", id);
  } catch { /* silent */ }
}

export async function bulkCreateChapters(chapters: Array<{
  user_id: string;
  subject_id: string;
  name: string;
  topics?: string[];
  estimated_hours?: number;
  sort_order?: number;
}>) {
  try {
    const sb = getSupabase();
    if (!sb || chapters.length === 0) return [];
    const { data } = await sb.from("syllabus_chapters").insert(chapters).select();
    return data || [];
  } catch { return []; }
}

// ===== YEAR PLAN =====
export async function fetchYearPlan(userId: string) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("year_plans").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data;
  } catch { return null; }
}

export async function createYearPlan(plan: {
  user_id: string;
  title: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  daily_study_hours?: number;
  weekly_study_days?: number;
  buffer_pct?: number;
}) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    // Deactivate any existing active plans
    await sb.from("year_plans").update({ status: "archived" }).eq("user_id", plan.user_id).eq("status", "active");
    const { data } = await sb.from("year_plans").insert({ ...plan, status: "active" }).select().single();
    return data;
  } catch { return null; }
}

export async function updateYearPlan(id: string, updates: Record<string, unknown>) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("year_plans").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  } catch { /* silent */ }
}

// ===== PLAN DISTRIBUTIONS =====
export async function fetchDistributions(yearPlanId: string) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from("plan_distributions").select("*, subjects(id,name,color)").eq("year_plan_id", yearPlanId).order("month");
    return data || [];
  } catch { return []; }
}

export async function upsertDistributions(distributions: Array<{
  user_id: string;
  year_plan_id: string;
  subject_id: string;
  month: string;
  planned_hours: number;
  planned_chapters: number;
}>) {
  try {
    const sb = getSupabase();
    if (!sb || distributions.length === 0) return;
    await sb.from("plan_distributions").upsert(distributions, { onConflict: "year_plan_id,subject_id,month" });
  } catch { /* silent */ }
}

// ===== CHAPTER ASSIGNMENTS =====
export async function fetchAssignments(userId: string, month?: string) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    let query = sb.from("chapter_assignments").select("*, syllabus_chapters(id,name,subject_id,estimated_hours), subjects(id,name,color)").eq("user_id", userId);
    if (month) query = query.eq("assigned_month", month);
    const { data } = await query.order("sort_order");
    return data || [];
  } catch { return []; }
}

export async function upsertAssignments(assignments: Array<{
  user_id: string;
  chapter_id: string;
  year_plan_id: string;
  assigned_month: string;
  assigned_week?: string;
  assigned_date?: string;
  sort_order?: number;
}>) {
  try {
    const sb = getSupabase();
    if (!sb || assignments.length === 0) return;
    await sb.from("chapter_assignments").upsert(assignments, { onConflict: "user_id,chapter_id" });
  } catch { /* silent */ }
}

// ===== WEEKLY PLANS =====
export async function fetchWeeklyPlans(userId: string, startDate?: string, endDate?: string) {
  try {
    const sb = getSupabase();
    if (!sb) return [];
    let query = sb.from("weekly_plans").select("*").eq("user_id", userId);
    if (startDate) query = query.gte("week_start", startDate);
    if (endDate) query = query.lte("week_end", endDate);
    const { data } = await query.order("week_start");
    return data || [];
  } catch { return []; }
}

export async function upsertWeeklyPlan(plan: {
  user_id: string;
  week_start: string;
  week_end: string;
  planned_hours?: number;
  planned_chapters?: number;
  status?: string;
}) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("weekly_plans").upsert(plan, { onConflict: "user_id,week_start" }).select().single();
    return data;
  } catch { return null; }
}

// ===== DAILY PLANS =====
export async function fetchDailyPlan(userId: string, date: string) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("daily_plans").select("*, daily_plan_blocks(*, subjects(id,name,color), syllabus_chapters(id,name))").eq("user_id", userId).eq("date", date).maybeSingle();
    return data;
  } catch { return null; }
}

export async function upsertDailyPlan(plan: {
  user_id: string;
  date: string;
  planned_hours?: number;
  status?: string;
}) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("daily_plans").upsert(plan, { onConflict: "user_id,date" }).select().single();
    return data;
  } catch { return null; }
}

export async function createDailyBlock(block: {
  user_id: string;
  daily_plan_id: string;
  chapter_id?: string;
  subject_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  type?: string;
  sort_order?: number;
}) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("daily_plan_blocks").insert(block).select().single();
    return data;
  } catch { return null; }
}

// ===== REPLAN =====
export async function logReplan(log: {
  user_id: string;
  year_plan_id: string;
  reason?: string;
  chapters_behind?: number;
  hours_behind?: number;
  changes_made?: unknown[];
}) {
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.from("replan_logs").insert(log).select().single();
    return data;
  } catch { return null; }
}

// =====================================================
// PLANNING ENGINE
// =====================================================

/** Calculate total available study hours for the year */
export function calculateAvailableHours(params: {
  startDate: string;
  endDate: string;
  dailyStudyHours: number;
  weeklyStudyDays: number;
  bufferPct: number;
}) {
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const totalWeeks = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const totalStudyDays = totalWeeks * params.weeklyStudyDays;
  const totalHours = totalStudyDays * params.dailyStudyHours;
  const bufferHours = totalHours * (params.bufferPct / 100);
  return {
    totalWeeks,
    totalStudyDays,
    totalHours: Math.round(totalHours),
    bufferHours: Math.round(bufferHours),
    availableHours: Math.round(totalHours - bufferHours),
  };
}

/** Get all months in the plan range */
export function getPlanMonths(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const current = new Date(startDate + "-01");
  const end = new Date(endDate);
  while (current <= end) {
    months.push(current.toISOString().slice(0, 7));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

/** Distribute chapters across months based on priority and estimated hours */
export function distributeChapters(params: {
  chapters: Array<{ id: string; subject_id: string; estimated_hours: number; priority: string }>;
  subjects: Array<{ id: string; allocation_pct: number }>;
  months: string[];
  totalAvailableHours: number;
}) {
  const { chapters, subjects, months, totalAvailableHours } = params;
  const distributions: Array<{
    subject_id: string;
    month: string;
    planned_hours: number;
    planned_chapters: number;
  }> = [];

  // Calculate hours per subject based on allocation percentages
  const subjectHours: Record<string, number> = {};
  const totalPct = subjects.reduce((a, s) => a + s.allocation_pct, 0) || 100;
  subjects.forEach((s) => {
    subjectHours[s.id] = totalAvailableHours * (s.allocation_pct / totalPct);
  });

  // For each subject, distribute chapters across months
  subjects.forEach((subject) => {
    const subjectChapters = chapters
      .filter((c) => c.subject_id === subject.id)
      .sort((a, b) => {
        // Priority order: high > medium > low
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      });

    const totalChapterHours = subjectChapters.reduce((a, c) => a + c.estimated_hours, 0);
    const hoursPerMonth = subjectHours[subject.id] / months.length;

    let remainingHours = subjectHours[subject.id];
    let chapterIdx = 0;

    months.forEach((month) => {
      const monthHours = Math.min(hoursPerMonth, remainingHours);
      let monthChapters = 0;
      let monthUsedHours = 0;

      // Assign chapters that fit in this month
      while (chapterIdx < subjectChapters.length) {
        const chapter = subjectChapters[chapterIdx];
        if (monthUsedHours + chapter.estimated_hours <= monthHours + 1) {
          monthChapters++;
          monthUsedHours += chapter.estimated_hours;
          chapterIdx++;
        } else {
          break;
        }
      }

      distributions.push({
        subject_id: subject.id,
        month,
        planned_hours: Math.round(monthHours),
        planned_chapters: monthChapters,
      });

      remainingHours -= monthHours;
    });
  });

  return distributions;
}

/** Calculate syllabus progress for a user */
export function calculateSyllabusStats(chapters: Array<{ status: string; estimated_hours: number; actual_hours: number }>) {
  const total = chapters.length;
  const completed = chapters.filter((c) => c.status === "completed").length;
  const inProgress = chapters.filter((c) => c.status === "in_progress").length;
  const plannedHours = chapters.reduce((a, c) => a + c.estimated_hours, 0);
  const actualHours = chapters.reduce((a, c) => a + c.actual_hours, 0);

  return {
    total,
    completed,
    inProgress,
    notStarted: chapters.filter((c) => c.status === "not_started").length,
    revising: chapters.filter((c) => c.status === "revising").length,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    plannedHours: Math.round(plannedHours),
    actualHours: Math.round(actualHours),
  };
}

/** Check plan feasibility */
export function checkPlanFeasibility(params: {
  totalRequiredHours: number;
  totalAvailableHours: number;
}) {
  const gap = params.totalRequiredHours - params.totalAvailableHours;
  const fits = gap <= 0;
  const utilization = params.totalAvailableHours > 0
    ? Math.round((params.totalRequiredHours / params.totalAvailableHours) * 100)
    : 0;

  return {
    fits,
    gap: Math.max(0, gap),
    surplus: Math.max(0, -gap),
    utilization,
    recommendations: !fits ? [
      "Increase daily study hours",
      "Add more study days per week",
      "Extend the plan end date",
      "Lower some subject priorities",
      "Mark some chapters as optional",
      "Reduce buffer percentage",
    ] : [],
  };
}

/** Get plan status for a month */
export function getMonthStatus(params: {
  plannedHours: number;
  actualHours: number;
  plannedChapters: number;
  actualChapters: number;
}) {
  const hourRatio = params.plannedHours > 0 ? params.actualHours / params.plannedHours : 0;
  const chapterRatio = params.plannedChapters > 0 ? params.actualChapters / params.plannedChapters : 0;
  const avg = (hourRatio + chapterRatio) / 2;

  if (avg >= 0.95) return "on_track";
  if (avg >= 0.8) return "slightly_behind";
  if (avg >= 0.6) return "behind";
  return "significantly_behind";
}

/** Generate weekly plan from month assignments */
export function generateWeeklyPlan(params: {
  month: string;
  assignments: Array<{ estimated_hours: number }>;
}) {
  const monthStart = new Date(params.month + "-01");
  const weeksInMonth: Array<{ start: string; end: string; hours: number }> = [];

  // Get all weeks in this month
  const current = new Date(monthStart);
  // Move to Monday
  while (current.getDay() !== 1) current.setDate(current.getDate() - 1);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0); // last day of month

  while (current <= monthEnd) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeksInMonth.push({
      start: current.toISOString().slice(0, 10),
      end: new Date(Math.min(weekEnd.getTime(), monthEnd.getTime())).toISOString().slice(0, 10),
      hours: 0,
    });
    current.setDate(current.getDate() + 7);
  }

  // Distribute hours evenly across weeks
  const totalHours = params.assignments.reduce((a, c) => a + c.estimated_hours, 0);
  const hoursPerWeek = weeksInMonth.length > 0 ? totalHours / weeksInMonth.length : 0;
  weeksInMonth.forEach((w) => { w.hours = Math.round(hoursPerWeek); });

  return weeksInMonth;
}
