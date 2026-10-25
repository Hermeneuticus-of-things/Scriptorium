// Options → Editing, in three parts like the classic window: Options (typewriter line, caret,
// current line, zoom, titles, auto-pairs, auto-complete), Formatting (default paragraph with a
// small ruler, fonts for notes and annotations, paste, units) and Revisions (names, deletions).
import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { EDITING_DEFAULTS, emTo, toEm, parseTabs } from '../lib/editingPrefs.js';

const DEFAULTS = { paragraphIndent: 0, paragraphSpacing: 0.6, defaultView: 'editor', showInvisibles: false, autoBacklinks: false, typewriter: false, ...EDITING_DEFAULTS };
const SUBTABS = ['options', 'formatting', 'revisions'];
const FONTS = [
  ['', 'ui.edit.fontSame'],
  ['Georgia, serif', 'Georgia'],
  ["'Times New Roman', serif", 'Times New Roman'],
  ["'Palatino Linotype', Palatino, serif", 'Palatino'],
  ['Garamond, serif', 'Garamond'],
  ['Arial, sans-serif', 'Arial'],
  ["'Segoe UI', system-ui, sans-serif", 'Segoe UI'],
  ["'Courier New', monospace", 'Courier New'],
];
const UNIT_STEP = { cm: 0.1, in: 0.05, pt: 1 };

/** A ruler for the default paragraph: indents (triangles) and tab stops, in the chosen unit. */
function MiniRuler({ unit, left, right, first, tabs, width = 16 }) {
  // width: ruler length in em (the preview paragraph's width).
  const units = emTo(width, unit);
  const step = unit === 'pt' ? 36 : unit === 'in' ? 0.5 : 1;
  const ticks = [];
  for (let v = 0; v <= units + 1e-6; v += step) ticks.push(Math.round(v * 100) / 100);
  const pct = (em) => `${Math.max(0, Math.min(100, (em / width) * 100))}%`;
  return (
    <div className="mini-ruler" aria-hidden="true">
      {ticks.map((v) => (
        <span key={v} className="tick" style={{ left: pct(toEm(v, unit)) }}>
          <span className="lbl">{v}</span>
        </span>
      ))}
      <span className="marker first" style={{ left: pct(left + first) }} title={t('set.paraIndent')} />
      <span className="marker left" style={{ left: pct(left) }} />
      <span className="marker right" style={{ left: pct(width - right) }} />
      {tabs.map((em) => <span key={em} className="marker tab" style={{ left: pct(left + em) }} />)}
    </div>
  );
}

export default function EditingPane({ s, setS, settings = {}, onConvertFormatting }) {
  const [sub, setSub] = useState('options');
  const [convertMsg, setConvertMsg] = useState('');
  const val = (k) => (s[k] !== undefined ? s[k] : settings[k] !== undefined ? settings[k] : DEFAULTS[k]);
  const put = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const check = (k, label) => (
    <label className="check">
      <input type="checkbox" checked={Boolean(val(k))} onChange={(e) => put(k, e.target.checked)} /> {label}
    </label>
  );
  const number = (k, label, { min, max, step = 1, suffix = '' } = {}) => (
    <label>
      {label}
      <span className="row" style={{ gap: 4, alignItems: 'center' }}>
        <input type="number" min={min} max={max} step={step} value={val(k)} onChange={(e) => put(k, e.target.value === '' ? '' : Number(e.target.value))} style={{ width: 80 }} />
        {suffix && <span className="muted small">{suffix}</span>}
      </span>
    </label>
  );
  const unit = val('rulerUnits') || 'cm';
  // Lengths are stored in em and shown in the chosen unit.
  const lengthInput = (k, label) => (
    <label>
      {label}
      <span className="row" style={{ gap: 4, alignItems: 'center' }}>
        <input type="number" min="0" step={UNIT_STEP[unit]} value={emTo(val(k), unit)} onChange={(e) => put(k, toEm(e.target.value, unit))} style={{ width: 80 }} />
        <span className="muted small">{unit}</span>
      </span>
    </label>
  );
  const fontSelect = (k, label) => (
    <label>
      {label}
      <select value={val(k)} onChange={(e) => put(k, e.target.value)}>
        {FONTS.map(([v, n]) => <option key={n} value={v}>{v ? n : t(n)}</option>)}
      </select>
    </label>
  );
  const names = [0, 1, 2, 3, 4].map((i) => (val('revisionNames') || [])[i] || '');
  const colors = s.revisionColors || settings.revisionColors || [];
  const align = val('paraAlign');
  const previewStyle = {
    textAlign: align || 'left',
    marginLeft: `${Number(val('paraIndentLeft')) || 0}em`,
    marginRight: `${Number(val('paraIndentRight')) || 0}em`,
    marginTop: `${Number(val('paraSpaceBefore')) || 0}em`,
    marginBottom: `${Number(val('paragraphSpacing')) || 0}em`,
    textIndent: `${Number(val('paragraphIndent')) || 0}em`,
    tabSize: parseTabs(val('paraTabs'), unit)[0] ? `${parseTabs(val('paraTabs'), unit)[0]}em` : undefined,
  };

  const panes = {
    options: (
      <>
        <label>
          {t('set.defaultView')}
          <select value={val('defaultView')} onChange={(e) => put('defaultView', e.target.value)}>
            <option value="editor">{t('cmd.viewEditor')}</option>
            <option value="corkboard">{t('cmd.viewCorkboard')}</option>
            <option value="outline">{t('cmd.viewOutline')}</option>
          </select>
        </label>
        <fieldset>
          <legend>{t('ui.edit.typing')}</legend>
          {check('typewriter', t('set.typewriter'))}
          <label>
            {t('ui.edit.typewriterPos', { n: val('typewriterPos') })}
            <input type="range" min="10" max="90" step="5" value={val('typewriterPos')} onChange={(e) => put('typewriterPos', Number(e.target.value))} />
          </label>
          {check('highlightCurrentLine', t('ui.edit.highlightLine'))}
          <div className="row">
            {number('caretWidth', t('ui.edit.caretWidth'), { min: 1, max: 8, suffix: 'px' })}
            {number('caretBlinkMs', t('ui.edit.caretBlinkMs'), { min: 300, max: 3000, step: 100, suffix: 'ms' })}
          </div>
          {check('caretBlink', t('ui.edit.caretBlink'))}
          {number('endSpace', t('ui.edit.endSpace'), { min: 0, max: 100, step: 5, suffix: '%' })}
          {check('dragSelectWords', t('ui.edit.dragWords'))}
          {check('autoPairBrackets', t('ui.edit.pairBrackets'))}
          {check('autoPairQuotes', t('ui.edit.pairQuotes'))}
          {check('showInvisibles', t('set.showInvisibles'))}
          {check('autoBacklinks', t('set.autoBacklinks'))}
        </fieldset>
        <fieldset>
          <legend>{t('ui.edit.newDocs')}</legend>
          {number('defaultZoom', t('ui.edit.defaultZoom'), { min: 50, max: 400, step: 10, suffix: '%' })}
          <div className="row">
            <label>
              {t('ui.edit.docTitle')}
              <input value={val('defaultDocTitle')} placeholder={t('cmd.newText')} onChange={(e) => put('defaultDocTitle', e.target.value)} />
            </label>
            <label>
              {t('ui.edit.folderTitle')}
              <input value={val('defaultFolderTitle')} placeholder={t('cmd.newFolder')} onChange={(e) => put('defaultFolderTitle', e.target.value)} />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('ui.edit.autocomplete')}</legend>
          {number('acMinLetters', t('ui.edit.acMin'), { min: 1, max: 10 })}
          {check('acTitles', t('ui.edit.acTitles'))}
        </fieldset>
      </>
    ),
    formatting: (
      <>
        <fieldset>
          <legend>{t('ui.edit.defaultPara')}</legend>
          <div className="row">
            <label>
              {t('ui.edit.units')}
              <select value={unit} onChange={(e) => put('rulerUnits', e.target.value)}>
                <option value="cm">{t('ui.edit.unit.cm')}</option>
                <option value="in">{t('ui.edit.unit.in')}</option>
                <option value="pt">{t('ui.edit.unit.pt')}</option>
              </select>
            </label>
            <label>
              {t('ui.edit.align')}
              <select value={align} onChange={(e) => put('paraAlign', e.target.value)}>
                <option value="">{t('ui.edit.alignLeft')}</option>
                <option value="center">{t('ui.edit.alignCenter')}</option>
                <option value="right">{t('ui.edit.alignRight')}</option>
                <option value="justify">{t('ui.edit.alignJustify')}</option>
              </select>
            </label>
          </div>
          <MiniRuler unit={unit} left={Number(val('paraIndentLeft')) || 0} right={Number(val('paraIndentRight')) || 0} first={Number(val('paragraphIndent')) || 0} tabs={parseTabs(val('paraTabs'), unit)} />
          <div className="para-preview" aria-label={t('ui.edit.preview')}>
            <p style={previewStyle}>{t('ui.edit.previewText')}</p>
            <p style={previewStyle}>{t('ui.edit.previewText2')}</p>
          </div>
          <div className="row">
            {lengthInput('paraIndentLeft', t('ui.edit.indentLeft'))}
            {lengthInput('paraIndentRight', t('ui.edit.indentRight'))}
            {lengthInput('paragraphIndent', t('set.paraIndent'))}
          </div>
          <div className="row">
            {lengthInput('paraSpaceBefore', t('ui.edit.spaceBefore'))}
            {lengthInput('paragraphSpacing', t('set.paraSpacing'))}
            <label>
              {t('ui.edit.tabs', { unit })}
              <input value={val('paraTabs')} onChange={(e) => put('paraTabs', e.target.value)} placeholder="1.25, 2.5" style={{ width: 120 }} />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('ui.edit.fonts')}</legend>
          <div className="row">
            {fontSelect('notesFont', t('ui.edit.notesFont'))}
            {number('notesFontSize', t('ui.edit.size'), { min: 0, max: 40, suffix: 'px' })}
          </div>
          <div className="row">
            {fontSelect('annotFont', t('ui.edit.annotFont'))}
            {number('annotFontSize', t('ui.edit.size'), { min: 0, max: 40, suffix: 'px' })}
          </div>
          <p className="muted small">{t('ui.edit.sizeZero')}</p>
        </fieldset>
        {check('pasteDefaultFormat', t('ui.edit.pasteDefault'))}
        {onConvertFormatting && (
          <div className="row">
            <button
              onClick={async () => {
                if (!window.confirm(t('ui.edit.convertConfirm'))) return;
                setConvertMsg(t('ui.edit.converting'));
                try {
                  const n = await onConvertFormatting();
                  setConvertMsg(t('ui.edit.converted', { n }));
                } catch (e) {
                  setConvertMsg(e.message);
                }
              }}
            >
              {t('ui.edit.convertAll')}
            </button>
            {convertMsg && <span className="muted small" role="status">{convertMsg}</span>}
          </div>
        )}
      </>
    ),
    revisions: (
      <>
        {check('revisionStrikeDeletions', t('ui.edit.strikeDeletions'))}
        <fieldset>
          <legend>{t('ui.edit.roundNames')}</legend>
          {names.map((n, i) => (
            <div className="row" key={i} style={{ alignItems: 'center' }}>
              <span className="rev-swatch" style={{ background: colors[i] || 'currentColor' }} aria-hidden="true" />
              <label>
                {t('ui.edit.roundN', { n: i + 1 })}
                <input value={n} placeholder={t('ui.formatBar.revisionRound', { n: i + 1 })} onChange={(e) => put('revisionNames', names.map((x, j) => (j === i ? e.target.value : x)))} />
              </label>
            </div>
          ))}
        </fieldset>
      </>
    ),
  };

  return (
    <div className="editing-pane">
      <div className="tabs subtabs" role="tablist" aria-label={t('set.tab.editing')}>
        {SUBTABS.map((k) => (
          <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'primary' : ''} onClick={() => setSub(k)}>
            {t(`ui.edit.tab.${k}`)}
          </button>
        ))}
      </div>
      <div role="tabpanel">{panes[sub]}</div>
    </div>
  );
}
