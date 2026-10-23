import { describe, it, expect } from 'vitest';
import { moveNode, insertNear, moveToTrash, findNode, findParent } from '../src/lib/tree.js';

const make = () => [
  { id: 'draft', root: 'draft', children: [
    { id: 'f', children: [{ id: 'a' }, { id: 'b' }] },
    { id: 'c' },
  ] },
  { id: 'research', root: 'research', children: [] },
  { id: 'trash', root: 'trash', children: [] },
];

describe('tree', () => {
  it('moves before, after and inside', () => {
    let t = moveNode(make(), 'c', 'a', 'before');
    expect(findNode(t, 'f').children.map((n) => n.id)).toEqual(['c', 'a', 'b']);
    t = moveNode(t, 'a', 'research', 'inside');
    expect(findParent(t, 'a').id).toBe('research');
    t = moveNode(t, 'b', 'c', 'after');
    expect(findNode(t, 'f').children.map((n) => n.id)).toEqual(['c', 'b']);
  });
  it('refuses moving a folder into its own descendant or moving roots', () => {
    const t = make();
    expect(moveNode(t, 'f', 'a', 'inside')).toBe(t);
    expect(moveNode(t, 'draft', 'research', 'inside')).toBe(t);
  });
  it('inserts near selection and trashes', () => {
    let t = insertNear(make(), 'a', { id: 'x' });
    expect(findNode(t, 'f').children.map((n) => n.id)).toEqual(['a', 'x', 'b']);
    t = insertNear(t, 'f', { id: 'y' });
    expect(findNode(t, 'f').children.at(-1).id).toBe('y');
    t = moveToTrash(t, 'f');
    expect(findParent(t, 'f').id).toBe('trash');
  });
});

import { buildRegex, findInHtml, replaceInHtml } from '../src/lib/search.js';

describe('search', () => {
  it('finds whole words, case-insensitive, outside tags', () => {
    const re = buildRegex({ query: 'ana', wholeWord: true });
    const html = '<p>Ana are <strong>banane</strong> și Ana &amp; Ion. <span data-comment="ana">x</span></p>';
    expect(findInHtml(html, re).map((r) => r.match)).toEqual(['Ana', 'Ana']);
  });
  it('replaces with diacritics and keeps markup and entities', () => {
    const re = buildRegex({ query: 'Ion', caseSensitive: true });
    const { html, count } = replaceInHtml('<p>Ion &amp; <em>Ion</em> &lt;3</p>', re, 'Ștefan');
    expect(count).toBe(2);
    expect(html).toBe('<p>Ștefan &amp; <em>Ștefan</em> &lt;3</p>');
  });
  it('supports regex groups and rejects invalid patterns', () => {
    const re = buildRegex({ query: '(\\d+) ani', regex: true });
    expect(replaceInHtml('<p>are 30 ani</p>', re, '$1 de ani').html).toBe('<p>are 30 de ani</p>');
    expect(buildRegex({ query: '(', regex: true })).toBe(null);
  });
});

import { keyMove } from '../src/lib/tree.js';
describe('keyMove', () => {
  it('moves up/down, indents into folder, outdents', () => {
    let t = keyMove(make(), 'c', 'up');
    expect(t[0].children.map((n) => n.id)).toEqual(['c', 'f']);
    t = keyMove(t, 'c', 'down');
    t = keyMove(t, 'c', 'indent');
    expect(findParent(t, 'c').id).toBe('f');
    t = keyMove(t, 'a', 'outdent');
    expect(t[0].children.map((n) => n.id)).toEqual(['f', 'a']);
  });
});
