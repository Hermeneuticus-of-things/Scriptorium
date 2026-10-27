import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Top menu (menu bar). Keyboard: Enter/Space/↓ on the button opens it on the first item;
// ↑/↓/Home/End move; Enter activates; Esc or Tab closes it (Esc from inside the menu puts
// focus back on its button). A command chosen from the menu runs with focus back in the editor.
// Items: '-' (separator), { label, action, shortcut, disabled, hidden } or { label, submenu: [...] }.
// A submenu opens on hover, click, Enter or →; ← or Esc goes back to its item.
export default function Menu({ label, items, caret = true, className = '', title }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(-1); // index of the open submenu
  const subRef = useRef(-1);
  subRef.current = sub;
  const subFocus = useRef(false);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const before = useRef(null); // element focused before the menu opened
  const focusItem = useRef(null); // 'first' | 'last' | null: where focus goes when the menu opens

  const shown = (list) => (list || []).filter((it) => it === '-' || !it.hidden);
  const rootPop = () => ref.current?.querySelector(':scope > .menu-pop');
  const itemEls = () => [...(rootPop()?.querySelectorAll(':scope > [role="menuitem"]:not([disabled]), :scope > .menu-subwrap > [role="menuitem"]:not([disabled])') || [])];
  const subEls = () => [...(ref.current?.querySelectorAll('.menu-sub [role="menuitem"]:not([disabled])') || [])];
  const openSub = (i, focus) => {
    subFocus.current = focus;
    setSub(i);
    if (focus && subRef.current === i) subEls()[0]?.focus();
  };
  const closeSub = () => {
    const btn = ref.current?.querySelector(`.menu-subwrap[data-i="${subRef.current}"] > [role="menuitem"]`);
    setSub(-1);
    btn?.focus();
  };
  const close = (restore) => {
    setOpen(false);
    setSub(-1);
    if (restore === 'before' && before.current?.isConnected) before.current.focus();
    else if (restore === 'button') btnRef.current?.focus();
  };

  // The popup is right-aligned to its button; when the menu bar wraps (narrow windows) a menu near
  // the left edge would open off-screen. Shift it back inside the window (and cap its height).
  useLayoutEffect(() => {
    const pop = open && ref.current?.querySelector(':scope > .menu-pop');
    if (!pop) return;
    pop.style.left = '';
    pop.style.right = '';
    const r = pop.getBoundingClientRect();
    const box = ref.current.getBoundingClientRect(); // .menu is the positioning parent
    if (r.left < 4) {
      pop.style.right = 'auto';
      pop.style.left = `${4 - box.left}px`;
    }
    const top = pop.getBoundingClientRect().top;
    if (top + pop.offsetHeight > window.innerHeight - 4) pop.style.maxHeight = `${Math.max(120, window.innerHeight - top - 8)}px`;
  }, [open]);

  // Submenus are fixed-positioned (the scrolling popup would clip them), next to their item and
  // flipped to the left / moved up when they would leave the window.
  useLayoutEffect(() => {
    if (sub < 0) return;
    const wrap = ref.current?.querySelector(`.menu-subwrap[data-i="${sub}"]`);
    const pop = wrap?.querySelector('.menu-sub');
    if (!pop) return;
    const r = wrap.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let left = r.right - 2;
    if (left + w > window.innerWidth - 4) left = Math.max(4, r.left - w + 2);
    let top = r.top - 5;
    if (top + h > window.innerHeight - 4) top = Math.max(4, window.innerHeight - h - 4);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    if (h > window.innerHeight - 8) pop.style.maxHeight = `${window.innerHeight - 8}px`;
    if (subFocus.current) {
      subFocus.current = false;
      subEls()[0]?.focus();
    }
  }, [sub]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    // Esc anywhere closes the open menu (also when focus stayed in the editor).
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (subRef.current >= 0 && document.activeElement?.closest?.('.menu-sub')) return closeSub();
        close(ref.current?.contains(document.activeElement) ? 'button' : null);
      }
    };
    // A click on the native menu bar is not a DOM mousedown: close on the main process's
    // 'native menu opening' signal and when the page loses focus.
    const onAway = () => close(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pneuma:closeMenus', onAway);
    window.addEventListener('blur', onAway);
    if (focusItem.current) {
      const list = itemEls();
      (focusItem.current === 'last' ? list[list.length - 1] : list[0])?.focus();
      focusItem.current = null;
    }
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pneuma:closeMenus', onAway);
      window.removeEventListener('blur', onAway);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openWith = (where) => {
    if (!ref.current?.contains(document.activeElement)) before.current = document.activeElement;
    focusItem.current = where;
    setOpen(true);
  };

  const onButtonKey = (e) => {
    // Handled keys stop here: a parent toolbar (FormatBar) has its own key handling and would
    // otherwise toggle the menu closed again.
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (open) itemEls()[0]?.focus();
      else openWith('first');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (open) itemEls().slice(-1)[0]?.focus();
      else openWith('last');
    }
  };
  const onPopKey = (e) => {
    const inSub = Boolean(document.activeElement?.closest?.('.menu-sub'));
    const list = inSub ? subEls() : itemEls();
    const i = list.indexOf(document.activeElement);
    const go = (n) => {
      e.preventDefault();
      e.stopPropagation();
      list[(n + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i < 0 ? list.length - 1 : i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'ArrowLeft' && inSub) {
      e.preventDefault();
      e.stopPropagation();
      closeSub();
    } else if (e.key === 'ArrowRight' && !inSub) {
      const wrap = document.activeElement?.closest?.('.menu-subwrap');
      if (wrap) {
        e.preventDefault();
        e.stopPropagation();
        openSub(Number(wrap.dataset.i), true);
      }
    } else if (e.key === 'Tab') close();
  };
  const run = (it) => {
    close();
    // Commands act on the editor: give it focus back before running them.
    if (before.current?.isConnected && before.current.closest?.('.ProseMirror')) before.current.focus();
    it.action();
  };
  const leaf = (it, key, onEnter) => (
    <button key={key} role="menuitem" tabIndex={-1} disabled={it.disabled} onMouseEnter={onEnter} onClick={() => run(it)}>
      <span>{it.label}</span>
      {it.shortcut && <kbd>{it.shortcut}</kbd>}
    </button>
  );
  const visible = shown(items);

  return (
    <div className={`menu ${className}`} ref={ref}>
      <button
        ref={btnRef}
        className={open ? 'on' : ''}
        title={title}
        onMouseDown={() => {
          if (!open && !ref.current?.contains(document.activeElement)) before.current = document.activeElement;
        }}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onButtonKey}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}{caret ? ' ▾' : ''}
      </button>
      {open && (
        <div className="menu-pop" role="menu" aria-label={typeof label === 'string' ? label : title} onKeyDown={onPopKey}>
          {visible.map((it, i) => {
            if (it === '-') return i > 0 && i < visible.length - 1 && visible[i - 1] !== '-' ? <hr key={i} /> : null;
            if (!it.submenu) return leaf(it, it.id || it.label, () => sub >= 0 && setSub(-1));
            const children = shown(it.submenu);
            return (
              <div className="menu-subwrap" data-i={i} key={it.id || it.label} onMouseEnter={() => !it.disabled && children.length && setSub(i)}>
                <button
                  role="menuitem"
                  tabIndex={-1}
                  aria-haspopup="menu"
                  aria-expanded={sub === i}
                  className={sub === i ? 'open' : ''}
                  disabled={it.disabled || !children.length}
                  onClick={() => openSub(i, true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      openSub(i, true);
                    }
                  }}
                >
                  <span>{it.label}</span>
                  <span className="menu-arrow" aria-hidden="true">▸</span>
                </button>
                {sub === i && (
                  <div className="menu-pop menu-sub" role="menu" aria-label={it.label}>
                    {children.map((c, j) => (c === '-' ? <hr key={`s${j}`} /> : leaf(c, c.id || c.label)))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
