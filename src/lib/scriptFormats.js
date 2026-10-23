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

export const SCRIPT_FORMATS = { screenplay: SCREENPLAY, stageplay: STAGE_PLAY, 'stageplay-uk': STAGE_PLAY_UK, comic: COMIC, radio: BBC_RADIO };
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
  for (const h of headings || []) {
    places.push(h);
    // "INT. CASA - ZI" also offers "INT. CASA - " for a new time of day
    const dash = h.lastIndexOf(' - ');
    if (dash > 0) places.push(h.slice(0, dash + 3));
  }
  return [...new Set([...SCENE_PREFIXES, ...places])].filter((c) => c.startsWith(p) && c !== p);
}
