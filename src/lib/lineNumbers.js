// Line numbers for the editor gutter (pure, testable).
// blocks: [{top, height, tops: [line rect tops]}] in screen px; origin: gutter top.
// mode 'lines': one number per visual line (rects with the same top are one line);
// 'paragraphs': one number per paragraph. → [{n, top}] with top relative to origin.
export function lineTops(blocks, origin = 0, mode = 'lines') {
  const out = [];
  let n = 0;
  for (const b of blocks || []) {
    if (!b || b.height <= 0) continue;
    let tops = [];
    if (mode === 'lines') {
      const seen = [];
      for (const t of b.tops || []) {
        if (t < b.top - 1 || t > b.top + b.height) continue;
        if (!seen.some((s) => Math.abs(s - t) < 3)) seen.push(t);
      }
      tops = seen.sort((x, y) => x - y);
    }
    if (!tops.length) tops = [b.top];
    for (const t of tops) out.push({ n: ++n, top: Math.round(t - origin) });
  }
  return out;
}
