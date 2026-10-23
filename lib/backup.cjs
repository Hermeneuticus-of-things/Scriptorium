'use strict';
// Zip backups of a .scribner folder, rotated to keep the newest N.
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

function isBackupOf(file, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc} \\d{4}-\\d{2}-\\d{2}_[\\d-]+\\.zip$`).test(file);
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

async function backupProject(projectDir, backupDir, keep = 10) {
  const dest = backupDir || defaultBackupDir(projectDir);
  fs.mkdirSync(dest, { recursive: true });
  const name = path.basename(projectDir).replace(/\.(scribner|scriptorium)$/i, '');
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
    .sort()
    .reverse()
    .map((f) => ({ file: path.join(dest, f), name: f, size: fs.statSync(path.join(dest, f)).size }));
}

function rotate(dest, name, keep) {
  const files = fs
    .readdirSync(dest)
    .filter((f) => isBackupOf(f, name))
    .sort();
  while (files.length > Math.max(1, keep)) fs.unlinkSync(path.join(dest, files.shift()));
}

// Extracts a backup next to the original as "<Name> (restaurat <stamp>).scribner".
async function restoreBackup(zipFile, parentDir) {
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

module.exports = { backupProject, listBackups, restoreBackup, defaultBackupDir };
