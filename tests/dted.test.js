// @vitest-environment jsdom
// D&TED in Scribner (docs/DTED.md): dictated text at the cursor or over a selection, one undo step,
// transcripts, finding the program, and the service protocol against a fake D&TED process.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { buildExtensions } from '../src/editor/extensions.js';
import { AUDIO_EXT, applyReplacements, clock, insertFragment, joinFragment, transcriptHtml } from '../src/lib/dictation.js';
const require = createRequire(import.meta.url);
const { createDted, locate, INSTALL_DIR } = require('../lib/dted.cjs');

const FAKE = path.resolve('tests/fixtures/fake-dted.cjs');
let ed;
const tmp = [];
afterEach(() => {
  ed?.destroy();
  ed = null;
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});
const make = (content) => (ed = new Editor({ extensions: buildExtensions({ corrections: {} }), content }));
const tempDir = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'scribner-dted-'));
  tmp.push(d);
  return d;
};

describe('joining dictated text', () => {
  it('capital letter at a sentence start, a space between words', () => {
    expect(joinFragment('', 'ceața se ridica')).toBe('Ceața se ridica');
    expect(joinFragment('Era frig.', 'ceața se ridica')).toBe(' Ceața se ridica');
    expect(joinFragment('Era frig. ', 'ceața')).toBe('Ceața');
    expect(joinFragment('Era frig și', 'ceața')).toBe(' ceața');
    expect(joinFragment('Spuse: „', 'vino')).toBe('vino');
    expect(joinFragment('Era frig', ', apoi cald')).toBe(', apoi cald');
    expect(joinFragment('x', '   ')).toBe('');
  });
  it("the writer's replacements apply to dictated words, case kept", () => {
    const list = [{ from: 'andrei', to: 'Andrei' }, { from: 'apuseni', to: 'Apuseni' }, { from: 'două cuvinte', to: 'x' }];
    expect(applyReplacements('andrei urca în apuseni', list)).toBe('Andrei urca în Apuseni');
    expect(applyReplacements('text', [])).toBe('text');
  });
  it('transcript paragraphs follow the pauses, with times', () => {
    const r = { segmente: [{ start: 0, end: 2, text: 'Unu.' }, { start: 2.5, end: 4, text: 'Doi.' }, { start: 65, end: 70, text: 'Trei <b>.' }] };
    expect(transcriptHtml(r)).toBe('<p>Unu. Doi.</p><p>Trei &lt;b&gt;.</p>');
    expect(transcriptHtml(r, { timestamps: true })).toBe('<p>[00:00] Unu. Doi.</p><p>[01:05] Trei &lt;b&gt;.</p>');
    expect(transcriptHtml({ text: 'Doar text.' })).toBe('<p>Doar text.</p>');
    expect(clock(3725)).toBe('1:02:05');
    expect(AUDIO_EXT.test('a.MP3') && !AUDIO_EXT.test('a.pdf')).toBe(true);
  });
});

describe('dictating into the editor', () => {
  it('new text goes in at the cursor', () => {
    make('<p>Era frig.</p>');
    ed.commands.setTextSelection(ed.state.doc.content.size - 1);
    const s = {};
    insertFragment(ed, 'ceața se ridica', s);
    insertFragment(ed, 'din vale.', s);
    expect(ed.getText()).toBe('Era frig. Ceața se ridica din vale.');
    expect(s.text).toBe('Ceața se ridica din vale.');
  });
  it('over a selection it replaces it, and one undo brings the old text back', () => {
    make('<p>Era o dimineață rece de octombrie.</p>');
    const start = ed.getText().indexOf('rece') + 1;
    ed.commands.setTextSelection({ from: start, to: start + 'rece de octombrie'.length });
    const s = {};
    insertFragment(ed, 'caldă de mai', s);
    insertFragment(ed, 'cu soare', s);
    expect(ed.getText()).toBe('Era o dimineață caldă de mai cu soare.');
    ed.commands.undo();
    expect(ed.getText()).toBe('Era o dimineață rece de octombrie.');
  });
  it('typing between fragments starts a new undo step (the typing is not lost on undo)', () => {
    make('<p>A.</p>');
    ed.commands.setTextSelection(ed.state.doc.content.size - 1);
    const s = {};
    insertFragment(ed, 'unu', s);
    ed.view.dispatch(closeHistory(ed.state.tr)); // the writer types seconds later, not within 500 ms
    ed.commands.insertContent(' scris');
    ed.view.dispatch(closeHistory(ed.state.tr));
    insertFragment(ed, 'doi', s);
    ed.commands.undo();
    expect(ed.getText()).toBe('A. Unu scris');
  });
  it('a read-only editor gets nothing', () => {
    make('<p>Blocat.</p>');
    ed.setEditable(false);
    expect(insertFragment(ed, 'text', {})).toBe('');
    expect(ed.getText()).toBe('Blocat.');
  });
});

describe('finding D&TED', () => {
  it('a path from the settings: DTED.exe, its folder, or the source repository', () => {
    const d = tempDir();
    fs.writeFileSync(path.join(d, 'DTED.exe'), '');
    expect(locate({ custom: path.join(d, 'DTED.exe') })).toMatchObject({ args: ['--serviciu'], cwd: d });
    expect(locate({ custom: d }).command).toBe(path.join(d, 'DTED.exe'));
    const src = tempDir();
    fs.mkdirSync(path.join(src, 'dictare_transcriere_romana'));
    fs.writeFileSync(path.join(src, 'dictare_transcriere_romana', '__main__.py'), '');
    expect(locate({ custom: src, platform: 'win32' })).toMatchObject({ command: 'py', args: ['-3', '-m', 'dictare_transcriere_romana', '--serviciu'], cwd: src });
    expect(locate({ custom: src, platform: 'linux' }).command).toBe('python3');
    expect(locate({ custom: path.join(d, 'nu-exista') })).toBe(null);
  });
  it('Windows: the installer folder under Programs or Program Files, any D&TED name', () => {
    const local = tempDir();
    const pf = tempDir();
    expect(locate({ platform: 'win32', env: { LOCALAPPDATA: local, ProgramFiles: pf } })).toBe(null);
    fs.mkdirSync(path.join(pf, 'D&TED vechi'));
    fs.writeFileSync(path.join(pf, 'D&TED vechi', 'DTED.exe'), '');
    expect(locate({ platform: 'win32', env: { LOCALAPPDATA: local, ProgramFiles: pf } }).cwd).toBe(path.join(pf, 'D&TED vechi'));
    fs.mkdirSync(path.join(local, 'Programs', INSTALL_DIR), { recursive: true });
    fs.writeFileSync(path.join(local, 'Programs', INSTALL_DIR, 'DTED.exe'), '');
    expect(locate({ platform: 'win32', env: { LOCALAPPDATA: local, ProgramFiles: pf } }).cwd).toBe(path.join(local, 'Programs', INSTALL_DIR));
    expect(locate({ platform: 'linux', env: { LOCALAPPDATA: local } })).toBe(null);
  });
});

describe('the service, with a fake D&TED process', () => {
  const fake = (env = {}) => {
    const events = [];
    const d = createDted({
      find: () => ({ command: process.execPath, args: [FAKE], cwd: process.cwd(), source: 'fals' }),
      onEvent: (ev) => events.push(ev),
      spawnFn: (cmd, args, o) => require('child_process').spawn(cmd, args, { ...o, env: { ...o.env, ...env } }),
    });
    return { d, events };
  };
  const until = async (events, pred, ms = 5000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = events.find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no event: ${JSON.stringify(events)}`);
  };

  it('status, a transcription and its events', async () => {
    const { d, events } = fake();
    try {
      await d.status();
      expect((await until(events, (e) => e.ev === 'stare')).versiune).toBe('fals');
      const id = await d.transcribe('/tmp/interviu.mp3');
      const r = await until(events, (e) => e.ev === 'rezultat' && e.id === id);
      expect(r.text).toContain('interviu.mp3');
      expect(transcriptHtml(r)).toBe('<p>Textul din interviu.mp3.</p><p>A doua parte.</p>');
      expect(events.some((e) => e.ev === 'progres' && e.id === id)).toBe(true);
      const bad = await d.transcribe('/tmp/stricat.wav');
      expect((await until(events, (e) => e.ev === 'eroare' && e.id === bad)).ce_fac).toMatch(/MP3/);
    } finally {
      await d.stop();
    }
  }, 15000);

  it('dictation: fragments, then stop with the whole text; a second one is refused', async () => {
    const { d, events } = fake({ FAKE_DTED_MS: '60' });
    try {
      const id = await d.dictateStart();
      await until(events, (e) => e.ev === 'fragment' && e.text === 'a doua frază');
      const second = await d.dictateStart();
      await until(events, (e) => e.ev === 'eroare' && e.id === second);
      await d.dictateStop(id);
      expect((await until(events, (e) => e.ev === 'dictare_oprita')).text).toBe('prima frază dictată a doua frază');
    } finally {
      await d.stop();
    }
    expect(d.running()).toBe(false);
  }, 15000);

  it('cancel, a wrong protocol, and no D&TED at all', async () => {
    const { d, events } = fake({ FAKE_DTED_MS: '5000' });
    const id = await d.dictateStart();
    await d.cancel(id);
    await until(events, (e) => e.ev === 'anulat' && e.id === id);
    await d.stop();
    const old = fake({ FAKE_DTED_PROTOCOL: '9' });
    await expect(old.d.status()).rejects.toThrow(/actualizează D&TED/);
    await old.d.stop();
    const none = createDted({ find: () => null });
    await expect(none.dictateStart()).rejects.toMatchObject({ code: 'DTED_MISSING' });
  }, 15000);

  it('a program that is not D&TED: a clear error, not a hang', async () => {
    const d = createDted({ find: () => ({ command: process.execPath, args: ['-e', 'process.exit(3)'], cwd: process.cwd(), source: 'x' }) });
    await expect(d.status()).rejects.toThrow(/s-a oprit la pornire \(cod 3\)/);
    const missing = createDted({ find: () => ({ command: path.join(os.tmpdir(), 'nu-exista-dted.exe'), args: [], cwd: os.tmpdir(), source: 'x' }) });
    await expect(missing.status()).rejects.toThrow(/nu a putut porni/);
  }, 15000);
});
