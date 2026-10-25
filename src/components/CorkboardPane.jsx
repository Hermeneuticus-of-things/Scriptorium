import React from 'react';
import { t } from '../lib/i18n.js';
import { CORK_DEFAULTS, corkOptions } from './Corkboard.jsx';

// Options > Corkboard: global defaults for every board. A folder keeps only what it changes
// in its own bar, so everything else here applies to all boards at once.
export default function CorkboardPane({ value, onChange }) {
  const c = corkOptions(value, null);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) || 0 : e.target.value;
    onChange({ ...(value || {}), [k]: v });
  };
  const check = (k, label) => (
    <label className="check">
      <input type="checkbox" checked={Boolean(c[k])} onChange={set(k)} /> {label}
    </label>
  );
  return (
    <div className="cork-pane">
      <p className="muted">{t('ui.cork2.intro')}</p>
      <fieldset>
        <legend>{t('ui.cork2.cards')}</legend>
        <label>
          {t('ui.corkboard.marimea_fiselor')}
          <select value={c.size} onChange={set('size')}>
            <option value="mic">{t('ui.corkboard.fise_mici')}</option>
            <option value="mediu">{t('ui.corkboard.fise_medii')}</option>
            <option value="mare">{t('ui.corkboard.fise_mari')}</option>
          </select>
        </label>
        <label>
          {t('ui.corkboard.proportie')}
          <select value={c.ratio} onChange={set('ratio')}>
            <option value="3:5">{t('ui.corkboard.3_5_fisa')}</option>
            <option value="4:6">4 × 6</option>
            <option value="1:1">{t('ui.corkboard.patrat')}</option>
            <option value="4:3">{t('ui.corkboard.inalt')}</option>
          </select>
        </label>
        <label>
          {t('ui.corkboard.spatiere')}
          <input type="number" min="0" max="80" step="4" value={c.spacing} onChange={set('spacing')} />
        </label>
        <label>
          {t('ui.corkboard.cardShape')}
          <select value={c.shape} onChange={set('shape')}>
            <option value="rounded">{t('ui.corkboard.shapeRounded')}</option>
            <option value="square">{t('ui.corkboard.shapeSquare')}</option>
          </select>
        </label>
        {check('ruled', t('ui.corkboard.ruledCards'))}
        {check('labelFill', t('ui.corkboard.labelFill'))}
        <label>
          {t('ui.cork2.labelStyle')}
          <select value={c.labelStyle} onChange={set('labelStyle')}>
            <option value="top">{t('ui.cork2.labelTop')}</option>
            <option value="band">{t('ui.cork2.labelBand')}</option>
            <option value="pin">{t('ui.cork2.labelPin')}</option>
            <option value="none">{t('ui.cork2.labelNone')}</option>
          </select>
        </label>
        {check('pins', t('ui.cork2.pins'))}
        {check('statusStamp', t('ui.cork2.statusStamp'))}
        <label>
          {t('ui.cork2.stampOpacity')} ({c.stampOpacity}%)
          <input type="range" min="5" max="100" step="5" value={c.stampOpacity} disabled={!c.statusStamp} onChange={set('stampOpacity')} />
        </label>
        {check('showIcon', t('ui.cork2.showIcon'))}
        {check('showWords', t('ui.cork2.showWords'))}
        {check('keywordStrips', t('ui.corkboard.benzi_cuvinte_cheie'))}
        <label>
          {t('ui.cork2.synopsisLines')}
          <input type="number" min="0" max="30" value={c.synopsisLines} onChange={set('synopsisLines')} />
        </label>
        {check('showImages', t('ui.cork2.showImages'))}
      </fieldset>
      <fieldset>
        <legend>{t('ui.cork2.freeform')}</legend>
        {check('snapGrid', t('ui.cork2.snapGrid'))}
        <label>
          {t('ui.cork2.gridSize')}
          <input type="number" min="4" max="200" step="4" value={c.gridSize} onChange={set('gridSize')} />
        </label>
        {check('showGrid', t('ui.cork2.showGrid'))}
      </fieldset>
      <fieldset>
        <legend>{t('ui.common.linii')}</legend>
        <label>
          {t('ui.cork2.linesDir')}
          <select value={c.linesDir} onChange={set('linesDir')}>
            <option value="rows">{t('ui.cork2.linesRows')}</option>
            <option value="columns">{t('ui.cork2.linesCols')}</option>
          </select>
        </label>
        <label>
          {t('ui.cork2.stack')}
          <select value={c.stack} onChange={set('stack')}>
            <option value="grouped">{t('ui.cork2.stackGrouped')}</option>
            <option value="continuous">{t('ui.cork2.stackContinuous')}</option>
          </select>
        </label>
      </fieldset>
      <button onClick={() => onChange({})} disabled={!value || Object.keys(value).length === 0}>{t('ui.cork2.reset')}</button>
    </div>
  );
}

export { CORK_DEFAULTS };
