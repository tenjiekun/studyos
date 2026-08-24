"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { Task, StudySession, PomodoroSettings } from "@/lib/types";
import { toast } from "sonner";

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

function rebuildHeatmap(sessions: StudySession[]) {
  const heatmap: Record<string, number> = {};
  sessions.forEach((s) => {
    const dayKey = s.start_time.slice(0, 10);
    heatmap[dayKey] = (heatmap[dayKey] || 0) + s.duration_minutes;
  });
  return heatmap;
}

const TAB_ID = Math.random().toString(36).slice(2, 10);

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
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // ===== LOCAL MODE =====
  useEffect(() => {
    if (!isLocal) return;
    const data = loadLocal();
    setState(data);
    setLoading(false);
  }, [isLocal]);

  // ===== SUPABASE MODE: Load data =====
  const loadSupabaseData = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const sb = getSupabase();
    if (!sb) return;

    try {
      const [tasksRes, sessionsRes, settingsRes] = await Promise.allSettled([
        sb.from("tasks").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        sb.from("study_sessions").select("*").eq("user_id", uid).order("start_time", { ascending: false }),
        sb.from("user_settings").select("*").eq("user_id", uid),
      ]);

      const tasksData = tasksRes.status === "fulfilled" ? tasksRes.value.data : null;
      const sessionsData = sessionsRes.status === "fulfilled" ? sessionsRes.value.data : null;
      const settingsData = settingsRes.status === "fulfilled" ? settingsRes.value.data : null;

      if (tasksRes.status === "rejected") console.error("Failed to load tasks:", tasksRes.reason);
      if (sessionsRes.status === "rejected") console.error("Failed to load sessions:", sessionsRes.reason);
      if (settingsRes.status === "rejected") console.error("Failed to load settings:", settingsRes.reason);

      const tasks: Task[] = (tasksData || []).map((t: any) => ({
        id: t.id, title: t.title, subject: t.subject, description: t.description || undefined,
        priority: t.priority as "low" | "medium" | "high", estimated_minutes: t.estimated_minutes,
        scheduled_date: t.scheduled_date, completed: t.completed,
        completed_at: t.completed_at || undefined, created_at: t.created_at,
      }));

      const sessions: StudySession[] = (sessionsData || []).map((s: any) => ({
        id: s.id, task_id: s.task_id || undefined, subject: s.subject || undefined,
        start_time: s.start_time, end_time: s.end_time || undefined,
        duration_minutes: s.duration_minutes, session_type: s.session_type as "focus" | "pomodoro",
      }));

      const heatmapData = rebuildHeatmap(sessions);

      const row = Array.isArray(settingsData) ? settingsData[0] : settingsData;
      const settings = row ? {
        theme: row.theme, daily_goal_minutes: row.daily_goal_minutes,
        pomodoro: {
          focus_duration: row.pomodoro_focus_duration, short_break_duration: row.pomodoro_short_break,
          long_break_duration: row.pomodoro_long_break, sessions_before_long_break: row.pomodoro_sessions_before_long,
        },
      } : defaultSettings;

      setState({ tasks, sessions, settings, heatmapData });
    } catch (err) {
      console.error("Failed to load Supabase data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConfigured && user) loadSupabaseData();
    if (isConfigured && !user) setLoading(false);
  }, [isConfigured, user, loadSupabaseData]);

  // ===== Real-time subscriptions + polling =====
  useEffect(() => {
    if (!isConfigured || !user) return;
    const sb = getSupabase();
    if (!sb) return;

    let mounted = true;

    const tasksChannelName = `tasks-${user.id}-${TAB_ID}`;
    const sessionsChannelName = `sessions-${user.id}-${TAB_ID}`;

    const tasksSub = sb
      .channel(tasksChannelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, () => {
        if (mounted) loadSupabaseData();
      })
      .subscribe((status) => console.log("📋 Tasks realtime:", status));

    const sessionsSub = sb
      .channel(sessionsChannelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${user.id}` }, () => {
        if (mounted) loadSupabaseData();
      })
      .subscribe((status) => console.log("⏱ Sessions realtime:", status));

    const pollInterval = setInterval(() => { if (mounted) loadSupabaseData(); }, 5000);
    const handleVisibility = () => { if (document.visibilityState === "visible" && mounted) loadSupabaseData(); };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      sb.removeChannel(tasksSub);
      sb.removeChannel(sessionsSub);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isConfigured, user, loadSupabaseData]);

  // ===== DATA MUTATIONS (using RPC to bypass RLS) =====

  const addTask = async (task: Omit<Task, "id" | "created_at">) => {
    if (isLocal) {
      const newTask: Task = { ...task, id: generateId(), created_at: new Date().toISOString() };
      const next = { ...state, tasks: [newTask, ...state.tasks] };
      setState(next); saveLocal(next);
      return;
    }

    // Optimistic update
    const optimisticId = generateId();
    const optimisticTask: Task = { ...task, id: optimisticId, created_at: new Date().toISOString() };
    setState((s) => ({ ...s, tasks: [optimisticTask, ...s.tasks] }));

    const sb = getSupabase();
    if (!sb || !user) return;

    // Try RPC first (bypasses RLS), fall back to direct insert
    const { data: rpcData, error: rpcError } = await sb.rpc("create_task", {
      p_title: task.title,
      p_subject: task.subject,
      p_description: task.description || null,
      p_priority: task.priority,
      p_estimated_minutes: task.estimated_minutes,
      p_scheduled_date: task.scheduled_date,
      p_completed: task.completed,
    });

    if (!rpcError && rpcData) {
      // RPC succeeded — replace optimistic with real data
      const real = rpcData as any;
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => t.id === optimisticId ? {
          id: real.id, title: real.title, subject: real.subject,
          description: real.description || undefined,
          priority: real.priority as "low" | "medium" | "high",
          estimated_minutes: real.estimated_minutes,
          scheduled_date: real.scheduled_date, completed: real.completed,
          completed_at: real.completed_at || undefined, created_at: real.created_at,
        } : t),
      }));
      return;
    }

    // RPC failed (function doesn't exist yet) — try direct insert
    console.warn("RPC failed, trying direct insert:", rpcError?.message);
    const { data, error } = await sb.from("tasks").insert({
      user_id: user.id, title: task.title, subject: task.subject,
      description: task.description || null, priority: task.priority,
      estimated_minutes: task.estimated_minutes, scheduled_date: task.scheduled_date,
      completed: task.completed,
    }).select().single();

    if (error) {
      console.error("Failed to add task:", error.message);
      setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== optimisticId) }));
      toast.error(`Failed to add task: ${error.message}`);
    } else if (data) {
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => t.id === optimisticId ? {
          id: data.id, title: data.title, subject: data.subject,
          description: data.description || undefined,
          priority: data.priority as "low" | "medium" | "high",
          estimated_minutes: data.estimated_minutes,
          scheduled_date: data.scheduled_date, completed: data.completed,
          completed_at: data.completed_at || undefined, created_at: data.created_at,
        } : t),
      }));
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const prevTasks = state.tasks;
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));

    if (isLocal) {
      saveLocal({ ...state, tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) });
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    // Try RPC first
    const { error: rpcError } = await sb.rpc("update_task", {
      p_id: id,
      p_title: updates.title ?? null,
      p_subject: updates.subject ?? null,
      p_description: updates.description ?? null,
      p_priority: updates.priority ?? null,
      p_estimated_minutes: updates.estimated_minutes ?? null,
      p_scheduled_date: updates.scheduled_date ?? null,
      p_completed: updates.completed ?? null,
      p_completed_at: updates.completed_at ?? null,
    });

    if (!rpcError) return;

    // Fallback to direct update
    const dbUpdates: { title?: string; subject?: string; description?: string | null; priority?: "low" | "medium" | "high"; estimated_minutes?: number; scheduled_date?: string; completed?: boolean; completed_at?: string | null } = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.estimated_minutes !== undefined) dbUpdates.estimated_minutes = updates.estimated_minutes;
    if (updates.scheduled_date !== undefined) dbUpdates.scheduled_date = updates.scheduled_date;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at || null;

    const { error } = await sb.from("tasks").update(dbUpdates).eq("id", id);
    if (error) {
      setState((s) => ({ ...s, tasks: prevTasks }));
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (id: string) => {
    const prevTasks = state.tasks;
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));

    if (isLocal) {
      saveLocal({ ...state, tasks: state.tasks.filter((t) => t.id !== id) });
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    // Try RPC first
    const { error: rpcError } = await sb.rpc("delete_task", { p_id: id });
    if (!rpcError) return;

    // Fallback
    const { error } = await sb.from("tasks").delete().eq("id", id);
    if (error) {
      setState((s) => ({ ...s, tasks: prevTasks }));
      toast.error("Failed to delete task");
    }
  };

  const toggleTask = async (id: string) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    const wasCompleted = task.completed;
    const optimisticTasks = state.tasks.map((t) =>
      t.id === id ? { ...t, completed: !wasCompleted, completed_at: !wasCompleted ? new Date().toISOString() : undefined } : t
    );
    setState((s) => ({ ...s, tasks: optimisticTasks }));

    if (isLocal) {
      saveLocal({ ...state, tasks: optimisticTasks });
      return;
    }

    const sb = getSupabase();
    if (!sb) return;

    // Try RPC first
    const { error: rpcError } = await sb.rpc("toggle_task", { p_id: id });
    if (!rpcError) return;

    // Fallback
    const { error } = await sb.from("tasks").update({
      completed: !wasCompleted,
      completed_at: !wasCompleted ? new Date().toISOString() : null,
    }).eq("id", id);
    if (error) {
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, completed: wasCompleted, completed_at: wasCompleted ? task.completed_at : undefined } : t
        ),
      }));
      toast.error("Failed to toggle task");
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

    const sessions = [newSession, ...state.sessions];
    const heatmapData = rebuildHeatmap(sessions);
    setState((s) => ({ ...s, sessions, heatmapData }));

    const sb = getSupabase();
    if (!sb || !user) return;

    // Try RPC first
    const { data: rpcData, error: rpcError } = await sb.rpc("create_session", {
      p_task_id: session.task_id || null,
      p_subject: session.subject || null,
      p_start_time: session.start_time,
      p_end_time: session.end_time || null,
      p_duration_minutes: session.duration_minutes,
      p_session_type: session.session_type,
    });

    if (!rpcError && rpcData) {
      const real = rpcData as any;
      setState((s) => ({ ...s, sessions: s.sessions.map((sr) => sr.id === newSession.id ? { ...sr, id: real.id } : sr) }));
      toast.success(`Session recorded: ${session.duration_minutes} min of ${session.subject || "study"}`);
      return;
    }

    // Fallback
    const { data, error } = await sb.from("study_sessions").insert({
      user_id: user.id, task_id: session.task_id || null, subject: session.subject || null,
      start_time: session.start_time, end_time: session.end_time || null,
      duration_minutes: session.duration_minutes, session_type: session.session_type,
    }).select().single();

    if (error) {
      console.error("Failed to add session:", error.message);
      setState((s) => ({
        ...s,
        sessions: s.sessions.filter((sr) => sr.id !== newSession.id),
        heatmapData: rebuildHeatmap(sessions.filter((sr) => sr.id !== newSession.id)),
      }));
      toast.error(`Failed to record session: ${error.message}`);
    } else if (data) {
      setState((s) => ({ ...s, sessions: s.sessions.map((sr) => sr.id === newSession.id ? { ...sr, id: data.id } : sr) }));
      toast.success(`Session recorded: ${session.duration_minutes} min of ${session.subject || "study"}`);
    }
  };

  const updateSettings = async (updates: Partial<typeof state.settings>) => {
    if (isLocal) {
      const next = { ...state, settings: { ...state.settings, ...updates } };
      setState(next); saveLocal(next);
      return;
    }
    setState((s) => ({ ...s, settings: { ...s.settings, ...updates } }));

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
    const { error } = await sb.from("user_settings").upsert({ user_id: user.id, ...dbUpdates }, { onConflict: "user_id" });
    if (error) toast.error("Failed to save settings");
  };

  return {
    ...state, loading,
    addTask, updateTask, deleteTask, toggleTask, addSession, updateSettings,
    refresh: isConfigured ? loadSupabaseData : () => {},
  };
}
