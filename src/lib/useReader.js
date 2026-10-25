import { useRef, useState } from 'react';
import { chunkText, loadVoices, pickVoice, speak, stop as stopSystem, ttsSupported } from './speech.js';

// Read text aloud with the best available voice: the built-in Piper voice ("Mihai", local) when it
// is installed, otherwise the operating-system voices. Lets the editor's right-click menu read the
// selection / from the cursor / the whole document without opening the voice mini-player.
export default function useReader(api = {}) {
  const run = useRef(0);
  const audio = useRef(null);
  const sysCtl = useRef(null);
  const [reading, setReading] = useState(false);

  const stop = () => {
    run.current += 1;
    if (audio.current) { audio.current.pause(); audio.current = null; }
    sysCtl.current?.stop();
    stopSystem();
    setReading(false);
  };

  // Built-in Piper voice: one sentence group at a time, the next prepared while this one plays.
  const playBuiltIn = async (text, my) => {
    const parts = chunkText(text, 400);
    let next = api.ttsSynth(parts[0], {});
    for (let i = 0; i < parts.length; i++) {
      let wav;
      try { wav = await next; } catch { if (my === run.current) stop(); return; }
      if (my !== run.current) return;
      if (i + 1 < parts.length) next = api.ttsSynth(parts[i + 1], {});
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
      const el = new Audio(url);
      audio.current = el;
      await new Promise((resolve) => { el.onended = resolve; el.onerror = resolve; el.play().catch(resolve); });
      URL.revokeObjectURL(url);
      if (my !== run.current) return;
    }
    if (my === run.current) setReading(false);
  };

  const read = async (text) => {
    const t = String(text || '').trim();
    stop();
    if (!t) return;
    const my = ++run.current;
    setReading(true);
    let piper = false;
    if (api.ttsSynth && api.ttsStatus) { try { piper = Boolean((await api.ttsStatus())?.installed); } catch { /* fall back to system voices */ } }
    if (my !== run.current) return;
    if (piper) return playBuiltIn(t, my);
    if (!ttsSupported()) { setReading(false); return; }
    const voices = await loadVoices();
    if (my !== run.current) return;
    const v = pickVoice(voices, 'ro-RO');
    sysCtl.current = speak(t, { voice: v, onEnd: () => { if (my === run.current) setReading(false); }, onError: () => { if (my === run.current) setReading(false); } });
    return undefined;
  };

  const canRead = Boolean(api.ttsSynth) || ttsSupported();
  return { read, stop, reading, canRead };
}
