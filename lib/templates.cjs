'use strict';
// Project templates: initial binder structure for a new project.
const T = (title, html = '<p></p>', extra = {}) => ({ type: 'text', title, html, ...extra });
const F = (title, children = [], extra = {}) => ({ type: 'folder', title, children, ...extra });

const CHARACTER = '<h2>Nume</h2><p></p><h2>Vârstă, aspect</h2><p></p><h2>Ce vrea</h2><p></p><h2>De ce se teme</h2><p></p><h2>Arc în poveste</h2><p></p>';
const PLACE = '<h2>Descriere</h2><p></p><h2>Atmosferă (sunete, mirosuri)</h2><p></p><h2>Ce se întâmplă aici</h2><p></p>';

const S = (el, text = '') => `<p data-script="${el}">${text}</p>`;
const MANUSCRIPT_TITLE =
  '<p style="text-align: left">Nume Prenume<br>Adresă<br>Telefon · e-mail</p><p style="text-align: right">cca 5.000 de cuvinte</p><p></p><p style="text-align: center"><strong>TITLUL POVESTIRII</strong></p><p style="text-align: center">de Nume Prenume</p>';

const TEMPLATES = {
  tutorial: require('./tutorialProject.cjs').tutorialTemplate(),
  blank: { name: 'Gol', category: 'Generale', draft: [T('Document nou')], research: [] },
  novel: {
    name: 'Roman',
    category: 'Ficțiune',
    draft: [F('Capitolul 1', [T('Scena 1')]), F('Capitolul 2', [T('Scena 1')]), F('Capitolul 3', [T('Scena 1')])],
    research: [
      F('Personaje', [T('Protagonist', CHARACTER, { label: 'Personaj' }), T('Antagonist', CHARACTER, { label: 'Personaj' })]),
      F('Locuri', [T('Loc principal', PLACE, { label: 'Loc' })]),
      F('Intrigă', [T('Sinopsis', '<p>Povestea în cinci propoziții.</p>'), T('Cronologie')]),
      F('Șabloane', [T('Fișă personaj', CHARACTER), T('Fișă loc', PLACE)], { template: true }),
    ],
  },
  parts: {
    name: 'Roman cu părți',
    category: 'Ficțiune',
    draft: [F('Partea întâi', [F('Capitolul 1', [T('Scena 1')])]), F('Partea a doua', [F('Capitolul 2', [T('Scena 1')])])],
    research: [F('Personaje', []), F('Locuri', []), F('Șabloane', [T('Fișă personaj', CHARACTER), T('Fișă loc', PLACE)], { template: true })],
  },
  stories: {
    name: 'Volum de povestiri',
    category: 'Ficțiune',
    draft: [F('Povestirea 1', [T('Text')]), F('Povestirea 2', [T('Text')])],
    research: [F('Idei', [])],
  },
  nonfiction: {
    name: 'Non-ficțiune',
    category: 'Non-ficțiune',
    draft: [T('Introducere'), F('Capitolul 1', [T('Secțiunea 1')]), F('Capitolul 2', [T('Secțiunea 1')]), T('Concluzii')],
    research: [F('Surse', []), F('Citate', []), F('Schiță', [T('Plan', '<p>Teza cărții și argumentele pe capitole.</p>')])],
  },
  shortStory: {
    name: 'Povestire (format manuscris)',
    category: 'Ficțiune',
    draft: [T('Pagina de titlu', MANUSCRIPT_TITLE), T('Povestirea', '<p></p>')],
    research: [F('Personaje', [T('Protagonist', CHARACTER, { label: 'Personaj' })]), F('Note', [T('Idee', '<p>Premisa în două propoziții.</p>')])],
  },
  novelFormatted: {
    name: 'Roman formatat (front matter)',
    category: 'Ficțiune',
    draft: [
      F('Capitolul 1', [T('Scena 1')]),
      F('Capitolul 2', [T('Scena 1')]),
    ],
    research: [
      F('Front matter', [T('Pagina de titlu', '<p style="text-align: center"><strong>TITLUL CĂRȚII</strong></p><p style="text-align: center">Autorul</p>'), T('Copyright', '<p style="text-align: center">© Autorul. Toate drepturile rezervate.</p>'), T('Dedicație', '<p style="text-align: center"><em>Pentru…</em></p>')]),
      F('Back matter', [T('Despre autor'), T('Mulțumiri')]),
      F('Personaje', []),
      F('Șabloane', [T('Fișă personaj', CHARACTER), T('Fișă loc', PLACE)], { template: true }),
    ],
  },
  screenplay: {
    name: 'Scenariu de film',
    category: 'Scenariu',
    draft: [
      F('Actul I', [T('Scena 1', S('scene-heading', 'INT. CASĂ - ZI') + S('action', 'Descrierea acțiunii.') + S('character', 'PERSONAJ') + S('dialogue', 'Replica.'))]),
      F('Actul II', [T('Scena 2', S('scene-heading', 'EXT. STRADĂ - NOAPTE') + S('action'))]),
      F('Actul III', [T('Scena 3', S('scene-heading') + S('action'))]),
    ],
    research: [F('Personaje', [T('Protagonist', CHARACTER, { label: 'Personaj' })]), F('Locații', []), T('Logline', '<p>Un erou care vrea… dar…</p>')],
  },
  stagePlay: {
    name: 'Piesă de teatru',
    category: 'Scenariu',
    draft: [
      F('Actul I', [T('Scena 1', S('act', 'ACTUL I') + S('stage-direction', 'Decorul. Lumina.') + S('character', 'PERSONAJ') + S('dialogue', 'Replica.'))]),
      F('Actul II', [T('Scena 1', S('act', 'ACTUL II') + S('stage-direction'))]),
    ],
    research: [T('Distribuția', '<p>PERSONAJ — descriere</p>'), F('Decoruri', [])],
  },
  essay: {
    name: 'Eseu',
    category: 'Non-ficțiune',
    draft: [T('Introducere', '<p>Teza eseului.</p>'), T('Argumentul 1'), T('Argumentul 2'), T('Contraargumente'), T('Concluzie')],
    research: [F('Surse', []), F('Citate', [])],
  },
  thesis: {
    name: 'Teză / lucrare de licență',
    category: 'Non-ficțiune',
    draft: [
      F('Introducere', [T('Motivația'), T('Obiective')]),
      F('Stadiul cercetării', [T('Literatura de specialitate')]),
      F('Metodologie', [T('Metode')]),
      F('Rezultate', [T('Rezultate')]),
      F('Discuții', [T('Interpretare')]),
      T('Concluzii'),
    ],
    research: [
      F('Front matter', [T('Pagina de titlu'), T('Rezumat'), T('Mulțumiri')]),
      F('Back matter', [T('Bibliografie'), T('Anexe')]),
      F('Surse', []),
      F('Date', []),
      F('Note de lectură', []),
    ],
  },
  lectureNotes: {
    name: 'Note de curs',
    category: 'Non-ficțiune',
    draft: [F('Cursul 1', [T('Idei principale'), T('Exemple')]), F('Cursul 2', [T('Idei principale'), T('Exemple')])],
    research: [F('Bibliografie', []), F('Întrebări', [])],
  },
  recipes: {
    name: 'Colecție de rețete',
    category: 'Non-ficțiune',
    draft: [
      T('Introducere'),
      F('Aperitive', [T('Rețeta 1', '<h2>Ingrediente</h2><ul><li><p></p></li></ul><h2>Mod de preparare</h2><ol><li><p></p></li></ol><h2>Note</h2><p></p>')]),
      F('Feluri principale', []),
      F('Deserturi', []),
    ],
    research: [F('Fotografii', []), F('Idei', [])],
  },
  poetry: {
    name: 'Volum de poezie',
    category: 'Poezie',
    draft: [F('Ciclul I', [T('Poemul 1', '<p>Primul vers<br>al doilea vers</p>'), T('Poemul 2')]), F('Ciclul II', [T('Poemul 3')])],
    research: [F('Fragmente', []), F('Inspirație', [])],
  },
};

const CATEGORY_ORDER = ['Generale', 'Ficțiune', 'Non-ficțiune', 'Scenariu', 'Poezie', 'Diverse', 'Ale mele'];

// ---------------------------------------------------------------- user templates
// <templatesDir>/<id>/template.json  {id, title, category, description, icon, created}
// <templatesDir>/<id>/project/       copy of the project folder (no snapshots/backups)
const fs = require('fs');
const path = require('path');

const USER_PREFIX = 'user:';
const SKIP = new Set(['snapshots', '.sync', 'history.json']);

function slug(s) {
  return (
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'sablon'
  );
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.endsWith('.tmp')) continue;
    const a = path.join(src, e.name);
    const b = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else if (e.isFile()) fs.copyFileSync(a, b);
  }
}

function userTemplateDir(templatesDir, id) {
  const bare = String(id || '').replace(USER_PREFIX, '');
  if (!/^[a-z0-9-]+$/.test(bare)) throw new Error(`Șablon invalid: ${id}`);
  return path.join(templatesDir, bare);
}

// "Include content" off: the structure, settings and synopses stay; texts and notes are emptied.
function emptyContent(projectDir) {
  for (const kind of ['docs', 'notes']) {
    const d = path.join(projectDir, kind);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.html')) fs.writeFileSync(path.join(d, f), kind === 'docs' ? '<p></p>' : '');
  }
}

/** Saves the project folder as a user template. meta: {title, category, description, icon, includeContent (default true)}. */
function saveUserTemplate(projectDir, templatesDir, meta = {}) {
  const title = String(meta.title || '').trim();
  if (!title) throw new Error('Titlul șablonului lipsește.');
  if (!fs.existsSync(path.join(projectDir, 'project.json'))) throw new Error('Proiectul nu există.');
  let id = slug(title);
  let n = 2;
  while (fs.existsSync(path.join(templatesDir, id))) id = `${slug(title)}-${n++}`;
  const dir = path.join(templatesDir, id);
  copyDir(projectDir, path.join(dir, 'project'));
  if (meta.includeContent === false) emptyContent(path.join(dir, 'project'));
  const info = {
    id,
    title,
    category: String(meta.category || '').trim() || 'Ale mele',
    description: String(meta.description || '').trim(),
    icon: String(meta.icon || '').trim() || '📄',
    created: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, 'template.json'), JSON.stringify(info, null, 2));
  return { ...info, id: USER_PREFIX + id };
}

function listUserTemplates(templatesDir) {
  if (!templatesDir || !fs.existsSync(templatesDir)) return [];
  const out = [];
  for (const e of fs.readdirSync(templatesDir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    try {
      const info = JSON.parse(fs.readFileSync(path.join(templatesDir, e.name, 'template.json'), 'utf8'));
      if (!fs.existsSync(path.join(templatesDir, e.name, 'project', 'project.json'))) continue;
      out.push({ id: USER_PREFIX + e.name, name: info.title, category: info.category || 'Ale mele', description: info.description || '', icon: info.icon || '📄', user: true });
    } catch {
      /* not a template */
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

function deleteUserTemplate(templatesDir, id) {
  const dir = userTemplateDir(templatesDir, id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

/** Template > Export: copies a user template folder (template.json + project/) into destParent. */
function exportUserTemplate(templatesDir, id, destParent) {
  const src = userTemplateDir(templatesDir, id);
  if (!fs.existsSync(path.join(src, 'template.json'))) throw new Error('Doar șabloanele salvate de autor se pot exporta.');
  const bare = path.basename(src);
  let dest = path.join(destParent, `${bare}.sablon`);
  for (let n = 2; fs.existsSync(dest); n++) dest = path.join(destParent, `${bare}-${n}.sablon`);
  copyDir(src, dest);
  return dest;
}

/** Template > Import: a folder made by exportUserTemplate (template.json + project/project.json). */
function importUserTemplate(srcDir, templatesDir) {
  const infoFile = path.join(srcDir, 'template.json');
  if (!fs.existsSync(infoFile) || !fs.existsSync(path.join(srcDir, 'project', 'project.json'))) throw new Error('Folderul ales nu este un șablon exportat.');
  const info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
  const title = String(info.title || path.basename(srcDir)).trim() || 'Șablon';
  fs.mkdirSync(templatesDir, { recursive: true });
  let id = slug(title);
  for (let n = 2; fs.existsSync(path.join(templatesDir, id)); n++) id = `${slug(title)}-${n}`;
  const dest = path.join(templatesDir, id);
  copyDir(srcDir, dest);
  fs.writeFileSync(path.join(dest, 'template.json'), JSON.stringify({ ...info, id, title }, null, 2));
  return { id: USER_PREFIX + id, name: title, category: info.category || 'Ale mele', description: info.description || '', icon: info.icon || '📄', user: true };
}

/** Creates a new project at destDir from a user template, retitled. */
function createFromUserTemplate(templatesDir, id, destDir, title) {
  const src = path.join(userTemplateDir(templatesDir, id), 'project');
  if (!fs.existsSync(path.join(src, 'project.json'))) throw new Error('Șablonul nu mai există.');
  if (fs.existsSync(path.join(destDir, 'project.json'))) throw new Error(`Există deja un proiect în ${destDir}`);
  copyDir(src, destDir);
  const file = path.join(destDir, 'project.json');
  const project = JSON.parse(fs.readFileSync(file, 'utf8'));
  project.title = title;
  project.created = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(project, null, 2));
  return project;
}

/** Built-in templates (with category) followed by user templates when templatesDir is given. */
function listTemplates(templatesDir) {
  const builtin = Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name, category: t.category || 'Generale' }));
  return [...builtin, ...listUserTemplates(templatesDir)];
}

/** Groups a template list by category, in a stable order: [{category, templates}]. */
function groupTemplates(list) {
  const map = new Map();
  for (const t of list || []) {
    const c = t.category || 'Generale';
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(t);
  }
  const rank = (c) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length - 1);
  return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'ro')).map(([category, templates]) => ({ category, templates }));
}

module.exports = { TEMPLATES, USER_PREFIX, listTemplates, listUserTemplates, saveUserTemplate, deleteUserTemplate, exportUserTemplate, importUserTemplate, createFromUserTemplate, groupTemplates };
