'use client'
import { useEffect } from "react";
import { cn } from "../../lib/utils";

/**
 * Premium accessible modal shell with glass morphism backdrop.
 * Handles Escape-to-close and backdrop click.
 */
export default function Modal({ open, onClose, children, className, dismissable = true }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && dismissable) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Premium glass backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/30 dark:bg-black/50 backdrop-blur-xl animate-fade-in"
        onClick={dismissable ? onClose : undefined}
        aria-hidden="true"
      />
      {/* Content panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-sm card-glass p-8 text-center shadow-elevated animate-pop-in",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Standard confirmation dialog with Cancel/Confirm actions.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onCancel,
  confirmDisabled = false,
  children,
}) {
  return (
    <Modal open={open} onClose={onCancel} dismissable={!confirmDisabled}>
      {children}
      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight">{title}</h3>
      {message && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onCancel} disabled={confirmDisabled} className="btn btn-ghost py-3.5 text-sm font-bold">
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={cn(
            "py-3.5 text-sm font-bold rounded-xl text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
            tone === "danger"
              ? "bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30"
              : "btn-primary"
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
