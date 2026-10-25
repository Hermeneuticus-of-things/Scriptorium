'use strict';
// Import / export IPC handlers (File > Import / Export / Save As / Print).
//
// main.cjs registration (one line, after `handle`, `assertOpened`, `rememberRecent`, `noteSelfWrite` are defined):
//   require('./ioHandlers.cjs')({ handle, dialog, BrowserWindow, store, assertOpened, rememberRecent, noteSelfWrite });
//
// preload.cjs lines (inside the exposeInMainWorld('api', { ... }) object):
//   importFiles: (dir, mode, separator, opts) => call('io:importFiles', dir, mode, separator, opts),
//   importOpml: () => call('io:importOpml'),
//   importWebPage: (url) => call('io:importWebPage', url),
//   exportDocuments: (dir, project, ids, options) => call('io:exportDocuments', dir, project, ids, options),
//   exportOpml: (dir, project, opts) => call('io:exportOpml', dir, project, opts),
//   exportCsv: (dir, project, wordCounts) => call('io:exportCsv', dir, project, wordCounts),
//   saveProjectAs: (dir, newTitle) => call('io:saveAs', dir, newTitle),
//   printDocument: (html, title) => call('io:printDocument', html, title),
//   -- Batch D --
//   listAllTemplates: () => call('io:listTemplates'),
//   saveAsTemplate: (dir, meta) => call('io:saveAsTemplate', dir, meta),
//   deleteTemplate: (id) => call('io:deleteTemplate', id),
//   newFromTemplate: (title, templateId) => call('io:newFromTemplate', title, templateId),
//   importText: (mode, separator, opts) => call('io:importText', mode, separator, opts),
//   importWebPage: (url, dir) => call('io:importWebPage', url, dir),
//   getPageSetup: (project) => call('io:getPageSetup', project),
//   setPageSetup: (setup) => call('io:setPageSetup', setup),
//   printPreview: (dir, project, options) => call('io:printPreview', dir, project, options),
//   printDocuments: (dir, project, options) => call('io:printDocuments', dir, project, options),
//   savePrintPdf: (token) => call('io:savePrintPdf', token),
//   listGlobalFormats: () => call('io:listGlobalFormats'),
//   saveGlobalFormats: (list) => call('io:saveGlobalFormats', list),
const fs = require('fs');
const os = require('os');
const { loadHtml } = require('../lib/loadHtml.cjs');
const path = require('path');
const { fileToHtml, classifyFile, importOpml, importWebPage, importFolder, TEXT_EXTS, MEDIA_EXTS } = require('../lib/importers.cjs');
const { splitHtml } = require('../lib/docxImport.cjs');
// Only known split options cross the IPC boundary.
const splitOpts = (o) => ({ firstLineTitle: Boolean(o && o.firstLineTitle), separatorTitle: Boolean(o && o.separatorTitle) });
// Conversion options (Options > Sharing > Import, or the Import dialog).
const convOpts = (o) => ({ defaultFormatting: Boolean(o && o.defaultFormatting), footnotes: o && o.footnotes === 'linked' ? 'linked' : 'inline' });
const exporters = require('../lib/exporters.cjs');
const templates = require('../lib/templates.cjs');
const printSetup = require('../lib/printSetup.cjs');
const compile = require('../lib/compile.cjs');
const compileFormats = require('../lib/compileFormats.cjs');


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
  try {
    compileFormats.setGlobalFormats(readJson(formatsFile(), []));
  } catch {
    /* app not ready (tests) */
  }

  // Text files become documents; everything else is copied into media/ (goes to Research).
  handle('io:importFiles', async (e, dir, mode = 'none', separator = '#', opts = {}) => {
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
        texts.push(...splitHtml(await fileToHtml(file, convOpts(opts)), mode, separator, baseTitle(file), splitOpts(opts)));
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

  handle('io:importOpml', async (e, opts = {}) => {
    const res = await dialog.showOpenDialog(winOf(e), {
      title: 'Importă OPML',
      properties: ['openFile'],
      filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }],
    });
    if (res.canceled) return null;
    return importOpml(fs.readFileSync(res.filePaths[0], 'utf8'), { noteTo: opts && opts.noteTo === 'text' ? 'text' : 'synopsis' });
  });

  // With `dir` (an opened project) the page's images are downloaded into media/ and embedded (offline copy);
  // the result then has `media` items to add to Research.
  handle('io:importWebPage', async (_e, url, dir, opts = {}) => {
    if (dir) assertOpened(dir);
    const saveMedia = dir
      ? ({ data, ext, name }) => {
          const id = store.newId();
          noteSelfWrite(path.join(dir, 'media', `${id}.${ext}`));
          const file = store.writeMedia(dir, id, ext, data);
          return { id, title: name.replace(/\.[^.]+$/, '') || 'Imagine', file, mime: store.mimeFor(file), name };
        }
      : null;
    // Options > Sharing > Import: a web page as formatted text, plain text, PDF or a web archive (MHTML).
    const as = opts && ['pdf', 'archive'].includes(opts.as) ? opts.as : null;
    if (as && dir) {
      if (!/^https?:\/\//i.test(String(url))) throw new Error('Adresa trebuie să înceapă cu http:// sau https://.');
      const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: true } });
      try {
        await win.loadURL(String(url));
        const title = win.webContents.getTitle() || String(url);
        const id = store.newId();
        const ext = as === 'pdf' ? 'pdf' : 'mhtml';
        let data;
        if (as === 'pdf') data = await win.webContents.printToPDF({ printBackground: true });
        else {
          const tmpFile = path.join(os.tmpdir(), `scribner-web-${Date.now()}.mhtml`);
          await win.webContents.savePage(tmpFile, 'MHTML');
          data = fs.readFileSync(tmpFile);
          fs.rmSync(tmpFile, { force: true });
        }
        noteSelfWrite(path.join(dir, 'media', `${id}.${ext}`));
        const file = store.writeMedia(dir, id, ext, data);
        return { title, html: '', media: [{ id, title, media: { file, mime: store.mimeFor(file), name: `${exporters.safeName(title)}.${ext}` } }] };
      } finally {
        win.destroy();
      }
    }
    const page = await importWebPage(url, { saveMedia, asText: Boolean(opts && (opts.asText || opts.as === 'text')) });
    if (!dir) return page;
    return {
      title: page.title,
      html: page.html,
      media: page.media.map((m) => ({ id: m.id, title: m.title, media: { file: m.file, mime: m.mime, name: m.name } })),
    };
  });

  // Import dialog (Word/RTF/ODT/text/Markdown/HTML/Fountain/FDX) with split options.
  handle('io:importText', async (e, mode = 'none', separator = '#', opts = {}) => {
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
    for (const file of res.filePaths) {
      const split = splitHtml(await fileToHtml(file, convOpts(opts)), mode, separator, baseTitle(file), splitOpts(opts));
      // Import as linked document: the part remembers its file (and the file's time) and is
      // refreshed from it when the file changes on disk (checkLinkedFiles).
      if (opts && opts.linked && split.length === 1) split[0] = { ...split[0], linkedFile: file, linkedMtime: fs.statSync(file).mtimeMs };
      parts.push(...split);
    }
    return parts;
  });

  // File > Import > Folder: a folder from disk with its sub-folders, as binder folders and documents.
  handle('io:importFolder', async (e, dir, opts = {}) => {
    assertOpened(dir);
    const res = await dialog.showOpenDialog(winOf(e), { title: 'Importă un dosar', properties: ['openDirectory'] });
    if (res.canceled || !res.filePaths[0]) return null;
    const tree = await importFolder(res.filePaths[0], convOpts(opts));
    // Media are copied into media/ here; the renderer gets binder-ready media items.
    const store1 = (n) => {
      if (n.mediaFile) {
        const id = store.newId();
        const ext = (path.extname(n.mediaFile).slice(1) || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        noteSelfWrite(path.join(dir, 'media', `${id}.${ext}`));
        const stored = store.writeMedia(dir, id, ext, fs.readFileSync(n.mediaFile));
        return { title: n.title, id, media: { file: stored, mime: store.mimeFor(stored), name: path.basename(n.mediaFile) } };
      }
      const out = { title: n.title };
      if (n.folder) out.children = (n.children || []).map(store1);
      else {
        out.html = n.html;
        if (opts && opts.linked) Object.assign(out, { linkedFile: n.file, linkedMtime: fs.statSync(n.file).mtimeMs });
      }
      return out;
    };
    return [store1(tree)];
  });

  // Linked documents (imported as linked, or kept in sync with an external file): those whose file
  // changed since `mtime`, with the new text. items: [{id, file, mtime}].
  handle('io:checkLinkedFiles', async (_e, items = [], opts = {}) => {
    const out = [];
    for (const it of Array.isArray(items) ? items.slice(0, 500) : []) {
      if (!it || typeof it.file !== 'string' || !path.isAbsolute(it.file) || !TEXT_EXTS.includes(path.extname(it.file).toLowerCase())) continue;
      let st;
      try {
        st = fs.statSync(it.file);
      } catch {
        out.push({ id: it.id, missing: true });
        continue;
      }
      if (st.mtimeMs > (Number(it.mtime) || 0) + 1) out.push({ id: it.id, html: await fileToHtml(it.file, convOpts(opts)), mtime: st.mtimeMs });
    }
    return out;
  });

  // ---------------------------------------------------------------- templates
  handle('io:listTemplates', () => templates.listTemplates(templatesDir()));
  handle('io:saveAsTemplate', (_e, dir, meta) => {
    assertOpened(dir);
    return templates.saveUserTemplate(dir, templatesDir(), meta || {});
  });
  handle('io:deleteTemplate', (_e, id) => templates.deleteUserTemplate(templatesDir(), id));
  handle('io:exportTemplate', async (e, id) => {
    const res = await dialog.showOpenDialog(winOf(e), { title: 'Exportă șablonul în…', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths[0]) return null;
    return templates.exportUserTemplate(templatesDir(), id, res.filePaths[0]);
  });
  handle('io:importTemplate', async (e) => {
    const res = await dialog.showOpenDialog(winOf(e), { title: 'Importă șablon (folderul .sablon)', properties: ['openDirectory'] });
    if (res.canceled || !res.filePaths[0]) return null;
    return templates.importUserTemplate(res.filePaths[0], templatesDir());
  });
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
  // The Page Setup lives in the project (project.pageSetup); userData/page-setup.json is the
  // default for projects without one (the last setup saved).
  const setupFor = (project, options = {}) => printSetup.normalizePageSetup(options.pageSetup || (project && project.pageSetup) || readJson(pageSetupFile(), {}));
  handle('io:getPageSetup', (_e, project) => setupFor(project));
  handle('io:setPageSetup', (_e, setup) => {
    const clean = printSetup.normalizePageSetup(setup || {});
    writeJson(pageSetupFile(), clean);
    return clean;
  });

  const readerFor = (dir) => (id) => {
    try {
      return store.readDoc(dir, id);
    } catch {
      return '';
    }
  };
  // Current document / selection (options.ids) or the whole Draft, through the Compile HTML
  // pipeline, with the Page Setup's page box and running header/footer (compile.pageCss).
  // options.view: 'document' (default) | 'cards' (corkboard) | 'outline'; each prints with the
  // Page Setup's settings for that view (setup.views).
  const printHtml = (dir, project, options, setup) => {
    const ids = Array.isArray(options.ids) && options.ids.length ? options.ids : null;
    const view = ['cards', 'outline'].includes(options.view) ? options.view : 'document';
    const page = (body) => printSetup.printPage(body, project.title, setup, project);
    if (view === 'cards') {
      const items = printSetup.printItems(project, ids);
      // A single selected folder prints its cards (its children), like the corkboard shows them.
      const nodes = ids && ids.length === 1 && items.length > 1 ? items.filter((it) => it.depth === 1).map((it) => it.node) : items.map((it) => it.node);
      return page(printSetup.cardsPrintHtml(nodes, project, setup.views.cards));
    }
    if (view === 'outline') {
      const read = readerFor(dir);
      const items = printSetup.printItems(project, ids).map((it) => ({ ...it, words: it.node.type === 'text' ? store.wordCount(read(it.node.id)) : 0 }));
      return page(printSetup.outlinePrintHtml(items, project, setup.views.outline));
    }
    const dv = setup.views.document;
    if (dv.synopsis || dv.notes || dv.metadata || !dv.titles) {
      const read = readerFor(dir);
      const notes = (id) => {
        try {
          return store.readDoc(dir, id, 'notes');
        } catch {
          return '';
        }
      };
      const items = printSetup.printItems(project, ids).map((it) => ({ ...it, html: read(it.node.id), notes: dv.notes ? notes(it.node.id) : '' }));
      return page(printSetup.documentPrintHtml(items, project, dv));
    }
    const html = compile.compileHtml(project, readerFor(dir), { ids, documentTitles: true, folderHeadings: true, titlePage: false, separator: '', projectDir: dir, target: 'pdf' });
    return printSetup.applyToHtml(html, setup, project);
  };
  const hiddenWindow = () => new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
  const renderPdf = async (html, pdfOpts) => {
    const render = hiddenWindow();
    try {
      await loadHtml(render, html);
      return await render.webContents.printToPDF(pdfOpts);
    } finally {
      render.destroy();
    }
  };
  const previews = new Map(); // token -> { pdf, title }; the last few previews, for Save PDF
  let previewSeq = 0;

  // options.ids: documents to preview (current document / selection); without ids the whole manuscript.
  // options.compiled: true = use the Compile format (Compile > Print) in a separate window.
  // Otherwise the Page Setup is applied and the PDF is returned for the preview dialog:
  //   { token, data: Uint8Array, pageCount, pageSize: {width, height} (pt), setup }
  handle('io:printPreview', async (_e, dir, project, options = {}) => {
    assertOpened(dir);
    if (options.compiled) {
      const html = compile.compileHtml(project, readerFor(dir), { ...options, projectDir: dir, target: 'pdf' });
      const pdf = await renderPdf(html, compile.pdfOptions(options, project));
      const file = path.join(os.tmpdir(), `scribner-preview-${Date.now()}.pdf`);
      fs.writeFileSync(file, pdf);
      // Chromium's PDF viewer: page view, zoom and a Print button.
      const preview = new BrowserWindow({ width: 900, height: 1000, title: `Previzualizare tipărire — ${project.title || ''}`, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, plugins: true } });
      preview.setMenuBarVisibility(false);
      preview.on('closed', () => fs.rm(file, { force: true }, () => {}));
      await preview.loadURL(`file://${file}`);
      return { file };
    }
    const setup = setupFor(project, options);
    const pdf = await renderPdf(printHtml(dir, project, options, setup), printSetup.pdfPrintOptions(setup));
    const token = `p${++previewSeq}`;
    previews.set(token, { pdf, title: project.title || 'Scribner' });
    while (previews.size > 3) previews.delete(previews.keys().next().value);
    return { token, data: new Uint8Array(pdf), pageCount: printSetup.pdfPageCount(pdf), pageSize: printSetup.pdfPageSize(pdf), setup };
  });

  // Prints the same pages as Print Preview (system print dialog).
  handle('io:printDocuments', async (_e, dir, project, options = {}) => {
    assertOpened(dir);
    const setup = setupFor(project, options);
    const win = hiddenWindow();
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(printHtml(dir, project, options, setup))}`);
    return new Promise((resolve) => {
      win.webContents.print(printSetup.printOptions(setup), (success, reason) => {
        win.destroy();
        resolve({ success, reason: success ? '' : reason });
      });
    });
  });

  // Page Setup > Printer: the printers the system knows (name, display name, default).
  handle('io:listPrinters', async (e) => {
    const list = await e.sender.getPrintersAsync();
    return list.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: Boolean(p.isDefault) }));
  });

  // Save PDF from the preview dialog.
  handle('io:savePrintPdf', async (e, token) => {
    const p = previews.get(token);
    if (!p) throw new Error('Previzualizarea a expirat; deschide-o din nou.');
    const res = await dialog.showSaveDialog(winOf(e), { title: 'Salvează PDF', defaultPath: `${exporters.safeName(p.title)}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (res.canceled || !res.filePath) return null;
    fs.writeFileSync(res.filePath, p.pdf);
    return res.filePath;
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

  handle('io:exportOpml', async (e, dir, project, opts = {}) => {
    assertOpened(dir);
    const textOf = opts && opts.includeText
      ? (n) => [store.readDoc(dir, n.id, 'docs'), store.readDoc(dir, n.id, 'notes')].map((h) => store.htmlToText(h || '').trim()).filter(Boolean).join('\n\n')
      : null;
    return saveText(e, 'Exportă OPML', `${exporters.safeName(project.title)}.opml`, [{ name: 'OPML', extensions: ['opml'] }], exporters.exportOpml(project, { textOf }));
  });

  handle('io:exportCsv', async (e, dir, project, wordCounts, options = {}) => {
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
    return saveText(e, 'Exportă metadatele (CSV)', `${exporters.safeName(project.title)} - metadate.csv`, [{ name: 'CSV', extensions: ['csv'] }], exporters.exportMetadataCsv(project, counts, { columns: options && options.columns }));
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
    const win = hiddenWindow();
    const setup = setupFor(null);
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
