'use client'
import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

export const THEMES = ["light", "dark", "system"];

export function getStoredTheme() {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem("faculty-eval-theme") || "system";
}

export function resolveTheme(theme) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme, resolved } }));
}

export function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}

/**
 * Premium light/dark/system theme toggle with smooth micro-interactions.
 * Cycles light -> dark -> system.
 */
export default function ThemeToggle({ className }) {
  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onMediaChange);
    return () => mq.removeEventListener("change", onMediaChange);
  }, []);

  const cycle = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    localStorage.setItem("faculty-eval-theme", next);
    applyTheme(next);
  };

  const labels = { light: "Light mode", dark: "Dark mode", system: "System theme" };

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${labels[theme]} — click to switch`}
      aria-label={`Theme: ${labels[theme]}`}
      className={cn(
        "relative w-14 h-8 rounded-full border transition-all duration-300 flex items-center shrink-0",
        "hover:scale-105 active:scale-95",
        theme === "dark"
          ? "bg-slate-800 border-slate-700 shadow-inner"
          : "bg-indigo-100 border-indigo-200 shadow-sm",
        className
      )}
    >
      {/* Sun icon */}
      <span className={cn(
        "absolute left-2 transition-all duration-300",
        theme === "dark" ? "opacity-0 scale-75" : "opacity-100 scale-100 text-amber-500"
      )}>
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.21-5.05H17a1 1 0 100-2h-1a1 1 0 100 2zm-2.21-5.05a1 1 0 001.414 0l.707-.707a1 1 0 00-1.414-1.414l-.707.707a1 1 0 000 1.414zM10 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-5.95-2.05a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM3 10a1 1 0 100-2H2a1 1 0 100 2h1zm4.535-4.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </span>
      {/* Moon icon */}
      <span className={cn(
        "absolute right-2 transition-all duration-300",
        theme === "dark" ? "opacity-100 scale-100 text-indigo-300" : "opacity-0 scale-75"
      )}>
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>
      {/* Knob */}
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-7 h-7 rounded-full shadow-md transition-all duration-300 ease-out",
          theme === "dark"
            ? "translate-x-6 bg-slate-200"
            : theme === "system"
            ? "translate-x-3 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30"
            : "translate-x-0 bg-white border border-indigo-100"
        )}
      />
    </button>
  );
}
