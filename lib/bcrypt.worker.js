/**
 * bcrypt worker thread.
 * bcryptjs hashing/compare are CPU-bound and would normally block the
 * main thread for hundreds of ms on low-end mobile devices. Running them
 * in a Web Worker keeps the UI responsive. This file is bundled by webpack
 * and never executed on the main thread.
 */
import bcrypt from "bcryptjs";

self.onmessage = async (event) => {
  const { id, action, payload } = event.data;

  const respond = (result) => self.postMessage({ id, result });
  const fail = (error) => self.postMessage({ id, error: String(error) });

  try {
    if (action === "hash") {
      const hash = await bcrypt.hash(payload.password, payload.rounds || 10);
      respond(hash);
    } else if (action === "compare") {
      const ok = await bcrypt.compare(payload.password, payload.hash);
      respond(ok);
    } else {
      fail("Unknown action");
    }
  } catch (e) {
    fail(e);
  }
};