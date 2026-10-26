'use strict';

// Reading aloud built into Pneuma Sofer: Piper (offline neural text-to-speech) with a Romanian voice,
// downloaded once into <userData>/tts and run as a local program per sentence. Nothing leaves the
// computer. Main process only; the downloader and the process spawner are injected for tests.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PIPER = {
  url: 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip',
  sha256: 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea',
  mb: 22,
};
const VOICE_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/ro/ro_RO/mihai/medium';
const VOICE = {
  file: 'ro_RO-mihai-medium.onnx',
  // ~60 MB; checked by size range and a readable config next to it.
  minBytes: 30 * 1024 * 1024,
  maxBytes: 150 * 1024 * 1024,
  mb: 61,
};

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function findFile(dir, name) {
  if (!fs.existsSync(dir)) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return p;
    if (e.isDirectory()) {
      const hit = findFile(p, name);
      if (hit) return hit;
    }
  }
  return null;
}

// Prepare text for Piper so Romanian punctuation is heard, not read flat. Piper phonemizes through
// espeak-ng, which gives intonation on . ! ? , ; : and (…) but not on the typographic marks Romanian
// uses, so we map those: ellipsis → "...", em/en dash (dialogue, parenthetical) → a comma pause,
// and we drop the quote marks (they add no intonation and shouldn't be spoken). Paragraph breaks
// stay as newlines — Piper reads line by line, closing each with a cadence and a pause.
function normalizeForPiper(text) {
  return String(text || '')
    .replace(/[„“”«»‹›"]/g, '') // „ " " « » ‹ › and straight " — no pause, not spoken
    .replace(/…/g, '...')                   // ellipsis … → espeak pause
    .replace(/[^\S\n]*[—–][^\S\n]*/g, ', ') // em/en dash — – → comma pause (keeps newlines intact)
    .replace(/[^\S\n]*[()[\]{}][^\S\n]*/g, ', ') // parentheses/brackets → a comma pause around the aside
    .replace(/[^\S\n]+/g, ' ')                   // collapse spaces/tabs, keep newlines
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/,[ \t]*,+/g, ', ')                 // doubled commas (from (), dashes) → one
    .replace(/([.!?…])[ \t]*,/g, '$1 ')     // a comma right after a sentence end is redundant
    .replace(/^[ \t,]+/gm, '')                   // a line that began with a dialogue dash/"(" now starts with ", "
    .replace(/[ \t]+([,.;:!?])/g, '$1')          // no space before punctuation
    .trim();
}

function createTtsEngine({ root, download, spawnFn = spawn, platform = process.platform } = {}) {
  const EXE = platform === 'win32' ? 'piper.exe' : 'piper';
  const binDir = path.join(root, 'piper');
  const voicePath = () => path.join(root, 'voices', VOICE.file);
  let installing = null;

  function status() {
    const installed = Boolean(findFile(binDir, EXE) && fs.existsSync(voicePath()) && fs.existsSync(`${voicePath()}.json`));
    return {
      supported: platform === 'win32',
      installed,
      voice: 'Mihai (română)',
      installing: installing ? { ...(installing.progress || {}) } : null,
      sizes: { engine: PIPER.mb, voice: VOICE.mb },
    };
  }

  async function install({ onProgress = () => {} } = {}) {
    if (installing) return installing.done;
    if (platform !== 'win32') throw new Error('Vocea încorporată se descarcă automat doar pe Windows.');
    const report = (p) => {
      if (installing) installing.progress = p;
      onProgress(p);
    };
    const done = (async () => {
      const total = (findFile(binDir, EXE) ? 0 : PIPER.mb) + (fs.existsSync(voicePath()) ? 0 : VOICE.mb);
      let base = 0;
      const step = (what) => (bytes) => report({ what, mb: Math.round((base + bytes / 1048576) * 10) / 10, totalMb: total });
      if (!findFile(binDir, EXE)) {
        const zip = path.join(root, 'piper.zip.part');
        fs.mkdirSync(root, { recursive: true });
        await download(PIPER.url, zip, step('voce-motor'));
        if (sha256File(zip) !== PIPER.sha256) {
          fs.rmSync(zip, { force: true });
          throw new Error('Programul de citire descărcat nu corespunde amprentei. L-am șters; încearcă din nou.');
        }
        const JSZip = require('jszip');
        const z = await JSZip.loadAsync(fs.readFileSync(zip));
        fs.rmSync(binDir, { recursive: true, force: true });
        for (const [name, entry] of Object.entries(z.files)) {
          if (entry.dir) continue;
          const out = path.join(binDir, ...name.split('/').filter((p) => p && p !== '..'));
          if (!out.startsWith(binDir + path.sep)) continue;
          fs.mkdirSync(path.dirname(out), { recursive: true });
          fs.writeFileSync(out, await entry.async('nodebuffer'));
        }
        fs.rmSync(zip, { force: true });
        if (!findFile(binDir, EXE)) throw new Error(`Arhiva nu conține ${EXE}.`);
        base += PIPER.mb;
      }
      if (!fs.existsSync(voicePath()) || !fs.existsSync(`${voicePath()}.json`)) {
        fs.mkdirSync(path.dirname(voicePath()), { recursive: true });
        const part = `${voicePath()}.part`;
        await download(`${VOICE_BASE}/${VOICE.file}`, part, step('voce'));
        const size = fs.statSync(part).size;
        if (size < VOICE.minBytes || size > VOICE.maxBytes) {
          fs.rmSync(part, { force: true });
          throw new Error('Vocea descărcată nu e întreagă. Am șters-o; încearcă din nou.');
        }
        const cfg = `${voicePath()}.json.part`;
        await download(`${VOICE_BASE}/${VOICE.file}.json`, cfg, () => {});
        try {
          JSON.parse(fs.readFileSync(cfg, 'utf8'));
        } catch {
          fs.rmSync(cfg, { force: true });
          fs.rmSync(part, { force: true });
          throw new Error('Configurația vocii nu e validă. Încearcă din nou.');
        }
        fs.renameSync(cfg, `${voicePath()}.json`);
        fs.renameSync(part, voicePath());
      }
      report({ what: 'gata', mb: total, totalMb: total });
      return status();
    })();
    installing = { done };
    try {
      return await done;
    } finally {
      installing = null;
    }
  }

  // One piece of text -> WAV bytes. rate 1 = normal speed (0.5–2).
  function synth(text, { rate = 1 } = {}) {
    const t = String(text || '').trim().slice(0, 5000);
    if (!t) return Promise.resolve(Buffer.alloc(0));
    const exe = findFile(binDir, EXE);
    if (!exe || !fs.existsSync(voicePath())) return Promise.reject(new Error('Vocea de citire nu e descărcată încă.'));
    const out = path.join(os.tmpdir(), `pneuma-tts-${process.pid}-${crypto.randomBytes(4).toString('hex')}.wav`);
    const lengthScale = String(Math.min(2, Math.max(0.5, 1 / (Number(rate) || 1))).toFixed(2));
    return new Promise((resolve, reject) => {
      const proc = spawnFn(exe, ['--model', voicePath(), '--output_file', out, '--length_scale', lengthScale], { cwd: path.dirname(exe), windowsHide: true });
      let err = '';
      proc.stderr?.on('data', (d) => {
        err = (err + d).slice(-2000);
      });
      proc.on('error', reject);
      proc.on('close', (code) => {
        try {
          if (code !== 0 || !fs.existsSync(out)) return reject(new Error(`Citirea cu voce nu a mers (${code}). ${err.split('\n').filter(Boolean).pop() || ''}`.trim()));
          resolve(fs.readFileSync(out));
        } finally {
          fs.rmSync(out, { force: true });
        }
      });
      proc.stdin.end(normalizeForPiper(t), 'utf8');
    });
  }

  function remove() {
    fs.rmSync(root, { recursive: true, force: true });
    return status();
  }

  return { status, install, synth, remove };
}

module.exports = { createTtsEngine, PIPER, VOICE, normalizeForPiper };
