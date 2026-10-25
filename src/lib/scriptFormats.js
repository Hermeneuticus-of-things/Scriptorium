// Script Mode formats (own implementation). Each format defines paragraph
// element types, Tab / Enter transition tables and per-element layout.
// Element ids match the importers' data-style ids (fdxStyle / fountainToHtml).

const el = (id, label, opts = {}) => ({ id, label, upper: false, ...opts });

const SCREENPLAY = {
  id: 'screenplay',
  label: 'Scenariu de film',
  defaultElement: 'action',
  elements: [
    el('scene-heading', 'Titlu scenă', { upper: true, fdx: 'Scene Heading', css: { marginTop: '1.5em', fontWeight: 'bold' } }),
    el('action', 'Acțiune', { fdx: 'Action', css: { marginTop: '1em' } }),
    el('character', 'Personaj', { upper: true, fdx: 'Character', css: { marginTop: '1em', marginLeft: '37%' } }),
    el('parenthetical', 'Paranteză', { fdx: 'Parenthetical', css: { marginLeft: '30%', marginRight: '30%' } }),
    el('dialogue', 'Dialog', { fdx: 'Dialogue', css: { marginLeft: '17%', marginRight: '17%' } }),
    el('transition', 'Tranziție', { upper: true, fdx: 'Transition', css: { marginTop: '1em', textAlign: 'right' } }),
    el('shot', 'Cadru', { upper: true, fdx: 'Shot', css: { marginTop: '1em' } }),
    el('general', 'General', { fdx: 'General' }),
  ],
  tab: { action: 'character', character: 'transition', transition: 'scene-heading', 'scene-heading': 'action', dialogue: 'parenthetical', parenthetical: 'dialogue', shot: 'action', general: 'action' },
  enter: { 'scene-heading': 'action', action: 'action', character: 'dialogue', parenthetical: 'dialogue', dialogue: 'character', transition: 'scene-heading', shot: 'action', general: 'general' },
};

const STAGE_PLAY = {
  id: 'stageplay',
  label: 'Piesă de teatru',
  defaultElement: 'stage-direction',
  elements: [
    el('act', 'Act', { upper: true, css: { marginTop: '2em', textAlign: 'center', textDecoration: 'underline' } }),
    el('scene-heading', 'Scenă', { upper: true, fdx: 'Scene Heading', css: { marginTop: '1.5em', textAlign: 'center' } }),
    el('stage-direction', 'Indicație scenică', { fdx: 'Action', css: { marginTop: '1em', marginLeft: '30%', fontStyle: 'italic' } }),
    el('character', 'Personaj', { upper: true, fdx: 'Character', css: { marginTop: '1em', textAlign: 'center' } }),
    el('parenthetical', 'Paranteză', { fdx: 'Parenthetical', css: { marginLeft: '30%', fontStyle: 'italic' } }),
    el('dialogue', 'Replică', { fdx: 'Dialogue', css: { marginLeft: '10%', marginRight: '10%' } }),
    el('transition', 'Tranziție', { upper: true, fdx: 'Transition', css: { marginTop: '1em', textAlign: 'right' } }),
  ],
  tab: { 'stage-direction': 'character', character: 'stage-direction', dialogue: 'parenthetical', parenthetical: 'dialogue', act: 'scene-heading', 'scene-heading': 'stage-direction', transition: 'scene-heading' },
  enter: { act: 'scene-heading', 'scene-heading': 'stage-direction', 'stage-direction': 'character', character: 'dialogue', parenthetical: 'dialogue', dialogue: 'character', transition: 'scene-heading' },
};

// UK stage play: character names on the left margin, speech indented beside/under
// them, stage directions indented and italic, acts and scenes centred.
const STAGE_PLAY_UK = {
  id: 'stageplay-uk',
  label: 'Piesă de teatru (UK)',
  defaultElement: 'stage-direction',
  elements: [
    el('act', 'Act', { upper: true, css: { marginTop: '2em', textAlign: 'center', fontWeight: 'bold' } }),
    el('scene-heading', 'Scenă', { upper: true, fdx: 'Scene Heading', css: { marginTop: '1.5em', textAlign: 'center', textDecoration: 'underline' } }),
    el('stage-direction', 'Indicație scenică', { fdx: 'Action', css: { marginTop: '1em', marginLeft: '25%', fontStyle: 'italic' } }),
    el('character', 'Personaj', { upper: true, fdx: 'Character', css: { marginTop: '1em' } }),
    el('parenthetical', 'Paranteză', { fdx: 'Parenthetical', css: { marginLeft: '25%', fontStyle: 'italic' } }),
    el('dialogue', 'Replică', { fdx: 'Dialogue', css: { marginLeft: '25%' } }),
    el('transition', 'Tranziție', { upper: true, fdx: 'Transition', css: { marginTop: '1em', textAlign: 'right' } }),
  ],
  tab: { ...STAGE_PLAY.tab },
  enter: { ...STAGE_PLAY.enter },
};

const COMIC = {
  id: 'comic',
  label: 'Benzi desenate',
  defaultElement: 'panel',
  elements: [
    el('page', 'Pagină', { upper: true, css: { marginTop: '2em', fontWeight: 'bold', textDecoration: 'underline' } }),
    el('panel', 'Panou', { css: { marginTop: '1.2em', fontWeight: 'bold' } }),
    el('description', 'Descriere', { fdx: 'Action', css: { marginTop: '0.5em' } }),
    el('character', 'Personaj', { upper: true, fdx: 'Character', css: { marginTop: '0.8em', marginLeft: '20%' } }),
    el('dialogue', 'Balon', { fdx: 'Dialogue', css: { marginLeft: '30%' } }),
    el('caption', 'Text narativ', { css: { marginTop: '0.8em', marginLeft: '20%', fontStyle: 'italic' } }),
    el('sfx', 'Efect sonor', { upper: true, css: { marginTop: '0.8em', marginLeft: '20%' } }),
  ],
  tab: { panel: 'description', description: 'character', character: 'caption', caption: 'sfx', sfx: 'character', dialogue: 'character', page: 'panel' },
  enter: { page: 'panel', panel: 'description', description: 'character', character: 'dialogue', dialogue: 'character', caption: 'character', sfx: 'description' },
};

const BBC_RADIO = {
  id: 'radio',
  label: 'Teatru radiofonic (BBC)',
  defaultElement: 'character',
  elements: [
    el('scene-heading', 'Scenă', { upper: true, fdx: 'Scene Heading', css: { marginTop: '1.5em', textDecoration: 'underline' } }),
    el('direction', 'Indicație', { fdx: 'Action', css: { marginTop: '1em', marginLeft: '25%', textTransform: 'uppercase' } }),
    el('character', 'Personaj', { upper: true, fdx: 'Character', css: { marginTop: '1em' } }),
    el('dialogue', 'Replică', { fdx: 'Dialogue', css: { marginLeft: '25%', lineHeight: '2' } }),
    el('sound', 'Sunet (SFX)', { upper: true, css: { marginTop: '1em', fontWeight: 'bold', textDecoration: 'underline' } }),
    el('music', 'Muzică', { upper: true, css: { marginTop: '1em', fontWeight: 'bold', textDecoration: 'underline' } }),
  ],
  tab: { character: 'direction', direction: 'sound', sound: 'music', music: 'character', dialogue: 'direction', 'scene-heading': 'direction' },
  enter: { 'scene-heading': 'direction', direction: 'character', character: 'dialogue', dialogue: 'character', sound: 'character', music: 'character' },
};

export const BUILTIN_FORMATS = { screenplay: SCREENPLAY, stageplay: STAGE_PLAY, 'stageplay-uk': STAGE_PLAY_UK, comic: COMIC, radio: BBC_RADIO };
// The registry: built-in formats plus the author's own (setCustomFormats). The objects are
// replaced in place so modules that imported them see the custom formats too.
export const SCRIPT_FORMATS = { ...BUILTIN_FORMATS };
export const SCRIPT_FORMAT_LIST = Object.values(SCRIPT_FORMATS);

export function getFormat(id) {
  return SCRIPT_FORMATS[id] || SCREENPLAY;
}

export function getElement(formatId, elementId) {
  return getFormat(formatId).elements.find((e) => e.id === elementId) || null;
}

/** Next element on Tab (shift = reverse lookup, else cycle back). */
export function nextOnTab(formatId, current, shift = false) {
  const f = getFormat(formatId);
  if (!f.elements.some((e) => e.id === current)) return f.defaultElement;
  if (shift) {
    const back = Object.keys(f.tab).find((k) => f.tab[k] === current);
    if (back) return back;
    const ids = f.elements.map((e) => e.id);
    return ids[(ids.indexOf(current) - 1 + ids.length) % ids.length];
  }
  return f.tab[current] || f.defaultElement;
}

/** Element for the new paragraph created by Enter. Empty paragraph + Enter on dialogue → action-like default. */
export function nextOnEnter(formatId, current, isEmpty = false) {
  const f = getFormat(formatId);
  if (isEmpty) return f.defaultElement;
  return f.enter[current] || f.defaultElement;
}

export function isUppercase(formatId, elementId) {
  return !!getElement(formatId, elementId)?.upper;
}

/** All element ids known to any format. */
export const ALL_SCRIPT_ELEMENTS = [...new Set(SCRIPT_FORMAT_LIST.flatMap((f) => f.elements.map((e) => e.id)))];

// ---------------------------------------------------------------- custom formats (format editor)
// A custom format: { id: 'custom-…', label, defaultElement, custom: true,
//   elements: [{ id, label, upper, fontFamily?, fontSizePt?, indentLeft (%), indentRight (%),
//                align, spaceBefore (lines), bold, italic, underline, fdx? }],
//   tab: {el: next}, enter: {el: next} }

const ALIGNS = ['left', 'center', 'right', 'justify'];
const slugId = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
const num = (v, min, max, def) => {
  const n = Number(v);
  return v !== '' && v != null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** Element layout fields → the css object used by formatCss. */
export function elementCss(e) {
  const css = {};
  if (e.spaceBefore) css.marginTop = `${e.spaceBefore}em`;
  if (e.indentLeft) css.marginLeft = `${e.indentLeft}%`;
  if (e.indentRight) css.marginRight = `${e.indentRight}%`;
  if (e.align && e.align !== 'left') css.textAlign = e.align;
  if (e.bold) css.fontWeight = 'bold';
  if (e.italic) css.fontStyle = 'italic';
  if (e.underline) css.textDecoration = 'underline';
  if (e.fontFamily) css.fontFamily = `"${e.fontFamily}"`;
  if (e.fontSizePt) css.fontSize = `${e.fontSizePt}pt`;
  return css;
}

/** Built-in element css → editable layout fields (to start a custom format from a built-in one). */
export function editableElement(e) {
  const c = e.css || {};
  const pct = (v) => (v && /%$/.test(v) ? Number(String(v).replace('%', '')) : 0);
  return {
    id: e.id,
    label: e.label,
    upper: Boolean(e.upper),
    fontFamily: e.fontFamily || '',
    fontSizePt: e.fontSizePt || 0,
    indentLeft: e.indentLeft ?? pct(c.marginLeft),
    indentRight: e.indentRight ?? pct(c.marginRight),
    align: e.align || c.textAlign || 'left',
    spaceBefore: e.spaceBefore ?? (c.marginTop ? Number(String(c.marginTop).replace('em', '')) || 0 : 0),
    bold: e.bold ?? c.fontWeight === 'bold',
    italic: e.italic ?? c.fontStyle === 'italic',
    underline: e.underline ?? c.textDecoration === 'underline',
    fdx: e.fdx || '',
  };
}

/** Cleans a custom format (from the editor or a file). Returns null when it has no element. */
export function normalizeCustomFormat(f) {
  if (!f || typeof f !== 'object') return null;
  const seen = new Set();
  const elements = (Array.isArray(f.elements) ? f.elements : [])
    .map((e) => {
      const id = slugId(e && (e.id || e.label));
      if (!id || seen.has(id)) return null;
      seen.add(id);
      const out = {
        id,
        label: String(e.label || id).slice(0, 60),
        upper: Boolean(e.upper),
        fontFamily: String(e.fontFamily || '').replace(/[^\w\s-]/g, '').slice(0, 60),
        fontSizePt: num(e.fontSizePt, 0, 72, 0),
        indentLeft: num(e.indentLeft, 0, 80, 0),
        indentRight: num(e.indentRight, 0, 80, 0),
        align: ALIGNS.includes(e.align) ? e.align : 'left',
        spaceBefore: num(e.spaceBefore, 0, 5, 0),
        bold: Boolean(e.bold),
        italic: Boolean(e.italic),
        underline: Boolean(e.underline),
        fdx: String(e.fdx || '').slice(0, 40),
      };
      out.css = elementCss(out);
      return out;
    })
    .filter(Boolean);
  if (!elements.length) return null;
  const ids = elements.map((e) => e.id);
  const table = (t) => Object.fromEntries(Object.entries(t && typeof t === 'object' ? t : {}).filter(([k, v]) => ids.includes(k) && ids.includes(v)));
  const label = String(f.label || 'Format propriu').slice(0, 80);
  return {
    id: String(f.id || '').startsWith('custom-') ? String(f.id).slice(0, 60) : `custom-${slugId(label) || 'format'}`,
    label,
    custom: true,
    defaultElement: ids.includes(f.defaultElement) ? f.defaultElement : ids[0],
    elements,
    tab: table(f.tab),
    enter: table(f.enter),
  };
}

/** A custom format started from an existing one (built-in or custom). */
export function copyFormat(fromId, label) {
  const f = getFormat(fromId);
  return normalizeCustomFormat({ label: label || `${f.label} (copie)`, defaultElement: f.defaultElement, elements: f.elements.map(editableElement), tab: { ...f.tab }, enter: { ...f.enter } });
}

/** Replaces the custom formats in the registry (built-in ones stay). Returns the cleaned list. */
export function setCustomFormats(list) {
  for (const k of Object.keys(SCRIPT_FORMATS)) if (!BUILTIN_FORMATS[k]) delete SCRIPT_FORMATS[k];
  const clean = (Array.isArray(list) ? list : []).map(normalizeCustomFormat).filter(Boolean);
  for (const f of clean) if (!BUILTIN_FORMATS[f.id]) SCRIPT_FORMATS[f.id] = f;
  SCRIPT_FORMAT_LIST.length = 0;
  SCRIPT_FORMAT_LIST.push(...Object.values(SCRIPT_FORMATS));
  const ids = new Set(ALL_SCRIPT_ELEMENTS);
  for (const f of clean) for (const e of f.elements) if (!ids.has(e.id)) (ids.add(e.id), ALL_SCRIPT_ELEMENTS.push(e.id));
  // The editor's CSS for the custom formats (built-in ones are in src/script.css).
  if (typeof document !== 'undefined') {
    let style = document.getElementById('script-custom-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'script-custom-css';
      document.head.appendChild(style);
    }
    style.textContent = clean.map((f) => formatCss(f.id)).join('\n');
  }
  return clean;
}

/** A format as a file (.scriptformat, JSON). */
export function formatToFile(f) {
  const clean = normalizeCustomFormat(f.custom ? f : { ...f, elements: f.elements.map(editableElement) });
  const { css: _c, ...rest } = clean;
  return JSON.stringify({ type: 'scribner-script-format', version: 1, format: { ...rest, elements: clean.elements.map(({ css: _x, ...e }) => e) } }, null, 2);
}

/** Reads a .scriptformat file; throws on anything else. */
export function formatFromFile(text) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch {
    throw new Error('Fișierul nu este un format de scenariu.');
  }
  const f = normalizeCustomFormat(data && data.type === 'scribner-script-format' ? data.format : data);
  if (!f) throw new Error('Formatul de scenariu nu are niciun element.');
  return f;
}

/** "Tab: …, Enter: …" for the footer next to the current element. */
export function elementHint(formatId, elementId) {
  const f = getFormat(formatId);
  const cur = f.elements.find((e) => e.id === elementId) || f.elements.find((e) => e.id === f.defaultElement);
  const label = (id) => f.elements.find((e) => e.id === id)?.label || id;
  if (!cur) return null;
  return { element: cur.id, label: cur.label, tab: label(nextOnTab(f.id, cur.id)), enter: label(nextOnEnter(f.id, cur.id)) };
}

// ---------------------------------------------------------------- completion lists (editable)
// project.scriptCompletion = { characters: [], places: [], transitions: [], extensions: [] }
export const DEFAULT_TRANSITIONS = ['CUT TO:', 'FADE IN:', 'FADE OUT.', 'DISSOLVE TO:', 'MATCH CUT TO:', 'SMASH CUT TO:'];
export const DEFAULT_EXTENSIONS = ['(V.O.)', '(O.S.)', "(CONT'D)"];
const completion = { characters: [], places: [], transitions: DEFAULT_TRANSITIONS.slice(), extensions: DEFAULT_EXTENSIONS.slice() };

const cleanList = (l) => [...new Set((Array.isArray(l) ? l : String(l || '').split(/\r?\n/)).map((x) => String(x).trim().toUpperCase()).filter(Boolean))].slice(0, 1000);

/** Normalized completion lists (uppercase, unique, no empty lines). */
export function normalizeCompletion(c = {}) {
  c = c && typeof c === 'object' ? c : {};
  return {
    characters: cleanList(c.characters),
    places: cleanList(c.places),
    transitions: c.transitions ? cleanList(c.transitions) : DEFAULT_TRANSITIONS.slice(),
    extensions: c.extensions ? cleanList(c.extensions) : DEFAULT_EXTENSIONS.slice(),
  };
}
export function setCompletionLists(c) {
  Object.assign(completion, normalizeCompletion(c));
  return { ...completion };
}
export function getCompletionLists() {
  return { ...completion };
}
/** Names typed in the document followed by the project's list (no duplicates). */
export function mergedCharacters(fromDoc = []) {
  return [...new Set([...(fromDoc || []), ...completion.characters])];
}
/** Scene headings from the document plus "INT. <place> - " for every place of the list. */
export function mergedSceneHeadings(fromDoc = []) {
  return [...new Set([...(fromDoc || []), ...completion.places.flatMap((p) => (/^(INT|EXT)/.test(p) ? [p] : [`INT. ${p} - `, `EXT. ${p} - `]))])];
}
/** Transition completions for a typed prefix. */
export function completeTransition(prefix) {
  const p = String(prefix || '').trim().toUpperCase();
  if (!p) return [];
  return completion.transitions.filter((t) => t.startsWith(p) && t !== p);
}

// ---------------------------------------------------------------- compile side
// Output paragraph style of each element (Compile > Script settings): the Word / FDX style name,
// the element's layout and whether it is uppercase.
export function scriptStyleMap(formatId) {
  const f = getFormat(formatId);
  return Object.fromEntries(f.elements.map((e) => [e.id, { style: e.fdx || e.label, label: e.label, upper: Boolean(e.upper), css: e.css || elementCss(e) }]));
}

/**
 * Dialogue split across pages (Compile: automatic "(MORE)" / "(CONT'D)"). blocks: [{el, text}] in
 * order; linesPerPage: lines on a page; lineOf(block) the lines a block takes (default 1 per 60
 * characters + its space before). Returns the blocks with page breaks inserted: where a dialogue
 * is cut, "(MORE)" ends the page and the next page starts with "NAME (CONT'D)".
 */
export function paginateDialogue(blocks, linesPerPage = 55, lineOf = (b) => Math.max(1, Math.ceil(String(b.text || '').length / 60))) {
  const out = [];
  let used = 0;
  let speaker = null;
  for (const b of blocks || []) {
    if (b.el === 'character') speaker = String(b.text || '').replace(/\s*\(CONT'D\)\s*$/i, '').trim();
    else if (!['dialogue', 'parenthetical'].includes(b.el)) speaker = null;
    const n = lineOf(b);
    if (used + n > linesPerPage && used > 0) {
      if (speaker && ['dialogue', 'parenthetical'].includes(b.el)) {
        out.push({ el: 'more', text: '(MORE)' }, { el: 'page-break' }, { el: 'character', text: `${speaker} (CONT'D)` });
        used = 1;
      } else {
        out.push({ el: 'page-break' });
        used = 0;
      }
    }
    out.push(b);
    used += n;
  }
  return out;
}

const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/** CSS for one format, scoped as `.script-<format> p[data-script="…"]`. */
export function formatCss(formatId) {
  const f = getFormat(formatId);
  return f.elements
    .map((e) => {
      const decl = Object.entries(e.css || {}).map(([k, v]) => `${kebab(k)}: ${v};`);
      if (e.upper) decl.push('text-transform: uppercase;');
      return `.script-${f.id} p[data-script="${e.id}"] { margin-bottom: 0; ${decl.join(' ')} }`;
    })
    .join('\n');
}

/** Collect character names (in order of frequency) from HTML with data-script / data-style="character". */
export function collectCharacters(html) {
  const counts = new Map();
  const re = /<p[^>]*data-(?:script|style)="character"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const name = m[1].replace(/<[^>]+>/g, '').replace(/\s*\((V\.O\.|O\.S\.|CONT'D|O\.C\.)\)\s*$/i, '').trim().toUpperCase();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

/** Autocomplete: names starting with prefix (case-insensitive, diacritics kept). */
export function completeCharacter(names, prefix) {
  names = mergedCharacters(names);
  const p = String(prefix || '').trim().toUpperCase();
  if (!p) return [];
  return names.filter((n) => n.startsWith(p) && n !== p);
}

export const SCENE_PREFIXES = ['INT. ', 'EXT. ', 'INT./EXT. ', 'EXT./INT. '];

/** Scene headings used in the document (data-script / data-style="scene-heading"), most frequent first. */
export function collectSceneHeadings(html) {
  const counts = new Map();
  const re = /<p[^>]*data-(?:script|style)="scene-heading"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const h = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim().toUpperCase();
    if (h) counts.set(h, (counts.get(h) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
}

/** Scene heading completions: INT./EXT. prefixes first, then earlier headings (and their place part). */
export function completeSceneHeading(headings, prefix) {
  const p = String(prefix || '').replace(/^\s+/, '').toUpperCase();
  if (!p) return [];
  const places = [];
  for (const h of mergedSceneHeadings(headings)) {
    places.push(h);
    // "INT. CASA - ZI" also offers "INT. CASA - " for a new time of day
    const dash = h.lastIndexOf(' - ');
    if (dash > 0) places.push(h.slice(0, dash + 3));
  }
  return [...new Set([...SCENE_PREFIXES, ...places])].filter((c) => c.startsWith(p) && c !== p);
}
