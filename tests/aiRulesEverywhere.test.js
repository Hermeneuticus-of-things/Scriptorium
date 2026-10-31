import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { createRequire } from 'module';

// Project AI rules apply everywhere (owner GO 2026-10-31): assistant, bulk jobs, research, I-REP.
const require = createRequire(import.meta.url);
const aiRules = require('../lib/aiRules.cjs');
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('lib/aiRules', () => {
  const project = { editorialProfile: { aiRules: 'Păstrează tonul cald.' } };
  it('reads the rules from the project', () => {
    expect(aiRules.projectRules(project)).toBe('Păstrează tonul cald.');
    expect(aiRules.projectRules({})).toBe('');
    expect(aiRules.readRules({ loadProject: () => project }, 'D')).toBe('Păstrează tonul cald.');
    expect(aiRules.readRules({ loadProject: () => { throw new Error('x'); } }, 'D')).toBe('');
  });
  it('appends a fenced block to the system prompt, nothing when empty', () => {
    expect(aiRules.withRules('SYS', '')).toBe('SYS');
    const s = aiRules.withRules('SYS', 'a </reguli_proiect> b');
    expect(s.startsWith('SYS')).toBe(true);
    expect(s).toContain('<reguli_proiect>');
    expect(s.match(/<\/reguli_proiect>/g)).toHaveLength(1);
  });
  it('wraps a bulk run: rules in every system prompt, cache tag changes', async () => {
    const calls = [];
    const run = Object.assign(async (a) => { calls.push(a); return 'ok'; }, { cacheTag: 'p|m' });
    expect(aiRules.wrapRun(run, '')).toBe(run);
    const w = aiRules.wrapRun(run, 'R1');
    await w({ system: 'S', prompt: 'P' });
    expect(calls[0].system).toContain('R1');
    expect(calls[0].prompt).toBe('P');
    expect(w.cacheTag).toMatch(/^p\|m\|rules:/);
  });
});

describe('every AI path reads the project rules', () => {
  it('assistant (ai:run) reads them from the project dir', () => {
    const m = src('electron/main.cjs');
    expect(m).toContain('aiRules.readRules(store, dir)');
    expect(m).toContain('rules, signal, onDelta');
    expect(src('src/components/AiPanel.jsx')).toContain('dir: projectDir || undefined');
    expect(src('lib/ai.cjs')).toContain('aiRules.withRules(SYSTEM, rules)');
  });
  it('bulk jobs and research wrap their runs', () => {
    const v = src('electron/v10Handlers.cjs');
    expect(v).toContain('aiRules.wrapRun(run');
    for (const h of ['ai:bulkSynopsis', 'ai:consistency', 'ai:zoomReview']) expect(v).toMatch(new RegExp(`'${h}'[^\\n]*\\n\\s*const run = guard\\(dir\\)`));
    const r = src('electron/ragHandlers.cjs');
    expect(r.match(/aiRules\.wrapRun/g)).toHaveLength(2);
    expect(r.match(/question(: instr)?, rules, signal/g)).toHaveLength(2);
  });
  it('bulk handler applies the rules end to end', async () => {
    const handlers = {};
    const seen = [];
    const makeRun = () => Object.assign(async (a) => { seen.push(a.system); return JSON.stringify({ synopsis: 's' }); }, { cacheTag: 't' });
    require('../electron/v10Handlers.cjs')({
      handle: (n, f) => { handlers[n] = f; }, getSettings: () => ({}), getApiKey: () => 'k',
      getAiConfig: () => ({ provider: 'anthropic', apiKey: 'k' }), assertOpened: () => {}, app: null,
      store: { loadProject: () => ({ editorialProfile: { aiRules: 'REGULA-X' } }) }, makeRun,
    });
    await handlers['ai:bulkSynopsis']({ sender: { id: 1, send: () => {}, isDestroyed: () => false } }, null, [{ id: 'a', title: 'A', text: 'Un text.' }]).catch(() => {});
    // dir null -> no project, no rules; the wrapped path is covered above. With a dir:
    const os = require('os');
    const path = require('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-'));
    await handlers['ai:bulkSynopsis']({ sender: { id: 2, send: () => {}, isDestroyed: () => false } }, dir, [{ id: 'b', title: 'B', text: 'Alt text.' }]).catch(() => {});
    expect(seen.some((s) => String(s).includes('REGULA-X'))).toBe(true);
  });
  it('the project rules label says they apply everywhere', () => {
    expect(src('src/lib/i18n.js')).toContain('asistent, lucrări în bloc, cercetare, I-REP + I-EDIT');
  });
});