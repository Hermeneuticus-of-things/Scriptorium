// Options → Corrections: automatic corrections while typing, spelling and grammar, the
// replacement list (with import / export) and the personal dictionary.
import React, { useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { EDITING_DEFAULTS } from '../lib/editingPrefs.js';
import { QUOTE_STYLES, SINGLE_QUOTE_STYLES } from '../editor/corrections.js';
import { mergeReplacements, parseReplacements, serializeReplacements } from '../../lib/autoReplace.js';

const DEFAULTS = { smartQuotes: true, smartDashes: true, smartEllipsis: true, smartFractions: false, autoCapitalize: false, learnCorrections: true, ...EDITING_DEFAULTS };

/**
 * s / setS: the settings dialog draft (saved with the dialog); settings: what is saved now.
 * Keys not yet in the draft are read from the saved settings, then from the defaults.
 */
export default function CorrectionsPane({ s, setS, settings = {}, api, onError }) {
  const val = (k) => (s[k] !== undefined ? s[k] : settings[k] !== undefined ? settings[k] : DEFAULTS[k]);
  const put = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const check = (k, label, extra = {}) => (
    <label className="check" {...extra}>
      <input type="checkbox" checked={Boolean(val(k))} onChange={(e) => put(k, e.target.checked)} /> {label}
    </label>
  );
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [importMode, setImportMode] = useState('merge');
  const list = s.autoReplacements || [];
  const editRepl = (i, k, v) => setS((p) => ({ ...p, autoReplacements: p.autoReplacements.map((r, j) => (j === i ? { ...r, [k]: v, learned: false } : r)) }));

  const exportList = () => {
    const text = serializeReplacements(list, t('ui.corr.exportHeader'));
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inlocuiri-automate.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(t('ui.corr.exported', { n: list.filter((r) => r.from).length }));
  };
  const importList = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const pairs = parseReplacements(String(r.result || ''));
      if (!pairs.length) {
        setMsg(t('ui.corr.importEmpty'));
        return;
      }
      const res = mergeReplacements(list, pairs, importMode);
      setS((p) => ({ ...p, autoReplacements: res.list }));
      setMsg(t('ui.corr.imported', { added: res.added, updated: res.updated }));
    };
    r.onerror = () => onError?.(r.error || new Error(t('ui.corr.importEmpty')));
    r.readAsText(file);
  };

  const smart = Boolean(val('smartQuotes'));
  return (
    <div className="corrections-pane">
      <fieldset>
        <legend>{t('ui.corr.auto')}</legend>
        {check('smartQuotes', t('set.smartQuotes'))}
        <div className="row" style={{ marginLeft: 22 }}>
          <label>
            {t('ui.corr.doubleQuotes')}
            <select value={val('quoteStyle')} disabled={!smart} onChange={(e) => put('quoteStyle', e.target.value)}>
              {Object.entries(QUOTE_STYLES).map(([k, [o, c]]) => <option key={k} value={k}>{`${o}…${c}`}</option>)}
            </select>
          </label>
          <label>
            {t('ui.corr.singleQuotes')}
            <select value={val('singleQuoteStyle')} disabled={!smart} onChange={(e) => put('singleQuoteStyle', e.target.value)}>
              {Object.entries(SINGLE_QUOTE_STYLES).map(([k, [o, c]]) => <option key={k} value={k}>{`${o}…${c}`}</option>)}
            </select>
          </label>
        </div>
        {check('smartDashes', t('set.smartDashes'))}
        {check('smartEllipsis', t('set.smartEllipsis'))}
        {check('smartFractions', t('ui.settingsDialog.fractii_1_2_3_4'))}
        {check('autoCapitalize', t('set.autoCapitalize'))}
        <label style={{ marginLeft: 22 }}>
          {t('ui.corr.capExceptions')}
          <input value={val('capExceptions')} disabled={!val('autoCapitalize')} onChange={(e) => put('capExceptions', e.target.value)} placeholder="dr., etc., nr." />
        </label>
        {check('fixTwoCaps', t('ui.corr.fixTwoCaps'))}
        {check('capitalizeDays', t('ui.corr.capitalizeDays'))}
        {check('fixCapsLock', t('ui.corr.fixCapsLock'))}
      </fieldset>
      <fieldset>
        <legend>{t('ui.corr.spelling')}</legend>
        {check('spellCheckLive', t('ui.corr.spellLive'))}
        {check('grammarCheck', t('ui.corr.grammar'))}
        <p className="muted small" style={{ margin: '0 0 4px 22px' }}>{t('ui.corr.grammarTip')}</p>
        {check('spellIgnoreUpper', t('ui.corr.ignoreUpper'))}
        {check('spellIgnoreDigits', t('ui.corr.ignoreDigits'))}
        {check('spellIgnoreUrls', t('ui.corr.ignoreUrls'))}
        <label>
          {t('set.spellLangs')}
          <input value={s.spellLanguages ?? ''} onChange={(e) => put('spellLanguages', e.target.value)} placeholder="ro, en-US" />
        </label>
      </fieldset>
      {api?.listDictionaryWords && <PersonalDictionary api={api} onError={onError} />}
      <fieldset>
        <legend>{t('set.replacements')}</legend>
        {check('learnCorrections', t('ui.settingsDialog.invata_corecturile'))}
        <div style={{ maxHeight: 220, overflow: 'auto' }}>
          {list.map((r, i) => (
            <div className="row" key={i}>
              <input aria-label={t('set.replaceFrom')} placeholder={t('set.replaceFrom')} value={r.from} onChange={(e) => editRepl(i, 'from', e.target.value)} />
              <input aria-label={t('set.replaceTo')} placeholder={t('set.replaceTo')} value={r.to} onChange={(e) => editRepl(i, 'to', e.target.value)} />
              {r.learned && <span className="muted small">{t('ui.settingsDialog.invatat')}</span>}
              <button onClick={() => setS((p) => ({ ...p, autoReplacements: p.autoReplacements.filter((_, j) => j !== i) }))}>{t('btn.remove')}</button>
            </div>
          ))}
        </div>
        <div className="row">
          <button onClick={() => setS((p) => ({ ...p, autoReplacements: [...(p.autoReplacements || []), { from: '', to: '' }] }))}>{t('btn.add')}</button>
          <button onClick={() => fileRef.current?.click()}>{t('ui.corr.import')}</button>
          <select aria-label={t('ui.corr.importMode')} value={importMode} onChange={(e) => setImportMode(e.target.value)}>
            <option value="merge">{t('ui.corr.importMerge')}</option>
            <option value="replace">{t('ui.corr.importReplace')}</option>
          </select>
          <button onClick={exportList} disabled={!list.some((r) => r.from)}>{t('ui.corr.export')}</button>
          <input ref={fileRef} type="file" accept=".txt,.tsv,.csv,.json,text/plain" style={{ display: 'none' }} onChange={importList} aria-label={t('ui.corr.import')} />
        </div>
        <p className="muted small">{t('ui.corr.fileFormat')}</p>
        {msg && <p className="muted small" role="status">{msg}</p>}
      </fieldset>
    </div>
  );
}

// Personal dictionary: words added with "Add to dictionary"; they can be removed here.
export function PersonalDictionary({ api, onError }) {
  const [words, setWords] = React.useState(null);
  const [filter, setFilter] = React.useState('');
  const load = () => api.listDictionaryWords().then((w) => setWords([...w].sort((a, b) => a.localeCompare(b, 'ro')))).catch(onError);
  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
