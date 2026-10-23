import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Right-click menu positioned at the cursor (fixed), flipped at the window edges.
// items: [{ label, action, disabled, shortcut, checked, submenu: items }] | '-'
// Keyboard: ↑/↓ move, → / Enter opens a submenu, ← closes it, Enter activates, Esc closes, Tab closes.
function place(el, x, y, anchor) {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  let top = y;
  if (anchor) {
    // submenu: to the right of the parent item, or to its left when it would not fit
    left = anchor.right - 2;
    if (left + r.width > vw - 4) left = Math.max(4, anchor.left - r.width + 2);
    top = anchor.top - 4;
  } else if (left + r.width > vw - 4) left = Math.max(4, x - r.width);
  if (top + r.height > vh - 4) top = Math.max(4, (anchor ? anchor.bottom + 4 : y) - r.height);
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  el.style.visibility = 'visible';
}

function MenuList({ items, x, y, anchor, onClose, onBack, autoFocus = true, level = 0 }) {
  const ref = useRef(null);
  const [sub, setSub] = useState(null); // { index, rect, focus }
  useLayoutEffect(() => {
    place(ref.current, x, y, anchor);
    if (autoFocus) ref.current.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const buttons = () => [...ref.current.querySelectorAll(':scope > [role="menuitem"]')];
  const openSub = (i, el, focus) => setSub({ index: i, rect: el.getBoundingClientRect(), focus });
  const run = (it, i, el) => {
    if (it.disabled) return;
    if (it.submenu) return openSub(i, el, true);
    onClose(true);
    it.action?.();
  };
  const onKeyDown = (e) => {
    const list = buttons().filter((b) => b.getAttribute('aria-disabled') !== 'true');
    const at = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = list.length;
      if (!n) return;
      list[(at + (e.key === 'ArrowDown' ? 1 : -1) + n) % n].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      list[e.key === 'Home' ? 0 : list.length - 1]?.focus();
    } else if (e.key === 'ArrowRight') {
      const el = document.activeElement;
      const i = Number(el?.dataset?.i);
      if (items[i]?.submenu) {
        e.preventDefault();
        openSub(i, el, true);
      }
    } else if (e.key === 'ArrowLeft' && onBack) {
      e.preventDefault();
      onBack();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (sub) setSub(null);
      else if (onBack) onBack();
      else onClose(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onClose(false);
    } else return;
    e.stopPropagation();
  };
  return (
    <div ref={ref} className="ctx-menu" role="menu" style={{ position: 'fixed', left: x, top: y, visibility: 'hidden', zIndex: 1000 + level }} onKeyDown={onKeyDown} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) =>
        it === '-' ? (
          <hr key={`sep${i}`} role="separator" />
        ) : (
          <button
            key={`${i}-${it.label}`}
            type="button"
            role="menuitem"
            data-i={i}
            tabIndex={-1}
            aria-disabled={it.disabled ? 'true' : undefined}
            aria-haspopup={it.submenu ? 'menu' : undefined}
            aria-expanded={it.submenu ? sub?.index === i : undefined}
            className={`${it.disabled ? 'disabled' : ''} ${sub?.index === i ? 'open' : ''}`}
            onMouseEnter={(e) => {
              e.currentTarget.focus();
              if (it.submenu && !it.disabled) openSub(i, e.currentTarget, false);
              else if (sub) setSub(null);
            }}
            onClick={(e) => run(it, i, e.currentTarget)}
          >
            <span className="ctx-check">{it.checked ? '✓' : ''}</span>
            <span className="ctx-label">{it.label}</span>
            {it.shortcut && <kbd>{it.shortcut}</kbd>}
            {it.submenu && <span className="ctx-arrow" aria-hidden="true">▸</span>}
          </button>
        ),
      )}
      {sub && items[sub.index]?.submenu && (
        <MenuList
          key={sub.index}
          items={items[sub.index].submenu}
          anchor={sub.rect}
          x={0}
          y={0}
          level={level + 1}
          autoFocus={sub.focus}
          onClose={onClose}
          onBack={() => {
            const i = sub.index;
            setSub(null);
            ref.current?.querySelector(`[data-i="${i}"]`)?.focus();
          }}
        />
      )}
    </div>
  );
}

export default function ContextMenu({ x, y, items, onClose }) {
  const rootRef = useRef(null);
  const restore = useRef(typeof document !== 'undefined' ? document.activeElement : null);
  useEffect(() => {
    const down = (e) => { if (!rootRef.current?.contains(e.target)) onClose(); };
    const blur = () => onClose();
    window.addEventListener('mousedown', down, true);
    window.addEventListener('blur', blur);
    window.addEventListener('resize', blur);
    return () => {
      window.removeEventListener('mousedown', down, true);
      window.removeEventListener('blur', blur);
      window.removeEventListener('resize', blur);
    };
  }, [onClose]);
  const close = (activated) => {
    onClose();
    // keyboard users return to where they were (the binder), unless an action moved focus
    if (!activated) setTimeout(() => restore.current?.focus?.(), 0);
  };
  return (
    <div ref={rootRef} className="ctx-menu-root" onKeyDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <MenuList items={items} x={x} y={y} onClose={close} />
    </div>
  );
}
