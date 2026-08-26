"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface SceneOverlayProps {
  currentScene: number;
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

function HeroScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h1
        {...fadeUp(0)}
        className="text-6xl md:text-8xl lg:text-9xl font-extralight tracking-[0.15em] text-white mb-6"
        style={{ textShadow: "0 0 80px rgba(99,102,241,0.3)" }}
      >
        {data.title}
      </motion.h1>
      <motion.p
        {...fadeUp(0.2)}
        className="text-lg md:text-xl text-white/60 font-light tracking-wider max-w-lg"
      >
        {data.subtitle}
      </motion.p>
      {data.tagline && (
        <motion.p
          {...fadeUp(0.4)}
          className="mt-4 text-sm text-white/30 tracking-[0.25em] uppercase"
        >
          {data.tagline}
        </motion.p>
      )}
      <motion.div
        {...fadeUp(0.6)}
        className="mt-16 flex flex-col items-center gap-2"
      >
        <p className="text-xs text-white/20 tracking-widest">SCROLL TO EXPLORE</p>
        <div className="w-[1px] h-8 bg-gradient-to-b from-white/20 to-transparent animate-pulse" />
      </motion.div>
    </div>
  );
}

function YearScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-5xl md:text-7xl font-extralight tracking-[0.12em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider">
        {data.subtitle}
      </motion.p>
      {data.months && (
        <motion.div
          {...fadeUp(0.3)}
          className="flex flex-wrap justify-center gap-3 max-w-2xl"
        >
          {data.months.map((month, i) => (
            <motion.div
              key={month}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm flex items-center justify-center hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-300 cursor-default"
            >
              <span className="text-xs text-white/50 tracking-wider">{month}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function SyllabusScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider max-w-md">
        {data.subtitle}
      </motion.p>
      {data.hierarchy && (
        <div className="flex flex-col md:flex-row gap-6 max-w-4xl">
          {data.hierarchy.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="text-left space-y-3">
                <div className="text-indigo-400 text-xs tracking-widest uppercase">{item.label}</div>
                <div className="text-white/80 text-sm">{item.sub}</div>
                <div className="text-white/40 text-xs">{item.detail}</div>
                <div className="pt-2 border-t border-white/[0.06]">
                  <span className="text-white/60 text-xs font-medium">{item.count}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlannerScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  const levels = data.levels ?? [];
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider max-w-md">
        {data.subtitle}
      </motion.p>
      {levels.length > 0 && (
        <motion.div {...fadeUp(0.3)} className="flex items-center gap-2 md:gap-4">
          {levels.map((level, i) => (
            <div key={level} className="flex items-center gap-2 md:gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/[0.04] border border-indigo-500/20 flex items-center justify-center"
              >
                <span className="text-xs text-white/60 tracking-wider">{level}</span>
              </motion.div>
              {i < levels.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.35 + i * 0.12, duration: 0.3 }}
                  className="w-6 md:w-10 h-[1px] bg-gradient-to-r from-indigo-500/40 to-indigo-500/10"
                />
              )}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function FocusScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-12"
      >
        {data.title}
      </motion.h2>
      <motion.div {...fadeUp(0.2)} className="relative mb-6">
        <div className="text-7xl md:text-9xl font-extralight text-cyan-300/80 tracking-wider"
          style={{ textShadow: "0 0 60px rgba(34,211,238,0.2)" }}
        >
          {data.timer}
        </div>
        <div className="absolute -inset-12 bg-cyan-500/5 blur-3xl rounded-full" />
      </motion.div>
      <motion.p {...fadeUp(0.35)} className="text-white/50 text-sm tracking-wider">
        {data.subject} — {data.topic}
      </motion.p>
      <motion.p {...fadeUp(0.45)} className="mt-8 text-white/30 text-xs tracking-[0.2em]">
        {data.subtitle}
      </motion.p>
    </div>
  );
}

function ProgressScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider">
        {data.subtitle}
      </motion.p>
      {data.stats && (
        <motion.div {...fadeUp(0.3)} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
          {data.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 backdrop-blur-sm"
            >
              <div className="text-2xl md:text-3xl font-light text-emerald-400/80 mb-1">{stat.value}</div>
              <div className="text-xs text-white/40 tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function TestsScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider max-w-md">
        {data.subtitle}
      </motion.p>
      {data.tests && (
        <motion.div {...fadeUp(0.3)} className="flex flex-col md:flex-row gap-6 max-w-lg">
          {data.tests.map((test, i) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="text-xs text-amber-400/60 tracking-widest uppercase mb-4">{test.name}</div>
              <div className="text-3xl font-light text-white/80 mb-1">{test.score}</div>
              <div className="text-lg text-amber-400/70">{test.percent}</div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function TimeScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider max-w-md">
        {data.subtitle}
      </motion.p>
      {data.freeTime && (
        <motion.div {...fadeUp(0.3)} className="relative">
          <div className="text-6xl md:text-8xl font-extralight text-orange-300/80 tracking-wider"
            style={{ textShadow: "0 0 60px rgba(251,146,60,0.15)" }}
          >
            {data.freeTime}
          </div>
          <div className="mt-4 text-sm text-white/40 tracking-[0.2em]">FREE TIME</div>
          <div className="absolute -inset-16 bg-orange-500/5 blur-3xl rounded-full" />
        </motion.div>
      )}
    </div>
  );
}

function CommunityScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider">
        {data.subtitle}
      </motion.p>
      {data.features && (
        <motion.div {...fadeUp(0.3)} className="flex flex-wrap justify-center gap-3 max-w-xl">
          {data.features.map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="px-5 py-3 bg-white/[0.03] border border-pink-500/15 rounded-xl backdrop-blur-sm"
            >
              <span className="text-sm text-white/60">{feature}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ProScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-2"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.1)} className="text-sm text-white/40 mb-8 tracking-wider">
        {data.subtitle}
      </motion.p>
      <motion.div
        {...fadeUp(0.2)}
        className="text-3xl md:text-4xl font-light text-purple-300/80 mb-8"
      >
        {data.price}
      </motion.div>
      {data.features && (
        <motion.div {...fadeUp(0.3)} className="space-y-3 mb-8">
          {data.features.map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
              <span className="text-sm text-white/50">{feature}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
      <motion.p {...fadeUp(0.5)} className="text-xs text-white/25 tracking-wider">
        One-time payment · No automatic renewal
      </motion.p>
    </div>
  );
}

function CalendarScene({ data }: { data: NonNullable<SceneOverlayProps["sceneData"][number]> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h2
        {...fadeUp(0)}
        className="text-4xl md:text-6xl font-extralight tracking-[0.1em] text-white mb-4"
      >
        {data.title}
      </motion.h2>
      <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 mb-12 tracking-wider">
        {data.subtitle}
      </motion.p>
      {data.events && (
        <motion.div {...fadeUp(0.3)} className="flex flex-wrap justify-center gap-3">
          {data.events.map((event, i) => {
            const colors = ["bg-sky-500/15 text-sky-300/70 border-sky-500/20", "bg-amber-500/15 text-amber-300/70 border-amber-500/20", "bg-emerald-500/15 text-emerald-300/70 border-emerald-500/20", "bg-violet-500/15 text-violet-300/70 border-violet-500/20"];
            return (
              <motion.div
                key={event}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className={`px-5 py-3 border rounded-xl backdrop-blur-sm ${colors[i % colors.length]}`}
              >
                <span className="text-sm">{event}</span>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function FinalScene({ data, user }: { data: NonNullable<SceneOverlayProps["sceneData"][number]>; user?: { id: string } | null }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <motion.h1
        {...fadeUp(0)}
        className="text-6xl md:text-8xl lg:text-9xl font-extralight tracking-[0.15em] text-white mb-6"
        style={{ textShadow: "0 0 80px rgba(99,102,241,0.3)" }}
      >
        {data.title}
      </motion.h1>
      <motion.p
        {...fadeUp(0.2)}
        className="text-lg md:text-xl text-white/60 font-light tracking-wider max-w-lg mb-12"
      >
        {data.subtitle}
      </motion.p>
      <motion.div {...fadeUp(0.4)} className="flex flex-col sm:flex-row gap-4">
        <Link
          href={user ? "/dashboard" : "/login"}
          className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
        >
          {data.cta || "Enter StudyOS"}
        </Link>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="px-8 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white/60 text-sm rounded-xl border border-white/10 transition-all duration-300"
        >
          Explore Again
        </button>
      </motion.div>
    </div>
  );
}

const SCENE_COMPONENTS: Record<string, React.FC<{ data: SceneOverlayProps["sceneData"][number]; user?: { id: string } | null | undefined }>> = {
  hero: HeroScene,
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
  final: FinalScene,
};

export function SceneOverlay({ currentScene, sceneData, progress, user }: SceneOverlayProps) {
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
            transition={{ duration: 0.5 }}
            className="h-screen w-full"
          >
            {SceneComponent ? (
              <SceneComponent data={data} user={user} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <motion.h2 {...fadeUp(0)} className="text-4xl md:text-6xl font-extralight text-white mb-4">
                  {data.title}
                </motion.h2>
                <motion.p {...fadeUp(0.15)} className="text-sm text-white/40 tracking-wider max-w-md">
                  {data.subtitle}
                </motion.p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress indicator at bottom */}
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
