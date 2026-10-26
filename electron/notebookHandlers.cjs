'use strict';
// IPC handlers for the NotebookLM follow-up-query capability (interrogate a notebook's sources
// until a usable answer, like the karma-nlm-doctrina agent). All optional: if no notebook is
// configured, or the notebooklm-mcp server can't be found, the handlers report "not configured"
// and the rest of the app is unaffected.
//
// main.cjs registration (after `handle`, `readSettings`, `getAiConfig`, `assertOpened` exist):
//   require('./notebookHandlers.cjs')({ handle, getSettings: readSettings, assertOpened, app });
const path = require('path');
const client = require('../lib/notebookLmClient.cjs');
const consult = require('../lib/notebookConsult.cjs');
const aiRuns = require('../lib/aiRuns.cjs');
const batch = require('../lib/aiBatch.cjs');

// Resolve the configured notebook id/name and the server name (Settings → Services).
function nlmConfig(settings) {
  const s = settings || {};
  return {
    notebook: String(s.notebookLmNotebook || '').trim(),
    serverName: String(s.notebookLmServer || '').trim() || client.SERVER_NAME,
  };
}

module.exports = function register({ handle, getSettings, assertOpened, app, deps = {} }) {
  const makeClient = deps.createClient || client.createClient;
  const discover = deps.discoverServerEntry || client.discoverServerEntry;

  // Is the feature usable right now? The renderer uses this to show/hide the context-menu item.
  handle('nlm:status', () => {
    const { notebook, serverName } = nlmConfig(getSettings());
    const entry = discover({ name: serverName });
    return { configured: Boolean(notebook), available: Boolean(entry), notebook, serverName };
  });

  const cacheFor = (dir) => {
    if (dir) {
      if (assertOpened) assertOpened(dir);
      return batch.createCache(path.join(dir, '.cache', 'nlm-cache.json'));
    }
    return batch.createCache(app ? path.join(app.getPath('userData'), 'nlm-cache.json') : null);
  };

  // Opens the configured notebook, runs the consult, closes the client. Shared by both handlers.
  async function withNotebook(signal, fn) {
    const settings = getSettings();
    if (settings.aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
    const { notebook, serverName } = nlmConfig(settings);
    if (!notebook) throw new Error('Niciun notebook NotebookLM configurat (Setări → Servicii).');
    const entry = discover({ name: serverName });
    if (!entry) throw new Error(`Serverul „${serverName}” nu este configurat în Claude (MCP). Nu pot întreba NotebookLM.`);
    const conn = await makeClient({ entry });
    try {
      const ask = consult.makeAsk({ client: conn });
      return await fn({ notebook, ask, signal });
    } finally {
      await conn.close();
    }
  }

  // Doctrinal / consistency consult on a batch of flagged expressions.
  //   items: [{term, context?}]  ->  { verdicts:[{term, verdict, reason, references, ...}], errors }
  handle('nlm:consult', async (e, dir, items, opts = {}) =>
    aiRuns.track(e.sender.id, (signal) => withNotebook(signal, ({ notebook, ask }) =>
      consult.consult({
        type: opts.type || 'doctrine',
        items, ask, notebook,
        cache: cacheFor(dir),
        maxRounds: opts.maxRounds || 4,
        cacheTag: notebook,
        onProgress: (p) => { try { if (!e.sender.isDestroyed()) e.sender.send('ai:progress', p); } catch { /* window gone */ } },
        signal,
      })), 24 * 3600 * 1000),
  );

  // Free-form interrogation (context menu "Ask NotebookLM" on a selection): ask follow-ups until
  // the notebook gives a usable answer, then return it with citations.
  handle('nlm:ask', async (e, question, opts = {}) =>
    aiRuns.track(e.sender.id, (signal) => withNotebook(signal, ({ notebook, ask }) =>
      consult.interrogate({ ask, notebook, question: String(question || ''), maxRounds: opts.maxRounds || 4, signal })), 24 * 3600 * 1000),
  );
};
