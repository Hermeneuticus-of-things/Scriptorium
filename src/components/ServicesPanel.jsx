import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';
import { confirmDialog } from '../lib/appDialog.js';

// Settings → "Servicii și conturi": keys for DeepL, Google Translate, LanguageTool, Zotero and a list
// of other logins. Secrets are typed here and sent once to the main process; they are never read back.
export default function ServicesPanel({ api }) {
  const [data, setData] = useState(null);
  const [typed, setTyped] = useState({}); // `${service}.${field}` -> value typed in this session
  const [msg, setMsg] = useState('');
  const [acc, setAcc] = useState(null); // account being edited
  const supported = Boolean(api.servicesStatus);

  const load = () => api.servicesStatus().then(setData).catch((e) => setMsg(e.message));
  useEffect(() => {
    if (supported) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!supported) return <p className="muted small">{t('ui.services.doar_desktop')}</p>;
  if (!data) return null;

  const save = async (id, fields) => {
    const values = {};
    for (const f of fields) {
      const k = `${id}.${f.id}`;
      if (k in typed) values[f.id] = typed[k];
    }
    if (!Object.keys(values).length) return;
    try {
      await api.setService(id, values);
      setTyped((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith(`${id}.`))));
      setMsg(t('ui.services.salvat', { name: data.services[id].label }));
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };
  const remove = async (id, fields) => {
    try {
      await api.setService(id, Object.fromEntries(fields.map((f) => [f.id, ''])));
      setMsg(t('ui.services.sters', { name: data.services[id].label }));
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };
  const saveAccount = async () => {
    try {
      await api.setAccount(acc);
      setAcc(null);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="services-panel">
      {Object.entries(data.services).map(([id, s]) => (
        <div key={id} className="service-row">
          <div className="service-head">
            <strong>{s.label}</strong>
            <span className={s.configured ? 'ok small' : 'muted small'}>{s.configured ? t('ui.services.configurat') : t('ui.services.neconfigurat')}</span>
          </div>
          {s.help && <p className="muted small">{s.help}{s.url && <> <a href={s.url} target="_blank" rel="noreferrer" onClick={(e) => { if (api.openLink) { e.preventDefault(); api.openLink(s.url); } }}>{t('ui.services.unde_gasesc_cheia')}</a></>}</p>}
          <div className="row">
            {s.fields.map((f) => (
              <label key={f.id}>
                {f.label}
                <input
                  type={f.secret ? 'password' : 'text'}
                  autoComplete={f.secret ? 'new-password' : 'off'}
                  value={typed[`${id}.${f.id}`] ?? (f.secret ? '' : f.value)}
                  placeholder={f.secret && f.set ? t('ui.services.salvata_scrie_alta') : ''}
                  onChange={(e) => setTyped((x) => ({ ...x, [`${id}.${f.id}`]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="actions-inline">
            <button type="button" onClick={() => save(id, s.fields)} disabled={!s.fields.some((f) => `${id}.${f.id}` in typed)}>{t('btn.save')}</button>
            {s.fields.some((f) => f.set) && <button type="button" onClick={() => remove(id, s.fields)}>{t('ui.services.sterge')}</button>}
          </div>
        </div>
      ))}

      <h4>{t('ui.services.alte_conturi')}</h4>
      <p className="muted small">{t('ui.services.alte_conturi_tip')}</p>
      <ul className="accounts">
        {data.accounts.map((a) => (
          <li key={a.id}>
            <span><strong>{a.name}</strong>{a.username ? ` · ${a.username}` : ''}</span>
            {a.url && <button type="button" className="link" onClick={() => (api.openLink ? api.openLink(a.url) : window.open(a.url, '_blank', 'noopener'))}>{t('ui.services.deschide_site')}</button>}
            {a.hasPassword && <button type="button" className="link" onClick={() => api.copyAccountPassword(a.id).then(() => setMsg(t('ui.services.parola_copiata'))).catch((e) => setMsg(e.message))}>{t('ui.services.copiaza_parola')}</button>}
            <button type="button" className="link" onClick={() => setAcc({ ...a, password: undefined })}>{t('ui.services.editeaza')}</button>
            <button type="button" className="link" onClick={async () => (await confirmDialog({ message: t('ui.services.stergi_contul', { name: a.name }), okLabel: t('ui.dlg.sterge'), danger: true })) && api.deleteAccount(a.id).then(load).catch((e) => setMsg(e.message))}>{t('ui.services.sterge')}</button>
          </li>
        ))}
      </ul>
      {acc ? (
        <div className="account-form">
          <div className="row">
            <label>{t('ui.services.nume')}<input value={acc.name || ''} onChange={(e) => setAcc({ ...acc, name: e.target.value })} /></label>
            <label>{t('ui.services.adresa')}<input value={acc.url || ''} placeholder="https://" onChange={(e) => setAcc({ ...acc, url: e.target.value })} /></label>
          </div>
          <div className="row">
            <label>{t('ui.services.utilizator')}<input value={acc.username || ''} autoComplete="off" onChange={(e) => setAcc({ ...acc, username: e.target.value })} /></label>
            <label>{t('ui.services.parola')}<input type="password" autoComplete="new-password" value={acc.password ?? ''} placeholder={acc.hasPassword ? t('ui.services.salvata_scrie_alta') : ''} onChange={(e) => setAcc({ ...acc, password: e.target.value })} /></label>
          </div>
          <div className="actions-inline">
            <button type="button" className="primary" onClick={saveAccount}>{t('btn.save')}</button>
            <button type="button" onClick={() => setAcc(null)}>{t('btn.cancel')}</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAcc({ name: '', url: '', username: '', password: '' })}>{t('ui.services.adauga_cont')}</button>
      )}
      {msg && <p className="muted small" role="status">{msg}</p>}
      <p className="muted small">{t('ui.services.securitate')}</p>
    </div>
  );
}
