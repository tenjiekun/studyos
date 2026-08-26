"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { LoadingScreen } from "./LoadingScreen";
import { Navigation } from "./Navigation";
import { Scene3D } from "./Scene3D";
import { SceneOverlay } from "./SceneOverlay";
import { useAuth } from "@/components/auth-provider";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const SCENE_DATA = [
  {
    id: "hero",
    title: "STUDYOS",
    subtitle: "Turn your entire year into a system.",
    tagline: "Plan. Focus. Measure. Improve.",
    accent: "#6366f1",
  },
  {
    id: "year",
    title: "YOUR YEAR",
    subtitle: "See your entire year at once.",
    months: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    accent: "#818cf8",
  },
  {
    id: "syllabus",
    title: "FROM SYLLABUS TO PLAN",
    subtitle: "Turn a massive syllabus into a clear path.",
    hierarchy: [
      { label: "Physics", sub: "Electrostatics", detail: "Electric Potential", count: "40 PYQs" },
      { label: "Chemistry", sub: "Organic", detail: "GOC", count: "35 PYQs" },
      { label: "Mathematics", sub: "Calculus", detail: "Integration", count: "50 PYQs" },
    ],
    accent: "#a78bfa",
  },
  {
    id: "planner",
    title: "YEAR → MONTH → WEEK → DAY",
    subtitle: "A planning system that adapts to your life.",
    levels: ["Year", "Month", "Week", "Day", "Task"],
    accent: "#818cf8",
  },
  {
    id: "focus",
    title: "FOCUS WITHOUT DISTRACTION",
    subtitle: "One session at a time.",
    timer: "48:32",
    subject: "Physics",
    topic: "Electrostatics",
    accent: "#22d3ee",
  },
  {
    id: "progress",
    title: "SEE YOUR CONSISTENCY",
    subtitle: "Every session becomes visible.",
    stats: [
      { label: "Study Hours", value: "142h" },
      { label: "Active Days", value: "89" },
      { label: "Streak", value: "23 days" },
      { label: "Tasks Done", value: "347" },
    ],
    accent: "#34d399",
  },
  {
    id: "tests",
    title: "MEASURE WHAT ACTUALLY WORKS",
    subtitle: "Study more intelligently, not blindly.",
    tests: [
      { name: "Mock Test #08", score: "182/200", percent: "91%" },
      { name: "Actual Test", score: "168/200", percent: "84%" },
    ],
    accent: "#f59e0b",
  },
  {
    id: "time",
    title: "WORK SHOULD CREATE LIFE",
    subtitle: "Completing planned work creates legitimate free time.",
    freeTime: "2h 14m",
    accent: "#fb923c",
  },
  {
    id: "community",
    title: "STUDY TOGETHER",
    subtitle: "Find people who are on the same journey.",
    features: ["Study Groups", "Private DMs", "Shared Goals", "Voice Notes"],
    accent: "#f472b6",
  },
  {
    id: "pro",
    title: "COMMUNITY PRO",
    subtitle: "Build your own study groups.",
    price: "₹49 / 30 Days",
    features: [
      "Create private study groups",
      "Chat privately with members",
      "Share photos and voice notes",
      "Collaborate in real time",
    ],
    accent: "#c084fc",
  },
  {
    id: "calendar",
    title: "YOUR PLAN, EVERYWHERE",
    subtitle: "Keep your schedule connected.",
    events: ["Study", "Test", "Revision", "Personal"],
    accent: "#38bdf8",
  },
  {
    id: "final",
    title: "STUDYOS",
    subtitle: "Your entire study system. In one place.",
    cta: "Enter StudyOS",
    accent: "#6366f1",
  },
];

export default function LandingExperience() {
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Simulate asset loading with progress, then reveal the scene
  useEffect(() => {
    let frame: number;
    let start = performance.now();
    const duration = 2500; // 2.5 seconds loading

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      setLoadProgress(p);
      if (p < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setLoaded(true);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Set up scroll-driven scene progression
  useEffect(() => {
    if (!loaded || !scrollRef.current || !containerRef.current) return;

    const sections = scrollRef.current;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sections,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress;
          const sceneIndex = Math.min(
            Math.floor(p * SCENE_DATA.length),
            SCENE_DATA.length - 1
          );
          setCurrentScene(sceneIndex);
        },
      });
    });

    return () => ctx.revert();
  }, [loaded]);

  return (
    <div ref={containerRef} className="relative bg-[#050510]">
      {/* Loading overlay — always mounted during load, fades out */}
      {!loaded && <LoadingScreen progress={loadProgress} />}

      {/* 3D Canvas — always rendered so it can preload behind loading screen */}
      <div
        ref={scrollRef}
        className={loaded ? "h-[1200vh] relative" : "h-screen relative"}
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Canvas
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <Suspense fallback={null}>
              <Scene3D
                progress={loadProgress}
                currentScene={currentScene}
                sceneData={SCENE_DATA}
              />
              <Environment preset="night" />
            </Suspense>
          </Canvas>

          {/* Overlay content — only interactive after loaded */}
          {loaded && (
            <>
              <Navigation
                onEnterApp={() => {
                  if (user) {
                    window.location.href = "/dashboard";
                  } else {
                    window.location.href = "/login";
                  }
                }}
                currentScene={currentScene}
                totalScenes={SCENE_DATA.length}
              />
              <SceneOverlay
                currentScene={currentScene}
                sceneData={SCENE_DATA}
                progress={currentScene / SCENE_DATA.length}
                user={user}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
