import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Top menu (menu bar). Keyboard: Enter/Space/↓ on the button opens it on the first item;
// ↑/↓/Home/End move; Enter activates; Esc or Tab closes it (Esc from inside the menu puts
// focus back on its button). A command chosen from the menu runs with focus back in the editor.
export default function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);
  const before = useRef(null); // element focused before the menu opened
  const focusItem = useRef(null); // 'first' | 'last' | null: where focus goes when the menu opens

  const itemEls = () => [...(ref.current?.querySelectorAll('.menu-pop [role="menuitem"]:not([disabled])') || [])];
  const close = (restore) => {
    setOpen(false);
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
        close(ref.current?.contains(document.activeElement) ? 'button' : null);
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    if (focusItem.current) {
      const list = itemEls();
      (focusItem.current === 'last' ? list[list.length - 1] : list[0])?.focus();
      focusItem.current = null;
    }
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
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
    const list = itemEls();
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
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div className="menu" ref={ref}>
      <button
        ref={btnRef}
        className={open ? 'on' : ''}
        onMouseDown={() => {
          if (!open && !ref.current?.contains(document.activeElement)) before.current = document.activeElement;
        }}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label} ▾
      </button>
      {open && (
        <div className="menu-pop" role="menu" aria-label={label} onKeyDown={onPopKey}>
          {items.map((it, i) =>
            it === '-' ? (
              <hr key={i} />
            ) : (
              <button
                key={it.label}
                role="menuitem"
                tabIndex={-1}
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  // Commands act on the editor: give it focus back before running them.
                  if (before.current?.isConnected && before.current.closest?.('.ProseMirror')) before.current.focus();
                  it.action();
                }}
              >
                <span>{it.label}</span>
                {it.shortcut && <kbd>{it.shortcut}</kbd>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
