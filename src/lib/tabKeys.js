// Keyboard for a row of tabs (WAI-ARIA tabs): ←/→ move, Home/End jump; only the active tab is a
// Tab stop. Use: <div role="tablist" onKeyDown={tabKeys(ids, current, setCurrent)}>, and on each
// tab tabIndex={id === current ? 0 : -1}.
export function tabKeys(ids, current, select) {
  return (e) => {
    const i = ids.indexOf(current);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[e.key];
    if (next === undefined || !ids.length) return;
    e.preventDefault();
    const id = ids[(next + ids.length) % ids.length];
    select(id);
    const list = e.currentTarget;
    requestAnimationFrame(() => list.querySelector('[aria-selected="true"]')?.focus());
  };
}
