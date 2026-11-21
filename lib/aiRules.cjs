'use strict';
// Project AI rules (AI > AI settings (project)…, project.editorialProfile.aiRules) apply to EVERY
// AI path, not only I-REP / I-EDIT: the assistant (ai:run), bulk jobs (ai:bulkSynopsis,
// ai:consistency, ai:zoomReview) and research (rag:ask, rag:chat). Menu reorg 2026-10-31.
// I-REP / I-EDIT already carry them through src/lib/editorial.js systemPrompt().
const crypto = require('crypto');

const MAX = 4000;

function projectRules(project) {
  return String((project && project.editorialProfile && project.editorialProfile.aiRules) || '').trim().slice(0, MAX);
}

// Pachetul de carte (universal): frazele fixate și formulele oprite ale CĂRȚII CURENTE, injectate
// ca strat superior peste motorul universal. Nimic specific unei cărți anume nu e hardcodat aici —
// orice carte își aduce propriul pachet prin project.editorialProfile (AI > Setări AI (carte)…).
const lines = (v) => String(v || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 200);

function projectPackage(project) {
  const p = (project && project.editorialProfile) || {};
  return {
    aiRules: projectRules(project),
    fixedPhrases: lines(p.fixedPhrases),
    bannedFormulas: lines(p.bannedFormulas),
  };
}

function packageText(pkg) {
  const parts = [];
  if (pkg.fixedPhrases.length) parts.push('Fraze fixate de autor — NU se ating, nici la corectură, nici la rescriere:\n' + pkg.fixedPhrases.map((f) => `- ${f}`).join('\n'));
  if (pkg.bannedFormulas.length) parts.push('Formule oprite în această carte — zero apariții în textul livrat:\n' + pkg.bannedFormulas.map((f) => `- ${f}`).join('\n'));
  return parts.join('\n\n');
}

function packageBlock(pkg) {
  const t = packageText(pkg).slice(0, MAX);
  if (!t) return '';
  return `\n\n<pachet_carte>\nStratul cărții, cu prioritate maximă (la conflict câștigă față de metoda generală):\n${t.replace(/<\/pachet_carte>/gi, '<\\/pachet_carte>')}\n</pachet_carte>`;
}

function rulesBlock(rules) {
  const r = String(rules || '').trim().slice(0, MAX);
  if (!r) return '';
  // A closing tag inside the rules must not end the block early.
  return `\n\n<reguli_proiect>\nRegulile autorului pentru acest proiect; respectă-le în orice răspuns:\n${r.replace(/<\/reguli_proiect>/gi, '<\\/reguli_proiect>')}\n</reguli_proiect>`;
}

// Pre-formatted blocks (starting with a tag, e.g. from readRules) pass through unwrapped;
// plain text (e.g. tests, direct callers) gets wrapped as before.
const withRules = (system, rules) => `${system || ''}${String(rules || '').startsWith('\n\n<') ? rules : rulesBlock(rules)}`;

// Wraps a bulk-job run({system, prompt, ...}) so every call carries the rules; the cache tag
// changes with the rules, so answers cached under other rules are not reused.
function wrapRun(run, rules) {
  if (!run || !rulesBlock(rules)) return run;
  const tag = crypto.createHash('sha1').update(String(rules)).digest('hex').slice(0, 12);
  return Object.assign((args = {}) => run({ ...args, system: withRules(args.system, rules) }), { cacheTag: `${run.cacheTag || ''}|rules:${tag}` });
}

// What joins the system prompt: the book package (fixed phrases, banned formulas) above the
// author's general rules — readRules stays the single door used by main.cjs and ragHandlers.cjs.
function readRules(store, dir) {
  if (!store || !dir) return '';
  try {
    const pkg = projectPackage(store.loadProject(dir, { readOnly: true }));
    return rulesBlock(pkg.aiRules) + packageBlock(pkg);
  } catch {
    return '';
  }
}

module.exports = { MAX, projectRules, rulesBlock, withRules, wrapRun, readRules };
