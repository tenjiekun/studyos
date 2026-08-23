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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

  // Custom timer — timestamp-based
  const [customState, setCustomState] = useState<TimerState>({
    status: "idle",
    startedAt: 0,
    accumulatedSeconds: 0,
    mode: "custom",
    persistedAt: Date.now(),
  });
  const [customSubject, setCustomSubject] = useState("");
  const [customTaskId, setCustomTaskId] = useState("");
  const [displaySeconds, setDisplaySeconds] = useState(0);

  // Pomodoro — timestamp-based
  const [pomoState, setPomoState] = useState<TimerState>({
    status: "idle",
    startedAt: 0,
    accumulatedSeconds: 0,
    mode: "pomodoro",
    pomodoroPhase: "focus",
    pomodoroSession: 1,
    persistedAt: Date.now(),
  });
  const [pomodoroSubject, setPomodoroSubject] = useState("");
  const [pomodoroTaskId, setPomodoroTaskId] = useState("");
  const [pomoDisplaySeconds, setPomoDisplaySeconds] = useState(0);

  const [mounted, setMounted] = useState(false);

  // Restore timer state from localStorage on mount
  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      if (saved.mode === "custom") {
        setMode("custom");
        setCustomState(saved);
        if (saved.status === "running") {
          // Timer was running — compute elapsed
          setDisplaySeconds(Math.floor(getElapsedSeconds(saved)));
        } else {
          setDisplaySeconds(Math.floor(saved.accumulatedSeconds));
        }
      } else if (saved.mode === "pomodoro") {
        setMode("pomodoro");
        setPomoState(saved);
        if (saved.status === "running") {
          // Compute how much time remains based on timestamp
          const elapsed = getElapsedSeconds(saved);
          const phaseMax =
            saved.pomodoroPhase === "focus"
              ? settings.pomodoro.focus_duration * 60
              : saved.pomodoroPhase === "break"
              ? settings.pomodoro.short_break_duration * 60
              : settings.pomodoro.long_break_duration * 60;
          const remaining = Math.max(0, phaseMax - Math.floor(elapsed));
          setPomoDisplaySeconds(remaining);
        } else {
          const phaseMax =
            saved.pomodoroPhase === "focus"
              ? settings.pomodoro.focus_duration * 60
              : saved.pomodoroPhase === "break"
              ? settings.pomodoro.short_break_duration * 60
              : settings.pomodoro.long_break_duration * 60;
          const remaining = Math.max(0, phaseMax - Math.floor(saved.accumulatedSeconds));
          setPomoDisplaySeconds(remaining);
        }
      }
    }
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Custom timer tick — compute from timestamp
  useEffect(() => {
    if (customState.status !== "running") return;
    const interval = setInterval(() => {
      const elapsed = Math.floor(getElapsedSeconds(customState));
      setDisplaySeconds(elapsed);
    }, 250);
    return () => clearInterval(interval);
  }, [customState.status, customState.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pomodoro timer tick — compute remaining from timestamp
  const handlePomodoroPhaseEnd = useCallback(() => {
    setPomoState((prev) => {
      const updated = { ...prev, status: "idle" as const, accumulatedSeconds: 0 };
      return updated;
    });

    if (pomoState.pomodoroPhase === "focus") {
      addSession({
        subject: pomodoroSubject || undefined,
        task_id: pomodoroTaskId || undefined,
        start_time: new Date(Date.now() - settings.pomodoro.focus_duration * 60000).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: settings.pomodoro.focus_duration,
        session_type: "pomodoro",
      });

      const nextSession = pomoState.pomodoroSession || 1;
      let nextPhase: PomodoroPhase = "break";
      let nextDuration = settings.pomodoro.short_break_duration * 60;

      if (nextSession % settings.pomodoro.sessions_before_long_break === 0) {
        nextPhase = "long_break";
        nextDuration = settings.pomodoro.long_break_duration * 60;
      }

      const newPomoState: TimerState = {
        status: "idle",
        startedAt: 0,
        accumulatedSeconds: 0,
        mode: "pomodoro",
        pomodoroPhase: nextPhase,
        pomodoroSession: nextSession,
        persistedAt: Date.now(),
      };
      setPomoState(newPomoState);
      setPomoDisplaySeconds(nextPhase === "long_break" ? settings.pomodoro.long_break_duration * 60 : settings.pomodoro.short_break_duration * 60);
      clearTimerState();
    } else {
      // Break ended → back to focus
      const nextSession = (pomoState.pomodoroSession || 1) + 1;
      const newPomoState: TimerState = {
        status: "idle",
        startedAt: 0,
        accumulatedSeconds: 0,
        mode: "pomodoro",
        pomodoroPhase: "focus",
        pomodoroSession: nextSession,
        persistedAt: Date.now(),
      };
      setPomoState(newPomoState);
      setPomoDisplaySeconds(settings.pomodoro.focus_duration * 60);
      clearTimerState();
    }
  }, [pomoState.pomodoroPhase, pomodoroSubject, pomodoroTaskId, settings.pomodoro, addSession]);

  // Pomodoro timer tick
  useEffect(() => {
    if (pomoState.status !== "running") return;
    const interval = setInterval(() => {
      const elapsed = getElapsedSeconds(pomoState);
      const phaseMax =
        pomoState.pomodoroPhase === "focus"
          ? settings.pomodoro.focus_duration * 60
          : pomoState.pomodoroPhase === "break"
          ? settings.pomodoro.short_break_duration * 60
          : settings.pomodoro.long_break_duration * 60;
      const remaining = Math.max(0, phaseMax - Math.floor(elapsed));
      setPomoDisplaySeconds(remaining);
      if (remaining <= 0) {
        handlePomodoroPhaseEnd();
      }
    }, 250);
    return () => clearInterval(interval);
  }, [pomoState.status, pomoState.startedAt, pomoState.pomodoroPhase, settings.pomodoro, handlePomodoroPhaseEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  function startCustom() {
    const newState: TimerState = {
      status: "running",
      startedAt: Date.now(),
      accumulatedSeconds: displaySeconds,
      mode: "custom",
      subject: customSubject || undefined,
      taskId: customTaskId || undefined,
      persistedAt: Date.now(),
    };
    setCustomState(newState);
    saveTimerState(newState);
  }

  function pauseCustom() {
    const elapsed = Math.floor(getElapsedSeconds(customState));
    const newState: TimerState = {
      ...customState,
      status: "paused",
      accumulatedSeconds: elapsed,
      startedAt: 0,
      persistedAt: Date.now(),
    };
    setCustomState(newState);
    setDisplaySeconds(elapsed);
    saveTimerState(newState);
  }

  function stopCustom() {
    const elapsed = Math.floor(getElapsedSeconds(customState));
    if (elapsed > 0) {
      addSession({
        subject: customState.subject || customSubject || undefined,
        task_id: customState.taskId || customTaskId || undefined,
        start_time: new Date(Date.now() - elapsed * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: Math.max(1, Math.floor(elapsed / 60)),
        session_type: "focus",
      });
    }
    const newState: TimerState = {
      status: "idle",
      startedAt: 0,
      accumulatedSeconds: 0,
      mode: "custom",
      persistedAt: Date.now(),
    };
    setCustomState(newState);
    setDisplaySeconds(0);
    clearTimerState();
  }

  function resetCustom() {
    const newState: TimerState = {
      status: "idle",
      startedAt: 0,
      accumulatedSeconds: 0,
      mode: "custom",
      persistedAt: Date.now(),
    };
    setCustomState(newState);
    setDisplaySeconds(0);
    clearTimerState();
  }

  function startPomodoro() {
    const focusMax = settings.pomodoro.focus_duration * 60;
    const accumulated = focusMax - pomoDisplaySeconds;
    const newState: TimerState = {
      status: "running",
      startedAt: Date.now(),
      accumulatedSeconds: accumulated > 0 ? accumulated : 0,
      mode: "pomodoro",
      pomodoroPhase: pomoState.pomodoroPhase || "focus",
      pomodoroSession: pomoState.pomodoroSession || 1,
      persistedAt: Date.now(),
    };
    setPomoState(newState);
    saveTimerState(newState);
  }

  function pausePomodoro() {
    const phaseMax =
      (pomoState.pomodoroPhase || "focus") === "focus"
        ? settings.pomodoro.focus_duration * 60
        : (pomoState.pomodoroPhase || "break") === "break"
        ? settings.pomodoro.short_break_duration * 60
        : settings.pomodoro.long_break_duration * 60;
    const accumulated = phaseMax - pomoDisplaySeconds;
    const newState: TimerState = {
      ...pomoState,
      status: "paused",
      accumulatedSeconds: Math.max(0, accumulated),
      startedAt: 0,
      persistedAt: Date.now(),
    };
    setPomoState(newState);
    saveTimerState(newState);
  }

  function skipPomodoro() {
    handlePomodoroPhaseEnd();
  }

  function resetPomodoro() {
    const newState: TimerState = {
      status: "idle",
      startedAt: 0,
      accumulatedSeconds: 0,
      mode: "pomodoro",
      pomodoroPhase: "focus",
      pomodoroSession: 1,
      persistedAt: Date.now(),
    };
    setPomoState(newState);
    setPomoDisplaySeconds(settings.pomodoro.focus_duration * 60);
    clearTimerState();
  }

  if (!mounted || loading) {
    return (
      <div className="p-4 md:p-8 max-w-[1000px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-[400px] bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const today = getTodayStr();
  const todayMinutes = getDayMinutes(sessions, today);
  const todaySessions = sessions.filter((s) => s.start_time.slice(0, 10) === today);
  const activeTasks = tasks.filter((t) => !t.completed);

  const pomodoroMaxSeconds =
    (pomoState.pomodoroPhase || "focus") === "focus"
      ? settings.pomodoro.focus_duration * 60
      : (pomoState.pomodoroPhase || "break") === "break"
      ? settings.pomodoro.short_break_duration * 60
      : settings.pomodoro.long_break_duration * 60;
  const pomodoroProgress = 1 - pomoDisplaySeconds / pomodoroMaxSeconds;

  const phaseLabel =
    (pomoState.pomodoroPhase || "focus") === "focus"
      ? "FOCUS"
      : (pomoState.pomodoroPhase || "break") === "break"
      ? "SHORT BREAK"
      : "LONG BREAK";

  const customRunning = customState.status === "running";
  const pomodoroRunning = pomoState.status === "running";

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Deep work starts here</p>
      </div>

      <div className="flex items-center gap-1 animate-fade-in">
        <button
          onClick={() => { setMode("custom"); if (pomodoroRunning) pausePomodoro(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            mode === "custom" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          Custom
        </button>
        <button
          onClick={() => { setMode("pomodoro"); if (customRunning) pauseCustom(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            mode === "pomodoro" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Pomodoro
        </button>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <Card className="animate-fade-in">
            <CardContent className="p-8 md:p-12">
              {mode === "custom" ? (
                <div className="flex flex-col items-center">
                  <p className="text-xs text-muted-foreground font-medium mb-4 tracking-widest uppercase">
                    Focus Timer
                  </p>
                  <div className="relative mb-8">
                    <p className="text-6xl md:text-8xl font-light timer-display tracking-tighter text-foreground">
                      {formatTimerSeconds(displaySeconds)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!customRunning ? (
                      <Button size="lg" className="h-14 px-8 gap-2 rounded-full" onClick={startCustom}>
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
                    <p className="text-xs text-emerald-500 mt-4 animate-pulse-soft">● Recording</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Badge
                    variant="secondary"
                    className={`mb-4 text-xs tracking-widest uppercase ${
                      (pomoState.pomodoroPhase || "focus") === "focus" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"
                    }`}
                  >
                    {phaseLabel}
                  </Badge>
                  <div className="relative mb-4">
                    <svg className="w-48 h-48 md:w-56 md:h-56 -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50" />
                      <circle
                        cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="3"
                        className={(pomoState.pomodoroPhase || "focus") === "focus" ? "text-primary" : "text-emerald-500"}
                        strokeDasharray={2 * Math.PI * 90}
                        strokeDashoffset={2 * Math.PI * 90 * (1 - Math.max(0, pomodoroProgress))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-4xl md:text-5xl font-light timer-display tracking-tighter">
                        {formatTimerSeconds(pomoDisplaySeconds)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">
                    Session {pomoState.pomodoroSession || 1} of {settings.pomodoro.sessions_before_long_break}
                  </p>
                  <div className="flex items-center gap-3">
                    {!pomodoroRunning ? (
                      <Button size="lg" className="h-14 px-8 gap-2 rounded-full"
                        onClick={(pomoState.pomodoroPhase || "focus") === "focus" ? startPomodoro : () => {
                          const newState = { ...pomoState, status: "running" as const, startedAt: Date.now(), accumulatedSeconds: 0, persistedAt: Date.now() };
                          setPomoState(newState);
                          saveTimerState(newState);
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
                    <p className="text-xs text-emerald-500 mt-4 animate-pulse-soft">● Recording</p>
                  )}
                  {(pomoState.pomodoroPhase || "focus") !== "focus" && !pomodoroRunning && pomoDisplaySeconds > 0 && pomoDisplaySeconds === pomodoroMaxSeconds && (
                    <div className="mt-4 text-center">
                      <Coffee className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">Great work! Time for a break ☕</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4 animate-fade-in">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {mode === "custom" ? "Session Details" : "Focus Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Subject</label>
                <Select
                  value={mode === "custom" ? customSubject : pomodoroSubject}
                  onValueChange={(v) => {
                    if (v) {
                      mode === "custom" ? setCustomSubject(v) : setPomodoroSubject(v);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Task</label>
                <Select
                  value={mode === "custom" ? customTaskId : pomodoroTaskId}
                  onValueChange={(v) => {
                    if (v) {
                      mode === "custom" ? setCustomTaskId(v) : setPomodoroTaskId(v);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Focus Time</span>
                <span className="text-sm font-semibold">{formatMinutes(todayMinutes)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sessions</span>
                <span className="text-sm font-semibold">{todaySessions.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Daily Goal</span>
                <span className="text-sm font-semibold">
                  {Math.round((todayMinutes / settings.daily_goal_minutes) * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((todayMinutes / settings.daily_goal_minutes) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {mode === "pomodoro" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pomodoro Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Focus</span>
                  <span className="text-xs font-medium">{settings.pomodoro.focus_duration}min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Short Break</span>
                  <span className="text-xs font-medium">{settings.pomodoro.short_break_duration}min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Long Break</span>
                  <span className="text-xs font-medium">{settings.pomodoro.long_break_duration}min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Long break after</span>
                  <span className="text-xs font-medium">{settings.pomodoro.sessions_before_long_break} sessions</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
