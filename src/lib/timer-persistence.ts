/**
 * Timer persistence using timestamps.
 * State is stored in localStorage with start/pause timestamps
 * so the timer can be reconstructed after page refresh.
 */

const TIMER_KEY = "study-os-timer";

export interface TimerState {
  status: "idle" | "running" | "paused";
  /** Timestamp when the current run started (or resumed) */
  startedAt: number;
  /** Accumulated time in seconds before the current run */
  accumulatedSeconds: number;
  /** Subject and task associated with this timer */
  subject?: string;
  taskId?: string;
  /** Timer mode */
  mode: "custom" | "pomodoro";
  /** Pomodoro-specific state */
  pomodoroPhase?: "focus" | "break" | "long_break";
  pomodoroSession?: number;
  /** When the timer was last persisted (for drift detection) */
  persistedAt: number;
}

export function saveTimerState(state: TimerState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIMER_KEY, JSON.stringify({ ...state, persistedAt: Date.now() }));
}

export function loadTimerState(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const state: TimerState = JSON.parse(raw);
    return state;
  } catch {
    return null;
  }
}

export function clearTimerState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TIMER_KEY);
}

/** Calculate elapsed seconds from a timer state, accounting for running/paused */
export function getElapsedSeconds(state: TimerState): number {
  if (state.status === "running") {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    return state.accumulatedSeconds + elapsed;
  }
  return state.accumulatedSeconds;
}
