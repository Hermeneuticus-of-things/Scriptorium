import React, { useEffect, useState } from 'react';
import { t as tr, categoryLabel } from '../lib/i18n.js';

// Recent projects: pinned ones (settings.recentPinned = [dir]) first, in pin order.
export function orderRecent(recent = [], pinned = []) {
  const pin = new Set(pinned);
  const byDir = new Map(recent.map((r) => [r.dir, r]));
  return [...pinned.filter((d) => byDir.has(d)).map((d) => byDir.get(d)), ...recent.filter((r) => !pin.has(r.dir))];
}

// [{category, templates}] in a stable category order (mirrors lib/templates.cjs groupTemplates).
const CATEGORY_ORDER = ['Generale', 'Ficțiune', 'Non-ficțiune', 'Scenariu', 'Poezie', 'Diverse', 'Ale mele'];
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
  const [templateId, setTemplateId] = useState(() => initialSettings?.defaultTemplate || 'novel');
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
    return api.newProject(title.trim(), chosen ? templateId : 'novel');
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
  // Template chooser > Options: default template, import / export of user templates.
  const setDefaultTemplate = () => chosen && saveSettings({ defaultTemplate: chosen.id });
  const importTemplate = async () => {
    try {
      const tpl = await api.importTemplate();
      if (!tpl) return;
      loadTemplates();
      setTemplateId(tpl.id);
    } catch (e) {
      onError(e);
    }
  };
  const exportTemplate = async () => {
    try {
      await api.exportTemplate(chosen.id);
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
  const groups = groupTemplates(templates);
  const [category, setCategory] = useState(null);
  const activeCat = category && groups.some((g) => g.category === category) ? category : (groups.find((g) => g.templates.some((t) => t.id === templateId)) || groups[0])?.category;
  const shown = groups.find((g) => g.category === activeCat)?.templates || [];
  const pickCategory = (c) => {
    setCategory(c);
    const g = groups.find((x) => x.category === c);
    if (g && !g.templates.some((t) => t.id === templateId) && g.templates[0]) setTemplateId(g.templates[0].id);
  };
  const [menu, setMenu] = useState(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !e.target.closest?.('.tpl-menu-wrap')) setMenu(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu]);
  const toggleMenu = (m) => setMenu((cur) => (cur === m ? null : m));
  const cardKeys = (e) => {
    const i = shown.findIndex((t) => t.id === templateId);
    const cols = Math.max(1, Math.round(e.currentTarget.clientWidth / 120)) || 1;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols, Home: -Infinity, End: Infinity }[e.key];
    if (e.key === 'Enter' && title.trim()) { e.preventDefault(); run(create)(); return; }
    if (step == null || !shown.length) return;
    e.preventDefault();
    const n = Math.max(0, Math.min(shown.length - 1, (i < 0 ? 0 : i) + step));
    setTemplateId(shown[n].id);
    e.currentTarget.querySelectorAll('[role=option]')[n]?.focus();
  };
  const catKeys = (e) => {
    const i = groups.findIndex((g) => g.category === activeCat);
    const step = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key];
    if (step == null) return;
    e.preventDefault();
    const n = Math.max(0, Math.min(groups.length - 1, i + step));
    pickCategory(groups[n].category);
    e.currentTarget.querySelectorAll('[role=option]')[n]?.focus();
  };
  const CAT_ICON = { Generale: '📄', 'Ficțiune': '📖', 'Non-ficțiune': '📚', Scenariu: '🎬', Poezie: '🪶', 'Ale mele': '⭐' };
  const iconOf = (t) => t.icon || CAT_ICON[t.category] || '📄';
  const canSync = api.isWeb && typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  return (
    <div className="home">
      <h1>Pneuma Sofer</h1>
      <p className="muted">{tr('ui.home.scrie_carti_lungi_binder_corkboard')}</p>
      {api.isMock && <p className="warn">{tr('ui.home.mod_demonstrativ_in_browser_salvarea')}</p>}
      <section className="tpl-chooser" aria-label={tr('ui.home.proiect_nou')}>
        <h2>{tr('ui.home.proiect_nou')}</h2>
        <div className="tpl-body">
          <ul className="tpl-cats" role="listbox" aria-label={tr('ui.home.categorii_sabloane')} aria-orientation="vertical" onKeyDown={catKeys}>
            {groups.map((g) => (
              <li
                key={g.category}
                role="option"
                aria-selected={g.category === activeCat}
                tabIndex={g.category === activeCat ? 0 : -1}
                className={g.category === activeCat ? 'on' : ''}
                onClick={() => pickCategory(g.category)}
              >
                {categoryLabel(g.category)} <span className="muted small">{g.templates.length}</span>
              </li>
            ))}
          </ul>
          <div className="tpl-main">
            <ul className="tpl-grid" role="listbox" aria-label={tr('ui.home.sablon')} onKeyDown={cardKeys}>
              {shown.map((t) => (
                <li
                  key={t.id}
                  data-tpl={t.id}
                  role="option"
                  aria-selected={t.id === templateId}
                  tabIndex={t.id === templateId ? 0 : -1}
                  className={`tpl-card${t.id === templateId ? ' on' : ''}`}
                  onClick={() => setTemplateId(t.id)}
                  onDoubleClick={() => { setTemplateId(t.id); if (title.trim()) run(create)(); }}
                >
                  <span className="tpl-icon" aria-hidden="true">{iconOf(t)}</span>
                  <span className="tpl-name">{t.name}</span>
                </li>
              ))}
            </ul>
            <div className="tpl-desc" aria-live="polite">
              {chosen ? (
                <>
                  <strong>{iconOf(chosen)} {chosen.name}</strong>
                  <p className="muted small">{chosen.description || tr('ui.home.sablon_fara_descriere')}</p>
                </>
              ) : <p className="muted small">{tr('ui.home.alege_un_sablon')}</p>}
            </div>
          </div>
        </div>
        <div className="tpl-footer">
          <div className="tpl-menu-wrap">
            <button type="button" aria-haspopup="menu" aria-expanded={menu === 'opts'} onClick={() => toggleMenu('opts')}>{tr('ui.home.optiuni')} ▾</button>
            {menu === 'opts' && (
              <div className="tpl-menu" role="menu">
                <button role="menuitem" onClick={() => { setMenu(null); run(() => api.importScriv())(); }}>{tr('ui.home.importa_proiect_scrivener_scriv')}</button>
                {api.isWeb && api.importBundle && <button role="menuitem" onClick={() => { setMenu(null); run(() => api.importBundle())(); }}>{tr('ui.home.importa_pachet_json')}</button>}
                {chosen && <button role="menuitem" disabled={settings.defaultTemplate === chosen.id} onClick={() => { setMenu(null); setDefaultTemplate(); }}>{tr('ui.g4.tplImplicit')}</button>}
                {api.importTemplate && <button role="menuitem" onClick={() => { setMenu(null); importTemplate(); }}>{tr('ui.g4.tplImporta')}</button>}
                {chosen && chosen.user && api.exportTemplate && <button role="menuitem" onClick={() => { setMenu(null); exportTemplate(); }}>{tr('ui.g4.tplExporta')}</button>}
                {chosen && chosen.user && api.deleteTemplate && <button role="menuitem" onClick={() => { setMenu(null); removeTemplate(); }}>{tr('ui.home.sterge_sablonul')}</button>}
                {canSync && <p className="muted small">{tr('ui.home.folder_sync_tip')}</p>}
              </div>
            )}
          </div>
          <div className="tpl-menu-wrap">
            <button type="button" aria-haspopup="menu" aria-expanded={menu === 'recent'} onClick={() => toggleMenu('recent')}>{tr('ui.home.deschide_recent')} ▾</button>
            {menu === 'recent' && (
              <div className="tpl-menu tpl-recent" role="menu" aria-label={tr('ui.home.recente')}>
                {recent.length === 0 && <p className="muted">{tr('ui.home.niciun_proiect_recent')}</p>}
                <ul className="recent">
                  {recent.map((r) => (
                    <li key={r.dir} className={[pinned.includes(r.dir) ? 'pinned' : '', r.missing ? 'missing' : ''].filter(Boolean).join(' ')}>
                      <button className="link" role="menuitem" onClick={run(() => api.openProject(r.dir))} title={r.missing ? tr('ui.home.lipseste_titlu', { dir: r.dir }) : r.dir}>
                        {r.title}
                        {r.missing && <span className="muted small"> ({tr('ui.home.lipseste')})</span>}
                      </button>
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
                {recent.some((r) => !pinned.includes(r.dir)) && <button className="link" onClick={clearRecent}>{tr('ui.home.goleste_lista_pastreaza_fixatele')}</button>}
              </div>
            )}
          </div>
          <button type="button" onClick={run(() => api.openProject())} title={tr('ui.home.deschide_existent')}>{tr('ui.home.deschide_proiect_pneuma')}</button>
          <span className="tpl-spacer" />
          <input
            placeholder={tr('ui.home.titlul_cartii')}
            aria-label={tr('ui.home.titlul_cartii')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) run(create)(); }}
          />
          <button className="primary" disabled={!title.trim()} onClick={run(create)}>{tr('ui.home.creeaza')}</button>
        </div>
      </section>
      <nav className="home-links">
        <button className="link" onClick={onSettings}>{tr('set.title')}</button>
        {onHelp && <button className="link" onClick={onHelp}>{tr('cmd.help')} (F1)</button>}
        {onTutorial && <button className="link" onClick={onTutorial}>{tr('cmd.tutorial')}</button>}
      </nav>
    </div>
  );
}
