// In-browser stand-in for the Electron bridge, used by `npm run dev` in a plain
// browser. Keeps a demo project in memory so the UI can be tried without Electron.
import { newNode } from './text.js';

function demoProject() {
  const ch1 = newNode('folder', 'Partea întâi');
  const s1 = newNode('text', 'Începutul');
  s1.synopsis = 'Eroul pleacă de acasă într-o dimineață de toamnă.';
  s1.status = 'Prima ciornă';
  const s2 = newNode('text', 'Drumul');
  s2.synopsis = 'Pe drum întâlnește un bătrân care îi dă o hartă.';
  ch1.children.push(s1, s2);
  const person = newNode('text', 'Personaj: Andrei');
  person.label = 'Personaj';
  return {
    project: {
      format: 1,
      title: 'Proiect demo',
      author: '',
      targets: { draft: 80000, session: 1000 },
      labels: [
        { name: 'Fără', color: '' },
        { name: 'Idee', color: '#e8b04a' },
        { name: 'Personaj', color: '#5b9bd5' },
        { name: 'Loc', color: '#70ad47' },
      ],
      statuses: ['Fără', 'De făcut', 'Prima ciornă', 'Revizuit', 'Final'],
      tree: [
        { id: 'draft', title: 'Manuscris', type: 'folder', root: 'draft', children: [ch1] },
        { id: 'research', title: 'Cercetare', type: 'folder', root: 'research', children: [person] },
        { id: 'trash', title: 'Coș', type: 'folder', root: 'trash', children: [] },
      ],
    },
    docs: {
      [s1.id]: '<p>Era o dimineață rece de octombrie când Andrei și-a închis ușa în urma lui.</p><p>Nu știa încă unde va ajunge.</p>',
      [s2.id]: '<p>Drumul spre munte era plin de frunze.</p>',
      [person.id]: '<p>Andrei, 27 de ani, ochi verzi, fost profesor de istorie.</p>',
    },
  };
}

export function createMockApi() {
  const noKey = typeof location !== 'undefined' && /[?&]nokey\b/.test(location.search);
  const state = { settings: { recent: [], theme: 'system', fontSize: 18, typewriter: false, smartQuotes: true, hasApiKey: !noKey, aiLabel: 'Demo (simulat)', aiModel: 'demo-local' }, projects: {} };
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
  const fakeAnswer = ({ action, text = '', question = '', context = '' }) => {
    const t = String(text).trim();
    switch (action) {
      case 'proofread':
        return t.replace(/\bdimineata\b/g, 'dimineață').replace(/\bsi\b/g, 'și').replace(/ ,/g, ',').replace(/\s+\./g, '.').replace(/\bocttombrie\b/g, 'octombrie');
      case 'summarize':
        return `Sinopsis (demo): ${t.split(/(?<=[.!?])\s/)[0].slice(0, 160)}`;
      case 'continue':
        return 'Vântul a adus mirosul de frunze ude. Andrei a grăbit pasul, fără să se uite înapoi.';
      case 'feedback':
        return '1. Ritm: prima frază e bună, a doua încetinește.\n2. Claritate: „unde va ajunge” — concretizează.\n3. Tensiune: lipsește un obstacol în prima scenă.';
      case 'consistency':
        return /ochi verzi/.test(context) && /ochi albaștri/.test(t) ? 'Contradicție: în note Andrei are ochi verzi, aici „ochi albaștri”.' : 'Nicio contradicție față de notele proiectului.';
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
    async importScriv() {
      throw new Error('Importul .scriv funcționează doar în aplicația desktop.');
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
