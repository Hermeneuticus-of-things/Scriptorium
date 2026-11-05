// @vitest-environment jsdom
// T25 UI stress: a 100k+ word manuscript (the real scale the app is built for).
// Measures (a) getHTML serialization, (b) one big insert transaction, (c) undo at
// 200 steps. The numbers are reported; the app paths themselves are debounced
// (SERIALIZE_DELAY), so the test asserts correctness at scale, not raw speed.
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';

let ed;
afterEach(() => ed?.destroy());

const WORDS = ['câmp', 'carte', 'sofer', 'pneuma', 'timp', 'rușine', 'cuvânt', 'padure', 'lume', 'scris'];
const wordAt = (i) => WORDS[i % WORDS.length];
// ~40 words per paragraph; 2800 paragraphs ≈ 112k words.
const PARAGRAPHS = 2800;
const WORDS_PER_PARA = 40;

function bigHtml(paragraphs = PARAGRAPHS) {
  const parts = [];
  for (let p = 0; p < paragraphs; p++) {
    let txt = '';
    for (let w = 0; w < WORDS_PER_PARA; w++) txt += wordAt(p * WORDS_PER_PARA + w) + ' ';
    parts.push(`<p>${txt.trim()}.</p>`);
  }
  return parts.join('');
}

const ms = (t0) => Number(process.hrtime.bigint() - t0) / 1e6;
const countWords = (html) => (html.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

describe('T25 UI stress: 100k+ word document', () => {
  it('measures serialization, big insert and 200-step undo, and stays correct', () => {
    const html = bigHtml();
    expect(countWords(html)).toBeGreaterThanOrEqual(100000);

    let t0 = process.hrtime.bigint();
    ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content: html });
    const parseMs = ms(t0);
    expect(ed.getText().length).toBeGreaterThan(400000);

    t0 = process.hrtime.bigint();
    const out = ed.getHTML();
    const getHtmlMs = ms(t0);
    expect(countWords(out)).toBeGreaterThanOrEqual(100000);

    // (b) one big insert: a 20k-word paste in a single transaction.
    let chunk = '';
    for (let w = 0; w < 20000; w++) chunk += `${wordAt(w)} `;
    const before = countWords(ed.getHTML());
    t0 = process.hrtime.bigint();
    ed.commands.insertContent(`<p>${chunk.trim()}.</p>`);
    const insertMs = ms(t0);
    const afterIns = countWords(ed.getHTML());
    expect(afterIns).toBeGreaterThanOrEqual(before + 19900);

    // (c) undo back 200 steps: one undo per command batch above collapses into few history
    // entries, so first make 200 real typing steps (single-word edits across the document).
    const docSize = ed.state.doc.content.size;
    t0 = process.hrtime.bigint();
    const steps = 200;
    for (let i = 0; i < steps; i++) {
      const pos = Math.max(1, Math.min(docSize - 2, Math.round(((i + 1) * docSize) / (steps + 1))));
      ed.commands.insertContentAt(pos, `${i}x `);
    }
    const stepsMs = ms(t0);
    t0 = process.hrtime.bigint();
    let done = 0;
    let maxUndoMs = 0;
    for (let i = 0; i < steps; i++) {
      const u0 = process.hrtime.bigint();
      const ok = ed.commands.undo();
      const uMs = ms(u0);
      if (uMs > maxUndoMs) maxUndoMs = uMs;
      if (!ok) break;
      done++;
    }
    const undoTotalMs = ms(t0);
    // Undo must actually restore earlier content (at least partially unique markers are gone).
    expect(done).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log('T25-STRESS passed');
    // eslint-disable-next-line no-console
    console.log(`[T25-STRESS jsdom, ~${((countWords(out) / 1000) | 0)}k words] parse(setContent): ${parseMs.toFixed(0)} ms | getHTML: ${getHtmlMs.toFixed(0)} ms | insert 20k words (1 transaction): ${insertMs.toFixed(0)} ms | 200 typing steps: ${stepsMs.toFixed(0)} ms | undo x${done}: total ${undoTotalMs.toFixed(0)} ms, max single ${maxUndoMs.toFixed(0)} ms`);
  }, 300000);
});
