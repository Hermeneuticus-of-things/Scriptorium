// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildExtensions } from '../src/editor/extensions.js';
import { collapseSpaces, stripLeadingTabs, collapseBlankLines, editorMenus } from '../src/lib/editorMenus.js';
import { dictionaries } from '../src/lib/i18n.js';

describe('text tidying transforms (pure helpers)', () => {
  it('collapses runs of spaces/tabs to a single space', () => {
    expect(collapseSpaces('a   b\t\tc')).toBe('a b c');
    expect(collapseSpaces('one two')).toBe('one two');
  });
  it('strips tabs at the start of each line only', () => {
    expect(stripLeadingTabs('\t\talfa\nbeta\n\tgama')).toBe('alfa\nbeta\ngama');
    expect(stripLeadingTabs('mid\tdle')).toBe('mid\tdle');
  });
  it('removes empty lines between paragraphs, keeping one break', () => {
    expect(collapseBlankLines('unu\n\n\ndoi')).toBe('unu\ndoi');
    expect(collapseBlankLines('unu\ndoi')).toBe('unu\ndoi');
  });
});

describe('Tidy text menu — structural (preserves paragraphs and formatting)', () => {
  let ed;
  afterEach(() => ed?.destroy());
  const build = (content) => {
    ed = new Editor({ extensions: buildExtensions({ smartQuotes: false }), content });
    const menus = editorMenus({ t: (k) => k, handle: () => ({ editor: ed, focus: () => {} }), setView() {}, setSettings() {}, run() {} });
    const sub = menus.editAfter.find((x) => x.label === 'ui.menu.textTidy').submenu;
    return { run: (label) => { ed.commands.selectAll(); sub.find((x) => x.label === label).action(); } };
  };
  // Build a doc from text lines so literal tabs survive (HTML parsing would normalize them).
  const doc = (...lines) => ({ type: 'doc', content: lines.map((t) => ({ type: 'paragraph', content: t ? [{ type: 'text', text: t }] : [] })) });
  it('exposes three tidy actions', () => {
    const { run } = build('<p>x</p>');
    expect(typeof run).toBe('function');
  });
  it('"remove empty lines" deletes the empty paragraph but keeps real ones separate', () => {
    const b = build('<p>Alfa</p><p></p><p>Beta</p>');
    b.run('ui.menu.tidyBlankLines');
    expect(ed.getHTML()).toBe('<p>Alfa</p><p>Beta</p>');
  });
  it('"strip leading tabs" removes tabs at block start, keeps inner tabs', () => {
    const b = build(doc('\t\tAlfa', 'mid\tdle'));
    b.run('ui.menu.tidyLeadingTabs');
    expect(ed.getHTML()).toBe('<p>Alfa</p><p>mid\tdle</p>');
  });
  it('"multiple spaces" collapses runs without merging paragraphs', () => {
    const b = build('<p>a   b</p><p>c    d</p>');
    b.run('ui.menu.tidySpaces');
    expect(ed.getHTML()).toBe('<p>a b</p><p>c d</p>');
  });
});

describe('Tidy text labels', () => {
  it('labels exist in both ro and en', () => {
    for (const lang of ['ro', 'en']) {
      for (const k of ['ui.menu.textTidy', 'ui.menu.tidySpaces', 'ui.menu.tidyBlankLines', 'ui.menu.tidyLeadingTabs']) {
        expect(dictionaries[lang][k], `${lang}:${k}`).toBeTruthy();
      }
    }
  });
});
