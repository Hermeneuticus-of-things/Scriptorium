'use strict';
// Export a Scribner project to a Scrivener 3 package (<Name>.scriv).
//
// Layout written:
//   <Name>.scriv/<Name>.scrivx               binder + labels, statuses, keywords, project properties
//   <Name>.scriv/Files/version.txt           "23" (Scrivener 3 format)
//   <Name>.scriv/Files/Data/<UUID>/content.rtf | notes.rtf | synopsis.txt | content.<ext>
//   <Name>.scriv/Files/Data/<UUID>/content.comments           comments + linked footnotes
//   <Name>.scriv/Files/Data/<UUID>/snapshots/<date>.rtf + index.xml
//   <Name>.scriv/Files/ProjectNotes/<UUID>.rtf               one per project-notes tab
//   <Name>.scriv/Files/styles.xml | writing.history
// .scrivx also carries CustomMetaDataSettings, SectionTypes, ProjectTargets, Collections,
// ProjectBookmarks and per-item MetaData (custom values, section type, icon, lock), Keywords, Bookmarks.
// Own implementation; text goes through scrivRtf.htmlToScrivRtf (the inverse of rtf.cjs).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeName } = require('./exporters.cjs');
const { htmlToScrivRtf, commentsXml } = require('./scrivRtf.cjs');

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

const XML_ID = /^[A-Za-z0-9_.-]+$/;
const hasText = (html) => Boolean(html && (html.replace(/<[^>]*>/g, '').trim() || /<img|data-(footnote|annotation|comment)/.test(html)));

// Scribner history day -> Scrivener counts (net words written that day).
function historyDay(d) {
  const measured = (a, b) => (d[a] !== undefined && d[b] !== undefined ? d[b] - d[a] : 0);
  const draft = (d.draftWritten || 0) + measured('draftStart', 'draftEnd');
  const total = (d.totalWritten || 0) + measured('totalStart', 'totalEnd');
  const draftChars = (d.draftChars || 0) + measured('draftCharsStart', 'draftCharsEnd');
  const otherChars = (d.otherChars || 0) + measured('totalCharsStart', 'totalCharsEnd') - measured('draftCharsStart', 'draftCharsEnd');
  return { dwc: draft, owc: total - draft, dcc: draftChars, occ: otherChars, s: d.sessionTarget || 0 };
}

// Ordered UUIDs: the importer lists Files/ProjectNotes/ by file name, so the tab order is encoded in the first group.
function orderedUuid(i) {
  return `${i.toString(16).padStart(8, '0').toUpperCase()}${crypto.randomUUID().toUpperCase().slice(8)}`;
}

/**
 * @param {object} project       Scribner project.json content
 * @param {object} io            { readDoc(id,kind)->html|'' , readMedia(file)->Buffer|{data}|null,
 *                                 listSnapshots?(id)->[{name,date,html}], readHistory?()->{days} }
 * @param {string} destParent    folder where <Name>.scriv is created
 * @returns {{dir:string, items:number, media:number, snapshots:number, comments:number, warnings:string[]}}
 */
function exportScriv(project, io, destParent, { name } = {}) {
  const title = safeName(name || project.title || 'Proiect');
  const scrivDir = path.join(destParent, `${title}.scriv`);
  if (fs.existsSync(scrivDir)) throw new Error(`Există deja ${scrivDir}`);
  const filesDir = path.join(scrivDir, 'Files');
  const dataDir = path.join(filesDir, 'Data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(scrivDir, 'Settings'), { recursive: true });
  fs.writeFileSync(path.join(filesDir, 'version.txt'), '23');
  const warnings = [];

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

  // Keywords: definitions (with hierarchy) plus any used only on items.
  const kwDefs = [...(project.keywordDefs || [])];
  const known = new Set(kwDefs.map((k) => k.name));
  const walkAll = (nodes, fn) => (nodes || []).forEach((n) => (fn(n), walkAll(n.children, fn)));
  walkAll(project.tree, (n) => (n.keywords || []).forEach((k) => !known.has(k) && (known.add(k), kwDefs.push({ name: k }))));
  const kwId = Object.fromEntries(kwDefs.map((k, i) => [k.name, i]));

  // Custom metadata fields: XML ids must be plain tokens; list options get ids if missing.
  const fields = (project.customFields || project.customMetadata || []).map((f, i) => {
    const type = String(f.type || 'text').toLowerCase();
    const options = (f.options || []).map((o, k) => {
      const t = typeof o === 'string' ? o : o.title;
      const oid = typeof o === 'object' && o.id && XML_ID.test(o.id) ? o.id : `o${k + 1}`;
      return { id: oid, title: t };
    });
    return { ...f, xmlId: f.id && XML_ID.test(f.id) ? f.id : `field${i + 1}`, type, options };
  });
  const fieldByTitle = Object.fromEntries(fields.map((f) => [f.title, f]));

  // Section types: Scrivener uses UUIDs.
  const sectionTypes = (project.sectionTypes || []).map((t) => ({ ...t, uuid: UUID_RE.test(String(t.id).toUpperCase()) ? String(t.id).toUpperCase() : crypto.randomUUID().toUpperCase() }));
  const sectionUuid = (v) => (sectionTypes.find((t) => t.id === v || t.title === v) || {}).uuid;

  // Pass 1: UUID for every item first, so links / bookmarks / collections can point forward.
  const used = new Set();
  const uuidOf = {};
  walkAll(project.tree, (n) => {
    if (!n.root) uuidOf[n.id] = uuidFor(n, used);
  });
  const rootUuid = {};
  for (const r of ['draft', 'research', 'trash']) rootUuid[r] = crypto.randomUUID().toUpperCase();
  const linkUuid = (id) => uuidOf[id] || rootUuid[id] || null;
  const rtfCtx = { linkUuid, styles: project.styles || [] };

  let items = 0;
  let media = 0;
  let snapshots = 0;
  let commentCount = 0;

  const toRtf = (html, opts = {}) => {
    const r = htmlToScrivRtf(html || '<p></p>', { ...rtfCtx, ...opts });
    warnings.push(...r.warnings);
    return r;
  };
  const writeAttachments = (dir, list) => list.forEach((a) => fs.writeFileSync(path.join(dir, a.name), a.data));

  const bookmarksXml = (list, tag) => {
    const parts = (list || [])
      .map((b) => {
        if (b.url) return `<Bookmark Type="External" URL="${xmlEscape(b.url)}"${b.title ? ` Title="${xmlEscape(b.title)}"` : ''}/>`;
        const u = b.id && linkUuid(b.id);
        if (!u) {
          if (b.id) warnings.push(`semn de carte către un document inexistent (${b.id}) omis`);
          return '';
        }
        return `<Bookmark Type="Internal" UUID="${u}"${b.title ? ` Title="${xmlEscape(b.title)}"` : ''}/>`;
      })
      .filter(Boolean);
    return parts.length ? `<${tag}>${parts.join('')}</${tag}>` : '';
  };

  const readMedia = (file) => {
    if (!io.readMedia) return null;
    try {
      const r = io.readMedia(file);
      if (!r) return null;
      return Buffer.isBuffer(r) || r instanceof Uint8Array ? r : r.data || null; // store.readMedia returns {data, mime}
    } catch {
      return null;
    }
  };

  const writeItem = (node, depth) => {
    const pad = '  '.repeat(depth);
    const rootType = node.root && ROOT_TYPES[node.root];
    const type = rootType || (node.type === 'folder' ? 'Folder' : node.type === 'file' ? 'Other' : 'Text');
    const uuid = rootType ? rootUuid[node.root] : uuidOf[node.id];
    items++;
    const meta = [];
    const ext = node.type === 'file' && node.media ? (path.extname(node.media.file || '').slice(1) || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin' : '';
    if (!rootType) {
      if (node.label && labelId[node.label] !== undefined && labelId[node.label] >= 0) meta.push(`<LabelID>${labelId[node.label]}</LabelID>`);
      if (node.status && statusId[node.status] !== undefined && statusId[node.status] >= 0) meta.push(`<StatusID>${statusId[node.status]}</StatusID>`);
      meta.push(`<IncludeInCompile>${node.includeInCompile === false ? 'No' : 'Yes'}</IncludeInCompile>`);
      if (node.icon) meta.push(`<IconFileName>${xmlEscape(node.icon)}</IconFileName>`);
      const st = node.sectionType && sectionUuid(node.sectionType);
      if (st) meta.push(`<SectionType>${st}</SectionType>`);
      if (node.locked) meta.push('<Locked>Yes</Locked>');
      if (node.favorite) meta.push('<Favorite>Yes</Favorite>');
      if (node.showSynopsisImage) meta.push('<ShowSynopsisImage>Yes</ShowSynopsisImage>');
      if (ext) meta.push(`<FileExtension>${xmlEscape(ext)}</FileExtension>`);
      const custom = Object.entries(node.custom || {})
        .map(([k, v]) => {
          const f = fieldByTitle[k];
          if (!f) {
            warnings.push(`„${node.title}”: valoare pentru câmpul nedefinit „${k}” omisă`);
            return '';
          }
          let val = v;
          if (f.type === 'checkbox') val = v === true || v === 'Yes' || v === 'true' ? 'Yes' : 'No';
          else if (f.type === 'list') val = (f.options.find((o) => o.title === v) || {}).id || '';
          if (val === '' || val === null || val === undefined) return '';
          return `<MetaDataItem><FieldID>${xmlEscape(f.xmlId)}</FieldID><Value>${xmlEscape(val)}</Value></MetaDataItem>`;
        })
        .filter(Boolean);
      if (custom.length) meta.push(`<CustomMetaData>${custom.join('')}</CustomMetaData>`);
    }
    const out = [`${pad}<BinderItem UUID="${uuid}" Type="${type}" Created="${scrivDate(node.created)}" Modified="${scrivDate(node.modified)}">`];
    out.push(`${pad}  <Title>${xmlEscape(node.title)}</Title>`);
    if (meta.length) out.push(`${pad}  <MetaData>${meta.join('')}</MetaData>`);
    if (node.target) out.push(`${pad}  <TextSettings><Target Type="${xmlEscape(node.targetType || 'Words')}">${Number(node.target) || 0}</Target></TextSettings>`);
    const kws = (node.keywords || []).filter((k) => kwId[k] !== undefined);
    if (kws.length) out.push(`${pad}  <Keywords>${kws.map((k) => `<KeywordID>${kwId[k]}</KeywordID>`).join('')}</Keywords>`);
    const bm = bookmarksXml(node.bookmarks, 'Bookmarks');
    if (bm) out.push(`${pad}  ${bm}`);

    if (!rootType) {
      const dir = path.join(dataDir, uuid);
      fs.mkdirSync(dir, { recursive: true });
      const html = read(node.id, 'docs');
      if (node.type === 'text' || node.type === 'folder' || html) {
        if (node.type === 'text' || hasText(html)) {
          const r = toRtf(html);
          fs.writeFileSync(path.join(dir, 'content.rtf'), r.rtf);
          writeAttachments(dir, r.attachments);
          if (r.comments.length) {
            fs.writeFileSync(path.join(dir, 'content.comments'), commentsXml(r.comments));
            commentCount += r.comments.length;
          }
        }
      }
      const notes = read(node.id, 'notes');
      if (hasText(notes)) {
        const r = toRtf(notes, { comments: false });
        fs.writeFileSync(path.join(dir, 'notes.rtf'), r.rtf);
        writeAttachments(dir, r.attachments);
      }
      if (node.synopsis) fs.writeFileSync(path.join(dir, 'synopsis.txt'), node.synopsis);
      if (ext) {
        const data = readMedia(node.media.file);
        if (data) {
          fs.writeFileSync(path.join(dir, `content.${ext}`), data);
          media++;
        } else warnings.push(`„${node.title}”: fișierul media lipsește`);
      }
      // Snapshots: Files/Data/<UUID>/snapshots/<date>.rtf + index.xml (title, date)
      let snaps = [];
      try {
        snaps = io.listSnapshots ? io.listSnapshots(node.id) || [] : [];
      } catch {
        snaps = [];
      }
      if (snaps.length) {
        const sdir = path.join(dir, 'snapshots');
        fs.mkdirSync(sdir, { recursive: true });
        const taken = new Set();
        const index = [];
        for (const s of snaps) {
          const date = scrivDate(s.date);
          let file = `${date.slice(0, 19).replace(/[: ]/g, '-')}.rtf`;
          for (let n = 2; taken.has(file); n++) file = `${date.slice(0, 19).replace(/[: ]/g, '-')}-${n}.rtf`;
          taken.add(file);
          // Snapshots have no content.comments of their own: comment anchors keep their text only.
          const r = toRtf(s.html, { comments: false });
          fs.writeFileSync(path.join(sdir, file), r.rtf);
          writeAttachments(sdir, r.attachments);
          index.push(`  <Snapshot Date="${date}"><Title>${xmlEscape(s.name || 'Snapshot')}</Title><File>${file}</File></Snapshot>`);
          snapshots++;
        }
        fs.writeFileSync(path.join(sdir, 'index.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<SnapshotIndexes Version="1.0">\n${index.join('\n')}\n</SnapshotIndexes>\n`);
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

  // Project notes: one RTF per tab (legacy single tab id 'project-notes').
  const tabs = Array.isArray(project.projectNotes) && project.projectNotes.some((t) => t && t.id) ? project.projectNotes.filter((t) => t && t.id) : [{ id: 'project-notes', title: 'Note de proiect' }];
  const noteEntries = [];
  tabs.forEach((t) => {
    const html = read(t.id, 'notes');
    if (!hasText(html)) return;
    const u = orderedUuid(noteEntries.length + 1);
    fs.mkdirSync(path.join(filesDir, 'ProjectNotes'), { recursive: true });
    fs.writeFileSync(path.join(filesDir, 'ProjectNotes', `${u}.rtf`), toRtf(html, { comments: false }).rtf);
    noteEntries.push(`<ProjectNote UUID="${u}"><Title>${xmlEscape(t.title || 'Note de proiect')}</Title></ProjectNote>`);
  });
  const notesXml = noteEntries.length ? `  <ProjectNotes>${noteEntries.join('')}</ProjectNotes>\n` : '';

  // Writing history: Files/writing.history
  let history = null;
  try {
    history = io.readHistory ? io.readHistory() : null;
  } catch {
    history = null;
  }
  const days = Object.keys((history && history.days) || {}).sort();
  if (days.length) {
    const rows = days.map((d) => {
      const h = historyDay(history.days[d]);
      return `  <Day dwc="${h.dwc}" owc="${h.owc}" dcc="${h.dcc}" occ="${h.occ}"${h.s ? ` s="${h.s}"` : ''}>${d}</Day>`;
    });
    fs.writeFileSync(path.join(filesDir, 'writing.history'), `<?xml version="1.0" encoding="UTF-8"?>\n<WritingHistory Version="1.0">\n${rows.join('\n')}\n</WritingHistory>\n`);
  }

  // Named styles: Files/styles.xml
  const styleDefs = [
    { name: 'Heading 1', type: 'Paragraph' }, { name: 'Heading 2', type: 'Paragraph' }, { name: 'Heading 3', type: 'Paragraph' },
    { name: 'Block Quote', type: 'Paragraph' }, { name: 'Code Block', type: 'Paragraph' },
    ...(project.styles || []).map((s) => ({ name: s.name || s.id, type: s.type === 'char' ? 'Character' : s.type === 'both' ? 'ParagraphAndCharacter' : 'Paragraph', s })),
  ];
  fs.writeFileSync(
    path.join(filesDir, 'styles.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<ScrivenerStyles Version="1.0">\n${styleDefs
      .map((d, i) => {
        const s = d.s || {};
        const attrs = `ID="${crypto.randomUUID().toUpperCase()}" Name="${xmlEscape(d.name)}" Type="${d.type}" Index="${i}"`;
        const props = [s.bold && '<Bold>Yes</Bold>', s.italic && '<Italic>Yes</Italic>', s.underline && '<Underline>Yes</Underline>', s.align && `<Alignment>${xmlEscape(s.align)}</Alignment>`, s.color && `<Color>${hexToRgb(s.color)}</Color>`]
          .filter(Boolean)
          .join('');
        return `  <Style ${attrs}>${props}</Style>`;
      })
      .join('\n')}\n</ScrivenerStyles>\n`,
  );

  const labelXml = labels
    .slice(1)
    .map((l, i) => `      <Label ID="${i}"${hexToRgb(l.color) ? ` Color="${hexToRgb(l.color)}"` : ''}>${xmlEscape(l.name)}</Label>`)
    .join('\n');
  const statusXml = statuses.slice(1).map((s, i) => `      <Status ID="${i}">${xmlEscape(s)}</Status>`).join('\n');
  const kwXml = (parent, depth) =>
    kwDefs
      .filter((k) => (k.parent || null) === parent || (parent === null && k.parent && !known.has(k.parent)))
      .map((k) => {
        const kids = depth < 20 ? kwXml(k.name, depth + 1) : '';
        return `<Keyword ID="${kwId[k.name]}"${hexToRgb(k.color) ? ` Color="${hexToRgb(k.color)}"` : ''}><Title>${xmlEscape(k.name)}</Title>${kids ? `<Children>${kids}</Children>` : ''}</Keyword>`;
      })
      .join('');

  const fieldsXml = fields.length
    ? `  <CustomMetaDataSettings>\n${fields
        .map((f) => {
          const t = { text: 'Text', checkbox: 'Checkbox', list: 'List', date: 'Date' }[f.type] || 'Text';
          const opts = f.type === 'list' ? `<ListOptions>${f.options.map((o) => `<Option ID="${xmlEscape(o.id)}">${xmlEscape(o.title)}</Option>`).join('')}</ListOptions>` : '';
          const def = f.default !== undefined && f.default !== '' ? `<Default>${xmlEscape(f.default)}</Default>` : '';
          return `    <MetaDataField Type="${t}" ID="${xmlEscape(f.xmlId)}" Wraps="${f.wraps ? 'Yes' : 'No'}"${f.align ? ` Align="${xmlEscape(f.align)}"` : ''}><Title>${xmlEscape(f.title)}</Title>${def}${opts}</MetaDataField>`;
        })
        .join('\n')}\n  </CustomMetaDataSettings>\n`
    : '';
  const sectionXml = sectionTypes.length
    ? `  <SectionTypes><SectionTypeDefinitions>${sectionTypes.map((t) => `<SectionType ID="${t.uuid}"><Title>${xmlEscape(t.title)}</Title></SectionType>`).join('')}</SectionTypeDefinitions></SectionTypes>\n`
    : '';

  const tg = project.targets || {};
  const targetsXml =
    tg.draft || tg.session || tg.deadline
      ? `  <ProjectTargets Notify="No">${tg.draft ? `<DraftTarget Type="${xmlEscape(tg.draftType || 'Words')}">${Number(tg.draft) || 0}</DraftTarget>` : ''}${tg.session ? `<SessionTarget Type="${xmlEscape(tg.sessionType || 'Words')}">${Number(tg.session) || 0}</SessionTarget>` : ''}${tg.deadline ? `<Deadline>${scrivDate(tg.deadline)}</Deadline>` : ''}</ProjectTargets>\n`
      : '';

  const colls = (project.collections || []).map((c) => {
    const ids = (c.ids || []).map(linkUuid).filter(Boolean);
    const type = c.type === 'search' ? 'Search' : 'Arbitrary';
    return `    <Collection ID="${crypto.randomUUID().toUpperCase()}" Type="${type}"${hexToRgb(c.color) ? ` Color="${hexToRgb(c.color)}"` : ''}><Title>${xmlEscape(c.title || 'Colecție')}</Title>${type === 'Arbitrary' ? `<BinderUUIDs>${ids.join(',')}</BinderUUIDs>` : ''}</Collection>`;
  });
  const collectionsXml = `  <Collections>\n    <Collection ID="${crypto.randomUUID().toUpperCase()}" Type="Binder"><Title>Binder</Title></Collection>\n${colls.join('\n')}${colls.length ? '\n' : ''}  </Collections>\n`;
  const pbm = bookmarksXml(project.bookmarks, 'ProjectBookmarks');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject Template="No" Version="2.0" Identifier="${crypto.randomUUID().toUpperCase()}" Creator="Scribner" Device="Scribner" Author="${xmlEscape(project.author || '')}" Modified="${scrivDate()}">
  <Binder>
${binder}
  </Binder>
${collectionsXml}  <LabelSettings>
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
${fieldsXml}${sectionXml}  <Keywords>${kwXml(null, 0)}</Keywords>
${targetsXml}${pbm ? `  ${pbm}\n` : ''}  <ProjectProperties>
    <ProjectTitle>${xmlEscape(project.title || title)}</ProjectTitle>
    <AbbreviatedTitle>${xmlEscape(project.titleAbbreviation || '')}</AbbreviatedTitle>
    <FullName>${xmlEscape(project.author || '')}</FullName>
    <FirstName>${xmlEscape(project.authorFirst || '')}</FirstName>
    <LastName>${xmlEscape(project.authorLast || '')}</LastName>
  </ProjectProperties>
${notesXml}</ScrivenerProject>
`;
  fs.writeFileSync(path.join(scrivDir, `${title}.scrivx`), xml);
  return { dir: scrivDir, items, media, snapshots, comments: commentCount, warnings: [...new Set(warnings)] };
}

module.exports = { exportScriv, xmlEscape, hexToRgb, scrivDate };
