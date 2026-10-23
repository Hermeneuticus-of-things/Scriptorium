// Generated help references: keyboard shortcuts (from DEFAULT_KEYS + i18n labels),
// Compile placeholders, Markdown / MultiMarkdown / Fountain cheat sheet, Script Mode keys.
// Pure module: no DOM.

import { DEFAULT_KEYS } from '../lib/commands.js';
import { dictionaries } from '../lib/i18n.js';
import { SCRIPT_FORMAT_LIST } from '../lib/scriptFormats.js';
import { MANUAL_RO } from './manual.ro.js';
import { MANUAL_EN } from './manual.en.js';

const pick = (lang) => (lang === 'en' ? 'en' : 'ro');

export function getManual(lang) {
  return pick(lang) === 'en' ? MANUAL_EN : MANUAL_RO;
}

/** Label of a command id in the given language (falls back to Romanian, then the id). */
export function commandLabel(id, lang) {
  const key = `cmd.${id}`;
  return dictionaries[pick(lang)][key] ?? dictionaries.ro[key] ?? null;
}

// Fixed (non-configurable) keys handled by the editor / binder, not by the command registry.
const FIXED_KEYS = [
  ['Ctrl+F', 'Caută în document', 'Find in document'],
  ['Ctrl+Alt+F', 'Caută după formatare', 'Find by formatting'],
  ['Ctrl+Z / Ctrl+Y', 'Anulează / Refă', 'Undo / Redo'],
  ['Ctrl+B / Ctrl+I / Ctrl+U', 'Bold / Italic / Subliniat', 'Bold / Italic / Underline'],
  ['Ctrl+Shift+V', 'Lipește fără formatare', 'Paste and match style'],
  ['Ctrl+Alt+C / Ctrl+Alt+V', 'Copiază / lipește formatarea', 'Copy / paste formatting'],
  ['Ctrl+Alt+Shift+P / S / W', 'Selectează paragraful / propoziția / cuvântul', 'Select paragraph / sentence / word'],
  ['F2', 'Redenumește în binder', 'Rename in binder'],
  ['↑ / ↓ / ← / →', 'Binder / Outline: navighează, restrânge / extinde', 'Binder / Outline: navigate, collapse / expand'],
  ['Delete', 'Binder: mută selecția în coș', 'Binder: move selection to Trash'],
  ['Ctrl+Z / Ctrl+Y (binder)', 'Anulează / refă mutările din binder', 'Undo / redo binder moves'],
  ['Enter', 'Binder: editează documentul; Corkboard / Outline: redenumește', 'Binder: edit document; Corkboard / Outline: rename'],
  ['Ctrl+Enter', 'Corkboard / Outline: deschide documentul', 'Corkboard / Outline: open document'],
  ['Ctrl+↑ / Ctrl+↓', 'Mută în binder sus / jos', 'Move up / down in binder'],
  ['Ctrl+← / Ctrl+→', 'Schimbă nivelul în binder', 'Outdent / indent in binder'],
  ['Alt+clic', 'Deschide în celălalt panou (split)', 'Open in the other editor (split)'],
  ['Esc', 'Ieși din modul compunere; din binder: înapoi în editor', 'Leave composition mode; from the binder: back to the editor'],
  ['Tab / Shift+Tab', 'Script Mode: elementul următor / anterior', 'Script Mode: next / previous element'],
  ['F1', 'Manualul (Ajutor)', 'Manual (Help)'],
];

/** [{id, key, label, configurable}] sorted by label. Every DEFAULT_KEYS entry is included. */
export function shortcutRows(lang, settings) {
  const l = pick(lang);
  const custom = (settings && settings.shortcuts) || {};
  const rows = Object.entries(DEFAULT_KEYS).map(([id, def]) => ({
    id,
    key: custom[id] !== undefined ? custom[id] : def,
    defaultKey: def,
    label: commandLabel(id, l) || id,
    configurable: true,
  }));
  rows.sort((a, b) => a.label.localeCompare(b.label, l));
  const fixed = FIXED_KEYS.map(([key, ro, en]) => ({ id: null, key, defaultKey: key, label: l === 'en' ? en : ro, configurable: false }));
  return [...rows, ...fixed];
}

// Mirrors placeholderValue() in lib/compile.cjs.
export const PLACEHOLDERS = [
  { code: '<$n>', ro: 'Numărul secțiunii (1, 2, 3…), numărat pe tipul de secțiune.', en: 'Section number (1, 2, 3…), counted per section type.' },
  { code: '<$n:roman>', ro: 'Număr roman cu majuscule (IV). Echivalent: <$n:R>.', en: 'Upper-case Roman numeral (IV). Also <$n:R>.' },
  { code: '<$n:lroman>', ro: 'Număr roman cu minuscule (iv). Echivalent: <$n:r>.', en: 'Lower-case Roman numeral (iv). Also <$n:r>.' },
  { code: '<$n:words>', ro: 'Numărul în litere, în română (patru). Echivalent: <$n:w>.', en: 'Number in Romanian words (patru). Also <$n:w>.' },
  { code: '<$n:Words>', ro: 'În litere, cu majusculă (Patru). Echivalent: <$n:W>.', en: 'Romanian words, capitalised (Patru). Also <$n:W>.' },
  { code: '<$n:WORDS>', ro: 'În litere, cu majuscule (PATRU).', en: 'Romanian words, upper case (PATRU).' },
  { code: '<$t>', ro: 'Titlul documentului. Echivalent: <$title>.', en: 'Document title. Also <$title>.' },
  { code: '<$wc>', ro: 'Numărul de cuvinte.', en: 'Word count.' },
  { code: '<$projecttitle>', ro: 'Titlul proiectului.', en: 'Project title.' },
  { code: '<$abbr_title>', ro: 'Abrevierea titlului (din Setările proiectului); altfel titlul.', en: 'Title abbreviation (Project settings), else the title.' },
  { code: '<$author>', ro: 'Numele complet al autorului.', en: 'Full author name.' },
  { code: '<$surname>', ro: 'Numele de familie al autorului. Echivalent: <$lastname>.', en: 'Author surname. Also <$lastname>.' },
  { code: '<$forename>', ro: 'Prenumele autorului. Echivalent: <$firstname>.', en: 'Author forename. Also <$firstname>.' },
  { code: '<$date>', ro: 'Data compilării (format românesc).', en: 'Compile date (Romanian format).' },
  { code: '<$year>', ro: 'Anul curent.', en: 'Current year.' },
  { code: '<$p>', ro: 'Numărul paginii; doar în antet și subsol.', en: 'Page number; headers and footers only.' },
  { code: '<$img:Nume>', ro: 'Imaginea din Cercetare cu acest titlu sau nume de fișier.', en: 'The Research image with this title or file name.' },
];

export function placeholderRows(lang) {
  const l = pick(lang);
  return PLACEHOLDERS.map((p) => ({ code: p.code, text: p[l] }));
}

// Syntax recognised by the importers (lib/docxImport.cjs markdownToHtml, lib/importers.cjs
// fountainToHtml) and produced by the Markdown / MultiMarkdown exporters.
export const SYNTAX = {
  markdown: [
    { code: '# Titlu', ro: 'Titlu 1 (## Titlu 2, ### Titlu 3)', en: 'Heading 1 (## Heading 2, ### Heading 3)' },
    { code: '**text**', ro: 'Bold', en: 'Bold' },
    { code: '*text*  _text_', ro: 'Italic', en: 'Italic' },
    { code: '> text', ro: 'Citat', en: 'Block quote' },
    { code: '***  ---', ro: 'Separator de scenă', en: 'Scene separator' },
    { code: '[^1] … [^1]: notă', ro: 'Notă de subsol (la export)', en: 'Footnote (on export)' },
    { code: '[@cheie]', ro: 'Citare din bibliografia importată (Pandoc)', en: 'Citation from the imported bibliography (Pandoc)' },
  ],
  multimarkdown: [
    { code: 'Title: …', ro: 'Metadate la început: titlul', en: 'Leading metadata: title' },
    { code: 'Author: …', ro: 'Autorul', en: 'Author' },
    { code: 'Date: …', ro: 'Data', en: 'Date' },
    { code: 'Language: ro', ro: 'Limba', en: 'Language' },
    { code: 'Bibliography: …', ro: 'Fișierul de bibliografie', en: 'Bibliography file' },
    { code: '(rând gol după metadate)', ro: 'Textul începe după primul rând gol', en: 'Body starts after the first blank line' },
  ],
  fountain: [
    { code: 'INT. CASĂ - ZI', ro: 'Titlu de scenă (INT, EXT, EST, INT./EXT., I/E sau .Titlu forțat)', en: 'Scene heading (INT, EXT, EST, INT./EXT., I/E or forced .Heading)' },
    { code: 'ANA', ro: 'Personaj: rând cu majuscule, cu rând gol înainte (@Nume forțează)', en: 'Character: upper-case line after a blank line (@Name forces)' },
    { code: '(încet)', ro: 'Paranteză în dialog', en: 'Parenthetical inside dialogue' },
    { code: 'Replica…', ro: 'Dialog: rândurile de după personaj', en: 'Dialogue: lines after the character' },
    { code: 'CUT TO:', ro: 'Tranziție (rând terminat cu TO:, sau > la început)', en: 'Transition (line ending in TO:, or leading >)' },
    { code: '>CENTRAT<', ro: 'Text centrat', en: 'Centred text' },
    { code: '!Acțiune', ro: 'Acțiune forțată', en: 'Forced action' },
    { code: '# Secțiune', ro: 'Secțiune (structură)', en: 'Section (structure)' },
    { code: '= Sinopsis', ro: 'Sinopsis', en: 'Synopsis' },
    { code: '[[notă]]  /* comentariu */', ro: 'Note și comentarii (ignorate la import)', en: 'Notes and comments (ignored on import)' },
    { code: '**bold** *italic* _subliniat_', ro: 'Formatare în text', en: 'Inline emphasis' },
    { code: 'Title: … (la început)', ro: 'Pagina de titlu (ignorată la import)', en: 'Title page (skipped on import)' },
  ],
};

export function syntaxRows(kind, lang) {
  const l = pick(lang);
  return (SYNTAX[kind] || []).map((r) => ({ code: r.code, text: r[l] }));
}

/** Script Mode elements per format with their Tab and Enter successors. */
export function scriptRows() {
  return SCRIPT_FORMAT_LIST.map((f) => {
    const label = (id) => f.elements.find((e) => e.id === id)?.label || id;
    return {
      id: f.id,
      label: f.label,
      defaultElement: label(f.defaultElement),
      elements: f.elements.map((e) => ({
        id: e.id,
        label: e.label,
        upper: e.upper,
        tab: f.tab[e.id] ? label(f.tab[e.id]) : label(f.defaultElement),
        enter: f.enter[e.id] ? label(f.enter[e.id]) : label(f.defaultElement),
      })),
    };
  });
}
