// Small runtime helpers for the Appearance options (P5) that CSS alone cannot do.

/**
 * Composition: while the writer types, the mouse pointer is hidden (class "typing-hide-cursor"
 * on <html>, effective only when Options > Composition asks for it via data-comp-hide-cursor).
 * Any mouse movement shows it again. Returns the cleanup function.
 */
export function hideCursorWhileTyping(root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root || typeof window === 'undefined') return () => {};
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Escape') return;
    root.classList.add('typing-hide-cursor');
  };
  const onMove = () => root.classList.remove('typing-hide-cursor');
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('mousemove', onMove, true);
  return () => {
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('mousemove', onMove, true);
    root.classList.remove('typing-hide-cursor');
  };
}

/** Saves text as a file in the browser (theme export when the desktop API has no save dialog). */
export function downloadText(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** File name for an exported theme. */
export const themeFileName = (name) => `${String(name || 'tema').trim().replace(/[\\/:*?"<>|]+/g, '_') || 'tema'}.scribnertheme`;

// B17: global UI chrome keys stay in localStorage (intentional).
export { UI_LOCAL_STORAGE_KEYS } from './uiLocalStorage.js';
