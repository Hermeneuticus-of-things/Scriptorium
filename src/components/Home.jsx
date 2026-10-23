import React, { useEffect, useState } from 'react';

// Recent projects: pinned ones (settings.recentPinned = [dir]) first, in pin order.
export function orderRecent(recent = [], pinned = []) {
  const pin = new Set(pinned);
  const byDir = new Map(recent.map((r) => [r.dir, r]));
  return [...pinned.filter((d) => byDir.has(d)).map((d) => byDir.get(d)), ...recent.filter((r) => !pin.has(r.dir))];
}

// [{category, templates}] in a stable category order (mirrors lib/templates.cjs groupTemplates).
const CATEGORY_ORDER = ['Generale', 'Ficțiune', 'Non-ficțiune', 'Scenariu', 'Poezie', 'Ale mele'];
export function groupTemplates(list = []) {
  const map = new Map();
  for (const t of list) {
    const c = t.category || 'Generale';
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(t);
  }
  const rank = (c) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length - 1);
  return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], 'ro')).map(([category, templates]) => ({ category, templates }));
}

export default function Home({ api, settings: initialSettings, onOpen, onError, onSettings, onHelp, onTutorial }) {
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
  const loadTemplates = React.useCallback(() => {
    const list = api.listAllTemplates || api.listTemplates;
    list?.call(api).then((l) => l && setTemplates(l)).catch(onError);
  }, [api, onError]);
  useEffect(loadTemplates, [loadTemplates]);
  const chosen = templates.find((t) => t.id === templateId);
  const create = async () => {
    if (chosen && chosen.user && api.newFromTemplate) {
      const r = await api.newFromTemplate(title.trim(), templateId);
      return r ? api.openProject(r.dir) : null;
    }
    return api.newProject(title.trim(), templateId);
  };
  const removeTemplate = async () => {
    if (!chosen || !chosen.user || !window.confirm(`Ștergi șablonul „${chosen.name}”?`)) return;
    try {
      await api.deleteTemplate(chosen.id);
      setTemplateId('novel');
      loadTemplates();
    } catch (e) {
      onError(e);
    }
  };
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
              {groupTemplates(templates).map((g) => (
                <optgroup key={g.category} label={g.category}>
                  {g.templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ''}{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {chosen && chosen.description && <p className="muted small">{chosen.description}</p>}
          {chosen && chosen.user && api.deleteTemplate && (
            <button className="link" onClick={removeTemplate}>Șterge șablonul</button>
          )}
          <button className="primary" disabled={!title.trim()} onClick={run(create)}>Creează</button>
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
      <nav className="home-links">
        <button className="link" onClick={onSettings}>Setări</button>
        {onHelp && <button className="link" onClick={onHelp}>Manual (F1)</button>}
        {onTutorial && <button className="link" onClick={onTutorial}>Tutorial interactiv</button>}
      </nav>
    </div>
  );
}
