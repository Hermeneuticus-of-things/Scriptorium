'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function normalize(file) {
  return process.platform === 'win32' ? file.toLowerCase() : file;
}

function packageVersionFor(exe) {
  const candidates = [
    path.join(path.dirname(exe), 'resources', 'app', 'package.json'),
    path.join(path.dirname(exe), 'resources', 'app.asar', 'package.json'),
  ];
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed.version) return String(parsed.version);
    } catch { /* unpacked/portable copy may not expose package metadata */ }
  }
  return '';
}

function existingExecutable(file) {
  try { return fs.statSync(file).isFile() ? file : null; } catch { return null; }
}

function parseUninstallRegistry(text) {
  const entries = [];
  let current = {};
  const flush = () => {
    if (!/^Pneuma Sofer$/i.test(String(current.DisplayName || '').trim())) { current = {}; return; }
    const icon = String(current.DisplayIcon || '').replace(/^"|".*$/g, '').trim();
    const install = String(current.InstallLocation || '').trim();
    // Cale Windows construită manual: parserul rulează și pe Linux (CI), unde path.join ar pune '/'.
    const exePath = icon.toLowerCase().endsWith('.exe') ? icon : install.replace(/[\\/]+$/, '') + '\\' + 'Pneuma Sofer.exe';
    entries.push({ exePath, version: String(current.DisplayVersion || '') });
    current = {};
  };
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^\s{4}(DisplayName|DisplayVersion|InstallLocation|DisplayIcon)\s+REG_\w+\s+(.*)$/i);
    if (match) current[match[1]] = match[2];
    else if (!line.trim()) flush();
  }
  flush();
  return entries;
}

function windowsRegistryInstallations({ platform = process.platform, registryText } = {}) {
  if (platform !== 'win32') return [];
  const keys = registryText !== undefined ? [registryText] : [
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];
  const rows = [];
  for (const key of keys) {
    try {
      const text = registryText !== undefined ? key : execFileSync('reg.exe', ['query', key, '/s'], { encoding: 'utf8', windowsHide: true });
      rows.push(...parseUninstallRegistry(text));
    } catch { /* registry is optional; portable copies have no uninstall entry */ }
  }
  return rows;
}

function listKnownInstallations({ currentExe = process.execPath, env = process.env, platform = process.platform, registryText } = {}) {
  const candidates = [currentExe];
  const registry = windowsRegistryInstallations({ platform, registryText });
  candidates.push(...registry.map((item) => item.exePath));
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA || '';
    const programFiles = env.ProgramW6432 || env.ProgramFiles || '';
    const programFiles32 = env['ProgramFiles(x86)'] || '';
    for (const root of [local, programFiles, programFiles32]) {
      if (root) candidates.push(path.join(root, 'Pneuma Sofer', 'Pneuma Sofer.exe'));
    }
    if (env.PORTABLE_EXECUTABLE_FILE) candidates.push(env.PORTABLE_EXECUTABLE_FILE);
  }
  const versions = new Map(registry.map((item) => [normalize(path.resolve(item.exePath)), item.version]));
  const seen = new Set();
  return candidates.map(existingExecutable).filter(Boolean).filter((file) => {
    const key = normalize(path.resolve(file));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((exePath) => ({
    exePath: path.resolve(exePath),
    version: packageVersionFor(exePath) || versions.get(normalize(path.resolve(exePath))) || '',
    current: normalize(path.resolve(exePath)) === normalize(path.resolve(currentExe)),
  }));
}

function currentInstallation({ app, packageVersion = '', env = process.env } = {}) {
  const exePath = process.execPath;
  return {
    version: String(packageVersion || app?.getVersion?.() || ''),
    exePath,
    appPath: app?.getAppPath?.() || '',
    portable: Boolean(env.PORTABLE_EXECUTABLE_DIR || env.PORTABLE_EXECUTABLE_FILE),
    pid: process.pid,
  };
}

function describeInstallations({ current, installations = [] } = {}) {
  return installations.map((item) => ({
    ...item,
    state: item.current ? 'current' : (item.version && current?.version && item.version !== current.version ? 'different-version' : 'other-copy'),
  }));
}

module.exports = { packageVersionFor, parseUninstallRegistry, windowsRegistryInstallations, listKnownInstallations, currentInstallation, describeInstallations };
