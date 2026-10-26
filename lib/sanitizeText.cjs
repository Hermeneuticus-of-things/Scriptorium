'use strict';
// CommonJS twin of src/lib/sanitize.js for the Node import pipeline (docx/rtf/txt/md).
// Keeps imported text free of the invisible LLM "fingerprint" characters. The two files must
// stay identical in behaviour; tests/sanitize.test.js asserts parity on a fixture.
// Patterns are built with new RegExp from escaped strings so the source stays pure ASCII
// (a literal U+2028/U+2029 would itself break a regex literal).

const REMOVE_RE = new RegExp('[\\u200B\\u200C\\u2060\\uFEFF\\u00AD\\u034F\\u180E\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFE00-\\uFE0F]', 'g');
const ASTRAL_RE = new RegExp('\\uDB40[\\uDC00-\\uDDEF]', 'g');
const SPACE_RE = new RegExp('[\\u00A0\\u2000-\\u200A\\u202F\\u205F\\u3000]', 'g');
const LINE_RE = new RegExp('[\\u2028\\u2029]', 'g');
const FINGERPRINT_RE = new RegExp('[\\u200B\\u200C\\u2060\\uFEFF\\u00AD\\u034F\\u180E\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFE00-\\uFE0F\\u202F]|\\uDB40[\\uDC00-\\uDDEF]');

function stripAiWatermarks(text) {
  return String(text == null ? '' : text)
    .replace(ASTRAL_RE, '')
    .replace(REMOVE_RE, '')
    .replace(SPACE_RE, ' ')
    .replace(LINE_RE, '\n');
}

function hasHiddenChars(text) {
  return FINGERPRINT_RE.test(String(text == null ? '' : text));
}

module.exports = { stripAiWatermarks, hasHiddenChars };
