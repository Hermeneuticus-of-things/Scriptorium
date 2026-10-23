'use strict';
// Export a Scribner project to a Scrivener 3 package (<Name>.scriv).
//
// Layout written:
//   <Name>.scriv/<Name>.scrivx               binder + labels, statuses, keywords, project properties
//   <Name>.scriv/Files/version.txt           "23" (Scrivener 3 format)
//   <Name>.scriv/Files/Data/<UUID>/content.rtf | notes.rtf | synopsis.txt | content.<ext>
//   <Name>.scriv/Files/ProjectNotes/<UUID>.rtf
// Own implementation; text goes through exporters.htmlToRtf.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { htmlToRtf, safeName } = require('./exporters.cjs');

const ROOT_TYPES = { draft: 'DraftFolder', research: 'ResearchFolder', trash: 'TrashFolder' };
const UUID_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;

function xmlEscape(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return '';
  return m.slice(1).map((h) => (parseInt(h, 16) / 255).toFixed(6)).join(' ');
}

function scrivDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  const t = Number.isNaN(d.getTime()) ? new Date() : d;
  return t.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' +0000');
}

function uuidFor(node, used) {
  let u = String((node.scrivener && node.scrivener.uuid) || '').toUpperCase();
  if (!UUID_RE.test(u) || used.has(u)) u = crypto.randomUUID().toUpperCase();
  used.add(u);
  return u;
}

/**
 * @param {object} project       Scribner project.json content
 * @param {object} io            { readDoc(id,kind)->html|'' , readMedia(file)->Buffer|null }
 * @param {string} destParent    folder where <Name>.scriv is created
 * @returns {{dir:string, items:number, media:number}}
 */
function exportScriv(project, io, destParent, { name } = {}) {
  const title = safeName(name || project.title || 'Proiect');
  const scrivDir = path.join(destParent, `${title}.scriv`);
  if (fs.existsSync(scrivDir)) throw new Error(`Există deja ${scrivDir}`);
  const dataDir = path.join(scrivDir, 'Files', 'Data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(scrivDir, 'Settings'), { recursive: true });
  fs.writeFileSync(path.join(scrivDir, 'Files', 'version.txt'), '23');

  const read = (id, kind) => {
    try {
      return io.readDoc(id, kind) || '';
    } catch {
      return '';
    }
  };

  const labels = project.labels || [];
  const labelId = Object.fromEntries(labels.map((l, i) => [l.name, i - 1])); // first label ("none") = -1
  const statuses = project.statuses || [];
  const statusId = Object.fromEntries(statuses.map((s, i) => [s, i - 1]));

  // Keywords: definitions plus any used only on items.
  const kwDefs = [...(project.keywordDefs || [])];
  const known = new Set(kwDefs.map((k) => k.name));
  const walkAll = (nodes, fn) => (nodes || []).forEach((n) => (fn(n), walkAll(n.children, fn)));
  walkAll(project.tree, (n) => (n.keywords || []).forEach((k) => !known.has(k) && (known.add(k), kwDefs.push({ name: k }))));
  const kwId = Object.fromEntries(kwDefs.map((k, i) => [k.name, i]));

  const used = new Set();
  let items = 0;
  let media = 0;

  const writeItem = (node, depth) => {
    const pad = '  '.repeat(depth);
    const rootType = node.root && ROOT_TYPES[node.root];
    const type = rootType || (node.type === 'folder' ? 'Folder' : node.type === 'file' ? 'Other' : 'Text');
    const uuid = uuidFor(node, used);
    items++;
    const meta = [];
    const ext = node.type === 'file' && node.media ? (path.extname(node.media.file || '').slice(1) || 'bin').toLowerCase() : '';
    if (!rootType) {
      if (node.label && labelId[node.label] !== undefined && labelId[node.label] >= 0) meta.push(`<LabelID>${labelId[node.label]}</LabelID>`);
      if (node.status && statusId[node.status] !== undefined && statusId[node.status] >= 0) meta.push(`<StatusID>${statusId[node.status]}</StatusID>`);
      meta.push(`<IncludeInCompile>${node.includeInCompile === false ? 'No' : 'Yes'}</IncludeInCompile>`);
      if (ext) meta.push(`<FileExtension>${xmlEscape(ext)}</FileExtension>`);
    }
    const out = [`${pad}<BinderItem UUID="${uuid}" Type="${type}" Created="${scrivDate(node.created)}" Modified="${scrivDate(node.modified)}">`];
    out.push(`${pad}  <Title>${xmlEscape(node.title)}</Title>`);
    if (meta.length) out.push(`${pad}  <MetaData>${meta.join('')}</MetaData>`);
    if (node.target) out.push(`${pad}  <TextSettings><Target Type="${xmlEscape(node.targetType || 'Words')}">${Number(node.target) || 0}</Target></TextSettings>`);
    const kws = (node.keywords || []).filter((k) => kwId[k] !== undefined);
    if (kws.length) out.push(`${pad}  <Keywords>${kws.map((k) => `<KeywordID>${kwId[k]}</KeywordID>`).join('')}</Keywords>`);

    if (!rootType) {
      const dir = path.join(dataDir, uuid);
      fs.mkdirSync(dir, { recursive: true });
      const html = read(node.id, 'docs');
      if (node.type === 'text' || html) fs.writeFileSync(path.join(dir, 'content.rtf'), htmlToRtf(html || '<p></p>', node.title));
      const notes = read(node.id, 'notes');
      if (notes && notes.replace(/<[^>]*>/g, '').trim()) fs.writeFileSync(path.join(dir, 'notes.rtf'), htmlToRtf(notes, node.title));
      if (node.synopsis) fs.writeFileSync(path.join(dir, 'synopsis.txt'), node.synopsis);
      if (ext && io.readMedia) {
        let data = null;
        try {
          data = io.readMedia(node.media.file);
        } catch {
          data = null;
        }
        if (data) {
          fs.writeFileSync(path.join(dir, `content.${ext.replace(/[^a-z0-9]/g, '') || 'bin'}`), data);
          media++;
        }
      }
    }
    const kids = node.children || [];
    if (kids.length) {
      out.push(`${pad}  <Children>`);
      for (const c of kids) out.push(writeItem(c, depth + 2));
      out.push(`${pad}  </Children>`);
    }
    out.push(`${pad}</BinderItem>`);
    return out.join('\n');
  };

  const roots = ['draft', 'research', 'trash'].map((r) => (project.tree || []).find((n) => n.root === r) || { id: r, root: r, title: r, type: 'folder', children: [] });
  const extra = (project.tree || []).filter((n) => !n.root);
  const binder = [...roots, ...extra].map((n) => writeItem(n, 2)).join('\n');

  // Project notes → Files/ProjectNotes/<UUID>.rtf
  let notesXml = '';
  const pn = read('project-notes', 'notes');
  if (pn && pn.replace(/<[^>]*>/g, '').trim()) {
    const u = crypto.randomUUID().toUpperCase();
    fs.mkdirSync(path.join(scrivDir, 'Files', 'ProjectNotes'), { recursive: true });
    fs.writeFileSync(path.join(scrivDir, 'Files', 'ProjectNotes', `${u}.rtf`), htmlToRtf(pn, 'Note de proiect'));
    notesXml = `  <ProjectNotes><ProjectNote UUID="${u}"><Title>Note de proiect</Title></ProjectNote></ProjectNotes>\n`;
  }

  const labelXml = labels
    .slice(1)
    .map((l, i) => `      <Label ID="${i}"${hexToRgb(l.color) ? ` Color="${hexToRgb(l.color)}"` : ''}>${xmlEscape(l.name)}</Label>`)
    .join('\n');
  const statusXml = statuses.slice(1).map((s, i) => `      <Status ID="${i}">${xmlEscape(s)}</Status>`).join('\n');
  const kwXml = kwDefs
    .map((k) => `    <Keyword ID="${kwId[k.name]}"${hexToRgb(k.color) ? ` Color="${hexToRgb(k.color)}"` : ''}><Title>${xmlEscape(k.name)}</Title></Keyword>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject Template="No" Version="2.0" Identifier="${crypto.randomUUID().toUpperCase()}" Creator="Scribner" Device="Scribner" Author="${xmlEscape(project.author || '')}" Modified="${scrivDate()}">
  <Binder>
${binder}
  </Binder>
  <LabelSettings>
    <Title>${xmlEscape(project.labelTitle || 'Label')}</Title>
    <DefaultLabelID>-1</DefaultLabelID>
    <Labels>
      <Label ID="-1">${xmlEscape((labels[0] && labels[0].name) || 'No Label')}</Label>
${labelXml}
    </Labels>
  </LabelSettings>
  <StatusSettings>
    <Title>${xmlEscape(project.statusTitle || 'Status')}</Title>
    <DefaultStatusID>-1</DefaultStatusID>
    <StatusItems>
      <Status ID="-1">${xmlEscape(statuses[0] || 'No Status')}</Status>
${statusXml}
    </StatusItems>
  </StatusSettings>
  <Keywords>
${kwXml}
  </Keywords>
  <ProjectProperties>
    <ProjectTitle>${xmlEscape(project.title || title)}</ProjectTitle>
    <AbbreviatedTitle>${xmlEscape(project.titleAbbreviation || '')}</AbbreviatedTitle>
    <FullName>${xmlEscape(project.author || '')}</FullName>
    <FirstName>${xmlEscape(project.authorFirst || '')}</FirstName>
    <LastName>${xmlEscape(project.authorLast || '')}</LastName>
  </ProjectProperties>
${notesXml}</ScrivenerProject>
`;
  fs.writeFileSync(path.join(scrivDir, `${title}.scrivx`), xml);
  return { dir: scrivDir, items, media };
}

module.exports = { exportScriv, xmlEscape, hexToRgb, scrivDate };
