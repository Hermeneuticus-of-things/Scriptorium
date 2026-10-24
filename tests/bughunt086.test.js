// Bug hunt v0.8.6: report sanitizer leaks, note labels matching Word, [[New title]] into the trash,
// incoming links from trashed documents.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { sanitize } from '../src/lib/reportProblem.js';
import { incomingLinks, insertLinkedDoc } from '../src/lib/backlinks.js';
import { findNode } from '../src/lib/tree.js';

const require = createRequire(import.meta.url);
const compile = require('../lib/compile.cjs');

describe('sanitize leaks', () => {
  it('hides a Windows user folder with a space in its name', () => {
    const s = sanitize('ENOENT D:\\Users\\Ion Popescu\\Desktop\\a.txt');
    expect(s).not.toMatch(/Popescu/);
    expect(s).toContain('\\Desktop\\a.txt');
  });
  it('hides a macOS user folder with a space', () => {
    expect(sanitize('at /Users/Ana Maria/Library/x.js:1')).not.toMatch(/Ana|Maria/);
  });
  it('hides a user name with diacritics outside paths', () => {
    expect(sanitize('owner Ștefan cannot write', { user: 'Ștefan' })).toBe('owner ~ cannot write');
  });
  it('hides e-mail addresses but not package versions', () => {
    const s = sanitize('auth failed for ion.pop+x@gmail.com in react@18.3.1');
    expect(s).not.toMatch(/gmail|ion\.pop/);
    expect(s).toContain('react@18.3.1');
  });
  it('hides keys and tokens in URL query strings', () => {
    const s = sanitize('GET https://api.x.com/v1?access_token=abc123secret&key=zzz999&page=2 failed');
    expect(s).not.toMatch(/abc123secret|zzz999/);
    expect(s).toContain('page=2');
  });
});

describe('note labels follow Word (DOCX) so every format numbers the same', () => {
  it('symbols: *, †, ‡, § then doubled (Chicago)', () => {
    expect([1, 4, 5, 8, 9].map((n) => compile.noteLabel(n, 'symbols'))).toEqual(['*', '§', '**', '§§', '***']);
  });
  it('letters: z, aa, bb (lowerLetter), not ab', () => {
    expect([26, 27, 28, 52, 53].map((n) => compile.noteLabel(n, 'alpha'))).toEqual(['z', 'aa', 'bb', 'zz', 'aaa']);
  });
});

describe('[[New title]] and back-links with the trash', () => {
  const tree = () => [
    { id: 'd', root: 'draft', type: 'folder', children: [{ id: 'a', type: 'text' }, { id: 'f', type: 'folder', children: [] }] },
    { id: 't', root: 'trash', type: 'folder', children: [{ id: 'old', type: 'folder', children: [] }, { id: 'x', type: 'text' }] },
  ];
  it('never creates the document inside a remembered folder that is now in the trash', () => {
    const out = insertLinkedDoc(tree(), 'a', 'old', { id: 'n', type: 'text' });
    expect(findNode(out, 'old').children).toEqual([]);
    expect(findNode(out, 'd').children.map((c) => c.id)).toEqual(['a', 'n', 'f']);
  });
  it('lists only live documents as incoming links', () => {
    const l = '<a href="scribner://doc/a">A</a>';
    const live = (id) => id !== 'x' && id !== 'gone';
    expect(incomingLinks({ x: l, gone: l, f: l }, 'a', live)).toEqual(['f']);
  });
});
