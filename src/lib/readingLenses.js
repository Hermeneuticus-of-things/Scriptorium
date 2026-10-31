// Reading lenses ("Lectură"): HOW the text under the eyes is read - focus, part of speech,
// current paragraph/line, fade. One source for the FormatBar "Lectură" menu and View > Reading.
// Page size, facing pages, zoom, ruler and invisibles are NOT lenses: they live only in
// View > Page, View > Zoom, View (invisibles) and Format (ruler). Menu reorg B2/B3, 2026-10-31.
import { POS_CLASSES } from './pos.js';

const on = (b, label) => `${b ? 'V ' : ''}${label}`;

// setView(patch) merges the patch into the editor view.
export function readingLensItems({ t, view = {}, setView }) {
  const f = view.focus;
  return [
    ...['dialogue', 'paragraph', 'sentence'].map((m) => ({ label: on(f === m, t(`ui.formatBar.focus_${m}`)), action: () => setView({ focus: f === m ? 'off' : m }) })),
    ...POS_CLASSES.map(([id]) => ({ label: on(view.posFocus === id, t('ui.formatBar.posFocus', { name: t(`ui.formatBar.pos.${id}`) })), action: () => setView({ posFocus: view.posFocus === id ? '' : id }) })),
    { label: t('ui.formatBar.posLang', { lang: t(`ui.formatBar.posLang_${view.posLang || 'auto'}`) }), action: () => setView({ posLang: { auto: 'ro', ro: 'en', en: 'auto' }[view.posLang || 'auto'] }) },
    { label: on(view.currentParagraph, t('ui.formatBar.curPara')), action: () => setView({ currentParagraph: !view.currentParagraph }) },
    { label: on(view.currentLine, t('ui.formatBar.curLine')), action: () => setView({ currentLine: !view.currentLine }) },
    '-',
    ...[[0.1, 'strong'], [0.28, 'medium'], [0.5, 'weak']].map(([v, n]) => ({ label: on((view.fadeOpacity ?? 0.28) === v, t(`ui.formatBar.fade_${n}`)), action: () => setView({ fadeOpacity: v }) })),
  ];
}

// View > Page: page view on/off, page sizes, facing pages.
export function pageLookItems({ t, view = {}, setView }) {
  return [
    { label: on(view.pageView, t('ui.menu.pageView')), action: () => setView({ pageView: !view.pageView }) },
    ...[['a5', 'A5'], ['a4', 'A4'], ['letter', 'Letter']].map(([id, n]) => ({ label: on(view.pageView && (view.pageSize || 'a5') === id, t('ui.formatBar.pageView', { n })), action: () => setView({ pageView: !(view.pageView && (view.pageSize || 'a5') === id), pageSize: id }) })),
    { label: on(view.facing, t('ui.formatBar.facing')), action: () => setView({ facing: !view.facing, pageView: true }) },
  ];
}

export const ZOOM_PRESETS = [75, 100, 125, 150, 200];
// View > Zoom presets (the active pane), next to Zoom in / out / reset.
export function zoomPresetItems({ setZoom, curZoom }) {
  if (!setZoom) return [];
  const cur = curZoom ? curZoom() : 100;
  return ZOOM_PRESETS.map((z) => ({ label: on(cur === z, `Zoom ${z}%`), action: () => setZoom(z) }));
}
