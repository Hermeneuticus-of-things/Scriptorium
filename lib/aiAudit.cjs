'use strict';
// Registrul de decizii și provenance al modulului AI (directiva autor 2026-11-20): fiecare
// generare și fiecare decizie a autorului produc un eveniment legat de conținutul textului.
// Nu e jurnal de fișiere, e memoria «de ce arată textul așa»: actor (agent / autor), model,
// acțiune, hash de prompt și de reguli (pachetul cărții inclus), decizie, clasificare semantică.
// Auditul se scrie din procesul principal, append-only (JSONL în dosarul proiectului);
// restore-ul nu șterge nimic — fiecare eveniment e nou, istoria rămâne.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = 'ai-audit.jsonl';
const MAX_EVENTS = 5000; // margine de sănătate: registrul e istoric, nu bază de date

const sha = (s) => crypto.createHash('sha1').update(String(s || '')).digest('hex').slice(0, 12);

// Clasificarea semantică a acțiunilor: forma vs sens vs conținut — UI-ul poate trataa diferit
// restore-ul și diff-ul pe cele două (SemVerDoc: schimbare de sens ≠ schimbare de formă).
const SEMANTIC = {
  proofread: 'formă', translate: 'formă',
  revise: 'sens', continue: 'conținut',
  summarize: 'sinopsis', feedback: 'analiză', consistency: 'analiză', research: 'analiză', define: 'analiză', ask: 'analiză',
  editorial: 'sens',
};

const semanticOf = (action) => SEMANTIC[action] || 'formă';

function fileOf(dir) {
  return path.join(dir || '.', FILE);
}

// Append-only; evenimentul e complet la scriere (nu se editează după).
function append(dir, event) {
  if (!dir || !event || typeof event !== 'object') return;
  try {
    const line = JSON.stringify({
      at: new Date().toISOString(),
      actor: event.actor || 'agent',
      action: String(event.action || '').slice(0, 40),
      model: String(event.model || '').slice(0, 80),
      promptHash: event.promptHash || '',
      rulesHash: event.rulesHash || '',
      decision: String(event.decision || 'generat').slice(0, 40),
      semantic: semanticOf(event.action),
      note: String(event.note || '').slice(0, 200),
    }) + '\n';
    fs.appendFileSync(fileOf(dir), line, 'utf8');
    trim(dir);
  } catch {
    /* auditul nu trebuie să rupă niciodată fluxul de scriere */
  }
}

// Păstrează doar ultimele MAX_EVENTS evenimente (rotate simplu, fără pierdere recentă).
function trim(dir) {
  try {
    const f = fileOf(dir);
    if (!fs.existsSync(f)) return;
    if (fs.statSync(f).size < 2 * 1024 * 1024) return;
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
    if (lines.length > MAX_EVENTS) fs.writeFileSync(f, lines.slice(-MAX_EVENTS).join('\n') + '\n', 'utf8');
  } catch {
    /* best effort */
  }
}

function read(dir) {
  try {
    return fs.readFileSync(fileOf(dir), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

module.exports = { append, read, semanticOf, sha, FILE };
