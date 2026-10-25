// Compile format as a file: export one format (.scribcompile, JSON) to share it between
// projects or computers, and import it back as a new, editable format.

export const FORMAT_FILE_EXT = 'scribcompile';
const KIND = 'scribner-compile-format';

/** JSON text of a format file. Built-in flags and the global marker are dropped. */
export function exportFormatFile(format) {
  const copy = JSON.parse(JSON.stringify(format || {}));
  delete copy.builtin;
  delete copy.legacy;
  delete copy.global;
  return JSON.stringify({ kind: KIND, version: 1, format: copy }, null, 2);
}

/** File name for the exported format: its name without characters a file system refuses. */
export function formatFileName(format) {
  const base = String((format && format.name) || 'format').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'format';
  return `${base}.${FORMAT_FILE_EXT}`;
}

/**
 * Parses a format file (or a bare format object in JSON). Returns a new custom format with a fresh
 * id; `existingNames` makes the name unique ("Name (2)"). Throws on anything that is not a format.
 */
export function importFormatFile(text, existingNames = [], newId = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch {
    throw new Error('invalid-json');
  }
  const f = data && data.kind === KIND ? data.format : data;
  if (!f || typeof f !== 'object' || Array.isArray(f) || (typeof f.layouts !== 'object' && typeof f.typography !== 'object')) throw new Error('not-a-format');
  const out = JSON.parse(JSON.stringify(f));
  delete out.builtin;
  delete out.legacy;
  delete out.global;
  if (!out.basedOn && typeof f.id === 'string' && !f.id.startsWith('custom-')) out.basedOn = f.id;
  out.id = newId();
  let name = String(out.name || 'Format importat').trim() || 'Format importat';
  const taken = new Set(existingNames);
  if (taken.has(name)) {
    let i = 2;
    while (taken.has(`${name} (${i})`)) i++;
    name = `${name} (${i})`;
  }
  out.name = name;
  if (!out.layouts || typeof out.layouts !== 'object') out.layouts = {};
  if (!Array.isArray(out.replacements)) out.replacements = [];
  return out;
}
