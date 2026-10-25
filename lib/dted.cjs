'use strict';
// D&TED (https://github.com/Hermeneuticus-of-things/dted): Romanian dictation and transcription,
// run locally by the D&TED program in its service mode (`--serviciu`, JSON lines on stdin/stdout).
// Spec: docs/DTED.md. Main process only: the renderer never starts programs.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROTOCOL = 1;
const INSTALL_DIR = 'D&TED – Dictare și transcriere în limba română';
const EXE = 'DTED.exe';
const PACKAGE = 'dictare_transcriere_romana';

function exists(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

/**
 * How to start the service: { command, args, cwd, source } or null when D&TED is not found.
 * `custom` = the path from the settings: DTED.exe, or the folder of the source repository.
 */
function locate({ custom = '', platform = process.platform, env = process.env, python } = {}) {
  const fromPath = (p) => {
    const st = exists(p);
    if (!st) return null;
    if (st.isFile()) return { command: p, args: ['--serviciu'], cwd: path.dirname(p), source: p };
    if (st.isDirectory()) {
      if (exists(path.join(p, EXE))) return { command: path.join(p, EXE), args: ['--serviciu'], cwd: p, source: p };
      if (exists(path.join(p, PACKAGE, '__main__.py'))) {
        const py = python || (platform === 'win32' ? 'py' : 'python3');
        return { command: py, args: [...(py === 'py' ? ['-3'] : []), '-m', PACKAGE, '--serviciu'], cwd: p, source: p };
      }
    }
    return null;
  };
  if (custom) return fromPath(String(custom).trim());
  if (platform !== 'win32') return null;
  const roots = [env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs'), env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean);
  for (const root of roots) {
    const hit = fromPath(path.join(root, INSTALL_DIR));
    if (hit) return hit;
  }
  // Another name of the install folder (older versions, another language).
  for (const root of roots) {
    let names = [];
    try {
      names = fs.readdirSync(root);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/^D&TED/i.test(name)) continue;
      const hit = fromPath(path.join(root, name));
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * One running D&TED service. `onEvent(ev)` receives every event; requests are plain commands.
 * Started on the first request, kept while the app runs, stopped by stop().
 */
function createDted({ find = () => locate(), onEvent = () => {}, spawnFn = spawn, stopWaitMs = 3000 } = {}) {
  let child = null;
  let ready = null; // promise resolved on {"ev":"gata"}
  let buffer = '';
  let stderr = '';
  let seq = 0;
  const stateWaiters = new Map(); // request id -> {resolve, reject} (state(), setModel())

  function emit(ev) {
    if (ev && (ev.ev === 'stare' || ev.ev === 'eroare') && stateWaiters.size) {
      // Matched by id; a D&TED from before ids in replies answers the oldest request.
      const key = ev.id != null && stateWaiters.has(String(ev.id)) ? String(ev.id) : ev.ev === 'stare' && ev.id == null ? stateWaiters.keys().next().value : null;
      const w = key != null ? stateWaiters.get(key) : null;
      if (w) {
        stateWaiters.delete(key);
        if (ev.ev === 'stare') w.resolve(ev);
        else w.reject(new Error(ev.mesaj || 'D&TED a refuzat cererea.'));
      }
    }
    try {
      onEvent(ev);
    } catch {
      /* a listener error never stops the service */
    }
  }

  function start() {
    if (child) return ready;
    const how = find();
    if (!how) {
      const e = new Error('D&TED nu este instalat pe acest calculator.');
      e.code = 'DTED_MISSING';
      return Promise.reject(e);
    }
    stderr = '';
    buffer = '';
    const proc = spawnFn(how.command, how.args, { cwd: how.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } });
    child = proc;
    ready = new Promise((resolve, reject) => {
      const fail = (msg) => {
        if (child === proc) child = null;
        const e = new Error(msg);
        e.code = 'DTED_START';
        reject(e);
      };
      proc.on('error', (e) => fail(`D&TED nu a putut porni: ${e.message}`));
      // The service died between two writes: EPIPE on stdin must not crash the main process.
      proc.stdin.on('error', () => {});
      proc.stdout.setEncoding('utf8');
      proc.stdout.on('data', (chunk) => {
        buffer += chunk;
        let i;
        while ((i = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, i).trim();
          buffer = buffer.slice(i + 1);
          if (!line) continue;
          let ev;
          try {
            ev = JSON.parse(line);
          } catch {
            continue; // a print() from a library, not a protocol line
          }
          if (ev.ev === 'gata') {
            if (ev.protocol !== PROTOCOL) {
              fail(`Versiunea D&TED nu se potrivește (protocol ${ev.protocol}); actualizează D&TED.`);
              try {
                proc.kill();
              } catch {
                /* already gone */
              }
            }
            else resolve(how);
          }
          emit(ev);
        }
      });
      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (t) => {
        stderr = (stderr + t).slice(-4000);
      });
      proc.on('exit', (code) => {
        const was = child === proc;
        if (was) child = null;
        fail(`D&TED s-a oprit la pornire (cod ${code}). ${stderr.trim().split('\n').pop() || ''}`.trim());
        if (was) emit({ ev: 'oprit', cod: code, detalii: stderr.trim().slice(-500) });
      });
    });
    ready.catch(() => {});
    return ready;
  }

  async function send(cmd) {
    await start();
    if (!child || !child.stdin.writable) throw new Error('D&TED s-a oprit. Încearcă din nou.');
    child.stdin.write(`${JSON.stringify(cmd)}\n`);
    return cmd.id;
  }

  function askState(cmd) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('D&TED nu a răspuns.')), 10000);
      const done = () => (clearTimeout(timer), stateWaiters.delete(cmd.id));
      stateWaiters.set(cmd.id, { resolve: (v) => (done(), resolve(v)), reject: (e) => (done(), reject(e)) });
      send(cmd).catch((e) => (done(), reject(e)));
    });
  }

  // Ids come from the caller (the window registers the request before it is sent), else made here.
  const id = (p, given) => (given ? String(given) : `${p}${++seq}`);

  return {
    locate: find,
    running: () => Boolean(child),
    start,
    status: () => send({ cmd: 'stare' }),
    // The service state ({versiune, model, model_folosit, modele:[{nume, descriere, instalat}]}).
    state: () => askState({ cmd: 'stare', id: `s${++seq}` }),
    // Chooses the transcription model ('auto' = D&TED's own choice: eek when installed).
    setModel: (nume) => askState({ cmd: 'model', id: `m${++seq}`, nume: String(nume || 'auto') }),
    transcribe: (file, { limba = 'ro', termeni = '' } = {}, reqId) => send({ cmd: 'transcrie', id: id('t', reqId), cale: String(file), limba, termeni }),
    dictateStart: ({ limba = 'ro', termeni = '' } = {}, reqId) => send({ cmd: 'dictare_start', id: id('d', reqId), limba, termeni }),
    dictateStop: (dictId) => send({ cmd: 'dictare_stop', id: dictId }),
    cancel: (reqId) => send({ cmd: 'anuleaza', id: reqId }),
    stop() {
      const proc = child;
      if (!proc) return Promise.resolve();
      child = null;
      return new Promise((resolve) => {
        const t = setTimeout(() => {
          try {
            proc.kill();
          } catch {
            /* already gone */
          }
          resolve();
        }, stopWaitMs);
        proc.on('exit', () => {
          clearTimeout(t);
          resolve();
        });
        try {
          proc.stdin.write('{"cmd":"iesire"}\n');
          proc.stdin.end();
        } catch {
          /* pipe closed */
        }
      });
    },
  };
}

module.exports = { locate, createDted, PROTOCOL, INSTALL_DIR };
