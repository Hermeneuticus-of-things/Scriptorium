// Bug hunt deep T24 — motoarele (dictare/transcriere/AI bulk): cauze-rădăcină de instabilitate
// la scară (cărți de 130k+ cuvinte, dictare + editare simultană). Fiecare test reproducă exact
// contractul rupt, înainte de reparație.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
const require = createRequire(import.meta.url);
const { createDted } = require('../lib/dted.cjs');
const batch = require('../lib/aiBatch.cjs');
const store = require('../lib/store.cjs');

const tmp = [];
afterEach(() => {
  for (const d of tmp.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  vi.useRealTimers();
  delete globalThis.AudioContext;
});
const tempDir = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-t24-'));
  tmp.push(d);
  return d;
};

describe('localSpeech: un listener care aruncă nu trebuie să oprească dictarea', () => {
  // Cauza-rădăcină: emit() rulează listeners.forEach((f) => f(ev)) — o excepție dintr-un listener
  // (ex. inserarea fragmentului în editorul care tocmai s-a închis la editare simultană) iese din
  // forEach, sare peste restul listeners și, venind din onaudioprocess, sare peste tăierea
  // bucăților: bufferul microfonului crește nelimitat și dictarea moare tăcut.
  const fakeApi = () => {
    const calls = [];
    return {
      calls,
      whisperStatus: async () => ({ installed: true }),
      whisperTranscribePcm: async (u8) => { calls.push(u8); return { text: 'salut' }; },
    };
  };
  const tracks = [];
  const media = { getUserMedia: async () => ({ getTracks: () => [{ stop: () => tracks.push('stop') }] }) };
  class FakeCtx {
    get sampleRate() { return 48000; }
    createMediaStreamSource() { return { connect() {} }; }
    createScriptProcessor() { const p = { connect() {}, disconnect() {}, onaudioprocess: null }; FakeCtx.last = p; return p; }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    get destination() { return {}; }
    close() { return Promise.resolve(); }
  }

  it('dictare_pornita ajunge la ceilalți listeners deși primul aruncă; pornirea nu pică', async () => {
    const { createLocalSpeech } = await import('../src/lib/localSpeech.js');
    globalThis.AudioContext = FakeCtx;
    const api = fakeApi();
    const sp = createLocalSpeech(api, { media });
    const seen = [];
    sp.onDtedEvent(() => { throw new Error('listener neascultător (editorul s-a închis)'); });
    sp.onDtedEvent((e) => seen.push(e.ev));
    await sp.dtedDictateStart('d1'); // înainte de fix: aruncă aici (excepția iese din emit)
    expect(seen).toEqual(['dictare_pornita']);
    sp.dispose();
  });

  it('bucățile se taie și se trimit la motor deși listenerul de nivel aruncă la fiecare cadru', async () => {
    const { createLocalSpeech } = await import('../src/lib/localSpeech.js');
    globalThis.AudioContext = FakeCtx;
    const api = fakeApi();
    const sp = createLocalSpeech(api, { media });
    sp.onDtedEvent(() => { throw new Error('listener neascultător'); });
    sp.onDtedEvent(() => {});
    await sp.dtedDictateStart('d1');
    const frame = { inputBuffer: { getChannelData: () => new Float32Array(4096).fill(0.5) } };
    const fire = () => { for (let i = 0; i < 75; i++) FakeCtx.last.onaudioprocess(frame); };
    expect(fire).not.toThrow(); // înainte de fix: prima emitere „nivel” aruncă din onaudioprocess
    await new Promise((r) => setTimeout(r, 30));
    expect(api.calls.length).toBeGreaterThanOrEqual(1); // bucata tăiată a ajuns la motor
    sp.dispose();
  });
});

describe('dted: service căzut la mijlocul unei cereri', () => {
  // Cauza-rădăcină: `exit` respinge doar promise-ul `ready` ( deja rezolvat, deci no-op) și emite
  // „oprit”; stateWaiters nu e atins — state()/setModel() agărnate așteaptă întregul timeout de
  // 10 s cu eroarea greșită („nu a răspuns”), deși serviciul murise demn.
  const dieOnStare = () => spawnFake(`let buf='';process.stdout.write(JSON.stringify({ev:'gata',protocol:1})+'\\n');` +
    `process.stdin.setEncoding('utf8');process.stdin.on('data',c=>{buf+=c;let i;` +
    `while((i=buf.indexOf('\\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+1);if(!l.trim())continue;` +
    `const m=JSON.parse(l);if(m.cmd==='stare'){process.exit(7);}if(m.cmd==='iesire'){process.exit(0);}}});`);
  const spawnFake = (script) => ({ command: process.execPath, args: ['-e', script], cwd: process.cwd(), source: 'x' });

  it('state() respinge repede cu cauza reală când serviciul moare fără răspuns', async () => {
    const d = createDted({ find: () => dieOnStare() });
    await d.start();
    const t0 = Date.now();
    await expect(d.state()).rejects.toThrow(/oprit/i); // înainte de fix: 10 s, „nu a răspuns”
    expect(Date.now() - t0).toBeLessThan(5000);
    await d.stop();
  }, 20000);

  it('pornirea fără „gata” nu agață start()-ul pentru totdeauna (timeout la handshake)', async () => {
    // Cauza-rădăcină: start() se rezolvă doar la {"ev":"gata"}; un D&TED care pornește și nu
    // răspunde (blocaj la încărcare) ține toate send()-urile agărnate pe veci. verifyService
    // (actualizare) își pusese propriul timeout — ruta principală nu avea niciunul.
    const d = createDted({ find: () => spawnFake('setInterval(()=>{},1000);'), startTimeoutMs: 300 });
    const t0 = Date.now();
    await expect(d.status()).rejects.toThrow(/nu a răspuns la pornire/i);
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(d.running()).toBe(false); // procesul agățat e omorât (nu rămâne orfan)
    await d.stop();
  }, 20000);
});

describe('aiBatch: cache-ul AI scrie pe disc la fiecare răspuns (O(N²) sincron pe firul principal)', () => {
  // Cauza-rădăcină: comentariul promite „debounced to one write per flush/set burst”, dar set()
  // apelează flush() direct: la o carte mare (sute de documente, fișe vii de câțiva KB fiecare)
  // fiecare răspuns rescrie întregul fișier cu writeFileSync + fsync + rename, pe firul principal
  // — stutter în timpul rulărilor bulk și uzură de disc. Reparația: debounce pe timp + flush
  // explicit la sfârșitul fiecărui job bulk.
  it('o explozie de set() scrie fișierul o singură dată (după fereastra de debounce)', async () => {
    vi.useFakeTimers();
    const file = path.join(tempDir(), 'ai-cache.json');
    const writes = [];
    const orig = store.writeAtomic;
    store.writeAtomic = (f, data) => { writes.push(JSON.parse(data)); };
    try {
      const cache = batch.createCache(file);
      for (let i = 0; i < 50; i++) cache.set(`k${i}`, { v: i });
      expect(writes.length).toBeLessThanOrEqual(1); // înainte de fix: 50 de rescrieri complete
      vi.advanceTimersByTime(1000);
      expect(writes.length).toBe(1);
      expect(Object.keys(writes[0])).toHaveLength(50);
    } finally {
      store.writeAtomic = orig;
    }
  });

  it('bulkSynopsis persistă cache-ul la final chiar cu debounce', async () => {
    const file = path.join(tempDir(), 'ai-cache.json');
    const writes = [];
    const orig = store.writeAtomic;
    store.writeAtomic = (f, data) => { writes.push(JSON.parse(data)); fs.writeFileSync(f, data); };
    try {
      const docs = [{ id: 'a', title: 'A', text: 'text unu' }, { id: 'b', title: 'B', text: 'text doi' }, { id: 'c', title: 'C', text: 'text trei' }];
      const r1 = await batch.bulkSynopsis({ docs, run: async () => 's', cache: batch.createCache(file), concurrency: 2 });
      expect(Object.keys(r1.results)).toHaveLength(3);
      expect(writes.length).toBe(1); // înainte de fix: 3 (una per document)
      const r2 = await batch.bulkSynopsis({ docs, run: async () => { throw new Error('nu trebuie apelat'); }, cache: batch.createCache(file) });
      expect(r2.cachedCount).toBe(3);
    } finally {
      store.writeAtomic = orig;
    }
  });
});
