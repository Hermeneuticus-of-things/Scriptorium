// "Raportează o problemă": sanitizing, report text, GitHub/e-mail links and the in-window
// error buffer (used directly in the browser build; in Electron errors also go to the main log).

export const REPO_ISSUES = 'https://github.com/Hermeneuticus-of-things/Scriptorium/issues/new';
export const URL_LIMIT = 7000;
export const MAINTAINER_EMAIL = ''; // empty: the e-mail button is hidden

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Removes personal data from text that goes into a report: home folder and user name → ~,
// project folders → <proiect>, API keys / tokens → [cheie ascunsă], quoted document text → [text].
export function sanitize(text, { home = '', user = '', projectDirs = [] } = {}) {
  let s = text == null ? '' : String(text);
  const dirs = [...projectDirs].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const d of dirs) {
    for (const v of new Set([d, d.replace(/\\/g, '/'), d.replace(/\//g, '\\')])) s = s.replace(new RegExp(esc(v), 'gi'), '<proiect>');
  }
  if (home && home.length > 1) {
    for (const v of new Set([home, home.replace(/\\/g, '/'), home.replace(/\//g, '\\')])) s = s.replace(new RegExp(esc(v), 'gi'), '~');
  }
  // Paths with the user folder that did not match `home` (another drive, file:// URLs).
  // A folder name may contain spaces ("C:\\Users\\Ion Popescu\\…") when a separator follows it.
  s = s.replace(/([\\/](?:Users|home)[\\/])[^\\/\n'"<>]+?(?=[\\/])/gi, '$1~');
  s = s.replace(/([\\/](?:Users|home)[\\/])(?!~[\\/])[^\\/\s'"<>]+/gi, '$1~');
  // Letter boundaries that also work for names with diacritics (\\b is ASCII-only).
  if (user && user.length > 2) s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${esc(user)}(?![\\p{L}\\p{N}_])`, 'giu'), '~');
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g, '[e-mail ascuns]');
  s = s
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [cheie ascunsă]')
    .replace(/\bsk-or-[A-Za-z0-9_-]{6,}/g, '[cheie ascunsă]')
    .replace(/\bsk-[A-Za-z0-9_-]{6,}/g, '[cheie ascunsă]')
    .replace(/\bnvapi-[A-Za-z0-9_-]{6,}/g, '[cheie ascunsă]')
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, '[cheie ascunsă]')
    .replace(/\b([A-Za-z_-]*?(?:api[_-]?key|key|token|password|parola|secret))(["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi, '$1$2[ascuns]');
  // Document text: HTML markup and long quoted strings are replaced; an error message never needs them.
  s = s.replace(/<(p|h[1-6]|li|div|span|blockquote|em|strong)\b[^>]*>[\s\S]*?<\/\1>/gi, '[text]');
  s = s.replace(/(["'„“«])([^"'„“”«»\n]{40,})(["'”»])/g, '$1[text]$3');
  return s;
}

// Errors captured in this window (browser/demo: the only log; Electron: the main log is the source).
const memory = [];
const listeners = new Set();
let lastActions = [];

export function recordError(entry) {
  const e = { time: new Date().toISOString(), process: 'renderer', kind: 'error', message: '', stack: '', ...entry };
  e.message = String(e.message || '').slice(0, 1000);
  e.stack = String(e.stack || '').slice(0, 4000);
  memory.push(e);
  if (memory.length > 200) memory.splice(0, memory.length - 200);
  for (const fn of listeners) fn(e);
  return e;
}
export const memoryErrors = () => memory.slice();
export const clearMemoryErrors = () => void memory.splice(0);
export function onMemoryError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
// Recent command ids (never document text) for the technical details.
export function noteAction(id) {
  if (!id) return;
  lastActions = [...lastActions, String(id)].slice(-15);
}
export const recentActions = () => lastActions.slice();

// window.onerror / unhandledrejection → buffer (+ Electron main log via api.logError).
export function installErrorCapture(win = window, api = null) {
  const push = (entry) => {
    const e = recordError(entry);
    try {
      api?.logError?.({ kind: e.kind, message: e.message, stack: e.stack })?.catch?.(() => {});
    } catch {
      /* the log must never throw */
    }
  };
  win.addEventListener('error', (ev) => {
    if (!ev.error && !ev.message) return; // resource load errors
    push({ kind: 'error', message: ev.message || String(ev.error), stack: ev.error?.stack || `${ev.filename || ''}:${ev.lineno || ''}` });
  });
  win.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason;
    push({ kind: 'unhandledrejection', message: r?.message || String(r), stack: r?.stack || '' });
  });
}

// Same error seen again (toast at most once per distinct error per session).
export const errorKey = (e) => `${e.process || ''}|${String(e.message || '').slice(0, 200)}`;

const DETAIL_LABELS = { version: 'Versiune', system: 'Sistem', browser: 'Browser', language: 'Limba interfeței', actions: 'Ultimele comenzi', errors: 'Erori recente', none: '(nicio eroare înregistrată)' };
export function technicalDetails({ env = {}, errors = [], actions = [], lastN = 5, privacy = {}, labels = {} }) {
  const L = { ...DETAIL_LABELS, ...labels };
  const lines = [
    `- ${L.version}: ${env.appVersion || '?'}`,
    `- ${L.system}: ${env.os || '?'}${env.arch ? ` (${env.arch})` : ''}`,
  ];
  if (env.electron || env.chrome) lines.push(`- Electron ${env.electron || '-'} · Chrome ${env.chrome || '-'}`);
  if (env.userAgent && !env.electron) lines.push(`- ${L.browser}: ${sanitize(env.userAgent, privacy)}`);
  lines.push(`- ${L.language}: ${env.language || '?'}`);
  if (actions.length) lines.push(`- ${L.actions}: ${actions.join(', ')}`);
  const last = errors.slice(-lastN);
  const errs = last.length
    ? last
        .map((e) => {
          const head = `[${e.time || ''}] ${e.process || ''}${e.kind ? ' ' + e.kind : ''}: ${sanitize(e.message, privacy)}`;
          const stack = sanitize(e.stack || '', privacy).split('\n').slice(0, 8).join('\n');
          return stack ? `${head}\n${stack}` : head;
        })
        .join('\n\n')
    : L.none;
  return `${lines.join('\n')}\n\n${L.errors}:\n\`\`\`\n${errs}\n\`\`\``;
}

export function buildReport({ what = '', before = '', details = '', labels = {} }) {
  const L = { what: 'Ce s-a întâmplat', before: 'Ce făceam înainte de problemă', details: 'Detalii tehnice', ...labels };
  const parts = [`### ${L.what}\n${what.trim() || '-'}`];
  if (before.trim()) parts.push(`### ${L.before}\n${before.trim()}`);
  parts.push(`### ${L.details}\n${details}`);
  return parts.join('\n\n');
}

export function reportTitle(what, fallback = 'Problemă raportată din aplicație') {
  const first = String(what || '').trim().split('\n')[0].replace(/\s+/g, ' ');
  return first ? (first.length > 80 ? first.slice(0, 79) + '…' : first) : fallback;
}

// GitHub "new issue" link; the body is cut (on a line boundary when possible) so the whole URL
// stays under `limit` characters, with a note that the full report is in the clipboard.
export function buildIssueUrl(title, body, { limit = URL_LIMIT, base = REPO_ISSUES, note = '\n\n…(raport scurtat — lipește aici restul, copiat automat în clipboard)' } = {}) {
  const whole = (b) => (/[\uD800-\uDBFF]$/.test(b) ? b.slice(0, -1) : b);
  const mk = (b) => `${base}?title=${encodeURIComponent(title)}&labels=bug&body=${encodeURIComponent(b)}`;
  let url = mk(body);
  if (url.length <= limit) return { url, truncated: false };
  let lo = 0;
  let hi = body.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (mk(whole(body.slice(0, mid)) + note).length <= limit) lo = mid;
    else hi = mid - 1;
  }
  // Never split a surrogate pair; prefer a line end.
  let cut = whole(body.slice(0, lo));
  const nl = cut.lastIndexOf('\n');
  if (nl > cut.length * 0.6) cut = cut.slice(0, nl);
  url = mk(cut + note);
  return { url, truncated: true };
}

export function buildMailto(email, title, body, limit = 1800) {
  const b = body.length > limit ? body.slice(0, limit) + '\n…' : body;
  return `mailto:${email}?subject=${encodeURIComponent('[Scribner] ' + title)}&body=${encodeURIComponent(b)}`;
}
