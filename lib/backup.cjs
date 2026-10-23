'use strict';
// Zip backups of a .scribner folder, rotated to keep the newest N.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function isBackupOf(file, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc} \\d{4}-\\d{2}-\\d{2}_[\\d-]+(\\.zip)?$`).test(file);
}

function defaultBackupDir(projectDir) {
  return `${projectDir.replace(/[\\/]+$/, '').replace(/\.(scribner|scriptorium)$/i, '')}.backups`;
}

function addDir(zip, dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.endsWith('.tmp')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) addDir(zip, full, `${prefix}${entry.name}/`);
    else zip.file(`${prefix}${entry.name}`, fs.readFileSync(full));
  }
}

function stamp(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}-${p(date.getMilliseconds(), 3)}`;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.endsWith('.tmp')) continue;
    const a = path.join(src, entry.name);
    const b = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

// options.zip === false -> plain folder copy "<Name> <stamp>/<Name>.scribner/..." instead of a .zip.
async function backupProject(projectDir, backupDir, keep = 10, options = {}) {
  const dest = backupDir || defaultBackupDir(projectDir);
  fs.mkdirSync(dest, { recursive: true });
  const name = path.basename(projectDir).replace(/\.(scribner|scriptorium)$/i, '');
  if (options.zip === false) {
    let folder = path.join(dest, `${name} ${stamp()}`);
    while (fs.existsSync(folder)) {
      await new Promise((r) => setTimeout(r, 2));
      folder = path.join(dest, `${name} ${stamp()}`);
    }
    copyDir(projectDir, path.join(folder, path.basename(projectDir)));
    rotate(dest, name, keep);
    return folder;
  }
  const zip = new JSZip();
  addDir(zip, projectDir, `${path.basename(projectDir)}/`);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  let file = path.join(dest, `${name} ${stamp()}.zip`);
  while (fs.existsSync(file)) {
    await new Promise((r) => setTimeout(r, 2));
    file = path.join(dest, `${name} ${stamp()}.zip`);
  }
  fs.writeFileSync(file, buf);
  rotate(dest, name, keep);
  return file;
}

function listBackups(projectDir, backupDir) {
  const dest = backupDir || defaultBackupDir(projectDir);
  if (!fs.existsSync(dest)) return [];
  const name = path.basename(projectDir).replace(/\.(scribner|scriptorium)$/i, '');
  return fs
    .readdirSync(dest)
    .filter((f) => isBackupOf(f, name))
    .sort(byStamp)
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

const byStamp = (a, b) => {
  const k = (f) => f.replace(/\.zip$/, '');
  return k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0;
};

function rotate(dest, name, keep) {
  const files = fs
    .readdirSync(dest)
    .filter((f) => isBackupOf(f, name))
    .sort(byStamp);
  while (files.length > Math.max(1, keep)) fs.rmSync(path.join(dest, files.shift()), { recursive: true, force: true });
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
  const top = Object.keys(zip.files)[0].split('/')[0];
  const base = top.replace(/\.(scribner|scriptorium)$/i, '');
  const target = path.join(parentDir, `${base} (restaurat ${stamp()}).scribner`);
  for (const [rel, entry] of Object.entries(zip.files)) {
    const inner = rel.slice(top.length + 1);
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
  if (!settings.backupOnOpen) return null;
  try {
    return await backupProject(projectDir, settings.backupDir || undefined, Number(settings.backupKeep) || 10, { zip: settings.backupZip !== false });
  } catch (err) {
    console.error('Backup la deschidere eșuat:', err);
    return null;
  }
}

module.exports = { backupOnOpen, backupProject, listBackups, restoreBackup, defaultBackupDir };
