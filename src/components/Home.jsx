import React, { useEffect, useState } from 'react';

// Recent projects: pinned ones (settings.recentPinned = [dir]) first, in pin order.
export function orderRecent(recent = [], pinned = []) {
  const pin = new Set(pinned);
  const byDir = new Map(recent.map((r) => [r.dir, r]));
  return [...pinned.filter((d) => byDir.has(d)).map((d) => byDir.get(d)), ...recent.filter((r) => !pin.has(r.dir))];
}

export default function Home({ api, settings: initialSettings, onOpen, onError, onSettings }) {
  const [settings, setLocal] = useState(initialSettings);
  useEffect(() => setLocal(initialSettings), [initialSettings]);
  const pinned = settings.recentPinned || [];
  const saveSettings = async (patch) => {
    try {
      await api.setSettings(patch);
      setLocal((s) => ({ ...s, ...patch }));
    } catch (e) {
      onError(e);
    }
  };
  const togglePin = (dir) => saveSettings({ recentPinned: pinned.includes(dir) ? pinned.filter((d) => d !== dir) : [...pinned, dir] });
  const clearRecent = () => {
    if (!window.confirm('Golești lista de proiecte recente? Proiectele fixate rămân.')) return;
    saveSettings({ recent: (settings.recent || []).filter((r) => pinned.includes(r.dir)) });
  };
  const recent = orderRecent(settings.recent || [], pinned);
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
          {recent.length === 0 && <p className="muted">Niciun proiect recent.</p>}
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.dir} className={pinned.includes(r.dir) ? 'pinned' : ''}>
                <button className="link" onClick={run(() => api.openProject(r.dir))} title={r.dir}>{r.title}</button>
                <button
                  className={`pin ${pinned.includes(r.dir) ? 'on' : ''}`}
                  onClick={() => togglePin(r.dir)}
                  title={pinned.includes(r.dir) ? 'Anulează fixarea' : 'Fixează în capul listei'}
                  aria-label={pinned.includes(r.dir) ? `Anulează fixarea ${r.title}` : `Fixează ${r.title}`}
                >
                  {pinned.includes(r.dir) ? '★' : '☆'}
                </button>
              </li>
            ))}
          </ul>
          {recent.length > pinned.length && <button className="link" onClick={clearRecent}>Golește lista (păstrează fixatele)</button>}
        </section>
      </div>
      <button className="link" onClick={onSettings}>Setări</button>
    </div>
  );
}
