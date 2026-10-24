import React, { useState } from 'react';
import { t, has } from '../lib/i18n.js';
import { BARS, DISPLAY_MODES, SEP, SPACE, toolbarPrefs, toolbarSettings, topItemAvailable } from '../lib/toolbars.js';

// Vizualizare → Personalizează bara de instrumente….
// Two lists per bar: available items and the current ones. Add/remove, reorder by drag or with
// ↑/↓ (keyboard), separators and flexible spaces, display mode, and "Restore defaults".
export default function ToolbarCustomizeDialog({ api, settings, aiEnabled, desktop, onClose, onError }) {
  const initial = toolbarPrefs(settings.toolbars);
  const [bar, setBar] = useState('top');
  const [lists, setLists] = useState({ top: initial.top, format: initial.format });
  const [display, setDisplay] = useState(initial.display);
  const [sel, setSel] = useState(-1); // selected index in the current list
  const [avSel, setAvSel] = useState('');
  const [drag, setDrag] = useState(null); // { from: index } or { add: id }

  const items = BARS[bar].items.filter((it) => bar !== 'top' || topItemAvailable(it, { aiEnabled, desktop }) || lists.top.includes(it.id));
  const labelOf = (id) => {
    if (id === SEP) return t('ui.tb.separator');
    if (id === SPACE) return t('ui.tb.space');
    const it = BARS[bar].items.find((x) => x.id === id);
    if (!it) return id;
    return has(it.label) ? t(it.label) : it.label;
  };
  const current = lists[bar];
  const available = [...items.map((i) => i.id).filter((id) => !current.includes(id)), SEP, SPACE];
  const setCurrent = (next) => setLists((l) => ({ ...l, [bar]: next }));

  const add = (id, at = sel >= 0 ? sel + 1 : current.length) => {
    if (!id) return;
    const next = [...current];
    next.splice(at, 0, id);
    setCurrent(next);
    setSel(at);
    if (id !== SEP && id !== SPACE) setAvSel('');
  };
  const remove = (i = sel) => {
    if (i < 0) return;
    setCurrent(current.filter((_, k) => k !== i));
    setSel(Math.min(i, current.length - 2));
  };
  const move = (i, to) => {
    if (i < 0 || to < 0 || to >= current.length) return;
    const next = [...current];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    setCurrent(next);
    setSel(to);
  };
  const drop = (at) => {
    if (!drag) return;
    if (drag.add) add(drag.add, at);
    else move(drag.from, drag.from < at ? at - 1 : at);
    setDrag(null);
  };
  const save = async () => {
    try {
      await api.setSettings({ toolbars: toolbarSettings({ ...lists, display }) });
      onClose();
    } catch (e) {
      onError?.(e);
    }
  };
  const restore = () => {
    setLists({ top: [...BARS.top.defaults], format: [...BARS.format.defaults] });
    setDisplay('iconText');
    setSel(-1);
  };
  const onListKey = (e) => {
    if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); move(sel, sel - 1); }
    else if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); move(sel, sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(current.length - 1, s + 1)); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide tb-customize" role="dialog" aria-label={t('ui.tb.customize_title')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.tb.customize_title')}</h2>
        <div className="tabs" role="tablist">
          {['top', 'format'].map((b) => (
            <button key={b} role="tab" aria-selected={bar === b} className={bar === b ? 'primary' : ''} onClick={() => { setBar(b); setSel(-1); setAvSel(''); }}>
              {t(b === 'top' ? 'ui.tb.bar_top' : 'ui.tb.bar_format')}
            </button>
          ))}
        </div>
        <p className="muted small">{t('ui.tb.customize_tip')}</p>
        <div className="tb-lists">
          <div className="tb-col">
            <h4 id="tb-av">{t('ui.tb.available')}</h4>
            <ul className="tb-list" role="listbox" aria-labelledby="tb-av" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') add(avSel); }}
              onDragOver={(e) => drag && drag.from != null && e.preventDefault()}
              onDrop={() => { if (drag && drag.from != null) { remove(drag.from); setDrag(null); } }}
            >
              {available.map((id) => (
                <li key={id} role="option" aria-selected={avSel === id} className={avSel === id ? 'sel' : ''} draggable
                  onDragStart={() => setDrag({ add: id })} onClick={() => setAvSel(id)} onDoubleClick={() => add(id)}>
                  {labelOf(id)}
                </li>
              ))}
            </ul>
          </div>
          <div className="tb-mid">
            <button onClick={() => add(avSel)} disabled={!avSel} aria-label={t('ui.tb.add')} title={t('ui.tb.add')}>{t('ui.tb.add')} →</button>
            <button onClick={() => remove()} disabled={sel < 0} aria-label={t('ui.tb.remove')} title={t('ui.tb.remove')}>← {t('ui.tb.remove')}</button>
            <button onClick={() => move(sel, sel - 1)} disabled={sel <= 0} aria-label={t('ui.tb.up')} title={t('ui.tb.up')}>↑</button>
            <button onClick={() => move(sel, sel + 1)} disabled={sel < 0 || sel >= current.length - 1} aria-label={t('ui.tb.down')} title={t('ui.tb.down')}>↓</button>
          </div>
          <div className="tb-col">
            <h4 id="tb-cur">{t('ui.tb.current')}</h4>
            <ul className="tb-list" role="listbox" aria-labelledby="tb-cur" tabIndex={0} onKeyDown={onListKey}
              aria-activedescendant={sel >= 0 ? `tb-cur-${sel}` : undefined}
              onDragOver={(e) => drag && e.preventDefault()} onDrop={() => drop(current.length)}>
              {current.map((id, i) => (
                <li key={`${id}-${i}`} id={`tb-cur-${i}`} role="option" aria-selected={sel === i} className={sel === i ? 'sel' : ''} draggable
                  onDragStart={() => setDrag({ from: i })}
                  onDragOver={(e) => drag && e.preventDefault()}
                  onDrop={(e) => { e.stopPropagation(); drop(i); }}
                  onClick={() => setSel(i)}>
                  {labelOf(id)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {bar === 'top' && (
          <label>
            {t('ui.tb.display')}{' '}
            <select value={display} onChange={(e) => setDisplay(e.target.value)} aria-label={t('ui.tb.display')}>
              {DISPLAY_MODES.map((m) => <option key={m} value={m}>{t(`ui.tb.display_${m}`)}</option>)}
            </select>
          </label>
        )}
        <div className="actions">
          <button onClick={restore}>{t('ui.tb.restore')}</button>
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" onClick={save}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
