// In-browser stand-in for the Electron bridge, used by `npm run dev` in a plain
// browser. Keeps a demo project in memory so the UI can be tried without Electron.
import { newNode } from './text.js';
import { noteTitle } from './researchChat.js';

function demoProject() {
  // A short story with dates, points of view and several characters, so every view
  // (corkboard, outline, timeline, relationship map, pacing) has something to show.
  const scene = (title, synopsis, custom, status, label) => {
    const n = newNode('text', title);
    n.synopsis = synopsis;
    n.custom = custom;
    if (status) n.status = status;
    if (label) n.label = label;
    return n;
  };
  const ch1 = newNode('folder', 'Partea întâi');
  const s1 = scene('Începutul', 'Andrei pleacă de acasă într-o dimineață de toamnă.', { Data: '1998-10-03', POV: 'Andrei', Loc: 'Cluj' }, 'Revizuit');
  const s2 = scene('Drumul', 'Pe drum îl întâlnește pe bătrânul Matei, care îi dă o hartă.', { Data: '1998-10-04', POV: 'Andrei', Loc: 'Apuseni' }, 'Prima ciornă');
  const s3 = scene('Scrisoarea', 'Ilinca găsește scrisoarea lăsată de Andrei pe masă.', { Data: '1998-10-04', POV: 'Ilinca', Loc: 'Cluj' }, 'Prima ciornă');
  ch1.children.push(s1, s2, s3);
  const ch2 = newNode('folder', 'Partea a doua');
  const s4 = scene('Cabana', 'Andrei și Matei se adăpostesc de furtună într-o cabană părăsită.', { Data: '1998-10-06', POV: 'Andrei', Loc: 'Apuseni' }, 'De făcut');
  const s5 = scene('Căutarea', 'Ilinca pornește pe urmele lui Andrei, cu harta copiată.', { Data: '1998-10-07', POV: 'Ilinca', Loc: 'Apuseni' }, 'De făcut');
  const s6 = scene('Întoarcerea', 'Andrei și Ilinca se întâlnesc la marginea satului; Matei rămâne la munte.', { Data: '1998-10-09', POV: 'Ilinca', Loc: 'Sat' }, 'De făcut');
  ch2.children.push(s4, s5, s6);
  const chars = newNode('folder', 'Personaje');
  const pA = newNode('text', 'Andrei');
  const pI = newNode('text', 'Ilinca');
  const pM = newNode('text', 'Matei');
  for (const p of [pA, pI, pM]) p.label = 'Personaj';
  chars.children.push(pA, pI, pM);
  const place = newNode('text', 'Loc: Munții Apuseni');
  place.label = 'Loc';
  const glossary = newNode('text', 'Glosar de termeni');
  glossary.label = 'Idee';
  return {
    project: {
      format: 1,
      title: 'Proiect demo',
      author: 'Autor demo',
      targets: { draft: 80000, session: 1000 },
      labels: [
        { name: 'Fără', color: '' },
        { name: 'Idee', color: '#e8b04a' },
        { name: 'Personaj', color: '#5b9bd5' },
        { name: 'Loc', color: '#70ad47' },
      ],
      statuses: ['Fără', 'De făcut', 'Prima ciornă', 'Revizuit', 'Final'],
      customFields: [
        { id: 'f-data', title: 'Data', type: 'date', options: [] },
        { id: 'f-pov', title: 'POV', type: 'text', options: [] },
        { id: 'f-loc', title: 'Loc', type: 'text', options: [] },
      ],
      tree: [
        { id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [ch1, ch2] },
        { id: 'research', title: 'Cercetare', type: 'folder', root: 'research', children: [chars, place, glossary] },
        { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] },
      ],
    },
    docs: {
      [s1.id]: '<p>Era o dimineață rece de octombrie când Andrei și-a închis ușa în urma lui. Pe masă rămăsese scrisoarea pentru Ilinca, sprijinită de cana de ceai.</p><p>Nu știa încă unde va ajunge. Știa doar că nu mai poate rămâne.</p>',
      [s2.id]: '<p>Drumul spre munte era plin de frunze ude. La o cotitură, un bătrân stătea pe o piatră, ca și cum l-ar fi așteptat.</p><p>„Mă cheamă Matei”, a spus bătrânul, și i-a întins o hartă îngălbenită. „O să ai nevoie de ea mai mult decât crezi.”</p>',
      [s3.id]: '<p>Ilinca a găsit scrisoarea abia seara. A citit-o de două ori, apoi a mai citit-o o dată, cu voce tare, ca să fie sigură că a înțeles.</p><p>Andrei nu scria unde pleacă. Scria doar că o să se întoarcă.</p>',
      [s4.id]: '<p>Furtuna i-a prins pe creastă. Matei a găsit cabana fără să se uite pe hartă, ca și cum ar fi știut-o de-o viață.</p><p>Andrei a aprins focul. Matei a tăcut mult, apoi a început să povestească despre fiul lui.</p>',
      [s5.id]: '<p>Era o dimineata rece si Ilinca a pornit spre munte , cu harta copiata pe un caiet de scoala.</p><p>La prima cotitura a gasit urmele unui foc stins.</p>',
      [s6.id]: '<p>S-au văzut de departe, la marginea satului. Niciunul n-a alergat.</p><p>Matei rămăsese sus, la cabană. „Cineva trebuie să păzească drumul”, spusese.</p>',
      [pA.id]: '<p>Andrei, 27 de ani, ochi verzi, fost profesor de istorie. Pleacă fără să explice de ce.</p>',
      [pI.id]: '<p>Ilinca, 25 de ani, restauratoare de cărți vechi. Încăpățânată și răbdătoare.</p>',
      [pM.id]: '<p>Matei, 70 de ani, fost pădurar. Știe fiecare potecă din Apuseni.</p>',
      [place.id]: '<p>Creste înalte, cabane părăsite, ceață dimineața. Toamna devreme vin furtunile.</p>',
      [glossary.id]: '<p><strong>cotitură</strong> — EN: bend, turn of the road</p><p><strong>creastă</strong> — EN: ridge</p><p><strong>pădurar</strong> — EN: forester</p>',
    },
  };
}

export function createMockApi() {
  const noKey = typeof location !== 'undefined' && /[?&]nokey\b/.test(location.search);
  const state = { settings: { recent: [], theme: 'system', fontSize: 18, typewriter: false, smartQuotes: true, hasApiKey: !noKey, aiLabel: 'Demo (simulat)', aiModel: 'demo-local' }, projects: {} };
  // Customized toolbars survive a page reload in the demo (the desktop app keeps them in settings.json).
  try {
    const tb = JSON.parse(localStorage.getItem('scribner-demo-toolbars') || 'null');
    if (tb) state.settings.toolbars = tb;
  } catch { /* storage unavailable */ }
  let pageSetupDefault = null; // File > Page Setup default (desktop: userData/page-setup.json)
  // Simulated AI: streams its answer word by word ('ai:delta'), honours cancelAi, reports bulk progress.
  const deltaFns = new Set();
  const progressFns = new Set();
  const live = new Set(); // abort flags of running requests
  const wait = (ms, flag) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    flag.onAbort = () => { clearTimeout(t); rej(new Error('Cererea AI a fost anulată.')); };
  });
  const demoChats = (dir) => {
    try {
      return JSON.parse(localStorage.getItem(`scribner-demo-chats:${dir}`) || '[]');
    } catch {
      return [];
    }
  };
  const saveDemoChats = (dir, list) => {
    try {
      localStorage.setItem(`scribner-demo-chats:${dir}`, JSON.stringify(list));
    } catch {
      /* storage unavailable */
    }
  };
  const simulate = async (answer, runId, speed = 25) => {
    const flag = {};
    live.add(flag);
    try {
      await wait(200, flag);
      for (const w of answer.split(/(?<=\s)/)) {
        if (runId) deltaFns.forEach((fn) => fn({ runId, delta: w }));
        await wait(speed, flag);
      }
      return answer;
    } finally {
      live.delete(flag);
    }
  };
  const fakeAnswer = ({ action, text = '', question = '', context = '', lang: payload_lang = '' }) => {
    const t = String(text).trim();
    switch (action) {
      case 'proofread':
        return t.replace(/\bdimineata\b/g, 'dimineață').replace(/\bsi\b/g, 'și').replace(/ ,/g, ',').replace(/\s+\./g, '.').replace(/\bocttombrie\b/g, 'octombrie').replace(/\bcopiata\b/g, 'copiată').replace(/\bscoala\b/g, 'școală').replace(/\bcotitura\b/g, 'cotitură').replace(/\bgasit\b/g, 'găsit');
      case 'summarize':
        return `Sinopsis (demo): ${t.split(/(?<=[.!?])\s/)[0].slice(0, 160)}`;
      case 'continue':
        return 'Vântul a adus mirosul de frunze ude. Andrei a grăbit pasul, fără să se uite înapoi.';
      case 'feedback':
        return '1. Ritm: prima frază e bună, a doua încetinește.\n2. Claritate: „unde va ajunge” — concretizează.\n3. Tensiune: lipsește un obstacol în prima scenă.';
      case 'consistency':
        return /ochi verzi/.test(context) && /ochi albaștri/.test(t) ? 'Contradicție: în note Andrei are ochi verzi, aici „ochi albaștri”.' : 'Nicio contradicție față de notele proiectului.';
      case 'research':
        return `Cercetare (demo) despre „${t.slice(0, 60)}”: sens, context și fapte de verificat. De verificat în: dexonline, Wikipedia, surse de specialitate.`;
      case 'define':
        return `„${t.slice(0, 40)}” (demo): sens principal, registru neutru. Sinonime: …. Exemplu: …`;
      case 'translate':
        return `[${payload_lang || 'română'}] ${t}`;
      case 'ask':
        return `Răspuns demo la „${question.slice(0, 80)}”: textul are ${((n) => (n % 100 >= 20 || n >= 100 && n % 100 === 0 ? `${n} de cuvinte` : n === 1 ? '1 cuvânt' : `${n} cuvinte`))(t.split(/\s+/).filter(Boolean).length)}.`;
      default:
        throw new Error(`Acțiune necunoscută: ${action}`);
    }
  };
  const bulk = async (job, docs, fn) => {
    const flag = {};
    live.add(flag);
    let done = 0;
    progressFns.forEach((f) => f({ job, done: 0, total: docs.length }));
    try {
      for (const d of docs) {
        try {
          await wait(400, flag);
        } catch {
          return true;
        }
        fn(d);
        done++;
        progressFns.forEach((f) => f({ job, done, total: docs.length, id: d.id, title: d.title }));
      }
      return false;
    } finally {
      live.delete(flag);
    }
  };
  const history = {};
  const files = {};
  const snaps = {};
  let snapSeq = 0;
  const authorJournal = {}; // dir -> I-EDIT journal rows
  const team = {}; // dir -> { name: text } (team/ files on the desktop)
  // ?demo&team: a second writer ("Ana") works on the first chapter, for trying team work alone
  // (?demo&team=lock: she has also locked it).
  const teamDemo = typeof location !== 'undefined' && /[?&]team\b/.test(location.search);
  if (teamDemo) state.settings.team = { name: 'Ion', color: '#2e7dd7', machine: 'pc-demo' };
  const demoPeer = (dir) => {
    const first = state.projects[dir]?.tree?.[0]?.children?.[0]?.children?.[0] || state.projects[dir]?.tree?.[0]?.children?.[0];
    if (!first) return {};
    const now = Date.now();
    const at = (min) => new Date(now - min * 60000).toISOString();
    const row = (min, added, removed, sample) => JSON.stringify({ doc: first.id, title: first.title, who: 'Ana', color: '#d9822b', machine: 'pc-ana', time: at(min), added, removed, paragraphs: 1, sample });
    return {
      'presence-pc-ana.json': JSON.stringify({ who: 'Ana', color: '#d9822b', machine: 'pc-ana', doc: first.id, locks: /[?&]team=lock\b/.test(location.search) ? [first.id] : [], time: at(0) }),
      'log-pc-ana.jsonl': [row(2 * 1440, 42, 3, 'Drumul urca pe lângă pârâu, printre fagi.'), row(25, 12, 9, 'Ceața se ridica încet din vale.')].join('\n') + '\n',
    };
  };
  const key = (dir, id, kind) => `${dir}|${kind || 'docs'}|${id}`;
  // Media files of the demo (media/<file> on the desktop) as data: addresses.
  const mediaFiles = {};
  const b64 = (bytes) => {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', html: 'text/html', htm: 'text/html', txt: 'text/plain' };
  const putMedia = (name, bytes) => {
    const ext = (String(name).split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mime = MIME[ext] || 'application/octet-stream';
    const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const file = `${id}.${MIME[ext] ? ext : 'bin'}`;
    mediaFiles[file] = `data:${mime};base64,${b64(bytes)}`;
    return { id, title: String(name).replace(/\.[^.]+$/, '') || name, media: { file, mime, name: String(name) } };
  };
  // ?demo&media: Research holds a PDF, an image, a recording and a saved web page (viewers in the editor pane).
  const mediaDemo = typeof location !== 'undefined' && /[?&]media\b/.test(location.search);
  const enc = (t) => new TextEncoder().encode(t);
  const demoMedia = () => {
    const pdfPage = (n) => `BT /F1 24 Tf 72 700 Td (Pagina ${n} - Arhiva satului) Tj ET`;
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>'];
    for (let i = 0; i < 3; i++) objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${6 + i} 0 R /Resources << /Font << /F1 9 0 R >> >> >>`);
    for (let i = 0; i < 3; i++) objs.push(`<< /Length ${pdfPage(i + 1).length} >>\nstream\n${pdfPage(i + 1)}\nendstream`);
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    let pdf = '%PDF-1.4\n';
    const offs = [];
    objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#cfe3c8"/><path d="M0 600 L300 250 L520 520 L760 180 L1200 620 L1200 800 L0 800Z" fill="#5d7a4f"/><text x="40" y="80" font-size="48" fill="#223">Munții Apuseni</text></svg>';
    // 2 s of silence, 8 kHz mono WAV
    const n = 16000;
    const wav = new Uint8Array(44 + n);
    const dv = new DataView(wav.buffer);
    [...'RIFF'].forEach((c, i) => (wav[i] = c.charCodeAt(0)));
    dv.setUint32(4, 36 + n, true);
    [...'WAVEfmt '].forEach((c, i) => (wav[8 + i] = c.charCodeAt(0)));
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    [...'data'].forEach((c, i) => (wav[36 + i] = c.charCodeAt(0)));
    dv.setUint32(40, n, true);
    wav.fill(128, 44);
    const page = '<!doctype html><html><head><meta charset="utf-8"><title>Cabane din Apuseni</title></head><body><h1>Cabane din Apuseni</h1><p>Copie locală a unei pagini despre cabanele de munte.</p></body></html>';
    const items = [putMedia('Arhiva satului.pdf', enc(pdf)), putMedia('Munții Apuseni.svg', enc(svg)), putMedia('Interviu Matei.wav', wav), putMedia('Cabane din Apuseni.html', enc(page))];
    items[3].media.source = 'https://example.org/cabane';
    return items.map((it) => ({ id: it.id, title: it.title, type: 'file', media: it.media, includeInCompile: false, synopsis: '', label: 'Fără', status: 'Fără', target: 0 }));
  };
  const load = (dir) => {
    if (!state.projects[dir]) {
      const demo = demoProject();
      state.projects[dir] = demo.project;
      if (mediaDemo) state.projects[dir].tree[1].children.push(...demoMedia());
      for (const [id, html] of Object.entries(demo.docs)) files[key(dir, id)] = html;
    }
    return structuredClone(state.projects[dir]);
  };
  const compiled = (dir, project) => {
    const out = [];
    const visit = (nodes) => {
      for (const n of nodes) {
        if (!n.includeInCompile) continue;
        if (n.type === 'folder') out.push(`<h1>${n.title}</h1>`);
        else out.push(files[key(dir, n.id)] || '');
        if (n.children) visit(n.children);
      }
    };
    visit(project.tree[0].children);
    return `<h1>${project.title}</h1>${out.join('')}`;
  };
  return {
    ...(typeof location !== 'undefined' && /[?&]dted\b/.test(location.search) ? fakeDted() : {}),
    ...(typeof location !== 'undefined' && /[?&]whisper\b/.test(location.search) ? fakeWhisper(/[?&]whisper=missing\b/.test(location.search)) : {}),
    isMock: true,
    // ?demo&conflict: window.__demoExternalEdit(id, fn) changes a document "on another computer"
    // (fn gets the HTML on disk) and announces it like the folder watcher does.
    ...(typeof location !== 'undefined' && /[?&]conflict\b/.test(location.search)
      ? (() => {
          const listeners = new Set();
          let watched = null;
          // Changes the open document (or the given one) in the watched project.
          window.__demoExternalEdit = (fn, id) => {
            const dir = watched;
            if (!id) {
              let found = null;
              const walk = (ns) => ns.forEach((n) => { if (!found && n.type === 'text' && !n.root) found = n.id; if (n.children) walk(n.children); });
              walk(state.projects[dir].tree[0].children);
              id = found;
            }
            files[key(dir, id, 'docs')] = fn(files[key(dir, id, 'docs')] || '');
            listeners.forEach((l) => l({ dir, files: [`docs/${id}.html`] }));
          };
          return {
            async watchProject(dir) { watched = dir; return true; },
            onProjectChanged(cb) { listeners.add(cb); return () => listeners.delete(cb); },
          };
        })()
      : {}),
    // Updates exist only in the desktop program; in the browser the page is always the current one.
    async updateCheck() {
      return { unavailable: true, current: '', latest: '', newer: false, notes: '' };
    },
    async updateConfigure() {
      return false;
    },
    async updateDownload() {
      throw new Error('Actualizarea este disponibilă doar în aplicația desktop.');
    },
    async updateInstall() {
      throw new Error('Actualizarea este disponibilă doar în aplicația desktop.');
    },
    async getSettings() {
      return structuredClone(state.settings);
    },
    async setSettings(patch) {
      const { apiKey, ...rest } = patch;
      if (apiKey !== undefined) state.settings.hasApiKey = Boolean(apiKey);
      Object.assign(state.settings, rest);
      if (rest.toolbars !== undefined) {
        try { localStorage.setItem('scribner-demo-toolbars', JSON.stringify(rest.toolbars)); } catch { /* storage unavailable */ }
      }
      return true;
    },
    async listTemplates() {
      return [
        { id: 'blank', name: 'Gol' },
        { id: 'novel', name: 'Roman' },
      ];
    },
    async recordHistory(dir, counts) {
      const day = (() => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();
      const h = (history[dir] ||= {});
      if (!h[day]) h[day] = { draftStart: counts.draft, totalStart: counts.total };
      Object.assign(h[day], { draftEnd: counts.draft, totalEnd: counts.total });
      return true;
    },
    async getHistory(dir) {
      return Object.entries(history[dir] || {}).map(([date, d]) => ({
        date,
        draft: d.draftEnd - d.draftStart,
        total: d.totalEnd - d.totalStart,
        draftWords: d.draftEnd,
      }));
    },
    async backupOnSave() {
      return null; // backups exist only in the desktop app
    },
    async importFile() {
      throw new Error('Importul de fișiere funcționează doar în aplicația desktop.');
    },
    async newProject(title) {
      const dir = `/demo/${title}.scribner`;
      const s = newNode('text', 'Capitolul 1');
      state.projects[dir] = {
        ...demoProject().project,
        title,
      };
      state.projects[dir].tree[0].children = [s];
      state.projects[dir].tree[1].children = [];
      files[key(dir, s.id)] = '<p></p>';
      state.settings.recent.unshift({ dir, title });
      return { dir, project: structuredClone(state.projects[dir]) };
    },
    async openProject(dir) {
      const d = dir || '/demo/Proiect demo.scribner';
      const project = load(d);
      if (!state.settings.recent.some((r) => r.dir === d)) state.settings.recent.unshift({ dir: d, title: project.title });
      return { dir: d, project };
    },
    async saveProject(dir, project) {
      state.projects[dir] = structuredClone(project);
      return true;
    },
    async readMedia(_dir, file) {
      if (!mediaFiles[file]) throw new Error(`Fișier media lipsă: ${file}`);
      return mediaFiles[file];
    },
    async addMediaData(_dir, name, bytes) {
      return putMedia(name, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []));
    },
    // The demo has no internet access: the "archived" page is a small offline stand-in.
    async archiveWebPage(_dir, url) {
      const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const it = putMedia('Pagina web.html', enc(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(url)}</title></head><body><h1>${esc(url)}</h1><p>Copie locală (demo).</p></body></html>`));
      it.title = url;
      it.media.source = url;
      return it;
    },
    async readDoc(dir, id, kind) {
      return files[key(dir, id, kind)] || '';
    },
    async writeDoc(dir, id, kind, html) {
      // ?demo&offline: window.__demoOffline = true makes writes fail like an unplugged NAS.
      if (typeof window !== 'undefined' && window.__demoOffline) throw Object.assign(new Error('EHOSTDOWN: folderul nu e disponibil'), { code: 'EHOSTDOWN' });
      files[key(dir, id, kind)] = html;
      return true;
    },
    async takeSnapshot(dir, id, name) {
      const s = { file: `${Date.now()}-${(snapSeq += 1)}`, name: name || 'Snapshot', date: new Date().toISOString(), html: files[key(dir, id)] || '' };
      (snaps[id] ||= []).unshift(s);
      return s;
    },
    async listSnapshots(_dir, id) {
      return snaps[id] || [];
    },
    async deleteSnapshot(_dir, id, file) {
      snaps[id] = (snaps[id] || []).filter((s) => s.file !== file);
      return true;
    },
    async renameSnapshot(_dir, id, file, name) {
      const s = (snaps[id] || []).find((x) => x.file === file);
      if (s) s.name = String(name || 'Snapshot');
      return true;
    },
    async snapshotCounts() {
      const out = {};
      for (const [id, list] of Object.entries(snaps)) if (list.length) out[id] = { count: list.length, last: list.reduce((m, s) => (s.date > m ? s.date : m), '') };
      return out;
    },
    // I-EDIT journal of the author's changes (MODIFICARI_AUTOR.jsonl on the desktop).
    async appendAuthorJournal(dir, rows) {
      const list = (Array.isArray(rows) ? rows : [rows]).filter((r) => r && r.doc && r.old !== r.new);
      (authorJournal[dir] ||= []).push(...list.map((r) => ({ ...r })));
      return list.length;
    },
    async teamFiles(dir) {
      return { ...(teamDemo ? demoPeer(dir) : {}), ...(team[dir] || {}) };
    },
    async teamWrite(dir, name, text, { append = false } = {}) {
      const all = (team[dir] ||= {});
      all[name] = (append ? all[name] || '' : '') + String(text);
      return true;
    },
    async readAuthorJournal(dir) {
      return (authorJournal[dir] || []).map((r) => ({ ...r }));
    },
    async importScriv() {
      throw new Error('Importul .scriv funcționează doar în aplicația desktop.');
    },
    // File > Page Setup / Print Preview: the setup is kept in memory (the project keeps its own
    // copy in project.pageSetup). printPreview / printDocuments / savePrintPdf are left out on
    // purpose: the PDF preview needs the desktop app, so those menu items stay disabled here.
    async getPageSetup(project) {
      return project?.pageSetup || pageSetupDefault;
    },
    async setPageSetup(setup) {
      pageSetupDefault = { ...(setup || {}) };
      return pageSetupDefault;
    },
    async exportCompiled(dir, project, format) {
      if (format !== 'html') throw new Error('În browser se poate exporta doar HTML. DOCX/EPUB/PDF merg în aplicația desktop.');
      const blob = new Blob([compiled(dir, project)], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${project.title}.html`;
      a.click();
      return a.download;
    },
    onAiDelta(fn) {
      deltaFns.add(fn);
      return () => deltaFns.delete(fn);
    },
    onAiProgress(fn) {
      progressFns.add(fn);
      return () => progressFns.delete(fn);
    },
    async cancelAi() {
      const n = live.size;
      for (const f of [...live]) f.onAbort && f.onAbort();
      return n;
    },
    async testAi() {
      return { ok: true, provider: 'demo', label: state.settings.aiLabel, model: state.settings.aiModel, reply: 'OK', ms: 5 };
    },
    async aiBulkSynopsis(_dir, docs) {
      const results = {};
      const cancelled = await bulk('bulkSynopsis', docs.filter((d) => d.text.trim()), (d) => { results[d.id] = `Sinopsis (demo): ${d.text.slice(0, 80)}`; });
      return { results, errors: {}, cachedCount: 0, cancelled };
    },
    async aiConsistency(_dir, docs, sheets) {
      const cancelled = await bulk('consistency', docs, () => {});
      return { sheets: sheets || { characters: {}, facts: [], docs: {} }, conflicts: [], findings: cancelled ? [] : [{ severity: 'MINOR', issue: 'Demo: nicio contradicție reală', docs: [], suggestion: '' }], errors: {}, cancelled };
    },
    async aiZoomReview(_dir, docs, levels) {
      const findings = [];
      const cancelled = await bulk('zoomReview', docs, (d) => findings.push({ level: (levels || ['Mezzo'])[0], docId: d.id, title: d.title, severity: 'MINOR', quote: d.text.slice(0, 40), issue: 'Demo: frază lungă', suggestion: 'Scurtează.' }));
      return { findings, counts: {}, errors: {}, cancelled };
    },
    async ragQuery(dir, q, opts = {}) {
      const words = String(q).toLowerCase().split(/\W+/u).filter((w) => w.length > 2);
      const out = [];
      // opts.scope: { kinds, ids } as in the desktop app (ids are folders or documents).
      const sc = opts.scope && ((opts.scope.kinds || []).length || (opts.scope.ids || []).length) ? opts.scope : null;
      const allowed = (kind, trail) => (sc ? (sc.kinds || []).includes(kind) || trail.some((id) => (sc.ids || []).includes(id)) : !opts.kinds || opts.kinds.includes(kind));
      const visit = (nodes, kind, trail = []) => {
        for (const n of nodes) {
          const text = String(files[key(dir, n.id)] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const score = words.filter((w) => text.toLowerCase().includes(w)).length;
          if (score && allowed(kind, [...trail, n.id])) out.push({ docId: n.id, title: n.title, kind, chunk: 0, score, text });
          if (n.children) visit(n.children, kind, [...trail, n.id]);
        }
      };
      const project = load(dir);
      for (const root of project.tree) if (root.root !== 'trash') visit(root.children || [], root.root === 'research' ? 'research' : 'docs');
      return out.sort((a, b) => b.score - a.score).slice(0, opts.k || 8);
    },
    async ragBuild() {
      return { docs: 0, chunks: 0 };
    },
    async ragAsk(dir, q, opts = {}) {
      const passages = await this.ragQuery(dir, q, opts);
      if (!passages.length) return { answer: 'Nu am găsit pasaje relevante în proiect.', passages };
      const answer = await simulate(`Conform pasajelor, ${passages[0].text.slice(0, 120)} [1]${passages[1] ? ` Vezi și [2].` : ''}`, null, 5);
      return { answer, passages };
    },
    // Demo research conversation: canned streamed answers with citations and follow-ups, kept in localStorage.
    async ragChats(dir) {
      return demoChats(dir);
    },
    async ragChatDelete(dir, chatId) {
      saveDemoChats(dir, demoChats(dir).filter((c) => c.id !== chatId));
      return true;
    },
    async ragImportFiles() {
      // No file dialog in the browser demo: one sample source stands in for the chosen files.
      return [{ title: 'Sursă demo (PDF)', html: '<p>Text extras dintr-un PDF de probă: orașul a fost fondat în anul 1400, pe malul râului.</p>', empty: false }];
    },
    async ragChat(dir, q, opts = {}) {
      if (state.settings.aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
      const chats = demoChats(dir);
      const prev = chats.find((c) => c.id === opts.chatId);
      const history = prev ? prev.turns : [];
      let passages = await this.ragQuery(dir, q, { k: 4, scope: opts.scope });
      // A follow-up („și în capitolul 3?”) also searches with the previous question.
      if (passages.length < 2 && history.length) {
        const more = await this.ragQuery(dir, `${q} ${history[history.length - 1].q}`, { k: 4, scope: opts.scope });
        passages = [...passages, ...more.filter((m) => !passages.some((p) => p.docId === m.docId))].slice(0, 4);
      }
      passages = passages.map((p) => ({ ...p, text: p.text.slice(0, 600) }));
      let answer;
      let followups = [];
      if (!passages.length) answer = 'Nu am găsit pasaje relevante în sursele alese. Bifează mai multe surse sau reformulează întrebarea.';
      else {
        const lead = history.length ? `Continuând discuția despre „${history[history.length - 1].q.slice(0, 60)}”: ` : 'Conform surselor, ';
        answer = `${lead}${passages[0].text.slice(0, 140)} [1]${passages[1] ? `\n\nVezi și „${passages[1].title}” [2].` : ''}`;
        followups = ['Ce alte detalii apar despre asta?', `Unde mai apare „${passages[0].title}”?`];
        await simulate(`${answer}\n\n### Întrebări de continuare\n${followups.map((f) => `- ${f}`).join('\n')}`, opts.runId, 5);
      }
      const turn = { q: String(q).trim(), answer, followups, passages, cited: passages.length ? [1] : [], at: new Date().toISOString(), provider: 'demo', model: state.settings.aiModel };
      // Same caps and title as lib/researchChat.cjs: 100 turns per conversation, 30 conversations.
      const chat = prev ? { ...prev, turns: [...prev.turns, turn].slice(-100), updated: turn.at } : { id: `c${Date.now().toString(36)}`, title: noteTitle(turn.q), created: turn.at, updated: turn.at, turns: [turn] };
      if (opts.scope) chat.scope = opts.scope;
      saveDemoChats(dir, [chat, ...chats.filter((c) => c.id !== chat.id)].slice(0, 30));
      return { chat, turn };
    },
    // Demo: accounts kept in memory, translation and grammar simulated.
    async servicesStatus() {
      const st = state.services || (state.services = {});
      const accounts = state.accounts || (state.accounts = []);
      const defs = {
        deepl: ['DeepL', [['apiKey', 'Cheie API', true]]],
        googleTranslate: ['Google Cloud Translation', [['apiKey', 'Cheie API', true]]],
        languagetool: ['LanguageTool', [['username', 'E-mail cont', false], ['apiKey', 'Cheie API', true]]],
        speechify: ['Speechify', [['apiKey', 'Cheie API', true], ['voiceId', 'Voce (ID)', false]]],
        zotero: ['Zotero', [['userId', 'ID utilizator', false], ['apiKey', 'Cheie API', true]]],
      };
      const services = Object.fromEntries(Object.entries(defs).map(([id, [label, fields]]) => {
        const v = st[id] || {};
        return [id, { label, help: '', url: '', configured: fields.filter((f) => f[2]).every((f) => v[f[0]]), fields: fields.map(([fid, fl, secret]) => ({ id: fid, label: fl, secret, set: Boolean(v[fid]), value: secret ? '' : v[fid] || '' })) }];
      }));
      return { services, accounts: accounts.map(({ password, ...a }) => ({ ...a, hasPassword: Boolean(password) })) };
    },
    async setService(id, values) {
      const st = state.services || (state.services = {});
      st[id] = { ...(st[id] || {}) };
      for (const [k, v] of Object.entries(values || {})) if (String(v).trim()) st[id][k] = String(v).trim(); else delete st[id][k];
      return (await this.servicesStatus()).services[id];
    },
    async setAccount(a) {
      const list = state.accounts || (state.accounts = []);
      if (!String(a.name || '').trim()) throw new Error('Numele contului lipsește.');
      const i = list.findIndex((x) => x.id === a.id);
      const next = { id: a.id || `acc-${Date.now()}`, name: a.name.trim(), url: a.url || '', username: a.username || '', password: a.password === undefined && i >= 0 ? list[i].password : a.password || '' };
      if (i >= 0) list[i] = next; else list.push(next);
      return next.id;
    },
    async deleteAccount(id) { state.accounts = (state.accounts || []).filter((a) => a.id !== id); return true; },
    async copyAccountPassword() { return true; },
    async translateText({ text, to }) {
      if (!(state.services && state.services.deepl && state.services.deepl.apiKey)) throw new Error('Pune cheia DeepL în Setări → Servicii și conturi.');
      return { text: `[${to || 'ro'}] ${text}`, detected: 'en', service: 'DeepL (demo)' };
    },
    async importZotero() {
      const z = state.services && state.services.zotero;
      if (!(z && z.userId && z.apiKey)) throw new Error('Pune ID-ul de utilizator Zotero și cheia în Setări → Servicii și conturi.');
      return { entries: [
        { key: 'Blaga1937', type: 'book', title: 'Trilogia culturii', authors: [{ family: 'Blaga', given: 'Lucian' }], editors: [], year: '1937', container: '', publisher: 'Fundația pentru Literatură și Artă', place: 'București', volume: '', issue: '', pages: '', edition: '', doi: '', url: '' },
        { key: 'Eliade1949', type: 'book', title: 'Le mythe de l’éternel retour', authors: [{ family: 'Eliade', given: 'Mircea' }], editors: [], year: '1949', container: '', publisher: 'Gallimard', place: 'Paris', volume: '', issue: '', pages: '', edition: '', doi: '', url: '' },
      ] };
    },
    async speakCloud() {
      if (!(state.services && state.services.speechify && state.services.speechify.apiKey)) throw new Error('Pune cheia Speechify în Setări → Servicii și conturi.');
      // 0.1 s of silence as MP3 frames is not needed for the demo: an empty WAV plays and ends at once.
      const wav = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      return { format: 'wav', chunks: [wav] };
    },
    async checkGrammar({ text }) {
      const matches = [];
      const re = /\b(si|dimineata|scoala|copiata|gasit|cotitura)\b/g;
      const fix = { si: 'și', dimineata: 'dimineață', scoala: 'școală', copiata: 'copiată', gasit: 'găsit', cotitura: 'cotitură' };
      let m;
      while ((m = re.exec(text))) matches.push({ offset: m.index, length: m[0].length, message: 'Lipsesc diacriticele.', short: 'Diacritice', found: m[0], replacements: [fix[m[0]]], rule: 'DEMO' });
      for (const sp of text.matchAll(/ ,/g)) matches.push({ offset: sp.index, length: 2, message: 'Spațiu înainte de virgulă.', short: 'Punctuație', found: ' ,', replacements: [','], rule: 'DEMO' });
      return { language: 'Romanian (demo)', matches: matches.sort((a, b) => a.offset - b.offset), premium: false };
    },
    async runAi(payload) {
      if (state.settings.aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
      if (!state.settings.hasApiKey) throw new Error('Setează cheia API în Setări.');
      if (payload && payload.action !== 'editorial') {
        const answer = await simulate(fakeAnswer(payload), payload.runId);
        return { text: answer, stopReason: 'end_turn', provider: state.settings.aiLabel, model: state.settings.aiModel };
      }
      if (payload && payload.action === 'editorial') {
        // Demo stand-in for Claude: applies simple fixes so the I-REP loop can be tried in the browser.
        const m = /<text>\n?([\s\S]*?)\n?<\/text>/.exec(payload.prompt);
        const text = (m ? m[1] : '')
          .replace(/\s*[—–]\s*/g, ', ')
          .replace(/\s*\(([^)]*)\)/g, ', $1')
          .replace(/\bse observă\b/gi, 'vedem')
          .replace(/:\s/g, ', ');
        await simulate(text, payload.runId, 2);
        return { text, provider: state.settings.aiLabel, model: state.settings.aiModel };
      }
    },
  };
}

// ?demo&dted: a simulated D&TED (docs/DTED.md) — dictation sends a few Romanian phrases, an
// audio file "transcribes" into two paragraphs — so dictation can be tried in the browser.
function fakeDted() {
  const listeners = new Set();
  const emit = (ev) => setTimeout(() => listeners.forEach((f) => f(ev)), 0);
  const phrases = ['ceața se ridica încet din vale', 'și drumul urca pe lângă pârâu.', 'Andrei s-a oprit la marginea pădurii'];
  let seq = 0;
  let dict = null;
  const stopDict = (cancelled) => {
    if (!dict) return;
    clearInterval(dict.timer);
    emit(cancelled ? { ev: 'anulat', id: dict.id } : { ev: 'dictare_oprita', id: dict.id, text: dict.sent.join(' ') });
    dict = null;
  };
  let demoDtedModel = 'auto';
  const DEMO_MODELE = [
    { nume: 'whisper-turbo-ro-en-ct2', descriere: 'Optimizat pentru română (recomandat — WER 5,8%)', instalat: true },
    { nume: 'whisper-large-v3-turbo-ct2', descriere: 'Standard multilingv', instalat: true },
  ];
  const demoDtedState = () => ({ model: demoDtedModel, model_folosit: demoDtedModel === 'auto' ? DEMO_MODELE[0].nume : demoDtedModel, modele: DEMO_MODELE });
  return {
    onDtedEvent(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    async dtedStatus() {
      // ?demo&dted=old: a D&TED from before the model choice (no model list).
      const old = typeof location !== 'undefined' && /[?&]dted=old\b/.test(location.search);
      return { found: true, source: 'D&TED simulat (demo)', running: true, state: old ? { versiune: '0.3.1' } : demoDtedState() };
    },
    async dtedSetModel(nume) {
      demoDtedModel = nume || 'auto';
      return demoDtedState();
    },
    async dtedPickAudio() {
      return 'interviu-bunica.mp3';
    },
    async dtedTranscribe(file, given) {
      const id = given || `t${++seq}`;
      emit({ ev: 'faza', id, text: 'Transcriu…' });
      setTimeout(() => emit({ ev: 'progres', id, p: 0.6 }), 200);
      setTimeout(() => emit({ ev: 'rezultat', id, text: '', secunde_audio: 70, segmente: [{ start: 0, end: 4, text: 'Când eram mică, iarna venea devreme.' }, { start: 4.5, end: 8, text: 'Tata tăia lemne în curte.' }, { start: 62, end: 66, text: 'Apoi am plecat la oraș.' }] }), 700);
      return id;
    },
    async dtedTranscribeMedia(_dir, file, id) {
      return this.dtedTranscribe(file, id);
    },
    async dtedDictateStart(given) {
      if (dict) throw new Error('Dictarea este deja pornită.');
      const id = given || `d${++seq}`;
      dict = { id, n: 0, sent: [] };
      emit({ ev: 'dictare_pornita', id });
      dict.timer = setInterval(() => {
        emit({ ev: 'nivel', id, nivel: 0.2 + Math.random() * 0.5 });
        if (dict && dict.n < phrases.length) {
          const text = phrases[dict.n++];
          dict.sent.push(text);
          emit({ ev: 'fragment', id, text });
        }
      }, 700);
      return id;
    },
    async dtedDictateStop() {
      stopDict(false);
      return true;
    },
    async dtedCancel(id) {
      if (dict && dict.id === id) stopDict(true);
      else emit({ ev: 'anulat', id });
      return true;
    },
  };
}

// ?demo&whisper: a simulated built-in recogniser (docs/DTED.md §7) — every piece of speech becomes
// the next demo phrase; ?demo&whisper=missing starts with the engine not downloaded.
function fakeWhisper(missing) {
  let installed = !missing;
  const progress = new Set();
  const phrases = ['ceața se ridica încet din vale', 'și drumul urca pe lângă pârâu.', 'Andrei s-a oprit la marginea pădurii.'];
  let n = 0;
  let fileNext = false;
  const status = () => ({ installed, model: installed, variants: installed ? ['cpu'] : [], supported: true, running: installed, sizes: { cpu: 16, cuda: 423, model: 574 } });
  // One second of a quiet tone, as the "audio file" the demo transcribes.
  const wav = () => {
    const rate = 16000;
    const pcm = new Int16Array(rate * 3);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(6000 * Math.sin(i / 8));
    const b = new ArrayBuffer(44 + pcm.byteLength);
    const v = new DataView(b);
    const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + pcm.byteLength, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, pcm.byteLength, true);
    new Int16Array(b, 44).set(pcm);
    return new Uint8Array(b);
  };
  return {
    whisperStatus: async () => status(),
    onWhisperProgress(fn) {
      progress.add(fn);
      return () => progress.delete(fn);
    },
    async whisperInstall() {
      for (const mb of [100, 300, 590]) {
        await new Promise((r) => setTimeout(r, 150));
        progress.forEach((f) => f({ what: mb < 300 ? 'motor' : 'model', mb, totalMb: 590 }));
      }
      installed = true;
      return status();
    },
    async whisperRemove() {
      installed = false;
      return status();
    },
    async whisperTranscribePcm(pcm) {
      if (!installed) throw new Error('Motorul de recunoaștere a vorbirii nu e descărcat încă.');
      const len = pcm?.byteLength || 0;
      if (!len) return { text: '', segmente: [] };
      const sec = len / 2 / 16000;
      if (fileNext) {
        fileNext = false;
        return { text: 'Când eram mică, iarna venea devreme.', segmente: [{ start: 0, end: sec, text: 'Când eram mică, iarna venea devreme.' }] };
      }
      const text = phrases[n++ % phrases.length];
      return { text, segmente: [{ start: 0, end: sec, text }] };
    },
    async dtedPickAudio() {
      return 'amintiri.wav';
    },
    async whisperReadAudio() {
      fileNext = true;
      return wav();
    },
    async whisperReadMedia() {
      fileNext = true;
      return wav();
    },
  };
}
