'use client'
import { cn } from "../../lib/utils";

/**
 * Premium loading spinner with optional label and smooth animation.
 */
export default function Spinner({ label = "Loading", fullScreen = false, className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-[0.3em]",
        fullScreen && "min-h-screen page-bg",
        className
      )}
    >
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full" />
        <div className="absolute inset-0 border-[3px] border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
      {label && <span>{label}</span>}
    </div>
  );
}
