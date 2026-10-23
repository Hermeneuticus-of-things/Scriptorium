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
  readStylesFromProject: () => call('styles:readFromProject'),
  addMediaFiles: (dir) => call('media:add', dir),
  importFiles: (dir, mode, separator) => call('io:importFiles', dir, mode, separator),
  importOpml: () => call('io:importOpml'),
  importWebPage: (url) => call('io:importWebPage', url),
  exportDocuments: (dir, project, ids, options) => call('io:exportDocuments', dir, project, ids, options),
  exportOpml: (dir, project) => call('io:exportOpml', dir, project),
  exportCsv: (dir, project, wordCounts) => call('io:exportCsv', dir, project, wordCounts),
  saveProjectAs: (dir, newTitle) => call('io:saveAs', dir, newTitle),
  printDocument: (html, title) => call('io:printDocument', html, title),
  setAppMenu: (spec) => call('menu:set', spec),
  onMenuCommand: (fn) => {
    const listener = (_e, id) => fn(id);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
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
  previewCompiled: (dir, project, options) => call('compile:preview', dir, project, options),
  exportScript: (format, html, title) => call('script:export', format, html, title),
  runAi: (payload) => call('ai:run', payload),
});
