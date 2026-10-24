'use strict';
const { projectNoteTabs } = require('../src/lib/projectNotes.js');
// Export a project as NotebookLM sources (notebooklm.google.com has no public API for
// personal accounts, so the user uploads the files by hand).
// Output: `<outDir>/NotebookLM - <Titlu>/`
//   00 - Cuprins.md            outline of the manuscript with synopses
//   01 - <Capitol>.md ...      one file per top-level item of the Draft folder
//   Cercetare - <Titlu>.md     one per top-level Research item
//   Note proiect.md            per-document notes
// NotebookLM limits: at most 50 sources per notebook and ~500k words per source; we keep
// each file under `maxWords` (default 400k) and merge neighbours when there are too many.
const fs = require('fs');
const path = require('path');
const { htmlToMarkdown, safeName } = require('./exporters.cjs');

const MAX_SOURCES = 50;
const MAX_WORDS = 400000;
const NLM_URL = 'https://notebooklm.google.com/';

const countWords = (s) => (String(s || '').match(/\S+/g) || []).length;

function metaLine(n) {
  const bits = [];
  if (n.label && n.label !== 'Fără') bits.push(`Etichetă: ${n.label}`);
  if (n.status && n.status !== 'Fără') bits.push(`Stare: ${n.status}`);
  if (n.keywords && n.keywords.length) bits.push(`Cuvinte-cheie: ${n.keywords.join(', ')}`);
  return bits.length ? `_${bits.join(' · ')}_` : '';
}

/** Markdown for a node and its descendants (headings follow depth). */
function nodeMarkdown(node, readDoc, opts, depth = 0) {
  const out = [];
  const h = '#'.repeat(Math.min(depth + 1, 6));
  out.push(`${h} ${node.title || 'Fără titlu'}`);
  if (opts.includeMetadata) {
    const m = metaLine(node);
    if (m) out.push(m);
  }
  if (opts.includeSynopsis && node.synopsis) out.push(`> Sinopsis: ${String(node.synopsis).replace(/\n+/g, ' ')}`);
  const body = htmlToMarkdown(readDoc(node.id, 'docs') || '').trim();
  if (body) out.push(body);
  if (opts.includeNotes && opts.notesInline) {
    const note = htmlToMarkdown(readDoc(node.id, 'notes') || '').trim();
    if (note) out.push(`**Note:**\n\n${note}`);
  }
  for (const c of node.children || []) out.push(nodeMarkdown(c, readDoc, opts, depth + 1));
  return out.join('\n\n');
}

/** Splits markdown into parts of at most maxWords, at paragraph boundaries when possible. */
function splitByWords(text, maxWords) {
  if (countWords(text) <= maxWords) return [text];
  const parts = [];
  let cur = [];
  let n = 0;
  const flush = () => {
    if (cur.length) parts.push(cur.join('\n\n'));
    cur = [];
    n = 0;
  };
  for (const para of String(text).split(/\n{2,}/)) {
    const w = countWords(para);
    if (w > maxWords) {
      flush();
      const words = para.split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i += maxWords) parts.push(words.slice(i, i + maxWords).join(' '));
      continue;
    }
    if (n + w > maxWords) flush();
    cur.push(para);
    n += w;
  }
  flush();
  return parts;
}

/** Merges consecutive sources so that at most `slots` remain, never above maxWords each. */
function packSources(list, slots, maxWords) {
  if (list.length <= slots) return list;
  const total = list.reduce((a, s) => a + s.words, 0);
  const pack = (target) => {
    const out = [];
    let group = [];
    let words = 0;
    const flush = () => {
      if (!group.length) return;
      out.push(group.length === 1 ? group[0] : {
        title: `${group[0].title} … ${group[group.length - 1].title}`,
        text: group.map((g) => g.text).join('\n\n---\n\n'),
        words,
      });
      group = [];
      words = 0;
    };
    for (const s of list) {
      // close the group once it reached the target, or when adding would pass the hard limit
      if (group.length && (words >= target || words + s.words > maxWords)) flush();
      group.push(s);
      words += s.words;
    }
    flush();
    return out;
  };
  let target = Math.max(1, Math.floor(total / Math.max(1, slots)));
  let out = pack(target);
  while (out.length > slots && target < maxWords) {
    target = Math.min(maxWords, Math.ceil(target * 1.25) + 1);
    out = pack(target);
  }
  return out;
}

function expandParts(src, maxWords) {
  const parts = splitByWords(src.text, maxWords);
  if (parts.length === 1) return [src];
  return parts.map((text, i) => ({ title: `${src.title} (partea ${i + 1} din ${parts.length})`, text, words: countWords(text) }));
}

/**
 * Builds the source list (no disk access besides readDoc).
 * @returns {{index:{title,text}, chapters:{title,text,words}[], research:[], notes:[], warnings:string[]}}
 */
function buildSources(project, readDoc, options = {}) {
  const opts = { includeNotes: true, includeSynopsis: true, includeMetadata: true, includeResearch: true, maxSources: MAX_SOURCES, maxWords: MAX_WORDS, ...options };
  const roots = project.tree || [];
  const draft = roots.find((r) => r.root === 'draft') || { children: [] };
  const research = roots.find((r) => r.root === 'research') || { children: [] };
  const warnings = [];
  const mk = (title, text) => ({ title, text, words: countWords(text) });

  // index: outline with synopses
  const lines = [`# ${project.title || 'Proiect'}`];
  if (project.author) lines.push(`Autor: ${project.author}`);
  lines.push('', 'Cuprinsul manuscrisului, în ordinea din binder. Fiecare capitol este o sursă separată în acest notebook.', '');
  const outline = (nodes, depth) => {
    for (const n of nodes) {
      const syn = opts.includeSynopsis && n.synopsis ? ` — ${String(n.synopsis).replace(/\n+/g, ' ')}` : '';
      const meta = opts.includeMetadata ? metaLine(n) : '';
      lines.push(`${'  '.repeat(depth)}- **${n.title || 'Fără titlu'}**${syn}${meta ? ` ${meta}` : ''}`);
      if (n.children) outline(n.children, depth + 1);
    }
  };
  outline(draft.children || [], 0);
  const index = mk('Cuprins', lines.join('\n'));

  let chapters = (draft.children || []).map((n) => mk(n.title || 'Fără titlu', nodeMarkdown(n, readDoc, opts)));
  chapters = chapters.filter((c) => c.text.trim()).flatMap((c) => expandParts(c, opts.maxWords));

  let researchSrc = [];
  if (opts.includeResearch) {
    researchSrc = (research.children || [])
      .map((n) => mk(`Cercetare - ${n.title || 'Fără titlu'}`, nodeMarkdown(n, readDoc, { ...opts, notesInline: true })))
      .filter((s) => countWords(s.text) > 1)
      .flatMap((c) => expandParts(c, opts.maxWords));
  }

  let notes = [];
  if (opts.includeNotes) {
    const chunks = [];
    const walk = (nodes, trail) => {
      for (const n of nodes) {
        const t = [...trail, n.title || 'Fără titlu'];
        const md = htmlToMarkdown(readDoc(n.id, 'notes') || '').trim();
        if (md) chunks.push(`## ${t.join(' / ')}\n\n${md}`);
        if (n.children) walk(n.children, t);
      }
    };
    walk(draft.children || [], []);
    // Project notes live in notes/<tab id>.html (Project Notes tabs), not in project.json.
    const general = projectNoteTabs(project)
      .map((t) => ({ title: t.title, md: htmlToMarkdown(readDoc(t.id, 'notes') || '').trim() }))
      .filter((t) => t.md)
      .map((t) => `## ${t.title}\n\n${t.md}`);
    if (project.notes) general.unshift(`## Note generale\n\n${htmlToMarkdown(project.notes)}`);
    chunks.unshift(...general);
    if (chunks.length) notes = expandParts(mk('Note proiect', `# Note proiect: ${project.title || ''}\n\n${chunks.join('\n\n')}`), opts.maxWords);
  }

  // Respect the source limit: index (1) + research + notes + chapters <= maxSources.
  let slots = opts.maxSources - 1;
  if (researchSrc.length + notes.length + chapters.length > slots && researchSrc.length > 1) {
    researchSrc = packSources(researchSrc, Math.max(1, Math.floor(slots / 5)), opts.maxWords);
  }
  slots -= researchSrc.length + notes.length;
  if (chapters.length > slots) {
    chapters = packSources(chapters, Math.max(1, slots), opts.maxWords);
    warnings.push(`Proiectul are prea multe capitole pentru limita NotebookLM (${opts.maxSources} surse); unele capitole consecutive au fost unite în același fișier.`);
  }
  const total = 1 + chapters.length + researchSrc.length + notes.length;
  if (total > opts.maxSources) warnings.push(`Exportul are ${total} surse, peste limita de ${opts.maxSources}. Încarcă doar o parte în notebook.`);
  return { index, chapters, research: researchSrc, notes, warnings };
}

/**
 * Writes the sources to `<outDir>/NotebookLM - <Titlu>/`. Old .md files in that folder are replaced.
 * @param {{project, readDoc:(id, kind)=>string, outDir:string, includeNotes?, includeSynopsis?, includeMetadata?, includeResearch?, maxSources?, maxWords?}} o
 * @returns {{dir:string, files:string[], words:number, warnings:string[]}}
 */
function exportNotebookLm({ project, readDoc, outDir, ...options }) {
  if (!outDir) throw new Error('Alege un folder pentru export.');
  const src = buildSources(project, readDoc, options);
  const dir = path.join(outDir, safeName(`NotebookLM - ${project.title || 'Proiect'}`));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.toLowerCase().endsWith('.md')) fs.unlinkSync(path.join(dir, f));
  const files = [];
  const used = new Set();
  const write = (name, text) => {
    let base = safeName(name).slice(0, 120) || 'Sursă';
    let file = `${base}.md`;
    // case- and Unicode-normalization-insensitive, like the macOS / Windows file systems
    for (let i = 2; used.has(file.normalize('NFC').toLowerCase()); i++) file = `${base} (${i}).md`;
    used.add(file.normalize('NFC').toLowerCase());
    fs.writeFileSync(path.join(dir, file), `${text.trim()}\n`, 'utf8');
    files.push(file);
  };
  write('00 - Cuprins', src.index.text);
  const pad = String(src.chapters.length).length < 2 ? 2 : String(src.chapters.length).length;
  src.chapters.forEach((c, i) => write(`${String(i + 1).padStart(pad, '0')} - ${c.title}`, c.text));
  for (const r of src.research) write(r.title, r.text);
  for (const n of src.notes) write(n.title, n.text);
  const words = [src.index, ...src.chapters, ...src.research, ...src.notes].reduce((a, s) => a + s.words, 0);
  return { dir, files, words, warnings: src.warnings };
}

/** URL to open: the notebook the user pasted in Settings, or the NotebookLM home page. */
function notebookUrl(settingsUrl) {
  const u = String(settingsUrl || '').trim();
  return /^https:\/\/notebooklm\.google\.com(\/|$)/.test(u) ? u : NLM_URL;
}

module.exports = { MAX_SOURCES, MAX_WORDS, NLM_URL, countWords, splitByWords, packSources, buildSources, exportNotebookLm, notebookUrl };
