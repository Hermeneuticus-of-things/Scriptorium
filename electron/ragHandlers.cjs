'use strict';
// Research panel (RAG) IPC handlers. Registered from main.cjs:
//   require('./ragHandlers.cjs')({ handle, store, assertOpened, getSettings: readSettings, getApiKey, getAiConfig, ai });
// Indexes live in memory per project dir; progress goes to the sender as 'rag:progress'.
const rag = require('../lib/rag.cjs');
const aiRuns = require('../lib/aiRuns.cjs');

function collectSources(store, dir) {
  const project = store.loadProject(dir);
  const sources = [];
  const roots = project.tree || [];
  for (const root of roots) {
    if (root.root === 'trash') continue;
    const kind = root.root === 'research' ? 'research' : 'docs';
    store.walk(root.children || [], (n) => {
      const text = rag.htmlToText(store.readDoc(dir, n.id, 'docs'));
      const extra = [n.synopsis].filter(Boolean).join('\n');
      if (text.trim() || extra) sources.push({ id: n.id, title: n.title, kind, text: `${extra}\n${text}` });
      const note = rag.htmlToText(store.readDoc(dir, n.id, 'notes'));
      if (note.trim()) sources.push({ id: n.id, title: `${n.title} (note)`, kind: 'notes', text: note });
    });
  }
  return sources;
}

module.exports = function register({ handle, store, assertOpened, getSettings, getApiKey, getAiConfig, ai, makeRun }) {
  const indexes = new Map(); // dir -> index
  const send = (e) => (p) => {
    try {
      if (!e.sender.isDestroyed()) e.sender.send('rag:progress', p);
    } catch {
      /* window closed */
    }
  };
  const queue = rag.createQueue();
  const indexFor = (dir) => {
    if (!indexes.has(dir)) indexes.set(dir, rag.createIndex());
    return indexes.get(dir);
  };
  const build = (e, dir) =>
    queue.push('build', async (progress) => {
      const sources = collectSources(store, dir);
      const out = indexFor(dir).update(sources, (p) => {
        progress(p);
        send(e)({ dir, phase: 'build', ...p });
      });
      send(e)({ dir, phase: 'done', ...out });
      return out;
    });

  handle('rag:build', (e, dir) => {
    assertOpened(dir);
    return build(e, dir);
  });
  handle('rag:query', async (e, dir, q, opts = {}) => {
    assertOpened(dir);
    if (!indexes.has(dir)) await build(e, dir);
    return indexFor(dir).query(String(q || ''), { k: Math.min(Number(opts.k) || 8, 30), kinds: opts.kinds });
  });
  handle('rag:ask', async (e, dir, q, opts = {}) => {
    assertOpened(dir);
    if (getSettings().aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
    if (!indexes.has(dir)) await build(e, dir);
    // The ask step goes through lib/ai.cjs runAction -> lib/aiProviders complete() with the chosen provider.
    const cfg = getAiConfig ? getAiConfig() : { apiKey: getApiKey() };
    // Registered with aiRuns so "Anulează" (ai:cancel) and the AI timeout also stop the research answer.
    const timeoutMs = (Number(getSettings().aiTimeoutSec) || 300) * 1000;
    return queue.push('ask', () =>
      aiRuns.track(e.sender.id, (signal) => {
        const run =
          (makeRun && makeRun({ ...cfg, signal })) ||
          (({ text, question }) => ai.runAction({ action: 'ask', ...cfg, text, question, signal }));
        return rag.ask(indexFor(dir), String(q || ''), run, { k: Math.min(Number(opts.k) || 6, 20) });
      }, timeoutMs),
    );
  });
  return { indexes, collectSources: (dir) => collectSources(store, dir) };
};
