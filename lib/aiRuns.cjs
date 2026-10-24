'use strict';
// AI requests in flight per window, so the user can cancel them and a hung provider
// (e.g. a local server that never answers) cannot keep a panel busy forever.

// Romanian count of seconds: "1 secundă", "2–19 secunde", "20 de secunde" (and so on: the last two
// digits 01–19 take no "de").
function secondsRo(n) {
  if (n === 1) return '1 secundă';
  const r = n % 100;
  return n < 20 || (r >= 1 && r <= 19) ? `${n} secunde` : `${n} de secunde`;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const runs = new Map(); // owner id (webContents id) -> Set<AbortController>

/**
 * Runs `fn(signal)` registered under `owner`. It is aborted by cancel(owner) or after
 * `timeoutMs`; either way the caller gets a clear Romanian error instead of a hang.
 */
async function track(owner, fn, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  let why = '';
  const timer = setTimeout(() => {
    why = 'timeout';
    ctrl.abort();
  }, timeoutMs);
  if (!runs.has(owner)) runs.set(owner, new Set());
  runs.get(owner).add(ctrl);
  ctrl.signal.addEventListener('abort', () => {
    if (!why) why = 'cancel';
  });
  try {
    return await fn(ctrl.signal);
  } catch (err) {
    if (why === 'timeout') throw new Error(`Cererea AI a depășit ${secondsRo(Math.round(timeoutMs / 1000))} și a fost oprită. Verifică serverul sau modelul și încearcă din nou.`);
    if (why === 'cancel') throw new Error('Cererea AI a fost anulată.');
    throw err;
  } finally {
    clearTimeout(timer);
    const set = runs.get(owner);
    if (set) {
      set.delete(ctrl);
      if (!set.size) runs.delete(owner);
    }
  }
}

/** Aborts every AI request of `owner`; returns how many were running. */
function cancel(owner) {
  const set = runs.get(owner);
  if (!set) return 0;
  for (const c of set) c.abort();
  return set.size;
}

module.exports = { track, cancel, secondsRo, DEFAULT_TIMEOUT_MS };
