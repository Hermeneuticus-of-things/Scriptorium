import React, { useLayoutEffect, useRef, useState } from 'react';

// Popover ancorat în pagină (ADL §4.3: detaliu temporar FĂRĂ să părăsești suprafața de bază).
// Poziționare cu ajustare la viewport (patternul .service-popover), Escape și click-afară închid.
// Reutilizează stilurile .service-popover — aceeași familie vizuală, adăugat doar .anchored-popover.
export default function AnchoredPopover({ x, y, onClose, title, width, children }) {
  const ref = useRef(null);
  const [adj, setAdj] = useState(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let ax = Math.max(12, Math.min(x ?? 120, (window.innerWidth || 1200) - r.width - 12));
    let ay = Math.max(12, Math.min(y ?? 140, (window.innerHeight || 800) - r.height - 12));
    setAdj({ x: ax, y: ay });
  }, [x, y]);
  useLayoutEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown, true); document.removeEventListener('keydown', onKey, true); };
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="service-popover anchored-popover"
      role="dialog"
      aria-label={title}
      style={{ left: adj?.x ?? (x ?? 120), top: adj?.y ?? (y ?? 140), visibility: adj ? 'visible' : 'hidden', width: width ? Math.min(width, (window.innerWidth || 1200) - 24) : undefined }}
      onClick={(e) => e.stopPropagation()}
    >
      {title ? <h3>{title}</h3> : null}
      {children}
    </div>
  );
}
