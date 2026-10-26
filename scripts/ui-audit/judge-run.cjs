// Hierarchical judgment of a scene's deterministic UI diff, entirely on the local OmniRoute server
// (no cloud credit). Mirrors the project-lead / worker split:
//   workers (OMNIROUTE_WORKER, default auto/best-fast) — shard the raw rows, first-pass verdicts;
//   lead    (OMNIROUTE_LEAD,   default aug/opus4.7)    — reviews the merged verdicts, fixes mistakes,
//                                                         emits the final audit-5 checklist for the scene.
// Deterministic extraction stays in element-diff.cjs / menu-diff.cjs; this only judges the residue.
// Usage: node judge-run.cjs <scene> <diff.tsv> [contextFile]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { judge } = require('./omniroute-judge.cjs');

const URL = (process.env.OMNIROUTE_URL || process.env.HAVIS_OPENROUTER_URL || 'http://127.0.0.1:20128/v1').replace(/\/+$/, '');
const KEY = process.env.OMNIROUTE_API_KEY || process.env.OPENROUTER_API_KEY || '';
const LEAD = process.env.OMNIROUTE_LEAD || 'aug/opus4.7';
const WORKER = process.env.OMNIROUTE_WORKER || 'auto/best-fast';
const SHARD = Number(process.env.JUDGE_SHARD || 40);
const CACHE = path.join(__dirname, 'cache');

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

async function callLead(scene, merged, context) {
  const key = crypto.createHash('sha256').update(LEAD + scene + context + JSON.stringify(merged)).digest('hex').slice(0, 24);
  const cf = path.join(CACHE, `lead-${scene}-${key}.json`);
  if (fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  const sys = `You are the project lead for making "Pneuma Sofer" match a classic writing program 1:1.
Workers pre-classified each raw difference as gap/alias/skip. Review their verdicts for the window below.
Correct mistakes. Keep Pneuma Sofer's own extra features (AI, MCP, dictation) — never list those as gaps.
Return ONLY JSON: {"gaps":[{"el":"","note":"<=14 words, what to add"}],"aliases":[{"el":"","pneumaLabel":""}]}`;
  const user = `Window: ${scene}\n${context ? 'Pneuma Sofer already has (context):\n' + context + '\n' : ''}Worker verdicts:\n${JSON.stringify(merged)}`;
  const res = await fetch(`${URL}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: LEAD, temperature: 0, max_tokens: 3000, stream: false, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }) });
  const raw = await res.text();
  const { parseMaybeSse } = require('./omniroute-judge.cjs');
  const data = (typeof parseMaybeSse === 'function') ? parseMaybeSse(raw) : JSON.parse(raw);
  let txt = (data.choices?.[0]?.message?.content ?? '{}').replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const m = txt.match(/\{[\s\S]*\}/);
  const out = m ? JSON.parse(m[0]) : { gaps: [], aliases: [] };
  out.leadModel = data.model || LEAD;
  fs.writeFileSync(cf, JSON.stringify(out));
  return out;
}

async function run(scene, rows, context = '') {
  const shards = chunk(rows, SHARD);
  const results = await Promise.all(shards.map((s, i) => judge(`${scene}#${i}`, s, context).catch((e) => { console.error(`shard ${i}: ${e.message}`); return { verdicts: [] }; })));
  const merged = results.flatMap((r) => r.verdicts).filter((v) => v.verdict && v.verdict !== 'skip');
  // Only the worker-flagged gaps need the lead's review; aliases are recorded as-is.
  const workerGaps = merged.filter((v) => v.verdict === 'gap');
  const aliases = merged.filter((v) => v.verdict === 'alias').map((v) => ({ el: v.el, pneumaLabel: v.scribnerLabel }));
  const leadShards = chunk(workerGaps, 30);
  const leadOut = await Promise.all(leadShards.map((s, i) => callLead(`${scene}#L${i}`, s, context).catch((e) => { console.error(`lead ${i}: ${e.message}`); return { gaps: [], aliases: [] }; })));
  const gaps = leadOut.flatMap((o) => o.gaps || []);
  const leadAliases = leadOut.flatMap((o) => o.aliases || []);
  return { scene, raw: rows.length, workerKept: merged.length, workerGaps: workerGaps.length, gaps, aliases: [...aliases, ...leadAliases], leadModel: leadOut[0]?.leadModel };
}
module.exports = { run };
if (require.main === module) {
  const [scene, tsv, ctxFile] = process.argv.slice(2);
  const rows = fs.readFileSync(tsv, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const [kind, el, detail] = l.split('\t'); return { kind, el, detail }; });
  const context = ctxFile && fs.existsSync(ctxFile) ? fs.readFileSync(ctxFile, 'utf8').slice(0, 6000) : '';
  run(scene, rows, context).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exit(1); });
}
