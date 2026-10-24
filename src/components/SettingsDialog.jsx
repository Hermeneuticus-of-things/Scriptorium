import { LANG_NAMES } from '../lib/lookups.js';
import ServicesPanel from './ServicesPanel.jsx';
import React, { useState } from 'react';
import { DEFAULT_SETTINGS } from '../lib/settingsDefaults.js';
import { t, LANGUAGES } from '../lib/i18n.js';
import AI_PRESETS from '../../lib/aiPresets.json';

// Base URL is editable only for local / custom servers; cloud presets use their fixed URL.
const EDITABLE_URL = new Set(['ollama', 'lmstudio', 'custom']);

const TABS = ['general', 'appearance', 'behaviors', 'corrections', 'editing', 'sharing', 'backup', 'keyboard', 'ai', 'services', 'language'];
const TAB_FALLBACK = { sharing: 'Partajare' };
const tabLabel = (k) => {
  const v = t(`set.tab.${k}`);
  return !v || v === `set.tab.${k}` ? TAB_FALLBACK[k] || k : v;
};
const FONTS = [
  ['Georgia, serif', 'Georgia'],
  ["'Times New Roman', serif", 'Times New Roman'],
  ["'Palatino Linotype', Palatino, serif", 'Palatino'],
  ['Garamond, serif', 'Garamond'],
  ['Arial, sans-serif', 'Arial'],
  ["'Segoe UI', system-ui, sans-serif", 'Segoe UI'],
  ["'Courier New', monospace", 'Courier New'],
];

export default function SettingsDialog({ api, settings, project, dir, onProjectChange, onClose, onError, onShortcuts, initialTab }) {
  const init = { ...DEFAULT_SETTINGS, ...settings };
  const [tab, setTab] = useState(() => (TABS.includes(initialTab) ? initialTab : 'general'));
  const [s, setS] = useState({
    language: init.language,
    reopenLastProject: init.reopenLastProject !== false,
    autosaveSec: init.autosaveSec,
    checkUpdates: Boolean(init.checkUpdates),
    theme: init.theme || 'system',
    uiStyle: init.uiStyle || 'classic',
    editorFont: init.editorFont,
    fontSize: init.fontSize || 18,
    lineHeight: init.lineHeight,
    pageWidth: init.pageWidth,
    binderFontSize: init.binderFontSize,
    accentColor: init.accentColor || '',
    binderEnter: init.binderEnter,
    binderDoubleClick: init.binderDoubleClick,
    typewriter: Boolean(init.typewriter),
    smartQuotes: init.smartQuotes !== false,
    smartDashes: init.smartDashes !== false,
    smartEllipsis: init.smartEllipsis !== false,
    smartFractions: Boolean(init.smartFractions),
    autoCapitalize: Boolean(init.autoCapitalize),
    spellLanguages: (init.spellLanguages || []).join(', '),
    autoReplacements: (init.autoReplacements || []).map((r) => ({ ...r })),
    paragraphIndent: init.paragraphIndent,
    paragraphSpacing: init.paragraphSpacing,
    defaultView: init.defaultView,
    showInvisibles: Boolean(init.showInvisibles),
    aiEnabled: init.aiEnabled !== false,
    backupOnClose: init.backupOnClose !== false,
    backupOnOpen: Boolean(init.backupOnOpen),
    backupZip: init.backupZip !== false,
    backupEveryMin: init.backupEveryMin || 0,
    backupKeep: init.backupKeep || 10,
    backupDir: init.backupDir || '',
  });
  const set = (k) => (e) => {
    const v = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setS((p) => ({ ...p, [k]: v }));
  };
  const [ai, setAi] = useState(() => {
    const provider = AI_PRESETS[init.aiProvider] ? init.aiProvider : 'anthropic';
    return { provider, model: init.aiModel || '', baseUrl: init.aiBaseUrl || '', notebookLmUrl: init.notebookLmUrl || '', translateFrom: init.translateFrom || 'auto', translateTo: init.translateTo || 'ro' };
  });
  const [aiKeys, setAiKeys] = useState({}); // provider -> key typed in this session (never read back)
  const [hasKeys, setHasKeys] = useState(() => ({ ...(init.hasKeys || {}), ...(init.hasKeys ? {} : { anthropic: Boolean(init.hasApiKey) }) }));
  const [aiTest, setAiTest] = useState(null); // {busy} | {ok, text}
  const aiPreset = AI_PRESETS[ai.provider] || AI_PRESETS.custom;
  const setAiProvider = (provider) => {
    const same = provider === (AI_PRESETS[init.aiProvider] ? init.aiProvider : 'anthropic');
    setAi((p) => ({ ...p, provider, model: same ? init.aiModel || '' : '', baseUrl: same ? init.aiBaseUrl || '' : '' }));
    setAiTest(null);
  };
  const aiPatch = () => {
    const patch = {
      aiProvider: ai.provider,
      aiModel: ai.model.trim(),
      aiBaseUrl: EDITABLE_URL.has(ai.provider) ? ai.baseUrl.trim() : '',
      notebookLmUrl: ai.notebookLmUrl.trim(),
      translateFrom: ai.translateFrom,
      translateTo: ai.translateTo,
    };
    const typed = Object.fromEntries(Object.entries(aiKeys).filter(([, k]) => k.trim()).map(([p, k]) => [p, k.trim()]));
    if (Object.keys(typed).length) patch.apiKeys = typed;
    return patch;
  };
  const deleteAiKey = async () => {
    try {
      await api.setSettings({ apiKeys: { [ai.provider]: '' } });
      setHasKeys((h) => ({ ...h, [ai.provider]: false }));
      setAiKeys((k) => ({ ...k, [ai.provider]: '' }));
    } catch (e) {
      onError(e);
    }
  };
  const testAi = async () => {
    if (!api.testAi) {
      setAiTest({ ok: false, text: t('ui.settingsDialog.testul_cere_aplicatia_desktop') });
      return;
    }
    setAiTest({ busy: true });
    try {
      const typed = (aiKeys[ai.provider] || '').trim();
      if (typed) {
        await api.setSettings({ apiKeys: { [ai.provider]: typed } });
        setHasKeys((h) => ({ ...h, [ai.provider]: true }));
        setAiKeys((k) => ({ ...k, [ai.provider]: '' }));
      }
      const r = await api.testAi({ provider: ai.provider, model: ai.model.trim(), baseUrl: EDITABLE_URL.has(ai.provider) ? ai.baseUrl.trim() : '' });
      setAiTest({ ok: true, text: t('ui.settingsDialog.conexiune_reusita_x_model_x', { label: r.label, model: r.model, ms: r.ms, reply: r.reply }) });
    } catch (e) {
      setAiTest({ ok: false, text: e.message });
    }
  };
  const [comp, setComp] = useState({
    bg: settings.compBg || '', width: settings.compWidth || 40, paper: settings.compPaper !== false, fade: settings.compFade || 100,
    bgImage: settings.compBgImage || '', bgImageFit: settings.compBgImageFit || 'cover', showTargets: Boolean(settings.compShowTargets),
  });
  const [sharing, setSharing] = useState({
    sync: { format: 'rtf', notesFormat: 'same', syncOnOpen: false, syncOnClose: false, includeNotes: true, ...(settings.sharingSync || {}) },
    export: { format: 'docx', includeNotes: false, includeMeta: false, keepFolders: true, ...(settings.sharingExport || {}) },
  });
  const setSync = (p) => setSharing((x) => ({ ...x, sync: { ...x.sync, ...p } }));
  const setExp = (p) => setSharing((x) => ({ ...x, export: { ...x.export, ...p } }));
  const pickBgImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      onError(new Error(t('ui.settingsDialog.imaginea_e_prea_mare_maxim')));
      return;
    }
    const r = new FileReader();
    r.onload = () => setComp((c) => ({ ...c, bgImage: String(r.result) }));
    r.readAsDataURL(file);
  };
  const [draft, setDraft] = useState(project?.targets?.draft || 0);
  const [session, setSession] = useState(project?.targets?.session || 0);
  const [edBase, setEdBase] = useState(project?.editorialProfile?.base || 'generic');
  const [edRules, setEdRules] = useState(project?.editorialProfile?.rules || {});
  const [edLimit, setEdLimit] = useState(project?.editorialProfile?.canvasWordLimit ?? 3000);
  const [mcp, setMcp] = useState(null);
  // Editorial word lists, per profile (settings.editorialLists[profileId]).
  const [edLists, setEdLists] = useState(() => {
    const src = settings.editorialLists || {};
    const out = {};
    for (const id of ['karma', 'generic']) {
      const l = src[id] || (src.forbidden || src.preferred ? src : {});
      out[id] = {
        forbidden: (l.forbidden || []).map((e) => `${e.word}${e.replacement ? ` => ${e.replacement}` : ''}${e.note ? ` # ${e.note}` : ''}`).join('\n'),
        preferred: (l.preferred || []).map((e) => `${e.word}${e.replacement ? ` <= ${e.replacement}` : ''}${e.note ? ` # ${e.note}` : ''}`).join('\n'),
        disabledWords: (l.disabledWords || []).join(', '),
        builtins: { ...(l.builtins || {}) },
      };
    }
    return out;
  });
  const edL = edLists[edBase] || edLists.karma;
  const setEdL = (k, v) => setEdLists((all) => ({ ...all, [edBase]: { ...all[edBase], [k]: v } }));

  const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);
  const editRepl = (i, k, v) => setS((p) => ({ ...p, autoReplacements: p.autoReplacements.map((r, j) => (j === i ? { ...r, [k]: v, learned: false } : r)) }));

  const save = async () => {
    try {
      const patch = {
        ...s,
        autosaveSec: Math.max(1, num(s.autosaveSec, 2)),
        fontSize: num(s.fontSize, 18) || 18,
        lineHeight: num(s.lineHeight, 1.6),
        pageWidth: num(s.pageWidth, 42),
        binderFontSize: num(s.binderFontSize, 14),
        spellLanguages: s.spellLanguages.split(',').map((x) => x.trim()).filter(Boolean),
        autoReplacements: s.autoReplacements.filter((r) => r.from && r.from.trim()),
        paragraphIndent: num(s.paragraphIndent, 0),
        paragraphSpacing: num(s.paragraphSpacing, 0.6),
        compBg: comp.bg,
        compWidth: Number(comp.width) || 40,
        compPaper: comp.paper,
        compFade: Number(comp.fade) || 100,
        compBgImage: comp.bgImage,
        compBgImageFit: comp.bgImageFit,
        compShowTargets: comp.showTargets,
        sharingSync: sharing.sync,
        sharingExport: sharing.export,
        backupEveryMin: Number(s.backupEveryMin) || 0,
        backupKeep: Math.max(1, Number(s.backupKeep) || 10),
      };
      const parseList = (txt, sep) =>
        String(txt || '').split('\n').map((ln) => ln.trim()).filter(Boolean).map((ln) => {
          const [main, ...note] = ln.split('#');
          const [word, replacement] = main.split(sep).map((x) => (x || '').trim());
          return { word, ...(replacement ? { replacement } : {}), ...(note.length ? { note: note.join('#').trim() } : {}) };
        }).filter((e) => e.word);
      patch.editorialLists = Object.fromEntries(Object.entries(edLists).map(([id, l]) => [id, {
        forbidden: parseList(l.forbidden, '=>'),
        preferred: parseList(l.preferred, '<='),
        disabledWords: l.disabledWords.split(',').map((x) => x.trim()).filter(Boolean),
        builtins: l.builtins,
      }]));
      Object.assign(patch, aiPatch());
      await api.setSettings(patch);
      if (project) {
        onProjectChange({
          ...project,
          targets: { ...(project.targets || {}), draft: Number(draft) || 0, session: Number(session) || 0 },
          editorialProfile: { ...(project.editorialProfile || {}), base: edBase, rules: edRules, canvasWordLimit: Number(edLimit) || 0 },
        });
      }
      onClose();
    } catch (e) {
      onError(e);
    }
  };

  const check = (k, label) => (
    <label className="check">
      <input type="checkbox" checked={Boolean(s[k])} onChange={set(k)} /> {label}
    </label>
  );

  const panes = {
    general: (
      <>
        {check('reopenLastProject', t('set.reopenLast'))}
        <label>
          {t('set.autosave')}
          <input type="number" min="1" max="120" value={s.autosaveSec} onChange={set('autosaveSec')} />
        </label>
        {check('checkUpdates', t('set.checkUpdates'))}
        {project && (
          <div className="row">
            <label>
              {t('set.targetDraft')}
              <input type="number" min="0" step="1000" value={draft} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <label>
              {t('set.targetSession')}
              <input type="number" min="0" step="100" value={session} onChange={(e) => setSession(e.target.value)} />
            </label>
          </div>
        )}
      </>
    ),
    appearance: (
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
            <option value="classic">{t('ui.settingsDialog.clasic_ca_scrivener_3')}</option>
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
          <label>
            {t('set.binderFontSize')}
            <input type="number" min="10" max="22" value={s.binderFontSize} onChange={set('binderFontSize')} />
          </label>
        </div>
        <label>
          {t('set.accent')}
          <div className="row">
            <input type="color" value={s.accentColor || '#8a5a2b'} onChange={set('accentColor')} />
            {s.accentColor && <button onClick={() => set('accentColor')('')}>{t('btn.default')}</button>}
          </div>
        </label>
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
              Imagine de fundal
              <input type="file" accept="image/*" onChange={pickBgImage} />
            </label>
            {comp.bgImage && (
              <>
                <span className="comp-bg-thumb" style={{ backgroundImage: `url("${comp.bgImage}")` }} aria-label="Previzualizare fundal" />
                <select value={comp.bgImageFit} onChange={(e) => setComp((c) => ({ ...c, bgImageFit: e.target.value }))}>
                  <option value="cover">Umple</option>
                  <option value="contain">{t('ui.settingsDialog.incadreaza')}</option>
                  <option value="tile">{t('ui.settingsDialog.repeta')}</option>
                  <option value="center">Centrat</option>
                </select>
                <button className="link" onClick={() => setComp((c) => ({ ...c, bgImage: '' }))}>{t('ui.settingsDialog.fara_imagine')}</button>
              </>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={comp.showTargets} onChange={(e) => setComp((c) => ({ ...c, showTargets: e.target.checked }))} /> {t('ui.settingsDialog.arata_tinta_document_si_sesiune')}
          </label>
        </fieldset>
      </>
    ),
    behaviors: (
      <>
        <label>
          {t('set.binderEnter')}
          <select value={s.binderEnter} onChange={set('binderEnter')}>
            {['edit', 'newDoc'].map((x) => <option key={x} value={x}>{t(`set.binderEnter.${x}`)}</option>)}
          </select>
        </label>
        <label>
          {t('set.binderDbl')}
          <select value={s.binderDoubleClick} onChange={set('binderDoubleClick')}>
            {['rename', 'openQuickRef'].map((x) => <option key={x} value={x}>{t(`set.binderDbl.${x}`)}</option>)}
          </select>
        </label>
        {check('typewriter', t('set.typewriter'))}
      </>
    ),
    corrections: (
      <>
        {check('smartQuotes', t('set.smartQuotes'))}
        {check('smartDashes', t('set.smartDashes'))}
        {check('smartEllipsis', t('set.smartEllipsis'))}
        {check('smartFractions', t('ui.settingsDialog.fractii_1_2_3_4'))}
        {check('autoCapitalize', t('set.autoCapitalize'))}
        <label>
          {t('set.spellLangs')}
          <input value={s.spellLanguages} onChange={set('spellLanguages')} placeholder="ro, en-US" />
        </label>
        {api.listDictionaryWords && <PersonalDictionary api={api} onError={onError} />}
        <fieldset>
          <legend>{t('set.replacements')}</legend>
          {check('learnCorrections', t('ui.settingsDialog.invata_corecturile'))}
          {s.autoReplacements.map((r, i) => (
            <div className="row" key={i}>
              <input aria-label={t('set.replaceFrom')} placeholder={t('set.replaceFrom')} value={r.from} onChange={(e) => editRepl(i, 'from', e.target.value)} />
              <input aria-label={t('set.replaceTo')} placeholder={t('set.replaceTo')} value={r.to} onChange={(e) => editRepl(i, 'to', e.target.value)} />
              {r.learned && <span className="muted small">{t('ui.settingsDialog.invatat')}</span>}
              <button onClick={() => setS((p) => ({ ...p, autoReplacements: p.autoReplacements.filter((_, j) => j !== i) }))}>{t('btn.remove')}</button>
            </div>
          ))}
          <button onClick={() => setS((p) => ({ ...p, autoReplacements: [...p.autoReplacements, { from: '', to: '' }] }))}>{t('btn.add')}</button>
        </fieldset>
      </>
    ),
    editing: (
      <>
        <div className="row">
          <label>
            {t('set.paraIndent')}
            <input type="number" min="0" max="5" step="0.5" value={s.paragraphIndent} onChange={set('paragraphIndent')} />
          </label>
          <label>
            {t('set.paraSpacing')}
            <input type="number" min="0" max="3" step="0.1" value={s.paragraphSpacing} onChange={set('paragraphSpacing')} />
          </label>
        </div>
        <label>
          {t('set.defaultView')}
          <select value={s.defaultView} onChange={set('defaultView')}>
            <option value="editor">{t('cmd.viewEditor')}</option>
            <option value="corkboard">{t('cmd.viewCorkboard')}</option>
            <option value="outline">{t('cmd.viewOutline')}</option>
          </select>
        </label>
        {check('showInvisibles', t('set.showInvisibles'))}
      </>
    ),
    backup: api.chooseBackupDir ? (
      <>
        {check('backupOnClose', t('set.backupOnClose'))}
        {check('backupOnOpen', t('ui.settingsDialog.backup_si_la_deschiderea_proiectului'))}
        {check('backupZip', t('ui.settingsDialog.backup_comprimat_zip_debifat_copie'))}
        <div className="row">
          <label>
            {t('set.backupEvery')}
            <input type="number" min="0" step="5" value={s.backupEveryMin} onChange={set('backupEveryMin')} />
          </label>
          <label>
            {t('set.backupKeep')}
            <input type="number" min="1" max="100" value={s.backupKeep} onChange={set('backupKeep')} />
          </label>
        </div>
        <label>
          {t('set.backupDir')}
          <div className="row">
            <input value={s.backupDir} readOnly placeholder={t('set.backupDirPh')} />
            <button onClick={async () => set('backupDir')((await api.chooseBackupDir()) || s.backupDir)}>{t('btn.choose')}</button>
            {s.backupDir && <button onClick={() => set('backupDir')('')}>{t('btn.default')}</button>}
          </div>
        </label>
      </>
    ) : null,
    keyboard: (
      <>
        <p className="muted small">{t('set.keyboardInfo')}</p>
        <button disabled={!onShortcuts} onClick={() => onShortcuts?.()}>{t('set.openShortcuts')}</button>
      </>
    ),
    ai: (
      <>
        {check('aiEnabled', t('set.aiEnabled'))}
        <fieldset>
          <legend>Furnizor AI</legend>
          <label>
            Furnizor
            <select value={ai.provider} onChange={(e) => setAiProvider(e.target.value)}>
              {Object.entries(AI_PRESETS).map(([id, p]) => (
                <option key={id} value={id}>{p.label}{hasKeys[id] ? ' ✓' : ''}</option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input value={ai.model} placeholder={aiPreset.defaultModel || aiPreset.modelHint} onChange={(e) => setAi((p) => ({ ...p, model: e.target.value }))} />
          </label>
          <p className="muted small">
            {aiPreset.defaultModel ? t('ui.settingsDialog.gol_x', { defaultModel: aiPreset.defaultModel }) : t('ui.settingsDialog.scrie_id_ul_exact_al')}
          </p>
          {aiPreset.kind !== 'anthropic' && (
            <label>
              {t('ui.settingsDialog.url_de_baza')}
              <input
                value={EDITABLE_URL.has(ai.provider) ? ai.baseUrl : aiPreset.baseUrl}
                placeholder={aiPreset.baseUrl || 'https://server/v1'}
                readOnly={!EDITABLE_URL.has(ai.provider)}
                onChange={(e) => setAi((p) => ({ ...p, baseUrl: e.target.value }))}
              />
            </label>
          )}
          <label>
            Cheie API {aiPreset.label} {hasKeys[ai.provider] ? t('set.apiKeySet') : aiPreset.needsKey ? '' : t('ui.settingsDialog.optionala')}
            <input
              type="password"
              autoComplete="off"
              placeholder={aiPreset.keyHint || ''}
              value={aiKeys[ai.provider] || ''}
              onChange={(e) => setAiKeys((k) => ({ ...k, [ai.provider]: e.target.value }))}
            />
          </label>
          <p className="muted small">{t('ui.settingsDialog.cheia_e_criptata_de_sistemul')}</p>
          <div className="row">
            <button onClick={testAi} disabled={aiTest?.busy}>{aiTest?.busy ? t('ui.settingsDialog.se_testeaza') : t('ui.settingsDialog.testeaza_conexiunea')}</button>
            {hasKeys[ai.provider] && (
              <button className="link" onClick={deleteAiKey}>{t('ui.settingsDialog.sterge_cheia')} {aiPreset.label}</button>
            )}
          </div>
          {aiTest && !aiTest.busy && <p className={aiTest.ok ? 'muted small' : 'warn'} role="status">{aiTest.text}</p>}
        </fieldset>
        <fieldset>
          <legend>NotebookLM</legend>
          <label>
            {t('ui.settingsDialog.link_notebook_notebooklm_optional')}
            <input
              type="url"
              value={ai.notebookLmUrl}
              placeholder="https://notebooklm.google.com/notebook/…"
              onChange={(e) => setAi((p) => ({ ...p, notebookLmUrl: e.target.value }))}
            />
          </label>
          <p className="muted small">{t('ui.settingsDialog.notebooklm_nu_are_api_public')}</p>
        </fieldset>
        {project && (
          <fieldset>
            <legend>{t('set.editorial')}</legend>
            <label>
              {t('set.edBase')}
              <select value={edBase} onChange={(e) => setEdBase(e.target.value)}>
                <option value="karma">{t('set.edBase.karma')}</option>
                <option value="generic">{t('set.edBase.generic')}</option>
              </select>
            </label>
            <label>
              {t('set.edLimit')}
              <input type="number" min="0" step="100" value={edLimit} onChange={(e) => setEdLimit(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(edRules.canvasHeader)} onChange={(e) => setEdRules((r) => ({ ...r, canvasHeader: e.target.checked }))} /> {t('set.edHeader')}
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(edRules.canvasFooter)} onChange={(e) => setEdRules((r) => ({ ...r, canvasFooter: e.target.checked }))} /> {t('set.edFooter')}
            </label>
          </fieldset>
        )}
        <fieldset>
          <legend>{t('ui.settingsDialog.editorial_liste_de_cuvinte_profil')} {edBase === 'generic' ? 'Generic' : t('ui.settingsDialog.romana')})</legend>
          <label>
            {t('ui.settingsDialog.cuvinte_interzise_cate_unul_pe')} <code>{t('ui.settingsDialog.cuvant_inlocuire_nota')}</code>
            <textarea rows={4} value={edL.forbidden} onChange={(e) => setEdL('forbidden', e.target.value)} placeholder={t('ui.settingsDialog.gest_fapta_urma_depunere_p3')} />
          </label>
          <label>
            Forme preferate: <code>{t('ui.settingsDialog.forma_preferata_varianta_evitata_alta')}</code>
            <textarea rows={4} value={edL.preferred} onChange={(e) => setEdL('preferred', e.target.value)} placeholder={t('ui.settingsDialog.randuiala_lumii_logica_interna')} />
          </label>
          <p className="muted small">{t('ui.settingsDialog.liste_incorporate_active')}</p>
          {[
            ['bannedAcademic', 'Lexic academic'],
            ['bannedTransitions', t('ui.settingsDialog.tranzitii_p9')],
            ['selfReference', t('ui.settingsDialog.autoreferinte_r7')],
            ['llmResidue', 'Reziduuri LLM P3'],
            ['passive', 'Pasive'],
            ['teleology', 'Teleologie'],
          ].map(([k, label]) => (
            <label key={k} className="check">
              <input type="checkbox" checked={edL.builtins[k] !== false} onChange={(e) => setEdL('builtins', { ...edL.builtins, [k]: e.target.checked })} /> {label}
            </label>
          ))}
          <label>
            {t('ui.settingsDialog.cuvinte_incorporate_dezactivate_separate_prin')}
            <input value={edL.disabledWords} onChange={(e) => setEdL('disabledWords', e.target.value)} placeholder="astfel, mai sus" />
          </label>
        </fieldset>
        {api.mcpInfo && dir && (
          <fieldset>
            <legend>{t('set.mcp')}</legend>
            <p className="muted small">{t('set.mcpInfo')}</p>
            <button onClick={async () => setMcp(await api.mcpInfo(dir))}>{t('set.mcpShow')}</button>
            {mcp && (
              <>
                <label>
                  Claude Code
                  <textarea readOnly rows={2} value={mcp.claudeCode} onFocus={(e) => e.target.select()} />
                </label>
                <label>
                  Claude Desktop (claude_desktop_config.json)
                  <textarea readOnly rows={7} value={mcp.desktopJson} onFocus={(e) => e.target.select()} />
                </label>
              </>
            )}
          </fieldset>
        )}
      </>
    ),
    sharing: (
      <>
        <fieldset>
          <legend>{t('ui.settingsDialog.sincronizare_cu_folder_extern_implicit')}</legend>
          <div className="row">
            <label>
              Format text
              <select value={sharing.sync.format} onChange={(e) => setSync({ format: e.target.value })}>
                <option value="rtf">RTF</option>
                <option value="txt">{t('ui.compileDialog.text_simplu')}</option>
                <option value="md">Markdown</option>
              </select>
            </label>
            <label>
              {t('ui.settingsDialog.format_note')}
              <select value={sharing.sync.notesFormat} onChange={(e) => setSync({ notesFormat: e.target.value })}>
                <option value="same">{t('ui.settingsDialog.ca_textul')}</option>
                <option value="rtf">RTF</option>
                <option value="txt">{t('ui.compileDialog.text_simplu')}</option>
                <option value="md">Markdown</option>
              </select>
            </label>
          </div>
          <label className="check"><input type="checkbox" checked={sharing.sync.includeNotes} onChange={(e) => setSync({ includeNotes: e.target.checked })} /> {t('ui.settingsDialog.sincronizeaza_si_notele')}</label>
          <label className="check"><input type="checkbox" checked={sharing.sync.syncOnOpen} onChange={(e) => setSync({ syncOnOpen: e.target.checked })} /> {t('ui.settingsDialog.sincronizeaza_la_deschiderea_proiectului')}</label>
          <label className="check"><input type="checkbox" checked={sharing.sync.syncOnClose} onChange={(e) => setSync({ syncOnClose: e.target.checked })} /> {t('ui.settingsDialog.sincronizeaza_la_inchiderea_proiectului')}</label>
        </fieldset>
        <fieldset>
          <legend>{t('ui.settingsDialog.export_fisiere_implicit')}</legend>
          <label>
            Format
            <select value={sharing.export.format} onChange={(e) => setExp({ format: e.target.value })}>
              <option value="docx">DOCX</option>
              <option value="rtf">RTF</option>
              <option value="md">Markdown</option>
              <option value="txt">{t('ui.compileDialog.text_simplu')}</option>
              <option value="html">HTML</option>
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={sharing.export.keepFolders} onChange={(e) => setExp({ keepFolders: e.target.checked })} /> {t('ui.settingsDialog.pastreaza_structura_de_dosare')}</label>
          <label className="check"><input type="checkbox" checked={sharing.export.includeNotes} onChange={(e) => setExp({ includeNotes: e.target.checked })} /> Include notele</label>
          <label className="check"><input type="checkbox" checked={sharing.export.includeMeta} onChange={(e) => setExp({ includeMeta: e.target.checked })} /> Include metadatele</label>
        </fieldset>
      </>
    ),
    services: (
      <>
      <fieldset>
        <legend>{t('ui.settingsDialog.traducere_dictionare')}</legend>
        <label>
          {t('ui.settingsDialog.din_limba')}
          <select value={ai.translateFrom} onChange={(e) => setAi((p) => ({ ...p, translateFrom: e.target.value }))}>
            <option value="auto">{t('ui.settingsDialog.detectare_automata')}</option>
            {Object.entries(LANG_NAMES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <label>
          {t('ui.settingsDialog.in_limba')}
          <select value={ai.translateTo} onChange={(e) => setAi((p) => ({ ...p, translateTo: e.target.value }))}>
            {Object.entries(LANG_NAMES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <p className="muted small">{t('ui.settingsDialog.traducere_tip')}</p>
      </fieldset>
      <fieldset>
        <legend>{t('ui.services.servicii_conturi')}</legend>
        <ServicesPanel api={api} />
      </fieldset>
      </>
    ),
    language: (
      <>
        <label>
          {t('set.language')}
          <select value={s.language} onChange={set('language')}>
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <p className="muted small">{t('set.languageNote')}</p>
      </>
    ),
  };
  const visibleTabs = TABS.filter((k) => panes[k]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-dialog" role="dialog" aria-label={t('set.title')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('set.title')}</h2>
        <div className="tabs" role="tablist">
          {visibleTabs.map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'primary' : ''} onClick={() => setTab(k)}>
              {tabLabel(k)}
            </button>
          ))}
        </div>
        <div role="tabpanel" style={{ minHeight: 260, marginTop: 8 }}>{panes[tab]}</div>
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" onClick={save}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}

// Personal dictionary: words added with "Adaugă în dicționar"; they can be removed here.
function PersonalDictionary({ api, onError }) {
  const [words, setWords] = React.useState(null);
  const [filter, setFilter] = React.useState('');
  const load = () => api.listDictionaryWords().then((w) => setWords([...w].sort((a, b) => a.localeCompare(b, 'ro')))).catch(onError);
  React.useEffect(() => {
    load();
  }, []);
  if (!words) return null;
  const shown = words.filter((w) => w.toLowerCase().includes(filter.toLowerCase()));
  return (
    <fieldset>
      <legend>{t('ui.settingsDialog.dictionar_personal')}{words.length})</legend>
      {words.length > 8 && <input placeholder={t('ui.settingsDialog.cauta_cuvant')} value={filter} onChange={(e) => setFilter(e.target.value)} />}
      {!words.length && <p className="muted">{t('ui.settingsDialog.gol_cuvintele_intra_aici_din')}</p>}
      <div style={{ maxHeight: 160, overflow: 'auto' }}>
        {shown.map((w) => (
          <div key={w} className="row" style={{ justifyContent: 'space-between' }}>
            <span>{w}</span>
            <button className="link" onClick={() => api.removeDictionaryWord(w).then(load).catch(onError)}>{t('btn.delete')}</button>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
