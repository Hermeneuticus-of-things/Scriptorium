'use strict';
// v1.0 bulk AI IPC handlers: bulk synopsis, book consistency (living sheets), multi-zoom review.
//
// main.cjs registration (after `handle`, `readSettings`, `getApiKey`, `assertOpened` exist):
//   require('./v10Handlers.cjs')({ handle, getSettings: readSettings, getApiKey, getAiConfig, assertOpened, app });
// Cache file: <project>/.cache/ai-cache.json (falls back to userData when no dir is passed).
const path = require('path');
const batch = require('../lib/aiBatch.cjs');
const providers = require('../lib/aiProviders.cjs');

// getAiConfig() -> {provider, model, baseUrl, apiKey} (optional; falls back to Anthropic + getApiKey()).
module.exports = function register({ handle, getSettings, getApiKey, getAiConfig, assertOpened, app, makeRun = batch.makeRun }) {
  const guard = () => {
    if (getSettings().aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
    const cfg = getAiConfig ? getAiConfig() : { provider: 'anthropic', apiKey: getApiKey() };
    const r = providers.resolveConfig(cfg);
    if (r.needsKey && !cfg.apiKey) throw new Error(providers.missingKeyMessage(r.provider));
    return makeRun(getAiConfig ? cfg : cfg.apiKey);
  };
  const cacheFor = (dir) => {
    if (dir) {
      if (assertOpened) assertOpened(dir);
      return batch.createCache(path.join(dir, '.cache', 'ai-cache.json'));
    }
    return batch.createCache(app ? path.join(app.getPath('userData'), 'ai-cache.json') : null);
  };
  const progress = (e) => (p) => {
    try { if (!e.sender.isDestroyed || !e.sender.isDestroyed()) e.sender.send('ai:progress', p); } catch { /* window gone */ }
  };

  // docs: [{id, title, text}] (plain text built in the renderer)
  handle('ai:bulkSynopsis', async (e, dir, docs, opts = {}) => {
    const run = guard();
    return batch.bulkSynopsis({ docs, run, cache: cacheFor(dir), concurrency: opts.concurrency || 3, onProgress: progress(e) });
  });

  // sheets: previous living sheets (project.livingSheets) for incremental merge
  handle('ai:consistency', async (e, dir, docs, sheets, notes) => {
    const run = guard();
    return batch.bookConsistency({ docs, run, cache: cacheFor(dir), sheets, notes, onProgress: progress(e) });
  });

  // docs: [{id, title, text, synopsis, chapter}], levels: ['Maha','Macro','Mezzo','Micro','Nano']
  handle('ai:zoomReview', async (e, dir, docs, levels, profileRules) => {
    const run = guard();
    return batch.multiZoomReview({ docs, levels, run, cache: cacheFor(dir), profileRules, onProgress: progress(e) });
  });
};
