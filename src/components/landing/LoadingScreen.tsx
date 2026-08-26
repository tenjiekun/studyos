"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LoadingScreen({ progress }: { progress: number }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="fixed inset-0 z-[100] bg-[#050510] flex flex-col items-center justify-center"
      >
        {/* Central glow */}
        <div className="relative mb-12">
          <div className="w-20 h-20 rounded-full border border-indigo-500/30 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 animate-pulse" />
          </div>
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
        </div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-2xl font-light tracking-[0.3em] text-white/90 mb-3">
            STUDYOS
          </h1>
          <p className="text-xs text-white/40 tracking-wider">
            Initializing{dots}
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="mt-12 w-48 h-[1px] bg-white/10 overflow-hidden rounded-full">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500/50 to-indigo-400/80"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.max(progress * 100, 5)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
