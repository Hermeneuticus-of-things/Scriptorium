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
  nonfictionNotes: {
    name: 'Non-ficțiune cu note',
    category: 'Non-ficțiune',
    draft: [
      T('Introducere', '<p>Ce susține cartea<span data-footnote="Sursa principală a tezei." class="footnote"></span>.</p>'),
      F('Capitolul 1', [T('Secțiunea 1', '<p>Argumentul, cu trimiterea la sursă<span data-footnote="Autor, Titlu, editura, anul, pagina." class="footnote"></span>.</p>')]),
      F('Capitolul 2', [T('Secțiunea 1')]),
      T('Concluzii'),
    ],
    research: [
      F('Front matter', [T('Pagina de titlu'), T('Cuprins')]),
      F('Back matter', [T('Bibliografie', '<p>Autor, <em>Titlu</em>, editura, anul.</p>'), T('Index de nume')]),
      F('Surse', []),
      F('Note de lectură', [T('Fișă de lectură', '<h2>Sursa</h2><p></p><h2>Idei</h2><p></p><h2>Citate (cu pagina)</h2><p></p>')]),
      F('Șabloane', [T('Fișă de lectură', '<h2>Sursa</h2><p></p><h2>Idei</h2><p></p><h2>Citate (cu pagina)</h2><p></p>')], { template: true }),
    ],
  },
  comicScript: {
    name: 'Benzi desenate (scenariu)',
    category: 'Scenariu',
    draft: [
      F('Numărul 1', [
        T('Pagina 1', S('page', 'PAGINA 1') + S('panel', 'Panoul 1') + S('description', 'Ce se vede în panou.') + S('character', 'PERSONAJ') + S('dialogue', 'Textul din balon.') + S('panel', 'Panoul 2') + S('description')),
        T('Pagina 2', S('page', 'PAGINA 2') + S('panel', 'Panoul 1') + S('description')),
      ]),
    ],
    research: [F('Personaje', [T('Protagonist', CHARACTER, { label: 'Personaj' })]), F('Referințe vizuale', []), T('Sinopsisul numărului')],
  },
  readingList: {
    name: 'Listă de lectură',
    category: 'Diverse',
    draft: [
      F('De citit', [T('Titlul cărții', '<h2>Autor</h2><p></p><h2>De ce o citesc</h2><p></p>')]),
      F('În curs de lectură', []),
      F('Citite', [T('Titlul cărții', '<h2>Autor</h2><p></p><h2>Impresii</h2><p></p><h2>Citate</h2><p></p><h2>Nota mea</h2><p></p>')]),
    ],
    research: [F('Recomandări', []), F('Șabloane', [T('Fișă de carte', '<h2>Autor</h2><p></p><h2>Anul</h2><p></p><h2>Impresii</h2><p></p><h2>Citate</h2><p></p>')], { template: true })],
  },
};

const DESCRIPTIONS = {
  "tutorial": "Un proiect-ghid care arată pe rând binderul, corkboardul, outlinerul și compunerea finală.",
  "blank": "Un proiect gol: un singur document în Manuscris.",
  "novel": "Capitole cu scene, fișe de personaje și de locuri, sinopsis și cronologie.",
  "parts": "Roman împărțit în părți, fiecare cu capitolele și scenele ei.",
  "stories": "Volum de povestiri, fiecare povestire într-un dosar propriu.",
  "nonfiction": "Introducere, capitole cu secțiuni, concluzii; surse și citate în Cercetare.",
  "shortStory": "Povestire în formatul standard de manuscris, cu pagina de titlu completată.",
  "novelFormatted": "Roman cu pagina de titlu, copyright, dedicație și paginile de final.",
  "screenplay": "Scenariu de film în trei acte, cu antete de scenă, acțiune, personaje și dialog.",
  "stagePlay": "Piesă de teatru pe acte și scene, cu indicații scenice și distribuție.",
  "essay": "Eseu argumentativ: teză, argumente, contraargumente, concluzie.",
  "thesis": "Lucrare academică: introducere, stadiul cercetării, metodologie, rezultate, bibliografie.",
  "lectureNotes": "Note de curs organizate pe prelegeri, cu bibliografie și întrebări.",
  "recipes": "Colecție de rețete pe categorii, cu ingrediente și mod de preparare.",
  "poetry": "Volum de poezie pe cicluri, cu fragmente și surse de inspirație.",
  "nonfictionNotes": "Non-ficțiune cu note de subsol, bibliografie, fișe de lectură și index.",
  "comicScript": "Scenariu de benzi desenate pe pagini și panouri, cu baloane și text narativ.",
  "readingList": "Listă de lectură: de citit, în curs, citite, cu fișă pentru fiecare carte."
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
  const builtin = Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name, category: t.category || 'Generale', description: t.description || DESCRIPTIONS[id] || '' }));
  return [...builtin, ...listUserTemplates(templatesDir)];
}

/** Templates whose name, category or description contain every word of the query (case and diacritics ignored). */
function searchTemplates(list, query) {
  const fold = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return list || [];
  return (list || []).filter((t) => {
    const hay = fold(`${t.name} ${t.category || ''} ${t.description || ''}`);
    return words.every((w) => hay.includes(w));
  });
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

module.exports = { TEMPLATES, DESCRIPTIONS, searchTemplates, USER_PREFIX, listTemplates, listUserTemplates, saveUserTemplate, deleteUserTemplate, exportUserTemplate, importUserTemplate, createFromUserTemplate, groupTemplates };
