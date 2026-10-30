// In-browser stand-in for the Electron bridge, used by `npm run dev` in a plain
// browser. Keeps a demo project in memory so the UI can be tried without Electron.
import { newNode } from './text.js';

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
  let pageSetupDefault = null; // File > Page Setup default (desktop: userData/page-setup.json)
  // Simulated AI: streams its answer word by word ('ai:delta'), honours cancelAi, reports bulk progress.
  const deltaFns = new Set();
  const progressFns = new Set();
  const live = new Set(); // abort flags of running requests
  const wait = (ms, flag) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    flag.onAbort = () => { clearTimeout(t); rej(new Error('Cererea AI a fost anulată.')); };
  });
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
        return `Răspuns demo la „${question.slice(0, 80)}”: textul are ${t.split(/\s+/).filter(Boolean).length} cuvinte.`;
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
  const authorJournal = {}; // dir -> I-EDIT journal rows
  const key = (dir, id, kind) => `${dir}|${kind || 'docs'}|${id}`;
  const load = (dir) => {
    if (!state.projects[dir]) {
      const demo = demoProject();
      state.projects[dir] = demo.project;
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
    isMock: true,
    async getSettings() {
      return structuredClone(state.settings);
    },
    async setSettings(patch) {
      const { apiKey, ...rest } = patch;
      if (apiKey !== undefined) state.settings.hasApiKey = Boolean(apiKey);
      Object.assign(state.settings, rest);
      return true;
    },
    async listTemplates() {
      return [
        { id: 'blank', name: 'Gol' },
        { id: 'novel', name: 'Roman' },
      ];
    },
    async recordHistory(dir, counts) {
      const day = new Date().toISOString().slice(0, 10);
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
    async readDoc(dir, id, kind) {
      return files[key(dir, id, kind)] || '';
    },
    async writeDoc(dir, id, kind, html) {
      files[key(dir, id, kind)] = html;
      return true;
    },
    async takeSnapshot(dir, id, name) {
      const s = { file: String(Date.now()), name: name || 'Snapshot', date: new Date().toISOString(), html: files[key(dir, id)] || '' };
      (snaps[id] ||= []).unshift(s);
      return s;
    },
    async listSnapshots(_dir, id) {
      return snaps[id] || [];
    },
    // Mirrors the desktop: replaces only the html of an existing snapshot, never creates one.
    async updateSnapshotHtml(_dir, id, file, html) {
      const list = snaps[id] || [];
      const hit = list.find((x) => String(x.file) === String(file));
      if (!hit) throw new Error(`Snapshot inexistent: ${file}`);
      hit.html = String(html ?? '');
      return true;
    },
    // I-EDIT journal of the author's changes (MODIFICARI_AUTOR.jsonl on the desktop).
    async appendAuthorJournal(dir, rows) {
      const list = (Array.isArray(rows) ? rows : [rows]).filter((r) => r && r.doc && r.old !== r.new);
      (authorJournal[dir] ||= []).push(...list.map((r) => ({ ...r })));
      return list.length;
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
      const visit = (nodes, kind) => {
        for (const n of nodes) {
          const text = String(files[key(dir, n.id)] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const score = words.filter((w) => text.toLowerCase().includes(w)).length;
          if (score && (!opts.kinds || opts.kinds.includes(kind))) out.push({ docId: n.id, title: n.title, kind, chunk: 0, score, text });
          if (n.children) visit(n.children, kind);
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
