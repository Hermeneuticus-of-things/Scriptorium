#!/usr/bin/env node
// A fake D&TED service (protocol 1, docs/DTED.md) for tests: no model, no microphone.
// Transcribing "x.mp3" gives "Textul din x.mp3." in two segments; dictation sends the fragments of
// FAKE_DTED_WORDS (separated by |) every FAKE_DTED_MS ms. FAKE_DTED_PROTOCOL changes the protocol.
const path = require('path');
const out = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);
const words = (process.env.FAKE_DTED_WORDS || 'prima frază dictată|a doua frază').split('|');
const every = Number(process.env.FAKE_DTED_MS) || 150;
let dict = null;
out({ ev: 'gata', protocol: Number(process.env.FAKE_DTED_PROTOCOL) || 1 });
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (line.trim()) handle(JSON.parse(line));
  }
});
process.stdin.on('end', () => process.exit(0));
function stopDict(cancelled) {
  if (!dict) return;
  clearInterval(dict.timer);
  out(cancelled ? { ev: 'anulat', id: dict.id } : { ev: 'dictare_oprita', id: dict.id, text: dict.sent.join(' ') });
  dict = null;
}
function handle(c) {
  if (c.cmd === 'iesire') {
    stopDict(true);
    process.exit(0);
  }
  if (c.cmd === 'stare') out({ ev: 'stare', protocol: 1, versiune: 'fals', model_incarcat: true, dispozitiv: 'cpu' });
  else if (c.cmd === 'transcrie') {
    const name = path.basename(String(c.cale));
    if (/stricat/.test(name)) return out({ ev: 'eroare', id: c.id, mesaj: `Fișierul „${name}” nu a putut fi citit.`, ce_fac: 'Formatele acceptate sunt MP3, WAV, M4A, OGG și FLAC.' });
    out({ ev: 'faza', id: c.id, text: 'Transcriu…' });
    out({ ev: 'progres', id: c.id, p: 0.5 });
    setTimeout(() => out({ ev: 'rezultat', id: c.id, text: `Textul din ${name}. A doua parte.`, segmente: [{ start: 0, end: 2.5, text: `Textul din ${name}.` }, { start: 65, end: 68, text: 'A doua parte.' }], secunde_audio: 68 }), 50);
  } else if (c.cmd === 'dictare_start') {
    if (dict) return out({ ev: 'eroare', id: c.id, mesaj: 'Dictarea este deja pornită.', ce_fac: '' });
    dict = { id: c.id, sent: [], n: 0 };
    out({ ev: 'dictare_pornita', id: c.id });
    dict.timer = setInterval(() => {
      out({ ev: 'nivel', id: dict.id, nivel: 0.4 });
      if (dict.n < words.length) {
        const text = words[dict.n++];
        dict.sent.push(text);
        out({ ev: 'fragment', id: dict.id, text });
      }
    }, every);
  } else if (c.cmd === 'dictare_stop') stopDict(false);
  else if (c.cmd === 'anuleaza') {
    if (dict && dict.id === c.id) stopDict(true);
    else out({ ev: 'anulat', id: c.id });
  } else out({ ev: 'eroare', id: c.id ?? null, mesaj: `Comandă necunoscută: ${c.cmd}`, ce_fac: '' });
}
