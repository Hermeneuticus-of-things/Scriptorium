import { describe, it, expect } from 'vitest';
import { lint, summarize, autofix, htmlToManuscript, manuscriptToHtml, reattach, KARMA_PROFILE, GENERIC_PROFILE } from '../src/lib/editorial.js';

const rules = (issues) => [...new Set(issues.map((i) => i.rule))].sort();

describe('lint (Karma profile)', () => {
  it('detects DOOM III typography', () => {
    const html = '<p>Karma — mecanism (cauzal): se vede. Un "citat".</p><p>apoi un paragraf mic.</p><ul><li><p>listă</p></li></ul><p><strong>bold</strong> și <strong><em>sens</em></strong> \'karman\'.</p>';
    const r = rules(lint(html));
    expect(r).toEqual(expect.arrayContaining(['emDash', 'parentheses', 'colon', 'asciiQuotes', 'capital', 'list', 'bold']));
    expect(lint(html).filter((i) => i.rule === 'bold')).toHaveLength(1);
  });
  it('detects binary constructions, passives, transitions, self-references, LLM residue, teleology', () => {
    const html = '<p>Karma nu este o pedeapsă, ci un mecanism. Se observă apoi efectul. Deci revenim. Desigur, merită menționat.</p><p>În această secțiune vorbim despre fapte. Fapta acționează cu scopul de a elibera.</p>';
    expect(rules(lint(html))).toEqual(expect.arrayContaining(['binary', 'passive', 'transition', 'llm', 'selfReference', 'teleology']));
  });
  it('limits explicit „noi”', () => {
    const issues = lint('<p>Noi vedem. Apoi noi simțim.</p><p>Și noi înțelegem.</p>').filter((i) => i.rule === 'noi');
    expect(issues).toHaveLength(2);
  });
  it('checks the ALOGEN schema', () => {
    const ok = "<p>Vorbim despre <strong><em>fapta legată de lume</em></strong> 'karman' aici.</p><p>Apoi <strong><em>fapta</em></strong> 'karman' revine.</p><p>Apoi 'karman' a treia oară și 'Ātman'-ului.</p>";
    const r = lint(ok).filter((i) => i.round === 'R8');
    expect(r.map((i) => i.rule).sort()).toEqual(['alogenAnchor', 'alogenRepeat', 'alogenSuffix']);
  });
  it('macro redundancy across documents and canvas limit', () => {
    const long = `<p>${'Cuvânt '.repeat(3100)}.</p>`;
    expect(rules(lint(long))).toContain('canvasLimit');
    const issues = lint('<p>Mecanismul acumulării faptelor vechi produce urme durabile în conștiință.</p>', {
      otherDocs: [{ title: 'Cap 2', html: '<p>Știm că mecanismul acumulării faptelor vechi produce urme durabile.</p>' }],
    });
    expect(issues.some((i) => i.rule === 'repetitionMacro')).toBe(true);
  });
  it('generic profile only checks typography basics', () => {
    const issues = lint('<p>Karma nu este X, ci Y — (a).</p>', { profile: GENERIC_PROFILE });
    expect(rules(issues)).not.toContain('binary');
    expect(rules(issues)).not.toContain('emDash');
  });
  it('summarize counts by severity and round', () => {
    const s = summarize(lint('<p>a — b</p>'));
    expect(s.GRAVE).toBeGreaterThan(0);
    expect(s.byRound.R11).toBeGreaterThan(0);
  });
});

describe('autofix and conversions', () => {
  it('fixes quotes, spaces and capitals without touching markup', () => {
    expect(autofix('<p>el  spuse "da" <em>acum</em>.</p>')).toBe('<p>El spuse „da” <em>acum</em>.</p>');
  });
  it('round-trips manuscript markdown with ALOGEN and footnotes', () => {
    const html = '<h2>Titlu</h2><p>Text cu <strong><em>sens</em></strong> \'x\' și *ilustrație* <em>în</em><span data-footnote="Sursa" class="footnote"></span>.</p>';
    const md = htmlToManuscript(html);
    expect(md).toBe("## Titlu\n\nText cu ***sens*** 'x' și *ilustrație* *în*[^Sursa].");
    expect(manuscriptToHtml(md)).toBe('<h2>Titlu</h2><p>Text cu <strong><em>sens</em></strong> \'x\' și <em>ilustrație</em> <em>în</em><span data-footnote="Sursa" class="footnote"></span>.</p>');
  });
  it('reattaches comments, annotations and alignment after an AI pass', () => {
    const old = '<p style="text-align: center">Unu <span data-comment="vezi" class="comment">doi</span> trei<span data-annotation="de rescris" class="annotation"></span></p><p>Patru</p>';
    const out = reattach(old, '<p>Unu doi trei schimbat</p><p>Patru nou</p>');
    expect(out).toBe('<p style="text-align: center">Unu <span data-comment="vezi" class="comment">doi</span> trei schimbat<span data-annotation="de rescris" class="annotation"></span></p><p>Patru nou</p>');
  });
});
