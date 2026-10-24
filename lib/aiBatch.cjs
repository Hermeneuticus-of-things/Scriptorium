'use strict';
// Bulk AI jobs (v1.0): bulk synopsis, book consistency with living character sheets
// ("fișe vii"), multi-zoom editorial review (Maha / Macro / Mezzo / Micro / Nano).
// Built on lib/ai.cjs. The model call is injected (`run`) so tests use a fake:
//   run({ system, prompt, effort }) -> Promise<string>
// A disk cache keyed by content hash avoids re-sending unchanged text.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SEVERITIES = ['GRAVE', 'MEDIU', 'MINOR'];

const SYSTEM = `Ești redactorul din Scribner. Lucrezi pe manuscrise în limba autorului (implicit română).
Răspunzi STRICT cu JSON valid, fără text în afara JSON-ului și fără blocuri de cod.`;

const ZOOM_LEVELS = {
  Maha: {
    label: 'Maha (întreaga carte)',
    unit: 'book',
    prompt: 'Nivel MAHA: arcul întregii cărți. Verifică premisa, promisiunea făcută cititorului, arcul personajelor principale, rezolvarea firelor deschise, proporția părților.',
  },
  Macro: {
    label: 'Macro (capitole / părți)',
    unit: 'chapter',
    prompt: 'Nivel MACRO: capitolul ca unitate. Verifică funcția capitolului în carte, ordinea scenelor, tranzițiile, redundanța între scene, tensiunea pe capitol.',
  },
  Mezzo: {
    label: 'Mezzo (scene)',
    unit: 'doc',
    prompt: 'Nivel MEZZO: scena. Verifică obiectivul scenei, conflictul, schimbarea de valoare, punctul de vedere, coerența internă, începutul și finalul.',
  },
  Micro: {
    label: 'Micro (paragrafe)',
    unit: 'doc',
    prompt: 'Nivel MICRO: paragraful. Verifică ritmul, repetițiile locale, claritatea, dialogul, tranzițiile între paragrafe, densitatea.',
  },
  Nano: {
    label: 'Nano (fraze, cuvinte, tipografie)',
    unit: 'doc',
    prompt: 'Nivel NANO: fraza și cuvântul. Verifică ortografia, gramatica, punctuația, ghilimelele românești „…”, reziduurile de asistent AI, formulele prefabricate.',
  },
};

const FINDINGS_FORMAT = `Întoarce JSON: {"findings":[{"severity":"GRAVE|MEDIU|MINOR","quote":"citat scurt exact din text sau \\"\\"","issue":"problema","suggestion":"ce să facă autorul"}]}.
GRAVE = rupe cartea sau contrazice faptele; MEDIU = slăbește vizibil textul; MINOR = finisaj. Maxim 12 constatări, cele mai importante întâi. Fără constatări: {"findings":[]}.`;

// ---------------------------------------------------------------------------
// helpers

function hash(...parts) {
  const h = crypto.createHash('sha256');
  for (const p of parts) h.update(typeof p === 'string' ? p : JSON.stringify(p)).update('\u0000');
  return h.digest('hex');
}

/** Extracts the first JSON object/array from a model reply (tolerates ``` fences and chatter). */
function parseJson(text) {
  const s = String(text || '').replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(s); } catch { /* fall through */ }
  const start = s.search(/[[{]/);
  if (start < 0) throw new Error('Răspunsul modelului nu conține JSON.');
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return JSON.parse(s.slice(start, i + 1));
  }
  throw new Error('JSON incomplet în răspunsul modelului.');
}

function normSeverity(s) {
  const u = String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (u.startsWith('GRAV') || u === 'HIGH' || u === 'CRITICAL') return 'GRAVE';
  if (u.startsWith('MED')) return 'MEDIU';
  return 'MINOR';
}

function clip(text, maxChars) {
  const t = String(text || '');
  return maxChars && t.length > maxChars ? `${t.slice(0, maxChars)}\n[…text trunchiat…]` : t;
}

/** Runs async fn over items with at most `limit` in flight. Preserves order of results. */
async function mapLimit(items, limit, fn, signal, { stopOnAbort = false } = {}) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      if (signal && signal.aborted) {
        // Bulk jobs stop quietly and return what is already done (results cost money).
        if (stopOnAbort) return;
        throw new Error('Operație anulată.');
      }
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit || 1, items.length)) }, worker));
  return out;
}

// ---------------------------------------------------------------------------
// disk cache

/**
 * JSON-file cache: { get(key), set(key, value), flush() }. Pass null path for memory-only.
 * Writes are atomic (tmp + rename) and debounced to one write per flush/set burst.
 */
function createCache(filePath, { maxEntries = 5000 } = {}) {
  let data = {};
  if (filePath) {
    try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')) || {}; } catch { data = {}; }
  }
  let dirty = false;
  const flush = () => {
    if (!filePath || !dirty) return;
    const keys = Object.keys(data);
    if (keys.length > maxEntries) {
      keys.sort((a, b) => (data[a].t || 0) - (data[b].t || 0)).slice(0, keys.length - maxEntries).forEach((k) => delete data[k]);
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    require('./store.cjs').writeAtomic(filePath, JSON.stringify(data));
    dirty = false;
  };
  return {
    get: (k) => (data[k] ? data[k].v : undefined),
    set: (k, v) => { data[k] = { v, t: Date.now() }; dirty = true; flush(); },
    flush,
    size: () => Object.keys(data).length,
  };
}

/** Calls run() unless the (kind, system, prompt) hash is cached. Returns {value, cached}. */
async function cachedCall({ run, cache, kind, system, prompt, effort, parse }) {
  // run.cacheTag = provider + model, so another model's cached answer isn't reused.
  const key = hash(kind, system, prompt, effort || '', (run && run.cacheTag) || '');
  const hit = cache && cache.get(key);
  if (hit !== undefined) return { value: hit, cached: true };
  const raw = await run({ system, prompt, effort });
  const value = parse ? parse(raw) : String(raw || '').trim();
  if (cache) cache.set(key, value);
  return { value, cached: false };
}

// ---------------------------------------------------------------------------
// bulk synopsis

/**
 * @param {{docs:{id,title,text}[], run, cache?, concurrency?, onProgress?, signal?, maxChars?}} o
 * @returns {Promise<{results:Record<string,string>, errors:Record<string,string>, cachedCount:number}>}
 */
const aborted = (signal) => Boolean(signal && signal.aborted);

async function bulkSynopsis({ docs, run, cache, concurrency = 3, onProgress, signal, maxChars = 60000 }) {
  const results = {};
  const errors = {};
  let done = 0;
  let cachedCount = 0;
  const todo = (docs || []).filter((d) => String(d.text || '').trim());
  // Start event so the window shows the job (and its Cancel) before the first answer arrives.
  if (onProgress && todo.length) onProgress({ job: 'bulkSynopsis', done: 0, total: todo.length });
  await mapLimit(todo, concurrency, async (d) => {
    try {
      const { value, cached } = await cachedCall({
        run, cache, kind: 'synopsis', effort: 'low',
        system: 'Ești asistentul de scriere din Scribner. Scrii sinopsisuri scurte pentru fișele de pe corkboard, în limba textului.',
        prompt: `<text titlu="${String(d.title || '').replace(/"/g, "'")}">\n${clip(d.text, maxChars)}\n</text>\n\nScrie un sinopsis de 2-3 propoziții pentru scena de mai sus. Întoarce doar sinopsisul.`,
      });
      results[d.id] = value;
      if (cached) cachedCount++;
    } catch (err) {
      if (aborted(signal)) return; // cancelled mid-call: not an error of this document
      errors[d.id] = err.message || String(err);
    }
    done++;
    if (onProgress) onProgress({ job: 'bulkSynopsis', done, total: todo.length, id: d.id, title: d.title, error: errors[d.id] });
  }, signal, { stopOnAbort: true });
  return { results, errors, cachedCount, cancelled: aborted(signal) };
}

// ---------------------------------------------------------------------------
// living character / fact sheets ("fișe vii")

const EXTRACT_PROMPT = `Extrage din textul de mai sus personajele și faptele verificabile.
Întoarce JSON: {"characters":[{"name":"Nume canonic","aliases":["..."],"attributes":{"vârstă":"...","ochi":"...","rol":"..."},"facts":["fapt scurt"]}],"facts":["fapt despre lume, loc sau cronologie"]}.
Doar ce spune textul explicit. Atribute scurte (1-4 cuvinte). Fără personaje: {"characters":[],"facts":[]}.`;

const keyName = (s) => String(s || '').trim().toLocaleLowerCase('ro-RO');

/**
 * Merges one document's extraction into the living sheets (pure, returns a new object).
 * sheets = { characters: { [canonicalName]: { name, aliases[], attributes: {attr: [{value, docs[]}]}, facts: [{text, docs[]}], docs[] } },
 *            facts: [{text, docs[]}], docs: { [docId]: hash } }
 * Re-merging a document first removes its previous contributions, so edits stay consistent.
 */
function mergeSheets(prev, docId, extracted, docHash) {
  const sheets = removeDoc(prev || { characters: {}, facts: [], docs: {} }, docId);
  const addTo = (list, text) => {
    const t = String(text || '').trim();
    if (!t) return;
    const hit = list.find((x) => keyName(x.text) === keyName(t));
    if (hit) { if (!hit.docs.includes(docId)) hit.docs.push(docId); } else list.push({ text: t, docs: [docId] });
  };
  for (const c of (extracted && extracted.characters) || []) {
    if (!c || !c.name) continue;
    const names = [c.name, ...(c.aliases || [])].map(keyName);
    let canon = Object.keys(sheets.characters).find((k) => {
      const s = sheets.characters[k];
      return [s.name, ...s.aliases].map(keyName).some((n) => names.includes(n));
    });
    if (!canon) {
      canon = c.name.trim();
      sheets.characters[canon] = { name: canon, aliases: [], attributes: {}, facts: [], docs: [] };
    }
    const s = sheets.characters[canon];
    for (const a of [c.name, ...(c.aliases || [])]) {
      if (a && keyName(a) !== keyName(s.name) && !s.aliases.map(keyName).includes(keyName(a))) s.aliases.push(a.trim());
    }
    if (!s.docs.includes(docId)) s.docs.push(docId);
    for (const [attr, val] of Object.entries(c.attributes || {})) {
      const v = String(val ?? '').trim();
      if (!v) continue;
      const k = keyName(attr);
      const vals = (s.attributes[k] ||= []);
      const hit = vals.find((x) => keyName(x.value) === keyName(v));
      if (hit) { if (!hit.docs.includes(docId)) hit.docs.push(docId); } else vals.push({ value: v, docs: [docId] });
    }
    for (const f of c.facts || []) addTo(s.facts, f);
  }
  for (const f of (extracted && extracted.facts) || []) addTo(sheets.facts, f);
  sheets.docs[docId] = docHash || '';
  return sheets;
}

function removeDoc(prev, docId) {
  const sheets = JSON.parse(JSON.stringify(prev));
  sheets.characters ||= {};
  sheets.facts ||= [];
  sheets.docs ||= {};
  const strip = (list) => list.map((x) => ({ ...x, docs: x.docs.filter((d) => d !== docId) })).filter((x) => x.docs.length);
  for (const [k, s] of Object.entries(sheets.characters)) {
    s.docs = s.docs.filter((d) => d !== docId);
    for (const a of Object.keys(s.attributes)) {
      s.attributes[a] = strip(s.attributes[a]);
      if (!s.attributes[a].length) delete s.attributes[a];
    }
    s.facts = strip(s.facts);
    if (!s.docs.length) delete sheets.characters[k];
  }
  sheets.facts = strip(sheets.facts);
  delete sheets.docs[docId];
  return sheets;
}

/** Attributes with more than one distinct value: candidate contradictions (no AI needed). */
function localConflicts(sheets) {
  const out = [];
  for (const s of Object.values(sheets.characters || {})) {
    for (const [attr, vals] of Object.entries(s.attributes)) {
      if (vals.length > 1) out.push({ character: s.name, attribute: attr, values: vals });
    }
  }
  return out;
}

/**
 * Book consistency: per-document extraction (cached, skipped when the doc hash is unchanged
 * in `sheets.docs`), incremental merge into living sheets, then one AI cross-check.
 * @param {{docs:{id,title,text}[], run, cache?, sheets?, notes?, concurrency?, onProgress?, signal?, maxChars?, crossCheck?:boolean}} o
 * @returns {Promise<{sheets, conflicts, findings, errors}>}
 */
async function bookConsistency({ docs, run, cache, sheets, notes = '', concurrency = 3, onProgress, signal, maxChars = 60000, crossCheck = true }) {
  let current = sheets || { characters: {}, facts: [], docs: {} };
  const errors = {};
  const list = (docs || []).filter((d) => String(d.text || '').trim());
  const liveIds = new Set(list.map((d) => d.id));
  for (const id of Object.keys(current.docs || {})) if (!liveIds.has(id)) current = removeDoc(current, id);
  const total = list.length + (crossCheck ? 1 : 0);
  let done = 0;
  if (onProgress && total) onProgress({ job: 'consistency', phase: 'extract', done: 0, total });
  const extractions = await mapLimit(list, concurrency, async (d) => {
    const h = hash(d.text);
    let ex = null;
    if (!(current.docs && current.docs[d.id] === h)) {
      try {
        ex = (await cachedCall({
          run, cache, kind: 'extract', effort: 'low', system: SYSTEM, parse: parseJson,
          prompt: `<text titlu="${String(d.title || '').replace(/"/g, "'")}">\n${clip(d.text, maxChars)}\n</text>\n\n${EXTRACT_PROMPT}`,
        })).value;
      } catch (err) {
        if (aborted(signal)) return null;
        errors[d.id] = err.message || String(err);
      }
    }
    done++;
    if (onProgress) onProgress({ job: 'consistency', phase: 'extract', done, total, id: d.id, title: d.title, error: errors[d.id] });
    return { d, h, ex };
  }, signal, { stopOnAbort: true });
  // merge sequentially in binder order (deterministic); a cancelled run keeps what was extracted
  for (const item of extractions) if (item && item.ex) current = mergeSheets(current, item.d.id, item.ex, item.h);

  const conflicts = localConflicts(current);
  let findings = [];
  if (aborted(signal)) return { sheets: current, conflicts, findings: [], errors, cancelled: true };
  if (crossCheck && Object.keys(current.characters).length + current.facts.length > 0) {
    const titles = Object.fromEntries(list.map((d) => [d.id, d.title]));
    const compact = {
      personaje: Object.values(current.characters).map((s) => ({
        nume: s.name, alias: s.aliases,
        atribute: Object.fromEntries(Object.entries(s.attributes).map(([a, vs]) => [a, vs.map((v) => `${v.value} [${v.docs.map((x) => titles[x] || x).join(', ')}]`)])),
        fapte: s.facts.map((f) => `${f.text} [${f.docs.map((x) => titles[x] || x).join(', ')}]`),
      })),
      fapte: current.facts.map((f) => `${f.text} [${f.docs.map((x) => titles[x] || x).join(', ')}]`),
    };
    try {
      const res = (await cachedCall({
        run, cache, kind: 'crosscheck', effort: 'medium', system: SYSTEM, parse: parseJson,
        prompt: `${notes ? `<note_proiect>\n${notes}\n</note_proiect>\n\n` : ''}<fise>\n${JSON.stringify(compact, null, 1)}\n</fise>\n\nVerifică fișele de mai sus pentru contradicții reale între documente (atribute, cronologie, fapte, nume). Diferențele care se explică prin evoluția firească a poveștii nu sunt erori.\nÎntoarce JSON: {"findings":[{"severity":"GRAVE|MEDIU|MINOR","character":"nume sau \\"\\"","issue":"contradicția","docs":["titluri documente"],"suggestion":"cum se rezolvă"}]}.`,
      })).value;
      findings = ((res && res.findings) || []).map((f) => ({ ...f, severity: normSeverity(f.severity) }));
    } catch (err) { errors._crossCheck = err.message || String(err); }
    done++;
    if (onProgress) onProgress({ job: 'consistency', phase: 'crossCheck', done, total });
  }
  return { sheets: current, conflicts, findings: sortFindings(findings), errors };
}

// ---------------------------------------------------------------------------
// multi-zoom review

function sortFindings(list) {
  return [...list].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
}

/** Work units for a level: whole book, one per chapter, or one per document. */
function unitsFor(level, docs, maxChars) {
  const unit = ZOOM_LEVELS[level].unit;
  if (unit === 'book') {
    const outline = docs.map((d, i) => `${i + 1}. [${d.chapter || '—'}] ${d.title}${d.synopsis ? `: ${d.synopsis}` : ''}`).join('\n');
    const body = docs.some((d) => !d.synopsis) ? `\n\n<text>\n${clip(docs.map((d) => `## ${d.title}\n${d.text}`).join('\n\n'), maxChars * 3)}\n</text>` : '';
    return [{ id: null, title: 'Cartea', content: `<structura>\n${outline}\n</structura>${body}` }];
  }
  if (unit === 'chapter') {
    const groups = new Map();
    for (const d of docs) {
      const c = d.chapter || '—';
      if (!groups.has(c)) groups.set(c, []);
      groups.get(c).push(d);
    }
    return [...groups.entries()].map(([c, ds]) => ({
      id: ds[0].id, title: c, docIds: ds.map((d) => d.id),
      content: `<capitol titlu="${c.replace(/"/g, "'")}">\n${clip(ds.map((d) => `## ${d.title}\n${d.text}`).join('\n\n'), maxChars * 2)}\n</capitol>`,
    }));
  }
  return docs.filter((d) => String(d.text || '').trim()).map((d) => ({
    id: d.id, title: d.title, content: `<text titlu="${String(d.title || '').replace(/"/g, "'")}">\n${clip(d.text, maxChars)}\n</text>`,
  }));
}

/**
 * @param {{docs:{id,title,text,synopsis?,chapter?}[], levels?:string[], run, cache?, profileRules?:string, concurrency?, onProgress?, signal?, maxChars?}} o
 * @returns {Promise<{findings:{level,docId,title,severity,quote,issue,suggestion}[], counts:Record<string,number>, errors:Record<string,string>}>}
 */
async function multiZoomReview({ docs, levels = Object.keys(ZOOM_LEVELS), run, cache, profileRules = '', concurrency = 3, onProgress, signal, maxChars = 60000 }) {
  const bad = levels.filter((l) => !ZOOM_LEVELS[l]);
  if (bad.length) throw new Error(`Nivel necunoscut: ${bad.join(', ')}`);
  const jobs = [];
  for (const level of levels) for (const u of unitsFor(level, docs || [], maxChars)) jobs.push({ level, u });
  const errors = {};
  const findings = [];
  let done = 0;
  if (onProgress && jobs.length) onProgress({ job: 'zoomReview', done: 0, total: jobs.length });
  await mapLimit(jobs, concurrency, async ({ level, u }) => {
    const def = ZOOM_LEVELS[level];
    try {
      const res = (await cachedCall({
        run, cache, kind: `zoom:${level}`, effort: def.unit === 'doc' ? 'medium' : 'high', system: SYSTEM, parse: parseJson,
        prompt: `${profileRules ? `<reguli_editoriale>\n${profileRules}\n</reguli_editoriale>\n\n` : ''}${u.content}\n\n${def.prompt}\n${FINDINGS_FORMAT}`,
      })).value;
      for (const f of (res && res.findings) || []) {
        findings.push({
          level, docId: u.id, title: u.title, severity: normSeverity(f.severity),
          quote: String(f.quote || ''), issue: String(f.issue || ''), suggestion: String(f.suggestion || ''),
        });
      }
    } catch (err) {
      if (aborted(signal)) return;
      errors[`${level}:${u.title}`] = err.message || String(err);
    }
    done++;
    if (onProgress) onProgress({ job: 'zoomReview', level, done, total: jobs.length, id: u.id, title: u.title });
  }, signal, { stopOnAbort: true });
  const order = Object.keys(ZOOM_LEVELS);
  findings.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || order.indexOf(a.level) - order.indexOf(b.level));
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length]));
  return { findings, counts, errors, cancelled: aborted(signal) };
}

/**
 * Production `run` built on lib/ai.cjs runEditorial (which goes through lib/aiProviders complete()).
 * `cfg` is either an Anthropic API key (string, legacy) or {provider, model, baseUrl, apiKey}.
 */
function makeRun(cfg, ai = require('./ai.cjs')) {
  const conf = typeof cfg === 'string' || cfg == null ? { apiKey: cfg || '' } : cfg;
  const run = async ({ system, prompt, effort, signal }) => (await ai.runEditorial({ ...conf, system, prompt, effort, signal: signal || conf.signal })).text;
  const r = require('./aiProviders.cjs').resolveConfig(conf);
  run.cacheTag = `${r.provider}|${r.model}|${r.baseUrl}`;
  return run;
}

module.exports = {
  SEVERITIES, ZOOM_LEVELS, hash, parseJson, normSeverity, mapLimit, createCache, cachedCall,
  bulkSynopsis, mergeSheets, removeDoc, localConflicts, bookConsistency, multiZoomReview, makeRun,
};
