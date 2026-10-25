import { useCallback, useEffect, useRef, useState } from 'react';
import { insertFragment } from './dictation.js';

const newId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Dictation and audio transcription through D&TED (docs/DTED.md): one hook for the app.
//   getEditor()            the TipTap editor that receives dictated text (the active one)
//   onTranscript(r, meta)  a transcription finished: r = {text, segmente, secunde_audio}
//   onMessage(text)        short notices for the writer (errors with what to do)
export function useDictation({ api, getEditor, onTranscript, onMessage, replacements, switchedMessage }) {
  const [dictation, setDictation] = useState(null); // {id, paused, level, since, words}
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
  const cb = useRef({});
  cb.current = { getEditor, onTranscript, onMessage, replacements, switchedMessage };

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
            if (text) setDict((x) => x && { ...x, words: x.words + text.trim().split(/\s+/).length });
          }
          break;
        case 'nivel':
          if (mine) setDict((x) => x && { ...x, level: ev.nivel });
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
    // Registered before the request, so no event of this dictation can be missed.
    setDict({ id, paused: false, level: 0, since: Date.now(), words: 0 });
    try {
      await api.dtedDictateStart(id);
    } catch (e) {
      if (state.current.dictation?.id === id) setDict(null);
      cb.current.onMessage(e.message);
    }
  }, [api]);
  const stop = useCallback(() => {
    const d = state.current.dictation;
    if (!d) return;
    api.dtedDictateStop(d.id).catch((e) => {
      cb.current.onMessage(e.message);
      setDict(null);
    });
  }, [api]);
  // Cancel: the service stops without its last piece, and the text dictated so far is taken out
  // (one undo step, as long as nothing else was typed meanwhile).
  const cancel = useCallback(() => {
    const d = state.current.dictation;
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

  return { dictation, jobs, start, stop, cancel, togglePause, transcribe, cancelJob, available: Boolean(api.dtedDictateStart) };
}
