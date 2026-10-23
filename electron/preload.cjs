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
  // Re-read project.json after an external change (no backup / recent-list side effects).
  reloadProject: (dir) => call('project:reload', dir),
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
  exportScriv: (dir, project) => call('v04:exportScriv', dir, project),
  syncOut: (dir, project, folder, options) => call('v04:syncOut', dir, project, folder, options),
  syncIn: (dir, project, folder) => call('v04:syncIn', dir, project, folder),
  importBibliography: () => call('v04:importBibliography'),
  exportLatex: (dir, project, options) => call('v04:exportLatex', dir, project, options),
  exportPandoc: (dir, project, options) => call('v04:exportPandoc', dir, project, options),
  aiBulkSynopsis: (dir, docs, opts) => call('ai:bulkSynopsis', dir, docs, opts),
  aiConsistency: (dir, docs, sheets, notes) => call('ai:consistency', dir, docs, sheets, notes),
  aiZoomReview: (dir, docs, levels, profileRules) => call('ai:zoomReview', dir, docs, levels, profileRules),
  onAiProgress: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('ai:progress', listener);
    return () => ipcRenderer.removeListener('ai:progress', listener);
  },
  editorPackage: (dir, project, options) => call('editor:package', dir, project, options),
  deleteSnapshot: (dir, id, file) => call('snap:delete', dir, id, file),
  renameSnapshot: (dir, id, file, name) => call('snap:rename', dir, id, file, name),
  listAllTemplates: () => call('io:listTemplates'),
  saveAsTemplate: (dir, meta) => call('io:saveAsTemplate', dir, meta),
  deleteTemplate: (id) => call('io:deleteTemplate', id),
  newFromTemplate: (title, templateId) => call('io:newFromTemplate', title, templateId),
  importText: (mode, separator) => call('io:importText', mode, separator),
  importWebPage: (url, dir) => call('io:importWebPage', url, dir),
  getPageSetup: () => call('io:getPageSetup'),
  setPageSetup: (setup) => call('io:setPageSetup', setup),
  printPreview: (dir, project, options) => call('io:printPreview', dir, project, options),
  listGlobalFormats: () => call('io:listGlobalFormats'),
  saveGlobalFormats: (list) => call('io:saveGlobalFormats', list),
  syncAuto: (dir, project, event) => call('v04:syncAuto', dir, project, event),
  listDictionaryWords: () => call('spell:listWords'),
  removeDictionaryWord: (word) => call('spell:removeWord', word),
  cancelAi: () => call('ai:cancel'),
  runAi: (payload) => call('ai:run', payload),
  // Streamed answer text of runAi({ runId }): fn({ runId, delta }).
  onAiDelta: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('ai:delta', listener);
    return () => ipcRenderer.removeListener('ai:delta', listener);
  },
  testAi: (override) => call('ai:test', override),
  nlmExport: (dir, options) => call('nlm:export', dir, options),
  nlmOpen: () => call('nlm:open'),
  openLink: (url) => call('app:openLink', url),
  newWindow: () => call('window:new'),
  toggleFullScreen: (on) => call('window:fullScreen', on),
  recheckSpelling: () => call('spell:recheck'),
  openMediaExternal: (dir, file) => call('media:openExternal', dir, file),
  releaseProject: () => call('project:release'),
  exportBundle: (dir) => call('project:exportBundle', dir),
  importBundle: () => call('project:importBundle'),
  ragBuild: (dir) => call('rag:build', dir),
  ragQuery: (dir, q, opts) => call('rag:query', dir, q, opts),
  ragAsk: (dir, q, opts) => call('rag:ask', dir, q, opts),
  onRagProgress: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('rag:progress', listener);
    return () => ipcRenderer.removeListener('rag:progress', listener);
  },
});
