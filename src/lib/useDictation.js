import { useCallback, useEffect, useRef, useState } from 'react';
import { insertFragment } from './dictation.js';

// Dictation and audio transcription through D&TED (docs/DTED.md): one hook for the app.
//   getEditor()            the TipTap editor that receives dictated text (the active one)
//   onTranscript(r, meta)  a transcription finished: r = {text, segmente, secunde_audio}
//   onMessage(text)        short notices for the writer (errors with what to do)
export function useDictation({ api, getEditor, onTranscript, onMessage, replacements }) {
  const [dictation, setDictation] = useState(null); // {id, paused, level, since, words}
  const [jobs, setJobs] = useState({}); // transcription id -> {title, p, phase}
  const session = useRef({});
  const state = useRef({ dictation: null, jobs: {} });
  state.current = { dictation, jobs };
  const cb = useRef({});
  cb.current = { getEditor, onTranscript, onMessage, replacements };

  useEffect(() => {
    if (!api.onDtedEvent) return undefined;
    return api.onDtedEvent((ev) => {
      const d = state.current.dictation;
      const mine = d && ev.id === d.id;
      const job = ev.id != null && state.current.jobs[ev.id];
      switch (ev.ev) {
        case 'fragment':
          if (mine && !d.paused) {
            const text = insertFragment(cb.current.getEditor(), ev.text, session.current, { replacements: cb.current.replacements });
            if (text) setDictation((x) => x && { ...x, words: x.words + text.trim().split(/\s+/).length });
          }
          break;
        case 'nivel':
          if (mine) setDictation((x) => x && { ...x, level: ev.nivel });
          break;
        case 'dictare_oprita':
        case 'anulat':
          if (mine) setDictation(null);
          if (job) setJobs(({ [ev.id]: _, ...rest }) => rest);
          break;
        case 'progres':
        case 'faza':
          if (job) setJobs((j) => ({ ...j, [ev.id]: { ...j[ev.id], ...(ev.ev === 'progres' ? { p: ev.p } : { phase: ev.text }) } }));
          break;
        case 'rezultat':
          if (job) {
            setJobs(({ [ev.id]: _, ...rest }) => rest);
            cb.current.onTranscript(ev, job);
          }
          break;
        case 'eroare':
          cb.current.onMessage([ev.mesaj, ev.ce_fac].filter(Boolean).join(' '));
          if (mine) setDictation(null);
          if (job) setJobs(({ [ev.id]: _, ...rest }) => rest);
          break;
        case 'oprit':
          if (state.current.dictation) setDictation(null);
          setJobs({});
          break;
        default:
      }
    });
  }, [api]);

  const start = useCallback(async () => {
    if (state.current.dictation) return;
    session.current = {};
    setDictation({ id: null, paused: false, level: 0, since: Date.now(), words: 0 });
    try {
      const id = await api.dtedDictateStart();
      setDictation((x) => x && { ...x, id });
    } catch (e) {
      setDictation(null);
      cb.current.onMessage(e.message);
    }
  }, [api]);
  const stop = useCallback(() => {
    const d = state.current.dictation;
    if (d?.id) api.dtedDictateStop(d.id).catch((e) => cb.current.onMessage(e.message));
    else setDictation(null);
  }, [api]);
  // Cancel: the service stops without its last piece, and the text dictated so far is taken out
  // (one undo step, as long as nothing else was typed meanwhile).
  const cancel = useCallback(() => {
    const d = state.current.dictation;
    if (d?.id) api.dtedCancel(d.id).catch(() => {});
    const ed = cb.current.getEditor();
    if (ed && session.current.lastDoc && ed.state.doc === session.current.lastDoc) ed.commands.undo();
    session.current = {};
    setDictation(null);
  }, [api]);
  const togglePause = useCallback(() => setDictation((x) => x && { ...x, paused: !x.paused }), []);

  const transcribe = useCallback(
    async (meta, run) => {
      try {
        const id = await run();
        setJobs((j) => ({ ...j, [id]: { ...meta, p: 0, phase: '' } }));
        return id;
      } catch (e) {
        cb.current.onMessage(e.message);
        return null;
      }
    },
    [],
  );
  const cancelJob = useCallback((id) => api.dtedCancel(id).catch(() => {}), [api]);

  return { dictation, jobs, start, stop, cancel, togglePause, transcribe, cancelJob, available: Boolean(api.dtedDictateStart) };
}
