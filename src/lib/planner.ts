"use client";

import { getSupabase } from "@/lib/supabase/client";
import {
  YearPlan, PlanGoal, SyllabusItem, ScheduledBlock, Test, TestSubjectResult,
  FreeTimeLog, DailySchedule, MonthlyPlan,
} from "@/lib/types";

const TABLES = {
  yearPlans: "year_plans",
  goals: "plan_goals",
  syllabus: "syllabus_items",
  blocks: "scheduled_blocks",
  tests: "tests",
  testResults: "test_subject_results",
  freeTime: "free_time_logs",
  dailySchedules: "daily_schedules",
  monthlyPlans: "monthly_plans",
} as const;

// ===== Year Plans =====
export async function fetchYearPlans(userId: string): Promise<YearPlan[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLES.yearPlans).select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data || []) as YearPlan[];
}

export async function createYearPlan(userId: string, title: string, academicYear: string): Promise<YearPlan | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.yearPlans).insert({ user_id: userId, title, academic_year: academicYear }).select().single();
  return data as YearPlan | null;
}

// ===== Goals =====
export async function fetchGoals(userId: string, period?: string, periodDate?: string): Promise<PlanGoal[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(TABLES.goals).select("*").eq("user_id", userId);
  if (period) query = query.eq("period", period);
  if (periodDate) query = query.eq("period_date", periodDate);
  const { data } = await query.order("created_at", { ascending: false });
  return (data || []) as PlanGoal[];
}

export async function createGoal(goal: Omit<PlanGoal, "id" | "created_at" | "updated_at">): Promise<PlanGoal | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.goals).insert(goal).select().single();
  return data as PlanGoal | null;
}

export async function updateGoal(id: string, updates: Partial<PlanGoal>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.goals).update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteGoal(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.goals).delete().eq("id", id);
}

// ===== Syllabus =====
export async function fetchSyllabus(userId: string, subject?: string): Promise<SyllabusItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(TABLES.syllabus).select("*").eq("user_id", userId);
  if (subject) query = query.eq("subject", subject);
  const { data } = await query.order("created_at", { ascending: false });
  return (data || []) as SyllabusItem[];
}

export async function createSyllabusItem(item: Omit<SyllabusItem, "id" | "created_at" | "updated_at">): Promise<SyllabusItem | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.syllabus).insert(item).select().single();
  return data as SyllabusItem | null;
}

export async function updateSyllabusItem(id: string, updates: Partial<SyllabusItem>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.syllabus).update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
}

// ===== Scheduled Blocks =====
export async function fetchBlocks(userId: string, startDate: string, endDate: string): Promise<ScheduledBlock[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLES.blocks).select("*")
    .eq("user_id", userId)
    .gte("start_time", startDate)
    .lte("end_time", endDate)
    .order("start_time", { ascending: true });
  return (data || []) as ScheduledBlock[];
}

export async function createBlock(block: Omit<ScheduledBlock, "id" | "created_at" | "updated_at">): Promise<ScheduledBlock | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.blocks).insert(block).select().single();
  return data as ScheduledBlock | null;
}

export async function updateBlock(id: string, updates: Partial<ScheduledBlock>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.blocks).update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteBlock(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.blocks).delete().eq("id", id);
}

// ===== Tests =====
export async function fetchTests(userId: string, type?: string, startDate?: string, endDate?: string): Promise<Test[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(TABLES.tests).select("*").eq("user_id", userId);
  if (type) query = query.eq("type", type);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);
  const { data } = await query.order("date", { ascending: false });
  return (data || []) as Test[];
}

export async function createTest(test: Omit<Test, "id" | "created_at" | "updated_at" | "percentage">): Promise<Test | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.tests).insert(test).select().single();
  return data as Test | null;
}

export async function updateTest(id: string, updates: Partial<Test>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.tests).update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteTest(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from(TABLES.tests).delete().eq("id", id);
}

export async function fetchTestResults(testId: string): Promise<TestSubjectResult[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLES.testResults).select("*").eq("test_id", testId);
  return (data || []) as TestSubjectResult[];
}

export async function upsertTestResults(results: Omit<TestSubjectResult, "id" | "created_at">[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || results.length === 0) return;
  await sb.from(TABLES.testResults).upsert(results, { onConflict: "id" });
}

// ===== Free Time Logs =====
export async function fetchFreeTimeLogs(userId: string, startDate: string, endDate: string): Promise<FreeTimeLog[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLES.freeTime).select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  return (data || []) as FreeTimeLog[];
}

export async function createFreeTimeLog(log: Omit<FreeTimeLog, "id" | "created_at">): Promise<FreeTimeLog | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.freeTime).insert(log).select().single();
  return data as FreeTimeLog | null;
}

// ===== Daily Schedules =====
export async function fetchDailySchedules(userId: string): Promise<DailySchedule[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from(TABLES.dailySchedules).select("*").eq("user_id", userId).order("day_of_week");
  return (data || []) as DailySchedule[];
}

export async function upsertDailySchedule(schedule: Omit<DailySchedule, "id" | "created_at" | "updated_at">): Promise<DailySchedule | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.dailySchedules)
    .upsert({ ...schedule, updated_at: new Date().toISOString() }, { onConflict: "user_id,day_of_week" })
    .select().single();
  return data as DailySchedule | null;
}

// ===== Monthly Plans =====
export async function fetchMonthlyPlans(userId: string, yearId?: string): Promise<MonthlyPlan[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(TABLES.monthlyPlans).select("*").eq("user_id", userId);
  if (yearId) query = query.eq("year", yearId);
  const { data } = await query.order("month", { ascending: false });
  return (data || []) as MonthlyPlan[];
}

export async function createMonthlyPlan(plan: Omit<MonthlyPlan, "id" | "created_at" | "updated_at">): Promise<MonthlyPlan | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from(TABLES.monthlyPlans).insert(plan).select().single();
  return data as MonthlyPlan | null;
}

// ===== Analytics Helpers =====

/** Calculate productivity score for a day */
export function calculateDailyProductivity(params: {
  plannedMinutes: number;
  actualMinutes: number;
  tasksCompleted: number;
  tasksPlanned: number;
  testScore: number | null;
}): number {
  const execution = params.plannedMinutes > 0 ? (Math.min(params.actualMinutes / params.plannedMinutes, 1) * 40) : 0;
  const taskComp = params.tasksPlanned > 0 ? (params.tasksCompleted / params.tasksPlanned * 25) : 0;
  const consistency = params.actualMinutes > 0 ? 15 : 0;
  const testPerf = params.testScore !== null ? (params.testScore / 100 * 20) : 0;
  return Math.round(execution + taskComp + consistency + testPerf);
}

/** Calculate weekly summary */
export function calculateWeeklySummary(params: {
  plannedMinutes: number;
  actualMinutes: number;
  tasksCompleted: number;
  tasksPlanned: number;
  activeDays: number;
  testScores: number[];
  mockScores: number[];
}) {
  const planCompletion = params.plannedMinutes > 0 ? Math.round((params.actualMinutes / params.plannedMinutes) * 100) : 0;
  const taskCompletion = params.tasksPlanned > 0 ? Math.round((params.tasksCompleted / params.tasksPlanned) * 100) : 0;
  const avgTest = params.testScores.length > 0 ? Math.round(params.testScores.reduce((a, b) => a + b, 0) / params.testScores.length) : null;
  const avgMock = params.mockScores.length > 0 ? Math.round(params.mockScores.reduce((a, b) => a + b, 0) / params.mockScores.length) : null;

  return {
    planCompletion,
    taskCompletion,
    activeDays: params.activeDays,
    avgTestScore: avgTest,
    avgMockScore: avgMock,
    productivity: calculateDailyProductivity({
      plannedMinutes: params.plannedMinutes,
      actualMinutes: params.actualMinutes,
      tasksCompleted: params.tasksCompleted,
      tasksPlanned: params.tasksPlanned,
      testScore: avgTest,
    }),
  };
}

/** Calculate syllabus progress */
export function calculateSyllabusProgress(items: SyllabusItem[]) {
  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const needsRevision = items.filter((i) => i.status === "needs_revision").length;

  return {
    total,
    completed,
    inProgress,
    needsRevision,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/** Calculate test performance by subject */
export function calculateSubjectPerformance(tests: Test[]) {
  const subjectMap: Record<string, { scores: number[]; total: number; count: number }> = {};

  tests.forEach((t) => {
    if (t.actual_marks != null && t.max_marks > 0) {
      const pct = (t.actual_marks / t.max_marks) * 100;
      t.subjects.forEach((s) => {
        if (!subjectMap[s]) subjectMap[s] = { scores: [], total: 0, count: 0 };
        subjectMap[s].scores.push(pct);
        subjectMap[s].total += pct;
        subjectMap[s].count++;
      });
    }
  });

  return Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    avgScore: Math.round(data.total / data.count),
    bestScore: Math.round(Math.max(...data.scores)),
    worstScore: Math.round(Math.min(...data.scores)),
    testCount: data.count,
    scores: data.scores,
  }));
}
