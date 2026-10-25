'use strict';
const { contextBridge, ipcRenderer, webFrame } = require('electron');

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
  appendAuthorJournal: (dir, rows) => call('editorial:appendAuthorJournal', dir, rows),
  teamFiles: (dir) => call('team:files', dir),
  dtedStatus: (opts) => call('dted:status', opts),
  dtedSetModel: (nume) => call('dted:setModel', nume),
  whisperStatus: () => call('whisper:status'),
  whisperInstall: (variant) => call('whisper:install', variant),
  ttsStatus: () => call('tts:status'),
  ttsInstall: () => call('tts:install'),
  ttsSynth: (text, opts) => call('tts:synth', text, opts),
  whisperRemove: () => call('whisper:remove'),
  whisperTranscribePcm: (pcm, opts) => call('whisper:transcribePcm', pcm, opts),
  whisperReadAudio: (file) => call('whisper:readAudio', file),
  whisperReadMedia: (dir, file) => call('whisper:readMedia', dir, file),
  onWhisperProgress: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('whisper:progress', listener);
    return () => ipcRenderer.removeListener('whisper:progress', listener);
  },
  dtedPickAudio: () => call('dted:pickAudio'),
  dtedTranscribe: (file, id) => call('dted:transcribe', file, id),
  dtedTranscribeMedia: (dir, file, id) => call('dted:transcribeMedia', dir, file, id),
  dtedDictateStart: (id) => call('dted:dictateStart', id),
  dtedDictateStop: (id) => call('dted:dictateStop', id),
  dtedCancel: (id) => call('dted:cancel', id),
  onDtedEvent: (fn) => {
    const listener = (_e, ev) => fn(ev);
    ipcRenderer.on('dted:event', listener);
    return () => ipcRenderer.removeListener('dted:event', listener);
  },
  teamWrite: (dir, name, text, opts) => call('team:write', dir, name, text, opts),
  importScriv: () => call('import:scriv'),
  importFile: (mode, separator, opts) => call('import:file', mode, separator, opts),
  readMedia: (dir, file) => call('media:read', dir, file),
  mcpInfo: (dir) => call('mcp:info', dir),
  readStylesFromProject: () => call('styles:readFromProject'),
  addMediaFiles: (dir) => call('media:add', dir),
  importFiles: (dir, mode, separator, opts) => call('io:importFiles', dir, mode, separator, opts),
  importOpml: () => call('io:importOpml'),
  exportDocuments: (dir, project, ids, options) => call('io:exportDocuments', dir, project, ids, options),
  exportOpml: (dir, project, opts) => call('io:exportOpml', dir, project, opts),
  exportCsv: (dir, project, wordCounts) => call('io:exportCsv', dir, project, wordCounts),
  saveProjectAs: (dir, newTitle) => call('io:saveAs', dir, newTitle),
  printDocument: (html, title) => call('io:printDocument', html, title),
  setAppMenu: (spec) => call('menu:set', spec),
  onMenuCommand: (fn) => {
    const listener = (_e, id) => fn(id);
    ipcRenderer.on('menu:command', listener);
    return () => ipcRenderer.removeListener('menu:command', listener);
  },
  // Learned corrections: is a word misspelled for the active spell checker; a suggestion picked
  // from the native context menu ({ from, to }).
  isMisspelled: (word) => {
    try {
      return webFrame.isWordMisspelled(String(word));
    } catch {
      return false;
    }
  },
  onSpellReplaced: (fn) => {
    const listener = (_e, info) => fn(info);
    ipcRenderer.on('spell:replaced', listener);
    return () => ipcRenderer.removeListener('spell:replaced', listener);
  },
  watchProject: (dir) => call('project:watch', dir),
  // Re-read project.json after an external change (no backup / recent-list side effects).
  reloadProject: (dir) => call('project:reload', dir),
  syncConflicts: (dir) => call('project:syncConflicts', dir),
  onProjectChanged: (fn) => {
    const listener = (_e, info) => fn(info);
    ipcRenderer.on('project:changed', listener);
    return () => ipcRenderer.removeListener('project:changed', listener);
  },
  backupNow: (dir) => call('backup:now', dir),
  backupTo: (dir) => call('backup:to', dir),
  backupOnSave: (dir) => call('backup:onSave', dir),
  listBackups: (dir) => call('backup:list', dir),
  restoreBackup: (dir, file) => call('backup:restore', dir, file),
  recordHistory: (dir, counts) => call('history:record', dir, counts),
  getHistory: (dir) => call('history:get', dir),
  exportCompiled: (dir, project, format, options) => call('compile:export', dir, project, format, options),
  exportCompileFormat: (fileName, text) => call('compile:exportFormat', fileName, text),
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
  snapshotCounts: (dir) => call('snap:counts', dir),
  listAllTemplates: () => call('io:listTemplates'),
  saveAsTemplate: (dir, meta) => call('io:saveAsTemplate', dir, meta),
  deleteTemplate: (id) => call('io:deleteTemplate', id),
  exportTemplate: (id) => call('io:exportTemplate', id),
  importTemplate: () => call('io:importTemplate'),
  newFromTemplate: (title, templateId) => call('io:newFromTemplate', title, templateId),
  importText: (mode, separator, opts) => call('io:importText', mode, separator, opts),
  importWebPage: (url, dir, opts) => call('io:importWebPage', url, dir, opts),
  getPageSetup: (project) => call('io:getPageSetup', project),
  setPageSetup: (setup) => call('io:setPageSetup', setup),
  printPreview: (dir, project, options) => call('io:printPreview', dir, project, options),
  printDocuments: (dir, project, options) => call('io:printDocuments', dir, project, options),
  savePrintPdf: (token) => call('io:savePrintPdf', token),
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
  copyText: (text) => call('app:copyText', text),
  // Error log (Help → Report a problem): { entries, env }; new errors arrive through onAppError.
  // Updates (Help → Check for updates): latest release info, download with progress, install and restart.
  updateCheck: () => call('update:check'),
  updateConfigure: () => call('update:configure'),
  updateDownload: () => call('update:download'),
  updateInstall: () => call('update:install'),
  onUpdateProgress: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('update:progress', listener);
    return () => ipcRenderer.removeListener('update:progress', listener);
  },
  onUpdateAvailable: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('update:available', listener);
    return () => ipcRenderer.removeListener('update:available', listener);
  },
  getErrorLog: () => call('errors:get'),
  clearErrorLog: () => call('errors:clear'),
  logError: (info) => call('errors:log', info),
  onAppError: (fn) => {
    const listener = (_e, entry) => fn(entry);
    ipcRenderer.on('app:error', listener);
    return () => ipcRenderer.removeListener('app:error', listener);
  },
  servicesStatus: () => call('services:status'),
  setService: (id, values) => call('services:set', id, values),
  setAccount: (account) => call('accounts:set', account),
  deleteAccount: (id) => call('accounts:delete', id),
  copyAccountPassword: (id) => call('accounts:copyPassword', id),
  translateText: (req) => call('translate:run', req),
  checkGrammar: (req) => call('grammar:check', req),
  speakCloud: (req) => call('tts:speak', req),
  importZotero: (req) => call('zotero:import', req),
  mcpConnectInfo: (opts) => call('mcp:connectInfo', opts),
  mcpConnectDesktop: (opts) => call('mcp:connectDesktop', opts),
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
  ragChat: (dir, q, opts) => call('rag:chat', dir, q, opts),
  ragChats: (dir) => call('rag:chats', dir),
  ragChatDelete: (dir, chatId) => call('rag:chatDelete', dir, chatId),
  ragImportFiles: (dir) => call('rag:importFiles', dir),
  onRagProgress: (fn) => {
    const listener = (_e, p) => fn(p);
    ipcRenderer.on('rag:progress', listener);
    return () => ipcRenderer.removeListener('rag:progress', listener);
  },
});
