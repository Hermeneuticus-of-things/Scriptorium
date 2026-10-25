'use strict';
// Translation and grammar checking through outside services, called from the main process
// (the keys never reach the renderer). `fetch` is injected for tests.

// DeepL: free keys end in ":fx" and use api-free.deepl.com. Target English/Portuguese need a variant.
const DEEPL_TARGET = { en: 'EN-GB', pt: 'PT-PT' };
function deeplEndpoint(apiKey) {
  return /:fx$/.test(String(apiKey).trim()) ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
}

const MAX_CHARS = 30000;

function checkText(text) {
  const t = String(text || '');
  if (!t.trim()) throw new Error('Nu e niciun text de tradus.');
  if (t.length > MAX_CHARS) throw new Error(`Textul e prea lung (${t.length} caractere). Selectează cel mult ${MAX_CHARS}.`);
  return t;
}

async function readError(res, service) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body.message || (body.error && (body.error.message || body.error)) || '';
  } catch {
    /* not JSON */
  }
  if (res.status === 401 || res.status === 403) {
    const blocked = /blocked|service_blocked|restrict/i.test(detail);
    return new Error(`${service}: cheia nu e acceptată${blocked ? ' (pare restricționată — permite-i acest API în consola serviciului)' : ''}. Verific-o în Setări → Servicii și conturi.`);
  }
  if (res.status === 456) return new Error(`${service}: ai atins limita de caractere a contului pe luna aceasta.`);
  if (res.status === 429) return new Error(`${service}: prea multe cereri. Încearcă din nou peste câteva secunde.`);
  return new Error(`${service}: eroare ${res.status}${detail ? ` (${detail})` : ''}.`);
}

async function deeplTranslate({ apiKey, text, from, to = 'ro', fetchImpl = fetch, signal }) {
  if (!apiKey) throw new Error('Pune cheia DeepL în Setări → Servicii și conturi.');
  const t = checkText(text);
  const target = DEEPL_TARGET[to] || String(to || 'ro').toUpperCase();
  const body = { text: [t], target_lang: target, preserve_formatting: true };
  if (from && from !== 'auto') body.source_lang = String(from).toUpperCase();
  const res = await fetchImpl(deeplEndpoint(apiKey), {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${apiKey.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await readError(res, 'DeepL');
  const data = await res.json();
  const tr = data.translations && data.translations[0];
  if (!tr) throw new Error('DeepL nu a întors nicio traducere.');
  return { text: tr.text, detected: String(tr.detected_source_language || '').toLowerCase(), service: 'DeepL' };
}

function decodeHtmlEntities(s) {
  return String(s).replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });
}

async function googleTranslate({ apiKey, text, from, to = 'ro', fetchImpl = fetch, signal }) {
  if (!apiKey) throw new Error('Pune cheia Google Cloud Translation în Setări → Servicii și conturi.');
  const t = checkText(text);
  const body = { q: t, target: to || 'ro', format: 'text' };
  if (from && from !== 'auto') body.source = from;
  const res = await fetchImpl(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey.trim())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw await readError(res, 'Google Translate');
  const data = await res.json();
  const tr = data.data && data.data.translations && data.data.translations[0];
  if (!tr) throw new Error('Google Translate nu a întors nicio traducere.');
  return { text: decodeHtmlEntities(tr.translatedText), detected: tr.detectedSourceLanguage || '', service: 'Google Translate' };
}

// LanguageTool: free public API without an account; Premium with username + API key.
async function languageToolCheck({ username, apiKey, text, language = 'auto', fetchImpl = fetch, signal }) {
  const t = String(text || '');
  if (!t.trim()) throw new Error('Nu e niciun text de verificat.');
  if (t.length > 20000) throw new Error('Textul e prea lung pentru o verificare. Selectează un fragment mai scurt.');
  const premium = Boolean(username && apiKey);
  const params = new URLSearchParams({ text: t, language: language || 'auto' });
  if (premium) {
    params.set('username', username);
    params.set('apiKey', apiKey);
  }
  const url = premium ? 'https://api.languagetoolplus.com/v2/check' : 'https://api.languagetool.org/v2/check';
  const res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: params.toString(), signal });
  if (!res.ok) throw await readError(res, 'LanguageTool');
  const data = await res.json();
  return {
    language: (data.language && data.language.name) || '',
    matches: (data.matches || []).map((m) => ({
      offset: m.offset,
      length: m.length,
      message: m.message,
      short: m.shortMessage || '',
      found: t.slice(m.offset, m.offset + m.length),
      replacements: (m.replacements || []).slice(0, 5).map((r) => r.value),
      rule: (m.rule && m.rule.id) || '',
    })),
    premium,
  };
}

// Text to speech with Speechify: the text is cut at sentence ends into pieces the API accepts and
// each piece comes back as base64 audio, played in order by the window.
const SPEECH_CHUNK = 1800;
function speechChunks(text, max = SPEECH_CHUNK) {
  const parts = [];
  let cur = '';
  for (const sentence of String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?…»”"])\s+/)) {
    if (!sentence) continue;
    if ((cur + ' ' + sentence).trim().length <= max) cur = (cur ? `${cur} ` : '') + sentence;
    else {
      if (cur) parts.push(cur);
      // a single sentence longer than the limit is cut at spaces
      let rest = sentence;
      while (rest.length > max) {
        const cut = rest.lastIndexOf(' ', max) > max / 2 ? rest.lastIndexOf(' ', max) : max;
        parts.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      cur = rest;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

async function speechifySpeak({ apiKey, text, voiceId, model = 'simba-multilingual', fetchImpl = fetch, signal }) {
  if (!apiKey) throw new Error('Pune cheia Speechify în Setări → Servicii și conturi.');
  const chunks = speechChunks(text);
  if (!chunks.length) throw new Error('Nu e niciun text de citit.');
  if (chunks.length > 60) throw new Error('Textul e prea lung pentru o citire. Selectează un fragment.');
  const audio = [];
  for (const input of chunks) {
    const res = await fetchImpl('https://api.sws.speechify.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ input, voice_id: voiceId || 'george', audio_format: 'mp3', model }),
      signal,
    });
    if (!res.ok) throw await readError(res, 'Speechify');
    const data = await res.json();
    if (!data.audio_data) throw new Error('Speechify nu a întors sunet.');
    audio.push(data.audio_data);
  }
  return { format: 'mp3', chunks: audio };
}

module.exports = { deeplTranslate, googleTranslate, languageToolCheck, deeplEndpoint, MAX_CHARS, speechifySpeak, speechChunks };
