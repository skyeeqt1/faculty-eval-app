/**
 * Shared utility helpers used across web + mobile.
 */

import { clsx } from "clsx";

/** Merge conditional class names (Tailwind-friendly) */
export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Generate a v4 UUID without relying on crypto.randomUUID
 * (keeps consistent behaviour across web views & Capacitor webviews).
 */
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Format a timestamp for the Philippines locale with compact options */
export function formatTimestamp(ts) {
  if (!ts) return "---";
  const date = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(date.getTime())) return "---";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Generate a secure temporary password from an unambiguous charset */
export function generateTempPassword(length = 8) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  const randomValues = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  }
  for (let i = 0; i < length; i++) {
    // Deterministic-safe fallback when crypto is unavailable
    const seed = randomValues[i] || Math.floor(Math.random() * 0xffffffff);
    password += charset.charAt(seed % charset.length);
  }
  return password;
}

/** Normalize an email for storage/comparison */
export function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

/** Simple client-side JSON parse helper with a fallback */
export function safeParse(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return [value];
    }
  }
  return fallback;
}

/** Parse an object that may be stored as a JSON string (e.g. subjectblocks) */
export function safeParseObject(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
