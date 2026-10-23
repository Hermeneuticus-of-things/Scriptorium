import React, { useEffect, useRef, useState } from 'react';
import { dictationSupported, loadVoices, pause, pickVoice, resume, speak, startDictation, ttsSupported } from '../lib/speech.js';

/**
 * Props: getText(): string — selection or whole document text;
 *        onInsertText?(text) — inserts dictated text at cursor; onClose().
 */
export default function SpeechBar({ getText, onInsertText, onClose }) {
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
      resume();
      return setState('speaking');
    }
    const text = getText();
    if (!text?.trim()) return setMsg('Nu există text de citit.');
    setMsg('');
    setState('speaking');
    ctl.current = speak(text, { voice, rate, onEnd: () => setState('idle'), onError: (e) => { setMsg(String(e.message || e.error || e)); setState('idle'); } });
  };
  const doPause = () => {
    pause();
    setState('paused');
  };
  const doStop = () => {
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
      {ttsSupported() ? (
        <>
          <button onClick={play} title="Citește selecția sau documentul">{state === 'paused' ? '▶ Continuă' : '▶ Citește'}</button>
          <button onClick={doPause} disabled={state !== 'speaking'}>⏸ Pauză</button>
          <button onClick={doStop} disabled={state === 'idle'}>⏹ Oprește</button>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} style={{ maxWidth: 200 }} title="Voce">
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
          <label title="Viteză">
            Viteză <input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(e) => setRate(+e.target.value)} style={{ width: 70 }} />
          </label>
        </>
      ) : (
        <span>Citirea cu voce tare nu este disponibilă.</span>
      )}
      {onInsertText && (
        <button onClick={toggleDictation} disabled={!dictationSupported() && !listening} title={dictationSupported() ? 'Dictare (ro-RO)' : 'Dictarea nu este disponibilă'}>
          {listening ? '● Oprește dictarea' : '🎤 Dictare'}
        </button>
      )}
      {interim && <em style={{ opacity: 0.7 }}>{interim}</em>}
      {msg && <span style={{ color: 'var(--danger, #b00)' }}>{msg}</span>}
      <span style={{ flex: 1 }} />
      <button onClick={onClose} title="Închide">×</button>
    </div>
  );
}
