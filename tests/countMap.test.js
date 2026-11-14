// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { countMap } from '../src/lib/countMap.js';

describe('countMap — numărătoare per document cu cache', () => {
  const docs = { a: '<p>unu doi trei</p>', b: '<p>patru cinci</p>' };

  it('numără fiecare document o dată', () => {
    const cache = new Map();
    let wc = 0;
    const counting = () => { wc += 1; return 1; };
    const m = countMap(docs, cache, counting);
    expect(wc).toBe(2);
    expect(m.a).toBe(1);
  });

  it('a doua apelare cu aceleași documente nu recalculează nimic (cache)', () => {
    const cache = new Map();
    let wc = 0;
    const counting = () => { wc += 1; return 1; };
    countMap(docs, cache, counting);
    wc = 0;
    countMap(docs, cache, counting);
    expect(wc).toBe(0);
  });

  it('doar documentul schimbat se recalculează', () => {
    const cache = new Map();
    let wc = 0;
    const counting = () => { wc += 1; return 1; };
    countMap(docs, cache, counting);
    wc = 0;
    countMap({ ...docs, b: '<p>schimbat</p>' }, cache, counting);
    expect(wc).toBe(1);
  });

  it('numără cu numărătorul real pe diacritice', () => {
    const m = countMap({ r: '<p>Ăl bîșcă pe Ștefan și pe Mărioara</p>' });
    expect(m.r).toBe(7);
  });
});
