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
const PREFER = [/llama-3\.\d.*(70b|405b).*instruct/i, /nemotron.*(super|ultra)/i, /qwen.*instruct/i, /mistral.*(large|medium)/i, /instruct|chat/i];
const SKIP = /embed|rerank|guard|safety|reward|vision|vlm|clip|parse|ocr|retriev|coder|tts|asr|whisper|nv-?ingest|deplot|kosmos|fuyu|paligemma|neva/i;
async function pickModel() {
  if (model || pre.kind !== 'openai' || !pre.baseUrl) return;
  const res = await fetch(`${pre.baseUrl}/models`, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} });
  if (!res.ok) throw new Error(`Lista de modele: HTTP ${res.status}`);
  const ids = ((await res.json()).data || []).map((m) => m.id).filter((id) => !SKIP.test(id));
  for (const re of PREFER) {
    const hit = ids.filter((id) => re.test(id)).sort().reverse()[0];
    if (hit) {
      model = hit;
      break;
    }
  }
  model = model || ids[0];
  if (!model) throw new Error('Serverul nu a dat niciun model de chat.');
  console.log(`Model ales automat: ${model} (din ${ids.length}; altul: node scripts/ai-smoke.cjs ${provider} <model>)`);
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
    const t0 = Date.now();
    try {
      const r = await ai.runAction({ provider, model, apiKey, ...c });
      if (!r.text) throw new Error('răspuns gol');
      console.log(`OK   ${c.action.padEnd(10)} ${r.model} ${Date.now() - t0} ms\n     ${r.text.replace(/\s+/g, ' ').slice(0, 160)}`);
    } catch (e) {
      fails++;
      console.log(`FAIL ${c.action.padEnd(10)} ${e.message}`);
    }
  }
  process.exit(fails ? 1 : 0);
})();
