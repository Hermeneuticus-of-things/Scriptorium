import { useCallback, useEffect, useRef, useState } from 'react';
import { insertFragment } from './dictation.js';

const newId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Dictation and audio transcription through D&TED (docs/DTED.md): one hook for the app.
//   getEditor()            the TipTap editor that receives dictated text (the active one)
//   onTranscript(r, meta)  a transcription finished: r = {text, segmente, secunde_audio}
//   onMessage(text)        short notices for the writer (errors with what to do)
export function useDictation({ api, getEditor, onTranscript, onMessage, replacements, switchedMessage, engine = 'local', onlineNotConfigured }) {
  // Motor online (directivă autor 2026-11-10): MediaRecorder în renderer → transcriere compatibilă
  // OpenAI → ACELAȘI pipeline de inserare (insertFragment, un singur pas de undo).
  const [dictation, setDictation] = useState(null); // {id, paused, level, since, words}
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = () => api.dtedStatus?.({ check: false }).then((s) => { if (alive) setAvailable(s?.found === true); }).catch(() => { if (alive) setAvailable(false); });
    check(); const off = api.onServicesChanged?.(check);
    return () => { alive = false; off?.(); };
  }, [api]);
  const [jobs, setJobs] = useState({}); // transcription id -> {title, p, phase}
  const session = useRef({});
  // The refs are the truth for the event handler (events can arrive before React re-renders);
  // the state mirrors them for display.
  const state = useRef({ dictation: null, jobs: {} });
  const setDict = (next) => {
    const v = typeof next === 'function' ? next(state.current.dictation) : next;
    state.current.dictation = v;
    setDictation(v);
  };
  const setJob = (id, v) => {
    const jobs = { ...state.current.jobs };
    if (v) jobs[id] = v;
    else delete jobs[id];
    state.current.jobs = jobs;
    setJobs(jobs);
  };
  // Mic level (ADL §12): kept in a ref and pushed to subscribers directly — NOT React state.
  // It arrives every ~150 ms; as state it would re-render the whole app 6–7×/sec while dictating.
  const levelRef = useRef(0);
  const levelSubs = useRef(new Set());
  const onLevel = useCallback((fn) => {
    levelSubs.current.add(fn);
    return () => levelSubs.current.delete(fn);
  }, []);
  const cb = useRef({});
  cb.current = { getEditor, onTranscript, onMessage, replacements, switchedMessage, onlineNotConfigured };

  useEffect(() => {
    if (!api.onDtedEvent) return undefined;
    const off = api.onDtedEvent((ev) => {
      const d = state.current.dictation;
      const mine = d && ev.id === d.id;
      const job = ev.id != null && state.current.jobs[ev.id];
      switch (ev.ev) {
        case 'fragment':
          if (mine && !d.paused) {
            // Only into the editor the dictation started in: after a switch to another document
            // (its editor is rebuilt) the dictation stops instead of writing in the wrong place.
            const ed = session.current.editor;
            if (!ed || ed.isDestroyed || ed !== cb.current.getEditor()) {
              api.dtedDictateStop(d.id).catch(() => {});
              cb.current.onMessage(cb.current.switchedMessage || '');
              setDict(null);
              break;
            }
            const text = insertFragment(ed, ev.text, session.current, { replacements: cb.current.replacements });
            if (text) setDict((x) => x && { ...x, words: x.words + text.trim().split(/\s+/).length, lastText: (x.lastText ? `${x.lastText} ${text.trim()}` : text.trim()).slice(-90) });
          }
          break;
        case 'nivel':
          if (mine) {
            levelRef.current = ev.nivel;
            levelSubs.current.forEach((fn) => { try { fn(ev.nivel); } catch { /* subscriber error never breaks dictation */ } });
          }
          break;
        case 'dictare_oprita':
        case 'anulat':
          if (mine) setDict(null);
          if (job) setJob(ev.id, null);
          break;
        case 'progres':
        case 'faza':
          if (job) setJob(ev.id, { ...job, ...(ev.ev === 'progres' ? { p: ev.p } : { phase: ev.text }) });
          break;
        case 'rezultat':
          if (job) {
            setJob(ev.id, null);
            cb.current.onTranscript(ev, job);
          }
          break;
        case 'eroare':
          cb.current.onMessage([ev.mesaj, ev.ce_fac].filter(Boolean).join(' '));
          if (mine) {
            api.dtedDictateStop(d.id).catch(() => {});
            setDict(null);
          }
          if (job) setJob(ev.id, null);
          break;
        case 'oprit':
          if (state.current.dictation) setDict(null);
          state.current.jobs = {};
          setJobs({});
          break;
        default:
      }
    });
    // Another engine (Settings): what ran on this one is over.
    return () => {
      off();
      // The old engine stops what it was doing (a separate D&TED would keep the microphone).
      const d = state.current.dictation;
      if (d) api.dtedDictateStop?.(d.id)?.catch?.(() => {});
      for (const id of Object.keys(state.current.jobs)) api.dtedCancel?.(id)?.catch?.(() => {});
      if (state.current.dictation) setDict(null);
      if (Object.keys(state.current.jobs).length) {
        state.current.jobs = {};
        setJobs({});
      }
    };
  }, [api]);

  const start = useCallback(async () => {
    if (state.current.dictation) return;
    const id = newId('d');
    session.current = { editor: cb.current.getEditor() };
    setDict({ id, paused: false, level: 0, since: Date.now(), words: 0 });
    if (engine === 'online') {
      try {
        if (!(await api.sttConfigured())) throw new Error(cb.current.onlineNotConfigured || 'Dictarea online nu e configurată.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        session.current.stream = stream;
        session.current.chunks = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) session.current.chunks.push(ev.data); };
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const mine = state.current.dictation && state.current.dictation.id === id;
          const blob = new Blob(session.current.chunks, { type: rec.mimeType || 'audio/webm' });
          const b64 = window.btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
          const ed = session.current.editor;
          if (!mine || !ed || ed.isDestroyed || ed !== cb.current.getEditor()) return;
          try {
            const { text } = await api.sttTranscribeOnline({ b64, mime: rec.mimeType || 'audio/webm' });
            if (text && state.current.dictation?.id === id) {
              const put = insertFragment(ed, text, session.current, { replacements: cb.current.replacements });
              if (put) setDict((x) => x && { ...x, words: x.words + put.trim().split(/\s+/).length });
            }
          } catch (e2) {
            cb.current.onMessage(e2.message);
          }
          if (state.current.dictation?.id === id) setDict(null);
        };
        rec.start(1000);
        session.current.recorder = rec;
        // Nivel microfon pentru indicator (același contract ca la D&TED, ~150 ms).
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        session.current.audioCtx = ctx;
        const tick = setInterval(() => {
          if (!state.current.dictation || state.current.dictation.id !== id) { clearInterval(tick); ctx.close().catch(() => {}); return; }
          an.getByteTimeDomainData(buf);
          let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          levelRef.current = peak / 128;
          levelSubs.current.forEach((fn) => { try { fn(levelRef.current); } catch { /* niciodată nu rupe dictarea */ } });
        }, 150);
        session.current.levelTimer = tick;
        return;
      } catch (e) {
        setDict(null);
        cb.current.onMessage(e.message);
        return;
      }
    }
    // Registered before the request, so no event of this dictation can be missed.
    try {
      await api.dtedDictateStart(id);
    } catch (e) {
      if (state.current.dictation?.id === id) setDict(null);
      cb.current.onMessage(e.message);
    }
  }, [api, engine]);
  const stop = useCallback(() => {
    const d = state.current.dictation;
    if (!d) return;
    if (d.id && session.current.recorder) { try { session.current.recorder.stop(); } catch (e) { cb.current.onMessage(e.message); setDict(null); } return; }
    api.dtedDictateStop(d.id).catch((e) => {
      cb.current.onMessage(e.message);
      setDict(null);
    });
  }, [api]);
  // Cancel: the service stops without its last piece, and the text dictated so far is taken out
  // (one undo step, as long as nothing else was typed meanwhile).
  const cancel = useCallback(() => {
    const d = state.current.dictation;
    if (!d) return;
    if (session.current.recorder) { try { session.current.recorder.onstop = null; session.current.recorder.stop(); } catch { /* deja oprit */ } session.current.stream?.getTracks().forEach((t) => t.stop()); clearInterval(session.current.levelTimer); session.current.audioCtx?.close().catch(() => {}); session.current = {}; setDict(null); return; }
    if (d) api.dtedCancel(d.id).catch(() => {});
    const ed = session.current.editor;
    if (ed && !ed.isDestroyed && session.current.lastDoc && ed.state.doc === session.current.lastDoc) ed.commands.undo();
    session.current = {};
    setDict(null);
  }, [api]);
  const togglePause = useCallback(() => setDict((x) => x && { ...x, paused: !x.paused }), []);

  const transcribe = useCallback(
    async (meta, run) => {
      const id = newId('t');
      setJob(id, { ...meta, p: 0, phase: '' });
      try {
        await run(id);
        return id;
      } catch (e) {
        setJob(id, null);
        cb.current.onMessage(e.message);
        return null;
      }
    },
    [],
  );
  const cancelJob = useCallback((id) => api.dtedCancel(id).catch(() => {}), [api]);

  return { dictation, jobs, start, stop, cancel, togglePause, transcribe, cancelJob, levelRef, onLevel, available };
}
