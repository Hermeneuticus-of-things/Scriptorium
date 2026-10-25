import React, { useMemo, useRef, useState } from 'react';
import { t } from '../lib/i18n.js';
import { listKeywords } from '../lib/collections.js';
import { SPECIAL_CHARS, charCode, normalizeCompletions } from '../lib/missingWindows.js';

/** Small floating window that can be moved by its title bar. */
function FloatingPanel({ title, className, onClose, children, width = 280, x = 160, y = 110 }) {
  const [pos, setPos] = useState({ x, y });
  const drag = useRef(null);
  const down = (e) => {
    if (e.target.closest('button')) return;
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev) => drag.current && setPos({ x: Math.max(0, ev.clientX - drag.current.dx), y: Math.max(0, ev.clientY - drag.current.dy) });
    const up = () => {
      drag.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return (
    <div
      className={`floating-panel ${className}`}
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      style={{ position: 'fixed', left: pos.x, top: pos.y, width, zIndex: 900, background: 'var(--panel, #fff)', color: 'var(--text, #222)', border: '1px solid var(--border, #ccc)', borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}
    >
      <div onMouseDown={down} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'move', borderBottom: '1px solid var(--border, #ccc)', fontWeight: 600, fontSize: 13 }}>
        <span style={{ flex: 1 }}>{title}</span>
        <button className="fp-close" aria-label={t('btn.close')} onClick={onClose}>×</button>
      </div>
      <div style={{ padding: 8, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>{children}</div>
    </div>
  );
}

const POS = ['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj'];

/**
 * View > Linguistic Focus: one part of speech stays clear (or is coloured), the rest fades.
 * "Dialogue" uses the editor's dialogue focus (view.focus = 'dialogue').
 */
export function LinguisticFocusPanel({ view, setView, onClose }) {
  const dialogue = view.focus === 'dialogue';
  const cur = dialogue ? 'dialogue' : view.posFocus || '';
  const pick = (id) => {
    if (id === 'dialogue') setView({ posFocus: '', focus: 'dialogue' });
    else setView({ posFocus: id, ...(dialogue ? { focus: 'off' } : {}) });
  };
  const style = view.posStyle || 'fade';
  return (
    <FloatingPanel title={t('ui.mw.lf_title')} className="linguistic-focus-panel" onClose={() => { setView({ posFocus: '', ...(dialogue ? { focus: 'off' } : {}) }); onClose(); }}>
      {['', ...POS, 'dialogue'].map((id) => (
        <label key={id || 'off'} style={{ display: 'flex', gap: 6 }}>
          <input type="radio" name="lf" value={id} checked={cur === id} onChange={() => pick(id)} />
          {id === 'dialogue' ? t('ui.p11.lf_dialogue') : id === 'pron' || id === 'prep' ? t(`ui.p11.lf_${id}`) : id ? t(`ui.mw.lf_${id}`) : t('ui.mw.lf_off')}
        </label>
      ))}
      <label>
        {t('ui.mw.lf_lang')}{' '}
        <select value={view.posLang || 'auto'} onChange={(e) => setView({ posLang: e.target.value })} aria-label={t('ui.mw.lf_lang')}>
          <option value="auto">{t('ui.mw.lf_auto')}</option>
          <option value="ro">Română</option>
          <option value="en">English</option>
        </select>
      </label>
      <label>
        {t('ui.p11.lf_style')}{' '}
        <select className="lf-style" value={style} onChange={(e) => setView({ posStyle: e.target.value })} aria-label={t('ui.p11.lf_style')}>
          <option value="fade">{t('ui.p11.lf_style_fade')}</option>
          <option value="highlight">{t('ui.p11.lf_style_highlight')}</option>
        </select>
      </label>
      {style === 'highlight' ? (
        <label>
          {t('ui.p11.lf_color')}{' '}
          <input type="color" className="lf-color" value={view.posColor || '#ffe58a'} onChange={(e) => setView({ posColor: e.target.value })} aria-label={t('ui.p11.lf_color')} />
        </label>
      ) : (
        <label>
          {t('ui.mw.lf_fade')}
          <input type="range" min="0.05" max="0.8" step="0.05" value={view.fadeOpacity ?? 0.28} onChange={(e) => setView({ fadeOpacity: Number(e.target.value) })} aria-label={t('ui.mw.lf_fade')} style={{ width: '100%' }} />
        </label>
      )}
    </FloatingPanel>
  );
}

/** Project > Keywords HUD: project keywords; Apply toggles one on the selected documents. */
export function KeywordsHud({ project, selectedIds, onToggle, onClose }) {
  const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(null);
  const kws = useMemo(() => listKeywords(project).filter((k) => k.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())), [project, filter]);
  const apply = (name) => name && selectedIds.length && onToggle(name);
  return (
    <FloatingPanel title={t('ui.mw.kh_title')} className="keywords-hud" onClose={onClose} x={window.innerWidth - 330} width={260}>
      <input placeholder={t('ui.mw.kh_filter')} aria-label={t('ui.mw.kh_filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul role="listbox" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 260, overflow: 'auto' }}>
        {kws.length === 0 && <li className="muted">{t('ui.mw.kh_none')}</li>}
        {kws.map((k) => (
          <li
            key={k.name}
            role="option"
            aria-selected={sel === k.name}
            className="kh-item"
            onClick={() => setSel(k.name)}
            onDoubleClick={() => apply(k.name)}
            style={{ padding: '2px 4px', cursor: 'default', background: sel === k.name ? 'var(--sel, #cde)' : undefined, display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 2, background: k.color || 'transparent', border: '1px solid var(--border, #ccc)' }} />
            <span style={{ flex: 1 }}>{k.name}</span>
            <span className="muted">{k.count}</span>
          </li>
        ))}
      </ul>
      <div className="muted">{t('ui.mw.kh_selected', { n: selectedIds.length })}</div>
      <button className="kh-apply" disabled={!sel || !selectedIds.length} onClick={() => apply(sel)}>{t('ui.mw.kh_apply')}</button>
    </FloatingPanel>
  );
}

/** Insert > Special Characters. */
export function SpecialCharsDialog({ onInsert, onClose }) {
  const [cat, setCat] = useState(SPECIAL_CHARS[0].id);
  const [hover, setHover] = useState('');
  const chars = SPECIAL_CHARS.find((c) => c.id === cat).chars;
  return (
    <FloatingPanel title={t('ui.mw.sc_title')} className="special-chars" onClose={onClose} width={360}>
      <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('ui.mw.sc_category')}>
        {SPECIAL_CHARS.map((c) => <option key={c.id} value={c.id}>{t(`ui.mw.sc_${c.id}`)}</option>)}
      </select>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2 }}>
        {chars.map((ch) => (
          <button key={ch} className="sc-char" title={charCode(ch)} onMouseEnter={() => setHover(ch)} onFocus={() => setHover(ch)} onClick={() => onInsert(ch)} style={{ padding: '4px 0', fontSize: 16, minWidth: 0 }}>
            {/^\s|​/.test(ch) ? '␣' : ch}
          </button>
        ))}
      </div>
      <div className="muted">{hover ? charCode(hover) : t('ui.mw.sc_hint')}</div>
    </FloatingPanel>
  );
}

/** Project > Auto-Complete List: words offered by Ctrl+Space in the editor. */
export function AutoCompleteDialog({ list, onSave, onClose }) {
  const [items, setItems] = useState(() => normalizeCompletions(list));
  const [word, setWord] = useState('');
  const add = () => {
    if (!word.trim()) return;
    setItems(normalizeCompletions([...items, word]));
    setWord('');
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal autocomplete-dialog" role="dialog" aria-label={t('ui.mw.ac_title')} onClick={(e) => e.stopPropagation()}>
        <h3>{t('ui.mw.ac_title')}</h3>
        <p className="muted">{t('ui.mw.ac_hint')}</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={word} placeholder={t('ui.mw.ac_new')} aria-label={t('ui.mw.ac_new')} onChange={(e) => setWord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} style={{ flex: 1 }} />
          <button className="ac-add" onClick={add}>+</button>
        </div>
        <ul style={{ maxHeight: 240, overflow: 'auto', margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {items.length === 0 && <li className="muted">{t('ui.mw.ac_empty')}</li>}
          {items.map((w) => (
            <li key={w} style={{ display: 'flex', gap: 6 }}>
              <span style={{ flex: 1 }}>{w}</span>
              <button aria-label={t('btn.delete')} onClick={() => setItems(items.filter((x) => x !== w))}>−</button>
            </li>
          ))}
        </ul>
        <div className="row-actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary ac-save" onClick={() => { onSave(items); onClose(); }}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
