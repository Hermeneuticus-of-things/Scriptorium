'use strict';
// v0.4 IPC handlers: export as Scrivener project, external-folder sync, bibliography import,
// LaTeX / Pandoc / MultiMarkdown export.
//
// main.cjs registration (one line, next to ioHandlers):
//   require('./v04Handlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, noteSelfWrite });
//
// preload.cjs lines (inside the exposeInMainWorld('api', { ... }) object):
//   exportScriv: (dir, project) => call('v04:exportScriv', dir, project),
//   syncOut: (dir, project, folder, options) => call('v04:syncOut', dir, project, folder, options),
//   syncIn: (dir, project, folder) => call('v04:syncIn', dir, project, folder),
//   importBibliography: () => call('v04:importBibliography'),
//   exportLatex: (dir, project, options) => call('v04:exportLatex', dir, project, options),
//   exportPandoc: (dir, project, options) => call('v04:exportPandoc', dir, project, options),
//   syncAuto: (dir, project, event) => call('v04:syncAuto', dir, project, event),
const fs = require('fs');
const path = require('path');
const { exportScriv } = require('../lib/scrivExport.cjs');
const folderSync = require('../lib/folderSync.cjs');
const { parseBibliography } = require('../lib/bibliography.cjs');
const adv = require('../lib/advancedExport.cjs');
const { safeName } = require('../lib/exporters.cjs');
const history = require('../lib/history.cjs');

// io for exportScriv: text, media, snapshots (with their html) and the writing history.
function scrivExportIo(store, dir) {
  return {
    readDoc: (id, kind) => {
      try {
        return store.readDoc(dir, id, kind);
      } catch {
        return '';
      }
    },
    readMedia: (file) => store.readMedia(dir, file),
    listSnapshots: (id) => store.listSnapshots(dir, id),
    readHistory: () => history.readHistory(dir),
  };
}

module.exports = function register({ handle, dialog, BrowserWindow, store, assertOpened, noteSelfWrite }) {
  const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
  const reader = (dir, kind = 'docs') => (id) => {
    try {
      return store.readDoc(dir, id, kind);
    } catch {
      return '';
    }
  };
  const meta = (project) => ({ title: project.title || '', author: project.author || '', date: require('../lib/history.cjs').dayKey(), lang: project.lang || 'ro' });
  const pickFolder = async (e, title) => {
    const res = await dialog.showOpenDialog(winOf(e), { title, properties: ['openDirectory', 'createDirectory'] });
    return res.canceled || !res.filePaths[0] ? null : res.filePaths[0];
  };
  const saveText = async (e, title, defaultPath, filters, data) => {
    const res = await dialog.showSaveDialog(winOf(e), { title, defaultPath, filters });
    if (res.canceled || !res.filePath) return null;
    fs.writeFileSync(res.filePath, data);
    return res.filePath;
  };

  // File > Export > As Scrivener Project
  handle('v04:exportScriv', async (e, dir, project) => {
    assertOpened(dir);
    const parent = await pickFolder(e, 'Exportă ca proiect .scriv: alege folderul');
    if (!parent) return null;
    return exportScriv(project, scrivExportIo(store, dir), parent);
  });

  // File > Sync > With External Folder (write)
  handle('v04:syncOut', async (e, dir, project, folder, options = {}) => {
    assertOpened(dir);
    const target = folder && fs.existsSync(folder) ? folder : await pickFolder(e, 'Sincronizează cu folder extern');
    if (!target) return null;
    const manifest = folderSync.syncOut(project, target, reader(dir), { ...folderSync.syncOptions(project), ...options });
    return { folder: target, files: Object.keys(manifest.files).length, format: manifest.format, formats: manifest.formats };
  });

  // File > Sync > With External Folder (read back). Scrivener behaviour: the external version wins,
  // but for conflicts (both sides edited) a snapshot of the project version is taken first.
  // New external files are written as new docs; the renderer inserts them into the binder
  // (folder 'draft' → Manuscript, 'notes' → Research).
  const syncInto = (dir, project, folder) => {
    const write = (id, html) => {
      noteSelfWrite(path.join(dir, 'docs', `${id}.html`));
      store.writeDoc(dir, id, 'docs', html);
    };
    const res = folderSync.syncIn(project, folder, reader(dir), write);
    for (const c of res.conflicts) {
      store.takeSnapshot(dir, c.id, 'Înainte de sincronizare (conflict)');
      write(c.id, c.theirs);
      folderSync.markSynced(folder, c.id, c.theirs);
    }
    const created = res.newDocs.map((d) => {
      const id = store.newId();
      write(id, d.html);
      folderSync.markSynced(folder, id, d.html, { file: d.file });
      return { id, title: d.title, folder: d.folder };
    });
    return {
      updated: res.updates.filter((u) => u.id).map((u) => u.id),
      conflicts: res.conflicts.map((c) => ({ id: c.id, title: c.title })),
      created,
      missing: res.missing,
    };
  };
  handle('v04:syncIn', async (_e, dir, project, folder) => {
    assertOpened(dir);
    if (!folder || !fs.existsSync(folder)) throw new Error('Folderul de sincronizare nu există.');
    return syncInto(dir, project, folder);
  });

  // Automatic sync on project open ('open': read external edits in) and close ('close': write out).
  // No-op (null) unless project.syncAuto and project.syncFolder are set; on open, a folder never synced is written first.
  handle('v04:syncAuto', async (_e, dir, project, event) => {
    assertOpened(dir);
    const action = folderSync.autoSyncAction(project, event);
    if (!action || !fs.existsSync(project.syncFolder)) return null;
    if (action === 'in' && folderSync.readManifest(project.syncFolder)) return { action, ...syncInto(dir, project, project.syncFolder) };
    const manifest = folderSync.syncOut(project, project.syncFolder, reader(dir), folderSync.syncOptions(project));
    return { action: 'out', folder: project.syncFolder, files: Object.keys(manifest.files).length, updated: [], conflicts: [], created: [], missing: [] };
  });

  // File > Import > Bibliography (Zotero BibTeX / CSL-JSON)
  handle('v04:importBibliography', async (e) => {
    const res = await dialog.showOpenDialog(winOf(e), {
      title: 'Importă bibliografie (Zotero)',
      properties: ['openFile'],
      filters: [{ name: 'BibTeX / CSL-JSON', extensions: ['bib', 'bibtex', 'json'] }],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const entries = parseBibliography(fs.readFileSync(res.filePaths[0], 'utf8'));
    return { file: res.filePaths[0], entries };
  });

  handle('v04:exportLatex', async (e, dir, project, options = {}) => {
    assertOpened(dir);
    const tex = adv.toLatex(adv.sectionsFromProject(project, reader(dir)), meta(project), options);
    return saveText(e, 'Exportă LaTeX', `${safeName(project.title)}.tex`, [{ name: 'LaTeX', extensions: ['tex'] }], tex);
  });

  // options.flavor: 'pandoc' (default) | 'mmd'
  handle('v04:exportPandoc', async (e, dir, project, options = {}) => {
    assertOpened(dir);
    const sections = adv.sectionsFromProject(project, reader(dir));
    const mmd = options.flavor === 'mmd';
    const text = mmd ? adv.toMultiMarkdown(sections, { ...meta(project), ...(options.meta || {}) }, options) : adv.toPandoc(sections, { ...meta(project), ...(options.meta || {}) }, options);
    return saveText(e, mmd ? 'Exportă MultiMarkdown' : 'Exportă Pandoc Markdown', `${safeName(project.title)}.${mmd ? 'mmd' : 'md'}`, [{ name: 'Markdown', extensions: [mmd ? 'mmd' : 'md'] }], text);
  });
};

module.exports.scrivExportIo = scrivExportIo;
