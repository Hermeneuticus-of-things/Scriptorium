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
//   -- Batch D --
//   listAllTemplates: () => call('io:listTemplates'),
//   saveAsTemplate: (dir, meta) => call('io:saveAsTemplate', dir, meta),
//   deleteTemplate: (id) => call('io:deleteTemplate', id),
//   newFromTemplate: (title, templateId) => call('io:newFromTemplate', title, templateId),
//   importText: (mode, separator) => call('io:importText', mode, separator),
//   importWebPage: (url, dir) => call('io:importWebPage', url, dir),
//   getPageSetup: () => call('io:getPageSetup'),
//   setPageSetup: (setup) => call('io:setPageSetup', setup),
//   printPreview: (dir, project, options) => call('io:printPreview', dir, project, options),
//   listGlobalFormats: () => call('io:listGlobalFormats'),
//   saveGlobalFormats: (list) => call('io:saveGlobalFormats', list),
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileToHtml, classifyFile, importOpml, webPageToHtml, localizeImages, TEXT_EXTS } = require('../lib/importers.cjs');
const { splitHtml } = require('../lib/docxImport.cjs');
const exporters = require('../lib/exporters.cjs');
const templates = require('../lib/templates.cjs');
const printSetup = require('../lib/printSetup.cjs');
const compile = require('../lib/compile.cjs');
const compileFormats = require('../lib/compileFormats.cjs');

const MEDIA_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'heic', 'pdf', 'mp3', 'm4a', 'wav', 'ogg', 'aac', 'mp4', 'mov', 'm4v', 'webm'];

module.exports = function register({ handle, dialog, BrowserWindow, store, assertOpened, rememberRecent, noteSelfWrite }) {
  const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
  const baseTitle = (f) => path.basename(f).replace(/\.[^.]+$/, '');
  const userData = () => require('electron').app.getPath('userData');
  const templatesDir = () => path.join(userData(), 'templates');
  const readJson = (file, def) => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return def;
    }
  };
  const writeJson = (file, data) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };
  const pageSetupFile = () => path.join(userData(), 'page-setup.json');
  const formatsFile = () => path.join(userData(), 'compile-formats.json');
  const pageSetup = () => printSetup.normalizePageSetup(readJson(pageSetupFile(), {}));
  try {
    compileFormats.setGlobalFormats(readJson(formatsFile(), []));
  } catch {
    /* app not ready (tests) */
  }

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

  // With `dir` (an opened project) the page's images are downloaded into media/ and embedded (offline copy);
  // the result then has `media` items to add to Research.
  handle('io:importWebPage', async (_e, url, dir) => {
    let u;
    try {
      u = new URL(String(url));
    } catch {
      throw new Error('Adresă web invalidă.');
    }
    if (!/^https?:$/.test(u.protocol)) throw new Error('Sunt acceptate doar adrese http(s).');
    const r = await fetch(u.href, { redirect: 'follow' });
    if (!r.ok) throw new Error(`Pagina nu a putut fi descărcată (HTTP ${r.status}).`);
    const page = webPageToHtml(await r.text(), r.url || u.href);
    if (!dir) return page;
    assertOpened(dir);
    const local = await localizeImages(page.html, {
      fetchImage: async (src) => {
        const res = await fetch(src, { redirect: 'follow' });
        if (!res.ok) return null;
        return { data: Buffer.from(await res.arrayBuffer()), mime: res.headers.get('content-type') || '' };
      },
      saveMedia: ({ data, ext, name }) => {
        const id = store.newId();
        noteSelfWrite(path.join(dir, 'media', `${id}.${ext}`));
        const file = store.writeMedia(dir, id, ext, data);
        return { id, title: name.replace(/\.[^.]+$/, '') || 'Imagine', file, mime: store.mimeFor(file), name };
      },
    });
    return {
      title: page.title,
      html: local.html,
      media: local.media.map((m) => ({ id: m.id, title: m.title, media: { file: m.file, mime: m.mime, name: m.name } })),
    };
  });

  // Import dialog (Word/RTF/ODT/text/Markdown/HTML/Fountain/FDX) with split options.
  handle('io:importText', async (e, mode = 'none', separator = '#') => {
    const res = await dialog.showOpenDialog(winOf(e), {
      title: 'Importă text',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Toate formatele text', extensions: TEXT_EXTS.map((x) => x.slice(1)) },
        { name: 'Word (.docx)', extensions: ['docx'] },
        { name: 'RTF', extensions: ['rtf'] },
        { name: 'OpenDocument (.odt)', extensions: ['odt'] },
        { name: 'Text / Markdown', extensions: ['txt', 'md', 'markdown'] },
      ],
    });
    if (res.canceled) return null;
    const parts = [];
    for (const file of res.filePaths) parts.push(...splitHtml(await fileToHtml(file), mode, separator, baseTitle(file)));
    return parts;
  });

  // ---------------------------------------------------------------- templates
  handle('io:listTemplates', () => templates.listTemplates(templatesDir()));
  handle('io:saveAsTemplate', (_e, dir, meta) => {
    assertOpened(dir);
    return templates.saveUserTemplate(dir, templatesDir(), meta || {});
  });
  handle('io:deleteTemplate', (_e, id) => templates.deleteUserTemplate(templatesDir(), id));
  // Returns {dir}; the renderer then opens it with openProject(dir) (it is in the recent list).
  handle('io:newFromTemplate', async (e, title, templateId) => {
    const name = String(title || '').trim();
    if (!name) throw new Error('Titlul lipsește.');
    const res = await dialog.showOpenDialog(winOf(e), { title: 'Alege folderul în care se creează proiectul', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled) return null;
    const dir = store.projectDirFor(res.filePaths[0], name);
    templates.createFromUserTemplate(templatesDir(), templateId, dir, name);
    rememberRecent(dir, name);
    return { dir };
  });

  // ---------------------------------------------------------------- global compile formats
  handle('io:listGlobalFormats', () => compileFormats.getGlobalFormats());
  handle('io:saveGlobalFormats', (_e, list) => {
    const clean = compileFormats.setGlobalFormats(list);
    writeJson(formatsFile(), clean);
    return clean;
  });

  // ---------------------------------------------------------------- page setup / print preview
  handle('io:getPageSetup', () => pageSetup());
  handle('io:setPageSetup', (_e, setup) => {
    const clean = printSetup.normalizePageSetup(setup || {});
    writeJson(pageSetupFile(), clean);
    return clean;
  });

  // options.ids: documents to preview (current document / selection); without ids the whole manuscript.
  // options.compiled: true = use the Compile format (Compile > Print); otherwise Page Setup is applied.
  handle('io:printPreview', async (_e, dir, project, options = {}) => {
    assertOpened(dir);
    const read = (id) => {
      try {
        return store.readDoc(dir, id);
      } catch {
        return '';
      }
    };
    const setup = pageSetup();
    let html;
    let pdfOpts;
    if (options.compiled) {
      html = compile.compileHtml(project, read, { ...options, projectDir: dir, target: 'pdf' });
      pdfOpts = compile.pdfOptions(options, project);
    } else {
      const ids = Array.isArray(options.ids) && options.ids.length ? options.ids : null;
      html = compile.compileHtml(project, read, { ids, documentTitles: true, folderHeadings: true, titlePage: false, separator: '', projectDir: dir, target: 'pdf' });
      html = html.replace('</head>', `<style>${printSetup.printCss(setup)}</style></head>`);
      pdfOpts = printSetup.pdfPrintOptions(setup);
    }
    const render = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    let file;
    try {
      await render.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdf = await render.webContents.printToPDF(pdfOpts);
      file = path.join(os.tmpdir(), `scribner-preview-${Date.now()}.pdf`);
      fs.writeFileSync(file, pdf);
    } finally {
      render.destroy();
    }
    // Chromium's PDF viewer: page view, zoom and a Print button.
    const preview = new BrowserWindow({ width: 900, height: 1000, title: `Previzualizare tipărire — ${project.title || ''}`, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, plugins: true } });
    preview.setMenuBarVisibility(false);
    preview.on('closed', () => fs.rm(file, { force: true }, () => {}));
    await preview.loadURL(`file://${file}`);
    return { file };
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
    const setup = pageSetup();
    const page = printSetup.printPage(html, title, setup);
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page)}`);
    return new Promise((resolve) => {
      win.webContents.print(printSetup.printOptions(setup), (success, reason) => {
        win.destroy();
        resolve({ success, reason: success ? '' : reason });
      });
    });
  });
};
