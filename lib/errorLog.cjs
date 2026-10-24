'use strict';
// Error log for "Raportează o problemă": one JSON object per line (errors.jsonl in userData/logs).
// Kept small: at most `maxEntries` lines and `maxBytes` bytes; the oldest lines go first.
const fs = require('fs');
const path = require('path');

const MAX_ENTRIES = 200;
const MAX_BYTES = 1024 * 1024;
const MAX_STACK = 4000;
const MAX_MESSAGE = 1000;

function trim(s, n) {
  s = s == null ? '' : String(s);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Normalizes anything thrown (Error, string, object) into a log entry.
function makeEntry({ process: proc = 'main', kind = 'error', error, message, stack, version = '', time } = {}) {
  const err = error instanceof Error ? error : null;
  return {
    time: time || new Date().toISOString(),
    version: String(version || ''),
    process: String(proc),
    kind: String(kind),
    message: trim(message || (err ? err.message : error != null ? (typeof error === 'string' ? error : safeJson(error)) : ''), MAX_MESSAGE),
    stack: trim(stack || (err && err.stack) || '', MAX_STACK),
  };
}

function safeJson(v) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function readEntries(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* a half-written line after a crash */
    }
  }
  return out;
}

// Appends an entry and rotates: keeps the newest lines within both limits.
function appendEntry(file, entry, { maxEntries = MAX_ENTRIES, maxBytes = MAX_BYTES } = {}) {
  const all = readEntries(file);
  all.push(entry);
  let lines = all.slice(-maxEntries).map((e) => JSON.stringify(e));
  let size = lines.reduce((n, l) => n + Buffer.byteLength(l) + 1, 0);
  while (lines.length > 1 && size > maxBytes) size -= Buffer.byteLength(lines.shift()) + 1;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, lines.join('\n') + '\n');
  fs.renameSync(tmp, file);
  return entry;
}

function clear(file) {
  try {
    fs.unlinkSync(file);
  } catch {
    /* already gone */
  }
  return true;
}

module.exports = { makeEntry, readEntries, appendEntry, clear, MAX_ENTRIES, MAX_BYTES };
