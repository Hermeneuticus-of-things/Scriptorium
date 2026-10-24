'use strict';
// Advanced manuscript exports (Compile to: LaTeX, MultiMarkdown, Pandoc).
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

// \href target: only the characters that are special inside a URL argument are escaped.
const latexUrl = (u) => String(u).replace(/[\\{}]/g, '').replace(/[#%~]/g, (c) => `\\${c}`);

function runsToLatex(runs) {
  let out = '';
  let link = null;
  let inner = '';
  const flush = () => {
    if (link !== null) out += link.startsWith('#') ? inner : `\\href{${latexUrl(link)}}{${inner}}`;
    link = null;
    inner = '';
  };
  for (const r of runs || []) {
    const href = r.text !== undefined && r.text !== '\n' && r.link ? r.link : null;
    if (href !== link) flush();
    const x = runToLatex(r);
    if (href) {
      link = href;
      inner += x;
    } else out += x;
  }
  flush();
  return out;
}

function runToLatex(r) {
      if (r.image) return `[${latexEscape(r.image.alt || 'imagine')}]`;
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
      if (r.sc) t = `\\textsc{${t}}`;
      if (r.caps) t = `\\MakeUppercase{${t}}`;
      return t;
}

function tableToLatex(b) {
  const rows = b.rows.filter((r) => r.length);
  const cols = Math.max(1, ...rows.map((r) => r.reduce((n, c) => n + c.colspan, 0)));
  const cell = (c) => {
    const t = runsToLatex(c.runs.map((r) => (r.text === '\n' ? { ...r, text: ' ' } : r)));
    return c.colspan > 1 ? `\\multicolumn{${c.colspan}}{|l|}{${t}}` : t;
  };
  const lines = rows.map((r, i) => `${r.map(cell).join(' & ')}${' &'.repeat(Math.max(0, cols - r.reduce((n, c) => n + c.colspan, 0)))} \\\\ \\hline${i === 0 && r.every((c) => c.header) ? '\\hline' : ''}`);
  return `\\begin{center}\n\\begin{tabular}{|${'l|'.repeat(cols)}}\n\\hline\n${lines.join('\n')}\n\\end{tabular}\n\\end{center}`;
}

const LATEX_LEVELS = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph'];

function blocksToLatex(html, baseLevel) {
  const out = [];
  const lists = []; // open environments, innermost last: {env, id}
  const closeList = (depth = 0) => {
    while (lists.length > depth) out[out.length - 1] += `\n${'  '.repeat(lists.length - 1)}\\end{${lists.pop().env}}`;
  };
  for (const b of parseBlocks(html || '')) {
    if (b.type === 'li') {
      const env = b.list === 'ol' ? 'enumerate' : 'itemize';
      const depth = Math.min(4, Math.max(1, b.level || 1)); // LaTeX nests lists at most 4 deep
      closeList(depth);
      if (lists.length === depth && lists[depth - 1].id !== b.listId) closeList(depth - 1);
      while (lists.length < depth) {
        if (!lists.length) out.push(`\\begin{${env}}`);
        else out[out.length - 1] += `\n${'  '.repeat(lists.length)}\\begin{${env}}`;
        lists.push({ env, id: b.listId });
      }
      out[out.length - 1] += `\n${'  '.repeat(depth)}\\item ${runsToLatex(b.runs)}`;
      continue;
    }
    closeList();
    if (b.type === 'table') out.push(tableToLatex(b));
    else if (b.type === 'hr') out.push('\\begin{center}* * *\\end{center}');
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
      const sub = titles && s.title && s.subtitle ? `\\begin{center}\\emph{${latexEscape(s.subtitle)}}\\end{center}\n\n` : '';
      return head + sub + blocksToLatex(s.html, lvl);
    })
    .join('\n\n');
  return `\\documentclass[12pt]{${documentClass}}
\\usepackage{iftex}
\\ifPDFTeX
  \\usepackage[utf8]{inputenc}
  \\usepackage[T1]{fontenc}
  \\usepackage{newunicodechar}
  % Romanian comma-below letters are not in T1: compose them
  \\providecommand{\\textcommabelow}[1]{\\c{#1}}
  \\newunicodechar{ș}{\\textcommabelow{s}}
  \\newunicodechar{Ș}{\\textcommabelow{S}}
  \\newunicodechar{ț}{\\textcommabelow{t}}
  \\newunicodechar{Ț}{\\textcommabelow{T}}
\\else
  \\usepackage{fontspec}
\\fi
\\usepackage[${lang}]{babel}
\\usepackage[normalem]{ulem}
\\usepackage{hyperref}
\\title{${latexEscape(meta.title || '')}${meta.subtitle ? `\\\\[0.5em]\\large ${latexEscape(meta.subtitle)}` : ''}}
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
        if (r.image) return `![${mdEscape(r.image.alt || '')}](data:${r.image.mime};base64,${Buffer.from(r.image.data).toString('base64')})`;
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
    else if (b.type === 'li') {
      const pad = '    '.repeat(Math.max(1, b.level || 1) - 1);
      out.push(`${pad}${b.list === 'ol' ? `${b.index || ++n}.` : '-'} ${runs(b.runs)}`);
    } else if (b.type === 'table') {
      const rows = b.rows.filter((r) => r.length).map((r) => r.map((c) => runs(c.runs).replace(/\|/g, '\\|').replace(/\s*\\?\n\s*/g, ' ').trim()));
      if (rows.length) {
        const cols = Math.max(...rows.map((r) => r.length));
        const line = (r) => `| ${Array.from({ length: cols }, (_, i) => r[i] || '').join(' | ')} |`;
        out.push([line(rows[0]), `|${' --- |'.repeat(cols)}`, ...rows.slice(1).map(line)].join('\n'));
      }
    }
    else if (b.type !== 'pagebreak') {
      const t = runs(b.runs);
      if (t.trim()) out.push(t);
    }
  }
  // consecutive list items belong together
  return out.join('\n\n').replace(/^( *(?:- |\d+\. ).*)\n\n(?= *(?:- |\d+\. ))/gm, '$1\n');
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
