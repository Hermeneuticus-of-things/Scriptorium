// Strip the invisible "fingerprint" characters that large language models (ChatGPT, Claude,
// Gemini) leave in their output. OpenAI calls them a side effect of training rather than a
// deliberate watermark, but they are real, they travel with copied text, and a text detector or
// a reader can see them. None of them has a legitimate use in Romanian prose, so removing them
// changes nothing a reader sees while erasing the machine signature. This is deterministic and
// safe (no AI), so it runs on import and as part of the safe autofix.
//
// Research basis (2025): the narrow no-break space U+202F is the most-reported tell; zero-width
// characters, bidi controls, Unicode variation selectors and the Unicode "tag" block (U+E0000..)
// are the known steganography carriers. ZWJ (U+200D) is deliberately NOT removed: it holds emoji
// sequences together. Combining diacritics (a-macron, r-dot … the ALOGEN transliterations) are NOT
// touched; only the combining grapheme joiner U+034F is.
//
// Patterns are built with new RegExp from escaped strings so the source stays pure ASCII
// (a literal U+2028/U+2029 would itself break a regex literal).

// Invisible, no legitimate use in prose -> removed outright.
const REMOVE_RE = new RegExp('[\\u200B\\u200C\\u2060\\uFEFF\\u00AD\\u034F\\u180E\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFE00-\\uFE0F]', 'g');
// Astral steganography carriers: Unicode tags (U+E0000..E007F) and variation selectors supplement
// (U+E0100..E01EF), both in plane 14 -> high surrogate U+DB40 + low surrogate U+DC00..U+DDEF.
const ASTRAL_RE = new RegExp('\\uDB40[\\uDC00-\\uDDEF]', 'g');
// Exotic spaces (incl. the narrow no-break space U+202F) -> a normal space.
const SPACE_RE = new RegExp('[\\u00A0\\u2000-\\u200A\\u202F\\u205F\\u3000]', 'g');
// Line / paragraph separators -> a newline.
const LINE_RE = new RegExp('[\\u2028\\u2029]', 'g');
// What counts as an "AI fingerprint" for flagging (ordinary NBSP alone is legitimate typography,
// so it is normalised but not flagged): the invisible set, the tag/variation carriers and U+202F.
const FINGERPRINT_RE = new RegExp('[\\u200B\\u200C\\u2060\\uFEFF\\u00AD\\u034F\\u180E\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFE00-\\uFE0F\\u202F]|\\uDB40[\\uDC00-\\uDDEF]');

export function stripAiWatermarks(text) {
  return String(text ?? '')
    .replace(ASTRAL_RE, '')
    .replace(REMOVE_RE, '')
    .replace(SPACE_RE, ' ')
    .replace(LINE_RE, '\n');
}

export function hasHiddenChars(text) {
  return FINGERPRINT_RE.test(String(text ?? ''));
}

export function countHidden(text) {
  const s = String(text ?? '');
  const inv = (s.match(REMOVE_RE) || []).length;
  const astral = (s.match(ASTRAL_RE) || []).length;
  const narrow = (s.match(new RegExp('\\u202F', 'g')) || []).length;
  return inv + astral + narrow;
}
