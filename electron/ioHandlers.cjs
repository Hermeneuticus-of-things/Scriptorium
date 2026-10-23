'use strict';
// Import / export IPC handlers (Scrivener 3-style File > Import / Export / Save As / Print).
//
// main.cjs registration (one line, after `handle`, `assertOpened`, `rememberRecent`, `noteSelfWrite` are defined):
//   require('./ioHandlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, rememberRecent, noteSelfWrite });
//
// preload.cjs lines (inside the exposeInMainWorld('api', { ... }) object):
//   importFiles: (dir, mode, separator) => call('io:importFiles', dir, mode, separator),
//   importOpml: () => call('io:importOpml'),
//   importWebPage: (url) => call('io:importWebPage', url),
//   exportDocuments: (dir, project, ids, options) => call('io:exportDocuments', dir, project, ids, options),
//   exportOpml: (dir, project) => call('io:exportOpml', dir, project),
//   exportCsv: (dir, project, wordCounts) => call('io:exportCsv', dir, project, wordCounts),
//   saveProjectAs: (dir, newTitle) => call('io:saveAs', dir, newTitle),
//   printDocument: (html, title) => call('io:printDocument', html, title),
const fs = require('fs');
const path = require('path');
const { fileToHtml, classifyFile, importOpml, webPageToHtml, TEXT_EXTS } = require('../lib/importers.cjs');
const { splitHtml } = require('../lib/docxImport.cjs');
const exporters = require('../lib/exporters.cjs');

const MEDIA_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic', 'pdf', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'mp4', 'mov', 'm4v', 'webm'];

module.exports = function register({ handle, dialog, BrowserWindow, store, assertOpened, rememberRecent, noteSelfWrite }) {
  const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
  const baseTitle = (f) => path.basename(f).replace(/\.[^.]+$/, '');

  // Text files become documents; everything else is copied into media/ (goes to Research).
  handle('io:importFiles', async (e, dir, mode = 'none', separator = '#') => {
    assertOpened(dir);
    const res = await dialog.showOpenDialog(winOf(e), {
      title: 'Importă fișiere',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Toate formatele acceptate', extensions: [...TEXT_EXTS.map((x) => x.slice(1)), ...MEDIA_EXTS] },
        { name: 'Text', extensions: TEXT_EXTS.map((x) => x.slice(1)) },
        { name: 'Media', extensions: MEDIA_EXTS },
        { name: 'Toate fișierele', extensions: ['*'] },
      ],
    });
    if (res.canceled) return null;
    const texts = [];
    const media = [];
    for (const file of res.filePaths) {
      if (classifyFile(file) === 'text') {
        texts.push(...splitHtml(await fileToHtml(file), mode, separator, baseTitle(file)));
      } else {
        const id = store.newId();
        const ext = (path.extname(file).slice(1) || 'bin').toLowerCase();
        noteSelfWrite(path.join(dir, 'media', `${id}.${ext.replace(/[^a-z0-9]/g, '') || 'bin'}`));
        const stored = store.writeMedia(dir, id, ext, fs.readFileSync(file));
        media.push({ id, title: baseTitle(file), media: { file: stored, mime: store.mimeFor(stored), name: path.basename(file) } });
      }
    }
    return { texts, media };
  });

  handle('io:importOpml', async (e) => {
    const res = await dialog.showOpenDialog(winOf(e), {
      title: 'Importă OPML',
      properties: ['openFile'],
      filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }],
    });
    if (res.canceled) return null;
    return importOpml(fs.readFileSync(res.filePaths[0], 'utf8'));
  });

  handle('io:importWebPage', async (_e, url) => {
    let u;
    try {
      u = new URL(String(url));
    } catch {
      throw new Error('Adresă web invalidă.');
    }
    if (!/^https?:$/.test(u.protocol)) throw new Error('Sunt acceptate doar adrese http(s).');
    const r = await fetch(u.href, { redirect: 'follow' });
    if (!r.ok) throw new Error(`Pagina nu a putut fi descărcată (HTTP ${r.status}).`);
    return webPageToHtml(await r.text(), r.url || u.href);
  });

  handle('io:exportDocuments', async (e, dir, project, ids, options = {}) => {
    assertOpened(dir);
    const res = await dialog.showOpenDialog(winOf(e), { title: 'Alege folderul de export', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled) return null;
    const outDir = path.join(res.filePaths[0], exporters.safeName(project.title || 'Export'));
    const read = (kind) => (id) => {
      try {
        return store.readDoc(dir, id, kind);
      } catch {
        return '';
      }
    };
    const result = await exporters.exportDocuments(project, dir, read('docs'), read('notes'), ids, outDir, options);
    return { dir: outDir, count: result.count, files: result.files.length };
  });

  const saveText = async (e, title, defaultPath, filters, data) => {
    const res = await dialog.showSaveDialog(winOf(e), { title, defaultPath, filters });
    if (res.canceled || !res.filePath) return null;
    fs.writeFileSync(res.filePath, data);
    return res.filePath;
  };

  handle('io:exportOpml', async (e, dir, project) => {
    assertOpened(dir);
    return saveText(e, 'Exportă OPML', `${exporters.safeName(project.title)}.opml`, [{ name: 'OPML', extensions: ['opml'] }], exporters.exportOpml(project));
  });

  handle('io:exportCsv', async (e, dir, project, wordCounts) => {
    assertOpened(dir);
    let counts = wordCounts;
    if (!counts) {
      counts = {};
      store.walk(project.tree, (n) => {
        if (n.type === 'file') return;
        try {
          counts[n.id] = store.wordCount(store.readDoc(dir, n.id));
        } catch {
          /* missing doc */
        }
      });
    }
    return saveText(e, 'Exportă metadatele (CSV)', `${exporters.safeName(project.title)} - metadate.csv`, [{ name: 'CSV', extensions: ['csv'] }], exporters.exportMetadataCsv(project, counts));
  });

  handle('io:saveAs', async (e, dir, newTitle) => {
    assertOpened(dir);
    const res = await dialog.showOpenDialog(winOf(e), { title: 'Salvează ca: alege folderul părinte', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled) return null;
    const copy = exporters.saveProjectAs(dir, res.filePaths[0], newTitle);
    rememberRecent(copy.dir, copy.project.title);
    return copy;
  });

  handle('io:printDocument', async (_e, html, title = 'Scribner') => {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    const page = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${String(title).replace(/[<&]/g, '')}</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.5;margin:2cm}img{max-width:100%}</style></head><body>${html || ''}</body></html>`;
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);
    return new Promise((resolve) => {
      win.webContents.print({ silent: false, printBackground: false }, (success, reason) => {
        win.destroy();
        resolve({ success, reason: success ? '' : reason });
      });
    });
  });
};
