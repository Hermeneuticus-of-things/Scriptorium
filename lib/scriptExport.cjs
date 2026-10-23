'use strict';
// Script export: HTML paragraphs with data-script (or importer data-style) → FDX / Fountain.

const FDX_TYPES = {
  'scene-heading': 'Scene Heading', action: 'Action', character: 'Character', parenthetical: 'Parenthetical',
  dialogue: 'Dialogue', transition: 'Transition', shot: 'Shot', general: 'General',
  // non-screenplay elements map onto the nearest FDX type
  act: 'Scene Heading', 'stage-direction': 'Action', page: 'Scene Heading', panel: 'Action', description: 'Action',
  caption: 'Action', sfx: 'Action', direction: 'Action', sound: 'Action', music: 'Action',
  section: 'General', synopsis: 'General',
};

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Parse HTML into [{ element, runs: [{ text, bold, italic, underline }] }]. */
function parseScriptHtml(html) {
  const out = [];
  const re = /<(p|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const attrs = m[2] || '';
    const a = /data-script="([^"]+)"/.exec(attrs) || /data-style="([^"]+)"/.exec(attrs);
    const element = a ? a[1] : 'action';
    const runs = [];
    const st = { b: 0, i: 0, u: 0 };
    for (const tok of m[3].replace(/<br\s*\/?>/gi, '\n').split(/(<[^>]+>)/)) {
      if (!tok) continue;
      const t = /^<(\/?)(strong|b|em|i|u)\b/i.exec(tok);
      if (t) {
        const k = { strong: 'b', b: 'b', em: 'i', i: 'i', u: 'u' }[t[2].toLowerCase()];
        st[k] += t[1] ? -1 : 1;
      } else if (!tok.startsWith('<')) {
        runs.push({ text: decode(tok), bold: st.b > 0, italic: st.i > 0, underline: st.u > 0 });
      }
    }
    out.push({ element, runs });
  }
  return out;
}

const plain = (p) => p.runs.map((r) => r.text).join('');

function htmlToFdx(html, { title = '' } = {}) {
  const paras = parseScriptHtml(html).map((p) => {
    const type = FDX_TYPES[p.element] || 'Action';
    const texts = (p.runs.length ? p.runs : [{ text: '' }])
      .map((r) => {
        const style = [r.bold && 'Bold', r.italic && 'Italic', r.underline && 'Underline'].filter(Boolean).join('+');
        return `<Text${style ? ` Style="${style}"` : ''}>${xmlEsc(r.text)}</Text>`;
      })
      .join('');
    return `    <Paragraph Type="${type}">${texts}</Paragraph>`;
  });
  const titleXml = title ? `  <TitlePage><Content><Paragraph Type="Title"><Text>${xmlEsc(title)}</Text></Paragraph></Content></TitlePage>\n` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<FinalDraft DocumentType="Script" Template="No" Version="5">\n  <Content>\n${paras.join('\n')}\n  </Content>\n${titleXml}</FinalDraft>\n`;
}

function fountainRuns(p) {
  return p.runs
    .map((r) => {
      let t = r.text;
      if (!t.trim()) return t;
      if (r.bold && r.italic) t = `***${t}***`;
      else if (r.bold) t = `**${t}**`;
      else if (r.italic) t = `*${t}*`;
      if (r.underline) t = `_${t}_`;
      return t;
    })
    .join('');
}

function htmlToFountain(html, { title = '' } = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${title}`, '');
  const blank = () => lines.length && lines[lines.length - 1] !== '' && lines.push('');
  for (const p of parseScriptHtml(html)) {
    const raw = fountainRuns(p).trim();
    const text = plain(p).trim();
    switch (p.element) {
      case 'scene-heading':
      case 'act':
      case 'page':
        blank();
        lines.push(/^(INT|EXT|EST|INT\.?\/EXT|I\/E)[. ]/i.test(text) ? raw.toUpperCase() : `.${raw.toUpperCase()}`);
        lines.push('');
        break;
      case 'character':
        blank();
        lines.push(text === text.toUpperCase() && /[A-Z]/.test(text) ? raw : `@${raw}`);
        break;
      case 'parenthetical':
        lines.push(/^\(.*\)$/.test(text) ? raw : `(${raw})`);
        break;
      case 'dialogue':
        lines.push(raw);
        break;
      case 'transition':
        blank();
        lines.push(/ TO:$/.test(text.toUpperCase()) ? raw.toUpperCase() : `> ${raw.toUpperCase()}`);
        lines.push('');
        break;
      case 'section':
        blank();
        lines.push(`# ${raw}`, '');
        break;
      case 'synopsis':
        lines.push(`= ${raw}`, '');
        break;
      default: {
        blank();
        // Force action when a line would otherwise be read as character/scene heading.
        const looksSpecial = /^(INT|EXT|EST|I\/E)[. ]/i.test(text) || (/[A-Z]/.test(text) && text === text.toUpperCase());
        lines.push(looksSpecial ? `!${raw}` : raw);
        lines.push('');
      }
    }
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n') + '\n';
}

module.exports = { parseScriptHtml, htmlToFdx, htmlToFountain, FDX_TYPES };
