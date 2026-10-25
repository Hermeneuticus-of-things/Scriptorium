// Menu bar entries that act on the active editor (Edit, Insert, Format, View, Window).
// Pure builder: App passes accessors; every action reads the editor at click time.
import { getHTMLFromFragment } from '@tiptap/core';
import { annotationsToComments, commentsToAnnotations, footnotesToLinked, linkedToFootnotes } from './noteConvert.js';
import { isParaStyle } from './styles.js';
import { revisionRoundLabel } from './editingPrefs.js';

export const TEXT_COLORS = ['#b3261e', '#c77700', '#2e7d32', '#1565c0', '#6a1b9a', '#5d4037', '#757575'];
export const HIGHLIGHTS = ['#fff176', '#a5d6a7', '#90caf9', '#f8bbd0', '#ffcc80'];
export const TIME_FORMATS = [
  ['time', () => new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })],
  ['dateTime', () => new Date().toLocaleString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
  ['dateShort', () => new Date().toLocaleDateString('ro-RO')],
  ['dateIso', () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }],
  ['weekdayDate', () => new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
];
export const PLACEHOLDERS = [
  ['<$n>', 'phN'],
  ['<$t>', 'phT'],
  ['<$projecttitle>', 'phProject'],
  ['<$author>', 'phAuthor'],
  ['<$wc>', 'phWc'],
  ['<$date>', 'phDate'],
  ['<$p>', 'phP'],
];
const COLOR_KEYS = ['red', 'orange', 'green', 'blue', 'purple', 'brown', 'gray'];
const SIZE_STEPS = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export const titleCase = (t) => t.toLocaleLowerCase('ro').replace(/(^|\s)(\p{L})/gu, (m, sp, ch) => sp + ch.toLocaleUpperCase('ro'));
export const curlyQuotes = (t) => t.replace(/(^|[\s(\[—–-])"/g, '$1„').replace(/"/g, '”');
// Comments unwrapped, footnotes and annotations dropped.
export const withoutNotes = (html) =>
  html
    .replace(/<span[^>]*data-(?:footnote|annotation)="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<span[^>]*data-(?:comment|linked-footnote)="[^"]*"[^>]*>([\s\S]*?)<\/span>/g, '$1');

// Next font size up (dir 1) or down (dir -1) from "12pt" / "" (default 12).
export function stepSize(cur, dir) {
  const n = parseFloat(cur) || 12;
  if (dir > 0) return `${SIZE_STEPS.find((z) => z > n) || SIZE_STEPS[SIZE_STEPS.length - 1]}pt`;
  return `${[...SIZE_STEPS].reverse().find((z) => z < n) || SIZE_STEPS[0]}pt`;
}

export const DEFAULT_LABEL_COLOR_IN = { binder: false, cards: true, outliner: false, icons: true };

/**
 * @param ctx.t translate; ctx.handle() active Editor handle; ctx.view / ctx.setView editor view
 *   prefs; ctx.settings / ctx.setSettings app settings; ctx.styles project styles;
 *   ctx.run(id) runs a registry command; ctx.desktop native window available
 */
export function editorMenus(ctx) {
  const { t, handle, view = {}, setView, settings = {}, setSettings, styles = [], run, desktop, styleName = (st) => st.name } = ctx;
  const ed = () => {
    const e = handle()?.editor;
    return e && !e.isDestroyed ? e : null;
  };
  const on = (fn) => () => {
    const e = ed();
    if (e) fn(e.chain().focus(), e);
  };
  const check = (b, label) => `${b ? '✓ ' : ''}${label}`;
  const L = (k, v) => t(`ui.menu.${k}`, v);

  const transform = (fn) => on((c, e) => {
    const { from, to, empty } = e.state.selection;
    if (empty) return;
    const out = fn(e.state.doc.textBetween(from, to, '\n'));
    c.insertContentAt({ from, to }, out).setTextSelection({ from, to: from + out.length }).run();
  });
  const selectionHtml = (e) => {
    const { from, to, empty } = e.state.selection;
    return getHTMLFromFragment(empty ? e.state.doc.content : e.state.doc.slice(from, to).content, e.schema);
  };
  const writeClip = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      await window.api?.copyText?.(text);
    }
  };
  const copySpecial = (kind) => () => {
    const e = ed();
    if (!e) return;
    const html = selectionHtml(e);
    if (kind === 'html') return writeClip(html);
    const div = document.createElement('div');
    div.innerHTML = withoutNotes(html).replace(/<\/p>/g, '</p>\n\n');
    return writeClip(div.textContent.replace(/\n{3,}/g, '\n\n').trim());
  };
  const exec = (cmd) => () => {
    handle()?.focus?.();
    document.execCommand(cmd);
  };
  const pastePlain = async () => {
    const h = handle();
    if (!h) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) h.replaceSelection(text);
    } catch {
      /* clipboard not readable here */
    }
  };
  const paste = async () => {
    handle()?.focus?.();
    if (document.execCommand('paste')) return;
    await pastePlain();
  };

  const edit = [
    { label: L('undo'), shortcut: 'Ctrl+Z', action: on((c) => c.undo().run()) },
    { label: L('redo'), shortcut: 'Ctrl+Y', action: on((c) => c.redo().run()) },
    '-',
    { label: L('cut'), shortcut: 'Ctrl+X', role: 'cut', action: exec('cut') },
    { label: L('copy'), shortcut: 'Ctrl+C', role: 'copy', action: exec('copy') },
    { label: L('paste'), shortcut: 'Ctrl+V', role: 'paste', action: paste },
    { label: L('pastePlain'), shortcut: 'Ctrl+Shift+V', role: 'pasteAndMatchStyle', action: pastePlain },
    { label: L('copySpecial'), submenu: [
      { label: L('copyNoNotes'), action: copySpecial('clean') },
      { label: L('copyHtml'), action: copySpecial('html') },
    ] },
    '-',
    { label: L('selectAll'), shortcut: 'Ctrl+A', action: on((c) => c.selectAll().run()) },
  ];
  const editAfter = [
    '-',
    { label: L('transform'), submenu: [
      { label: L('upper'), action: transform((s) => s.toLocaleUpperCase('ro')) },
      { label: L('lower'), action: transform((s) => s.toLocaleLowerCase('ro')) },
      { label: L('titleCase'), action: transform(titleCase) },
      '-',
      { label: L('curlyQuotes'), action: transform(curlyQuotes) },
      { label: L('plainText'), action: on((c) => c.unsetAllMarks().run()) },
    ] },
  ];

  const insertChar = (s) => on((c) => c.insertContent(s).run());
  const insert = [
    { label: L('comment'), action: () => handle()?.addComment?.() },
    { label: L('footnote'), action: () => handle()?.addLinkedFootnote?.() },
    { label: L('annotation'), action: () => handle()?.addAnnotation?.() },
    { label: L('inlineFootnote'), action: () => handle()?.addInlineFootnote?.() },
    '-',
    { label: L('image'), action: () => handle()?.insertImage?.() },
    { label: L('dateTime'), submenu: TIME_FORMATS.map(([k, fn]) => ({ label: t(`ui.formatBar.${k}`), action: on((c) => c.insertContent(fn()).run()) })) },
    { label: L('placeholder'), submenu: PLACEHOLDERS.map(([code, k]) => ({ label: `${code}  ${t(`ui.formatBar.${k}`)}`, action: on((c) => c.insertContent(code.replace(/</g, '&lt;')).run()) })) },
    { label: L('specialChars'), submenu: [
      { label: L('dialogueDash'), action: insertChar('— ') },
      { label: L('nbsp'), action: insertChar(' ') },
      { label: L('quotes'), action: on((c, e) => {
        const { from, to, empty } = e.state.selection;
        if (empty) c.insertContent('„”').setTextSelection(from + 1).run();
        else c.insertContentAt({ from, to }, `„${e.state.doc.textBetween(from, to, '\n')}”`).run();
      }) },
      { label: '…', action: insertChar('…') },
      { label: '–', action: insertChar('–') },
    ] },
    '-',
    { label: L('pageBreak'), shortcut: 'Ctrl+Enter', action: on((c) => c.setPageBreak().run()) },
    { label: L('table'), action: on((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()) },
  ];

  const rev = view.revision || 0;
  const para = (attrs) => on((c) => c.setParagraphFormat(attrs).run());
  const format = [
    { label: L('font'), submenu: [
      { label: L('bold'), shortcut: 'Ctrl+B', action: on((c) => c.toggleBold().run()) },
      { label: L('italic'), shortcut: 'Ctrl+I', action: on((c) => c.toggleItalic().run()) },
      { label: L('underline'), shortcut: 'Ctrl+U', action: on((c) => c.toggleUnderline().run()) },
      { label: L('strike'), action: on((c) => c.toggleStrike().run()) },
      '-',
      { label: L('bigger'), action: on((c, e) => c.setFontSize(stepSize(e.getAttributes('textStyle').fontSize, 1)).run()) },
      { label: L('smaller'), action: on((c, e) => c.setFontSize(stepSize(e.getAttributes('textStyle').fontSize, -1)).run()) },
    ] },
    { label: L('highlight'), action: on((c) => c.toggleHighlight({ color: HIGHLIGHTS[0] }).run()) },
    { label: L('textColor'), submenu: [
      { label: L('colorAuto'), action: on((c) => c.unsetColor().run()) },
      ...TEXT_COLORS.map((col, i) => ({ label: L(`color_${COLOR_KEYS[i]}`), action: on((c) => c.setColor(col).run()) })),
    ] },
    { label: L('paragraph'), submenu: [
      { label: L('alignLeft'), action: on((c) => c.unsetTextAlign().run()) },
      { label: L('alignCenter'), action: on((c) => c.setTextAlign('center').run()) },
      { label: L('alignRight'), action: on((c) => c.setTextAlign('right').run()) },
      { label: L('alignJustify'), action: on((c) => c.setTextAlign('justify').run()) },
      '-',
      ...[1, 1.15, 1.5, 2].map((v) => ({ label: t('ui.formatBar.lineSpacing', { v }), action: para({ lineHeight: v }) })),
    ] },
    { label: L('style'), submenu: [
      ...styles.filter(isParaStyle).map((st) => ({ label: `¶ ${styleName(st)}`, shortcut: st.shortcut || undefined, action: on((c) => c.setParagraphStyle(st.id).run()) })),
      ...styles.filter((st) => st.type === 'char').map((st) => ({ label: `a ${styleName(st)}`, shortcut: st.shortcut || undefined, action: on((c) => c.setCharStyle(st.id).run()) })),
      '-',
      { label: t('ui.formatBar.noParaStyle'), action: on((c) => c.setParagraphStyle(null).run()) },
      { label: t('ui.formatBar.manageStyles'), action: () => run('styles') },
    ] },
    { label: L('revisionMode'), submenu: [
      { label: check(!rev, L('revisionOff')), action: () => setView({ ...view, revision: 0 }) },
      ...[1, 2, 3, 4, 5].map((n) => ({ label: check(rev === n, revisionRoundLabel(n)), action: () => setView({ ...view, revision: n }) })),
      '-',
      { label: t('ui.formatBar.acceptRevisions'), action: on((c) => c.removeRevisions().run()) },
    ] },
    { label: L('convert'), submenu: [
      { label: t('ui.formatBar.commentsToAnn'), action: () => ed() && commentsToAnnotations(ed()) },
      { label: t('ui.formatBar.annToComments'), action: () => ed() && annotationsToComments(ed()) },
      { label: t('ui.formatBar.fnToLinked'), action: () => ed() && footnotesToLinked(ed()) },
      { label: t('ui.formatBar.linkedToFn'), action: () => ed() && linkedToFootnotes(ed()) },
    ] },
    '-',
    { label: t('ui.formatBar.copyFormat'), shortcut: 'Ctrl+Alt+C', action: on((c) => c.copyFormat().run()) },
    { label: t('ui.formatBar.pasteFormat'), shortcut: 'Ctrl+Alt+V', action: on((c) => c.pasteFormat().run()) },
    '-',
    { label: check(!view.hideFormatBar, L('showFormatBar')), action: () => setView({ ...view, hideFormatBar: !view.hideFormatBar }) },
  ];

  const lc = { ...DEFAULT_LABEL_COLOR_IN, ...(settings.labelColorIn || {}) };
  const toggleSetting = (patch) => () => setSettings(patch);
  const viewMenu = [
    { label: check(settings.typewriter, L('typewriter')), action: toggleSetting({ typewriter: !settings.typewriter }) },
    { label: check(view.invisibles, L('invisibles')), action: () => setView({ ...view, invisibles: !view.invisibles }) },
    { label: check(view.pageView, L('pageView')), action: () => setView({ ...view, pageView: !view.pageView }) },
    { label: check(!view.hideHeaderBar, L('headerBar')), action: () => setView({ ...view, hideHeaderBar: !view.hideHeaderBar }) },
    { label: check(!view.hideFooterBar, L('footerBar')), action: () => setView({ ...view, hideFooterBar: !view.hideFooterBar }) },
    { label: L('labelColorIn'), submenu: ['binder', 'cards', 'outliner', 'icons'].map((k) => ({
      label: check(lc[k], L(`labelIn_${k}`)),
      action: toggleSetting({ labelColorIn: { ...lc, [k]: !lc[k] } }),
    })) },
  ];

  const windowMenu = [
    { label: L('minimize'), role: 'minimize', hidden: !desktop, action: () => {} },
    { label: L('maximize'), role: 'toggleMaximize', hidden: !desktop, action: () => {} },
  ];

  return { edit, editAfter, insert, format, view: viewMenu, window: windowMenu };
}
