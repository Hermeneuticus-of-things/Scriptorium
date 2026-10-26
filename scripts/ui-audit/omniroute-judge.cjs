// Per-scene UI-diff judge, run on the local OmniRoute server (OpenAI-compatible, no cloud credit).
// Input: a deterministic diff (element-diff.cjs / menu-diff.cjs rows) for one window/dialog.
// Output: each raw difference classified as
//   gap      — a real feature/behavior Pneuma Sofer is missing (goes into ROADMAP audit 5 as a checkbox)
//   alias    — same thing worded differently (feeds aliases.json; not a real gap)
//   skip     — intentional (Pneuma Sofer's own AI/MCP extras, or N/A)
// Results are cached by SHA-256 of the input so nothing is judged twice (content-hash cache).
// Env: OMNIROUTE_URL (default http://127.0.0.1:20128/v1), OMNIROUTE_API_KEY, OMNIROUTE_MODEL (auto/best-fast).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL = (process.env.OMNIROUTE_URL || process.env.HAVIS_OPENROUTER_URL || 'http://127.0.0.1:20128/v1').replace(/\/+$/, '');
const KEY = process.env.OMNIROUTE_API_KEY || process.env.OPENROUTER_API_KEY || '';
const MODEL = process.env.OMNIROUTE_MODEL || process.env.HAVIS_OPENROUTER_MODEL || 'auto/best-fast';
const CACHE = path.join(__dirname, 'cache');
fs.mkdirSync(CACHE, { recursive: true });

const SYS = `You compare a classic writing program (reference) with "Pneuma Sofer", its independent re-implementation.
You receive, for ONE window/dialog, a list of raw differences found by a deterministic diff (what the reference has that Pneuma Sofer seems to lack, plus shortcut/state differences).
For each difference output a verdict:
- "gap": a genuine feature, option, command, default, shortcut or state Pneuma Sofer should add to match the reference 1:1.
- "alias": the same thing exists in Pneuma Sofer under a different wording (give pneumaLabel = the Pneuma Sofer label it matches).
- "skip": not a real gap — e.g. reference-only branding, or something irrelevant to Pneuma Sofer.
Rules: do NOT propose removing Pneuma Sofer's own extra features (AI, MCP, dictation). Judge only what the diff lists.
Reply ONLY with JSON: {"verdicts":[{"id":<index>,"verdict":"gap|alias|skip","pneumaLabel":"","note":"<=12 words"}]}`;

// OmniRoute's auto/* models may answer as SSE even with stream:false; merge the deltas.
function parseMaybeSse(raw) {
  const t = raw.trim();
  if (t.startsWith('{')) return JSON.parse(t);
  let content = '', last = {};
  for (const line of t.split(/\r?\n/)) {
    const m = line.match(/^data:\s*(.+)$/);
    if (!m || m[1] === '[DONE]') continue;
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    last = j;
    const d = j.choices?.[0];
    if (d?.delta?.content) content += d.delta.content;
    else if (d?.message?.content) content += d.message.content;
  }
  if (content) return { choices: [{ message: { content } }], model: last.model };
  return last;
}
// Extract the first balanced {...} object, tolerating prose/markdown/multiple objects around it.
function firstJsonObject(s) {
  const i = s.indexOf('{');
  if (i < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(s.slice(i, j + 1)); } catch { return null; } } }
  }
  return null;
}
async function judge(scene, rows, context = '') {
  const payload = rows.map((r, i) => ({ id: i, kind: r.kind, el: r.el || r.where, detail: r.detail }));
  const key = crypto.createHash('sha256').update(MODEL + '\n' + scene + '\n' + context + '\n' + JSON.stringify(payload)).digest('hex').slice(0, 24);
  const cf = path.join(CACHE, `${scene}-${key}.json`);
  if (fs.existsSync(cf)) return { ...JSON.parse(fs.readFileSync(cf, 'utf8')), cached: true };
  if (!rows.length) { const r = { scene, verdicts: [] }; fs.writeFileSync(cf, JSON.stringify(r)); return r; }
  const user = `Window: ${scene}\n${context ? context + '\n' : ''}Differences:\n${JSON.stringify(payload, null, 0)}`;
  const res = await fetch(`${URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0, max_tokens: 2000, stream: false, messages: [{ role: 'system', content: SYS }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`OmniRoute ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const raw = await res.text();
  const data = parseMaybeSse(raw);
  let txt = data.choices?.[0]?.message?.content ?? '{}';
  txt = txt.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const parsed = firstJsonObject(txt) || { verdicts: [] };
  // normalize: models vary on key names (id/index/item, pneumaLabel/match, note/reason)
  const verdicts = (parsed.verdicts || parsed.results || []).map((v, i) => {
    let id = typeof v.id === 'number' ? v.id : typeof v.index === 'number' ? v.index : i;
    if (id < 0 || id >= payload.length) id = i;
    return { id, el: payload[id]?.el, kind: payload[id]?.kind, verdict: (v.verdict || v.decision || '').toLowerCase(), pneumaLabel: v.scribnerLabel || v.match || '', note: (v.note || v.reason || '').slice(0, 120) };
  });
  const out = { scene, model: data.model || MODEL, verdicts, rows: payload };
  fs.writeFileSync(cf, JSON.stringify(out));
  return out;
}
module.exports = { judge, parseMaybeSse };
if (require.main === module) {
  // CLI: node omniroute-judge.cjs <scene> <diff.tsv>   (tsv: kind \t el \t detail)
  const [scene, tsv] = process.argv.slice(2);
  const rows = fs.readFileSync(tsv, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const [kind, el, detail] = l.split('\t'); return { kind, el, detail }; });
  judge(scene, rows).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exit(1); });
}
