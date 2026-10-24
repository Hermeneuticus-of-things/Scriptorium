#!/usr/bin/env node
// Test with a real model: node scripts/ai-smoke.cjs <provider> [model]
// Key from the environment only (NVIDIA_API_KEY, OPENROUTER_API_KEY, …, see lib/aiPresets.json).
const ai = require('../lib/ai.cjs');
const PRESETS = require('../lib/aiPresets.json');

const provider = process.argv[2] || 'nvidia';
let model = process.argv[3];
const pre = PRESETS[provider];
if (!pre) {
  console.error(`Furnizor necunoscut: ${provider}. Disponibili: ${Object.keys(PRESETS).join(', ')}`);
  process.exit(2);
}
const apiKey = pre.envKey ? process.env[pre.envKey] : '';
if (pre.needsKey && !apiKey) {
  console.error(`Lipsește ${pre.envKey} în mediu.`);
  process.exit(2);
}
const TEXT = 'Aceasta e o propozitie cu greșeli de ortografe si gramatica, scrisa in graba.';
const CASES = [
  { action: 'proofread', text: TEXT },
  { action: 'translate', text: TEXT, lang: 'en' },
  { action: 'define', text: 'palimpsest' },
];
// Without a model: ask the server for its list (OpenAI-compatible /models) and take a current
// instruct/chat model, so the test does not depend on a model id that may be retired.
const PREFER = [/llama-3\.3-70b.*:free/i, /deepseek.*:free/i, /qwen3.*:free/i, /gemma.*:free/i, /llama-3\.\d.*(70b|405b).*instruct/i, /nemotron.*(super|ultra)/i, /qwen.*instruct/i, /mistral.*(large|medium)/i, /instruct|chat/i];
const SKIP = /embed|rerank|guard|safety|reward|vision|vlm|clip|parse|ocr|retriev|coder|tts|asr|whisper|nv-?ingest|deplot|kosmos|fuyu|paligemma|neva/i;
// The list also holds models not deployed for every account (404 "Function … not found"):
// each candidate gets a tiny request, and the first one that answers is used.
async function probe(id) {
  const res = await fetch(`${pre.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model: id, messages: [{ role: 'user', content: 'Spune OK.' }], max_tokens: 5 }),
  });
  return res.status;
}
let ranked = [];
let next = 0;
async function pickModel() {
  if (ranked.length) return pickNext();
  if (model || pre.kind !== 'openai' || !pre.baseUrl) return;
  const res = await fetch(`${pre.baseUrl}/models`, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} });
  if (!res.ok) throw new Error(`Lista de modele: HTTP ${res.status}`);
  const all = (await res.json()).data || [];
  // OpenRouter: only free models (id ending in ":free", or zero price), so the test costs nothing.
  const free = (m) => /:free$/.test(m.id) || (m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0);
  const pool = provider === 'openrouter' ? all.filter(free) : all;
  const ids = pool.map((m) => m.id).filter((id) => !SKIP.test(id));
  if (provider === 'openrouter') console.log(`     modele gratuite pe OpenRouter: ${ids.length}`);
  for (const re of PREFER) for (const id of ids.filter((x) => re.test(x)).sort().reverse()) if (!ranked.includes(id)) ranked.push(id);
  for (const id of ids) if (!ranked.includes(id)) ranked.push(id);
  ranked = ranked.slice(0, 15);
  return pickNext();
}
async function pickNext() {
  while (next < ranked.length) {
    const id = ranked[next++];
    const status = await probe(id).catch(() => 0);
    console.log(`     încerc ${id}: ${status === 200 ? 'răspunde' : `HTTP ${status || 'rețea'}`}`);
    if (status === 200) {
      model = id;
      console.log(`Model ales automat: ${model} (altul: node scripts/ai-smoke.cjs ${provider} <model>)`);
      return;
    }
  }
  throw new Error('Niciun alt model din primele 15 nu răspunde pentru acest cont.');
}

(async () => {
  let fails = 0;
  try {
    await pickModel();
  } catch (e) {
    console.log(`FAIL models     ${e.message}`);
    process.exit(1);
  }
  for (const c of CASES) {
    // Free models are often overloaded: two retries (3 s, 6 s), then the next model that answers.
    let done = false;
    for (let attempt = 0; !done; attempt++) {
      const t0 = Date.now();
      try {
        const r = await ai.runAction({ provider, model, apiKey, ...c });
        if (!r.text) throw new Error('răspuns gol');
        console.log(`OK   ${c.action.padEnd(10)} ${r.model} ${Date.now() - t0} ms\n     ${r.text.replace(/\s+/g, ' ').slice(0, 160)}`);
        done = true;
      } catch (e) {
        console.log(`     ${c.action}: ${e.message}`);
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 3000 * (attempt + 1)));
          continue;
        }
        const switched = ranked.length && (await pickModel().then(() => true, () => false));
        if (switched && attempt < 8) continue;
        fails++;
        console.log(`FAIL ${c.action.padEnd(10)} ${e.message}`);
        done = true;
      }
    }
  }
  process.exit(fails ? 1 : 0);
})();
