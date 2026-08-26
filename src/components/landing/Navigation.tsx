"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  "Plan",
  "Focus",
  "Progress",
  "Community",
];

interface NavigationProps {
  onEnterApp: () => void;
  currentScene: number;
  totalScenes: number;
}

export function Navigation({ onEnterApp, currentScene, totalScenes }: NavigationProps) {
  const [visible, setVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/60 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
          </div>
          <span className="text-sm font-medium tracking-wider text-white/90">
            STUDYOS
          </span>
        </div>

        {/* Nav items */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white/90 transition-colors rounded-lg hover:bg-white/5"
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Enter button */}
        <button
          onClick={onEnterApp}
          className="px-4 py-1.5 text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all duration-300 hover:border-white/20"
        >
          Enter StudyOS
        </button>
      </div>
    </motion.header>
  );
}
