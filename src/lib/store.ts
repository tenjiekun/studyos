import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Task,
  StudySession,
  UserSettings,
  DEFAULT_SETTINGS,
} from "./types";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface AppState {
  tasks: Task[];
  sessions: StudySession[];
  settings: UserSettings;
  heatmapData: Record<string, number>;

  // Timer state (persisted)
  activeTimer: {
    isRunning: boolean;
    isPaused: boolean;
    secondsElapsed: number;
    mode: "focus" | "break" | "long_break";
    subject?: string;
    task_id?: string;
    session_start?: string;
    pomodoro_session: number;
  } | null;

  // Task actions
  addTask: (task: Omit<Task, "id" | "created_at">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;

  // Session actions
  addSession: (session: Omit<StudySession, "id">) => void;

  // Settings actions
  updateSettings: (settings: Partial<UserSettings>) => void;

  // Timer actions
  setTimer: (timer: AppState["activeTimer"]) => void;
  resetTimer: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      sessions: [],
      settings: DEFAULT_SETTINGS,
      heatmapData: {},
      activeTimer: null,

      addTask: (task) =>
        set((state) => ({
          tasks: [{ ...task, id: generateId(), created_at: new Date().toISOString() }, ...state.tasks],
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : undefined }
              : t
          ),
        })),

      addSession: (session) =>
        set((state) => {
          const newSession = { ...session, id: generateId() };
          const newHeatmap = { ...state.heatmapData };
          const dayKey = new Date(session.start_time).toISOString().slice(0, 10);
          newHeatmap[dayKey] = (newHeatmap[dayKey] || 0) + session.duration_minutes;
          return {
            sessions: [newSession, ...state.sessions],
            heatmapData: newHeatmap,
          };
        }),

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      setTimer: (timer) => set({ activeTimer: timer }),
      resetTimer: () => set({ activeTimer: null }),
    }),
    {
      name: "study-os-storage",
      partialize: (state) => ({
        tasks: state.tasks,
        sessions: state.sessions,
        settings: state.settings,
        heatmapData: state.heatmapData,
        activeTimer: state.activeTimer,
      }),
    }
  )
);
