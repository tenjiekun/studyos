"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SceneOverlayProps {
  currentScene: number;
  onEnterApp?: () => void;
  sceneData: Array<{
    id: string;
    title: string;
    subtitle: string;
    tagline?: string;
    months?: string[];
    hierarchy?: Array<{ label: string; sub: string; detail: string; count: string }>;
    levels?: string[];
    timer?: string;
    subject?: string;
    topic?: string;
    stats?: Array<{ label: string; value: string }>;
    tests?: Array<{ name: string; score: string; percent: string }>;
    freeTime?: string;
    features?: string[];
    price?: string;
    events?: string[];
    cta?: string;
    accent?: string;
  }>;
  progress: number;
  user: { id: string } | null;
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  };
}

function HeroScene({ data, onEnterApp }: { data: NonNullable<SceneOverlayProps["sceneData"][number]>; onEnterApp?: () => void }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      {/* Left side — text content */}
      <div className="flex-1 max-w-xl z-10">
        <motion.h1
          {...fadeUp(0)}
          className="text-5xl md:text-7xl lg:text-8xl font-extralight tracking-[0.08em] text-white leading-tight mb-4"
        >
          {data.title}
        </motion.h1>
        <motion.h2
          {...fadeUp(0.15)}
          className="text-2xl md:text-3xl lg:text-4xl font-light text-white/80 leading-snug mb-6"
        >
          {data.subtitle}
        </motion.h2>
        {data.tagline && (
          <motion.p
            {...fadeUp(0.3)}
            className="text-sm md:text-base text-white/40 tracking-[0.15em] mb-10"
          >
            {data.tagline}
          </motion.p>
        )}
        <motion.div
          {...fadeUp(0.45)}
          className="flex items-center gap-4"
        >
          <button
            onClick={onEnterApp}
            className="px-7 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center gap-2"
          >
            Enter StudyOS
            <span className="text-lg">→</span>
          </button>
          <button
            onClick={() => window.scrollTo({ top: window.innerHeight * 1.2, behavior: "smooth" })}
            className="px-6 py-3 text-white/50 hover:text-white/80 text-sm flex items-center gap-2 transition-colors duration-300"
          >
            <span className="text-xs">▶</span>
            Explore the System
          </button>
        </motion.div>
        <motion.div
          {...fadeUp(0.65)}
          className="mt-16 flex items-center gap-2 text-white/20"
        >
          <p className="text-[10px] tracking-[0.2em] uppercase">Scroll to explore</p>
          <div className="w-[1px] h-5 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
        </motion.div>
      </div>
    </div>
  );
}

function YearScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-2xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-indigo-400/60 tracking-[0.3em] uppercase mb-3">
          — YOUR YEAR
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-6xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          See your entire year at once.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Visualize. Organize. Own your journey.
        </motion.p>
        {data.months && (
          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-wrap gap-2 max-w-xl"
          >
            {data.months.map((month, i) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                className={`w-14 h-16 md:w-16 md:h-18 rounded-lg flex flex-col items-center justify-center transition-all duration-300 cursor-default ${
                  i === 4
                    ? "bg-indigo-500/20 border border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-[10px] text-white/30 tracking-wider">{month.slice(0, 3)}</span>
                <span className={`text-xs mt-0.5 ${i === 4 ? "text-indigo-300" : "text-white/50"}`}>{month}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SyllabusScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  const hierarchy = data.hierarchy ?? [];
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-3xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-purple-400/60 tracking-[0.3em] uppercase mb-3">
          — SYLLABUS
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          From syllabus to a clear path.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Break it down. Build it up.
        </motion.p>
        {hierarchy.length > 0 && (
          <motion.div {...fadeUp(0.3)} className="flex items-center gap-3 flex-wrap max-w-2xl">
            {hierarchy.map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.15, duration: 0.4 }}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3 backdrop-blur-sm"
                >
                  <div className="text-white/70 text-sm font-medium">{item.label}</div>
                  <div className="text-white/30 text-xs mt-1">{item.count}</div>
                </motion.div>
                {i < hierarchy.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.4 + i * 0.15, duration: 0.3 }}
                    className="w-8 h-[1px] bg-gradient-to-r from-purple-500/40 to-purple-500/10"
                  />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PlannerScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  const levels = data.levels ?? [];
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-3xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-blue-400/60 tracking-[0.3em] uppercase mb-3">
          — PLANNER
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          Year → Month → Week → Day
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          A planning system that adapts to your life.
        </motion.p>
        {levels.length > 0 && (
          <motion.div {...fadeUp(0.3)} className="flex items-center gap-3">
            {levels.map((level, i) => (
              <div key={level} className="flex items-center gap-3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/[0.04] border border-blue-500/20 flex items-center justify-center"
                >
                  <span className="text-xs text-white/60 tracking-wider">{level}</span>
                </motion.div>
                {i < levels.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.35 + i * 0.1, duration: 0.25 }}
                    className="w-6 h-[1px] bg-blue-500/30"
                  />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FocusScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-2xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-cyan-400/60 tracking-[0.3em] uppercase mb-3">
          — FOCUS
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          Focus without distraction.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          One session at a time.
        </motion.p>
        <motion.div {...fadeUp(0.3)} className="relative">
          <div className="text-7xl md:text-8xl font-extralight text-cyan-300/70 tracking-wider"
            style={{ textShadow: "0 0 60px rgba(34,211,238,0.15)" }}
          >
            {data.timer}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-white/50 text-sm">{data.subject}</span>
            <span className="text-white/20">—</span>
            <span className="text-white/30 text-sm">{data.topic}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProgressScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-3xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-emerald-400/60 tracking-[0.3em] uppercase mb-3">
          — PROGRESS
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          See your consistency.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Every session becomes visible.
        </motion.p>
        {data.stats && (
          <motion.div {...fadeUp(0.3)} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-xl">
            {data.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="text-2xl font-light text-emerald-400/80 mb-1">{stat.value}</div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TestsScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-2xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-amber-400/60 tracking-[0.3em] uppercase mb-3">
          — TESTS
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          Measure what actually works.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Analyze. Improve. Perform.
        </motion.p>
        {data.tests && (
          <motion.div {...fadeUp(0.3)} className="flex gap-4">
            {data.tests.map((test, i) => (
              <motion.div
                key={test.name}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 backdrop-blur-sm"
              >
                <div className="text-[10px] text-amber-400/50 tracking-widest uppercase mb-3">{test.name}</div>
                <div className="text-2xl font-light text-white/80 mb-1">{test.score}</div>
                <div className="text-sm text-amber-400/60">{test.percent}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function TimeScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-2xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-orange-400/60 tracking-[0.3em] uppercase mb-3">
          — TIME
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          Work should create life.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Plan your time. Earn your free time.
        </motion.p>
        {data.freeTime && (
          <motion.div {...fadeUp(0.3)} className="relative">
            <div className="text-6xl md:text-7xl font-extralight text-orange-300/70 tracking-wider"
              style={{ textShadow: "0 0 50px rgba(251,146,60,0.1)" }}
            >
              {data.freeTime}
            </div>
            <div className="mt-2 text-sm text-white/40 tracking-wider">Free Time</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CommunityScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-2xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-pink-400/60 tracking-[0.3em] uppercase mb-3">
          — COMMUNITY
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          Study together. Grow together.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Groups. Chats. Voice. Share. Achieve.
        </motion.p>
        {data.features && (
          <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-3">
            {data.features.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                className="px-5 py-2.5 bg-white/[0.04] border border-pink-500/15 rounded-lg backdrop-blur-sm"
              >
                <span className="text-sm text-white/60">{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ProScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-purple-400/60 tracking-[0.3em] uppercase mb-3">
          — COMMUNITY PRO
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          {data.subtitle}
        </motion.h2>
        <motion.div
          {...fadeUp(0.2)}
          className="text-2xl md:text-3xl font-light text-purple-300/70 mb-8"
        >
          {data.price}
        </motion.div>
        {data.features && (
          <motion.div {...fadeUp(0.3)} className="space-y-3 mb-6">
            {data.features.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06, duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50" />
                <span className="text-sm text-white/50">{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
        <motion.p {...fadeUp(0.5)} className="text-xs text-white/25 tracking-wider">
          One-time payment · No automatic renewal
        </motion.p>
      </div>
    </div>
  );
}

function CalendarScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
      <div className="flex-1 max-w-2xl z-10">
        <motion.p {...fadeUp(0)} className="text-xs text-sky-400/60 tracking-[0.3em] uppercase mb-3">
          — CALENDAR
        </motion.p>
        <motion.h2
          {...fadeUp(0.1)}
          className="text-4xl md:text-5xl font-extralight tracking-[0.08em] text-white mb-3 leading-tight"
        >
          Your plan, everywhere.
        </motion.h2>
        <motion.p {...fadeUp(0.2)} className="text-sm text-white/40 mb-10 tracking-wider">
          Sync. Schedule. Stay on track.
        </motion.p>
        {data.events && (
          <motion.div {...fadeUp(0.3)} className="flex flex-wrap gap-3">
            {data.events.map((event, i) => {
              const colors = [
                "bg-sky-500/15 text-sky-300/70 border-sky-500/20",
                "bg-amber-500/15 text-amber-300/70 border-amber-500/20",
                "bg-emerald-500/15 text-emerald-300/70 border-emerald-500/20",
                "bg-violet-500/15 text-violet-300/70 border-violet-500/20",
              ];
              return (
                <motion.div
                  key={event}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                  className={`px-5 py-2.5 border rounded-lg backdrop-blur-sm ${colors[i % colors.length]}`}
                >
                  <span className="text-sm">{event}</span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FinalScene({ data, onEnterApp }: { data: NonNullable<SceneOverlayProps["sceneData"][number]>; onEnterApp?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h1
        {...fadeUp(0)}
        className="text-5xl md:text-7xl lg:text-8xl font-extralight tracking-[0.1em] text-white mb-4"
        style={{ textShadow: "0 0 60px rgba(99,102,241,0.25)" }}
      >
        {data.title}
      </motion.h1>
      <motion.p
        {...fadeUp(0.15)}
        className="text-lg text-white/50 font-light tracking-wider max-w-lg mb-3"
      >
        Your entire study system. In one place.
      </motion.p>
      <motion.p
        {...fadeUp(0.25)}
        className="text-sm text-white/30 tracking-[0.2em] mb-10"
      >
        Plan it. Focus on it. Finish it.
      </motion.p>
      <motion.div {...fadeUp(0.35)} className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onEnterApp}
          className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center gap-2"
        >
          Enter StudyOS
          <span>→</span>
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="px-8 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white/50 text-sm rounded-xl border border-white/10 transition-all duration-300 flex items-center gap-2"
        >
          <span className="text-xs">▶</span>
          Explore Again
        </button>
      </motion.div>
    </div>
  );
}

const SCENE_COMPONENTS: Record<string, React.FC<{ data: SceneOverlayProps["sceneData"][number]; onEnterApp?: () => void; user?: { id: string } | null | undefined }>> = {
  hero: HeroScene as React.FC<{ data: SceneOverlayProps["sceneData"][number]; onEnterApp?: () => void; user?: { id: string } | null | undefined }>,
  year: YearScene,
  syllabus: SyllabusScene,
  planner: PlannerScene,
  focus: FocusScene,
  progress: ProgressScene,
  tests: TestsScene,
  time: TimeScene,
  community: CommunityScene,
  pro: ProScene,
  calendar: CalendarScene,
  final: FinalScene as React.FC<{ data: SceneOverlayProps["sceneData"][number]; onEnterApp?: () => void; user?: { id: string } | null | undefined }>,
};

export function SceneOverlay({ currentScene, sceneData, progress, user, onEnterApp }: SceneOverlayProps) {
  const data = sceneData[currentScene];
  if (!data) return null;

  const SceneComponent = SCENE_COMPONENTS[data.id];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={data.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-screen w-full"
          >
            {SceneComponent ? (
              <SceneComponent data={data} user={user} onEnterApp={onEnterApp} />
            ) : (
              <div className="flex items-center h-full px-6 md:px-16 lg:px-24">
                <div className="z-10">
                  <motion.h2 {...fadeUp(0)} className="text-4xl md:text-5xl font-extralight text-white mb-4">
                    {data.title}
                  </motion.h2>
                  <motion.p {...fadeUp(0.1)} className="text-sm text-white/40 tracking-wider max-w-md">
                    {data.subtitle}
                  </motion.p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Scene progress dots — bottom center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        {sceneData.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
              i === currentScene
                ? "bg-white/60 scale-125"
                : "bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
