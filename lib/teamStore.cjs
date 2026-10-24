'use strict';
// Files of team work in <project>/team/ (see src/lib/team.js): one log and one presence file per
// computer. Only these names are read or written; nothing else in the folder is touched.
const fs = require('fs');
const path = require('path');

const TEAM_FILE = /^(log|presence)-[A-Za-z0-9-]{1,64}\.(jsonl|json)$/;
const READ_MAX = 4 * 1024 * 1024; // a long log is read from its end

function checkName(name) {
  if (!TEAM_FILE.test(String(name))) throw new Error(`Fișier de echipă invalid: ${name}`);
}

function readTail(file) {
  const size = fs.statSync(file).size;
  if (size <= READ_MAX) return fs.readFileSync(file, 'utf8');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(READ_MAX);
    fs.readSync(fd, buf, 0, READ_MAX, size - READ_MAX);
    const text = buf.toString('utf8');
    return text.slice(text.indexOf('\n') + 1); // drop the cut first line
  } finally {
    fs.closeSync(fd);
  }
}

/** { name: text } of the team files of a project ({} when there are none). */
function teamFiles(dir) {
  const td = path.join(dir, 'team');
  let names = [];
  try {
    names = fs.readdirSync(td);
  } catch {
    return {};
  }
  const out = {};
  for (const name of names) {
    if (!TEAM_FILE.test(name)) continue;
    try {
      out[name] = readTail(path.join(td, name));
    } catch {
      /* being replaced by the sync client: read next time */
    }
  }
  return out;
}

function teamWrite(dir, name, text, { append = false } = {}) {
  checkName(name);
  const td = path.join(dir, 'team');
  fs.mkdirSync(td, { recursive: true });
  const file = path.join(td, name);
  if (append) fs.appendFileSync(file, String(text), 'utf8');
  else require('./store.cjs').writeAtomic(file, String(text));
  return true;
}

module.exports = { teamFiles, teamWrite, TEAM_FILE };
