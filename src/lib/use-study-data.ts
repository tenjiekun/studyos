"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Task, StudySession, PomodoroSettings } from "@/lib/types";
import { Database } from "@/lib/supabase/database.types";
import { toast } from "sonner";

// ===== Local Storage Helpers (fallback mode) =====
const STORAGE_KEY = "study-os-data";

interface LocalData {
  tasks: Task[];
  sessions: StudySession[];
  settings: {
    theme: "light" | "dark" | "system";
    daily_goal_minutes: number;
    pomodoro: PomodoroSettings;
  };
  heatmapData: Record<string, number>;
}

const defaultSettings = {
  theme: "system" as const,
  daily_goal_minutes: 360,
  pomodoro: {
    focus_duration: 25,
    short_break_duration: 5,
    long_break_duration: 15,
    sessions_before_long_break: 4,
  },
};

function loadLocal(): LocalData {
  if (typeof window === "undefined") {
    return { tasks: [], sessions: [], settings: defaultSettings, heatmapData: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tasks: [], sessions: [], settings: defaultSettings, heatmapData: {} };
}

function saveLocal(data: LocalData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ===== Hook =====
export function useStudyData() {
  const { user, isConfigured } = useAuth();
  const [state, setState] = useState<LocalData>({
    tasks: [],
    sessions: [],
    settings: defaultSettings,
    heatmapData: {},
  });
  const [loading, setLoading] = useState(true);

  const isLocal = !isConfigured;

  // ===== LOCAL MODE =====
  useEffect(() => {
    if (!isLocal) return;
    const data = loadLocal();
    setState(data);
    setLoading(false);
  }, [isLocal]);

  // ===== SUPABASE MODE =====
  const loadSupabaseData = useCallback(async () => {
    if (!user || !isConfigured) return;
    const sb = getSupabase();
    if (!sb) return;

    const [tasksRes, sessionsRes, settingsRes] = await Promise.all([
      sb.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      sb.from("study_sessions").select("*").eq("user_id", user.id).order("start_time", { ascending: false }),
      sb.from("user_settings").select("*").eq("user_id", user.id).single(),
    ]);

    const tasks: Task[] = (tasksRes.data || []).map((t) => ({
      id: t.id, title: t.title, subject: t.subject, description: t.description || undefined,
      priority: t.priority as "low" | "medium" | "high", estimated_minutes: t.estimated_minutes,
      scheduled_date: t.scheduled_date, completed: t.completed,
      completed_at: t.completed_at || undefined, created_at: t.created_at,
    }));

    const sessions: StudySession[] = (sessionsRes.data || []).map((s) => ({
      id: s.id, task_id: s.task_id || undefined, subject: s.subject || undefined,
      start_time: s.start_time, end_time: s.end_time || undefined,
      duration_minutes: s.duration_minutes, session_type: s.session_type as "focus" | "pomodoro",
    }));

    const heatmapData: Record<string, number> = {};
    (sessionsRes.data || []).forEach((s) => {
      const dayKey = s.start_time.slice(0, 10);
      heatmapData[dayKey] = (heatmapData[dayKey] || 0) + s.duration_minutes;
    });

    const row = settingsRes.data as Database["public"]["Tables"]["user_settings"]["Row"] | null;
    const settings = row ? {
      theme: row.theme, daily_goal_minutes: row.daily_goal_minutes,
      pomodoro: {
        focus_duration: row.pomodoro_focus_duration, short_break_duration: row.pomodoro_short_break,
        long_break_duration: row.pomodoro_long_break, sessions_before_long_break: row.pomodoro_sessions_before_long,
      },
    } : defaultSettings;

    setState({ tasks, sessions, settings, heatmapData });
    setLoading(false);
  }, [user?.id, isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isConfigured && user) loadSupabaseData();
    if (isConfigured && !user) setLoading(false);
  }, [isConfigured, user, loadSupabaseData]);

  // Real-time subscriptions (Supabase only)
  useEffect(() => {
    if (!isConfigured || !user) return;
    const sb = getSupabase();
    if (!sb) return;

    const tasksSub = sb.channel("tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, () => loadSupabaseData())
      .subscribe();

    const sessionsSub = sb.channel("sessions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${user.id}` }, () => loadSupabaseData())
      .subscribe();

    return () => { sb.removeChannel(tasksSub); sb.removeChannel(sessionsSub); };
  }, [isConfigured, user, loadSupabaseData]);

  // ===== DATA MUTATIONS =====

  // Build heatmap from sessions
  function rebuildHeatmap(sessions: StudySession[]) {
    const heatmap: Record<string, number> = {};
    sessions.forEach((s) => {
      const dayKey = s.start_time.slice(0, 10);
      heatmap[dayKey] = (heatmap[dayKey] || 0) + s.duration_minutes;
    });
    return heatmap;
  }

  const addTask = async (task: Omit<Task, "id" | "created_at">) => {
    if (isLocal) {
      const newTask: Task = { ...task, id: generateId(), created_at: new Date().toISOString() };
      const next = { ...state, tasks: [newTask, ...state.tasks] };
      setState(next); saveLocal(next);
      return;
    }
    // Supabase
    const sb = getSupabase();
    if (!sb || !user) return;
    await sb.from("tasks").insert({
      user_id: user.id, title: task.title, subject: task.subject,
      description: task.description || null, priority: task.priority,
      estimated_minutes: task.estimated_minutes, scheduled_date: task.scheduled_date,
      completed: task.completed,
    });
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (isLocal) {
      const next = { ...state, tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) };
      setState(next); saveLocal(next);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const dbUpdates: Database["public"]["Tables"]["tasks"]["Update"] = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.estimated_minutes !== undefined) dbUpdates.estimated_minutes = updates.estimated_minutes;
    if (updates.scheduled_date !== undefined) dbUpdates.scheduled_date = updates.scheduled_date;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at || null;
    await sb.from("tasks").update(dbUpdates).eq("id", id);
  };

  const deleteTask = async (id: string) => {
    if (isLocal) {
      const next = { ...state, tasks: state.tasks.filter((t) => t.id !== id) };
      setState(next); saveLocal(next);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    await sb.from("tasks").delete().eq("id", id);
  };

  const toggleTask = async (id: string) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    // Optimistic update — immediately flip the UI
    const wasCompleted = task.completed;
    const optimisticTasks = state.tasks.map((t) =>
      t.id === id
        ? { ...t, completed: !wasCompleted, completed_at: !wasCompleted ? new Date().toISOString() : undefined }
        : t
    );
    setState((s) => ({ ...s, tasks: optimisticTasks }));
    if (isLocal) {
      saveLocal({ ...state, tasks: optimisticTasks });
      return;
    }
    // Server update — revert on failure
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from("tasks")
      .update({
        completed: !wasCompleted,
        completed_at: !wasCompleted ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      // Rollback
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, completed: wasCompleted, completed_at: wasCompleted ? task.completed_at : undefined }
            : t
        ),
      }));
    }
  };

  const addSession = async (session: Omit<StudySession, "id">) => {
    const newSession: StudySession = { ...session, id: generateId() };
    if (isLocal) {
      const sessions = [newSession, ...state.sessions];
      const heatmapData = rebuildHeatmap(sessions);
      const next = { ...state, sessions, heatmapData };
      setState(next); saveLocal(next);
      toast.success(`Session recorded: ${session.duration_minutes} min of ${session.subject || "study"}`);
      return;
    }
    const sb = getSupabase();
    if (!sb || !user) return;
    const { error } = await sb.from("study_sessions").insert({
      user_id: user.id, task_id: session.task_id || null, subject: session.subject || null,
      start_time: session.start_time, end_time: session.end_time || null,
      duration_minutes: session.duration_minutes, session_type: session.session_type,
    });
    if (!error) {
      toast.success(`Session recorded: ${session.duration_minutes} min of ${session.subject || "study"}`);
    }
  };

  const updateSettings = async (updates: Partial<typeof state.settings>) => {
    if (isLocal) {
      const next = { ...state, settings: { ...state.settings, ...updates } };
      setState(next); saveLocal(next);
      return;
    }
    const sb = getSupabase();
    if (!sb || !user) return;
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
    if (updates.daily_goal_minutes !== undefined) dbUpdates.daily_goal_minutes = updates.daily_goal_minutes;
    if (updates.pomodoro) {
      dbUpdates.pomodoro_focus_duration = updates.pomodoro.focus_duration;
      dbUpdates.pomodoro_short_break = updates.pomodoro.short_break_duration;
      dbUpdates.pomodoro_long_break = updates.pomodoro.long_break_duration;
      dbUpdates.pomodoro_sessions_before_long = updates.pomodoro.sessions_before_long_break;
    }
    await sb.from("user_settings").upsert({ user_id: user.id, ...dbUpdates }, { onConflict: "user_id" });
    setState((s) => ({ ...s, settings: { ...s.settings, ...updates } }));
  };

  return {
    ...state,
    loading,
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    addSession,
    updateSettings,
    refresh: isConfigured ? loadSupabaseData : () => {},
  };
}
