import { useEffect } from 'react';

// Accessibility for every modal dialog in the app, in one place. All dialogs share the same
// markup (`.modal-backdrop > .modal`), so instead of repeating the logic in ~25 components this
// watches the DOM for them and gives each one:
//  - role="dialog", aria-modal="true" and a name (its first heading) when it has none;
//  - initial focus inside the dialog (unless a field already took it via autoFocus);
//  - a focus trap: Tab / Shift+Tab cycle inside the topmost dialog;
//  - Esc closes it (clicks the backdrop, which every dialog wires to onClose);
//  - focus goes back to the element that opened it once it closes.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

let seq = 0;
const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
export const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((el) => visible(el) && !el.closest('[inert]'));

/** Applies the static dialog attributes; exported for tests. */
export function decorateDialog(modal) {
  if (!modal.getAttribute('role')) modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  if (!modal.hasAttribute('aria-label') && !modal.hasAttribute('aria-labelledby')) {
    const h = modal.querySelector('h1, h2, h3, h4, legend');
    if (h) {
      if (!h.id) h.id = `dlg-title-${++seq}`;
      modal.setAttribute('aria-labelledby', h.id);
    }
  }
}

export default function DialogA11y() {
  useEffect(() => {
    const open = new Map(); // modal element -> element focused before it opened
    let lastFocus = document.activeElement;
    // Remember what had focus before a dialog opened. Menu items are skipped: the menu closes
    // when the dialog opens, so focus goes back to the menu button (or what was focused before).
    const onFocusIn = (e) => {
      if (!e.target.closest?.('.modal, [role=menu], .context-menu')) lastFocus = e.target;
    };
    const top = () => [...open.keys()].filter((m) => m.isConnected).pop();

    const scan = () => {
      for (const modal of document.querySelectorAll('.modal-backdrop > .modal')) {
        if (open.has(modal)) continue;
        decorateDialog(modal);
        open.set(modal, lastFocus);
        // let autoFocus / effects run first, then make sure focus is inside
        requestAnimationFrame(() => {
          if (!modal.isConnected || modal.contains(document.activeElement)) return;
          const first = focusables(modal)[0];
          if (first) first.focus();
          else {
            modal.setAttribute('tabindex', '-1');
            modal.focus();
          }
        });
      }
      for (const [modal, opener] of [...open]) {
        if (modal.isConnected) continue;
        open.delete(modal);
        const active = document.activeElement;
        if ((!active || active === document.body || !active.isConnected) && opener?.isConnected) opener.focus?.();
      }
    };

    const onKey = (e) => {
      const modal = top();
      if (!modal) return;
      if (e.key === 'Tab') {
        const list = focusables(modal);
        if (!list.length) {
          e.preventDefault();
          return;
        }
        const first = list[0];
        const last = list[list.length - 1];
        const inside = modal.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape' && !e.defaultPrevented) {
        // a field that handles Esc itself (shortcut capture, inline rename) stops propagation
        const backdrop = modal.parentElement;
        e.preventDefault();
        backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        backdrop.click();
      }
    };

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKey);
    scan();
    return () => {
      mo.disconnect();
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return null;
}
