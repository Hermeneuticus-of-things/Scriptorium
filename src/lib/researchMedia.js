// Research documents shown in the editor pane: kind of viewer, PDF view address, zoom steps,
// media timestamps and the PDF annotations kept on the binder item (node.media).

export function mediaKind(media) {
  const mime = String((media && media.mime) || '');
  const file = String((media && (media.name || media.file)) || '').toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'text/html' || mime === 'application/x-webarchive' || /\.(html?|webarchive|mht)$/.test(file)) return 'web';
  return 'other';
}

// Address for the built-in PDF viewer: page, zoom (percent) and a search term go in the fragment.
export function pdfViewUrl(base, { page = 1, zoom = null, search = '' } = {}) {
  if (!base) return '';
  const parts = [`page=${Math.max(1, Math.floor(Number(page) || 1))}`];
  if (zoom === 'fit') parts.push('view=Fit');
  else if (zoom === 'width') parts.push('view=FitH');
  else if (Number(zoom) > 0) parts.push(`zoom=${Math.round(Number(zoom))}`);
  const q = String(search || '').trim();
  if (q) parts.push(`search=${encodeURIComponent(q)}`);
  return `${String(base).split('#')[0]}#${parts.join('&')}`;
}

export const ZOOM_STEPS = [25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400];

export function stepZoom(current, dir) {
  const z = Number(current) || 100;
  if (dir > 0) return ZOOM_STEPS.find((s) => s > z + 0.5) || ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find((s) => s < z - 0.5) || ZOOM_STEPS[0];
}

// Scale that fits an image of w×h inside a box of bw×bh (never enlarges past 100%).
export function fitScale(w, h, bw, bh) {
  if (!(w > 0 && h > 0 && bw > 0 && bh > 0)) return 1;
  return Math.min(1, bw / w, bh / h);
}

// 75.4 → "01:15"; 3725 → "1:02:05".
export function formatTimestamp(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

// "[01:15]" / "1:02:05" → seconds, or null.
export function parseTimestamp(text) {
  const m = String(text || '').match(/^\[?(?:(\d+):)?(\d{1,2}):(\d{2})\]?$/);
  if (!m) return null;
  return (Number(m[1]) || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Paragraph appended to notes: "[01:15] (title) ".
export function timestampHtml(sec, title = '') {
  const ts = formatTimestamp(sec);
  return `<p><strong>[${ts}]</strong>${title ? ` <em>${esc(title)}</em>` : ''} </p>`;
}

// PDF annotations: [{id, page, kind: 'highlight'|'note', text, note, color, created}]
export function addAnnotation(list, { page, kind = 'note', text = '', note = '', color = '#ffe066' }, now = Date.now()) {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const t = String(text || '').trim().slice(0, 4000);
  const n = String(note || '').trim().slice(0, 4000);
  if (!t && !n) return Array.isArray(list) ? list : [];
  const item = { id: `a${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, page: p, kind: kind === 'highlight' ? 'highlight' : 'note', text: t, note: n, color: String(color || '#ffe066'), created: new Date(now).toISOString() };
  return sortAnnotations([...(Array.isArray(list) ? list : []), item]);
}

export function removeAnnotation(list, id) {
  return (Array.isArray(list) ? list : []).filter((a) => a.id !== id);
}

export function updateAnnotation(list, id, patch) {
  return (Array.isArray(list) ? list : []).map((a) => (a.id === id ? { ...a, ...patch, id: a.id } : a));
}

export function sortAnnotations(list) {
  return [...(list || [])].sort((a, b) => a.page - b.page || String(a.created).localeCompare(String(b.created)));
}

// Annotations as HTML (quote + note + page), for "Copy to notes".
export function annotationsHtml(list, title = '') {
  const items = sortAnnotations(list);
  if (!items.length) return '';
  return items
    .map((a) => `<blockquote><p>${esc(a.text || '')}</p></blockquote>${a.note ? `<p>${esc(a.note)}</p>` : ''}<p><em>${esc(title ? `${title}, ` : '')}p. ${a.page}</em></p>`)
    .join('');
}

// Number of pages of a PDF (its bytes as latin1 text): counts "/Type /Page" objects, not "/Pages".
export function pdfPageCount(text) {
  const s = String(text || '');
  const m = s.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  if (m && m.length) return m.length;
  const c = s.match(/\/Count\s+(\d+)/);
  return c ? Number(c[1]) : 0;
}

// data: address → bytes (no fetch: the page's policy does not allow fetching data: addresses).
export function dataUrlBytes(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if (!m) return null;
  if (!m[2]) return { mime: m[1], bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}

// True when a drag carries files from the system (not binder items).
export function dragHasFiles(dt) {
  return Boolean(dt) && [...(dt.types || [])].includes('Files');
}
