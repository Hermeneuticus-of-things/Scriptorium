// Motorul unitar pentru panourile flotante și andocare magnetică (misiunea „sistem universal
// de administrare a ferestrelor și panourilor", Etapa VI). Pur, fără React — suprafața îl
// consumă prin pointer events; starea persistă în ui-layout (aiFloat, quickRefs, …).
//
// Contract:
//  - clampRect(rect, viewport) — ține panoul pe ecran cu margini minime de utilizare.
//  - snapZone(rect, viewport, magnet=80) — detectează andocarea magnetică: 'right'|'left'|'bottom'|'top'|null
//    (panoul lipit de o margine a viewportului devine panou andocat pe acea margine).
//  - snapRect(zone, viewport) — dreptunghiul de andocare previzualizat (jumătate de ecran pe margine).
//  - startDrag / startResize — mașini de stare cu pointer events, cu previzualizare de andocare
//    (callback onPreview) și comitere (onEnd cu rect final sau zonă de andocare).
//  - defaultRect(viewport) — poziția de deschidere în cascadă (fără suprapunere pe panourile existente).

const MIN_W = 320;
const MIN_H = 320;
const EDGE = 8; // cât de aproape de marginea ecranului poate veni panoul

export function clampRect(rect, viewport) {
  const vw = viewport.innerWidth;
  const vh = viewport.innerHeight;
  // Viewport mai mic decât minimele (fereastră mică): panoul ocupă tot viewportul disponibil.
  // Marginile EDGE se păstrează pe ambele părți: lățimea se clamp-ează la vw-2*EDGE.
  // Pe viewporturi foarte mici, panoul se potrivește în viewport (mai bine decât să depășească).
  const w = Math.min(Math.max(MIN_W, rect.w), Math.max(200, vw - 2 * EDGE));
  const h = Math.min(Math.max(MIN_H, rect.h), Math.max(200, vh - 2 * EDGE));
  const x = Math.min(Math.max(EDGE, rect.x), Math.max(EDGE, vw - w - EDGE));
  const y = Math.min(Math.max(EDGE, rect.y), Math.max(EDGE, vh - h - EDGE));
  return { x, y, w, h };
}

/** Zona de andocare magnetică: panoul eliberat lângă o margine a viewportului se andochează acolo. */
export function snapZone(rect, viewport, magnet = 90) {
  const nearRight = viewport.innerWidth - (rect.x + rect.w) <= magnet;
  const nearLeft = rect.x <= magnet;
  const nearBottom = viewport.innerHeight - (rect.y + rect.h) <= magnet;
  const nearTop = rect.y <= magnet;
  if (nearRight) return 'right';
  if (nearLeft) return 'left';
  if (nearBottom) return 'bottom';
  if (nearTop) return 'top';
  return null;
}

/** Dreptunghiul de andocare pentru zonă: panou de jumătate de viewport, lipit de margine. */
export function snapRect(zone, viewport) {
  const vw = viewport.innerWidth;
  const vh = viewport.innerHeight;
  const half = Math.max(MIN_W, Math.round(vw / 2));
  const halfH = Math.max(MIN_H, Math.round(vh / 2));
  switch (zone) {
    case 'right': return { x: vw - half, y: 0, w: half, h: vh };
    case 'left': return { x: 0, y: 0, w: half, h: vh };
    case 'bottom': return { x: 0, y: vh - halfH, w: vw, h: halfH };
    case 'top': return { x: 0, y: 0, w: vw, h: halfH };
    default: return null;
  }
}

/**
 * Drag de antet: mută panoul; la eliberare, dacă e lângă margine, comite dreptunghiul de
 * andocare. Callback-uri: onMove(rect), onPreview(zone|null), onEnd({rect, zone}).
 */
export function startDrag({ el, header, viewport, rect, setRect, onMove, onPreview, onEnd, magnet = 90, win = (typeof window !== 'undefined' ? window : undefined) }) {
  const onHeadDown = (e) => {
    if (e.target?.closest?.('button, input, textarea, select, a')) return;
    e.preventDefault();
    const start = rect();
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    let lastZone = null;
    const move = (ev) => {
      const moved = clampRect({ x: ev.clientX - dx, y: ev.clientY - dy, w: start.w, h: start.h }, viewport());
      lastMoved = moved;
      setRect(moved);
      onMove?.(moved);
      const zone = snapZone(moved, viewport(), magnet);
      if (zone !== lastZone) { lastZone = zone; onPreview?.(zone); }
    };
    let lastMoved = null;
    const up = () => {
      win.removeEventListener('pointermove', move);
      win.removeEventListener('pointerup', up);
      const moved = lastMoved || clampRect(start, viewport());
      const zone = snapZone(moved, viewport(), magnet);
      if (zone) {
        const target = snapRect(zone, viewport());
        setRect(target);
        onPreview?.(null);
        onEnd?.({ rect: target, zone, moved });
      } else {
        onPreview?.(null);
        onEnd?.({ rect: moved, zone: null, moved });
      }
    };
    win.addEventListener('pointermove', move);
    win.addEventListener('pointerup', up);
  };
  header.addEventListener('pointerdown', onHeadDown);
  return () => header.removeEventListener('pointerdown', onHeadDown);
}

/** Resize din colțul inferior-drept: lățime/înălțime minime garantate, clamp pe viewport. */
export function startResize({ el, grip, viewport, rect, setRect, win = (typeof window !== 'undefined' ? window : undefined) }) {
  if (!grip) return () => {};
  const onGripDown = (e) => {
    e.preventDefault();
    const start = rect();
    const sx = e.clientX;
    const sy = e.clientY;
    const move = (ev) => {
      const moved = clampRect(
        { x: start.x, y: start.y, w: start.w + ev.clientX - sx, h: start.h + ev.clientY - sy },
        viewport()
      );
      setRect(moved);
    };
    const up = () => {
      win.removeEventListener('pointermove', move);
      win.removeEventListener('pointerup', up);
    };
    win.addEventListener('pointermove', move);
    win.addEventListener('pointerup', up);
  };
  grip.addEventListener('pointerdown', onGripDown);
  return () => grip.removeEventListener('pointerdown', onGripDown);
}

/** Poziția de deschidere în cascadă: fiecare panou nou se deschide decalat față de cele existente. */
export function defaultRect(viewport, existing = [], w = 420, h = 560) {
  const base = { x: viewport.innerWidth - w - 24, y: 60, w, h };
  const step = 28;
  for (let k = 0; k < 10; k++) {
    const r = { ...base, x: base.x - k * step, y: base.y + k * step };
    const clash = existing.some((e) => Math.abs(e.x - r.x) < step && Math.abs(e.y - r.y) < step);
    if (!clash) return clampRect(r, viewport);
  }
  return clampRect(base, viewport);
}
