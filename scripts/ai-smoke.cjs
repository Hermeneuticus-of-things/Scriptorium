#!/usr/bin/env node
// Test with a real model: node scripts/ai-smoke.cjs <provider> [model]
// Key from the environment only (NVIDIA_API_KEY, OPENROUTER_API_KEY, …, see lib/aiPresets.json).
const ai = require('../lib/ai.cjs');
const PRESETS = require('../lib/aiPresets.json');

const provider = process.argv[2] || 'nvidia';
const model = process.argv[3];
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
(async () => {
  let fails = 0;
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
