// In-app confirmations, text prompts and short status-bar messages, with a promise API so call
// sites read like the browser ones they replace:
//   if (!(await confirmDialog({ title, message, okLabel, danger, dontAskAgainKey }))) return;
//   const name = await promptDialog({ title, message, value });   // null when cancelled
// <AppDialogHost> (mounted once by App) renders the dialog; without a host (unit tests, early
// boot) the calls fall back to window.confirm / window.prompt.

let host = null;
const pending = [];
let settingsRef = { get: () => ({}), set: () => {} };

export function registerDialogHost(fn) {
  host = fn;
  if (fn) while (pending.length) fn(pending.shift());
  return () => { if (host === fn) host = null; };
}

/** Where „Nu mai întreba” answers live: settings.dontAsk = { [key]: true }. */
export function bindDialogSettings(get, set) {
  settingsRef = { get, set };
}
export const skippedConfirm = (key) => !!(key && settingsRef.get()?.dontAsk?.[key]);
export function rememberDontAsk(key) {
  if (!key) return;
  const cur = settingsRef.get()?.dontAsk || {};
  settingsRef.set({ dontAsk: { ...cur, [key]: true } });
}

/** Settings > General > Avertismente: show every „Nu mai întreba” confirmation again. */
export function resetDontAsk() {
  settingsRef.set({ dontAsk: {} });
}
export const dontAskCount = () => Object.keys(settingsRef.get()?.dontAsk || {}).length;

function open(req) {
  return new Promise((resolve) => {
    const r = { ...req, resolve };
    if (host) host(r);
    else if (typeof window !== 'undefined' && (window.confirm || window.prompt)) {
      // no host mounted: keep the old behaviour
      if (req.type === 'prompt') resolve(window.prompt?.(req.message || req.title || '', req.value ?? '') ?? null);
      else resolve(!!window.confirm?.(req.message || req.title || ''));
    } else pending.push(r);
  });
}

/** Resolves true (OK) or false (Cancel / Esc). With dontAskAgainKey a remembered „yes” skips the dialog. */
export function confirmDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts || {};
  if (skippedConfirm(o.dontAskAgainKey)) return Promise.resolve(true);
  return open({ ...o, type: 'confirm' });
}

/** Resolves the typed text, or null when cancelled. */
export function promptDialog(opts) {
  const o = typeof opts === 'string' ? { message: opts } : opts || {};
  return open({ ...o, type: 'prompt' });
}

// ---- short status-bar messages („Salvat”, „3 documente mutate”, „Compilare terminată”)
const statusSubs = new Set();
export function statusMessage(text) {
  for (const fn of statusSubs) fn(text);
}
export function onStatusMessage(fn) {
  statusSubs.add(fn);
  return () => statusSubs.delete(fn);
}
