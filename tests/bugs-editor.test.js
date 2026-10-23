// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { Corrections } from '../src/editor/corrections.js';
import { buildRegex, replaceInHtml } from '../src/lib/search.js';
import { lint } from '../src/lib/editorial.js';
import { wordFrequency } from '../src/lib/stats.js';

let ed;
afterEach(() => ed?.destroy());

describe('search/replace', () => {
  it('$N beyond the group count is literal, not the offset/input string', () => {
    const re = buildRegex({ query: '(a)b', regex: true });
    expect(replaceInHtml('<p>xab</p>', re, '[$1|$2|$3]').html).toBe('<p>x[a|$2|$3]</p>');
  });
  it('supports $& and $$', () => {
    const re = buildRegex({ query: 'ab' });
    expect(replaceInHtml('<p>ab</p>', re, '<$&>$$').html).toBe('<p>&lt;ab&gt;$</p>');
  });
  it('does not turn ordinary spaces into &nbsp; and keeps real nbsp', () => {
    const re = buildRegex({ query: 'x' });
    expect(replaceInHtml('<p>a b&nbsp;x</p>', re, 'y').html).toBe('<p>a b&nbsp;y</p>');
  });
});

describe('Romanian cedilla variants', () => {
  it('lint finds banned transitions written with cedilla (aşadar)', () => {
    const issues = lint('<p>Aşadar, plecăm acasă mâine dimineață.</p>');
    expect(issues.some((i) => i.rule === 'transition')).toBe(true);
  });
  it('wordFrequency merges ş/ș and ţ/ț spellings', () => {
    const f = wordFrequency('ţara țara ţara', { minLength: 1 });
    expect(f).toEqual([{ word: 'țara', count: 3, percent: 100 }]);
  });
});

describe('corrections', () => {
  it('do not fire inside inline code', () => {
    ed = new Editor({ extensions: [...buildExtensions({ smartQuotes: false }), Corrections.configure({ smartDashes: true })], content: '<p><code>a-</code></p>' });
    const pos = ed.state.doc.content.size - 1;
    ed.commands.setTextSelection(pos);
    const { view } = ed;
    const handled = view.someProp('handleTextInput', (f) => f(view, pos, pos, '-', () => view.state.tr.insertText('-', pos, pos)));
    if (!handled) ed.commands.insertContent('-');
    expect(ed.getHTML()).toContain('a--');
  });
});
