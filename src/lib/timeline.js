// Timeline (Cronologie): scenes placed on a time axis using custom metadata fields
// (node.custom) or "Data: ..." style lines in the synopsis. Pure module.
import { sceneNodes } from './scenes.js';

const FIELD_ALIASES = {
  date: ['data', 'date', 'dată', 'ziua', 'zi', 'când', 'cand', 'timp', 'time', 'moment'],
  time: ['ora', 'oră', 'hour', 'time of day'],
  duration: ['durata', 'durată', 'duration', 'durează'],
  pov: ['pov', 'punct de vedere', 'narator', 'perspectivă', 'perspectiva', 'personaj pov'],
  location: ['loc', 'locul', 'locație', 'locatie', 'location', 'setting', 'decor', 'oraș', 'oras'],
};

const norm = (s) => String(s || '').trim().toLocaleLowerCase('ro-RO');

function findField(obj, kind) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (FIELD_ALIASES[kind].includes(norm(k)) && v !== '' && v != null) return String(v);
  }
  return '';
}

/** Parses "Data: 1999-03-02", "POV: Ana" lines out of a synopsis. */
export function synopsisFields(synopsis) {
  const out = {};
  for (const line of String(synopsis || '').split(/\n|;/)) {
    const m = /^\s*([^:]{1,30}):\s*(.+?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** Returns minutes since epoch-ish (sortable number) or null. Accepts ISO, dd.mm.yyyy, "Ziua 3". */
export function parseWhen(date, time) {
  let t = null;
  const d = String(date || '').trim();
  let m;
  if ((m = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(d))) {
    t = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) / 60000;
  } else if ((m = /^(\d{1,2})[./](\d{1,2})[./](-?\d{1,6})/.exec(d))) {
    t = Date.UTC(+m[3], +m[2] - 1, +m[1]) / 60000;
  } else if ((m = /^(?:ziua|day|z)\s*(-?\d+)/i.exec(d))) {
    t = (+m[1]) * 1440;
  } else if ((m = /^-?\d+(\.\d+)?$/.exec(d))) {
    t = Number(d) * 1440;
  }
  if (t == null) return null;
  const tm = /(\d{1,2})[:.h](\d{2})/.exec(String(time || ''));
  if (tm) t += (+tm[1]) * 60 + (+tm[2]);
  return t;
}

/** Duration in minutes: "2h", "30 min", "3 zile", "1d 4h", bare number = minutes. */
export function parseDuration(s) {
  const str = norm(s);
  if (!str) return 0;
  let total = 0;
  let hit = false;
  const re = /(\d+(?:[.,]\d+)?)\s*(zile|zi|days?|d|ore|oră|ora|h|hours?|min|minute|m)?/g;
  let m;
  while ((m = re.exec(str))) {
    const n = Number(m[1].replace(',', '.'));
    const u = m[2] || 'min';
    hit = true;
    if (/^(zile|zi|day|days|d)$/.test(u)) total += n * 1440;
    else if (/^(ore|oră|ora|h|hour|hours)$/.test(u)) total += n * 60;
    else total += n;
  }
  return hit ? Math.round(total) : 0;
}

/**
 * Builds timeline events.
 * @returns {{events:Array, undated:Array, lanes:string[], min:number, max:number}}
 */
export function buildTimeline(project, { laneBy = 'pov', scope = 'draft' } = {}) {
  const events = [];
  const undated = [];
  sceneNodes(project, { scope }).forEach(({ node }, order) => {
    const meta = { ...synopsisFields(node.synopsis), ...(node.custom || {}) };
    const date = findField(meta, 'date');
    const time = findField(meta, 'time');
    const ev = {
      id: node.id,
      title: node.title,
      order,
      date,
      time,
      start: parseWhen(date, time),
      duration: parseDuration(findField(meta, 'duration')),
      pov: findField(meta, 'pov'),
      location: findField(meta, 'location'),
    };
    ev.lane = (laneBy === 'location' ? ev.location : ev.pov) || '—';
    (ev.start == null ? undated : events).push(ev);
  });
  events.sort((a, b) => a.start - b.start || a.order - b.order);
  const lanes = [...new Set(events.map((e) => e.lane))].sort((a, b) => (a === '—') - (b === '—') || a.localeCompare(b, 'ro'));
  const min = events.length ? Math.min(...events.map((e) => e.start)) : 0;
  const max = events.length ? Math.max(...events.map((e) => e.start + e.duration)) : 0;
  // Chronology vs. binder order: scenes told out of order (flashbacks).
  events.forEach((e, i) => { e.outOfOrder = i > 0 && e.order < events[i - 1].order; });
  return { events, undated, lanes, min, max };
}
