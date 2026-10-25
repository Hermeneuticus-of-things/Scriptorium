import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditorState } from '@tiptap/react';
import { getHTMLFromFragment } from '@tiptap/core';
import Menu from './Menu.jsx';
import { builtinName, t as tr, uiLocale } from '../lib/i18n.js';
import { htmlToManuscript } from '../lib/editorial.js';
import { annotationsToComments, commentsToAnnotations, footnotesToLinked, linkedToFootnotes } from '../lib/noteConvert.js';
import { isParaStyle } from '../lib/styles.js';
import { POS_CLASSES } from '../lib/pos.js';
import { listBookmarks } from '../editor/formatting.js';
import { TEXT_COLORS, HIGHLIGHTS, TIME_FORMATS, PLACEHOLDERS } from '../lib/editorMenus.js';
import { FORMAT_ITEMS, getFormatLayout, onFormatLayout, SEP, SPACE } from '../lib/toolbars.js';

const FONTS = ['Georgia', 'Times New Roman', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Cambria', 'Arial', 'Helvetica', 'Verdana', 'Calibri', 'Courier New', 'Courier Prime'];
const SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const LINE_SPACINGS = [1, 1.2, 1.5, 2, 2.5, 3];
const LIST_TYPES = [['1', '1. 2. 3.'], ['a', 'a. b. c.'], ['A', 'A. B. C.'], ['i', 'i. ii. iii.'], ['I', 'I. II. III.']];
const ask = (label, cur) => {
  const v = window.prompt(label, cur ?? '');
  if (v === null) return undefined;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const SPECIAL = ['„', '”', '«', '»', '—', '–', '…', '§', '¶', '†', '•', '°', '×', 'ā', 'ī', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ṅ', 'ñ', 'ṭ', 'ḍ', 'ṇ', 'ś', 'ṣ', 'ḥ', 'ṃ', 'Ā', 'Ī', 'Ū', 'Ś', 'Ṣ'];

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
          <button className={open ? 'on' : ''} title={tr('ui.formatBar.more')} aria-label={tr('ui.formatBar.more')} aria-haspopup="true" aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { if (e.detail === 0) wantPopFocus.current = !open; setOpen((o) => !o); }}>
            »
          </button>
          {open && (
            // A chosen menu item closes the overflow as well.
            <div className="fb-overflow-pop" ref={popRef} role="group" aria-label={tr('ui.formatBar.more')} onClick={(e) => e.target.closest?.('[role="menuitem"]') && setOpen(false)}>
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
  const [layout, setLayout] = useState(getFormatLayout);
  useEffect(() => onFormatLayout(setLayout), []);
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
    const href = window.prompt(tr('ui.formatBar.linkPrompt'), prev);
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
    { label: tr('ui.formatBar.tableInsert'), action: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run() },
    '-',
    { label: tr('ui.formatBar.rowAbove'), action: () => chain().addRowBefore().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.rowBelow'), action: () => chain().addRowAfter().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.colLeft'), action: () => chain().addColumnBefore().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.colRight'), action: () => chain().addColumnAfter().run(), disabled: !s.inTable },
    '-',
    { label: tr('ui.formatBar.headerRow'), action: () => chain().toggleHeaderRow().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.mergeCells'), action: () => chain().mergeCells().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.splitCell'), action: () => chain().splitCell().run(), disabled: !s.inTable },
    '-',
    { label: tr('ui.formatBar.deleteRow'), action: () => chain().deleteRow().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.deleteCol'), action: () => chain().deleteColumn().run(), disabled: !s.inTable },
    { label: tr('ui.formatBar.deleteTable'), action: () => chain().deleteTable().run(), disabled: !s.inTable },
  ];

  const insertItems = [
    { label: tr('ui.formatBar.image'), action: onInsertImage },
    { label: tr('ui.formatBar.linkExt'), shortcut: 'Ctrl+L', action: insertLinkExternal },
    { label: tr('ui.formatBar.hr'), action: () => chain().setHorizontalRule().run() },
    { label: tr('ui.formatBar.pageBreak'), shortcut: 'Ctrl+Enter', action: () => chain().setPageBreak().run() },
    { label: tr('ui.formatBar.today'), action: () => chain().insertContent(new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })).run() },
    ...TIME_FORMATS.map(([k, fn]) => ({ label: tr(`ui.formatBar.${k}`), action: () => chain().insertContent(fn()).run() })),
    '-',
    { label: tr('ui.formatBar.commentSel'), action: onAddComment, disabled: !s.hasSelection },
    { label: tr('ui.formatBar.annotation'), action: onAddAnnotation },
    { label: tr('ui.formatBar.footnote'), action: onAddFootnote },
    '-',
    ...PLACEHOLDERS.map(([code, k]) => ({ label: `${code}  ${tr(`ui.formatBar.${k}`)}`, action: () => chain().insertContent(code.replace(/</g, '&lt;')).run() })),
  ];

  const transformItems = [
    { label: tr('ui.formatBar.upper'), action: () => transform((t) => t.toLocaleUpperCase('ro')), disabled: !s.hasSelection },
    { label: tr('ui.formatBar.lower'), action: () => transform((t) => t.toLocaleLowerCase('ro')), disabled: !s.hasSelection },
    { label: tr('ui.formatBar.titleCase'), action: () => transform(titleCase), disabled: !s.hasSelection },
    { label: tr('ui.formatBar.sentenceCase'), action: () => transform((t) => t.toLocaleLowerCase('ro').replace(/(^\s*|[.!?…]\s+)(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('ro'))), disabled: !s.hasSelection },
    '-',
    { label: tr('ui.formatBar.doubleSpaces'), action: () => transform((t) => t.replace(/ {2,}/g, ' ')), disabled: !s.hasSelection },
    { label: tr('ui.formatBar.smartQuotes'), action: () => transform((t) => t.replace(/(^|[\s(\[])"/g, '$1„').replace(/"/g, '”')), disabled: !s.hasSelection },
    { label: tr('ui.formatBar.dashes'), action: () => transform((t) => t.replace(/--/g, '—')), disabled: !s.hasSelection },
    '-',
    { label: tr('ui.formatBar.annToComments'), action: () => annotationsToComments(editor) },
    { label: tr('ui.formatBar.commentsToAnn'), action: () => commentsToAnnotations(editor) },
    { label: tr('ui.formatBar.fnToLinked'), action: () => footnotesToLinked(editor) },
    { label: tr('ui.formatBar.linkedToFn'), action: () => linkedToFootnotes(editor) },
    '-',
    { label: tr('ui.formatBar.clearMarks'), action: () => chain().unsetAllMarks().run() },
    { label: tr('ui.formatBar.clearHighlight'), action: () => chain().unsetHighlight().run() },
    { label: tr('ui.formatBar.clearColor'), action: () => chain().unsetColor().run() },
  ];

  const setView = (patch) => {
    onViewChange({ ...view, ...patch });
    setTimeout(() => editor.commands.focus(), 0);
  };

  const styleItems = [
    ...styles.filter(isParaStyle).map((st) => ({ label: `${st.type === 'both' ? '¶a' : '¶'} ${builtinName('style', st)}`, shortcut: st.shortcut || undefined, action: () => chain().setParagraphStyle(st.id).run() })),
    ...styles.filter((st) => st.type === 'char').map((st) => ({ label: `a ${builtinName('style', st)}`, shortcut: st.shortcut || undefined, action: () => chain().setCharStyle(st.id).run(), disabled: !s.hasSelection })),
    '-',
    { label: tr('ui.formatBar.noParaStyle'), action: () => chain().setParagraphStyle(null).run() },
    { label: tr('ui.formatBar.noCharStyle'), action: () => chain().setCharStyle(null).run() },
    '-',
    { label: tr('ui.formatBar.manageStyles'), action: () => onManageStyles?.() },
  ];

  const revisionItems = [
    { label: view.revision ? tr('ui.formatBar.revisionStop', { n: view.revision }) : tr('ui.formatBar.revisionOff'), action: () => setView({ revision: 0 }), disabled: !view.revision },
    ...[1, 2, 3, 4, 5].map((n) => ({ label: tr('ui.formatBar.revisionRound', { n }), action: () => setView({ revision: n }) })),
    '-',
    { label: tr('ui.formatBar.acceptRevisions'), action: () => chain().removeRevisions().run() },
    ...(view.revision ? [{ label: tr('ui.formatBar.removeRound', { n: view.revision }), action: () => chain().removeRevisions(view.revision).run() }] : []),
  ];

  const viewItems = [
    { label: `${view.focus === 'dialogue' ? '✓ ' : ''}${tr('ui.formatBar.focus_dialogue')}`, action: () => setView({ focus: view.focus === 'dialogue' ? 'off' : 'dialogue' }) },
    { label: `${view.focus === 'paragraph' ? '✓ ' : ''}${tr('ui.formatBar.focus_paragraph')}`, action: () => setView({ focus: view.focus === 'paragraph' ? 'off' : 'paragraph' }) },
    { label: `${view.focus === 'sentence' ? '✓ ' : ''}${tr('ui.formatBar.focus_sentence')}`, action: () => setView({ focus: view.focus === 'sentence' ? 'off' : 'sentence' }) },
    ...POS_CLASSES.map(([id]) => ({ label: `${view.posFocus === id ? '✓ ' : ''}${tr('ui.formatBar.posFocus', { name: tr(`ui.formatBar.pos.${id}`) })}`, action: () => setView({ posFocus: view.posFocus === id ? '' : id }) })),
    { label: tr('ui.formatBar.posLang', { lang: tr(`ui.formatBar.posLang_${view.posLang || 'auto'}`) }), action: () => setView({ posLang: { auto: 'ro', ro: 'en', en: 'auto' }[view.posLang || 'auto'] }) },
    { label: `${view.currentParagraph ? '✓ ' : ''}${tr('ui.formatBar.curPara')}`, action: () => setView({ currentParagraph: !view.currentParagraph }) },
    { label: `${view.currentLine ? '✓ ' : ''}${tr('ui.formatBar.curLine')}`, action: () => setView({ currentLine: !view.currentLine }) },
    ...[[0.1, 'strong'], [0.28, 'medium'], [0.5, 'weak']].map(([v, n]) => ({ label: `${(view.fadeOpacity ?? 0.28) === v ? '✓ ' : ''}${tr(`ui.formatBar.fade_${n}`)}`, action: () => setView({ fadeOpacity: v }) })),
    '-',
    ...[['a5', 'A5'], ['a4', 'A4'], ['letter', 'Letter']].map(([id, n]) => ({ label: `${view.pageView && (view.pageSize || 'a5') === id ? '✓ ' : ''}${tr('ui.formatBar.pageView', { n })}`, action: () => setView({ pageView: !(view.pageView && (view.pageSize || 'a5') === id), pageSize: id }) })),
    { label: `${view.facing ? '✓ ' : ''}${tr('ui.formatBar.facing')}`, action: () => setView({ facing: !view.facing, pageView: true }) },
    { label: `${view.ruler ? '✓ ' : ''}${tr('ui.formatBar.ruler')}`, action: () => setView({ ruler: !view.ruler }) },
    { label: `${view.invisibles ? '✓ ' : ''}${tr('ui.formatBar.invisibles')}`, action: () => setView({ invisibles: !view.invisibles }) },
    '-',
    ...[75, 100, 125, 150, 200].map((z) => ({ label: `${(view.zoom || 100) === z ? '✓ ' : ''}Zoom ${z}%`, action: () => setView({ zoom: z }) })),
  ];

  const p = s.para;
  const setPara = (attrs) => chain().setParagraphFormat(attrs).run();
  const num = (label, key, cur) => {
    const v = ask(label, cur);
    if (v !== undefined) setPara({ [key]: v });
  };
  // Line spacing as in the classic paragraph bar: 1.0 / 1.2 / 1.5 / 2.0 / 2.5 / 3.0 / Other…
  const fmtSpacing = (v) => Number(v).toLocaleString(uiLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  const spacingItems = [
    ...LINE_SPACINGS.map((v) => ({ label: `${Number(p.lineHeight) === v ? '✓ ' : ''}${fmtSpacing(v)}`, action: () => setPara({ lineHeight: v }) })),
    '-',
    { label: `${p.lineHeight && !LINE_SPACINGS.includes(Number(p.lineHeight)) ? `✓ ${fmtSpacing(p.lineHeight)} · ` : ''}${tr('ui.formatBar.lineSpacingOther')}`, action: () => num(tr('ui.formatBar.lineSpacingPrompt'), 'lineHeight', p.lineHeight) },
    { label: tr('ui.formatBar.lineSpacingDefault'), action: () => setPara({ lineHeight: null }), disabled: !p.lineHeight },
  ];
  const paraItems = [
    ...LINE_SPACINGS.map((v) => ({ label: `${Number(p.lineHeight) === v ? '✓ ' : ''}${tr('ui.formatBar.lineSpacing', { v: fmtSpacing(v) })}`, action: () => setPara({ lineHeight: v }) })),
    { label: tr('ui.formatBar.lineSpacingCustom'), action: () => num(tr('ui.formatBar.lineSpacingPrompt'), 'lineHeight', p.lineHeight) },
    '-',
    { label: tr('ui.formatBar.spaceBefore', { v: p.spaceBefore ?? '–' }), action: () => num(tr('ui.formatBar.spaceBeforePrompt'), 'spaceBefore', p.spaceBefore) },
    { label: tr('ui.formatBar.spaceAfter', { v: p.spaceAfter ?? '–' }), action: () => num(tr('ui.formatBar.spaceAfterPrompt'), 'spaceAfter', p.spaceAfter) },
    { label: tr('ui.formatBar.firstIndent', { v: p.firstIndent ?? '–' }), action: () => num(tr('ui.formatBar.firstIndentPrompt'), 'firstIndent', p.firstIndent) },
    { label: tr('ui.formatBar.indentLeft', { v: p.indentLeft ?? 0 }), action: () => num(tr('ui.formatBar.indentLeftPrompt'), 'indentLeft', p.indentLeft) },
    { label: tr('ui.formatBar.indentRight', { v: p.indentRight ?? 0 }), action: () => num(tr('ui.formatBar.indentRightPrompt'), 'indentRight', p.indentRight) },
    { label: tr('ui.formatBar.incIndent'), action: () => setPara({ indentLeft: (p.indentLeft || 0) + 1 }) },
    { label: tr('ui.formatBar.decIndent'), action: () => setPara({ indentLeft: Math.max(0, (p.indentLeft || 0) - 1) || null }) },
    { label: tr('ui.formatBar.tabStops'), action: () => { const v = window.prompt(tr('ui.formatBar.tabStopsPrompt'), p.tabStops || ''); if (v !== null) setPara({ tabStops: v.replace(/\s+/g, '') || null }); } },
    '-',
    { label: `${p.dir === 'rtl' ? '✓ ' : ''}${tr('ui.formatBar.rtl')}`, action: () => chain().toggleRtl().run() },
    { label: `${view.ruler ? '✓ ' : ''}${tr('ui.formatBar.ruler')}`, action: () => setView({ ruler: !view.ruler }) },
    '-',
    { label: tr('ui.formatBar.copyFormat'), shortcut: 'Ctrl+Alt+C', action: () => chain().copyFormat().run() },
    { label: tr('ui.formatBar.pasteFormat'), shortcut: 'Ctrl+Alt+V', action: () => chain().pasteFormat().run() },
    { label: s.hasSelection ? tr('ui.formatBar.defaultFmtSel') : tr('ui.formatBar.defaultFmtDoc'), action: () => chain().applyDefaultFormatting(defaultFormatting || undefined).run() },
    '-',
    { label: tr('ui.formatBar.selectWord'), shortcut: 'Ctrl+Alt+Shift+W', action: () => chain().selectWord().run() },
    { label: tr('ui.formatBar.selectSentence'), shortcut: 'Ctrl+Alt+Shift+S', action: () => chain().selectSentence().run() },
    { label: tr('ui.formatBar.selectParagraph'), shortcut: 'Ctrl+Alt+Shift+P', action: () => chain().selectParagraph().run() },
  ];

  const addBookmark = () => {
    const name = window.prompt(tr('ui.formatBar.bookmarkPrompt'), s.hasSelection ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').slice(0, 40) : '');
    if (name) chain().setBookmark(name.trim()).run();
  };
  const bookmarkItems = [
    { label: tr('ui.formatBar.addBookmark'), action: addBookmark },
    { label: s.inBookmark ? tr('ui.formatBar.removeBookmark', { name: s.inBookmark }) : tr('ui.formatBar.removeBookmarkHere'), action: () => chain().removeBookmark(s.inBookmark).run(), disabled: !s.inBookmark },
    '-',
    ...(s.bookmarks.length ? s.bookmarks.map((b) => ({ label: `→ ${b}`, action: () => chain().goToBookmark(b).run() })) : [{ label: tr('ui.formatBar.noBookmarks'), action: () => {}, disabled: true }]),
    '-',
    { label: tr('ui.formatBar.findFormatting'), action: () => onFindFormatting?.(), disabled: !onFindFormatting },
  ];

  const imageItems = [
    ...['25%', '50%', '75%', '100%'].map((w) => ({ label: tr('ui.formatBar.width', { w }), action: () => chain().setImageFormat({ width: w }).run() })),
    { label: tr('ui.formatBar.widthCustom'), action: () => { const w = window.prompt(tr('ui.formatBar.widthPrompt'), editor.getAttributes('image').width || ''); if (w !== null) chain().setImageFormat({ width: w.trim() || null }).run(); } },
    { label: tr('ui.formatBar.originalSize'), action: () => chain().setImageFormat({ width: null, height: null }).run() },
    '-',
    { label: tr('ui.formatBar.inline'), action: () => chain().setImageFormat({ align: null }).run() },
    { label: tr('ui.formatBar.alignLeft'), action: () => chain().setImageFormat({ align: 'left' }).run() },
    { label: tr('ui.formatBar.center'), action: () => chain().setImageFormat({ align: 'center' }).run() },
    { label: tr('ui.formatBar.alignRight'), action: () => chain().setImageFormat({ align: 'right' }).run() },
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
    { label: tr('ui.formatBar.copyText'), action: () => copySpecial('text') },
    { label: tr('ui.formatBar.copyMd'), action: () => copySpecial('markdown') },
    { label: tr('ui.formatBar.copyHtml'), action: () => copySpecial('html') },
    { label: tr('ui.formatBar.copyClean'), action: () => copySpecial('clean') },
  ];

  // One entry per overflow unit, in bar order. sep: starts a separated section.
  // pri: overflow order (higher goes into » first); 0 = frequent, kept visible.
  const g = (pri, el, sep = true, label) => ({ pri, el, sep, label });
  const groups = [
    g(0, <select className="block-select" value={s.block} onChange={(e) => setBlock(e.target.value)} title={tr('ui.fb.block')} aria-label={tr('ui.fb.block')}>
          <option value="p">{tr('ui.formatBar.normal')}</option>
          <option value="h1">{tr('ui.formatBar.h', { n: 1 })}</option>
          <option value="h2">{tr('ui.formatBar.h', { n: 2 })}</option>
          <option value="h3">{tr('ui.formatBar.h', { n: 3 })}</option>
          <option value="quote">{tr('ui.formatBar.quote')}</option>
          <option value="code">{tr('ui.formatBar.code')}</option>
        </select>),
    g(3, <>
        <select className="font-select" value={s.fontFamily} onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())} title={tr('ui.formatBar.font')} aria-label={tr('ui.formatBar.font')}>
          <option value="">{tr('ui.formatBar.defaultFont')}</option>
          {s.fontFamily && !FONTS.includes(s.fontFamily) && <option value={s.fontFamily}>{s.fontFamily}</option>}
          {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select className="size-select" value={s.fontSize} onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())} title={tr('ui.formatBar.size')} aria-label={tr('ui.formatBar.size')}>
          <option value="">–</option>
          {s.fontSize && !SIZES.includes(parseFloat(s.fontSize)) && <option value={s.fontSize}>{s.fontSize}</option>}
          {SIZES.map((z) => <option key={z} value={`${z}pt`}>{z}</option>)}
        </select>
    </>, false),
    g(0, <>
        {btn(<b>B</b>, s.bold, () => chain().toggleBold().run(), tr('ui.formatBar.bold'))}
        {btn(<i>I</i>, s.italic, () => chain().toggleItalic().run(), tr('ui.formatBar.italic'))}
        {btn(<u>U</u>, s.underline, () => chain().toggleUnderline().run(), tr('ui.formatBar.underline'))}
    </>),
    g(6, <>
        {btn(<s>S</s>, s.strike, () => chain().toggleStrike().run(), tr('ui.formatBar.strike'))}
        {btn(<span>x<sup>2</sup></span>, s.sup, () => chain().toggleSuperscript().run(), tr('ui.formatBar.sup'))}
        {btn(<span>x<sub>2</sub></span>, s.sub, () => chain().toggleSubscript().run(), tr('ui.formatBar.sub'))}
        {btn(<span style={{ fontVariant: 'small-caps' }}>Aa</span>, s.smallCaps, () => chain().toggleSmallCaps().run(), tr('ui.formatBar.smallCaps'))}
        {btn('AA', s.allCaps, () => chain().toggleAllCaps().run(), tr('ui.formatBar.allCaps'))}
    </>, false),
    g(1, <Pop label={<span className="color-a">A</span>} title={tr('ui.fb.color')}>
          <Swatches colors={TEXT_COLORS} onPick={(c) => chain().setColor(c).run()} onClear={() => chain().unsetColor().run()} clearLabel={tr('ui.formatBar.auto')} />
          <CustomColor label={tr('ui.formatBar.otherColor')} onPick={(c) => chain().setColor(c).run()} />
        </Pop>, false),
    g(0, <Pop label={<span className="hl-a">H</span>} title={tr('ui.fb.highlight')}>
          <Swatches colors={HIGHLIGHTS} onPick={(c) => chain().toggleHighlight({ color: c }).run()} onClear={() => chain().unsetHighlight().run()} clearLabel={tr('ui.formatBar.none')} />
          <CustomColor label={tr('ui.formatBar.otherColor')} onPick={(c) => chain().setHighlight({ color: c }).run()} />
        </Pop>, false),
    g(4, <>
        {btn('⯇', s.align === 'left', () => chain().unsetTextAlign().run(), tr('ui.formatBar.left'))}
        {btn('≡', s.align === 'center', () => chain().setTextAlign('center').run(), tr('ui.formatBar.centerText'))}
        {btn('⯈', s.align === 'right', () => chain().setTextAlign('right').run(), tr('ui.formatBar.right'))}
        {btn('☰', s.align === 'justify', () => chain().setTextAlign('justify').run(), tr('ui.formatBar.justify'))}
    </>),
    g(4, <span className="fb-spacing" data-label={tr('ui.formatBar.lineSpacingMenu')} style={{ display: 'contents' }}><Menu label={`↕ ${fmtSpacing(p.lineHeight || 1)}`} items={spacingItems} /></span>, false, tr('ui.formatBar.lineSpacingMenu')),
    g(5, <>
        {btn('•', s.bullet, () => chain().toggleBulletList().run(), tr('ui.formatBar.bullets'))}
        {btn('1.', s.ordered, () => chain().toggleOrderedList().run(), tr('ui.formatBar.ordered'))}
        <span data-label={tr('ui.formatBar.listType')} style={{ display: 'contents' }}><Menu label="a/i" items={LIST_TYPES.map(([t, label]) => ({ label, action: () => chain().setOrderedListType(t).run() }))} /></span>
        {btn('⇥', null, () => chain().sinkListItem('listItem').run(), tr('ui.formatBar.sink'), !s.inList)}
        {btn('⇤', null, () => chain().liftListItem('listItem').run(), tr('ui.formatBar.lift'), !s.inList)}
    </>),
    g(2, btn('— ', null, () => chain().insertContent('— ').run(), tr('ui.formatBar.dialogue')), false),
    g(0, <>
        {s.comment
          ? btn('💬✕', null, () => chain().unsetComment().run(), tr('ui.formatBar.removeComment'))
          : btn('💬', null, onAddComment, tr('ui.formatBar.comment'))}
        {btn('¹', null, onAddFootnote, tr('ui.formatBar.footnoteBtn'))}
        {btn('✎', null, onAddAnnotation, tr('ui.formatBar.annotationBtn'))}
        {btn('🔗', s.link, insertLinkExternal, tr('ui.formatBar.linkBtn'))}
    </>),
    g(3, <Menu
          label="[[ ]]"
          items={linkTargets.length ? linkTargets.slice(0, 60).map((t) => ({ label: t.title, action: () => insertLinkInternal(t) })) : [{ label: tr('ui.formatBar.noDocument'), action: () => {}, disabled: true }]}
        />, false, tr('ui.formatBar.internalLink')),
    g(2, <Menu label={tr('ui.formatBar.menuInsert')} items={insertItems} />),
    g(4, <Menu label={tr('ui.formatBar.menuParagraph')} items={paraItems} />, false),
    g(7, <Menu label={tr('ui.fb.bookmarks')} items={bookmarkItems} />, false),
    g(2, s.image ? <Menu label={tr('ui.formatBar.menuImage')} items={imageItems} /> : null, false),
    g(7, <Menu label={tr('ui.formatBar.menuTable')} items={tableItems} />, false),
    g(6, <Menu label={tr('ui.formatBar.menuChars')} items={SPECIAL.map((c) => ({ label: c, action: () => chain().insertContent(c).run() }))} />, false),
    g(6, <Menu label={tr('ui.fb.transform')} items={transformItems} />, false),
    g(3, <Menu label={tr('ui.formatBar.menuStyle')} items={styleItems} />, false),
    g(5, <Menu label={view.revision ? `${tr('ui.fb.revision')} ${view.revision}` : tr('ui.fb.revision')} items={revisionItems} />, false),
    g(5, <Menu label={tr('ui.formatBar.menuView')} items={viewItems} />, false),
    g(8, <Menu label={tr('ui.fb.copySpecial')} items={copyItems} />, false),
    g(1, <>
        {btn('↶', null, () => chain().undo().run(), tr('ui.formatBar.undo'))}
        {btn('↷', null, () => chain().redo().run(), tr('ui.formatBar.redo'))}
    </>),
  ];
  // Customized layout (View → Customize Toolbar…): groups in the chosen order, "sep" starts a
  // separated section, "space" is a flexible space.
  const byId = Object.fromEntries(groups.map((x, i) => [FORMAT_ITEMS[i].id, x]));
  const laid = [];
  let forceSep = false;
  for (const id of layout) {
    if (id === SEP) forceSep = true;
    else if (id === SPACE) laid.push({ pri: 9, el: <span className="fb-space" aria-hidden="true" />, sep: false, label: '' });
    else if (byId[id]) {
      laid.push(forceSep ? { ...byId[id], sep: true } : byId[id]);
      forceSep = false;
    }
  }

  return <OverflowBar groups={laid} />;
}
