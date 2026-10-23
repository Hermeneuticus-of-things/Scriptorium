'use strict';
// Advanced manuscript exports (Scrivener 3 "Compile for": LaTeX, MultiMarkdown, Pandoc).
//
// Input is a manuscript as sections: [{ title, level (1 = chapter), html }] — e.g. built by walking
// the Draft folder (see sectionsFromProject) — plus metadata { title, author, date, lang }.
//
// Kindle: Amazon's KPF format is produced only by the proprietary Kindle Create tool and is not
// openly documented, so Scribner cannot write .kpf. Kindle Direct Publishing accepts EPUB directly
// (and DOCX); use Compile → EPUB with KINDLE_EPUB_NOTE options for Kindle.
const { parseBlocks } = require('./compile.cjs');

const KINDLE_EPUB_NOTE = {
  supported: false,
  format: 'kpf',
  message:
    'KPF (Kindle Package Format) este un format proprietar generat doar de Kindle Create și nu poate fi produs liber. ' +
    'Kindle Direct Publishing acceptă EPUB: folosește Compilare → EPUB (EPUB 3, cuprins inclus, fonturi nelegate, imagini ≤ 5 MB) și încarcă fișierul în KDP.',
  recommended: { output: 'epub', epubVersion: 3, includeToc: true, embedFonts: false },
};

// ---------------------------------------------------------------- helpers
function sectionsFromProject(project, readDoc) {
  const out = [];
  const draft = (project.tree || []).find((n) => n.root === 'draft');
  const walk = (nodes, level) => {
    for (const n of nodes || []) {
      if (n.includeInCompile === false) continue;
      let html = '';
      try {
        html = n.type === 'text' || n.type === 'folder' ? readDoc(n.id) || '' : '';
      } catch {
        html = '';
      }
      out.push({ id: n.id, title: n.title, level, html, folder: n.type === 'folder' });
      walk(n.children, level + 1);
    }
  };
  walk(draft ? draft.children : [], 1);
  return out;
}

// ---------------------------------------------------------------- LaTeX
const LATEX_MAP = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', $: '\\$', '&': '\\&', '#': '\\#', '%': '\\%', _: '\\_', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}', '<': '\\textless{}', '>': '\\textgreater{}' };
function latexEscape(s) {
  return String(s ?? '')
    .replace(/[\\{}$&#%_^~<>]/g, (c) => LATEX_MAP[c])
    .replace(/\u00a0/g, '~')
    .replace(/…/g, '\\ldots{}');
}

function runsToLatex(runs) {
  return runs
    .map((r) => {
      if (r.footnote !== undefined) return `\\footnote{${latexEscape(r.footnote)}}`;
      if (r.text === undefined) return '';
      if (r.text === '\n') return '\\\\\n';
      let t = latexEscape(r.text);
      if (!t.trim()) return t;
      if (r.sup) t = `\\textsuperscript{${t}}`;
      if (r.sub) t = `\\textsubscript{${t}}`;
      if (r.s) t = `\\sout{${t}}`;
      if (r.u) t = `\\underline{${t}}`;
      if (r.i) t = `\\emph{${t}}`;
      if (r.b) t = `\\textbf{${t}}`;
      return t;
    })
    .join('');
}

const LATEX_LEVELS = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph'];

function blocksToLatex(html, baseLevel) {
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out[out.length - 1] += `\n\\end{${list}}`;
    list = null;
  };
  for (const b of parseBlocks(html || '')) {
    if (b.type === 'li') {
      const env = b.list === 'ol' ? 'enumerate' : 'itemize';
      if (list !== env) {
        closeList();
        out.push(`\\begin{${env}}`);
        list = env;
      }
      out[out.length - 1] += `\n  \\item ${runsToLatex(b.runs)}`;
      continue;
    }
    closeList();
    if (b.type === 'hr') out.push('\\begin{center}* * *\\end{center}');
    else if (/^h[1-6]$/.test(b.type)) {
      const lvl = Math.min(LATEX_LEVELS.length - 1, baseLevel + Number(b.type[1]));
      out.push(`\\${LATEX_LEVELS[lvl]}*{${runsToLatex(b.runs)}}`);
    } else if (b.type === 'blockquote') out.push(`\\begin{quote}\n${runsToLatex(b.runs)}\n\\end{quote}`);
    else if (b.type === 'pagebreak') out.push('\\clearpage');
    else {
      const t = runsToLatex(b.runs);
      if (!t.trim()) continue;
      out.push(b.align === 'center' ? `\\begin{center}\n${t}\n\\end{center}` : t);
    }
  }
  closeList();
  return out.join('\n\n');
}

function toLatex(sections, meta = {}, { documentClass = 'book', titles = true } = {}) {
  const lang = meta.lang === 'en' ? 'english' : meta.lang === 'ro' || !meta.lang ? 'romanian' : meta.lang;
  const body = sections
    .map((s) => {
      const lvl = Math.min(LATEX_LEVELS.length - 1, Math.max(0, (s.level || 1) - 1));
      const head = titles && s.title ? `\\${LATEX_LEVELS[lvl]}{${latexEscape(s.title)}}\n\n` : '';
      return head + blocksToLatex(s.html, lvl);
    })
    .join('\n\n');
  return `\\documentclass[12pt]{${documentClass}}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[${lang}]{babel}
\\usepackage[normalem]{ulem}
\\usepackage{hyperref}
\\title{${latexEscape(meta.title || '')}}
\\author{${latexEscape(meta.author || '')}}
\\date{${latexEscape(meta.date || '')}}
\\begin{document}
\\maketitle
${documentClass === 'book' ? '\\tableofcontents\n' : ''}
${body}

\\end{document}
`;
}

// ---------------------------------------------------------------- Markdown (Pandoc / MultiMarkdown)
function mdEscape(s) {
  return String(s ?? '').replace(/([\\`*_[\]])/g, '\\$1').replace(/^(\s*)([#>+-]|\d+\.)(\s)/, '$1\\$2$3');
}

function blocksToMd(html, headingBase, notes) {
  const runs = (rs) =>
    rs
      .map((r) => {
        if (r.footnote !== undefined) {
          notes.push(r.footnote);
          return `[^${notes.length}]`;
        }
        if (r.text === undefined) return '';
        if (r.text === '\n') return '\\\n';
        let t = mdEscape(r.text);
        if (!t.trim()) return t;
        const lead = t.match(/^\s*/)[0];
        const trail = t.match(/\s*$/)[0];
        t = t.trim();
        if (r.sup) t = `^${t}^`;
        if (r.sub) t = `~${t}~`;
        if (r.s) t = `~~${t}~~`;
        if (r.b && r.i) t = `***${t}***`;
        else if (r.b) t = `**${t}**`;
        else if (r.i) t = `*${t}*`;
        return lead + t + trail;
      })
      .join('');
  const out = [];
  let n = 0;
  for (const b of parseBlocks(html || '')) {
    if (b.type !== 'li') n = 0;
    if (b.type === 'hr') out.push('* * *');
    else if (/^h[1-6]$/.test(b.type)) out.push(`${'#'.repeat(Math.min(6, headingBase + Number(b.type[1])))} ${runs(b.runs)}`);
    else if (b.type === 'blockquote') out.push(`> ${runs(b.runs)}`);
    else if (b.type === 'li') out.push(b.list === 'ol' ? `${++n}. ${runs(b.runs)}` : `- ${runs(b.runs)}`);
    else if (b.type !== 'pagebreak') {
      const t = runs(b.runs);
      if (t.trim()) out.push(t);
    }
  }
  // consecutive list items belong together
  return out.join('\n\n').replace(/^((?:- |\d+\. ).*)\n\n(?=- |\d+\. )/gm, '$1\n');
}

function yamlString(s) {
  return `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function toMarkdown(sections, meta, { titles = true } = {}) {
  const notes = [];
  const body = sections
    .map((s) => {
      const lvl = Math.min(6, Math.max(1, s.level || 1));
      const head = titles && s.title ? `${'#'.repeat(lvl)} ${mdEscape(s.title)}\n\n` : '';
      return head + blocksToMd(s.html, lvl, notes);
    })
    .filter((x) => x.trim())
    .join('\n\n');
  const fn = notes.map((t, i) => `[^${i + 1}]: ${String(t).replace(/\n/g, ' ')}`).join('\n');
  return { body, footnotes: fn };
}

function toPandoc(sections, meta = {}, options = {}) {
  const { body, footnotes } = toMarkdown(sections, meta, options);
  const yaml = ['---', `title: ${yamlString(meta.title || '')}`, `author: ${yamlString(meta.author || '')}`];
  if (meta.date) yaml.push(`date: ${yamlString(meta.date)}`);
  yaml.push(`lang: ${meta.lang || 'ro'}`);
  if (meta.bibliography) yaml.push(`bibliography: ${yamlString(meta.bibliography)}`);
  if (meta.csl) yaml.push(`csl: ${yamlString(meta.csl)}`);
  yaml.push('---');
  return `${yaml.join('\n')}\n\n${body}\n${footnotes ? `\n${footnotes}\n` : ''}`;
}

function toMultiMarkdown(sections, meta = {}, options = {}) {
  const { body, footnotes } = toMarkdown(sections, meta, options);
  const head = [`Title: ${meta.title || ''}`, `Author: ${meta.author || ''}`];
  if (meta.date) head.push(`Date: ${meta.date}`);
  head.push(`Language: ${meta.lang || 'ro'}`);
  if (meta.bibliography) head.push(`Bibliography: ${meta.bibliography}`);
  return `${head.join('\n')}\n\n${body}\n${footnotes ? `\n${footnotes}\n` : ''}`;
}

module.exports = { toLatex, toPandoc, toMultiMarkdown, sectionsFromProject, latexEscape, KINDLE_EPUB_NOTE };
