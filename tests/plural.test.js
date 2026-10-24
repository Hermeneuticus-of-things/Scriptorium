import { describe, it, expect } from 'vitest';
import { pluralRo, pluralEn } from '../src/lib/i18n.js';
describe('counts in Romanian and English', () => {
  it('Romanian: singular at 1, "de" from 20 up', () => {
    expect(pluralRo('Selecție: 1 cuvinte · 1 caractere')).toBe('Selecție: 1 cuvânt · 1 caracter');
    expect(pluralRo('5 cuvinte')).toBe('5 cuvinte');
    expect(pluralRo('25 cuvinte')).toBe('25 de cuvinte');
    expect(pluralRo('112 pagini')).toBe('112 pagini');
    expect(pluralRo('100 pagini')).toBe('100 de pagini');
    expect(pluralRo('1.250 cuvinte')).toBe('1.250 de cuvinte');
    expect(pluralRo('1 documente blocate')).toBe('1 document blocat');
    expect(pluralRo('din 1 pagini')).toBe('din 1 pagină');
    expect(pluralRo('0 cuvinte')).toBe('0 cuvinte');
    expect(pluralRo('versiunea 2.1 note')).toBe('versiunea 2.1 note');
  });
  it('English: singular at 1', () => {
    expect(pluralEn('1 words · 11 words')).toBe('1 word · 11 words');
  });
});

describe('English singular with an adjective', () => {
  it('1 locked document, 1 error, 1 book page', () => {
    expect(pluralEn('1 locked documents · 1 errors · 1 book pages · 2 errors')).toBe('1 locked document · 1 error · 1 book page · 2 errors');
  });
});
