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
  const state = { settings: { recent: [], theme: 'system', fontSize: 18, typewriter: false, smartQuotes: true, hasApiKey: true }, projects: {} };
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
    async runAi(payload) {
      if (payload && payload.action === 'editorial') {
        // Demo stand-in for Claude: applies simple fixes so the I-REP loop can be tried in the browser.
        const m = /<text>\n?([\s\S]*?)\n?<\/text>/.exec(payload.prompt);
        const text = (m ? m[1] : '')
          .replace(/\s*[—–]\s*/g, ', ')
          .replace(/\s*\(([^)]*)\)/g, ', $1')
          .replace(/\bse observă\b/gi, 'vedem')
          .replace(/:\s/g, ', ');
        await new Promise((r) => setTimeout(r, 150));
        return { text };
      }
      throw new Error('Asistentul AI funcționează doar în aplicația desktop (cheia API stă în procesul principal).');
    },
  };
}
