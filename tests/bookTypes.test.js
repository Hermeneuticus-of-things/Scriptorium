import { describe, it, expect } from 'vitest';
import { BOOK_TYPES, bookTypeById, bookTypeLabel, bookTypeOptions, bookTypeGuidance, bookTypeDetectPrompt, bookTypeFromReply } from '../src/lib/bookTypes.js';

describe('bookTypes taxonomy (directivă autor 2026-11-10)', () => {
  it('has a complete, unique taxonomy with labels and guidance', () => {
    expect(BOOK_TYPES.length).toBeGreaterThanOrEqual(30);
    const ids = BOOK_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of BOOK_TYPES) {
      expect(['fiction', 'nonfiction']).toContain(t.group);
      expect(t.label.trim()).toBeTruthy();
      expect(t.labelEn.trim()).toBeTruthy();
      expect(t.hint.trim()).toBeTruthy();
    }
  });
  it('covers every category required by the author', () => {
    const ids = BOOK_TYPES.map((t) => t.id);
    for (const id of ['novel-crime', 'novel-romance', 'novel-sf', 'novel-fantasy', 'novel-horror', 'novel-historical', 'novel-adventure', 'novel-psychological', 'novel-social', 'novel-comingofage', 'novel-dystopia', 'novel-gothic', 'short-prose', 'poetry', 'drama', 'comics', 'nonfiction-memoir', 'nonfiction-history', 'nonfiction-science', 'nonfiction-selfhelp', 'nonfiction-business', 'nonfiction-essays', 'nonfiction-philosophy', 'nonfiction-spirituality', 'nonfiction-psychology', 'nonfiction-journalism', 'nonfiction-technical', 'nonfiction-practical', 'nonfiction-academic']) {
      expect(ids).toContain(id);
    }
  });
  it('labels in ro and en with empty fallback for unknown ids', () => {
    expect(bookTypeLabel('novel-crime')).toBe('Roman polițist / thriller / suspans');
    expect(bookTypeLabel('novel-crime', 'en')).toBe('Crime / thriller / suspense novel');
    expect(bookTypeLabel('bogus')).toBe('');
    expect(bookTypeById('novel-crime').hint.length).toBeGreaterThan(10);
    expect(bookTypeGuidance('bogus')).toBe('');
  });
  it('options are grouped for the picker', () => {
    const opts = bookTypeOptions();
    expect(opts.filter((o) => o.group === 'Ficțiune').length).toBeGreaterThan(10);
    expect(opts.filter((o) => o.group === 'Non-ficțiune').length).toBeGreaterThan(10);
    expect(bookTypeOptions('en').every((o) => o.id && o.label));
  });
  it('detect prompt lists every id, reply parser finds ids tolerantly', () => {
    const prompt = bookTypeDetectPrompt();
    for (const t of BOOK_TYPES) expect(prompt).toContain(t.id);
    expect(bookTypeFromReply('Răspuns: novel-crime — roman polițist')).toBe('novel-crime');
    expect(bookTypeFromReply('nonfiction-science.')).toBe('nonfiction-science');
    expect(bookTypeFromReply('NU ȘTIU')).toBe(null);
    expect(bookTypeFromReply('')).toBe(null);
  });
  it('longer ids win over prefixes when parsing replies', () => {
    // 'novel-crime' must not be parsed as 'novel-general' or a bare prefix
    expect(bookTypeFromReply('novel-crime')).toBe('novel-crime');
    expect(bookTypeFromReply('I would say novel-romance is closest')).toBe('novel-romance');
  });
});
