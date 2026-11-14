'use strict';
// Zip backups of a .scribner folder, rotated to keep the newest N.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');
const { renameWithRetry } = require('./store.cjs');

function isBackupOf(file, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc} (\\d{4}-\\d{2}-\\d{2}_[\\d-]+|backup \\d{4,})(\\.zip)?$`).test(file);
}

function defaultBackupDir(projectDir) {
  return `${projectDir.replace(/[\\/]+$/, '').replace(/\.(scribner|scriptorium)$/i, '')}.backups`;
}

// Not project data: temp files of an atomic write (ours ends ".tmp", the folder backup's
// ".tmp-<pid>-<rand>"), and the cross-process lock (and its takeover leftovers). A restored
// lock looks fresh and blocks every save for ten seconds.
const transient = (name) => name.endsWith('.tmp') || /\.tmp-/.test(name) || /^project\.json\.lock(\.stale-.*)?$/.test(name);

// Already-compressed formats (media, documents): DEFLATE spends seconds of CPU on a big
// project for zero gain — they are stored instead and stay byte-identical in the archive.
const STORE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'tif', 'tiff', 'heic', 'heif', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac', 'opus', 'mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', 'pdf', 'zip', 'docx', 'xlsx', 'pptx', 'epub', 'woff', 'woff2']);
const compressionFor = (name) => (STORE_EXT.has(String(name).split('.').pop().toLowerCase()) ? 'STORE' : 'DEFLATE');

function addDir(zip, dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (transient(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) addDir(zip, full, `${prefix}${entry.name}/`);
    else zip.file(`${prefix}${entry.name}`, fs.readFileSync(full), { compression: compressionFor(entry.name) });
  }
}

function stamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}-${p(date.getMilliseconds(), 3)}`;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (transient(entry.name)) continue;
    const a = path.join(src, entry.name);
    const b = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

// Next free backup base name (without .zip): "<Name> <date_time>" or, with dateInName false,
// "<Name> backup 0001", "<Name> backup 0002"… (numbered, still rotated in order). A collision
// within the same millisecond (two backups started together, or a clock that stands still) gets
// a "-2", "-3"… suffix instead of spinning until the clock moves: still matched by isBackupOf.
async function freshBase(dest, name, ext, dateInName) {
  if (dateInName === false) {
    const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} backup (\\d{4,})(\\.zip)?$`);
    let n = 0;
    for (const f of fs.readdirSync(dest)) {
      const m = re.exec(f);
      if (m) n = Math.max(n, Number(m[1]));
    }
    let base;
    do base = path.join(dest, `${name} backup ${String(++n).padStart(4, '0')}`);
    while (fs.existsSync(base + ext) || fs.existsSync(`${base}${ext}.tmp`));
    return base;
  }
  let base = path.join(dest, `${name} ${stamp()}`);
  for (let n = 2; fs.existsSync(base + ext); n++) base = path.join(dest, `${name} ${stamp()}-${n}`);
  return base;
}

// options.dateInName === false -> numbered names instead of the date and time.
// options.zip === false -> plain folder copy "<Name> <stamp>/<Name>.scribner/..." instead of a .zip.
async function backupProject(projectDir, backupDir, keep = 10, options = {}) {
  const dest = backupDir || defaultBackupDir(projectDir);
  fs.mkdirSync(dest, { recursive: true });
  const name = path.basename(projectDir).replace(/\.(scribner|scriptorium)$/i, '');
  if (options.zip === false) {
    // Copied under a private temp name (not matched by isBackupOf, never shared with a concurrent
    // backup of the same project). The complete copy is then renamed to a free name; if a
    // concurrent backup claimed that name between the check and the rename (Windows answers
    // EPERM/ENOTEMPTY on an occupied folder), the next free name is tried — the copy is not redone.
    const tmpFolder = path.join(dest, `${name} ${stamp()}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
    try {
      copyDir(projectDir, path.join(tmpFolder, path.basename(projectDir)));
      let folder = null;
      for (let i = 0; ; i++) {
        folder = await freshBase(dest, name, '', options.dateInName);
        try {
          fs.renameSync(tmpFolder, folder);
          rotate(dest, name, keep);
          return folder;
        } catch (err) {
          if (i >= 12 || !['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOTEMPTY'].includes(err.code)) throw err;
        }
      }
    } catch (err) {
      fs.rmSync(tmpFolder, { recursive: true, force: true });
      throw err;
    }
  }
  const zip = new JSZip();
  addDir(zip, projectDir, `${path.basename(projectDir)}/`);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  // Written under a private temp name first: a disk-full / interrupted write must never leave a
  // truncated .zip that looks like a valid backup (and pushes a good one out of rotation). The
  // final name is claimed exclusively before the buffer is written: two concurrent backups of
  // the same project (Back Up Now while the close backup runs) can compute the same stamp, and
  // the second one now takes "-2" instead of silently overwriting the first.
  const tmpFile = path.join(dest, `.write-${process.pid}-${crypto.randomBytes(4).toString('hex')}.tmp`);
  let file = null;
  try {
    for (;;) {
      file = `${await freshBase(dest, name, '.zip', options.dateInName)}.zip`;
      let fd;
      try {
        fd = fs.openSync(file, 'wx');
        fs.closeSync(fd);
        break;
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
        file = null; // claimed by a concurrent backup: pick the next free name
      }
    }
    fs.writeFileSync(tmpFile, buf);
    renameWithRetry(tmpFile, file);
  } catch (err) {
    try { fs.rmSync(tmpFile, { force: true }); } catch { /* ignore */ }
    if (file) { try { fs.unlinkSync(file); } catch { /* claimed but never filled */ } }
    throw err;
  }
  rotate(dest, name, keep);
  return file;
}

function listBackups(projectDir, backupDir) {
  const dest = backupDir || defaultBackupDir(projectDir);
  if (!fs.existsSync(dest)) return [];
  const name = path.basename(projectDir).replace(/\.(scribner|scriptorium)$/i, '');
  return sortBackups(
    dest,
    fs.readdirSync(dest).filter((f) => isBackupOf(f, name)),
  )
    .reverse()
    .map((f) => {
      const st = fs.statSync(path.join(dest, f));
      return { file: path.join(dest, f), name: f, size: st.isDirectory() ? dirSize(path.join(dest, f)) : st.size, zipped: !st.isDirectory() };
    });
}

function dirSize(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) total += e.isDirectory() ? dirSize(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size;
  return total;
}

// Oldest first. Within one naming scheme the name orders them; between dated and numbered
// backups (the setting was changed) the file time does.
const numbered = (f) => /backup \d{4,}(\.zip)?$/.test(f);
const sortBackups = (dest, files) => {
  const k = (f) => f.replace(/\.zip$/, '');
  const mtime = (f) => {
    try {
      return fs.statSync(path.join(dest, f)).mtimeMs;
    } catch {
      return 0;
    }
  };
  return files.sort((a, b) => (numbered(a) !== numbered(b) ? mtime(a) - mtime(b) : k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0));
};

function rotate(dest, name, keep) {
  // A non-numeric keep (a hand-edited settings.json with "backupKeep": null) must not disable
  // rotation entirely: files.length > NaN is always false and backups would pile up forever.
  const keepN = Math.max(1, Number(keep) || 10);
  const files = sortBackups(
    dest,
    fs.readdirSync(dest).filter((f) => isBackupOf(f, name)),
  );
  while (files.length > keepN) fs.rmSync(path.join(dest, files.shift()), { recursive: true, force: true });
}

// Extracts a backup next to the original as "<Name> (restaurat <stamp>).scribner".
async function restoreBackup(zipFile, parentDir) {
  if (fs.statSync(zipFile).isDirectory()) {
    const inner = fs.readdirSync(zipFile).find((f) => fs.existsSync(path.join(zipFile, f, 'project.json')));
    if (!inner) throw new Error('Backup invalid.');
    const target = path.join(parentDir, `${inner.replace(/\.(scribner|scriptorium)$/i, '')} (restaurat ${stamp()}).scribner`);
    copyDir(path.join(zipFile, inner), target);
    return target;
  }
  const zip = await JSZip.loadAsync(fs.readFileSync(zipFile));
  // The project root is the folder holding the shallowest project.json; archives made by Finder add
  // __MACOSX/ and .DS_Store entries (possibly first), and others are zipped without a wrapping folder.
  const junk = (rel) => rel.split('/').some((p) => p === '__MACOSX' || p.startsWith('.'));
  const manifest = Object.keys(zip.files)
    .filter((rel) => !junk(rel) && !zip.files[rel].dir && /(^|\/)project\.json$/.test(rel))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0];
  if (!manifest) throw new Error('Backup invalid.');
  const prefix = manifest.slice(0, -'project.json'.length); // '' or 'Name.scribner/' (maybe nested)
  const top = prefix ? prefix.slice(0, -1).split('/').pop() : path.basename(zipFile).replace(/\.zip$/i, '');
  const base = top.replace(/\.(scribner|scriptorium)$/i, '');
  const target = path.join(parentDir, `${base} (restaurat ${stamp()}).scribner`);
  // A planted archive must not fill the disk: at most 200 000 files and 4 GB unpacked.
  const files = Object.entries(zip.files);
  if (files.length > 200000) throw new Error('Arhivă invalidă: prea multe fișiere.');
  let total = 0;
  for (const [, entry] of files) total += (entry._data && entry._data.uncompressedSize) || 0;
  if (total > 4 * 1024 ** 3) throw new Error('Arhivă invalidă: prea mare la despachetare.');
  for (const [rel, entry] of files) {
    if (!rel.startsWith(prefix) || junk(rel)) continue;
    const inner = rel.slice(prefix.length);
    if (!inner || entry.dir) continue;
    const out = path.resolve(target, inner);
    if (!out.startsWith(path.resolve(target) + path.sep)) throw new Error('Arhivă invalidă.');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await entry.async('nodebuffer'));
  }
  return target;
}

/**
 * Backup on project open (Scrivener "Back up on project open"). settings: {backupOnOpen, backupDir, backupKeep, backupZip}.
 * Returns the backup path, or null when disabled. Never throws (logs instead) so opening is not blocked.
 */
async function backupOnOpen(projectDir, settings = {}) {
  if (!settings.backupOnOpen || settings.backupExcluded) return null;
  try {
    return await backupProject(projectDir, settings.backupDir || undefined, Number(settings.backupKeep) || DEFAULT_KEEP, backupOptions(settings));
  } catch (err) {
    console.error('Backup la deschidere eșuat:', err);
    return null;
  }
}

const DEFAULT_KEEP = 5;
// Options for backupProject from the app settings.
const backupOptions = (settings = {}) => ({ zip: settings.backupZip !== false, dateInName: settings.backupDateName !== false });

/**
 * Backup on each manual save, at most once per `intervalMs` per project.
 * Returns shouldBackup(dir, now) -> true when a backup is due (and records it).
 */
function makeSaveThrottle(intervalMs = 60 * 1000) {
  const last = new Map();
  return (dir, now = Date.now()) => {
    const key = path.resolve(String(dir));
    const prev = last.get(key);
    if (prev !== undefined && now - prev < intervalMs) return false;
    last.set(key, now);
    return true;
  };
}

/**
 * The default number of kept backups went from 10 to 5. Only new installs get 5: settings saved
 * before the change (no backupKeep stored) keep 10, a saved value is never touched, and a first
 * start stores 5 so later starts do not take it for an old install. Returns the settings to write, or null.
 */
function migrateBackupKeep(saved, existed) {
  if (!saved || typeof saved !== 'object' || saved.backupKeep !== undefined) return null;
  return { ...saved, backupKeep: existed ? 10 : DEFAULT_KEEP };
}

/**
 * Project Settings > Backup (project.json "backup", written by ProjectSettingsDialog):
 * { exclude, override, onClose, everyMin, keep }. Returns the program backup settings resolved for
 * this one project, plus backupExcluded:
 * - exclude: the project is left out of automatic backups (on close, at the interval, on open,
 *   on manual save); manual backups (Back Up Now / Back Up To.) still work. Wins over override.
 * - override (and not exclude): onClose / everyMin / keep replace backupOnClose / backupEveryMin /
 *   backupKeep for this project. The rest (folder, zip, names, on open, on save) stays the program's.
 * - neither: the program settings as they are.
 * Defaults match the dialog: onClose true, everyMin 0, keep 10.
 */
function resolveBackupSettings(projectBackup, settings = {}) {
  const b = projectBackup && typeof projectBackup === 'object' && !Array.isArray(projectBackup) ? projectBackup : {};
  const out = { ...settings, backupExcluded: Boolean(b.exclude) };
  if (b.override && !b.exclude) {
    out.backupOnClose = b.onClose !== false;
    out.backupEveryMin = Math.max(0, Number(b.everyMin) || 0);
    out.backupKeep = Math.max(1, Number(b.keep) || 10);
  }
  return out;
}

// The "backup" block of a project's project.json; {} when missing or unreadable (never throws).
function readProjectBackup(projectDir) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(projectDir, 'project.json'), 'utf8'));
    return p && p.backup && typeof p.backup === 'object' ? p.backup : {};
  } catch {
    return {};
  }
}

// Interval backup due: everyMin > 0 and at least that many minutes since `last` (ms).
function intervalDue(everyMin, last, now = Date.now()) {
  const min = Number(everyMin) || 0;
  return min > 0 && now - last >= min * 60 * 1000;
}

// The folder backups actually go to: the custom dir if set, else the project's default; null if neither.
function effectiveBackupDir(backupDir, projectDir) {
  return backupDir || (projectDir ? defaultBackupDir(projectDir) : null);
}

module.exports = { DEFAULT_KEEP, resolveBackupSettings, readProjectBackup, intervalDue, backupOptions, makeSaveThrottle, migrateBackupKeep, backupOnOpen, backupProject, listBackups, restoreBackup, defaultBackupDir, effectiveBackupDir };
