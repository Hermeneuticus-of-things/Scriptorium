// Options > Appearance: a list of sections on the left (interface, editor, binder, corkboard,
// outliner, composition, script, inspector, scrivenings, annotations) and the options of the
// chosen section on the right, plus colour themes that can be saved, loaded, exported and imported.
// Every colour has its own "Default" button and a preview swatch; '' means "from the theme".
import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, SCRIPT_ELEMENTS, themeFromSettings, parseTheme } from '../lib/settingsDefaults.js';
import { downloadText, themeFileName } from '../lib/appearance.js';
import { t } from '../lib/i18n.js';

export const FONTS = [
  ['Georgia, serif', 'Georgia'],
  ["'Times New Roman', serif", 'Times New Roman'],
  ["'Palatino Linotype', Palatino, serif", 'Palatino'],
  ['Garamond, serif', 'Garamond'],
  ['Arial, sans-serif', 'Arial'],
  ["'Segoe UI', system-ui, sans-serif", 'Segoe UI'],
  ["'Courier New', monospace", 'Courier New'],
];

// "All to default" resets colours and fonts, not the theme, the interface style or text sizes.
const KEEP_ON_RESET = ['theme', 'uiStyle', 'editorFont', 'fontSize', 'lineHeight', 'pageWidth', 'binderFontSize', 'compBg', 'compFade', 'compPaper'];

export const SECTIONS = ['general', 'editor', 'binder', 'corkboard', 'outliner', 'composition', 'script', 'inspector', 'scrivenings', 'annotations'];

/** Colour field with preview and per-colour "Default". `fallback` is what the picker shows for ''. */
function ColorField({ label, value, fallback = '#888888', onChange }) {
  return (
    <label className="look-color">
      <span className="look-color-label">{label}</span>
      <span className="row">
        <span className={`look-swatch ${value ? '' : 'is-default'}`} style={value ? { background: value } : undefined} title={value || t('ui.look.din_tema')} aria-hidden="true" />
        <input type="color" aria-label={label} value={value || fallback} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="link" disabled={!value} onClick={() => onChange('')}>{t('btn.default')}</button>
      </span>
    </label>
  );
}

function FontField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('ui.look.din_tema')}</option>
        {value && !FONTS.some(([v]) => v === value) && <option value={value}>{value}</option>}
        {FONTS.map(([v, n]) => <option key={v} value={v} style={{ fontFamily: v }}>{n}</option>)}
      </select>
    </label>
  );
}

export default function AppearancePane({ s, setS, set, comp, setComp, pickBgImage, api, onError }) {
  const [section, setSection] = useState('general');
  const [themeName, setThemeName] = useState('');
  const [themeSel, setThemeSel] = useState('');
  const [msg, setMsg] = useState('');
  const [displays, setDisplays] = useState(null);
  const importRef = useRef(null);
  const up = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const num = (k, attrs) => <input type="number" {...attrs} value={s[k] ?? ''} onChange={(e) => up(k)(e.target.value)} />;
  const chk = (k, label) => (
    <label className="check">
      <input type="checkbox" checked={Boolean(s[k])} onChange={(e) => up(k)(e.target.checked)} /> {label}
    </label>
  );
  const color = (k, label, fallback) => <ColorField label={label} value={s[k] || ''} fallback={fallback} onChange={up(k)} />;
  const font = (k, label) => <FontField label={label} value={s[k]} onChange={up(k)} />;

  useEffect(() => {
    if (section === 'composition' && api?.listDisplays && !displays) api.listDisplays().then(setDisplays).catch(() => setDisplays([]));
  }, [section]);

  // ---- colour themes ----
  const saved = Array.isArray(s.savedThemes) ? s.savedThemes : [];
  const current = () => themeFromSettings(themeName, { ...s, compBg: comp.bg, compFade: comp.fade, compPaper: comp.paper });
  const applyTheme = (th) => {
    const { values } = parseTheme(th);
    setS((p) => ({ ...p, ...values }));
    setComp((c) => ({ ...c, ...(values.compBg !== undefined ? { bg: values.compBg } : {}), ...(values.compFade !== undefined ? { fade: values.compFade } : {}), ...(values.compPaper !== undefined ? { paper: values.compPaper } : {}) }));
  };
  const saveTheme = () => {
    const name = themeName.trim();
    if (!name) return setMsg(t('ui.look.nume_tema_lipsa'));
    const th = current();
    setS((p) => ({ ...p, savedThemes: [...(p.savedThemes || []).filter((x) => x.name !== name), th] }));
    setThemeSel(name);
    setMsg(t('ui.look.tema_salvata', { name }));
  };
  const loadTheme = () => {
    const th = saved.find((x) => x.name === themeSel);
    if (!th) return;
    applyTheme(th);
    setThemeName(th.name);
    setMsg(t('ui.look.tema_incarcata', { name: th.name }));
  };
  const deleteTheme = () => {
    setS((p) => ({ ...p, savedThemes: (p.savedThemes || []).filter((x) => x.name !== themeSel) }));
    setThemeSel('');
  };
  const exportTheme = () => {
    const th = current();
    downloadText(themeFileName(th.name), JSON.stringify(th, null, 2));
  };
  const importTheme = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const th = parseTheme(String(r.result));
        applyTheme({ values: th.values, name: th.name });
        setThemeName(th.name);
        setS((p) => ({ ...p, savedThemes: [...(p.savedThemes || []).filter((x) => x.name !== th.name), { format: 'pneuma-theme', version: 1, ...th }] }));
        setThemeSel(th.name);
        setMsg(t('ui.look.tema_importata', { name: th.name }));
      } catch {
        onError?.(new Error(t('ui.look.fisier_tema_invalid')));
      }
    };
    r.readAsText(file);
  };
  const resetAll = () => {
    setS((p) => {
      const out = { ...p };
      for (const k of Object.keys(themeFromSettings('', DEFAULT_SETTINGS).values)) {
        if (KEEP_ON_RESET.includes(k)) continue;
        const d = DEFAULT_SETTINGS[k];
        out[k] = Array.isArray(d) ? [...d] : d && typeof d === 'object' ? { ...d } : d;
      }
      return out;
    });
    setMsg(t('ui.look.culori_resetate'));
  };

  const panes = {
    general: (
      <>
        <label>
          {t('set.theme')}
          <select value={s.theme} onChange={set('theme')}>
            {['system', 'light', 'dark', 'sepia'].map((x) => <option key={x} value={x}>{t(`set.theme.${x}`)}</option>)}
          </select>
        </label>
        <label>
          {t('ui.settingsDialog.aspect_interfata')}
          <select value={s.uiStyle} onChange={set('uiStyle')}>
            <option value="classic">{t('ui.look.clasic')}</option>
            <option value="modern">Modern</option>
          </select>
        </label>
        <div className="row">
          <label>
            {t('set.editorFont')}
            <select value={s.editorFont} onChange={set('editorFont')}>
              {!FONTS.some(([v]) => v === s.editorFont) && <option value={s.editorFont}>{s.editorFont}</option>}
              {FONTS.map(([v, n]) => <option key={v} value={v} style={{ fontFamily: v }}>{n}</option>)}
            </select>
          </label>
          <label>
            {t('set.fontSize')}
            <input type="number" min="12" max="32" value={s.fontSize} onChange={set('fontSize')} />
          </label>
        </div>
        <div className="row">
          <label>
            {t('set.lineHeight')}
            <input type="number" min="1" max="3" step="0.1" value={s.lineHeight} onChange={set('lineHeight')} />
          </label>
          <label>
            {t('set.pageWidth')}
            <input type="number" min="25" max="120" value={s.pageWidth} onChange={set('pageWidth')} />
          </label>
        </div>
        <div className="row">
          <label>
            {t('ui.look.icoane_bara')}
            <select value={s.toolbarIconSize || 'medium'} onChange={(e) => up('toolbarIconSize')(e.target.value)}>
              {['small', 'medium', 'large'].map((x) => <option key={x} value={x}>{t(`ui.look.marime_${x}`)}</option>)}
            </select>
          </label>
          <label>
            {t('ui.look.densitate')}
            <select value={s.uiDensity || 'normal'} onChange={(e) => up('uiDensity')(e.target.value)}>
              <option value="normal">{t('ui.look.densitate_normala')}</option>
              <option value="compact">{t('ui.look.densitate_compacta')}</option>
            </select>
          </label>
        </div>
        <div className="look-grid">
          <ColorField label={t('set.accent')} value={s.accentColor || ''} fallback="#8a5a2b" onChange={up('accentColor')} />
          <ColorField label={t('ui.settings.commentColor')} value={s.commentColor || ''} fallback="#f5d76e" onChange={up('commentColor')} />
        </div>
        <fieldset className="revision-colors">
          <legend>{t('ui.settings.revisionColors')}</legend>
          <div className="row">
            {s.revisionColors.map((c, i) => (
              <label key={i} className="rev-color">
                {t('ui.settings.revisionRound', { n: i + 1 })}
                <input type="color" aria-label={t('ui.settings.revisionRound', { n: i + 1 })} value={c} onChange={(e) => setS((p) => ({ ...p, revisionColors: p.revisionColors.map((x, k) => (k === i ? e.target.value : x)) }))} />
              </label>
            ))}
            <button onClick={() => setS((p) => ({ ...p, revisionColors: [...DEFAULT_SETTINGS.revisionColors] }))}>{t('btn.default')}</button>
          </div>
        </fieldset>
      </>
    ),
    editor: (
      <>
        <div className="look-grid">
          {color('edBg', t('ui.look.ed_fundal'), '#fffdf8')}
          {color('edText', t('ui.look.ed_text'), '#2a2723')}
          {color('edSel', t('ui.look.ed_selectie'), '#b4d5fe')}
          {color('edCaret', t('ui.look.ed_cursor'), '#2a2723')}
          {color('pageViewPaper', t('ui.look.pv_pagina'), '#ffffff')}
          {color('pageViewSurround', t('ui.look.pv_jur'), '#e6e6e6')}
          {color('linkInternal', t('ui.look.link_intern'), '#8a5a2b')}
          {color('linkExternal', t('ui.look.link_extern'), '#1565c0')}
          {color('keepFormatColor', t('ui.look.pastreaza_formatarea'), '#e8eef7')}
          {color('searchHitColor', t('ui.look.rezultate_cautare'), '#ffe066')}
        </div>
        <fieldset>
          <legend>{t('ui.look.linia_curenta')}</legend>
          {chk('curLine', t('ui.look.evidentiaza_linia'))}
          <div className="row">
            {color('curLineColor', t('ui.look.culoare_linie'), '#e3ecfa')}
            <label>
              {t('ui.look.opacitate_linie')}
              {num('curLineOpacity', { min: 5, max: 100, step: 5 })}
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('ui.look.masina_de_scris')}</legend>
          {chk('typewriter', t('set.typewriter'))}
          <label>
            {t('ui.look.pozitia_liniei', { n: s.typewriterPos ?? 50 })}
            <input type="range" min="10" max="90" step="5" value={s.typewriterPos ?? 50} onChange={(e) => up('typewriterPos')(Number(e.target.value))} />
          </label>
        </fieldset>
      </>
    ),
    binder: (
      <>
        <div className="row">
          {font('binderFont', t('ui.look.font_binder'))}
          <label>
            {t('set.binderFontSize')}
            <input type="number" min="10" max="22" value={s.binderFontSize} onChange={set('binderFontSize')} />
          </label>
        </div>
        <div className="look-grid">
          {color('binderBg', t('ui.look.fundal'), '#ecE8df')}
          {color('binderText', t('ui.look.text'), '#2a2723')}
        </div>
        {chk('binderAltRows', t('ui.look.randuri_alternante'))}
        {s.binderAltRows && color('binderAltColor', t('ui.look.culoare_alternanta'), '#f0ece4')}
        <label>
          {t('ui.look.culoare_eticheta')}
          <select value={s.binderLabelMode || 'dot'} onChange={(e) => up('binderLabelMode')(e.target.value)}>
            {['dot', 'row', 'none'].map((x) => <option key={x} value={x}>{t(`ui.look.eticheta_${x}`)}</option>)}
          </select>
        </label>
        <label>
          {t('ui.look.dosare_stil')}
          <select value={s.binderContainerStyle || 'normal'} onChange={(e) => up('binderContainerStyle')(e.target.value)}>
            {['normal', 'bold', 'italic', 'bolditalic'].map((x) => <option key={x} value={x}>{t(`ui.look.stil_${x}`)}</option>)}
          </select>
        </label>
      </>
    ),
    corkboard: (
      <>
        <label>
          {t('ui.look.fundal_panou')}
          <select value={s.corkBg || 'default'} onChange={(e) => up('corkBg')(e.target.value)}>
            {['default', 'cork', 'wood', 'linen', 'color', 'image'].map((x) => <option key={x} value={x}>{t(`ui.look.cork_${x}`)}</option>)}
          </select>
        </label>
        {s.corkBg === 'color' && color('corkBgColor', t('ui.look.culoare_fundal'), '#b98f5f')}
        {s.corkBg === 'image' && (
          <label>
            {t('ui.look.imagine_proprie')}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                if (f.size > 4 * 1024 * 1024) return onError?.(new Error(t('ui.settingsDialog.imaginea_e_prea_mare_maxim')));
                const r = new FileReader();
                r.onload = () => up('corkBgImage')(String(r.result));
                r.readAsDataURL(f);
              }}
            />
          </label>
        )}
        <div className="look-grid">
          {color('cardColor', t('ui.look.culoare_fise'), '#fffef6')}
          {color('cardTitleColor', t('ui.look.culoare_titlu_fisa'), '#2a2723')}
        </div>
        <div className="row">
          {font('cardTitleFont', t('ui.look.font_titlu'))}
          {font('cardSynopsisFont', t('ui.look.font_sinopsis'))}
        </div>
      </>
    ),
    outliner: (
      <>
        {chk('outAltRows', t('ui.look.randuri_alternante'))}
        <div className="look-grid">
          {s.outAltRows && color('outAltColor', t('ui.look.culoare_alternanta'), '#f3f0ea')}
          {color('outGridColor', t('ui.look.culoare_grila'), '#d9d3c7')}
          {color('outFolderColor', t('ui.look.randuri_dosar'), '#efe8db')}
        </div>
        <div className="row">
          {font('outTitleFont', t('ui.look.font_titlu'))}
          {font('outSynopsisFont', t('ui.look.font_sinopsis'))}
        </div>
      </>
    ),
    composition: (
      <>
        <fieldset>
          <legend>{t('set.composition')}</legend>
          <div className="row">
            <label>
              {t('set.compBg')}
              <input type="color" value={comp.bg || '#1d1c1a'} onChange={(e) => setComp((c) => ({ ...c, bg: e.target.value }))} />
            </label>
            <label>
              {t('set.compWidth')}
              <input type="number" min="25" max="80" value={comp.width} onChange={(e) => setComp((c) => ({ ...c, width: e.target.value }))} />
            </label>
            <label>
              {t('set.compFade')}
              <input type="number" min="0" max="100" step="5" value={comp.fade} onChange={(e) => setComp((c) => ({ ...c, fade: e.target.value }))} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={comp.paper} onChange={(e) => setComp((c) => ({ ...c, paper: e.target.checked }))} /> {t('set.compPaper')}
          </label>
          {comp.bg && <button className="link" onClick={() => setComp((c) => ({ ...c, bg: '' }))}>{t('set.compBgDefault')}</button>}
          <div className="row comp-bg-image">
            <label>
              {t('ui.look.imagine_fundal')}
              <input type="file" accept="image/*" onChange={pickBgImage} />
            </label>
            {comp.bgImage && (
              <>
                <span className="comp-bg-thumb" style={{ backgroundImage: `url("${comp.bgImage}")` }} aria-label={t('ui.look.previzualizare_fundal')} />
                <select value={comp.bgImageFit} onChange={(e) => setComp((c) => ({ ...c, bgImageFit: e.target.value }))}>
                  <option value="cover">{t('ui.look.umple')}</option>
                  <option value="contain">{t('ui.settingsDialog.incadreaza')}</option>
                  <option value="tile">{t('ui.settingsDialog.repeta')}</option>
                  <option value="center">{t('ui.look.centrat')}</option>
                </select>
                <button className="link" onClick={() => setComp((c) => ({ ...c, bgImage: '' }))}>{t('ui.settingsDialog.fara_imagine')}</button>
              </>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={comp.showTargets} onChange={(e) => setComp((c) => ({ ...c, showTargets: e.target.checked }))} /> {t('ui.settingsDialog.arata_tinta_document_si_sesiune')}
          </label>
        </fieldset>
        <div className="look-grid">
          {color('compTextColor', t('ui.look.comp_text'), '#2a2723')}
          {color('compPageColor', t('ui.look.comp_pagina'), '#fffdf8')}
          {color('compBarColor', t('ui.look.comp_bara'), '#181715')}
        </div>
        <fieldset>
          <legend>{t('ui.look.comp_optiuni')}</legend>
          {chk('compBarAutoHide', t('ui.look.bara_ascunsa'))}
          <label>
            {t('ui.look.bara_intarziere')}
            {num('compBarDelay', { min: 0, max: 5000, step: 100, disabled: s.compBarAutoHide === false })}
          </label>
          <div className="row">
            <label>
              {t('ui.look.comp_zoom')}
              <select value={Number(s.compZoom) ? String(s.compZoom) : '0'} onChange={(e) => up('compZoom')(Number(e.target.value))}>
                <option value="0">{t('ui.look.ca_editorul')}</option>
                {[75, 100, 125, 150, 175, 200, 250, 300].map((z) => <option key={z} value={String(z)}>{z}%</option>)}
                {Number(s.compZoom) && ![75, 100, 125, 150, 175, 200, 250, 300].includes(Number(s.compZoom)) ? <option value={String(s.compZoom)}>{s.compZoom}%</option> : null}
              </select>
            </label>
            <label>
              {t('ui.look.margine_sus_jos')}
              {num('compPadY', { min: 0, max: 300, step: 4 })}
            </label>
            <label>
              {t('ui.look.margine_laterala')}
              {num('compPadX', { min: 0, max: 300, step: 4 })}
            </label>
          </div>
          {chk('compTypewriter', t('ui.look.comp_masina'))}
          {chk('compScrollbar', t('ui.look.comp_bara_derulare'))}
          {chk('compHideCursor', t('ui.look.comp_ascunde_mouse'))}
          <label>
            {t('ui.look.comp_monitor')}
            <select value={String(s.compDisplay ?? -1)} onChange={(e) => up('compDisplay')(Number(e.target.value))} disabled={!api?.listDisplays}>
              <option value="-1">{t('ui.look.monitor_curent')}</option>
              {(displays || []).map((d) => (
                <option key={d.index} value={String(d.index)}>
                  {t('ui.look.monitor_n', { n: d.index + 1 })} {d.width}×{d.height}{d.primary ? ` (${t('ui.look.principal')})` : ''}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>{t('ui.look.comp_inspector')}</legend>
          <label>
            {t('ui.look.inspector_opacitate')}
            {num('compInspOpacity', { min: 20, max: 100, step: 5 })}
          </label>
          <div className="row">
            {chk('compInspSynopsis', t('ui.look.insp_sinopsis'))}
            {chk('compInspMeta', t('ui.look.insp_meta'))}
            {chk('compInspNotes', t('ui.look.insp_note'))}
          </div>
        </fieldset>
      </>
    ),
    script: (
      <>
        <p className="muted small">{t('ui.look.script_info')}</p>
        <div className="look-grid">
          {SCRIPT_ELEMENTS.map((el) => (
            <ColorField
              key={el}
              label={t(`ui.look.script_${el.replace('-', '_')}`)}
              value={(s.scriptColors || {})[el] || ''}
              fallback="#2a2723"
              onChange={(v) => setS((p) => ({ ...p, scriptColors: { ...(p.scriptColors || {}), [el]: v } }))}
            />
          ))}
        </div>
      </>
    ),
    inspector: (
      <>
        <div className="row">
          {font('inspNotesFont', t('ui.look.font_note'))}
          {font('inspSynopsisFont', t('ui.look.font_sinopsis'))}
        </div>
        {color('inspNotesBg', t('ui.look.fundal_note'), '#fffdf8')}
      </>
    ),
    scrivenings: (
      <>
        {font('scrivTitleFont', t('ui.look.font_titluri_doc'))}
        <div className="row">
          {color('scrivSepColor', t('ui.look.culoare_separator'), '#d9d3c7')}
          <label>
            {t('ui.look.stil_separator')}
            <select value={s.scrivSepStyle || 'dashed'} onChange={(e) => up('scrivSepStyle')(e.target.value)}>
              {['dashed', 'solid', 'dotted', 'double', 'none'].map((x) => <option key={x} value={x}>{t(`ui.look.linie_${x}`)}</option>)}
            </select>
          </label>
        </div>
      </>
    ),
    annotations: (
      <div className="row">
        {font('annotFont', t('ui.look.font_adnotari'))}
        <label>
          {t('ui.look.marime_adnotari')}
          {num('annotSize', { min: 0, max: 30, placeholder: t('ui.look.din_tema') })}
        </label>
      </div>
    ),
  };

  return (
    <div className="appearance-pane">
      <div className="look-themes row" role="group" aria-label={t('ui.look.teme')}>
        <input aria-label={t('ui.look.nume_tema')} placeholder={t('ui.look.nume_tema')} value={themeName} onChange={(e) => setThemeName(e.target.value)} />
        <button onClick={saveTheme}>{t('ui.look.salveaza_tema')}</button>
        <select aria-label={t('ui.look.teme_salvate')} value={themeSel} onChange={(e) => setThemeSel(e.target.value)}>
          <option value="">{t('ui.look.teme_salvate')}</option>
          {saved.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
        </select>
        <button onClick={loadTheme} disabled={!themeSel}>{t('ui.look.incarca_tema')}</button>
        <button onClick={deleteTheme} disabled={!themeSel}>{t('btn.delete')}</button>
        <button onClick={exportTheme}>{t('ui.look.exporta_tema')}</button>
        <button onClick={() => importRef.current?.click()}>{t('ui.look.importa_tema')}</button>
        <input ref={importRef} type="file" accept=".scribnertheme,.json,application/json" hidden onChange={importTheme} />
        <button className="link" onClick={resetAll}>{t('ui.look.toate_implicit')}</button>
      </div>
      {msg && <p className="muted small" role="status">{msg}</p>}
      <div className="look-body">
        <ul className="look-sections" aria-label={t('ui.look.sectiuni')}>
          {SECTIONS.map((k) => (
            <li key={k}>
              <button type="button" aria-current={section === k ? 'true' : undefined} data-look-section={k} className={section === k ? 'on' : ''} onClick={() => setSection(k)}>{t(`ui.look.sec_${k}`)}</button>
            </li>
          ))}
        </ul>
        <div className="look-section" aria-label={t(`ui.look.sec_${section}`)} data-section={section}>{panes[section]}</div>
      </div>
    </div>
  );
}
