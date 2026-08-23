"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "dark",
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    function resolve(theme: Theme) {
      if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return theme;
    }
    const resolved = resolve(settings.theme);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.classList.toggle("light", resolved === "light");
  }, [settings.theme]);

  useEffect(() => {
    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const resolved = mq.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.classList.toggle("light", resolved === "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: settings.theme,
        setTheme: (t) => updateSettings({ theme: t }),
        resolvedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
