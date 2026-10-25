import React from 'react';
import { t } from '../lib/i18n.js';

// Options › General. s/set/check come from SettingsDialog (one form, one Save).
export default function GeneralPane({ s, set, setS, check, api, onTargets }) {
  const chooseFolder = async (key) => {
    const dir = await api.chooseFolder?.();
    if (dir) setS((p) => ({ ...p, [key]: dir }));
  };
  const chooseApp = async () => {
    const file = await api.chooseFile?.({ title: t('ui.p4.bibliografie') });
    if (file) setS((p) => ({ ...p, bibliographyApp: file }));
  };
  return (
    <>
      <fieldset>
        <legend>{t('ui.p4.pornire')}</legend>
        <label>
          {t('ui.p4.laPornire')}
          <select
            value={s.startupAction}
            onChange={(e) => setS((p) => ({ ...p, startupAction: e.target.value, reopenLastProject: e.target.value !== 'templates' }))}
          >
            {['reopenLast', 'reopenAll', 'templates'].map((x) => <option key={x} value={x}>{t(`ui.p4.start.${x}`)}</option>)}
          </select>
        </label>
        {check('templatesRememberCategory', t('ui.p4.tplUltimaCategorie'))}
        {api.setAppMenu && (
          <div className="row">
            <label>
              {t('ui.p4.latimeFereastra')}
              <input type="number" min="900" max="8000" step="10" value={s.windowWidth} onChange={set('windowWidth')} />
            </label>
            <label>
              {t('ui.p4.inaltimeFereastra')}
              <input type="number" min="600" max="8000" step="10" value={s.windowHeight} onChange={set('windowHeight')} />
            </label>
          </div>
        )}
        {api.setAppMenu && check('startMaximized', t('ui.p4.pornesteMaximizat'))}
        {api.onUpdateAvailable && check('autoUpdateCheck', t('set.autoUpdateCheck'))}
        {check('checkUpdates', t('set.checkUpdates'))}
      </fieldset>
      <fieldset>
        <legend>{t('ui.p4.salvare')}</legend>
        <label>
          {t('set.autosave')}
          <input type="number" min="1" max="120" value={s.autosaveSec} onChange={set('autosaveSec')} />
        </label>
        <label>
          {t('ui.p4.salveazaOricum')}
          <input type="number" min="0" max="120" value={s.autosaveEveryMin} onChange={set('autosaveEveryMin')} />
        </label>
        <small className="muted">{t('ui.p4.salveazaOricumHint')}</small>
        <label>
          {t('ui.p4.folderProiecte')}
          <span className="row">
            <input value={s.defaultProjectDir} onChange={set('defaultProjectDir')} placeholder={t('ui.p4.folderNeales')} aria-label={t('ui.p4.folderProiecte')} />
            {api.chooseFolder && <button type="button" onClick={() => chooseFolder('defaultProjectDir')}>{t('ui.p4.alege')}</button>}
          </span>
        </label>
      </fieldset>
      <fieldset>
        <legend>{t('ui.p4.altele')}</legend>
        <label>
          {t('ui.p4.bibliografie')}
          <span className="row">
            <input value={s.bibliographyApp} onChange={set('bibliographyApp')} placeholder={t('ui.p4.bibliografieHint')} aria-label={t('ui.p4.bibliografie')} />
            {api.chooseFile && <button type="button" onClick={chooseApp}>{t('ui.p4.alege')}</button>}
          </span>
        </label>
        {check('showSelectionCount', t('ui.p4.cuvinteSelectie'))}
        <div className="row">
          <button type="button" onClick={() => setS((p) => ({ ...p, hiddenWarnings: [], confirmEmptyTrash: true }))} disabled={!(s.hiddenWarnings || []).length && s.confirmEmptyTrash}>
            {t('ui.p4.reseteazaAvertizari')}
          </button>
          {onTargets && <button type="button" onClick={onTargets}>{t('ui.p4.tinte')}</button>}
        </div>
      </fieldset>
    </>
  );
}
