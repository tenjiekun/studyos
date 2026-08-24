"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import type { Test, TestSubjectResult } from "@/lib/types";

export default function PerformancePage() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [subjectResults, setSubjectResults] = useState<TestSubjectResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"overview" | "mocks" | "actuals" | "subjects">("overview");

  const loadData = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    const [testsRes, subjRes] = await Promise.all([
      sb
        .from("tests")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      sb
        .from("test_subject_results" as any)
        .select("*")
        .eq("user_id", user.id),
    ]);

    setTests((testsRes.data as any) || []);
    setSubjectResults((subjRes.data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const mockTests = tests.filter((t) => t.type === "mock");
  const actualTests = tests.filter((t) => t.type === "actual");

  const avgScore = (arr: Test[]) =>
    arr.length > 0
      ? Math.round(arr.reduce((a, t) => a + (t.percentage || 0), 0) / arr.length)
      : 0;

  const avgAccuracy = (arr: Test[]) =>
    arr.length > 0
      ? Math.round(arr.reduce((a, t) => a + (t.accuracy || 0), 0) / arr.length)
      : 0;

  const bestScore = (arr: Test[]) =>
    arr.length > 0 ? Math.max(...arr.map((t) => t.percentage || 0)) : 0;

  // Subject performance
  const subjects = [...new Set(subjectResults.map((r) => r.subject))];
  const getSubjectPerf = (subject: string) => {
    const results = subjectResults.filter((r) => r.subject === subject);
    const avgPct =
      results.length > 0
        ? Math.round(
            results.reduce((a, r) => a + (((r.marks || 0) / (r.max_marks || 1)) * 100), 0) /
              results.length
          )
        : 0;
    const avgAcc =
      results.length > 0
        ? Math.round(
            results.reduce((a, r) => a + (r.accuracy || 0), 0) / results.length
          )
        : 0;
    return { tests: results.length, avgPct, avgAcc };
  };

  // Trend data (last 10 tests)
  const trendTests = [...tests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10);

  const maxPct = Math.max(100, ...trendTests.map((t) => t.percentage || 0));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Performance Analytics
        </p>
        <h1 className="text-3xl font-light tracking-tight">
          Track your test performance
        </h1>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit">
        {(["overview", "mocks", "actuals", "subjects"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              view === v
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "overview" ? "Overview" : v === "mocks" ? "Mock Tests" : v === "actuals" ? "Actual Tests" : "By Subject"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-card border border-border/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Overview */}
          {view === "overview" && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "TOTAL TESTS", value: tests.length.toString() },
                  { label: "AVG SCORE", value: `${avgScore(tests)}%` },
                  { label: "AVG ACCURACY", value: `${avgAccuracy(tests)}%` },
                  { label: "BEST SCORE", value: `${bestScore(tests)}%` },
                ].map((m) => (
                  <div key={m.label} className="p-5 rounded-2xl bg-card border border-border/30">
                    <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-2">
                      {m.label}
                    </p>
                    <p className="text-3xl font-light tracking-tight">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Mock vs Actual Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl bg-card border border-border/30">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-4">
                    MOCK TESTS
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <p className="text-4xl font-light">{avgScore(mockTests)}%</p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${avgScore(mockTests)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Tests taken</p>
                        <p className="text-sm font-medium">{mockTests.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <p className="text-sm font-medium">{avgAccuracy(mockTests)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-card border border-border/30">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-4">
                    ACTUAL TESTS
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <p className="text-4xl font-light">{avgScore(actualTests)}%</p>
                      <p className="text-xs text-muted-foreground">avg score</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all duration-500"
                        style={{ width: `${avgScore(actualTests)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Tests taken</p>
                        <p className="text-sm font-medium">{actualTests.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <p className="text-sm font-medium">{avgAccuracy(actualTests)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Trend */}
              {trendTests.length > 0 && (
                <div className="p-6 rounded-2xl bg-card border border-border/30">
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-6">
                    SCORE TREND
                  </p>
                  <div className="flex items-end gap-2 h-40">
                    {trendTests.map((t, idx) => (
                      <div key={t.id} className="flex-1 flex flex-col items-center gap-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          {t.percentage || 0}%
                        </p>
                        <div
                          className={`w-full rounded-lg transition-all duration-500 ${
                            t.type === "mock" ? "bg-primary/80" : "bg-orange-500/80"
                          }`}
                          style={{
                            height: `${((t.percentage || 0) / maxPct) * 100}%`,
                            minHeight: 4,
                          }}
                        />
                        <p className="text-[9px] text-muted-foreground truncate w-full text-center">
                          {t.name?.slice(0, 8)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-4 justify-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-primary/80" />
                      <span className="text-[11px] text-muted-foreground">Mock</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded bg-orange-500/80" />
                      <span className="text-[11px] text-muted-foreground">Actual</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mock Tests */}
          {view === "mocks" && (
            <div className="space-y-4">
              {mockTests.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">No mock tests recorded yet</p>
                </div>
              ) : (
                mockTests.map((test) => (
                  <div key={test.id} className="p-5 rounded-2xl bg-card border border-border/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium">{test.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(test.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-light">{test.percentage || 0}%</p>
                        <p className="text-xs text-muted-foreground">
                          {test.actual_marks}/{test.max_marks}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border/20">
                      {[
                        { label: "Target", value: `${test.target_marks || "—"}` },
                        { label: "Accuracy", value: `${test.accuracy || 0}%` },
                        { label: "Attempted", value: `${test.questions_attempted || "—"}` },
                        { label: "Duration", value: `${test.duration_minutes || "—"}m` },
                      ].map((m) => (
                        <div key={m.label}>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          <p className="text-sm font-medium">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Actual Tests */}
          {view === "actuals" && (
            <div className="space-y-4">
              {actualTests.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">No actual tests recorded yet</p>
                </div>
              ) : (
                actualTests.map((test) => (
                  <div key={test.id} className="p-5 rounded-2xl bg-card border border-border/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium">{test.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(test.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-light">{test.percentage || 0}%</p>
                        <p className="text-xs text-muted-foreground">
                          {test.actual_marks}/{test.max_marks}
                          {test.rank ? ` · Rank #${test.rank}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 pt-3 border-t border-border/20">
                      {[
                        { label: "Target", value: `${test.target_marks || "—"}` },
                        { label: "Accuracy", value: `${test.accuracy || 0}%` },
                        { label: "Attempted", value: `${test.questions_attempted || "—"}` },
                        { label: "Correct", value: `${test.correct_answers || "—"}` },
                      ].map((m) => (
                        <div key={m.label}>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          <p className="text-sm font-medium">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* By Subject */}
          {view === "subjects" && (
            <div className="space-y-4">
              {subjects.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-sm">No subject results yet</p>
                </div>
              ) : (
                subjects.map((subject) => {
                  const perf = getSubjectPerf(subject);
                  return (
                    <div key={subject} className="p-5 rounded-2xl bg-card border border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">{subject}</h3>
                        <p className="text-2xl font-light">{perf.avgPct}%</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${perf.avgPct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Tests</p>
                          <p className="text-sm font-medium">{perf.tests}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Avg Accuracy</p>
                          <p className="text-sm font-medium">{perf.avgAcc}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Performance</p>
                          <p className={`text-sm font-medium ${perf.avgPct >= 80 ? "text-emerald-600" : perf.avgPct >= 60 ? "text-amber-600" : "text-orange-600"}`}>
                            {perf.avgPct >= 80 ? "Strong" : perf.avgPct >= 60 ? "Average" : "Needs Work"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
