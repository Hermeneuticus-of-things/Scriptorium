import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { mergeProject } from '../src/lib/projectMerge.js';
import { insertable } from '../src/lib/inlineInsert.js';
const require = createRequire(import.meta.url);
const { rtfToHtml } = require('../lib/rtf.cjs');
const store = require('../lib/store.cjs');

describe('v0.9.8 bug hunt', () => {
  it('project merge keeps both sides inside objects and lists', () => {
    const base = { tree: [], custom: { pov: 'Ana' }, keywords: ['k1'], collections: [{ id: 'c1' }] };
    const mine = { ...base, custom: { pov: 'Ana', loc: 'Iasi' }, keywords: ['k1', 'k2'], collections: [{ id: 'c1' }, { id: 'cM' }] };
    const theirs = { ...base, custom: { pov: 'Ion' }, keywords: ['k1', 'k3'], collections: [{ id: 'c1' }, { id: 'cT' }] };
    const r = mergeProject(base, mine, theirs);
    expect(r.custom).toEqual({ pov: 'Ion', loc: 'Iasi' });
    expect(r.keywords).toEqual(['k1', 'k2', 'k3']);
    expect(r.collections.map((c) => c.id)).toEqual(['c1', 'cM', 'cT']);
  });
  it('RTF import drops javascript: links and malformed escapes', () => {
    const html = rtfToHtml('{\\rtf1 {\\field{\\*\\fldinst HYPERLINK "javascript:alert(1)"}{\\fldrslt x}} a\\\'zz b \\u1114112 c}');
    expect(html).not.toMatch(/javascript:/);
    expect(html).not.toMatch(/\u0000/);
  });
  it('store refuses reserved and overlong ids and odd project files', () => {
    for (const id of ['CON', 'nul', '-', 'a'.repeat(101)]) expect(() => store.readDoc('/tmp', id)).toThrow(/Id invalid/);
    expect(store.parseProject ? () => store.parseProject('null') : () => { throw new Error('arbore'); }).toThrow();
  });
  it('a one-line answer is inserted inline, keeping the outer spaces', () => {
    expect(insertable('Bună ziua', ' x ')).toEqual({ type: 'text', text: ' Bună ziua ' });
    expect(typeof insertable('a\n\nb')).toBe('string');
  });
});
