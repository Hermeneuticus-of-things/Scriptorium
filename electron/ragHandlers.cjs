'use strict';
// Research panel (RAG) IPC handlers. Registered from main.cjs:
//   require('./ragHandlers.cjs')({ handle, store, assertOpened, getSettings: readSettings, getApiKey, getAiConfig, ai });
// Indexes live in memory per project dir; progress goes to the sender as 'rag:progress'.
const rag = require('../lib/rag.cjs');
const aiRules = require('../lib/aiRules.cjs');
const aiRuns = require('../lib/aiRuns.cjs');

const collectSources = rag.collectSources;

module.exports = function register({ handle, store, assertOpened, getSettings, getApiKey, getAiConfig, ai, makeRun, noteSelfWrite, showOpenDialog }) {
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
    // opts.scope (research chat source choice) narrows to kinds and/or folders and documents.
    const filter = opts.scope ? require('../lib/researchChat.cjs').scopeFilter(store.loadProject(dir, { readOnly: true }).tree, opts.scope) : null;
    return indexFor(dir).query(String(q || ''), { k: Math.min(Number(opts.k) || 8, 30), kinds: filter ? undefined : opts.kinds, filter });
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
        const rules = aiRules.readRules(store, dir); // project AI rules apply to research too
        const run =
          (makeRun && aiRules.wrapRun(makeRun({ ...cfg, signal }), rules)) ||
          (({ text, question }) => ai.runAction({ action: 'ask', ...cfg, text, question, rules, signal }));
        return rag.ask(indexFor(dir), String(q || ''), run, { k: Math.min(Number(opts.k) || 6, 20) });
      }, timeoutMs),
    );
  });
  // --- research conversation (follow-ups, source scope, saved per project) ---
  const researchChat = require('../lib/researchChat.cjs');
  const saveChats = (dir, data) => {
    if (noteSelfWrite) noteSelfWrite(require('path').join(dir, researchChat.CHATS_FILE), JSON.stringify(data));
    researchChat.writeChats(dir, data);
  };
  handle('rag:chats', (_e, dir) => {
    assertOpened(dir);
    return researchChat.readChats(dir).chats;
  });
  handle('rag:chatDelete', (_e, dir, chatId) => {
    assertOpened(dir);
    saveChats(dir, researchChat.deleteChat(researchChat.readChats(dir), String(chatId || '')));
    return true;
  });
  // opts: { chatId, scope: { kinds, ids }, runId (streams 'ai:delta'), k }
  handle('rag:chat', async (e, dir, q, opts = {}) => {
    assertOpened(dir);
    if (getSettings().aiEnabled === false) throw new Error('Funcțiile AI sunt oprite din Setări.');
    const question = String(q || '').trim();
    if (!question) throw new Error('Scrie o întrebare.');
    // Incremental: only changed or newly imported sources are re-indexed.
    await build(e, dir);
    const project = store.loadProject(dir, { readOnly: true });
    const filter = researchChat.scopeFilter(project.tree, opts.scope);
    const before = researchChat.readChats(dir);
    const chat = opts.chatId ? before.chats.find((c) => c.id === opts.chatId) : null;
    const cfg = getAiConfig ? getAiConfig() : { apiKey: getApiKey() };
    const timeoutMs = (Number(getSettings().aiTimeoutSec) || 300) * 1000;
    const onDelta = opts.runId
      ? (delta) => {
          try {
            if (!e.sender.isDestroyed || !e.sender.isDestroyed()) e.sender.send('ai:delta', { runId: opts.runId, delta });
          } catch {
            /* window closed */
          }
        }
      : undefined;
    const turn = await queue.push('ask', () =>
      aiRuns.track(e.sender.id, (signal) => {
        const rules = aiRules.projectRules(project); // project AI rules apply to research too
        const run =
          (makeRun && aiRules.wrapRun(makeRun({ ...cfg, signal, onDelta }), rules)) ||
          (({ text, question: instr }) => ai.runAction({ action: 'ask', ...cfg, text, question: instr, rules, signal, onDelta }));
        return researchChat.askChat({ index: indexFor(dir), question, history: chat ? chat.turns : [], run, filter, k: Math.min(Number(opts.k) || 6, 20) });
      }, timeoutMs),
    );
    // Re-read: another window may have saved meanwhile.
    const { data, chat: saved } = researchChat.addTurn(researchChat.readChats(dir), chat ? chat.id : opts.chatId || null, turn, opts.scope);
    saveChats(dir, data);
    return { chat: saved, turn };
  });
  // Files chosen in a dialog -> [{ title, html, empty }] for new Research documents (PDF text, DOCX, TXT/MD, HTML…).
  handle('rag:importFiles', async (e, dir) => {
    assertOpened(dir);
    if (!showOpenDialog) return null;
    const res = await showOpenDialog(e, {
      title: 'Adaugă surse',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Surse', extensions: researchChat.SOURCE_EXTS.map((x) => x.slice(1)) }],
    });
    if (!res || res.canceled) return null;
    const out = [];
    for (const file of res.filePaths) {
      try {
        out.push(await researchChat.fileToSource(file));
      } catch (err) {
        out.push({ title: require('path').basename(file), html: '', empty: true, error: err.message || String(err) });
      }
    }
    return out;
  });
  return { indexes, collectSources: (dir) => collectSources(store, dir) };
};
