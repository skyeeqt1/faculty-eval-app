/**
 * Promise-based bcrypt helpers that run on a Web Worker thread,
 * keeping the UI responsive on mobile devices.
 *
 * Falls back to the synchronous implementation if Worker creation
 * fails (e.g. restrictive webviews), so login never breaks.
 */
import bcrypt from "bcryptjs";

let worker = null;

function getWorker() {
  if (typeof window === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./bcrypt.worker.js", import.meta.url));
    worker.addEventListener("error", () => {
      worker.terminate();
      worker = null;
    });
  } catch (e) {
    worker = null;
  }
  return worker;
}

function runInWorker(action, payload) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    if (!w) {
      // Fallback: synchronous bcryptjs (still works, just blocks briefly)
      if (action === "hash") {
        resolve(bcrypt.hashSync(payload.password, payload.rounds || 10));
      } else {
        resolve(bcrypt.compareSync(payload.password, payload.hash));
      }
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const onMessage = (e) => {
      if (e.data && e.data.id === id) {
        w.removeEventListener("message", onMessage);
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data.result);
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, action, payload });
  });
}

/** Async bcrypt hash (cost 10 by default) — non-blocking */
export function hashPassword(password, rounds = 10) {
  return runInWorker("hash", { password, rounds });
}

/** Async bcrypt compare — non-blocking */
export function comparePassword(password, hash) {
  return runInWorker("compare", { password, hash });
}
