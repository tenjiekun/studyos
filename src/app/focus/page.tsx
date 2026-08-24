"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStudyData } from "@/lib/use-study-data";
import { toast } from "sonner";
import {
  formatTimerSeconds,
  formatMinutes,
  getTodayStr,
  getDayMinutes,
} from "@/lib/helpers";
import { SUBJECTS } from "@/lib/types";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  SkipForward,
  Coffee,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  saveTimerState,
  loadTimerState,
  clearTimerState,
  getElapsedSeconds,
  type TimerState,
} from "@/lib/timer-persistence";

type Mode = "custom" | "pomodoro";
type PomodoroPhase = "focus" | "break" | "long_break";

export default function FocusPage() {
  const { tasks, sessions, settings, addSession, loading } = useStudyData();

  const [mode, setMode] = useState<Mode>("custom");

  const [customState, setCustomState] = useState<TimerState>({
    status: "idle", startedAt: 0, accumulatedSeconds: 0,
    mode: "custom", persistedAt: Date.now(),
  });
  const [customSubject, setCustomSubject] = useState("");
  const [customTaskId, setCustomTaskId] = useState("");
  const [displaySeconds, setDisplaySeconds] = useState(0);

  const [pomoState, setPomoState] = useState<TimerState>({
    status: "idle", startedAt: 0, accumulatedSeconds: 0,
    mode: "pomodoro", pomodoroPhase: "focus", pomodoroSession: 1,
    persistedAt: Date.now(),
  });
  const [pomodoroSubject, setPomodoroSubject] = useState("");
  const [pomodoroTaskId, setPomodoroTaskId] = useState("");
  const [pomoDisplaySeconds, setPomoDisplaySeconds] = useState(0);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      if (saved.mode === "custom") {
        setMode("custom");
        setCustomState(saved);
        setDisplaySeconds(saved.status === "running" ? Math.floor(getElapsedSeconds(saved)) : Math.floor(saved.accumulatedSeconds));
      } else if (saved.mode === "pomodoro") {
        setMode("pomodoro");
        setPomoState(saved);
        const phaseMax = saved.pomodoroPhase === "focus" ? settings.pomodoro.focus_duration * 60
          : saved.pomodoroPhase === "break" ? settings.pomodoro.short_break_duration * 60
          : settings.pomodoro.long_break_duration * 60;
        const remaining = saved.status === "running"
          ? Math.max(0, phaseMax - Math.floor(getElapsedSeconds(saved)))
          : Math.max(0, phaseMax - Math.floor(saved.accumulatedSeconds));
        setPomoDisplaySeconds(remaining);
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (customState.status !== "running") return;
    const interval = setInterval(() => setDisplaySeconds(Math.floor(getElapsedSeconds(customState))), 250);
    return () => clearInterval(interval);
  }, [customState.status, customState.startedAt]);

  const handlePomodoroPhaseEnd = useCallback(() => {
    setPomoState((prev) => ({ ...prev, status: "idle" as const, accumulatedSeconds: 0 }));
    if (pomoState.pomodoroPhase === "focus") {
      addSession({
        subject: pomodoroSubject || undefined, task_id: pomodoroTaskId || undefined,
        start_time: new Date(Date.now() - settings.pomodoro.focus_duration * 60000).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: settings.pomodoro.focus_duration, session_type: "pomodoro",
      });
      const nextSession = pomoState.pomodoroSession || 1;
      let nextPhase: PomodoroPhase = "break";
      if (nextSession % settings.pomodoro.sessions_before_long_break === 0) nextPhase = "long_break";
      const newPomoState: TimerState = {
        status: "idle", startedAt: 0, accumulatedSeconds: 0,
        mode: "pomodoro", pomodoroPhase: nextPhase, pomodoroSession: nextSession, persistedAt: Date.now(),
      };
      setPomoState(newPomoState);
      setPomoDisplaySeconds(nextPhase === "long_break" ? settings.pomodoro.long_break_duration * 60 : settings.pomodoro.short_break_duration * 60);
      clearTimerState();
    } else {
      const nextSession = (pomoState.pomodoroSession || 1) + 1;
      const newPomoState: TimerState = {
        status: "idle", startedAt: 0, accumulatedSeconds: 0,
        mode: "pomodoro", pomodoroPhase: "focus", pomodoroSession: nextSession, persistedAt: Date.now(),
      };
      setPomoState(newPomoState);
      setPomoDisplaySeconds(settings.pomodoro.focus_duration * 60);
      clearTimerState();
    }
  }, [pomoState.pomodoroPhase, pomodoroSubject, pomodoroTaskId, settings.pomodoro, addSession]);

  useEffect(() => {
    if (pomoState.status !== "running") return;
    const interval = setInterval(() => {
      const elapsed = getElapsedSeconds(pomoState);
      const phaseMax = pomoState.pomodoroPhase === "focus" ? settings.pomodoro.focus_duration * 60
        : pomoState.pomodoroPhase === "break" ? settings.pomodoro.short_break_duration * 60
        : settings.pomodoro.long_break_duration * 60;
      const remaining = Math.max(0, phaseMax - Math.floor(elapsed));
      setPomoDisplaySeconds(remaining);
      if (remaining <= 0) handlePomodoroPhaseEnd();
    }, 250);
    return () => clearInterval(interval);
  }, [pomoState.status, pomoState.startedAt, pomoState.pomodoroPhase, settings.pomodoro, handlePomodoroPhaseEnd]);

  function startCustom() {
    const newState: TimerState = {
      status: "running", startedAt: Date.now(), accumulatedSeconds: displaySeconds,
      mode: "custom", subject: customSubject || undefined, taskId: customTaskId || undefined, persistedAt: Date.now(),
    };
    setCustomState(newState); saveTimerState(newState);
  }
  function pauseCustom() {
    const elapsed = Math.floor(getElapsedSeconds(customState));
    const newState: TimerState = { ...customState, status: "paused", accumulatedSeconds: elapsed, startedAt: 0, persistedAt: Date.now() };
    setCustomState(newState); setDisplaySeconds(elapsed); saveTimerState(newState);
  }
  function stopCustom() {
    const elapsed = Math.floor(getElapsedSeconds(customState));
    if (elapsed > 0) {
      addSession({
        subject: customState.subject || customSubject || undefined, task_id: customState.taskId || customTaskId || undefined,
        start_time: new Date(Date.now() - elapsed * 1000).toISOString(), end_time: new Date().toISOString(),
        duration_minutes: Math.max(1, Math.floor(elapsed / 60)), session_type: "focus",
      });
    }
    setCustomState({ status: "idle", startedAt: 0, accumulatedSeconds: 0, mode: "custom", persistedAt: Date.now() });
    setDisplaySeconds(0); clearTimerState();
  }
  function resetCustom() {
    setCustomState({ status: "idle", startedAt: 0, accumulatedSeconds: 0, mode: "custom", persistedAt: Date.now() });
    setDisplaySeconds(0); clearTimerState();
  }
  function startPomodoro() {
    const focusMax = settings.pomodoro.focus_duration * 60;
    const accumulated = focusMax - pomoDisplaySeconds;
    const newState: TimerState = {
      status: "running", startedAt: Date.now(), accumulatedSeconds: accumulated > 0 ? accumulated : 0,
      mode: "pomodoro", pomodoroPhase: pomoState.pomodoroPhase || "focus",
      pomodoroSession: pomoState.pomodoroSession || 1, persistedAt: Date.now(),
    };
    setPomoState(newState); saveTimerState(newState);
  }
  function pausePomodoro() {
    const phaseMax = (pomoState.pomodoroPhase || "focus") === "focus" ? settings.pomodoro.focus_duration * 60
      : (pomoState.pomodoroPhase || "break") === "break" ? settings.pomodoro.short_break_duration * 60
      : settings.pomodoro.long_break_duration * 60;
    const accumulated = phaseMax - pomoDisplaySeconds;
    const newState: TimerState = { ...pomoState, status: "paused", accumulatedSeconds: Math.max(0, accumulated), startedAt: 0, persistedAt: Date.now() };
    setPomoState(newState); saveTimerState(newState);
  }
  function skipPomodoro() { handlePomodoroPhaseEnd(); }
  function resetPomodoro() {
    setPomoState({ status: "idle", startedAt: 0, accumulatedSeconds: 0, mode: "pomodoro", pomodoroPhase: "focus", pomodoroSession: 1, persistedAt: Date.now() });
    setPomoDisplaySeconds(settings.pomodoro.focus_duration * 60); clearTimerState();
  }

  if (!mounted || loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1000px] mx-auto space-y-6">
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-[400px] rounded-2xl" />
      </div>
    );
  }

  const today = getTodayStr();
  const todayMinutes = getDayMinutes(sessions, today);
  const todaySessions = sessions.filter((s) => s.start_time.slice(0, 10) === today);
  const activeTasks = tasks.filter((t) => !t.completed);

  const pomodoroMaxSeconds = (pomoState.pomodoroPhase || "focus") === "focus"
    ? settings.pomodoro.focus_duration * 60
    : (pomoState.pomodoroPhase || "break") === "break"
    ? settings.pomodoro.short_break_duration * 60
    : settings.pomodoro.long_break_duration * 60;
  const pomodoroProgress = 1 - pomoDisplaySeconds / pomodoroMaxSeconds;

  const phaseLabel = (pomoState.pomodoroPhase || "focus") === "focus" ? "FOCUS"
    : (pomoState.pomodoroPhase || "break") === "break" ? "SHORT BREAK" : "LONG BREAK";

  const customRunning = customState.status === "running";
  const pomodoroRunning = pomoState.status === "running";

  return (
    <div className="p-6 md:p-10 max-w-[1000px] mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Focus</h1>
        <p className="text-muted-foreground mt-1.5 text-sm font-medium">Deep work starts here</p>
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 w-fit animate-fade-in">
        <button
          onClick={() => { setMode("custom"); if (pomodoroRunning) pausePomodoro(); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 ${
            mode === "custom" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          Custom
        </button>
        <button
          onClick={() => { setMode("pomodoro"); if (customRunning) pauseCustom(); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 ${
            mode === "pomodoro" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Pomodoro
        </button>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Timer area */}
        <div className="md:col-span-3">
          <div className="animate-fade-in p-8 md:p-12 rounded-3xl border border-border/50 bg-card/30 text-center">
            {mode === "custom" ? (
              <div className="flex flex-col items-center">
                <p className="text-[11px] text-muted-foreground font-medium mb-6 tracking-[0.15em] uppercase">
                  Focus Timer
                </p>
                <p className="text-7xl md:text-[88px] font-light timer-display tracking-tighter text-foreground leading-none mb-8">
                  {formatTimerSeconds(displaySeconds)}
                </p>
                <div className="flex items-center gap-3">
                  {!customRunning ? (
                    <Button size="lg" className="h-14 px-10 gap-2.5 rounded-full text-[15px] font-medium shadow-lg shadow-primary/20" onClick={startCustom}>
                      <Play className="w-5 h-5" fill="currentColor" />
                      {customState.status === "paused" ? "Resume" : "Start"}
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" variant="outline" className="h-14 w-14 rounded-full" onClick={pauseCustom}>
                        <Pause className="w-5 h-5" />
                      </Button>
                      <Button size="lg" variant="destructive" className="h-14 w-14 rounded-full" onClick={stopCustom}>
                        <Square className="w-5 h-5" fill="currentColor" />
                      </Button>
                    </>
                  )}
                  {displaySeconds > 0 && !customRunning && (
                    <Button size="lg" variant="outline" className="h-14 w-14 rounded-full" onClick={resetCustom}>
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                {customRunning && (
                  <p className="text-xs text-emerald-500 mt-5 animate-pulse-soft font-medium">● Recording</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <p className={`text-[11px] font-medium mb-6 tracking-[0.15em] uppercase ${
                  (pomoState.pomodoroPhase || "focus") === "focus" ? "text-primary" : "text-emerald-500"
                }`}>
                  {phaseLabel}
                </p>
                <div className="relative mb-5">
                  <svg className="w-52 h-52 md:w-60 md:h-60 -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/40" />
                    <circle
                      cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={(pomoState.pomodoroPhase || "focus") === "focus" ? "text-primary" : "text-emerald-500"}
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={2 * Math.PI * 88 * (1 - Math.max(0, pomodoroProgress))}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.3s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-5xl md:text-6xl font-light timer-display tracking-tighter">
                      {formatTimerSeconds(pomoDisplaySeconds)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-6 font-medium">
                  Session {(pomoState.pomodoroSession || 1)} of {settings.pomodoro.sessions_before_long_break}
                </p>
                <div className="flex items-center gap-3">
                  {!pomodoroRunning ? (
                    <Button size="lg" className="h-14 px-10 gap-2.5 rounded-full text-[15px] font-medium shadow-lg shadow-primary/20"
                      onClick={(pomoState.pomodoroPhase || "focus") === "focus" ? startPomodoro : () => {
                        const newState = { ...pomoState, status: "running" as const, startedAt: Date.now(), accumulatedSeconds: 0, persistedAt: Date.now() };
                        setPomoState(newState); saveTimerState(newState);
                      }}
                    >
                      <Play className="w-5 h-5" fill="currentColor" />
                      {(pomoState.pomodoroPhase || "focus") === "focus" ? "Start" : "Start Break"}
                    </Button>
                  ) : (
                    <>
                      <Button size="lg" variant="outline" className="h-14 w-14 rounded-full" onClick={pausePomodoro}>
                        <Pause className="w-5 h-5" />
                      </Button>
                      {(pomoState.pomodoroPhase || "focus") === "focus" && (
                        <Button size="lg" variant="outline" className="h-14 w-14 rounded-full" onClick={skipPomodoro}>
                          <SkipForward className="w-5 h-5" />
                        </Button>
                      )}
                    </>
                  )}
                  <Button size="lg" variant="outline" className="h-14 w-14 rounded-full" onClick={resetPomodoro}>
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                </div>
                {pomodoroRunning && (
                  <p className="text-xs text-emerald-500 mt-5 animate-pulse-soft font-medium">● Recording</p>
                )}
                {(pomoState.pomodoroPhase || "focus") !== "focus" && !pomodoroRunning && pomoDisplaySeconds > 0 && pomoDisplaySeconds === pomodoroMaxSeconds && (
                  <div className="mt-5 text-center">
                    <Coffee className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Great work! Time for a break ☕</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="md:col-span-2 space-y-4 animate-fade-in">
          {/* Session Details */}
          <div className="p-5 rounded-2xl border border-border/50 bg-card/30 space-y-4">
            <h3 className="text-[13px] font-medium text-foreground">
              {mode === "custom" ? "Session Details" : "Focus Details"}
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">Subject</label>
                <Select
                  value={mode === "custom" ? customSubject : pomodoroSubject}
                  onValueChange={(v) => { if (v) mode === "custom" ? setCustomSubject(v) : setPomodoroSubject(v); }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">Task</label>
                <Select
                  value={mode === "custom" ? customTaskId : pomodoroTaskId}
                  onValueChange={(v) => { if (v) mode === "custom" ? setCustomTaskId(v) : setPomodoroTaskId(v); }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Today stats */}
          <div className="p-5 rounded-2xl border border-border/50 bg-card/30 space-y-4">
            <h3 className="text-[13px] font-medium text-foreground">Today</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-muted-foreground">Focus Time</span>
                <span className="text-[13px] font-semibold">{formatMinutes(todayMinutes)}</span>
              </div>
              <div className="h-px bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-muted-foreground">Sessions</span>
                <span className="text-[13px] font-semibold">{todaySessions.length}</span>
              </div>
              <div className="h-px bg-border/50" />
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-muted-foreground">Daily Goal</span>
                <span className="text-[13px] font-semibold">
                  {Math.round((todayMinutes / settings.daily_goal_minutes) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((todayMinutes / settings.daily_goal_minutes) * 100, 100)}%` }} />
              </div>
            </div>
          </div>

          {mode === "pomodoro" && (
            <div className="p-5 rounded-2xl border border-border/50 bg-card/30 space-y-3">
              <h3 className="text-[13px] font-medium text-foreground">Pomodoro Settings</h3>
              <div className="space-y-2.5">
                {[
                  ["Focus", `${settings.pomodoro.focus_duration}min`],
                  ["Short Break", `${settings.pomodoro.short_break_duration}min`],
                  ["Long Break", `${settings.pomodoro.long_break_duration}min`],
                  ["Long break after", `${settings.pomodoro.sessions_before_long_break} sessions`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[12px] text-muted-foreground">{label}</span>
                    <span className="text-[12px] font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
