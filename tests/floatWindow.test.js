import { describe, it, expect } from 'vitest';
import fs from 'fs';
// Motorul unitar de panouri flotante și andocare magnetică (Etapa VI din misiunea de dock).
import {
  clampRect, snapZone, snapRect, startDrag, startResize, defaultRect,
} from '../src/lib/floatWindow.js';

const VP = () => ({ innerWidth: 1400, innerHeight: 900 });

describe('clampRect — panoul rămâne utilizabil pe ecran', () => {
  it('respectă minimele 320×320', () => {
    const r = clampRect({ x: 0, y: 0, w: 100, h: 50 }, VP());
    expect(r.w).toBeGreaterThanOrEqual(320);
    expect(r.h).toBeGreaterThanOrEqual(320);
  });
  it('nu iese din viewport', () => {
    const r = clampRect({ x: 1300, y: 800, w: 420, h: 560 }, VP());
    expect(r.x + r.w).toBeLessThanOrEqual(1400 - 8);
    expect(r.y + r.h).toBeLessThanOrEqual(900 - 8);
  });
  it('viewport mic: clamp la minime fără eroare', () => {
    const r = clampRect({ x: 0, y: 0, w: 5000, h: 3000 }, { innerWidth: 400, innerHeight: 300 });
    expect(r.w).toBeLessThanOrEqual(400);
    expect(r.h).toBeLessThanOrEqual(300);
  });
});

describe('snapZone — andocarea magnetică pe margini', () => {
  it('lipit de dreapta → right', () => {
    const r = { x: 1400 - 420, y: 60, w: 420, h: 560 };
    expect(snapZone(r, VP())).toBe('right');
  });
  it('lipit de stânga → left', () => {
    expect(snapZone({ x: 0, y: 60, w: 420, h: 560 }, VP())).toBe('left');
  });
  it('lipit de jos → bottom (după verificarea stânga/dreapta)', () => {
    const r = { x: 500, y: 900 - 560, w: 420, h: 560 };
    expect(snapZone(r, VP())).toBe('bottom');
  });
  it('lipit de sus → top', () => {
    expect(snapZone({ x: 500, y: 0, w: 420, h: 560 }, VP())).toBe('top');
  });
  it('în mijloc → null (panou liber)', () => {
    expect(snapZone({ x: 500, y: 200, w: 420, h: 560 }, VP())).toBeNull();
  });
});

describe('snapRect — dreptunghiul de andocare previzualizat', () => {
  it('right = jumătatea dreaptă', () => {
    const r = snapRect('right', VP());
    expect(r).toEqual({ x: 700, y: 0, w: 700, h: 900 });
  });
  it('bottom = jumătatea de jos', () => {
    const r = snapRect('bottom', VP());
    expect(r.y).toBe(450);
    expect(r.h).toBe(450);
  });
});

function makeFakeWin() {
  const listeners = {};
  const fake = {
    addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
    removeEventListener: (ev, fn) => { listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn); },
    fire: (ev, props = {}) => { for (const fn of listeners[ev] || []) fn({ ...props }); },
    has: (ev) => Boolean(listeners[ev]?.length),
  };
  return fake;
}

describe('startDrag — mutare + comiterea andocării', () => {
  const makeEl = () => {
    const header = { addEventListener: (ev, fn) => { header[ev] = fn; }, removeEventListener: () => {} };
    return { header };
  };
  it('drag la mijloc → rămâne panou liber', () => {
    const { header } = makeEl();
    const fake = makeFakeWin();
    let end = null;
    const cleanup = startDrag({
      header, win: fake, viewport: VP, rect: () => ({ x: 500, y: 200, w: 420, h: 560 }),
      setRect: () => {}, onEnd: (e) => { end = e; },
    });
    header.pointerdown({ target: null, clientX: 600, clientY: 300, preventDefault: () => {} });
    expect(fake.has('pointermove')).toBe(true);
    fake.fire('pointermove', { clientX: 700, clientY: 320 });
    fake.fire('pointerup');
    cleanup();
    expect(end.zone).toBeNull();
    expect(end.rect.x).toBe(600);
  });
  it('drag lângă marginea dreaptă → zone right + rect andocat', () => {
    const { header } = makeEl();
    const fake = makeFakeWin();
    let end = null;
    const cleanup = startDrag({
      header, win: fake, viewport: VP, rect: () => ({ x: 500, y: 200, w: 420, h: 560 }),
      setRect: () => {}, onEnd: (e) => { end = e; },
    });
    header.pointerdown({ target: null, clientX: 600, clientY: 300, preventDefault: () => {} });
    fake.fire('pointermove', { clientX: 1350, clientY: 350 });
    fake.fire('pointerup');
    cleanup();
    expect(end.zone).toBe('right');
    expect(end.rect).toEqual(snapRect('right', VP()));
  });
  it('click pe butonul din antet nu trage panoul', () => {
    const { header } = makeEl();
    const fake = makeFakeWin();
    let end = null;
    const cleanup = startDrag({ header, win: fake, viewport: VP, rect: () => ({ x: 0, y: 0, w: 420, h: 560 }), setRect: () => {}, onEnd: (e) => { end = e; } });
    header.pointerdown({ target: { closest: () => ({}) }, clientX: 10, clientY: 10, preventDefault: () => {} });
    fake.fire('pointermove', { clientX: 100, clientY: 100 });
    fake.fire('pointerup');
    cleanup();
    expect(end).toBeNull();
  });
});

describe('startResize + defaultRect', () => {
  it('resize respectă minimele', () => {
    const grip = { addEventListener: (ev, fn) => { grip[ev] = fn; } };
    const fake = makeFakeWin();
    let set = null;
    startResize({ grip, win: fake, viewport: VP, rect: () => ({ x: 0, y: 0, w: 400, h: 400 }), setRect: (r) => { set = r; } });
    grip.pointerdown({ preventDefault: () => {}, clientX: 400, clientY: 400 });
    fake.fire('pointermove', { clientX: 200, clientY: 100 });
    fake.fire('pointerup');
    expect(set.w).toBeGreaterThanOrEqual(320);
    expect(set.h).toBeGreaterThanOrEqual(320);
  });
  it('defaultRect: cascada evită suprapunerea panourilor existente', () => {
    const a = defaultRect(VP(), [], 420, 560);
    const b = defaultRect(VP(), [a], 420, 560);
    expect(Math.abs(b.x - a.x)).toBeGreaterThanOrEqual(28);
  });
});

describe('cablaj în aplicație', () => {
  const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  it('panoul AI flotant consumă motorul (drag/resize/andocare magnetică)', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("from './lib/floatWindow.js'");
    expect(app).toContain("startDrag");
    expect(app).toContain("startResize");
    expect(app).toContain("snapRect");
    expect(app).toContain("aiPanelMode");
  });
  it('CSS-ul panoului flotant există (head trăgabil + grip de resize)', () => {
    const css = src('src/ai.css');
    expect(css).toContain('.ai-float');
    expect(css).toContain('.ai-float-head');
    expect(css).toContain('.ai-float-resize');
  });
});
