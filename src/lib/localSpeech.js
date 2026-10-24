// The built-in recogniser in the window (docs/DTED.md §7): microphone capture, cutting speech into
// pieces at pauses, decoding audio files, and the same event stream as the D&TED service, so the
// dictation bar and the commands work unchanged (src/lib/useDictation.js).

export const RATE = 16000;
const PIECE_MIN = 3; // seconds: a dictated piece is cut at the quietest moment between 3 and 6 s
const PIECE_MAX = 6;
const FILE_PIECE = 120; // seconds per request when transcribing a file
const SILENCE_RMS = 0.012;
// What the recogniser "hears" in silence or noise (subtitle credits it learned): never inserted.
const HALLUCINATIONS = /^(mulțumesc pentru vizionare|mulțumim pentru vizionare|abonează-te|subtitrare|subtitrarea|vă mulțumesc|[.…\s]*)[.!]*$/i;

/** Float32 samples at `inRate` → Int16 at 16 kHz (linear interpolation, clipped). */
export function toPcm16(input, inRate) {
  const ratio = inRate / RATE;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    const j = Math.floor(x);
    const a = input[j] || 0;
    const b = input[j + 1] ?? a;
    const v = Math.max(-1, Math.min(1, a + (b - a) * (x - j)));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export function rms(pcm, from = 0, to = pcm.length) {
  let s = 0;
  for (let i = from; i < to; i++) {
    const v = pcm[i] / 0x8000;
    s += v * v;
  }
  return to > from ? Math.sqrt(s / (to - from)) : 0;
}

/** Where to cut buffered speech: the quietest 100 ms between `min` and `max` seconds (sample index). */
export function cutPoint(pcm, min = PIECE_MIN, max = PIECE_MAX) {
  const win = RATE / 10;
  const end = Math.min(pcm.length, max * RATE);
  let best = end;
  let bestRms = Infinity;
  for (let at = min * RATE; at + win <= end; at += win / 2) {
    const r = rms(pcm, at, at + win);
    if (r < bestRms) {
      bestRms = r;
      best = at + win / 2;
    }
  }
  return Math.min(best, pcm.length);
}

export function concatPcm(parts) {
  const n = parts.reduce((s, p) => s + p.length, 0);
  const out = new Int16Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** A recognised piece worth inserting (not silence, not a learned credit line). */
export function usefulText(text) {
  const t = String(text || '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return t && !HALLUCINATIONS.test(t) ? t : '';
}

/** File pieces of at most `size` seconds, cut at pauses: [{start (s), pcm}]. */
export function filePieces(pcm, size = FILE_PIECE) {
  const out = [];
  let at = 0;
  while (at < pcm.length) {
    let len = pcm.length - at;
    if (len > size * RATE) len = cutPoint(pcm.subarray(at), size - 10, size);
    out.push({ start: at / RATE, pcm: pcm.subarray(at, at + len) });
    at += len;
  }
  return out;
}

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** 16 kHz mono PCM of an encoded audio file (MP3, WAV, M4A, OGG, FLAC…), decoded by the browser. */
export async function decodeAudio(bytes) {
  const buf = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const ctx = new AudioContext();
  let audio;
  try {
    audio = await ctx.decodeAudioData(buf);
  } catch {
    throw new Error('Fișierul audio nu a putut fi citit. Formatele acceptate: MP3, WAV, M4A, OGG, FLAC.');
  } finally {
    ctx.close().catch(() => {});
  }
  const off = new OfflineAudioContext(1, Math.ceil(audio.duration * RATE), RATE);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start();
  const mono = await off.startRendering();
  return toPcm16(mono.getChannelData(0), RATE);
}

/**
 * The D&TED-shaped api over the built-in engine. `terms()` gives the names to recognise.
 * Methods: onDtedEvent, dtedDictateStart(id), dtedDictateStop(id), dtedCancel(id),
 * dtedTranscribe(file, id), dtedTranscribeMedia(dir, file, id), dtedPickAudio().
 */
export function createLocalSpeech(api, { terms = () => '', media = globalThis.navigator?.mediaDevices } = {}) {
  const listeners = new Set();
  const emit = (ev) => listeners.forEach((f) => f(ev));
  let dict = null;
  const cancelled = new Set();

  async function sendPiece(d, pcm) {
    if (rms(pcm) < SILENCE_RMS) return;
    const prompt = [terms(), d.text.slice(-200)].filter(Boolean).join('. ');
    const r = await api.whisperTranscribePcm(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength), { prompt });
    const text = usefulText(r.text);
    if (text && !d.cancelled) {
      d.text += (d.text ? ' ' : '') + text;
      emit({ ev: 'fragment', id: d.id, text });
    }
  }

  // Pieces go to the engine one after another, in order.
  function queue(d, pcm) {
    d.chain = d.chain.then(() => sendPiece(d, pcm)).catch((e) => {
      emit({ ev: 'eroare', id: d.id, mesaj: e.message, ce_fac: '' });
    });
    return d.chain;
  }

  async function dictateStart(id) {
    if (dict) throw new Error('Dictarea este deja pornită.');
    const st = await api.whisperStatus();
    if (!st.installed) throw new Error('Motorul de dictare nu e descărcat încă: Setări → Servicii și conturi → Dictare și transcriere → Descarcă motorul.');
    if (!media?.getUserMedia) throw new Error('Microfonul nu e disponibil aici.');
    let stream;
    try {
      stream = await media.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      throw new Error('Nu găsesc microfonul. Verifică dacă e conectat și permis în Windows (Confidențialitate → Microfon).');
    }
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    const mute = ctx.createGain();
    mute.gain.value = 0;
    const d = { id, stream, ctx, proc, buf: [], len: 0, text: '', chain: Promise.resolve(), lastLevel: 0 };
    dict = d;
    proc.onaudioprocess = (e) => {
      if (dict !== d) return;
      const pcm = toPcm16(e.inputBuffer.getChannelData(0), ctx.sampleRate);
      d.buf.push(pcm);
      d.len += pcm.length;
      const now = Date.now();
      if (now - d.lastLevel > 150) {
        d.lastLevel = now;
        emit({ ev: 'nivel', id, nivel: Math.min(1, rms(pcm) * 6) });
      }
      if (d.len >= PIECE_MAX * RATE) {
        const all = concatPcm(d.buf);
        const cut = cutPoint(all);
        d.buf = [all.slice(cut)];
        d.len = d.buf[0].length;
        queue(d, all.slice(0, cut));
      }
    };
    src.connect(proc);
    proc.connect(mute);
    mute.connect(ctx.destination);
    emit({ ev: 'dictare_pornita', id });
    // The engine starts (and loads the model) while the writer begins to speak.
    api.whisperTranscribePcm(new Uint8Array(0)).catch((e) => emit({ ev: 'eroare', id, mesaj: e.message, ce_fac: '' }));
    return id;
  }

  function release(d) {
    try {
      d.proc.disconnect();
      d.stream.getTracks().forEach((t) => t.stop());
      d.ctx.close().catch(() => {});
    } catch {
      /* already closed */
    }
  }

  async function dictateStop(id) {
    const d = dict;
    if (!d || (id && d.id !== id)) return true;
    dict = null;
    release(d);
    const rest = concatPcm(d.buf);
    d.buf = [];
    if (rest.length) queue(d, rest);
    await d.chain;
    emit({ ev: 'dictare_oprita', id: d.id, text: d.text });
    return true;
  }

  async function transcribeBytes(id, bytes) {
    try {
      emit({ ev: 'faza', id, text: 'Citesc fișierul…' });
      const pcm = await decodeAudio(bytes);
      const pieces = filePieces(pcm);
      const segmente = [];
      emit({ ev: 'faza', id, text: 'Transcriu…' });
      for (let i = 0; i < pieces.length; i++) {
        if (cancelled.has(id)) throw Object.assign(new Error('anulat'), { cancelled: true });
        const prompt = [terms(), segmente.slice(-3).map((s) => s.text).join(' ')].filter(Boolean).join('. ').slice(-400);
        const p = pieces[i];
        const r = await api.whisperTranscribePcm(new Uint8Array(p.pcm.buffer, p.pcm.byteOffset, p.pcm.byteLength), { prompt });
        for (const s of r.segmente || []) {
          const text = usefulText(s.text);
          if (text) segmente.push({ start: p.start + s.start, end: p.start + s.end, text });
        }
        emit({ ev: 'progres', id, p: (i + 1) / pieces.length });
      }
      if (cancelled.has(id)) throw Object.assign(new Error('anulat'), { cancelled: true });
      emit({ ev: 'rezultat', id, text: segmente.map((s) => s.text).join(' '), segmente, secunde_audio: pcm.length / RATE });
    } catch (e) {
      emit(e.cancelled ? { ev: 'anulat', id } : { ev: 'eroare', id, mesaj: e.message, ce_fac: '' });
    } finally {
      cancelled.delete(id);
    }
  }

  return {
    local: true,
    onDtedEvent(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dtedStatus: async () => ({ found: (await api.whisperStatus()).installed, source: 'motorul din Scribner' }),
    dtedPickAudio: () => api.dtedPickAudio(),
    dtedDictateStart: dictateStart,
    dtedDictateStop: dictateStop,
    async dtedCancel(id) {
      if (dict && dict.id === id) {
        const d = dict;
        d.cancelled = true;
        dict = null;
        release(d);
        emit({ ev: 'anulat', id });
      } else cancelled.add(id);
      return true;
    },
    async dtedTranscribe(file, id) {
      const bytes = await api.whisperReadAudio(file);
      transcribeBytes(id, bytes);
      return id;
    },
    async dtedTranscribeMedia(dir, file, id) {
      const data = await api.whisperReadMedia(dir, file);
      transcribeBytes(id, typeof data === 'string' ? b64ToBytes(data) : data);
      return id;
    },
  };
}
