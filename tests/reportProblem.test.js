import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sanitize, buildIssueUrl, buildReport, reportTitle, technicalDetails, buildMailto, recordError, memoryErrors, clearMemoryErrors, onMemoryError, errorKey, noteAction, recentActions } from '../src/lib/reportProblem.js';
import { dictionaries } from '../src/lib/i18n.js';

const require = createRequire(import.meta.url);
const errorLog = require('../lib/errorLog.cjs');

describe('sanitize', () => {
  const privacy = { home: '/home/maria', user: 'maria', projectDirs: ['/home/maria/Cărți/Roman.scribner'] };
  it('hides home, user name and project folders', () => {
    const s = sanitize('ENOENT /home/maria/Cărți/Roman.scribner/docs/a.html and /home/maria/x.txt by maria', privacy);
    expect(s).toBe('ENOENT <proiect>/docs/a.html and ~/x.txt by ~');
  });
  it('handles Windows paths and other user folders', () => {
    const s = sanitize('C:\\Users\\Ion\\Documents\\Carte.scribner\\p.json file:///C:/Users/Ion/a', { home: 'C:\\Users\\Ion', user: 'Ion', projectDirs: ['C:\\Users\\Ion\\Documents\\Carte.scribner'] });
    expect(s).not.toMatch(/Ion/);
    expect(s).toContain('<proiect>\\p.json');
    expect(sanitize('/Users/elena/Library/x')).toBe('/Users/~/Library/x');
  });
  it('redacts API keys and tokens', () => {
    const s = sanitize('k sk-ant-api03-abcdefghijkl sk-or-v1-zzzzzzzzzz nvapi-ABCDEFGH123 AIzaSyA1234567890abcdef Authorization: Bearer eyJhbGciOi.x.y apiKey="secret123"');
    for (const bad of ['abcdefghijkl', 'zzzzzzzzzz', 'ABCDEFGH123', 'AIzaSyA', 'eyJhbGciOi', 'secret123']) expect(s).not.toContain(bad);
    expect(s).toContain('[cheie ascunsă]');
  });
  it('removes document text (HTML and long quotes)', () => {
    const s = sanitize('Cannot parse <p>Era o dimineață rece de toamnă.</p> near "Andrei pleacă de acasă într-o dimineață de toamnă, fără bagaj"');
    expect(s).not.toMatch(/dimineață|Andrei/);
    expect(s).toContain('[text]');
  });
  it('keeps ordinary error messages', () => {
    expect(sanitize("TypeError: Cannot read properties of undefined (reading 'id')")).toBe("TypeError: Cannot read properties of undefined (reading 'id')");
  });
});

describe('report building', () => {
  it('title from first line, shortened', () => {
    expect(reportTitle('  Compile nu merge\nmai mult')).toBe('Compile nu merge');
    expect(reportTitle('x'.repeat(200)).length).toBe(80);
    expect(reportTitle('')).toMatch(/Problemă/);
  });
  it('technical details include env, sanitized errors and actions', () => {
    const d = technicalDetails({
      env: { appVersion: '0.8.6', os: 'linux 6', arch: 'x64', electron: '33', chrome: '130', language: 'ro' },
      errors: [{ time: 't', process: 'main', message: 'fail at /home/ana/p', stack: 'Error\n at /home/ana/app.js:1' }],
      actions: ['compile', 'save'],
      privacy: { home: '/home/ana', user: 'ana' },
    });
    expect(d).toContain('0.8.6');
    expect(d).toContain('Electron 33');
    expect(d).toContain('compile, save');
    expect(d).not.toContain('/home/ana');
    expect(technicalDetails({ env: {}, errors: [] })).toMatch(/nicio eroare/);
  });
  it('report body has the sections', () => {
    const b = buildReport({ what: 'A', before: '', details: 'D' });
    expect(b).toContain('Ce s-a întâmplat\nA');
    expect(b).not.toContain('Ce făceam');
  });
  it('issue URL: short body stays whole', () => {
    const { url, truncated } = buildIssueUrl('Titlu ă', 'corp', {});
    expect(truncated).toBe(false);
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://github.com/Hermeneuticus-of-things/Scriptorium/issues/new');
    expect(u.searchParams.get('title')).toBe('Titlu ă');
    expect(u.searchParams.get('body')).toBe('corp');
    expect(u.searchParams.get('labels')).toBe('bug');
  });
  it('issue URL: long body is truncated under the limit with a note', () => {
    const body = Array.from({ length: 800 }, (_, i) => `linia ${i} cu diacritice șțăîâ 😀`).join('\n');
    const { url, truncated } = buildIssueUrl('T', body, { limit: 7000 });
    expect(truncated).toBe(true);
    expect(url.length).toBeLessThanOrEqual(7000);
    const got = new URL(url).searchParams.get('body');
    expect(got).toMatch(/raport scurtat/);
    expect(body.startsWith(got.split('\n\n…')[0])).toBe(true);
  });
  it('mailto', () => {
    expect(buildMailto('a@b.ro', 'T', 'x')).toBe('mailto:a@b.ro?subject=%5BPneuma%20Sofer%5D%20T&body=x');
  });
});

describe('in-window buffer', () => {
  it('records, notifies, keys and caps', () => {
    clearMemoryErrors();
    const seen = [];
    const off = onMemoryError((e) => seen.push(e));
    recordError({ message: 'boom' });
    off();
    recordError({ message: 'boom' });
    expect(seen.length).toBe(1);
    expect(errorKey(memoryErrors()[0])).toBe(errorKey(memoryErrors()[1]));
    for (let i = 0; i < 250; i++) recordError({ message: String(i) });
    expect(memoryErrors().length).toBe(200);
    for (let i = 0; i < 20; i++) noteAction('c' + i);
    expect(recentActions().length).toBe(15);
  });
});

describe('errorLog (main process store)', () => {
  const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'elog-')), 'logs', 'errors.jsonl');
  it('makeEntry normalizes errors', () => {
    const e = errorLog.makeEntry({ process: 'main', error: new Error('x'), version: '1' });
    expect(e.message).toBe('x');
    expect(e.stack).toMatch(/Error: x/);
    expect(errorLog.makeEntry({ error: { a: 1 } }).message).toBe('{"a":1}');
    expect(errorLog.makeEntry({ message: 'y'.repeat(5000) }).message.length).toBe(1001);
  });
  it('rotates by entry count', () => {
    const f = tmp();
    for (let i = 0; i < 30; i++) errorLog.appendEntry(f, errorLog.makeEntry({ message: 'e' + i }), { maxEntries: 10 });
    const all = errorLog.readEntries(f);
    expect(all.length).toBe(10);
    expect(all[0].message).toBe('e20');
    expect(all[9].message).toBe('e29');
  });
  it('rotates by size and survives a broken line', () => {
    const f = tmp();
    for (let i = 0; i < 20; i++) errorLog.appendEntry(f, errorLog.makeEntry({ message: 'x'.repeat(500) + i }), { maxBytes: 3000 });
    expect(fs.statSync(f).size).toBeLessThanOrEqual(3000);
    fs.appendFileSync(f, '{"broken');
    expect(errorLog.readEntries(f).at(-1).message).toMatch(/19$/);
    errorLog.clear(f);
    expect(errorLog.readEntries(f)).toEqual([]);
  });
});

describe('report i18n', () => {
  it('every ui.report key exists in ro and en', () => {
    const ro = Object.keys(dictionaries.ro).filter((k) => k.startsWith('ui.report.'));
    expect(ro.length).toBeGreaterThan(15);
    for (const k of ro) expect(dictionaries.en[k]).toBeTruthy();
  });
});
