import React from 'react';
import { version as APP_VERSION } from '../../package.json';
import { t } from '../lib/i18n.js';
import { ABOUT_LICENSES, REPO_URL, DTED_URL } from '../lib/aboutInfo.js';

const GROUPS = ['app', 'runtime', 'npm', 'whisper', 'tts', 'dted'];

// Help → About Pneuma Sofer. Mirrors D&TED's „ℹ Despre": name, subtitle, version, what it does,
// a short note on the shared D&TED engine, and the licences of every bundled / downloaded component.
export default function AboutDialog({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="about-title">Pneuma Sofer</h2>
        <p className="muted">{t('ui.about.subtitle')}</p>
        <p><strong>{t('ui.about.version', { v: APP_VERSION })}</strong></p>
        <p>{t('ui.about.credits')}</p>
        <p>
          {t('ui.about.source')}{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer">{REPO_URL}</a>
        </p>
        <section>
          <h4>D&amp;TED</h4>
          <p>{t('ui.about.dted_note')}</p>
          <p className="muted">
            <a href={DTED_URL} target="_blank" rel="noreferrer">{DTED_URL}</a>
          </p>
        </section>
        <section>
          <h4>{t('ui.about.licenses')}</h4>
          <p className="muted">{t('ui.about.licenses_intro')}</p>
          <table className="about-licenses">
            <thead>
              <tr>
                <th>{t('ui.about.col_component')}</th>
                <th>{t('ui.about.col_version')}</th>
                <th>{t('ui.about.col_license')}</th>
              </tr>
            </thead>
            {GROUPS.map((g) => (
              <tbody key={g}>
                <tr className="about-group"><th colSpan={3}>{t(`ui.about.group_${g}`)}</th></tr>
                {ABOUT_LICENSES.filter((l) => l.group === g).map((l) => (
                  <tr key={l.name} className={l.flag ? `about-flag-${l.flag}` : undefined}>
                    <td>{l.name}</td>
                    <td>{l.version}</td>
                    <td>
                      {l.license}
                      {l.inTree === false && l.flag !== 'unknown' && <span className="muted"> — {t('ui.about.not_in_tree')}</span>}
                      {l.flag && <span className="about-flag"> ⚑ {t(`ui.about.flag_${l.flag}`)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          <p className="muted">{t('ui.about.nc_warning')}</p>
        </section>
        <div className="modal-actions">
          <button className="primary" onClick={onClose} autoFocus>{t('ui.about.close')}</button>
        </div>
      </div>
    </div>
  );
}
