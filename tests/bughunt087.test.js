// Bug hunt on the v0.8.7 features: research conversation (history budget, follow-up headings,
// streamed text, persistence, titles), PDF import (WinAnsi quotes, huge hex strings, nested
// dictionaries, encrypted files), the `scribner` CLI (numbers, Windows quoting, sessions,
// export limits) and the Windows installer / scribner.cmd wrapper.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { spawnSync } from 'child_process';
import { visibleAnswer, noteTitle } from '../src/lib/researchChat.js';

const require = createRequire(import.meta.url);
const rc = require('../lib/researchChat.cjs');
const { pdfToText, literal, hexString } = require('../lib/pdfText.cjs');
const store = require('../lib/store.cjs');

const tmpDir = (p = 'scribner-087-') => fs.mkdtempSync(path.join(os.tmpdir(), p));
const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

describe('research chat: history budget', () => {
  it('a very long newest question is shortened too, so the budget holds', () => {
    const h = rc.trimHistory([{ q: 'x'.repeat(20000), answer: 'a'.repeat(50000) }], { budgetTokens: 3000 });
    expect(h).toHaveLength(1);
    const cost = rc.estimateTokens(h[0].q) + rc.estimateTokens(h[0].answer);
    expect(cost).toBeLessThanOrEqual(3000);
    expect(h[0].q.endsWith('…')).toBe(true);
  });

  it('shortening never splits an emoji (no lone surrogates)', () => {
    const h = rc.trimHistory([{ q: 'ce? 😀', answer: '😀'.repeat(20000) }], { budgetTokens: 3000 });
    expect(lone.test(h[0].answer)).toBe(false);
    const h2 = rc.trimHistory([{ q: '😀'.repeat(20000), answer: 'da' }], { budgetTokens: 500 });
    expect(lone.test(h2[0].q)).toBe(false);
  });
});

describe('research chat: follow-up heading variants', () => {
  const cases = [
    'Răspuns [1].\n\nÎntrebări sugerate:\n- Ce?\n- Unde?',
    'Răspuns [1].\n\nIntrebări de continuare:\n- Ce?\n- Unde?',
    'Răspuns [1].\n\n**Întrebari de continuare:**\n1. Ce?\n2. Unde?',
    'Răspuns [1].\n\n## Possible follow-up questions\n* Ce?\n* Unde?',
    'Răspuns [1].\n\nFollow up questions:\n- Ce?\n- Unde?',
    'Răspuns [1].\n\nSugestii de întrebări:\n- Ce?\n- Unde?',
  ];
  for (const text of cases) {
    it(`parses ${JSON.stringify(text.split('\n\n')[1].split('\n')[0])}`, () => {
      expect(rc.parseFollowups(text)).toEqual({ answer: 'Răspuns [1].', followups: ['Ce?', 'Unde?'] });
      expect(visibleAnswer(text)).toBe('Răspuns [1].');
    });
  }

  it('the phrase inside a sentence is not a heading (live text is not cut)', () => {
    const text = 'Poți pune întrebări de continuare despre capitolul 3 [1].\nAndrei pleacă.';
    expect(visibleAnswer(text)).toBe(text);
    expect(rc.parseFollowups(text)).toEqual({ answer: text, followups: [] });
  });
});

describe('research chat: titles and persistence', () => {
  it('chat and note titles are one line, without split emoji', () => {
    const q = `Linia 1\nlinia 2\t cu   spații ${'😀'.repeat(60)}`;
    const { chat } = rc.addTurn({ chats: [] }, null, { q, answer: 'a', at: '2026-01-01' });
    expect(chat.title).not.toMatch(/[\n\t]|\s{2}/);
    expect(lone.test(chat.title)).toBe(false);
    expect([...chat.title].length).toBeLessThanOrEqual(80);
    const t = noteTitle(q);
    expect(t).toBe(chat.title);
    expect(noteTitle('   ')).toBe('');
  });

  it('a damaged chats file is kept aside instead of being overwritten by the next save', () => {
    const dir = tmpDir();
    const file = path.join(dir, rc.CHATS_FILE);
    fs.writeFileSync(file, '{"version":1,"chats":[{"id":"c1","turns":[{"q":"a"');
    expect(rc.readChats(dir).chats).toEqual([]);
    const kept = fs.readdirSync(dir).filter((f) => f.startsWith(`${rc.CHATS_FILE}.bad`));
    expect(kept).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, kept[0]), 'utf8')).toContain('"c1"');
  });

  it('a chats file saved with a BOM (edited in Notepad) still reads', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, rc.CHATS_FILE), `\ufeff${JSON.stringify({ version: 1, chats: [{ id: 'c1', title: 't', turns: [] }] })}`);
    expect(rc.readChats(dir).chats.map((c) => c.id)).toEqual(['c1']);
  });
});

describe('PDF text', () => {
  const pdfOf = (content, dict = '') => {
    const data = zlib.deflateSync(Buffer.from(content, 'latin1'));
    return Buffer.concat([
      Buffer.from(`%PDF-1.5\n4 0 obj\n<< /Filter /FlateDecode ${dict}/Length ${data.length} >>\nstream\n`, 'latin1'),
      data,
      Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
    ]);
  };

  it('WinAnsi quotes and dashes in literal strings become „” – … (not control characters)', () => {
    expect(literal('\\204Bun\\224 \\226 gata\\205')).toBe('„Bun” – gata…');
    expect(pdfToText(pdfOf('BT (\\204Ana\\224 \\227 da) Tj ET'))).toBe('„Ana” — da');
  });

  it('a huge hex string does not overflow the stack', () => {
    expect(hexString('41'.repeat(300000))).toHaveLength(300000);
    expect(pdfToText(pdfOf(`BT <${'41'.repeat(200000)}> Tj ET`))).toHaveLength(200000);
  });

  it('a stream dictionary with a nested dictionary (DecodeParms) is still inflated', () => {
    expect(pdfToText(pdfOf('BT (Salut) Tj ET', '/DecodeParms << /Columns 1 >> '))).toBe('Salut');
  });

  it('an encrypted PDF gives no (garbage) text', () => {
    const raw = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Length 20 >>\nstream\nBT (q\x8f\x02Z) Tj ET\nendstream\nendobj\ntrailer\n<< /Encrypt 5 0 R /Root 1 0 R >>\n%%EOF\n', 'latin1');
    expect(pdfToText(raw)).toBe('');
  });
});

// ---------------------------------------------------------------- CLI
const CLI = path.join(__dirname, '..', 'cli', 'scribner.cjs');
const ENV = { ...process.env, LANG: 'ro_RO.UTF-8', LC_ALL: '', LC_MESSAGES: '', SCRIBNER_LANG: '' };
let tmp;
const run = (args, env = {}) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...ENV, ...env }, cwd: tmp, timeout: 30000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const FAKE = { NODE_ENV: 'test', SCRIBNER_AI_FAKE: '1' };

describe('cli', () => {
  let P;
  let B;
  beforeAll(() => {
    tmp = tmpDir('scribner-087-cli-');
    P = path.join(tmp, 'Carte ș 😀.scribner');
    const p = store.createProject(P, 'Carte ș');
    const n = store.newNode('text', 'Scena „unu”');
    p.tree[0].children = [n];
    store.writeDoc(P, n.id, 'docs', '<p>Karma veghea pădurea.</p>');
    store.saveProject(P, p);
    // One part with 45 scenes and 30 research documents: per-document export for NotebookLM.
    B = path.join(tmp, 'B.scribner');
    const b = store.createProject(B, 'B');
    const f = store.newNode('folder', 'Partea 1');
    b.tree[0].children = [f];
    for (let i = 0; i < 45; i++) {
      const s = store.newNode('text', `Scena ${i}`);
      f.children.push(s);
      store.writeDoc(B, s.id, 'docs', `<p>Scena ${i} are un text scurt.</p>`);
    }
    b.tree[1].children = [];
    for (let i = 0; i < 30; i++) {
      const r = store.newNode('text', `Cercetare ${i}`);
      b.tree[1].children.push(r);
      store.writeDoc(B, r.id, 'docs', `<p>Cercetarea ${i} are câteva cuvinte.</p>`);
    }
    store.saveProject(B, b);
  });
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('export-sources --target notebooklm --per document stays within 50 sources', () => {
    const r = run(['export-sources', B, '-o', path.join(tmp, 'nb'), '--target', 'notebooklm', '--per', 'document', '--json']);
    expect(r.code, r.err).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.files.length).toBeLessThanOrEqual(50);
    expect(j.sources.filter((s) => s.kind === 'research').length).toBeGreaterThan(0);
  });

  it('numeric options reject non-numbers with exit 2', () => {
    for (const args of [
      ['export-sources', P, '-o', path.join(tmp, 'x'), '--max-sources', 'abc'],
      ['snapshot', P, 'Scena „unu”', '--lock-timeout', 'mult'],
      ['backup', P, '--keep', '-3'],
      ['ask', P, 'karma?', '-k', 'zece'],
    ]) {
      const r = run(args, FAKE);
      expect(r.code, `${args.join(' ')}: ${r.err}`).toBe(2);
      expect(r.err).toMatch(/Valoare invalidă/);
    }
    expect(run(['ask', P, 'karma?', '-k', 'zece', '--lang', 'en'], FAKE).err).toMatch(/Invalid value for -k/);
  });

  it('a Windows-style trailing quote on the project path (cmd "C:\\Carte\\") is tolerated', () => {
    const r = run(['info', `${P}"`, '--json']);
    expect(r.code, r.err).toBe(0);
    expect(JSON.parse(r.out).title).toBe('Carte ș');
  });

  it('-o ending with a separator is a folder, even when it does not exist yet', () => {
    const r = run(['compile', P, '--format', 'md', '-o', `${path.join(tmp, 'nou dir')}${path.sep}`, '--json']);
    expect(r.code, r.err).toBe(0);
    const j = JSON.parse(r.out);
    expect(path.dirname(j.file)).toBe(path.join(tmp, 'nou dir'));
    expect(j.file.endsWith('.md')).toBe(true);
  });

  it('ask --session: a damaged session file is set aside and the question still gets answered', () => {
    const chats = path.join(P, 'research', 'chats');
    fs.mkdirSync(chats, { recursive: true });
    fs.writeFileSync(path.join(chats, 's1.json'), '{"id":"s1","turns":[{"question":"a"');
    fs.writeFileSync(path.join(chats, 's2.json'), '[]');
    for (const s of ['s1', 's2']) {
      const r = run(['ask', P, 'karma?', '--session', s, '--json'], FAKE);
      expect(r.code, r.err).toBe(0);
      expect(JSON.parse(r.out).turn).toBe(1);
      const saved = JSON.parse(fs.readFileSync(path.join(chats, `${s}.json`), 'utf8'));
      expect(saved.turns).toHaveLength(1);
    }
    expect(fs.readdirSync(chats).some((f) => f.startsWith('s1.json.bad'))).toBe(true);
    // the follow-up sees the history
    const r = run(['ask', P, 'și mai departe?', '--session', 's1', '--json'], FAKE);
    expect(JSON.parse(r.out).answer).toMatch(/cu istoric/);
    expect(JSON.parse(r.out).turn).toBe(2);
  });

  it('ask --sources with nothing in it is bad usage', () => {
    const r = run(['ask', P, 'karma?', '--sources', ','], FAKE);
    expect(r.code).toBe(2);
  });
});

// ---------------------------------------------------------------- installer (review checks)
describe('installer and scribner.cmd', () => {
  const iss = fs.readFileSync(path.join(__dirname, '..', 'installer', 'scribner.iss'), 'utf8');
  const cmd = fs.readFileSync(path.join(__dirname, '..', 'installer', 'scribner.cmd'), 'utf8');

  it('the PATH task text is translated (ro and en custom messages)', () => {
    expect(iss).toMatch(/^ro\.AddToPath=.*„scribner”/m);
    expect(iss).toMatch(/^en\.AddToPath=.*"scribner"/m);
    expect(iss).toMatch(/Description: "\{cm:AddToPath\}"/);
  });

  it('PATH: compared entry by entry (trailing backslash), no empty entries, removed on uninstall', () => {
    expect(iss).toMatch(/function SamePathEntry/);
    expect(iss).toMatch(/procedure CurUninstallStepChanged\(CurUninstallStep: TUninstallStep\)/);
    expect(iss).toMatch(/usPostUninstall/);
    expect(iss).not.toMatch(/\{olddata\};\{app\}/);
  });

  it('scribner.cmd: the exit code and parentheses in arguments survive (no %ERRORLEVEL% inside a block)', () => {
    expect(cmd).not.toMatch(/\([^)]*%\*[^)]*\)/s);
    expect(cmd).not.toMatch(/\(\s*\r?\n[^)]*%ERRORLEVEL%/);
  });
});
