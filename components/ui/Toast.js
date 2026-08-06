'use client'
import { useEffect } from "react";
import { cn } from "../../lib/utils";

const VARIANT_STYLES = {
  success: "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30",
  danger: "bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/30",
  warning: "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30",
  info: "brand-gradient shadow-indigo-500/30",
};

/**
 * Premium centered floating toast message with glass-feel and auto-dismiss.
 */
export default function Toast({ show, message = "", variant = "info", onClose, duration = 2500 }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed top-8 left-1/2 -translate-x-1/2 z-[5000] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-pop-in",
        "text-white text-xs font-bold tracking-wide",
        "backdrop-blur-sm",
        VARIANT_STYLES[variant] || VARIANT_STYLES.info
      )}
    >
      {variant === 'success' && (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {variant === 'danger' && (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}
