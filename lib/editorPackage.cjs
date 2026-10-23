'use strict';
// "PENTRU EDITOR" package: one dated folder with everything an editor needs.
//
//   📤 PENTRU EDITOR <YYYY-MM-DD>/
//     01_Manuscris.docx            compile(project, readDoc, 'docx', options.compile)
//     02_Sinopsis.md|.docx         outline of the Draft with synopses (+ notes if asked)
//     03_Glosar_Alogeni_Indieni.md tabel tehnic (src/lib/glossary.js)
//     04_Glosar_de_lectură.md      pentru cititor, fără tabele
//     05_Cuprins_de_tipar.md       numerotat, ordinea din binder / index
//     06_Raport_I-REP.md           problemele deschise (lint editorial, profilul proiectului)
//     07_Jurnal_snapshot-uri.md    snapshot-urile documentelor (dacă options.readSnapshots)
//     <extraReports>               fișiere suplimentare {name, content}
//     README.md                    conținutul pachetului
//
// Everything is configurable through `options` (see DEFAULT_PACKAGE_OPTIONS); a part set
// to false is skipped. readDoc(id) / readNotes(id) / readSnapshots(id) may be sync or async.

const fs = require('fs');
const path = require('path');
const { compile } = require('./compile.cjs');
const { safeName } = require('./exporters.cjs');

const DEFAULT_PACKAGE_OPTIONS = {
  folderName: '📤 PENTRU EDITOR {date}',
  manuscript: { enabled: true, file: '01_Manuscris', format: 'docx' },
  synopsis: { enabled: true, file: '02_Sinopsis', format: 'md', includeNotes: false, includeFolders: true },
  glossaries: { enabled: true, alogen: '03_Glosar_Alogeni_Indieni', reading: '04_Glosar_de_lectură', toc: '05_Cuprins_de_tipar', format: 'md' },
  report: { enabled: true, file: '06_Raport_I-REP', severities: ['GRAVE', 'MEDIU', 'MINOR'] },
  snapshots: { enabled: true, file: '07_Jurnal_snapshot-uri' },
  readme: true,
  compile: {},
  glossaryOptions: {},
};

const pad = (n) => String(n).padStart(2, '0');
function todayIso(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mergeOptions(o = {}) {
  const out = { ...DEFAULT_PACKAGE_OPTIONS, ...o };
  for (const k of ['manuscript', 'synopsis', 'glossaries', 'report', 'snapshots']) {
    if (o[k] === false) out[k] = { ...DEFAULT_PACKAGE_OPTIONS[k], enabled: false };
    else out[k] = { ...DEFAULT_PACKAGE_OPTIONS[k], ...(o[k] || {}) };
  }
  return out;
}

function uniqueDir(parent, name) {
  let dir = path.join(parent, name);
  for (let i = 2; fs.existsSync(dir); i++) dir = path.join(parent, `${name} (${i})`);
  return dir;
}

const strip = (html) =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const mdCell = (s) => String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function draftNodes(project) {
  const out = [];
  const root = (project.tree || []).find((n) => n.root === 'draft') || { children: [] };
  const walk = (ns, depth) => {
    for (const n of ns || []) {
      if (n.includeInCompile === false) continue;
      out.push({ node: n, depth });
      walk(n.children, depth + 1);
    }
  };
  walk(root.children, 0);
  return out;
}

async function synopsisMarkdown(project, readNotes, o) {
  const lines = [`# Sinopsis · ${project.title || ''}`.trim(), ''];
  for (const { node, depth } of draftNodes(project)) {
    if (node.type === 'folder' && !o.includeFolders) continue;
    lines.push(`${'#'.repeat(Math.min(6, depth + 2))} ${node.title}`, '');
    const meta = [node.label && node.label !== 'Fără' ? `Etichetă: ${node.label}` : '', node.status && node.status !== 'Fără' ? `Stare: ${node.status}` : ''].filter(Boolean);
    if (meta.length) lines.push(`_${meta.join(' · ')}_`, '');
    lines.push(node.synopsis ? node.synopsis.trim() : '_fără sinopsis_', '');
    if (o.includeNotes && readNotes) {
      const notes = strip(await readNotes(node.id));
      if (notes) lines.push('> ' + notes.replace(/\n/g, '\n> '), '');
    }
  }
  return lines.join('\n');
}

async function synopsisDocx(project, readNotes, o) {
  // Compile a shadow project whose documents are the synopses.
  const read = async (id) => {
    const n = draftNodes(project).find((x) => x.node.id === id)?.node;
    if (!n) return '';
    const notes = o.includeNotes && readNotes ? strip(await readNotes(id)) : '';
    return `<p>${(n.synopsis || '—').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>${notes ? `<blockquote><p>${notes.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p></blockquote>` : ''}`;
  };
  const cache = {};
  for (const { node } of draftNodes(project)) cache[node.id] = await read(node.id);
  return compile({ ...project, title: `Sinopsis · ${project.title || ''}` }, (id) => cache[id] || '', 'docx', {});
}

function alogenMd(g) {
  return [
    `# ${g.title}`,
    '',
    `${g.terms.length} termeni.`,
    '',
    '| Termen | Sens românesc | Prima definiție | Trimiteri |',
    '|---|---|---|---|',
    ...g.terms.map((t) => `| ${mdCell(t.term)} | ${mdCell(t.sense)} | ${mdCell(t.definition)} | ${mdCell(t.refs.join('; '))} |`),
    '',
  ].join('\n');
}
const readingMd = (g) => [`# ${g.title}`, '', ...g.terms.map((t) => `**${t.term}**. ${t.definition || '…'}\n`)].join('\n');
const tocMd = (g) => [`# ${g.title}`, '', ...g.entries.map((e) => `${'  '.repeat(e.depth)}${e.number} ${e.title}`)].join('\n') + '\n';

async function irepReport(project, docs, o) {
  const ed = await import('../src/lib/editorial.js');
  const profile = ed.profileFor(project, o.settings);
  const lines = [`# Raport I-REP · probleme deschise`, '', `Profil: ${profile.name}`, ''];
  let total = 0;
  const totals = { GRAVE: 0, MEDIU: 0, MINOR: 0 };
  const body = [];
  for (const d of docs) {
    if (!d.html.trim()) continue;
    const issues = ed.lint(d.html, { profile, title: d.title, canon: o.canon }).filter((i) => o.severities.includes(i.severity));
    if (!issues.length) continue;
    total += issues.length;
    for (const i of issues) totals[i.severity]++;
    body.push(`## ${d.title}`, '', '| Gravitate | Rundă | Problemă | Fragment |', '|---|---|---|---|');
    for (const i of issues) body.push(`| ${i.severity} | ${i.round} | ${mdCell(i.message)} | ${mdCell(i.excerpt)} |`);
    body.push('');
  }
  lines.push(`Total: ${total} (${totals.GRAVE} grave, ${totals.MEDIU} medii, ${totals.MINOR} minore).`, '', ...(body.length ? body : ['Nicio problemă deschisă.']));
  return { text: lines.join('\n') + '\n', total };
}

async function snapshotLog(docs, readSnapshots) {
  const rows = [];
  for (const d of docs) {
    const snaps = (await readSnapshots(d.id)) || [];
    for (const s of snaps) rows.push({ date: s.date || '', doc: d.title, name: s.name || '' });
  }
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return {
    count: rows.length,
    text: ['# Jurnal snapshot-uri', '', '| Data | Document | Snapshot |', '|---|---|---|', ...rows.map((r) => `| ${mdCell(r.date)} | ${mdCell(r.doc)} | ${mdCell(r.name)} |`), ''].join('\n'),
  };
}

/**
 * buildEditorPackage(project, readDoc, readNotes, outParent, options)
 * options: { date, extraReports: [{name, content}], readSnapshots(id), settings (for editorialLists),
 *            canon: {nodes} (Index_de_Lucru), plus any key of DEFAULT_PACKAGE_OPTIONS }
 * returns { dir, files: [{name, path, kind, description}] }
 */
async function buildEditorPackage(project, readDoc, readNotes, outParent, options = {}) {
  const o = mergeOptions(options);
  const date = options.date || todayIso();
  const dir = uniqueDir(outParent, safeName(o.folderName.replace('{date}', date), `PENTRU EDITOR ${date}`));
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  const write = (name, data, kind, description) => {
    const p = path.join(dir, safeName(name));
    fs.writeFileSync(p, data);
    files.push({ name: path.basename(p), path: p, kind, description });
  };
  const gl = await import('../src/lib/glossary.js');
  const docs = await gl.collectBookDocs(project, readDoc);

  if (o.manuscript.enabled) {
    const fmt = o.manuscript.format || 'docx';
    const out = await compile(project, readDoc, fmt, o.compile);
    write(`${o.manuscript.file}.${fmt === 'markdown' ? 'md' : fmt}`, out, 'manuscript', `Manuscrisul compilat (${fmt.toUpperCase()})`);
  }
  if (o.synopsis.enabled) {
    if (o.synopsis.format === 'docx') write(`${o.synopsis.file}.docx`, await synopsisDocx(project, readNotes, o.synopsis), 'synopsis', 'Schița cu sinopsisurile (DOCX)');
    else write(`${o.synopsis.file}.md`, await synopsisMarkdown(project, readNotes, o.synopsis), 'synopsis', 'Schița cu sinopsisurile');
  }
  if (o.glossaries.enabled) {
    const g = await gl.buildGlossaries(project, readDoc, { docs, date, ...o.glossaryOptions });
    const html = o.glossaries.format === 'html';
    const page = (t, body) => `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${t}</title></head><body>${body}</body></html>`;
    const emit = (file, part, md, desc) => file && write(`${file}.${html ? 'html' : 'md'}`, html ? page(part.title, part.html) : md(part), 'glossary', desc);
    emit(o.glossaries.alogen, g.alogen, alogenMd, `Glosar alogeni indieni (${g.alogen.terms.length} termeni)`);
    emit(o.glossaries.reading, g.reading, readingMd, `Glosar de lectură (${g.reading.terms.length} termeni)`);
    emit(o.glossaries.toc, g.toc, tocMd, `Cuprins de tipar (${g.toc.entries.length} intrări)`);
  }
  if (o.report.enabled) {
    const r = await irepReport(project, docs, { ...o.report, settings: options.settings, canon: options.canon });
    write(`${o.report.file}.md`, r.text, 'report', `Raport I-REP (${r.total} probleme deschise)`);
  }
  if (o.snapshots.enabled && typeof options.readSnapshots === 'function') {
    const s = await snapshotLog(docs, options.readSnapshots);
    if (s.count) write(`${o.snapshots.file}.md`, s.text, 'snapshots', `Jurnal snapshot-uri (${s.count})`);
  }
  for (const rep of options.extraReports || []) {
    if (rep && rep.name) write(rep.name, rep.content == null ? '' : rep.content, 'extra', rep.description || 'Raport suplimentar');
  }
  if (o.readme) {
    const readme = [
      `# PENTRU EDITOR · ${project.title || ''}`.trim(),
      '',
      `Pachet generat la ${date}${project.author ? ` · autor ${project.author}` : ''}.`,
      '',
      '## Conținut',
      '',
      ...files.map((f) => `- \`${f.name}\` · ${f.description}`),
      '',
    ].join('\n');
    write('README.md', readme, 'readme', 'Acest fișier');
  }
  return { dir, files };
}

module.exports = { buildEditorPackage, DEFAULT_PACKAGE_OPTIONS, todayIso };
