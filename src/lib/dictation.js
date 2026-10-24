// Dictation and audio transcription with D&TED (docs/DTED.md). Pure helpers plus the editor
// insertion: text dictated with nothing selected goes in at the cursor; dictated over a selection
// it replaces the selection (an edit). The whole dictation is one undo step while nothing else is
// typed in between.

// Romanian function words and frequent sentence openers that are never names.
const COMMON = new Set(('și,iar,dar,însă,ci,sau,ori,că,ca,să,de,la,în,pe,cu,din,prin,spre,pentru,fără,după,până,'
  + 'despre,către,lângă,sub,peste,între,care,ce,cine,cum,când,unde,cât,dacă,deși,pentru,apoi,atunci,acum,'
  + 'deja,încă,mai,tot,doar,chiar,nu,da,el,ea,ei,ele,eu,tu,noi,voi,îl,o,îi,le,ne,vă,mă,te,se,și-a,s-a,'
  + 'a,am,ai,au,are,era,erau,fost,este,e,sunt,un,o,niște,acest,această,acel,acea,asta,aceea,fiecare,'
  + 'toți,toate,totul,nimic,nimeni,foarte,prea,aici,acolo,the,and,but').split(','));

/** Text to insert after `before` (the text just before the cursor): spacing and a capital letter. */
// The recogniser often writes ş/ţ with a cedilla: Romanian uses the comma below (ș/ț).
export const cedillaToComma = (s) => s.replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț');

export function joinFragment(before, fragment) {
  let t = cedillaToComma(String(fragment || '')).replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const prev = String(before || '');
  const last = prev.slice(-1);
  const trimmed = prev.replace(/\s+$/, '');
  const sentenceStart = !trimmed || /[.!?…]["”»)]*$/.test(trimmed) || /\n$/.test(prev);
  const lead = /^[„«"'(\[]*/.exec(t)[0]; // an opening quote before the first letter
  if (sentenceStart) t = lead + (t[lead.length] || '').toLocaleUpperCase('ro') + t.slice(lead.length + 1);
  else {
    // The recogniser starts every ~4 s piece with a capital; in mid-sentence a common word goes
    // back to lower case ("am mers Și apoi" → "am mers și apoi"). Names keep their capital.
    const m = /^([\p{Lu}][\p{Ll}]*)(?=[^\p{L}]|$)/u.exec(t.slice(lead.length));
    if (m && COMMON.has(m[1].toLocaleLowerCase('ro'))) t = lead + m[1].toLocaleLowerCase('ro') + t.slice(lead.length + m[1].length);
  }
  const glue = !prev || /[\s(„«"'\[—-]$/.test(last) || /^[.,;:!?…)\]»”]/.test(t) ? '' : ' ';
  return glue + t;
}

/** The writer's auto-replacements on whole words (case of the dictated word kept). */
export function applyReplacements(text, list = []) {
  const map = new Map();
  for (const r of list || []) if (r && r.from && r.to && !/\s/.test(r.from)) map.set(r.from.toLocaleLowerCase('ro'), r.to);
  if (!map.size) return text;
  return cedillaToComma(String(text)).replace(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu, (w) => {
    const to = map.get(w.toLocaleLowerCase('ro'));
    if (to === undefined) return w;
    return w[0] === w[0].toLocaleUpperCase('ro') && w[0] !== w[0].toLocaleLowerCase('ro') ? to[0].toLocaleUpperCase('ro') + to.slice(1) : to;
  });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function clock(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * HTML of a transcription: segments joined into paragraphs, a new paragraph after a pause of
 * `gap` seconds or more; with `timestamps`, each paragraph starts with [mm:ss].
 */
export function transcriptHtml(result, { gap = 1.5, timestamps = false } = {}) {
  const segs = (result?.segmente || []).filter((s) => String(s.text || '').trim());
  if (!segs.length) {
    const text = String(result?.text || '').trim();
    return text ? `<p>${esc(text)}</p>` : '<p></p>';
  }
  const paras = [];
  let cur = null;
  for (const s of segs) {
    if (!cur || Number(s.start) - cur.end >= gap) {
      cur = { start: Number(s.start) || 0, end: Number(s.end) || 0, parts: [] };
      paras.push(cur);
    }
    cur.parts.push(String(s.text).trim());
    cur.end = Number(s.end) || cur.end;
  }
  return paras.map((p) => `<p>${timestamps ? `[${clock(p.start)}] ` : ''}${esc(p.parts.join(' '))}</p>`).join('');
}

/** Audio files D&TED can transcribe. */
export const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|flac|aac|wma|opus|webm)$/i;

/**
 * Inserts a dictated fragment into a TipTap editor at its selection (replacing it). `session`
 * keeps the last dictation transaction, so the next fragment joins the same undo step when the
 * writer did not touch the text in between. Returns the inserted text ('' when nothing).
 */
export function insertFragment(editor, fragment, session = {}, { replacements } = {}) {
  if (!editor || editor.isDestroyed || !editor.isEditable) return '';
  const { state } = editor;
  const { from, to } = state.selection;
  const before = state.doc.textBetween(Math.max(0, from - 200), from, '\n', ' ');
  const text = joinFragment(before, applyReplacements(fragment, replacements));
  if (!text) return '';
  const tr = state.tr.insertText(text, from, to);
  if (session.lastDoc && session.lastDoc === state.doc && session.lastTr) tr.setMeta('appendedTransaction', session.lastTr);
  editor.view.dispatch(tr);
  session.lastDoc = editor.state.doc;
  session.lastTr = tr;
  session.text = (session.text ? `${session.text} ` : '') + text.trim();
  return text;
}
