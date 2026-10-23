'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const call = async (channel, ...args) => {
  const res = await ipcRenderer.invoke(channel, ...args);
  if (!res.ok) throw new Error(res.error);
  return res.value;
};

contextBridge.exposeInMainWorld('api', {
  getSettings: () => call('settings:get'),
  setSettings: (patch) => call('settings:set', patch),
  chooseBackupDir: () => call('settings:chooseBackupDir'),
  listTemplates: () => call('templates:list'),
  newProject: (title, templateId) => call('project:new', title, templateId),
  openProject: (dir) => call('project:open', dir),
  saveProject: (dir, project) => call('project:save', dir, project),
  readDoc: (dir, id, kind) => call('doc:read', dir, id, kind),
  writeDoc: (dir, id, kind, html) => call('doc:write', dir, id, kind, html),
  takeSnapshot: (dir, id, name) => call('snap:take', dir, id, name),
  listSnapshots: (dir, id) => call('snap:list', dir, id),
  importScriv: () => call('import:scriv'),
  importFile: (mode, separator) => call('import:file', mode, separator),
  readMedia: (dir, file) => call('media:read', dir, file),
  mcpInfo: (dir) => call('mcp:info', dir),
  watchProject: (dir) => call('project:watch', dir),
  onProjectChanged: (fn) => {
    const listener = (_e, info) => fn(info);
    ipcRenderer.on('project:changed', listener);
    return () => ipcRenderer.removeListener('project:changed', listener);
  },
  backupNow: (dir) => call('backup:now', dir),
  listBackups: (dir) => call('backup:list', dir),
  restoreBackup: (dir, file) => call('backup:restore', dir, file),
  recordHistory: (dir, counts) => call('history:record', dir, counts),
  getHistory: (dir) => call('history:get', dir),
  exportCompiled: (dir, project, format, options) => call('compile:export', dir, project, format, options),
  runAi: (payload) => call('ai:run', payload),
});
