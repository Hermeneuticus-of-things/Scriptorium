import React, { useEffect, useRef, useState } from 'react';
import { dictationSupported, loadVoices, pause, pickVoice, resume, speak, startDictation, ttsSupported } from '../lib/speech.js';
import { t as tr } from '../lib/i18n.js';

/**
 * Props: getText(): string — selection or whole document text;
 *        onInsertText?(text) — inserts dictated text at cursor; onClose().
 */
export default function SpeechBar({ getText, onInsertText, onClose, api = {} }) {
  // 'system' = voices of the operating system; 'speechify' = cloud voices (key in Settings).
  const [engine, setEngine] = useState('system');
  const [cloudReady, setCloudReady] = useState(false);
  const audio = useRef(null); // { el, queue, stopped }
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState('');
  const [rate, setRate] = useState(1);
  const [state, setState] = useState('idle'); // idle | speaking | paused
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [msg, setMsg] = useState('');
  const ctl = useRef(null);
  const rec = useRef(null);

  useEffect(() => {
    if (api.servicesStatus && api.speakCloud) {
      api.servicesStatus().then((st) => {
        const ok = Boolean(st.services.speechify && st.services.speechify.configured);
        setCloudReady(ok);
        if (ok) setEngine('speechify');
      }).catch(() => {});
    }
    return () => audio.current && stopCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stopCloud = () => {
    const a = audio.current;
    if (!a) return;
    a.stopped = true;
    a.el.pause();
    audio.current = null;
  };
  const playCloud = async (text) => {
    setState('speaking');
    setMsg(tr('ui.services.lucrez', { service: 'Speechify' }));
    try {
      const res = await api.speakCloud({ text });
      setMsg('');
      const el = new Audio();
      const a = { el, queue: [...res.chunks], stopped: false };
      audio.current = a;
      const next = () => {
        if (a.stopped) return;
        const b64 = a.queue.shift();
        if (!b64) {
          audio.current = null;
          setState('idle');
          return;
        }
        el.src = `data:audio/${res.format || 'mp3'};base64,${b64}`;
        el.playbackRate = rate;
        el.play().catch((e) => { setMsg(String(e.message || e)); setState('idle'); });
      };
      el.onended = next;
      next();
    } catch (e) {
      setMsg(e.message);
      setState('idle');
    }
  };
  useEffect(() => {
    loadVoices().then((v) => {
      setVoices(v);
      setVoice(pickVoice(v, 'ro-RO')?.name || '');
    });
    return () => {
      ctl.current?.stop();
      rec.current?.stop();
    };
  }, []);

  const play = () => {
    if (state === 'paused') {
      if (engine === 'speechify' && audio.current) audio.current.el.play();
      else resume();
      return setState('speaking');
    }
    const text = getText();
    if (!text?.trim()) return setMsg(tr('ui.speechBar.nu_exista_text_de_citit'));
    setMsg('');
    if (engine === 'speechify') return playCloud(text);
    setState('speaking');
    ctl.current = speak(text, { voice, rate, onEnd: () => setState('idle'), onError: (e) => { setMsg(String(e.message || e.error || e)); setState('idle'); } });
  };
  const doPause = () => {
    if (engine === 'speechify' && audio.current) audio.current.el.pause();
    else pause();
    setState('paused');
  };
  const doStop = () => {
    stopCloud();
    ctl.current?.stop();
    setState('idle');
  };
  const toggleDictation = () => {
    if (listening) {
      rec.current?.stop();
      return setListening(false);
    }
    setMsg('');
    rec.current = startDictation({
      onText: (t) => onInsertText?.(t.trim() + ' '),
      onInterim: setInterim,
      onEnd: () => { setListening(false); setInterim(''); },
      onError: setMsg,
    });
    setListening(!!rec.current);
  };

  return (
    <div className="speech-bar" style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', borderTop: '1px solid var(--border, #ccc)', flexWrap: 'wrap' }}>
      {ttsSupported() || cloudReady ? (
        <>
          {cloudReady && (
            <select value={engine} onChange={(e) => { doStop(); setEngine(e.target.value); }} title={tr('ui.speechBar.motor')} aria-label={tr('ui.speechBar.motor')}>
              <option value="speechify">Speechify</option>
              {ttsSupported() && <option value="system">{tr('ui.speechBar.vocile_sistemului')}</option>}
            </select>
          )}
          <button onClick={play} title={tr('ui.speechBar.citeste_selectia_sau_documentul')}>{state === 'paused' ? tr('ui.speechBar.continua') : tr('ui.speechBar.citeste')}</button>
          <button onClick={doPause} disabled={state !== 'speaking'}>{tr('ui.speechBar.pauza')}</button>
          <button onClick={doStop} disabled={state === 'idle'}>{tr('ui.speechBar.opreste')}</button>
          {engine === 'system' && <select value={voice} onChange={(e) => setVoice(e.target.value)} style={{ maxWidth: 200 }} title="Voce">
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>}
          <label title={tr('ui.speechBar.viteza')}>
            {tr('ui.speechBar.viteza')} <input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => { setRate(+e.target.value); if (audio.current) audio.current.el.playbackRate = +e.target.value; }} style={{ width: 70 }} />
          </label>
        </>
      ) : (
        <span>{tr('ui.speechBar.citirea_cu_voce_tare_nu')}</span>
      )}
      {onInsertText && (
        <button onClick={toggleDictation} disabled={!dictationSupported() && !listening} title={dictationSupported() ? 'Dictare (ro-RO)' : tr('ui.speechBar.dictarea_nu_este_disponibila')}>
          {listening ? tr('ui.speechBar.opreste_dictarea') : '🎤 Dictare'}
        </button>
      )}
      {interim && <em style={{ opacity: 0.7 }}>{interim}</em>}
      {msg && <span style={{ color: 'var(--danger, #b00)' }}>{msg}</span>}
      <span style={{ flex: 1 }} />
      <button onClick={onClose} title={tr('btn.close')}>×</button>
    </div>
  );
}
