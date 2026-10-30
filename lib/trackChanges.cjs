'use strict';
// Word "Track Changes" <-> Pneuma Sofer revision marks.
//
// Pneuma Sofer marks revised text as <span data-revision="N">…</span> (N = revision round 1..5).
// Deleted text kept for review is a revision span whose content is struck: <span data-revision="N"><s>…</s></span>.
//
// Import: w:ins -> revision span, w:del (w:delText) -> struck revision span (mammoth itself keeps
//         inserted text and drops deletions, so document.xml is rewritten with sentinel characters first).
// Export: revision spans become sentinels in the text, then the generated DOCX is rewritten so those runs
//         sit inside <w:ins>/<w:del w:author w:date>.
const JSZip = require('jszip');

const INS_START = '';
const INS_END = '';
const DEL_START = '';
const DEL_END = '';
const SENTINELS = /[-]/g;

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------- import
/** Rewrites document.xml so tracked changes survive a plain DOCX -> HTML conversion as sentinel characters. */
function docxXmlRevisionsToSentinels(xml) {
  const marker = (ch) => `<w:r><w:t xml:space="preserve">${ch}</w:t></w:r>`;
  return String(xml)
    .replace(/<w:ins\b[^>]*\/>/g, '')
    .replace(/<w:del\b[^>]*\/>/g, '')
    .replace(/<w:ins\b[^>]*>([\s\S]*?)<\/w:ins>/g, (_m, inner) => `${marker(INS_START)}${inner}${marker(INS_END)}`)
    .replace(/<w:del\b[^>]*>([\s\S]*?)<\/w:del>/g, (_m, inner) => {
      const visible = inner.replace(/<w:delText\b([^>]*)>/g, '<w:t$1>').replace(/<\/w:delText>/g, '</w:t>');
      return `${marker(DEL_START)}${visible}${marker(DEL_END)}`;
    });
}

/** True when a DOCX document.xml contains tracked insertions or deletions. */
function hasTrackedChanges(xml) {
  return /<w:(ins|del)\b[^/>]*>/.test(String(xml));
}

/** Turns sentinel ranges in HTML into revision spans (each text run wrapped separately, so tags never cross). */
function sentinelsToRevisionHtml(html, level = 1) {
  let mode = null; // 'ins' | 'del'
  const wrap = (text) => {
    if (!text) return '';
    if (mode === 'ins') return `<span data-revision="${level}">${text}</span>`;
    if (mode === 'del') return `<span data-revision="${level}"><s>${text}</s></span>`;
    return text;
  };
  return String(html)
    .split(/(<[^>]*>)/)
    .map((tok) => {
      if (tok.startsWith('<')) return tok;
      let out = '';
      let buf = '';
      for (const ch of tok) {
        if (ch === INS_START || ch === DEL_START || ch === INS_END || ch === DEL_END) {
          out += wrap(buf);
          buf = '';
          mode = ch === INS_START ? 'ins' : ch === DEL_START ? 'del' : null;
        } else buf += ch;
      }
      return out + wrap(buf);
    })
    .join('');
}

/** DOCX buffer -> HTML with tracked changes as revision marks (uses mammoth). */
async function docxToHtmlWithRevisions(buffer, { level = 1 } = {}) {
  const mammoth = require('mammoth');
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('Fișier DOCX invalid: lipsește word/document.xml.');
  const xml = await entry.async('string');
  if (!hasTrackedChanges(xml)) return (await mammoth.convertToHtml({ buffer })).value;
  zip.file('word/document.xml', docxXmlRevisionsToSentinels(xml));
  const patched = await zip.generateAsync({ type: 'nodebuffer' });
  const { value } = await mammoth.convertToHtml({ buffer: patched });
  return sentinelsToRevisionHtml(value, level);
}

// ---------------------------------------------------------------- export
/** Revision spans -> sentinel characters (call before compiling to DOCX with trackChanges). */
function revisionsToSentinels(html) {
  let out = String(html || '');
  let prev;
  do {
    prev = out;
    out = out.replace(/<span[^>]*data-revision="[^"]*"[^>]*>((?:(?!<span\b)[\s\S])*?)<\/span>/g, (_m, inner) => {
      const del = /^\s*<(s|del|strike)>([\s\S]*)<\/\1>\s*$/.exec(inner);
      return del ? `${DEL_START}${del[2]}${DEL_END}` : `${INS_START}${inner}${INS_END}`;
    });
  } while (out !== prev);
  return out;
}

const stripSentinels = (s) => String(s).replace(SENTINELS, '');

/**
 * Rewrites word/document.xml of a DOCX buffer: runs between sentinels go inside <w:ins>/<w:del>.
 * Only runs made of a single <w:t> are split; sentinels anywhere else are removed.
 */
async function applyDocxRevisions(buffer, { author = 'Pneuma Sofer', date = new Date() } = {}) {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file('word/document.xml');
  if (!entry) return buffer;
  const xml = await entry.async('string');
  if (!/[\uE000-\uE003]/.test(xml)) return buffer;
  zip.file('word/document.xml', revisionXml(xml, { author, date }));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function revisionXml(xml, { author = 'Pneuma Sofer', date = new Date() } = {}) {
  const when = (date instanceof Date ? date : new Date(date)).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const attrs = (id) => `w:id="${id}" w:author="${xmlEsc(author)}" w:date="${when}"`;
  let id = 9000;
  let mode = null;
  const emit = (rPr, text) => {
    if (!text) return '';
    if (mode === 'del') return `<w:del ${attrs(++id)}><w:r>${rPr}<w:delText xml:space="preserve">${text}</w:delText></w:r></w:del>`;
    const run = `<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r>`;
    return mode === 'ins' ? `<w:ins ${attrs(++id)}>${run}</w:ins>` : run;
  };
  return String(xml).replace(/<w:r>([\s\S]*?)<\/w:r>|<w:r\s[^>]*>([\s\S]*?)<\/w:r>|<\/w:p>/g, (whole, a, b) => {
    if (whole === '</w:p>') {
      mode = null;
      return whole;
    }
    const body = a !== undefined ? a : b;
    const single = /^(<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>$/.exec(body);
    if (!single) {
      // Runs without text (tabs, breaks, note references): keep, wrapped when inside a change.
      const clean = whole.replace(SENTINELS, '');
      if (mode === 'ins' && !/<w:footnoteReference|<w:commentReference/.test(clean)) return `<w:ins ${attrs(++id)}>${clean}</w:ins>`;
      return clean;
    }
    const rPr = single[1] || '';
    let out = '';
    let buf = '';
    for (const ch of single[2]) {
      if (ch === INS_START || ch === INS_END || ch === DEL_START || ch === DEL_END) {
        out += emit(rPr, buf);
        buf = '';
        mode = ch === INS_START ? 'ins' : ch === DEL_START ? 'del' : null;
      } else buf += ch;
    }
    return out + emit(rPr, buf);
  });
}

module.exports = {
  INS_START,
  INS_END,
  DEL_START,
  DEL_END,
  hasTrackedChanges,
  docxXmlRevisionsToSentinels,
  sentinelsToRevisionHtml,
  docxToHtmlWithRevisions,
  revisionsToSentinels,
  stripSentinels,
  applyDocxRevisions,
  revisionXml,
};
