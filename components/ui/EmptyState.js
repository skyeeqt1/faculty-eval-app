'use client'
import { cn } from "../../lib/utils";

/**
 * Premium empty state placeholder with glass icon container.
 */
export default function EmptyState({
  icon = "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  title = "No data found",
  subtitle,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 gap-4 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 flex items-center justify-center text-indigo-400 dark:text-indigo-300 shadow-sm border border-indigo-100/50 dark:border-indigo-500/10">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mt-1.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Compact table variant */
export function TableEmpty({ colSpan, ...props }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <EmptyState {...props} />
      </td>
    </tr>
  );
}

/** Premium badge / pill */
export function Badge({ children, tone = "indigo", className }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    rose: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
    amber: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    slate: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };
  return (
    <span className={cn("badge", tones[tone], className)}>
      {children}
    </span>
  );
}
