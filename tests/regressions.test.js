// Regression suite: one test per bug we have actually hit, so it can never come back silently.
// Rule (see BUGS.md): when a bug is fixed, add a test here named after it. Keep each test tiny and
// pointed at the exact broken contract. New entries go at the bottom with a date and a one-line note.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { FORMAT_ITEMS, FORMAT_DEFAULT } from '../src/lib/toolbars.js';
import { routeSelection } from '../src/lib/panes.js';
import { LOOKUPS } from '../src/lib/lookups.js';

const require = createRequire(import.meta.url);
const translate = require('../lib/translate.cjs');
const { fetchSynonyms, parseSynonyms } = require('../lib/synonyms.cjs');

describe('regressions', () => {
  // 2026-10-25 — v0.10.8 crash "Cannot read properties of undefined (reading 'id')": the format bar
  // built one more group than FORMAT_ITEMS had ids, so `FORMAT_ITEMS[i].id` read undefined and the
  // whole editor window went to the error boundary. Guard the contract the render relies on.
  it('format bar: FORMAT_ITEMS ids are unique and non-empty (group↔id alignment)', () => {
    const ids = FORMAT_ITEMS.map((x) => x.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('paraSpace'); // the group whose missing id caused the crash
    expect(FORMAT_DEFAULT.every((id) => ids.includes(id))).toBe(true);
  });

  // 2026-10-26 — binder "dead click": with the sole editor pane locked (🔒) and no split,
  // routeSelection returns null, so clicking a document did nothing. The contract must hold (the UI
  // now shows a toast for the null case); an unlocked pane must still open the document.
  it('panes: a locked sole pane routes nowhere, an unlocked one opens in main', () => {
    expect(routeSelection({ active: 'main', locks: { main: true }, hasSplit: false })).toBeNull();
    expect(routeSelection({ active: 'main', locks: {}, hasSplit: false })).toBe('main');
    expect(routeSelection({ active: 'main', locks: { main: true }, hasSplit: true })).toBe('split');
  });

  // 2026-10-25 — v0.10.11 synonyms: the sinonimul.ro lookup opened a Google "I'm feeling lucky"
  // redirect instead of the word's page. It must hit the site directly, percent-encoding diacritics.
  it('lookups: sinonimul.ro uses its own direct page, not a Google redirect', () => {
    const url = LOOKUPS.sinonimul.url('mâncare');
    expect(url).toBe('https://sinonimul.ro/m%C3%A2ncare');
    expect(url).not.toMatch(/google|btnI/i);
  });

  // 2026-10-26 — sinonimul.ro keeps only lemmas, so an inflected form hits /404.php. The in-app
  // fetch must say so clearly instead of surfacing a raw "error 404".
  it('synonyms: a non-lemma (404) returns a clear "use the base form" message', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, url: 'https://sinonimul.ro/404.php', text: async () => '' });
    await expect(fetchSynonyms({ word: 'frumoasă', fetchImpl })).rejects.toThrow(/forma de bază/);
  });

  // DeepL rejects source_lang "AUTO"; auto-detect must omit source_lang entirely.
  it('translate: DeepL omits source_lang when the source is auto', async () => {
    let body = null;
    const fetchImpl = async (_url, opts) => { body = JSON.parse(opts.body); return { ok: true, json: async () => ({ translations: [{ text: 'x', detected_source_language: 'EN' }] }) }; };
    await translate.deeplTranslate({ apiKey: 'k:fx', text: 'hello', from: 'auto', to: 'ro', fetchImpl });
    expect(body.source_lang).toBeUndefined();
    expect(body.target_lang).toBe('RO');
  });

  // Sanity: the parser keeps only the direct synonym rows (font-size:22px), not the related words.
  it('synonyms: parser reads the direct rows and drops the word itself', () => {
    const html = "<ol><li style='font-size:22px'>plăcut, frumos, splendid</li></ol><li><a href='x'><b>alt</b></a> - y</li>";
    expect(parseSynonyms(html, 'frumos')).toEqual(['plăcut', 'splendid']);
  });
});
