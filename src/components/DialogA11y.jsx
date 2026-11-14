import { useEffect } from 'react';
import { t } from '../lib/i18n.js';

// Closes a dialog the same way Esc does: every dialog wires its backdrop click to onClose.
function closeDialog(modal) {
  const backdrop = modal.parentElement;
  if (!backdrop) return;
  backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  backdrop.click();
}

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

// A close "×" at the top-right of every dialog, since not everyone knows Esc. It closes the dialog
// the same way Esc does. Only real modals (not the help window), and only when the dialog doesn't
// provide its own. Re-checked on every scan: if React re-renders and drops the button, it comes back.
export function ensureCloseX(modal) {
  if (!modal.classList.contains('modal') || modal.dataset.noCloseX || modal.querySelector(':scope > .modal-x')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'modal-x';
  btn.textContent = '×';
  btn.setAttribute('aria-label', t('btn.close'));
  btn.title = t('btn.close');
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeDialog(modal); });
  modal.appendChild(btn);
}

// Explicit safe target > editable field > first non-destructive action > container.
export function safeInitialDialogTarget(modal) {
  const safe = (el) => !el.matches('.modal-x, .danger, [data-destructive="true"]') && el.textContent?.trim() !== '×';
  const list = focusables(modal).filter(safe);
  return list.find((el) => el.hasAttribute('data-initial-focus')) || list.find((el) => el.matches('input, textarea, select, [contenteditable="true"]')) || list[0] || modal;
}

export default function DialogA11y() {
  useEffect(() => {
    const open = new Map();
    const inertBefore = new Map();
    const frames = new Set();
    let lastFocus = document.activeElement;
    const capture = (opener) => {
      const scroll = [];
      for (let p = opener; p; p = p.parentElement) scroll.push([p, p.scrollTop, p.scrollLeft]);
      const sel = window.getSelection();
      const range = sel?.rangeCount && opener?.contains?.(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
      return { opener, scroll, range, start: opener?.selectionStart, end: opener?.selectionEnd };
    };
    let lastSaved = capture(lastFocus);
    const top = () => [...open.keys()].filter((m) => m.isConnected).pop();
    const restoreInert = () => {
      for (const [el, value] of inertBefore) if (el.isConnected) el.inert = value;
      inertBefore.clear();
    };
    const isolate = (modal) => {
      if (!modal) return;
      for (let branch = modal; branch?.parentElement; branch = branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling === branch || sibling.tagName === 'SCRIPT' || sibling.tagName === 'STYLE') continue;
          if (!inertBefore.has(sibling)) inertBefore.set(sibling, sibling.inert);
          sibling.inert = true;
        }
        if (branch.parentElement === document.body) break;
      }
    };
    const focusSafely = (modal) => {
      const target = safeInitialDialogTarget(modal);
      if (target === modal) modal.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    const onFocusIn = (e) => {
      const owner = e.target.closest?.('.modal, .help-window');
      const activeModal = top();
      if (activeModal && !activeModal.contains(e.target) && (!owner || open.has(owner))) {
        focusSafely(activeModal);
        return;
      }
      // Existing parent-dialog fields are valid openers; an autoFocus from a NEW child is not.
      if ((!owner || open.has(owner)) && !e.target.closest?.('[role=menu], .ctx-menu, [aria-haspopup=menu], .menubar')) {
        lastFocus = e.target;
        lastSaved = capture(lastFocus);
      }
    };
    const onSelection = () => {
      if (lastFocus === document.activeElement && !lastFocus?.closest?.('.modal, .help-window')) lastSaved = capture(lastFocus);
    };
    const scan = () => {
      restoreInert();
      const added = [];
      for (const modal of document.querySelectorAll('.modal-backdrop > .modal')) ensureCloseX(modal);
      for (const modal of document.querySelectorAll('.modal-backdrop > .modal, .help-backdrop > .help-window')) {
        if (open.has(modal)) continue;
        decorateDialog(modal);
        open.set(modal, lastSaved);
        added.push(modal);
      }
      for (const [modal, saved] of [...open]) {
        if (modal.isConnected) continue;
        open.delete(modal);
        const active = document.activeElement;
        const parentModal = top();
        if ((!active || active === document.body || !active.isConnected) && saved.opener?.isConnected && (!parentModal || parentModal.contains(saved.opener))) {
          saved.opener.focus?.({ preventScroll: true });
          if (typeof saved.start === 'number') saved.opener.setSelectionRange?.(saved.start, saved.end);
          if (saved.range?.startContainer.isConnected && saved.range?.endContainer.isConnected) {
            const selection = window.getSelection();
            selection.removeAllRanges(); selection.addRange(saved.range);
          }
          for (const [el, y, x] of saved.scroll) if (el.isConnected) { el.scrollTop = y; el.scrollLeft = x; }
        }
      }
      const activeModal = top();
      isolate(activeModal);
      for (const modal of added) {
        const frame = requestAnimationFrame(() => {
          frames.delete(frame);
          if (!modal.isConnected || modal !== top()) return;
          const active = document.activeElement;
          const unsafe = active?.matches?.('.modal-x, .danger, [data-destructive="true"]') || active?.textContent?.trim() === '×';
          if (!modal.contains(active) || unsafe) focusSafely(modal);
        });
        frames.add(frame);
      }
    };
    const onKey = (e) => {
      const modal = top();
      if (!modal || e.defaultPrevented) return;
      if (e.key === 'Tab') {
        const list = focusables(modal);
        if (!list.length) { e.preventDefault(); return; }
        const first = list[0], last = list[list.length - 1];
        const inside = modal.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'Escape') { e.preventDefault(); closeDialog(modal); }
    };
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('selectionchange', onSelection);
    document.addEventListener('keydown', onKey);
    scan();
    return () => {
      mo.disconnect(); restoreInert();
      for (const frame of frames) cancelAnimationFrame(frame);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('selectionchange', onSelection);
      document.removeEventListener('keydown', onKey);
      open.clear();
    };
  }, []);
  return null;
}
