// Text-to-speech (speechSynthesis) and dictation (webkitSpeechRecognition).

const synth = () => (typeof window !== 'undefined' ? window.speechSynthesis : null);

export const ttsSupported = () => !!synth();
export const dictationSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function getVoices() {
  return synth()?.getVoices() || [];
}

/** Resolves voices once loaded (Chromium loads them async). */
export function loadVoices(timeout = 1500) {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const v = s.getVoices();
  if (v.length) return Promise.resolve(v);
  return new Promise((res) => {
    const done = () => res(s.getVoices());
    s.addEventListener?.('voiceschanged', done, { once: true });
    setTimeout(done, timeout);
  });
}

/** Prefer exact lang, then same language prefix, then default. */
export function pickVoice(voices, lang = 'ro-RO') {
  const l = lang.toLowerCase();
  return (
    voices.find((v) => v.lang?.toLowerCase() === l) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(l.split('-')[0])) ||
    voices.find((v) => v.default) ||
    voices[0] ||
    null
  );
}

/** Split long text into sentence chunks (Chromium cuts utterances ~>15s). */
export function chunkText(text, max = 220) {
  const parts = String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]*\s*/g) || [];
  const out = [];
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Speak text. Returns controller { stop }. Options: voice (SpeechSynthesisVoice|name), lang, rate, pitch, onEnd, onBoundary.
 */
export function speak(text, { voice, lang = 'ro-RO', rate = 1, pitch = 1, onEnd, onError } = {}) {
  const s = synth();
  if (!s) {
    onError?.(new Error('Sinteza vocală nu este disponibilă.'));
    return { stop() {} };
  }
  s.cancel();
  const voices = s.getVoices();
  const v = typeof voice === 'string' ? voices.find((x) => x.name === voice) : voice || pickVoice(voices, lang);
  const chunks = chunkText(text);
  let cancelled = false;
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    if (v) u.voice = v;
    u.lang = v?.lang || lang;
    u.rate = rate;
    u.pitch = pitch;
    if (i === chunks.length - 1) u.onend = () => !cancelled && onEnd?.();
    u.onerror = (e) => e.error !== 'interrupted' && e.error !== 'canceled' && onError?.(e);
    s.speak(u);
  });
  if (!chunks.length) onEnd?.();
  return {
    stop() {
      cancelled = true;
      s.cancel();
    },
  };
}

export const pause = () => synth()?.pause();
export const resume = () => synth()?.resume();
export const stop = () => synth()?.cancel();
export const isSpeaking = () => !!synth()?.speaking;
export const isPaused = () => !!synth()?.paused;

/**
 * Start dictation. onText(finalText) is called for each final result; onInterim(text) for live preview.
 * Returns { stop } or null when unsupported (onError gets a Romanian message).
 */
export function startDictation({ lang = 'ro-RO', onText, onInterim, onEnd, onError } = {}) {
  const Rec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!Rec) {
    onError?.('Dictarea nu este disponibilă în această versiune. Folosește dictarea sistemului de operare (macOS: Fn Fn, Windows: Win+H).');
    return null;
  }
  const rec = new Rec();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) onText?.(r[0].transcript);
      else interim += r[0].transcript;
    }
    onInterim?.(interim);
  };
  rec.onerror = (e) =>
    onError?.(e.error === 'not-allowed' ? 'Accesul la microfon a fost refuzat.' : e.error === 'network' ? 'Serviciul de recunoaștere vocală nu este accesibil (necesită rețea).' : `Eroare dictare: ${e.error}`);
  rec.onend = () => onEnd?.();
  try {
    rec.start();
  } catch (err) {
    onError?.(String(err.message || err));
    return null;
  }
  return { stop: () => rec.stop() };
}
