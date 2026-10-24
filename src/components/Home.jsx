import React, { useEffect, useState } from 'react';
import { t as tr, categoryLabel } from '../lib/i18n.js';

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
    if (!window.confirm(tr('ui.home.golesti_lista_de_proiecte_recente'))) return;
    saveSettings({ recent: (settings.recent || []).filter((r) => pinned.includes(r.dir)) });
  };
  const recent = orderRecent(settings.recent || [], pinned);
  const [title, setTitle] = useState('');
  const [templates, setTemplates] = useState([{ id: 'blank', name: tr('ui.home.gol') }]);
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
    if (!chosen || !chosen.user || !window.confirm(tr('ui.home.stergi_sablonul_x', { name: chosen.name }))) return;
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
      <p className="muted">{tr('ui.home.scrie_carti_lungi_binder_corkboard')}</p>
      {api.isMock && <p className="warn">{tr('ui.home.mod_demonstrativ_in_browser_salvarea')}</p>}
      <div className="home-grid">
        <section>
          <h2>{tr('ui.home.proiect_nou')}</h2>
          <input placeholder={tr('ui.home.titlul_cartii')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>
            {tr('ui.home.sablon')}
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {groupTemplates(templates).map((g) => (
                <optgroup key={g.category} label={categoryLabel(g.category)}>
                  {g.templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.icon ? `${t.icon} ` : ''}{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          {chosen && chosen.description && <p className="muted small">{chosen.description}</p>}
          {chosen && chosen.user && api.deleteTemplate && (
            <button className="link" onClick={removeTemplate}>{tr('ui.home.sterge_sablonul')}</button>
          )}
          <button className="primary" disabled={!title.trim()} onClick={run(create)}>{tr('ui.home.creeaza')}</button>
        </section>
        <section>
          <h2>{tr('ui.app.deschide')}</h2>
          <button onClick={run(() => api.openProject())}>{tr('ui.home.deschide_proiect_scribner')}</button>
          {api.isWeb && api.importBundle && <button onClick={run(() => api.importBundle())}>{tr('ui.home.importa_pachet_json')}</button>}
          <button onClick={run(() => api.importScriv())}>{tr('ui.home.importa_proiect_scrivener_scriv')}</button>
          {api.isWeb && typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function' && <p className="muted small">{tr('ui.home.folder_sync_tip')}</p>}
        </section>
        <section>
          <h2>Recente</h2>
          {recent.length === 0 && <p className="muted">{tr('ui.home.niciun_proiect_recent')}</p>}
          <ul className="recent">
            {recent.map((r) => (
              <li key={r.dir} className={pinned.includes(r.dir) ? 'pinned' : ''}>
                <button className="link" onClick={run(() => api.openProject(r.dir))} title={r.dir}>{r.title}</button>
                <button
                  className={`pin ${pinned.includes(r.dir) ? 'on' : ''}`}
                  onClick={() => togglePin(r.dir)}
                  title={pinned.includes(r.dir) ? tr('ui.home.anuleaza_fixarea') : tr('ui.home.fixeaza_in_capul_listei')}
                  aria-label={pinned.includes(r.dir) ? tr('ui.home.anuleaza_fixarea_x', { title: r.title }) : tr('ui.home.fixeaza_x', { title: r.title })}
                >
                  {pinned.includes(r.dir) ? '★' : '☆'}
                </button>
              </li>
            ))}
          </ul>
          {recent.length > pinned.length && <button className="link" onClick={clearRecent}>{tr('ui.home.goleste_lista_pastreaza_fixatele')}</button>}
        </section>
      </div>
      <nav className="home-links">
        <button className="link" onClick={onSettings}>{tr('set.title')}</button>
        {onHelp && <button className="link" onClick={onHelp}>Manual (F1)</button>}
        {onTutorial && <button className="link" onClick={onTutorial}>Tutorial interactiv</button>}
      </nav>
    </div>
  );
}
