import React, { useRef, useState } from 'react';
import { useEditorState } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import Menu from './Menu.jsx';
import { htmlToManuscript } from '../lib/editorial.js';

const TEXT_COLORS = ['#b3261e', '#c77700', '#2e7d32', '#1565c0', '#6a1b9a', '#5d4037', '#757575'];
const HIGHLIGHTS = ['#fff176', '#a5d6a7', '#90caf9', '#f8bbd0', '#ffcc80'];
const SPECIAL = ['„', '”', '«', '»', '—', '–', '…', '§', '¶', '†', '•', '°', '×', 'ā', 'ī', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ṅ', 'ñ', 'ṭ', 'ḍ', 'ṇ', 'ś', 'ṣ', 'ḥ', 'ṃ', 'Ā', 'Ī', 'Ū', 'Ś', 'Ṣ'];
const PLACEHOLDERS = [
  ['<$n>', 'Număr capitol'],
  ['<$t>', 'Titlul documentului'],
  ['<$projecttitle>', 'Titlul proiectului'],
  ['<$author>', 'Autor'],
  ['<$wc>', 'Număr de cuvinte'],
  ['<$date>', 'Data compilării'],
  ['<$p>', 'Număr pagină'],
];

// Inline annotation -> comment on the word just before it (Scrivener "Convert
// Inline Annotations to Comments"). Annotations at the start of a paragraph
// anchor on the following word.
function annotationsToComments(editor) {
  const { state } = editor;
  const type = state.schema.marks.comment;
  const found = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'annotation') found.push({ pos, text: node.attrs.text });
  });
  if (!found.length) return;
  const tr = state.tr;
  for (const a of found.reverse()) {
    const $pos = state.doc.resolve(a.pos);
    const parentStart = a.pos - $pos.parentOffset;
    const before = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '￼');
    const after = $pos.parent.textBetween($pos.parentOffset + 1, $pos.parent.content.size, undefined, '￼');
    const mb = /([\p{L}\p{N}’'-]+)[\s\p{P}]*$/u.exec(before);
    const ma = /^[\s\p{P}]*([\p{L}\p{N}’'-]+)/u.exec(after);
    tr.delete(a.pos, a.pos + 1);
    if (mb) {
      const end = parentStart + mb.index + mb[1].length;
      tr.addMark(end - mb[1].length, end, type.create({ comment: a.text }));
    } else if (ma) {
      // "after" starts right behind the deleted annotation, i.e. at a.pos once it is gone
      const start = a.pos + (ma[0].length - ma[1].length);
      tr.addMark(start, start + ma[1].length, type.create({ comment: a.text }));
    }
  }
  editor.view.dispatch(tr);
}

// Comment -> inline annotation placed right after the commented text.
function commentsToAnnotations(editor) {
  const { state } = editor;
  const markType = state.schema.marks.comment;
  const nodeType = state.schema.nodes.annotation;
  const ranges = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const m = node.marks.find((x) => x.type === markType);
    if (!m) return;
    const last = ranges[ranges.length - 1];
    if (last && last.to === pos && last.text === m.attrs.comment) last.to = pos + node.nodeSize;
    else ranges.push({ from: pos, to: pos + node.nodeSize, text: m.attrs.comment });
  });
  if (!ranges.length) return;
  const tr = state.tr;
  for (const r of ranges.reverse()) {
    tr.removeMark(r.from, r.to, markType);
    tr.insert(r.to, nodeType.create({ text: r.text }));
  }
  editor.view.dispatch(tr);
}

function Swatches({ colors, onPick, onClear, clearLabel }) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button key={c} className="swatch" style={{ background: c }} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(c)} aria-label={c} />
      ))}
      <button onMouseDown={(e) => e.preventDefault()} onClick={onClear}>{clearLabel}</button>
    </div>
  );
}

function Pop({ label, title, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  return (
    <div className="menu" ref={ref} onMouseLeave={() => setOpen(false)}>
      <button title={title} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && (
        <div className="menu-pop narrow" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function FormatBar({
  editor,
  linkTargets = [],
  styles = [],
  view = {},
  onViewChange = () => {},
  onAddComment,
  onAddFootnote,
  onAddAnnotation,
  onInsertImage,
  onManageStyles,
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      bold: ed.isActive('bold'),
      italic: ed.isActive('italic'),
      underline: ed.isActive('underline'),
      strike: ed.isActive('strike'),
      sup: ed.isActive('superscript'),
      sub: ed.isActive('subscript'),
      block: ed.isActive('heading', { level: 1 })
        ? 'h1'
        : ed.isActive('heading', { level: 2 })
          ? 'h2'
          : ed.isActive('heading', { level: 3 })
            ? 'h3'
            : ed.isActive('blockquote')
              ? 'quote'
              : ed.isActive('codeBlock')
                ? 'code'
                : 'p',
      align: ['center', 'right', 'justify'].find((a) => ed.isActive({ textAlign: a })) || 'left',
      bullet: ed.isActive('bulletList'),
      ordered: ed.isActive('orderedList'),
      inList: ed.isActive('listItem'),
      inTable: ed.isActive('table'),
      comment: ed.isActive('comment'),
      link: ed.isActive('link'),
      hasSelection: !ed.state.selection.empty,
    }),
  });
  const chain = () => editor.chain().focus();
  const btn = (label, on, action, title, disabled = false) => (
    <button className={on ? 'on' : ''} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={action} title={title}>
      {label}
    </button>
  );

  const setBlock = (v) => {
    const c = chain();
    if (v === 'p') c.setParagraph();
    else if (v === 'quote') c.setParagraph().toggleBlockquote();
    else if (v === 'code') c.toggleCodeBlock();
    else c.setHeading({ level: Number(v[1]) });
    c.run();
  };

  const transform = (fn) => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, '\n');
    chain().insertContentAt({ from, to }, fn(text)).setTextSelection({ from, to: from + fn(text).length }).run();
  };
  const titleCase = (t) => t.toLocaleLowerCase('ro').replace(/(^|\s)(\p{L})/gu, (m, sp, ch) => sp + ch.toLocaleUpperCase('ro'));

  const insertLinkExternal = () => {
    const prev = editor.getAttributes('link').href || 'https://';
    const href = window.prompt('Adresa linkului:', prev);
    if (href === null) return;
    if (!href) chain().extendMarkRange('link').unsetLink().run();
    else chain().extendMarkRange('link').setLink({ href }).run();
  };

  const insertLinkInternal = (target) => {
    const href = `scribner://doc/${target.id}`;
    if (editor.state.selection.empty) chain().insertContent(`<a href="${href}" class="internal-link">${target.title.replace(/</g, '&lt;')}</a> `).run();
    else chain().setLink({ href, class: 'internal-link' }).run();
  };

  const tableItems = [
    { label: 'Inserează tabel 3 × 3', action: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run() },
    '-',
    { label: 'Rând deasupra', action: () => chain().addRowBefore().run(), disabled: !s.inTable },
    { label: 'Rând dedesubt', action: () => chain().addRowAfter().run(), disabled: !s.inTable },
    { label: 'Coloană la stânga', action: () => chain().addColumnBefore().run(), disabled: !s.inTable },
    { label: 'Coloană la dreapta', action: () => chain().addColumnAfter().run(), disabled: !s.inTable },
    '-',
    { label: 'Primul rând ca antet', action: () => chain().toggleHeaderRow().run(), disabled: !s.inTable },
    { label: 'Unește celulele', action: () => chain().mergeCells().run(), disabled: !s.inTable },
    { label: 'Împarte celula', action: () => chain().splitCell().run(), disabled: !s.inTable },
    '-',
    { label: 'Șterge rândul', action: () => chain().deleteRow().run(), disabled: !s.inTable },
    { label: 'Șterge coloana', action: () => chain().deleteColumn().run(), disabled: !s.inTable },
    { label: 'Șterge tabelul', action: () => chain().deleteTable().run(), disabled: !s.inTable },
  ];

  const insertItems = [
    { label: 'Imagine…', action: onInsertImage },
    { label: 'Link extern…', shortcut: 'Ctrl+L', action: insertLinkExternal },
    { label: 'Linie orizontală / salt de pagină', action: () => chain().setHorizontalRule().run() },
    { label: 'Data de azi', action: () => chain().insertContent(new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })).run() },
    '-',
    { label: 'Comentariu pe selecție', action: onAddComment, disabled: !s.hasSelection },
    { label: 'Adnotare inline', action: onAddAnnotation },
    { label: 'Notă de subsol', action: onAddFootnote },
    '-',
    ...PLACEHOLDERS.map(([code, label]) => ({ label: `${code}  ${label}`, action: () => chain().insertContent(code.replace(/</g, '&lt;')).run() })),
  ];

  const transformItems = [
    { label: 'MAJUSCULE', action: () => transform((t) => t.toLocaleUpperCase('ro')), disabled: !s.hasSelection },
    { label: 'minuscule', action: () => transform((t) => t.toLocaleLowerCase('ro')), disabled: !s.hasSelection },
    { label: 'Fiecare Cuvânt Cu Majusculă', action: () => transform(titleCase), disabled: !s.hasSelection },
    { label: 'Prima literă a frazei mare', action: () => transform((t) => t.toLocaleLowerCase('ro').replace(/(^\s*|[.!?…]\s+)(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('ro'))), disabled: !s.hasSelection },
    '-',
    { label: 'Elimină spațiile duble', action: () => transform((t) => t.replace(/ {2,}/g, ' ')), disabled: !s.hasSelection },
    { label: 'Ghilimele drepte → „…”', action: () => transform((t) => t.replace(/(^|[\s(\[])"/g, '$1„').replace(/"/g, '”')), disabled: !s.hasSelection },
    { label: 'Cratime duble -- → —', action: () => transform((t) => t.replace(/--/g, '—')), disabled: !s.hasSelection },
    '-',
    { label: 'Adnotări inline → comentarii', action: () => annotationsToComments(editor) },
    { label: 'Comentarii → adnotări inline', action: () => commentsToAnnotations(editor) },
    '-',
    { label: 'Șterge formatarea caracterelor', action: () => chain().unsetAllMarks().run() },
    { label: 'Elimină highlight-ul', action: () => chain().unsetHighlight().run() },
    { label: 'Elimină culoarea textului', action: () => chain().unsetColor().run() },
  ];

  const setView = (patch) => {
    onViewChange({ ...view, ...patch });
    setTimeout(() => editor.commands.focus(), 0);
  };

  const styleItems = [
    ...styles.filter((st) => st.type === 'para').map((st) => ({ label: `¶ ${st.name}`, action: () => chain().setParagraphStyle(st.id).run() })),
    ...styles.filter((st) => st.type === 'char').map((st) => ({ label: `a ${st.name}`, action: () => chain().setCharStyle(st.id).run(), disabled: !s.hasSelection })),
    '-',
    { label: 'Fără stil de paragraf', action: () => chain().setParagraphStyle(null).run() },
    { label: 'Fără stil de caractere', action: () => chain().setCharStyle(null).run() },
    '-',
    { label: 'Gestionează stilurile…', action: () => onManageStyles?.() },
  ];

  const revisionItems = [
    { label: view.revision ? `Oprește revizia (acum: ${view.revision})` : 'Revizia e oprită', action: () => setView({ revision: 0 }), disabled: !view.revision },
    ...[1, 2, 3, 4, 5].map((n) => ({ label: `Runda ${n} de revizie (culoarea ${n})`, action: () => setView({ revision: n }) })),
    '-',
    { label: 'Acceptă reviziile (elimină toate culorile)', action: () => chain().removeRevisions().run() },
    ...(view.revision ? [{ label: `Elimină doar runda ${view.revision}`, action: () => chain().removeRevisions(view.revision).run() }] : []),
  ];

  const viewItems = [
    { label: `${view.focus === 'dialogue' ? '✓ ' : ''}Focus pe dialog`, action: () => setView({ focus: view.focus === 'dialogue' ? 'off' : 'dialogue' }) },
    { label: `${view.focus === 'paragraph' ? '✓ ' : ''}Focus pe paragraful curent`, action: () => setView({ focus: view.focus === 'paragraph' ? 'off' : 'paragraph' }) },
    { label: `${view.focus === 'sentence' ? '✓ ' : ''}Focus pe fraza curentă`, action: () => setView({ focus: view.focus === 'sentence' ? 'off' : 'sentence' }) },
    { label: `${view.currentParagraph ? '✓ ' : ''}Evidențiază paragraful curent`, action: () => setView({ currentParagraph: !view.currentParagraph }) },
    '-',
    { label: `${view.pageView ? '✓ ' : ''}Page View (pagină A5)`, action: () => setView({ pageView: !view.pageView }) },
    { label: `${view.invisibles ? '✓ ' : ''}Arată semnele de paragraf`, action: () => setView({ invisibles: !view.invisibles }) },
    '-',
    ...[75, 100, 125, 150, 200].map((z) => ({ label: `${(view.zoom || 100) === z ? '✓ ' : ''}Zoom ${z}%`, action: () => setView({ zoom: z }) })),
  ];

  const copySpecial = async (kind) => {
    const { from, to, empty } = editor.state.selection;
    const slice = empty ? editor.state.doc.content : editor.state.doc.slice(from, to).content;
    const html = getHTMLFromFragment(slice, editor.schema);
    let text = html;
    if (kind === 'text') text = empty ? editor.getText({ blockSeparator: '\n\n' }) : editor.state.doc.textBetween(from, to, '\n\n');
    if (kind === 'markdown') text = htmlToManuscript(html);
    if (kind === 'clean') {
      text = html
        .replace(/<span[^>]*data-(?:footnote|annotation)="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/<span[^>]*data-comment="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');
    }
    await navigator.clipboard.writeText(text);
  };
  const copyItems = [
    { label: 'Ca text simplu', action: () => copySpecial('text') },
    { label: 'Ca Markdown (***ALOGEN***, *ilustrații*, [^note])', action: () => copySpecial('markdown') },
    { label: 'Ca HTML', action: () => copySpecial('html') },
    { label: 'Ca HTML fără comentarii, adnotări și note', action: () => copySpecial('clean') },
  ];

  return (
    <div className="format-bar">
      <select className="block-select" value={s.block} onChange={(e) => setBlock(e.target.value)} title="Stilul paragrafului">
        <option value="p">Normal</option>
        <option value="h1">Titlu 1</option>
        <option value="h2">Titlu 2</option>
        <option value="h3">Titlu 3</option>
        <option value="quote">Citat</option>
        <option value="code">Cod</option>
      </select>
      <span className="sep" />
      {btn(<b>B</b>, s.bold, () => chain().toggleBold().run(), 'Bold (Ctrl+B)')}
      {btn(<i>I</i>, s.italic, () => chain().toggleItalic().run(), 'Italic (Ctrl+I)')}
      {btn(<u>U</u>, s.underline, () => chain().toggleUnderline().run(), 'Subliniat (Ctrl+U)')}
      {btn(<s>S</s>, s.strike, () => chain().toggleStrike().run(), 'Tăiat')}
      {btn(<span>x<sup>2</sup></span>, s.sup, () => chain().toggleSuperscript().run(), 'Superscript')}
      {btn(<span>x<sub>2</sub></span>, s.sub, () => chain().toggleSubscript().run(), 'Subscript')}
      <Pop label={<span className="color-a">A</span>} title="Culoarea textului">
        <Swatches colors={TEXT_COLORS} onPick={(c) => chain().setColor(c).run()} onClear={() => chain().unsetColor().run()} clearLabel="Automat" />
      </Pop>
      <Pop label={<span className="hl-a">H</span>} title="Highlight">
        <Swatches colors={HIGHLIGHTS} onPick={(c) => chain().toggleHighlight({ color: c }).run()} onClear={() => chain().unsetHighlight().run()} clearLabel="Fără" />
      </Pop>
      <span className="sep" />
      {btn('⯇', s.align === 'left', () => chain().unsetTextAlign().run(), 'Aliniere stânga')}
      {btn('≡', s.align === 'center', () => chain().setTextAlign('center').run(), 'Centrat')}
      {btn('⯈', s.align === 'right', () => chain().setTextAlign('right').run(), 'Aliniere dreapta')}
      {btn('☰', s.align === 'justify', () => chain().setTextAlign('justify').run(), 'Justify')}
      <span className="sep" />
      {btn('•', s.bullet, () => chain().toggleBulletList().run(), 'Listă cu buline')}
      {btn('1.', s.ordered, () => chain().toggleOrderedList().run(), 'Listă numerotată')}
      {btn('⇥', false, () => chain().sinkListItem('listItem').run(), 'Indentează elementul de listă', !s.inList)}
      {btn('⇤', false, () => chain().liftListItem('listItem').run(), 'Scoate din indentare', !s.inList)}
      {btn('— ', false, () => chain().insertContent('— ').run(), 'Linie de dialog')}
      <span className="sep" />
      {s.comment
        ? btn('💬✕', true, () => chain().unsetComment().run(), 'Șterge comentariul')
        : btn('💬', false, onAddComment, 'Comentariu pe textul selectat', !s.hasSelection)}
      {btn('¹', false, onAddFootnote, 'Notă de subsol (dublu-clic pe număr pentru editare)')}
      {btn('✎', false, onAddAnnotation, 'Adnotare inline (nu intră în Compile)')}
      {btn('🔗', s.link, insertLinkExternal, 'Link extern (Ctrl+L)')}
      <Menu
        label="[[ ]]"
        items={linkTargets.length ? linkTargets.slice(0, 60).map((t) => ({ label: t.title, action: () => insertLinkInternal(t) })) : [{ label: 'Niciun document', action: () => {}, disabled: true }]}
      />
      <span className="sep" />
      <Menu label="Inserează" items={insertItems} />
      <Menu label="Tabel" items={tableItems} />
      <Menu label="Caractere" items={SPECIAL.map((c) => ({ label: c, action: () => chain().insertContent(c).run() }))} />
      <Menu label="Transformă" items={transformItems} />
      <Menu label="Stil" items={styleItems} />
      <Menu label={view.revision ? `Revizie ${view.revision}` : 'Revizie'} items={revisionItems} />
      <Menu label="Vizualizare" items={viewItems} />
      <Menu label="Copiază special" items={copyItems} />
      <span className="sep" />
      {btn('↶', false, () => chain().undo().run(), 'Anulează (Ctrl+Z)')}
      {btn('↷', false, () => chain().redo().run(), 'Refă (Ctrl+Y)')}
    </div>
  );
}
