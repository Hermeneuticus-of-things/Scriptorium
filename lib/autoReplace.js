// Auto-replacement lists: import / export as a plain text file and merging.
// Format (one pair per line): `from<TAB>to`. Also accepted on import: `from => to`,
// `from -> to`, CSV `"from","to"` and JSON ([{from,to}] or {from: to}). Lines starting
// with # are comments. Pure functions, shared by the renderer and the tests.

/** Splits one CSV line into fields ("" escapes a quote inside a quoted field). */
function csvFields(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === ';') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Parses a replacement list file. Returns [{from, to}] with empty "from" dropped. */
export function parseReplacements(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const trimmed = src.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const list = Array.isArray(data) ? data : Object.entries(data).map(([from, to]) => ({ from, to }));
      return clean(list.map((r) => ({ from: String(r?.from ?? ''), to: String(r?.to ?? '') })));
    } catch {
      /* not JSON: read as lines */
    }
  }
  const out = [];
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    let pair = null;
    if (line.includes('\t')) {
      const i = line.indexOf('\t');
      pair = [line.slice(0, i), line.slice(i + 1)];
    } else if (/\s(=>|->)\s/.test(line)) {
      const m = /^(.*?)\s(?:=>|->)\s(.*)$/.exec(line);
      pair = [m[1], m[2]];
    } else if (line.startsWith('"')) {
      const f = csvFields(line);
      pair = [f[0], f[1] ?? ''];
    }
    if (pair) out.push({ from: pair[0].trim(), to: pair[1].trim() });
  }
  return clean(out);
}

function clean(list) {
  return list.filter((r) => r.from && r.from.trim()).map((r) => ({ from: r.from.trim(), to: r.to ?? '' }));
}

/** Text file for export: a header comment, then `from<TAB>to` lines. Learned entries are kept. */
export function serializeReplacements(list, header = 'Scribner — auto-replacements (from<TAB>to)') {
  const lines = [`# ${header}`];
  for (const r of list || []) {
    if (!r || !r.from) continue;
    lines.push(`${String(r.from).replace(/[\t\n]/g, ' ')}\t${String(r.to ?? '').replace(/[\t\n]/g, ' ')}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Merges imported pairs into the current list. mode 'merge': an imported "from" replaces the
 * existing entry with the same "from" (case-sensitive), new ones are appended; 'replace': the
 * imported list takes the place of the current one. Returns { list, added, updated }.
 */
export function mergeReplacements(current, imported, mode = 'merge') {
  if (mode === 'replace') return { list: imported.map((r) => ({ from: r.from, to: r.to })), added: imported.length, updated: 0 };
  const list = (current || []).map((r) => ({ ...r }));
  let added = 0;
  let updated = 0;
  for (const r of imported) {
    const i = list.findIndex((x) => x.from === r.from);
    if (i >= 0) {
      if (list[i].to !== r.to || list[i].learned) updated++;
      list[i] = { from: r.from, to: r.to };
    } else {
      list.push({ from: r.from, to: r.to });
      added++;
    }
  }
  return { list, added, updated };
}
