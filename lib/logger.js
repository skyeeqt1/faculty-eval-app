/**
 * Audit logging helper — writes entries to the `audit_logs` table.
 * Centralized so every page uses the same resilient implementation.
 */

import { supabase } from "./supabase";
import { generateUUID } from "./utils";

/**
 * Write an audit log entry. Never throws — failures are silently caught
 * so logging can never break a primary action.
 */
export async function logActivity(action, details, adminEmail = null) {
  try {
    const email =
      adminEmail ||
      sessionStorage.getItem("adminEmail") ||
      (() => {
        try {
          const raw = sessionStorage.getItem("adminSession");
          if (raw) return JSON.parse(raw)?.email;
        } catch {
          /* ignore */
        }
        return "admintest@gmail.com";
      })();

    const { error } = await supabase.from("audit_logs").insert({
      id: generateUUID(),
      action,
      adminemail: email,
      details,
      timestamp: new Date().toISOString(),
    });

    if (error) console.error("Audit log error:", error);
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
