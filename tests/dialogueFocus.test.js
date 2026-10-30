import { describe, it, expect } from 'vitest';
import { isDialogueParagraph, dialogueFocus } from '../src/lib/dialogueFocus.js';

const docs = {
  a: '<p>Narativ, fără vorbire.</p>'
    + '<p>Ana spuse: „Mergem acum.” Apoi tăcu.</p>'
    + '<p>„Bine”, răspunse el.</p>'
    + '<p>— O replică cu liniuță, fără ghilimele.</p>',
  b: '<h1>Capitol</h1><p>«Străin», şopti vocea.</p>',
  c: '<p>Ghilimele simple &#8218;nu se numără&#8216; aici.</p>',
};

describe('isDialogueParagraph', () => {
  it('detects Romanian and angle quoted spans', () => {
    expect(isDialogueParagraph('<p>„Bine.”</p>')).toBe(true);
    expect(isDialogueParagraph('<p>«Străin».</p>')).toBe(true);
    expect(isDialogueParagraph('<p>spuse el "azi" clar.</p>')).toBe(true);
  });
  it('rejects narration, unpaired quotes and dashes', () => {
    expect(isDialogueParagraph('<p>Narativ curat.</p>')).toBe(false);
    expect(isDialogueParagraph('<p>— Liniuță fără ghilimele.</p>')).toBe(false);
    expect(isDialogueParagraph('<p>Un singur „ghilimel deschis.</p>')).toBe(false);
  });
});

describe('dialogueFocus', () => {
  const res = dialogueFocus(docs);
  it('collects only documents with dialogue, in order', () => {
    expect(Object.keys(res)).toEqual(['a', 'b']);
    expect(res.a.count).toBe(2);
  });
  it('extracts the quoted span', () => {
    expect(res.a.lines[0].quote).toBe('„Mergem acum.”');
    expect(res.b.lines[0].quote).toBe('«Străin»');
  });
  it('ignores empty and missing documents', () => {
    expect(dialogueFocus({ d: '', e: null })).toEqual({});
    expect(dialogueFocus({})).toEqual({});
  });
});
