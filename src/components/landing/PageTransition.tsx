"use client";

import { motion, AnimatePresence } from "framer-motion";

interface PageTransitionProps {
  active: boolean;
  onComplete: () => void;
}

export function PageTransition({ active, onComplete }: PageTransitionProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[200] pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={() => {
            // After exit animation, navigate
            if (!active) onComplete();
          }}
        >
          {/* Phase 1: Zoom into center with glow */}
          <motion.div
            className="absolute inset-0 bg-[#050510]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          />

          {/* Radial glow that expands from center */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.div
              className="w-4 h-4 rounded-full bg-indigo-500"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1, 50, 200],
                opacity: [0, 0.8, 0.4, 0],
              }}
              transition={{
                duration: 1.2,
                times: [0, 0.2, 0.6, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={onComplete}
            />
          </motion.div>

          {/* Flash of light at peak */}
          <motion.div
            className="absolute inset-0 bg-indigo-400/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          />

          {/* Converging light lines */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * 360;
            return (
              <motion.div
                key={i}
                className="absolute top-1/2 left-1/2 h-[1px] bg-gradient-to-r from-indigo-500/60 to-transparent origin-left"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  width: "150vmax",
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: [0, 1.2, 0],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 1.0,
                  delay: 0.3 + i * 0.03,
                  ease: "easeInOut",
                }}
              />
            );
          })}

          {/* STUDYOS text appears briefly */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.2, times: [0, 0.2, 0.6, 1], delay: 0.15 }}
          >
            <span
              className="text-4xl md:text-6xl font-extralight tracking-[0.2em] text-white/80"
              style={{ textShadow: "0 0 40px rgba(99,102,241,0.4)" }}
            >
              STUDYOS
            </span>
          </motion.div>

          {/* Ring pulse */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500/30"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, 200, "150vmax"],
              height: [0, 200, "150vmax"],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 1.0,
              delay: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
