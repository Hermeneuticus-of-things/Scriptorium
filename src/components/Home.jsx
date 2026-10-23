import React, { useEffect, useState } from 'react';

export default function Home({ api, settings, onOpen, onError, onSettings }) {
  const [title, setTitle] = useState('');
  const [templates, setTemplates] = useState([{ id: 'blank', name: 'Gol' }]);
  const [templateId, setTemplateId] = useState('novel');
  useEffect(() => {
    api.listTemplates?.().then(setTemplates).catch(onError);
  }, [api, onError]);
  const run = (fn) => async () => {
    try {
      onOpen(await fn());
    } catch (e) {
      onError(e);
    }
  };
  return (
    <div className="home">
      <h1>Scribner</h1>
      <p className="muted">Scrie cărți lungi: binder, corkboard, snapshot-uri, Compile și asistent AI.</p>
      {api.isMock && <p className="warn">Mod demonstrativ în browser. Salvarea pe disc, importul .scriv și AI merg în aplicația desktop.</p>}
      <div className="home-grid">
        <section>
          <h2>Proiect nou</h2>
          <input placeholder="Titlul cărții" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>
            Șablon
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={!title.trim()} onClick={run(() => api.newProject(title.trim(), templateId))}>Creează</button>
        </section>
        <section>
          <h2>Deschide</h2>
          <button onClick={run(() => api.openProject())}>Deschide proiect .scribner</button>
          <button onClick={run(() => api.importScriv())}>Importă proiect Scrivener (.scriv)</button>
        </section>
        <section>
          <h2>Recente</h2>
          {(settings.recent || []).length === 0 && <p className="muted">Niciun proiect recent.</p>}
          <ul className="recent">
            {(settings.recent || []).map((r) => (
              <li key={r.dir}>
                <button className="link" onClick={run(() => api.openProject(r.dir))} title={r.dir}>{r.title}</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <button className="link" onClick={onSettings}>Setări</button>
    </div>
  );
}
