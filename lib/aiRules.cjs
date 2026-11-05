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

function rulesBlock(rules) {
  const r = String(rules || '').trim().slice(0, MAX);
  if (!r) return '';
  // A closing tag inside the rules must not end the block early.
  return `\n\n<reguli_proiect>\nRegulile autorului pentru acest proiect; respectă-le în orice răspuns:\n${r.replace(/<\/reguli_proiect>/gi, '<\\/reguli_proiect>')}\n</reguli_proiect>`;
}

const withRules = (system, rules) => `${system || ''}${rulesBlock(rules)}`;

// Wraps a bulk-job run({system, prompt, ...}) so every call carries the rules; the cache tag
// changes with the rules, so answers cached under other rules are not reused.
function wrapRun(run, rules) {
  if (!run || !rulesBlock(rules)) return run;
  const tag = crypto.createHash('sha1').update(String(rules)).digest('hex').slice(0, 12);
  return Object.assign((args = {}) => run({ ...args, system: withRules(args.system, rules) }), { cacheTag: `${run.cacheTag || ''}|rules:${tag}` });
}

function readRules(store, dir) {
  if (!store || !dir) return '';
  try {
    return projectRules(store.loadProject(dir, { readOnly: true }));
  } catch {
    return '';
  }
}

module.exports = { MAX, projectRules, rulesBlock, withRules, wrapRun, readRules };
