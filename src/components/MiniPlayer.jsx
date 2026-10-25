import React, { useEffect, useRef, useState } from 'react';
import { chunkText, loadVoices, pause, pickVoice, resume, speak, stop as stopSystem, ttsSupported } from '../lib/speech.js';
import { clock } from '../lib/dictation.js';
import { t as tr } from '../lib/i18n.js';

// The voice mini-player: a small floating window for dictating into the text and for hearing it
// read aloud, with the engines that come with Scribner (dictation: built-in engine or D&TED;
// reading: the built-in Romanian voice, else the system voices). It can be dragged anywhere and
// remembers its place. Props: api, dict (useDictation), getText(), onClose().
const POS_KEY = 'scribner-miniplayer-pos';

function loadPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch {
    /* storage off */
  }
  return null;
}

export default function MiniPlayer({ api = {}, dict, getText, onClose }) {
  const [pos, setPos] = useState(loadPos);
  const [engineState, setEngineState] = useState(null); // whisper status
  const [ttsState, setTtsState] = useState(null); // built-in voice status
  const [progress, setProgress] = useState(null); // {mb, totalMb, tts}
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState(''); // '' = the built-in voice when present
  const [rate, setRate] = useState(1);
  const [reading, setReading] = useState('idle'); // idle | loading | speaking | paused
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);
  const run = useRef(0);
  const audio = useRef(null);
  const sysCtl = useRef(null);
  const boxRef = useRef(null);

  const [cloudReady, setCloudReady] = useState(false); // a cloud voice set up in Settings
  useEffect(() => {
    if (!api.servicesStatus || !api.speakCloud) return;
    api.servicesStatus().then((st) => {
      const ok = Boolean(st.services.speechify && st.services.speechify.configured);
      setCloudReady(ok);
      if (ok) setVoice('speechify');
    }, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const playCloud = async (text) => {
    const my = ++run.current;
    setReading('loading');
    try {
      const res = await api.speakCloud({ text });
      if (my !== run.current) return;
      const queue = [...res.chunks];
      setReading('speaking');
      while (queue.length) {
        const el = new Audio(`data:audio/${res.format || 'mp3'};base64,${queue.shift()}`);
        el.playbackRate = rate;
        audio.current = el;
        await new Promise((resolve) => {
          el.onended = resolve;
          el.onerror = resolve;
          el.play().catch(resolve);
        });
        if (my !== run.current) return;
      }
      setReading('idle');
    } catch (e) {
      if (my === run.current) {
        setMsg(e.message);
        setReading('idle');
      }
    }
  };
  const refresh = () => {
    api.whisperStatus?.().then(setEngineState, () => {});
    api.ttsStatus?.().then(setTtsState, () => {});
  };
  useEffect(() => {
    refresh();
    loadVoices().then((v) => setVoices(v));
    const off = api.onWhisperProgress?.((p) => {
      setProgress(p.what === 'gata' ? null : p);
      if (p.what === 'gata') refresh();
    });
    return () => {
      off?.();
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dict?.dictation) return undefined;
    const t1 = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t1);
  }, [dict?.dictation]);

  const builtIn = Boolean(api.ttsSynth && ttsState?.installed);
  const stopAll = () => {
    run.current += 1;
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    sysCtl.current?.stop();
    stopSystem();
  };

  // Built-in voice: one sentence group at a time, the next one prepared while this one plays.
  const playBuiltIn = async (text) => {
    const my = ++run.current;
    const parts = chunkText(text, 400);
    setReading('loading');
    let next = api.ttsSynth(parts[0], { rate });
    for (let i = 0; i < parts.length; i++) {
      let wav;
      try {
        wav = await next;
      } catch (e) {
        if (my === run.current) {
          setMsg(e.message);
          setReading('idle');
        }
        return;
      }
      if (my !== run.current) return;
      if (i + 1 < parts.length) next = api.ttsSynth(parts[i + 1], { rate });
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      const el = new Audio(url);
      audio.current = el;
      setReading('speaking');
      await new Promise((resolve) => {
        el.onended = resolve;
        el.onerror = resolve;
        el.play().catch(resolve);
        const watch = setInterval(() => {
          if (my !== run.current) {
            clearInterval(watch);
            resolve();
          }
        }, 200);
        el.addEventListener('ended', () => clearInterval(watch), { once: true });
      });
      URL.revokeObjectURL(url);
      if (my !== run.current) return;
    }
    if (my === run.current) setReading('idle');
  };

  const read = () => {
    setMsg('');
    if (reading === 'paused') {
      if (audio.current) audio.current.play();
      else resume();
      return setReading('speaking');
    }
    const text = getText();
    if (!text?.trim()) return setMsg(tr('ui.speechBar.nu_exista_text_de_citit'));
    stopAll();
    if (voice === 'speechify' && cloudReady) return playCloud(text);
    if (builtIn && !voice) return playBuiltIn(text);
    if (!ttsSupported()) return setMsg(tr('ui.speechBar.citirea_cu_voce_tare_nu'));
    setReading('speaking');
    const v = voices.find((x) => x.name === voice) || pickVoice(voices, 'ro-RO');
    sysCtl.current = speak(text, { voice: v, rate, onEnd: () => setReading('idle'), onError: (e) => { setMsg(String(e.message || e.error || e)); setReading('idle'); } });
  };
  const doPause = () => {
    if (audio.current) audio.current.pause();
    else pause();
    setReading('paused');
  };
  const doStop = () => {
    stopAll();
    setReading('idle');
  };

  // Drag by the title strip; kept inside the window.
  const startDrag = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const box = boxRef.current.getBoundingClientRect();
    const dx = e.clientX - box.left;
    const dy = e.clientY - box.top;
    const move = (ev) => {
      const x = Math.min(window.innerWidth - box.width, Math.max(0, ev.clientX - dx));
      const y = Math.min(window.innerHeight - box.height, Math.max(0, ev.clientY - dy));
      setPos({ x, y });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setPos((p) => {
        try {
          if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
        } catch {
          /* storage off */
        }
        return p;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const d = dict?.dictation;
  // Clipping / distortion: the mic level is at (or near) the top, so the recording is too loud.
  const clipping = Boolean(d && !d.paused && (d.level || 0) >= 0.92);
  const pct = progress?.totalMb ? Math.round((progress.mb / progress.totalMb) * 100) : null;
  const engineLine = progress
    ? tr(progress.tts ? 'ui.mini.descarc_vocea' : 'ui.mini.descarc_motorul', { p: pct ?? 0 })
    : engineState && !engineState.installed && engineState.supported
      ? tr('ui.mini.motor_lipsa')
      : '';
  const style = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined;

  return (
    <div className="mini-player" ref={boxRef} style={style} role="dialog" aria-label={tr('ui.mini.titlu')}>
      <div className="mini-head" onMouseDown={startDrag}>
        <span className="mini-title">🎙 {tr('ui.mini.titlu')}</span>
        <button className="mini-x" onClick={onClose} title={tr('btn.close')} aria-label={tr('btn.close')}>×</button>
      </div>
      <div className="mini-row">
        <button
          className={`mini-mic ${d ? 'on' : ''}`}
          onClick={() => (d ? dict.stop() : dict.start())}
          disabled={!dict?.available}
          title={d ? tr('ui.dted.stop') : tr('cmd.dictate')}
          aria-label={d ? tr('ui.dted.stop') : tr('cmd.dictate')}
        >
          {d ? '■' : '●'}
        </button>
        {d ? (
          <>
            <div className="mini-meter-wrap">
              <meter className={`mini-level ${clipping ? 'clip' : ''}`} min="0" max="1" low="0.75" high="0.9" optimum="0.5" value={d.paused ? 0 : d.level || 0} aria-label={tr('ui.dted.nivel')} />
              {clipping && <span className="mini-clip" title={tr('ui.mini.prea_tare_tip')}>⚠ {tr('ui.mini.prea_tare')}</span>}
            </div>
            <span className="mini-time">{clock((Date.now() - d.since) / 1000)}</span>
            <button onClick={dict.togglePause} disabled={!d.id} title={d.paused ? tr('ui.dted.continua') : tr('ui.dted.pauza')}>{d.paused ? '▶' : '❚❚'}</button>
            <button onClick={dict.cancel} title={tr('ui.dted.anuleaza_tip')} aria-label={tr('ui.dted.anuleaza')}>✕</button>
          </>
        ) : (
          <span className="mini-hint">{tr('ui.mini.dicteaza')}</span>
        )}
      </div>
      <div className="mini-row">
        <button onClick={read} disabled={reading === 'loading'} title={tr('ui.speechBar.citeste_selectia_sau_documentul')} aria-label={tr('ui.speechBar.citeste')}>
          {reading === 'speaking' ? '♪' : '▶'}
        </button>
        <button onClick={doPause} disabled={reading !== 'speaking'} title={tr('ui.speechBar.pauza')} aria-label={tr('ui.speechBar.pauza')}>❚❚</button>
        <button onClick={doStop} disabled={reading === 'idle'} title={tr('ui.speechBar.opreste')} aria-label={tr('ui.speechBar.opreste')}>■</button>
        <select value={voice} onChange={(e) => { doStop(); setVoice(e.target.value); }} title={tr('ui.speechBar.voce')} aria-label={tr('ui.speechBar.voce')}>
          {cloudReady && <option value="speechify">Speechify</option>}
          {builtIn && <option value="">{tr('ui.mini.vocea_scribner')}</option>}
          {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
        </select>
        <input type="range" min={0.6} max={1.8} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} title={`${tr('ui.speechBar.viteza')} ${rate.toFixed(1)}×`} aria-label={tr('ui.speechBar.viteza')} />
      </div>
      {(engineLine || msg) && <div className="mini-msg">{msg || engineLine}</div>}
    </div>
  );
}
