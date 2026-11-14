// @vitest-environment jsdom
// Anti-churn (plângerea autorului): re-aplicarea ACEEASI formatari nu trebuie să rescrie
// nimic — înainte, textul din <em>/<strong> era învelit într-un span identic vizual, fișierul
// era rescris și toast-ul spunea „N documente modificate" fără nicio schimbare vizibilă.
import { describe, it, expect } from 'vitest';
import { formatHtmlParagraphs } from '../src/lib/paragraphAlignment.js';

const PATCH = { align: 'justify', font: 'Georgia, serif', size: 28 };

describe('formatHtmlParagraphs — fără churn la re-aplicare', () => {
  it('prima aplicare schimbă paragraful', () => {
    const r = formatHtmlParagraphs('<p>Text simplu de test.</p>', PATCH);
    expect(r.changed).toBe(true);
    expect(r.html).toContain('font-size: 28px');
  });

  it('a doua aplicare a ACELEIAȘI formatări: html identic, zero modificări', () => {
    const once = formatHtmlParagraphs('<p>Text simplu de test.</p>', PATCH);
    const twice = formatHtmlParagraphs(once.html, PATCH);
    expect(twice.changed).toBe(false);
    expect(twice.html).toBe(once.html);
  });

  it('text în <em>/<strong> cu valorile deja prezente: fără rescriere', () => {
    const styled = '<p style="text-align: justify;"><em><span style="font-family: Georgia, serif; font-size: 28px;">Karma unei minciuni mici</span></em></p>';
    const r = formatHtmlParagraphs(styled, PATCH);
    expect(r.changed).toBe(false);
    expect(r.html).toBe(styled);
  });

  it('valoarea DIFERITĂ se schimbă chiar și în interiorul <em>', () => {
    const styled = '<p style="text-align: justify;"><em><span style="font-family: Georgia, serif; font-size: 14px;">Karma unei minciuni mici</span></em></p>';
    const r = formatHtmlParagraphs(styled, { align: 'justify', font: 'Georgia, serif', size: 28 });
    expect(r.changed).toBe(true);
    expect(r.html).toContain('28px');
    expect(r.html).not.toContain('14px');
  });
});
