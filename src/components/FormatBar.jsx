import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditorState } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import Menu from './Menu.jsx';
import { htmlToManuscript } from '../lib/editorial.js';
import { annotationsToComments, commentsToAnnotations, footnotesToLinked, linkedToFootnotes } from '../lib/noteConvert.js';
import { isParaStyle } from '../lib/styles.js';
import { POS_CLASSES } from '../lib/pos.js';
import { listBookmarks } from '../editor/formatting.js';

const TEXT_COLORS = ['#b3261e', '#c77700', '#2e7d32', '#1565c0', '#6a1b9a', '#5d4037', '#757575'];
const HIGHLIGHTS = ['#fff176', '#a5d6a7', '#90caf9', '#f8bbd0', '#ffcc80'];
const FONTS = ['Georgia', 'Times New Roman', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Cambria', 'Arial', 'Helvetica', 'Verdana', 'Calibri', 'Courier New', 'Courier Prime'];
const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const LIST_TYPES = [['1', '1. 2. 3.'], ['a', 'a. b. c.'], ['A', 'A. B. C.'], ['i', 'i. ii. iii.'], ['I', 'I. II. III.']];
const TIME_FORMATS = [
  ['Ora (14:05)', () => new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })],
  ['Data și ora', () => new Date().toLocaleString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ['Data scurtă (23.10.2026)', () => new Date().toLocaleDateString('ro-RO')],
  ['Data ISO (2026-10-23)', () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }],
  ['Ziua săptămânii și data', () => new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
];
const ask = (label, cur) => {
  const v = window.prompt(label, cur ?? '');
  if (v === null) return undefined;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
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

function CustomColor({ onPick, label }) {
  return (
    <label className="custom-color" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {label} <input type="color" onChange={(e) => onPick(e.target.value)} />
    </label>
  );
}

function Pop({ label, title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu" onMouseLeave={() => setOpen(false)}>
      <button title={title} aria-label={title} aria-haspopup="true" aria-expanded={open} className={open ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>{label}</button>
      {open && (
        <div className="menu-pop narrow" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

// Controls of one toolbar level (the bar itself, or the overflow popup), excluding the
// contents of open dropdowns.
const CONTROLS = 'button, select, input';
const levelControls = (root) =>
  root ? [...root.querySelectorAll(CONTROLS)].filter((el) => !el.disabled && el.closest('.menu-pop, .fb-overflow-pop, .format-bar') === root) : [];
const popItems = (pop) => [...pop.querySelectorAll(CONTROLS)].filter((el) => !el.disabled && el.closest('.menu-pop') === pop);
const triggerOf = (pop) => pop.parentElement?.querySelector(':scope > button');

// Scrivener keeps the format bar on one row; whatever does not fit goes into a trailing
// "»" menu. Groups carry a priority (0 = always wanted: style, B/I/U, comment, footnote,
// link, highlight); when space runs out the lowest-priority groups go first, whatever
// their position, and visible groups stay in bar order. Group widths are measured while
// they sit in the bar and cached, so hidden groups can come back when the pane grows.
const MORE_WIDTH = 30;
function OverflowBar({ groups }) {
  const items = groups;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const barRef = useRef(null);
  const widths = useRef([]);
  const [hiddenKey, setHiddenKey] = useState(''); // sorted indexes of overflowed groups
  const hiddenSet = new Set(hiddenKey ? hiddenKey.split(',').map(Number) : []);
  const [open, setOpen] = useState(false);
  const fit = useCallback(() => {
    const bar = barRef.current;
    if (!bar || !bar.offsetParent) return; // hidden (split pane without focus): keep the last layout
    bar.querySelectorAll(':scope > .fb-group').forEach((el) => {
      widths.current[Number(el.dataset.i)] = el.getBoundingClientRect().width;
    });
    const cs = getComputedStyle(bar);
    const gap = parseFloat(cs.columnGap) || 0;
    const avail = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const items = itemsRef.current;
    const live = items.map((it, i) => i).filter((i) => items[i].el != null);
    // never measured (e.g. a group that just appeared): show it once so it gets measured
    const w = (i) => (widths.current[i] ?? 0) + gap;
    const total = live.reduce((t, i) => t + w(i), 0) - gap;
    const hidden = [];
    if (total > avail + 0.5) {
      let budget = avail - MORE_WIDTH;
      const byPri = [...live].sort((x, y) => (items[x].pri - items[y].pri) || (x - y));
      for (const i of byPri) {
        if (w(i) <= budget) budget -= w(i);
        else hidden.push(i);
      }
    }
    const key = hidden.sort((x, y) => x - y).join(',');
    setHiddenKey((k) => (k === key ? k : key));
  }, []);
  useLayoutEffect(fit);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => fit());
    ro.observe(bar);
    return () => ro.disconnect();
  }, [fit]);
  const closeOverflow = (refocus) => {
    setOpen(false);
    if (refocus) barRef.current?.querySelector('.fb-more > button')?.focus();
  };
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!barRef.current?.querySelector('.fb-more')?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Esc closes an open dropdown inside the overflow first, then the overflow itself.
      if (barRef.current?.querySelector('.fb-overflow-pop .menu-pop')) return;
      closeOverflow(true);
    };
    // a fixed popup would drift away from its button: scrolling the editor closes it
    const onScroll = (e) => { if (!barRef.current?.querySelector('.fb-overflow-pop')?.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => { if (!hiddenKey) setOpen(false); }, [hiddenKey]);
  // The popup is position:fixed so the editor pane's overflow cannot clip it; it is
  // right-aligned under the » button and kept inside the window. Dropdowns opened inside
  // it open towards whichever side has room.
  const popRef = useRef(null);
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return undefined;
    const btn = barRef.current.querySelector('.fb-more > button').getBoundingClientRect();
    const w = pop.offsetWidth;
    pop.style.top = `${Math.round(btn.bottom + 4)}px`;
    pop.style.left = `${Math.round(Math.max(4, Math.min(btn.right - w, window.innerWidth - w - 4)))}px`;
    const flip = () => pop.querySelectorAll('.menu-pop').forEach((m) => {
      if (m.dataset.placed) return;
      m.dataset.placed = '1';
      m.style.left = '0';
      m.style.right = 'auto';
      if (m.getBoundingClientRect().right > window.innerWidth - 4) {
        m.style.left = 'auto';
        m.style.right = '0';
      }
    });
    const mo = new MutationObserver(flip);
    mo.observe(pop, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [open]);

  // WAI-ARIA toolbar: one Tab stop (roving tabindex), arrows move between controls.
  const active = useRef(null);
  const wantPopFocus = useRef(false); // overflow opened from the keyboard: focus its first control
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const ctrls = levelControls(bar);
    if (!ctrls.includes(active.current)) active.current = ctrls[0] || null;
    // Menu buttons with symbol labels get their accessible name from the wrapping group.
    bar.querySelectorAll('[data-label] > .menu > button').forEach((b) => {
      const l = b.parentElement.parentElement.dataset.label;
      if (b.getAttribute('aria-label') !== l) b.setAttribute('aria-label', l);
    });
    bar.querySelectorAll(CONTROLS).forEach((el) => {
      const v = el === active.current ? '0' : '-1';
      if (el.getAttribute('tabindex') !== v) el.setAttribute('tabindex', v);
    });
    if (open && wantPopFocus.current) {
      wantPopFocus.current = false;
      levelControls(popRef.current)[0]?.focus();
    }
  });
  const onFocus = (e) => {
    const t = e.target;
    if (t.closest('.format-bar') !== barRef.current || t.closest('.menu-pop, .fb-overflow-pop')) return;
    if (active.current === t) return;
    if (active.current) active.current.setAttribute('tabindex', '-1');
    active.current = t;
    t.setAttribute('tabindex', '0');
  };
  const onKeyDown = (e) => {
    const t = e.target;
    if (!t.matches?.(CONTROLS)) return;
    const menuPop = t.closest('.menu-pop');
    const level = menuPop ? null : t.closest('.fb-overflow-pop') || barRef.current;
    const move = (list, d) => {
      if (!list.length) return;
      const i = list.indexOf(t);
      const n = d === 'first' ? 0 : d === 'last' ? list.length - 1 : (i + d + list.length) % list.length;
      list[n].focus();
      e.preventDefault();
      e.stopPropagation();
    };
    if (menuPop) {
      const list = popItems(menuPop);
      if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && menuPop.classList.contains('narrow'))) move(list, 1);
      else if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && menuPop.classList.contains('narrow'))) move(list, -1);
      else if (e.key === 'Home') move(list, 'first');
      else if (e.key === 'End') move(list, 'last');
      else if (e.key === 'Escape' || e.key === 'Tab') {
        const trig = triggerOf(menuPop);
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
        trig?.click(); // Menu/Pop toggle closed on their own button
        trig?.focus();
        if (e.key === 'Tab') e.preventDefault();
      }
      return;
    }
    const isSelect = t.tagName === 'SELECT' || t.tagName === 'INPUT';
    const ctrls = levelControls(level);
    if (e.key === 'ArrowRight' && !isSelect) move(ctrls, 1);
    else if (e.key === 'ArrowLeft' && !isSelect) move(ctrls, -1);
    else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && t.tagName === 'SELECT') move(ctrls, e.key === 'ArrowRight' ? 1 : -1);
    else if (e.key === 'Home' && !isSelect) move(ctrls, 'first');
    else if (e.key === 'End' && !isSelect) move(ctrls, 'last');
    else if (e.key === 'ArrowDown' && t.getAttribute('aria-haspopup')) {
      e.preventDefault();
      e.stopPropagation();
      if (t.parentElement.classList.contains('fb-more')) {
        wantPopFocus.current = true;
        if (!open) setOpen(true);
        else levelControls(popRef.current)[0]?.focus();
        return;
      }
      if (t.getAttribute('aria-expanded') !== 'true') t.click();
      // the dropdown renders on the next commit
      requestAnimationFrame(() => { const pop = t.parentElement.querySelector(':scope > .menu-pop'); if (pop) popItems(pop)[0]?.focus(); });
    } else if (e.key === 'Escape' && t.getAttribute('aria-expanded') === 'true' && !t.parentElement.classList.contains('fb-more')) {
      // dropdown open but focus still on its button (opened by mouse): close just the dropdown
      e.preventDefault();
      e.stopPropagation();
      t.click();
    } else if (e.key === 'Escape' && level !== barRef.current) {
      e.preventDefault();
      e.stopPropagation();
      closeOverflow(true);
    }
  };
  // Enter/Space on a dropdown button (a click with detail 0) moves focus into the dropdown.
  const onClick = (e) => {
    const t = e.target.closest?.('button[aria-haspopup]');
    if (e.detail !== 0 || !t || t.parentElement.classList.contains('fb-more')) return;
    requestAnimationFrame(() => { const pop = t.parentElement.querySelector(':scope > .menu-pop'); if (pop) popItems(pop)[0]?.focus(); });
  };

  const render = (it, i, first) =>
    it.el == null ? null : (
      <div key={i} data-i={i} data-label={it.label} className={`fb-group${it.sep && !first ? ' fb-sep' : ''}`}>
        {it.el}
      </div>
    );
  const shown = items.map((it, i) => [it, i]).filter(([it, i]) => it.el != null && !hiddenSet.has(i));
  const hidden = items.map((it, i) => [it, i]).filter(([it, i]) => it.el != null && hiddenSet.has(i));
  return (
    <div className="format-bar" ref={barRef} role="toolbar" aria-label="Formatare" aria-orientation="horizontal" onKeyDown={onKeyDown} onFocus={onFocus} onClick={onClick}>
      {shown.map(([it, i], k) => render(it, i, k === 0))}
      {hidden.length > 0 && (
        <div className="fb-more menu">
          <button className={open ? 'on' : ''} title="Mai multe comenzi de formatare" aria-label="Mai multe comenzi de formatare" aria-haspopup="true" aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { if (e.detail === 0) wantPopFocus.current = !open; setOpen((o) => !o); }}>
            »
          </button>
          {open && (
            // A chosen menu item closes the overflow as well.
            <div className="fb-overflow-pop" ref={popRef} role="group" aria-label="Mai multe comenzi de formatare" onClick={(e) => e.target.closest?.('[role="menuitem"]') && setOpen(false)}>
              {hidden.map(([it, i], k) => render(it, i, k === 0))}
            </div>
          )}
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
  onFindFormatting,
  defaultFormatting = null,
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
      smallCaps: ed.isActive('smallCaps'),
      allCaps: ed.isActive('allCaps'),
      fontFamily: ed.getAttributes('textStyle').fontFamily || '',
      fontSize: ed.getAttributes('textStyle').fontSize || '',
      image: ed.isActive('image'),
      para: { ...ed.state.selection.$from.parent.attrs },
      bookmarks: [...new Set(listBookmarks(ed.state.doc).map((b) => b.name))],
      inBookmark: ed.isActive('bookmark') ? ed.getAttributes('bookmark').name : null,
    }),
  });
  const chain = () => editor.chain().focus();
  // `on` is a boolean for toggles (exposed as aria-pressed), null for plain commands.
  const btn = (label, on, action, title, disabled = false) => (
    <button className={on ? 'on' : ''} aria-pressed={on == null ? undefined : Boolean(on)} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={action} title={title} aria-label={title}>
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
    { label: 'Linie orizontală', action: () => chain().setHorizontalRule().run() },
    { label: 'Salt de pagină', shortcut: 'Ctrl+Enter', action: () => chain().setPageBreak().run() },
    { label: 'Data de azi', action: () => chain().insertContent(new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })).run() },
    ...TIME_FORMATS.map(([label, fn]) => ({ label, action: () => chain().insertContent(fn()).run() })),
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
    { label: 'Note de subsol inline → note legate', action: () => footnotesToLinked(editor) },
    { label: 'Note legate → note de subsol inline', action: () => linkedToFootnotes(editor) },
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
    ...styles.filter(isParaStyle).map((st) => ({ label: `${st.type === 'both' ? '¶a' : '¶'} ${st.name}`, shortcut: st.shortcut || undefined, action: () => chain().setParagraphStyle(st.id).run() })),
    ...styles.filter((st) => st.type === 'char').map((st) => ({ label: `a ${st.name}`, shortcut: st.shortcut || undefined, action: () => chain().setCharStyle(st.id).run(), disabled: !s.hasSelection })),
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
    ...POS_CLASSES.map(([id, name]) => ({ label: `${view.posFocus === id ? '✓ ' : ''}Focus lingvistic: ${name}`, action: () => setView({ posFocus: view.posFocus === id ? '' : id }) })),
    { label: `Limba pentru focus lingvistic: ${{ auto: 'automat', ro: 'română', en: 'engleză' }[view.posLang || 'auto']}`, action: () => setView({ posLang: { auto: 'ro', ro: 'en', en: 'auto' }[view.posLang || 'auto'] }) },
    { label: `${view.currentParagraph ? '✓ ' : ''}Evidențiază paragraful curent`, action: () => setView({ currentParagraph: !view.currentParagraph }) },
    { label: `${view.currentLine ? '✓ ' : ''}Evidențiază linia curentă`, action: () => setView({ currentLine: !view.currentLine }) },
    ...[[0.1, 'puternică'], [0.28, 'medie'], [0.5, 'slabă']].map(([v, n]) => ({ label: `${(view.fadeOpacity ?? 0.28) === v ? '✓ ' : ''}Estompare text ${n}`, action: () => setView({ fadeOpacity: v }) })),
    '-',
    ...[['a5', 'A5'], ['a4', 'A4'], ['letter', 'Letter']].map(([id, n]) => ({ label: `${view.pageView && (view.pageSize || 'a5') === id ? '✓ ' : ''}Page View ${n}`, action: () => setView({ pageView: !(view.pageView && (view.pageSize || 'a5') === id), pageSize: id }) })),
    { label: `${view.facing ? '✓ ' : ''}Pagini față-verso`, action: () => setView({ facing: !view.facing, pageView: true }) },
    { label: `${view.ruler ? '✓ ' : ''}Arată rigla`, action: () => setView({ ruler: !view.ruler }) },
    { label: `${view.invisibles ? '✓ ' : ''}Arată semnele de paragraf`, action: () => setView({ invisibles: !view.invisibles }) },
    '-',
    ...[75, 100, 125, 150, 200].map((z) => ({ label: `${(view.zoom || 100) === z ? '✓ ' : ''}Zoom ${z}%`, action: () => setView({ zoom: z }) })),
  ];

  const p = s.para;
  const setPara = (attrs) => chain().setParagraphFormat(attrs).run();
  const num = (label, key, cur) => {
    const v = ask(label, cur);
    if (v !== undefined) setPara({ [key]: v });
  };
  const paraItems = [
    ...[1, 1.15, 1.5, 2].map((v) => ({ label: `${p.lineHeight === v ? '✓ ' : ''}Spațiere între rânduri ${v}`, action: () => setPara({ lineHeight: v }) })),
    { label: 'Spațiere între rânduri…', action: () => num('Spațiere între rânduri (ex. 1.3; gol = implicit):', 'lineHeight', p.lineHeight) },
    '-',
    { label: `Spațiu înainte… (${p.spaceBefore ?? '–'} pt)`, action: () => num('Spațiu înainte de paragraf, în pt (gol = implicit):', 'spaceBefore', p.spaceBefore) },
    { label: `Spațiu după… (${p.spaceAfter ?? '–'} pt)`, action: () => num('Spațiu după paragraf, în pt (gol = implicit):', 'spaceAfter', p.spaceAfter) },
    { label: `Indent prima linie… (${p.firstIndent ?? '–'} cm)`, action: () => num('Indent prima linie, în cm (negativ = agățat; gol = implicit):', 'firstIndent', p.firstIndent) },
    { label: `Indent stânga… (${p.indentLeft ?? 0} cm)`, action: () => num('Indent stânga, în cm:', 'indentLeft', p.indentLeft) },
    { label: `Indent dreapta… (${p.indentRight ?? 0} cm)`, action: () => num('Indent dreapta, în cm:', 'indentRight', p.indentRight) },
    { label: 'Mărește indentul stânga (+1 cm)', action: () => setPara({ indentLeft: (p.indentLeft || 0) + 1 }) },
    { label: 'Micșorează indentul stânga (−1 cm)', action: () => setPara({ indentLeft: Math.max(0, (p.indentLeft || 0) - 1) || null }) },
    { label: 'Tab stops… (cm, separate prin virgulă)', action: () => { const v = window.prompt('Tab stops în cm (ex. 2, 4.5, 8):', p.tabStops || ''); if (v !== null) setPara({ tabStops: v.replace(/\s+/g, '') || null }); } },
    '-',
    { label: `${p.dir === 'rtl' ? '✓ ' : ''}Scriere de la dreapta la stânga (RTL)`, action: () => chain().toggleRtl().run() },
    { label: `${view.ruler ? '✓ ' : ''}Arată rigla`, action: () => setView({ ruler: !view.ruler }) },
    '-',
    { label: 'Copiază formatarea', shortcut: 'Ctrl+Alt+C', action: () => chain().copyFormat().run() },
    { label: 'Lipește formatarea', shortcut: 'Ctrl+Alt+V', action: () => chain().pasteFormat().run() },
    { label: s.hasSelection ? 'Formatarea implicită pe selecție' : 'Formatarea implicită pe tot documentul', action: () => chain().applyDefaultFormatting(defaultFormatting || undefined).run() },
    '-',
    { label: 'Selectează cuvântul', shortcut: 'Ctrl+Alt+Shift+W', action: () => chain().selectWord().run() },
    { label: 'Selectează fraza', shortcut: 'Ctrl+Alt+Shift+S', action: () => chain().selectSentence().run() },
    { label: 'Selectează paragraful', shortcut: 'Ctrl+Alt+Shift+P', action: () => chain().selectParagraph().run() },
  ];

  const addBookmark = () => {
    const name = window.prompt('Numele semnului de carte:', s.hasSelection ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').slice(0, 40) : '');
    if (name) chain().setBookmark(name.trim()).run();
  };
  const bookmarkItems = [
    { label: 'Adaugă semn de carte…', action: addBookmark },
    { label: s.inBookmark ? `Șterge „${s.inBookmark}”` : 'Șterge semnul de la cursor', action: () => chain().removeBookmark(s.inBookmark).run(), disabled: !s.inBookmark },
    '-',
    ...(s.bookmarks.length ? s.bookmarks.map((b) => ({ label: `→ ${b}`, action: () => chain().goToBookmark(b).run() })) : [{ label: 'Niciun semn de carte', action: () => {}, disabled: true }]),
    '-',
    { label: 'Caută după formatare…', action: () => onFindFormatting?.(), disabled: !onFindFormatting },
  ];

  const imageItems = [
    ...['25%', '50%', '75%', '100%'].map((w) => ({ label: `Lățime ${w}`, action: () => chain().setImageFormat({ width: w }).run() })),
    { label: 'Lățime… (px sau %)', action: () => { const w = window.prompt('Lățimea imaginii (ex. 300 sau 60%):', editor.getAttributes('image').width || ''); if (w !== null) chain().setImageFormat({ width: w.trim() || null }).run(); } },
    { label: 'Mărimea originală', action: () => chain().setImageFormat({ width: null, height: null }).run() },
    '-',
    { label: 'În text', action: () => chain().setImageFormat({ align: null }).run() },
    { label: 'Aliniată la stânga (textul o înconjoară)', action: () => chain().setImageFormat({ align: 'left' }).run() },
    { label: 'Centrată', action: () => chain().setImageFormat({ align: 'center' }).run() },
    { label: 'Aliniată la dreapta (textul o înconjoară)', action: () => chain().setImageFormat({ align: 'right' }).run() },
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
    { label: 'Ca Markdown (***termeni***, *ilustrații*, [^note])', action: () => copySpecial('markdown') },
    { label: 'Ca HTML', action: () => copySpecial('html') },
    { label: 'Ca HTML fără comentarii, adnotări și note', action: () => copySpecial('clean') },
  ];

  // One entry per overflow unit, in bar order. sep: starts a separated section.
  // pri: overflow order (higher goes into » first); 0 = frequent, kept visible.
  const g = (pri, el, sep = true, label) => ({ pri, el, sep, label });
  const groups = [
    g(0, <select className="block-select" value={s.block} onChange={(e) => setBlock(e.target.value)} title="Stilul paragrafului" aria-label="Stilul paragrafului">
          <option value="p">Normal</option>
          <option value="h1">Titlu 1</option>
          <option value="h2">Titlu 2</option>
          <option value="h3">Titlu 3</option>
          <option value="quote">Citat</option>
          <option value="code">Cod</option>
        </select>),
    g(3, <>
        <select className="font-select" value={s.fontFamily} onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())} title="Fontul textului selectat" aria-label="Fontul textului selectat">
          <option value="">Font implicit</option>
          {s.fontFamily && !FONTS.includes(s.fontFamily) && <option value={s.fontFamily}>{s.fontFamily}</option>}
          {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select className="size-select" value={s.fontSize} onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())} title="Mărimea fontului" aria-label="Mărimea fontului">
          <option value="">–</option>
          {s.fontSize && !SIZES.includes(parseFloat(s.fontSize)) && <option value={s.fontSize}>{s.fontSize}</option>}
          {SIZES.map((z) => <option key={z} value={`${z}pt`}>{z}</option>)}
        </select>
    </>, false),
    g(0, <>
        {btn(<b>B</b>, s.bold, () => chain().toggleBold().run(), 'Bold (Ctrl+B)')}
        {btn(<i>I</i>, s.italic, () => chain().toggleItalic().run(), 'Italic (Ctrl+I)')}
        {btn(<u>U</u>, s.underline, () => chain().toggleUnderline().run(), 'Subliniat (Ctrl+U)')}
    </>),
    g(6, <>
        {btn(<s>S</s>, s.strike, () => chain().toggleStrike().run(), 'Tăiat')}
        {btn(<span>x<sup>2</sup></span>, s.sup, () => chain().toggleSuperscript().run(), 'Superscript')}
        {btn(<span>x<sub>2</sub></span>, s.sub, () => chain().toggleSubscript().run(), 'Subscript')}
        {btn(<span style={{ fontVariant: 'small-caps' }}>Aa</span>, s.smallCaps, () => chain().toggleSmallCaps().run(), 'Majuscule mici (small caps)')}
        {btn('AA', s.allCaps, () => chain().toggleAllCaps().run(), 'Toate majuscule (fără a schimba textul)')}
    </>, false),
    g(1, <Pop label={<span className="color-a">A</span>} title="Culoarea textului">
          <Swatches colors={TEXT_COLORS} onPick={(c) => chain().setColor(c).run()} onClear={() => chain().unsetColor().run()} clearLabel="Automat" />
          <CustomColor label="Altă culoare" onPick={(c) => chain().setColor(c).run()} />
        </Pop>, false),
    g(0, <Pop label={<span className="hl-a">H</span>} title="Highlight">
          <Swatches colors={HIGHLIGHTS} onPick={(c) => chain().toggleHighlight({ color: c }).run()} onClear={() => chain().unsetHighlight().run()} clearLabel="Fără" />
          <CustomColor label="Altă culoare" onPick={(c) => chain().setHighlight({ color: c }).run()} />
        </Pop>, false),
    g(4, <>
        {btn('⯇', s.align === 'left', () => chain().unsetTextAlign().run(), 'Aliniere stânga')}
        {btn('≡', s.align === 'center', () => chain().setTextAlign('center').run(), 'Centrat')}
        {btn('⯈', s.align === 'right', () => chain().setTextAlign('right').run(), 'Aliniere dreapta')}
        {btn('☰', s.align === 'justify', () => chain().setTextAlign('justify').run(), 'Justify')}
    </>),
    g(5, <>
        {btn('•', s.bullet, () => chain().toggleBulletList().run(), 'Listă cu buline')}
        {btn('1.', s.ordered, () => chain().toggleOrderedList().run(), 'Listă numerotată')}
        <span data-label="Tipul numerotării" style={{ display: 'contents' }}><Menu label="a/i" items={LIST_TYPES.map(([t, label]) => ({ label, action: () => chain().setOrderedListType(t).run() }))} /></span>
        {btn('⇥', null, () => chain().sinkListItem('listItem').run(), 'Indentează elementul de listă', !s.inList)}
        {btn('⇤', null, () => chain().liftListItem('listItem').run(), 'Scoate din indentare', !s.inList)}
    </>),
    g(2, btn('— ', null, () => chain().insertContent('— ').run(), 'Linie de dialog'), false),
    g(0, <>
        {s.comment
          ? btn('💬✕', null, () => chain().unsetComment().run(), 'Șterge comentariul')
          : btn('💬', null, onAddComment, 'Comentariu pe textul selectat', !s.hasSelection)}
        {btn('¹', null, onAddFootnote, 'Notă de subsol (dublu-clic pe număr pentru editare)')}
        {btn('✎', null, onAddAnnotation, 'Adnotare inline (nu intră în Compile)')}
        {btn('🔗', s.link, insertLinkExternal, 'Link extern (Ctrl+L)')}
    </>),
    g(3, <Menu
          label="[[ ]]"
          items={linkTargets.length ? linkTargets.slice(0, 60).map((t) => ({ label: t.title, action: () => insertLinkInternal(t) })) : [{ label: 'Niciun document', action: () => {}, disabled: true }]}
        />, false, 'Link intern către document'),
    g(2, <Menu label="Inserează" items={insertItems} />),
    g(4, <Menu label="Paragraf" items={paraItems} />, false),
    g(7, <Menu label="Semne de carte" items={bookmarkItems} />, false),
    g(2, s.image ? <Menu label="Imagine" items={imageItems} /> : null, false),
    g(7, <Menu label="Tabel" items={tableItems} />, false),
    g(6, <Menu label="Caractere" items={SPECIAL.map((c) => ({ label: c, action: () => chain().insertContent(c).run() }))} />, false),
    g(6, <Menu label="Transformă" items={transformItems} />, false),
    g(3, <Menu label="Stil" items={styleItems} />, false),
    g(5, <Menu label={view.revision ? `Revizie ${view.revision}` : 'Revizie'} items={revisionItems} />, false),
    g(5, <Menu label="Vizualizare" items={viewItems} />, false),
    g(8, <Menu label="Copiază special" items={copyItems} />, false),
    g(1, <>
        {btn('↶', null, () => chain().undo().run(), 'Anulează (Ctrl+Z)')}
        {btn('↷', null, () => chain().redo().run(), 'Refă (Ctrl+Y)')}
    </>),
  ];

  return <OverflowBar groups={groups} />;
}
