import { getHTMLFromFragment } from '@tiptap/core';
import { keyFromEvent, shortcutFor } from './lib/commands.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Home from './components/Home.jsx';
import Binder from './components/Binder.jsx';
import Editor from './components/Editor.jsx';
import Scrivenings from './components/Scrivenings.jsx';
import Corkboard from './components/Corkboard.jsx';
import Outliner from './components/Outliner.jsx';
import Inspector from './components/Inspector.jsx';
import AiPanel from './components/AiPanel.jsx';
import EditorialPanel from './components/EditorialPanel.jsx';
import MediaView from './components/MediaView.jsx';
import ImportReport from './components/ImportReport.jsx';
import QuickRef from './components/QuickRef.jsx';
import ShortcutsDialog from './components/ShortcutsDialog.jsx';
import StylesDialog from './components/StylesDialog.jsx';
import GoToDialog from './components/GoToDialog.jsx';
import ProjectSettingsDialog from './components/ProjectSettingsDialog.jsx';
import StatisticsDialog from './components/StatisticsDialog.jsx';
import TargetsDialog from './components/TargetsDialog.jsx';
import CollectionsBar from './components/CollectionsBar.jsx';
import KeywordsDialog from './components/KeywordsDialog.jsx';
import AdvancedSearchDialog from './components/AdvancedSearchDialog.jsx';
import { collectionNodes, createCollection } from './lib/collections.js';
import { replaceInFields, searchProject, buildTerms } from './lib/projectSearch.js';
import { profileFor } from './lib/editorial.js';
import { htmlToManuscript } from './lib/editorial.js';
import { projectWords } from './editor/writing.js';
import { styleCss, stylesOf } from './lib/styles.js';
import CompileDialog from './components/CompileDialog.jsx';
import ExportDialog from './components/ExportDialog.jsx';
import { collectBookDocs, buildAlogenGlossary, buildReadingGlossary, buildPrintToc } from './lib/glossary.js';
import { BackIcon, CompileIcon, ComposeIcon, CorkboardIcon, DocumentIcon, ForwardIcon, InspectorIcon, LockIcon, OutlineIcon, ScriveningsIcon, SplitIcon } from './components/Icons.jsx';
import { targetCrossed } from './lib/panelsExtra.js';
import SaveTemplateDialog from './components/SaveTemplateDialog.jsx';
import PageSetupDialog from './components/PageSetupDialog.jsx';
import HelpWindow from './components/HelpWindow.jsx';
import ResearchPanel from './components/ResearchPanel.jsx';
import FloatingInspector from './components/FloatingInspector.jsx';
import BookmarksPanel from './components/BookmarksPanel.jsx';
import ProjectNotesTabs from './components/ProjectNotesTabs.jsx';
import TimelineView from './components/TimelineView.jsx';
import RelationMap from './components/RelationMap.jsx';
import PacingView from './components/PacingView.jsx';
import NameGeneratorDialog from './components/NameGeneratorDialog.jsx';
import Scratchpad from './components/Scratchpad.jsx';
import SpeechBar from './components/SpeechBar.jsx';
import { SCRIPT_FORMAT_LIST } from './lib/scriptFormats.js';

const ZOOM_LEVELS = ['Maha', 'Macro', 'Mezzo', 'Micro', 'Nano'];
import { applySettingsCss } from './lib/settingsDefaults.js';
import { setLanguage, cmdLabel, groupLabel } from './lib/i18n.js';
import SettingsDialog from './components/SettingsDialog.jsx';
import FindDialog from './components/FindDialog.jsx';
import HistoryDialog from './components/HistoryDialog.jsx';
import BackupDialog from './components/BackupDialog.jsx';
import ImportDialog from './components/ImportDialog.jsx';
import Menu from './components/Menu.jsx';
import StatusBar from './components/StatusBar.jsx';
import {
  findNode,
  findParent,
  flatten,
  inOrder,
  insertNear,
  keyMove,
  duplicateNode,
  convertNode,
  sortChildren,
  siblingInOrder,
  moveNode,
  moveToTrash,
  emptyTrash,
  produce,
  updateNode,
  rootOf,
  restoreFromTrash,
  moveManyInto,
  moveTargets,
  ancestorIds,
  scriveningsList,
  appendHtml,
} from './lib/tree.js';
import { autoSynopsis, lookupUrl } from './lib/textTools.js';
import { PickNodeDialog, ImportSplitDialog, LayoutsDialog } from './components/BatchADialogs.jsx';
import { replaceInHtml } from './lib/search.js';
import { htmlToText, newNode, textToHtml, wordCount } from './lib/text.js';

const SAVE_DELAY = 700;
const HISTORY_DELAY = 5000;

// Per-machine UI state (open document, view, panel widths) kept in localStorage.
function loadUi(dir) {
  try {
    return JSON.parse(localStorage.getItem(`scribner-ui:${dir}`)) || {};
  } catch {
    return {};
  }
}
function saveUi(dir, ui) {
  try {
    localStorage.setItem(`scribner-ui:${dir}`, JSON.stringify(ui));
  } catch {
    /* storage unavailable: not critical */
  }
}

export default function App({ api }) {
  const [settings, setSettings] = useState(null);
  const settingsRef = useRef(null);
  settingsRef.current = settings;
  const openResultRef = useRef(null);
  if (settings) setLanguage(settings.language || 'ro');
  useEffect(() => {
    if (settings) applySettingsCss(settings);
  }, [settings]);
  const [dir, setDir] = useState(null);
  const [project, setProject] = useState(null);
  const [docs, setDocs] = useState({}); // id -> html cache (main text)
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [view, setView] = useState('editor');
  const [showInspector, setShowInspector] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [showEditorial, setShowEditorial] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [toast, setToast] = useState('');
  const [help, setHelp] = useState(null);
  const [showScratch, setShowScratch] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [revealId, setRevealId] = useState(null);
  const [showFloatInspector, setShowFloatInspector] = useState(false);
  const [floatNotes, setFloatNotes] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [aiProgress, setAiProgress] = useState(null);
  const [showSpeech, setShowSpeech] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [hideBinder, setHideBinder] = useState(false);
  const [quickRefs, setQuickRefs] = useState([]); // [{id, x, y}]
  const [searchSeed, setSearchSeed] = useState('');
  const [editorView, setEditorViewState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('scribner-editor-view')) || {};
    } catch {
      return {};
    }
  });
  const setEditorView = (v) => {
    setEditorViewState(v);
    try {
      localStorage.setItem('scribner-editor-view', JSON.stringify(v));
    } catch {
      /* not critical */
    }
  };
  const [splitId, setSplitId] = useState(null);
  const [hoistId, setHoistId] = useState(null); // binder focused on one folder
  const [scrivList, setScrivList] = useState(null); // {title, ids}: Scrivenings over an arbitrary list
  const [dialog, setDialog] = useState(null);
  const [composition, setComposition] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('salvat');
  const [sessionStart, setSessionStart] = useState(0);
  const [widths, setWidths] = useState({ binder: 260, side: 320 });
  const [nav, setNav] = useState({ stack: [], index: -1 });
  const editorRefs = useRef(new Map()); // id -> Editor handle (main, scrivenings, split)
  const activeId = useRef(null); // last focused document for AI / split
  const pending = useRef(new Map());
  const timer = useRef(null);
  const historyTimer = useRef(null);

  useEffect(() => {
    api
      .getSettings()
      .then(async (s) => {
        setSettings(s);
        const last = s?.reopenLastProject !== false && s?.recent?.[0]?.dir;
        if (last && openResultRef.current) {
          try {
            await openResultRef.current(await api.openProject(last));
          } catch {
            // The project moved or was deleted: stay on Home.
          }
        }
      })
      .catch((e) => setError(e.message));
  }, [api]);

  useEffect(() => {
    const theme = settings?.theme || 'system';
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.ui = settings?.uiStyle || 'classic';
    document.documentElement.style.setProperty('--editor-font-size', `${settings?.fontSize || 18}px`);
  }, [settings]);

  const report = useCallback((e) => setError(e?.message || String(e)), []);
  const prevTargetCounts = useRef({});
  useEffect(() => {
    if (!showFloatInspector || !selectedId || !dir) return;
    setFloatNotes(null);
    api.readDoc(dir, selectedId, 'notes').then((h) => setFloatNotes(h || '')).catch(report);
  }, [showFloatInspector, selectedId, dir]);
  useEffect(() => {
    if (!api.onAiProgress) return undefined;
    let timer;
    const off = api.onAiProgress((p) => {
      setAiProgress(`AI: ${p.done}/${p.total}${p.title ? ` · ${p.title}` : ''}`);
      clearTimeout(timer);
      timer = setTimeout(() => setAiProgress(null), 4000);
    });
    return () => { off(); clearTimeout(timer); };
  }, []);

  const counts = useMemo(() => {
    const map = {};
    for (const [id, html] of Object.entries(docs)) map[id] = wordCount(html);
    return map;
  }, [docs]);

  // Notification when a document reaches its target (Project Targets → notify documents).
  useEffect(() => {
    if (!project || project.targets?.notifyDocuments === false) return;
    for (const n of flatten(project.tree)) {
      if (!n.target || n.targetNotify === false) continue;
      const cur = n.targetType === 'Characters' ? htmlToText(docs[n.id] || '').length : counts[n.id] || 0;
      const prev = prevTargetCounts.current[n.id];
      if (prev != null && targetCrossed(prev, cur, n.target) && typeof Notification !== 'undefined') new Notification('Țintă atinsă', { body: `„${n.title}”: ${n.target}` });
      prevTargetCounts.current[n.id] = cur;
    }
  }, [counts]);

  const totals = useMemo(() => {
    if (!project) return { draft: 0, total: 0 };
    const trash = project.tree.find((n) => n.root === 'trash');
    const trashIds = new Set(flatten(trash.children).map((n) => n.id));
    let total = 0;
    for (const [id, c] of Object.entries(counts)) if (!trashIds.has(id)) total += c;
    return { draft: sumWords(project.tree[0], counts), total };
  }, [project, counts]);

  const totalsRef = useRef(totals);
  totalsRef.current = totals;
  const projectRef = useRef(project);
  projectRef.current = project;
  const docsRef = useRef(docs);
  docsRef.current = docs;

  const recordHistory = useCallback(() => {
    clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      if (!dir || !api.recordHistory) return;
      const pj = projectRef.current;
      const ds = docsRef.current;
      const chars = (ids) => ids.reduce((n, id) => n + htmlToText(ds[id] || '').length, 0);
      let extra = {};
      if (pj) {
        const trash = new Set(flatten(pj.tree.find((n) => n.root === 'trash').children).map((n) => n.id));
        extra = { draftChars: chars(flatten(pj.tree[0].children).map((n) => n.id)), totalChars: chars(Object.keys(ds).filter((id) => !trash.has(id))) };
      }
      api.recordHistory(dir, { ...totalsRef.current, ...extra }).catch(() => {});
    }, HISTORY_DELAY);
  }, [api, dir]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const items = [...pending.current.entries()];
    pending.current.clear();
    if (!items.length) return;
    try {
      for (const [k, html] of items) {
        const [id, kind] = k.split('|');
        await api.writeDoc(dir, id, kind, html);
      }
      setSaveState('salvat');
      recordHistory();
    } catch (e) {
      setSaveState('eroare la salvare');
      report(e);
    }
  }, [api, dir, report, recordHistory]);

  const queueWrite = useCallback(
    (id, kind, html) => {
      pending.current.set(`${id}|${kind}`, html);
      setSaveState('se salvează…');
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, Math.max(0.2, Number(settingsRef.current?.autosaveSec) || SAVE_DELAY / 1000) * 1000);
    },
    [flush],
  );

  useEffect(() => {
    const onUnload = () => flush();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [flush]);

  // Reload documents changed outside the app (AI agents via MCP, sync clients).
  // A document with unsaved typing keeps the local text; the agent's version is in its snapshots.
  useEffect(() => {
    if (!dir || !api.onProjectChanged) return undefined;
    api.watchProject(dir).catch(() => {});
    return api.onProjectChanged(async ({ dir: changedDir, files }) => {
      if (changedDir !== dir) return;
      try {
        if (files.some((f) => f === 'project.json')) {
          const res = await api.openProject(dir);
          setProject(res.project);
        }
        const ids = files.map((f) => /^docs\/([A-Za-z0-9-]+)\.html$/.exec(f)).filter(Boolean).map((m) => m[1]);
        const updated = {};
        for (const id of ids) {
          if (pending.current.has(`${id}|docs`)) continue;
          updated[id] = await api.readDoc(dir, id, 'docs');
        }
        if (Object.keys(updated).length) {
          setDocs((d) => ({ ...d, ...updated }));
          for (const [id, html] of Object.entries(updated)) editorRefs.current.get(id)?.setHtml(html);
          setSaveState('actualizat din exterior');
        }
      } catch (e) {
        report(e);
      }
    });
  }, [api, dir, report]);

  // "Notify when target is reached" (Project Targets): once per session and per target.
  const notified = useRef({});
  useEffect(() => {
    if (!project || project.targets?.notify === false) return;
    const t = project.targets || {};
    const checks = [
      ['session', t.session, Math.max(0, totals.draft - sessionStart), 'Ai atins ținta sesiunii'],
      ['draft', t.draft, totals.draft, 'Ai atins ținta cărții'],
    ];
    for (const [key, target, value, msg] of checks) {
      if (target > 0 && value >= target && !notified.current[key]) {
        notified.current[key] = true;
        setToast(`${msg}: ${value.toLocaleString('ro-RO')} cuvinte.`);
      }
    }
  }, [project, totals.draft, sessionStart]);

  // Remember UI state per project.
  useEffect(() => {
    if (dir) saveUi(dir, { selectedId, view, widths, showInspector, splitId });
  }, [dir, selectedId, view, widths, showInspector, splitId]);

  const saveProject = useCallback(
    (next) => {
      setProject(next);
      api.saveProject(dir, next).catch(report);
    },
    [api, dir, report],
  );

  const setTree = useCallback((tree) => saveProject({ ...project, tree }), [project, saveProject]);

  const openResult = useCallback(
    async (res) => {
      if (!res) return;
      if (res.stats) {
        setImportStats({ ...res.stats, source: res.project.importReport?.source });
        setDialog('importReport');
      }
      const all = flatten(res.project.tree).filter((n) => !n.root);
      const entries = await Promise.all(all.map(async (n) => [n.id, await api.readDoc(res.dir, n.id, 'docs')]));
      const cache = Object.fromEntries(entries);
      const ui = loadUi(res.dir);
      setDocs(cache);
      setDir(res.dir);
      setProject(res.project);
      const firstText = flatten(res.project.tree[0].children).find((n) => n.type === 'text');
      const start = ui.selectedId && findNode(res.project.tree, ui.selectedId) ? ui.selectedId : firstText ? firstText.id : res.project.tree[0].id;
      setSelectedId(start);
      setSelectedIds(new Set([start]));
      setNav({ stack: [start], index: 0 });
      setView(ui.view || settingsRef.current?.defaultView || 'editor');
      if (ui.widths) setWidths(ui.widths);
      if (ui.showInspector !== undefined) setShowInspector(ui.showInspector);
      setSplitId(ui.splitId && findNode(res.project.tree, ui.splitId) ? ui.splitId : null);
      const openCounts = Object.fromEntries(entries.map(([id, h]) => [id, wordCount(h)]));
      const draftAtOpen = sumWords(res.project.tree[0], openCounts);
      setSessionStart(draftAtOpen);
      const sOpen = settingsRef.current?.sharingSync || {};
      if (res.project.syncFolder && (res.project.syncAuto || sOpen.syncOnOpen) && api.syncAuto) {
        api.syncAuto(res.dir, { ...res.project, syncAuto: true, syncFormat: res.project.syncFormat || sOpen.format || 'rtf' }, 'open').then((r) => r?.action === 'in' && setToast(`Sincronizare automată: ${r.updated.length} actualizate, ${r.created.length} noi. Folosește „citește modificările” pentru documentele noi.`)).catch(() => {});
      }
      // Anchor today's history at the counts on open, so the first save of the day is measured from here.
      const trashIds = new Set(flatten(res.project.tree.find((n) => n.root === 'trash').children).map((n) => n.id));
      const totalAtOpen = Object.entries(openCounts).reduce((s, [id, c]) => s + (trashIds.has(id) ? 0 : c), 0);
      api.recordHistory?.(res.dir, { draft: draftAtOpen, total: totalAtOpen }).catch(() => {});
      setSettings(await api.getSettings());
    },
    [api],
  );
  openResultRef.current = openResult;

  const closeProject = async () => {
    await flush();
    if (project?.syncFolder && (project.syncAuto || settings?.sharingSync?.syncOnClose)) await api.syncAuto?.(dir, { ...withSyncDefaults(project), syncAuto: true }, 'close').catch(() => {});
    api.releaseProject?.().catch(() => {});
    setProject(null);
    setDir(null);
    setDocs({});
    setSelectedId(null);
    setSplitId(null);
  };

  const selected = project && selectedId ? findNode(project.tree, selectedId) : null;

  const go = async (id, { push = true } = {}) => {
    await flush();
    setScrivList(null);
    setSelectedId(id);
    setSelectedIds(new Set([id]));
    if (push) {
      setNav((n) => {
        if (n.stack[n.index] === id) return n;
        const stack = [...n.stack.slice(0, n.index + 1), id].slice(-100);
        return { stack, index: stack.length - 1 };
      });
    }
  };

  const back = () => {
    if (nav.index <= 0) return;
    const id = nav.stack[nav.index - 1];
    setNav((n) => ({ ...n, index: n.index - 1 }));
    if (findNode(project.tree, id)) go(id, { push: false });
  };
  const forward = () => {
    if (nav.index >= nav.stack.length - 1) return;
    const id = nav.stack[nav.index + 1];
    setNav((n) => ({ ...n, index: n.index + 1 }));
    if (findNode(project.tree, id)) go(id, { push: false });
  };

  const onBinderSelect = (id, { ctrl, shift, alt }) => {
    if (alt) {
      const node = findNode(project.tree, id);
      if (node && !node.root) setSplitId(id);
      return;
    }
    if (ctrl) {
      setSelectedIds((s) => {
        const next = new Set(s);
        if (next.has(id) && next.size > 1) next.delete(id);
        else next.add(id);
        return next;
      });
      setSelectedId(id);
      return;
    }
    if (shift && selectedId) {
      const order = flatten(project.tree).map((n) => n.id);
      const [a, b] = [order.indexOf(selectedId), order.indexOf(id)].sort((x, y) => x - y);
      setSelectedIds(new Set(order.slice(a, b + 1)));
      return;
    }
    go(id);
  };

  const writeDocNow = (id, html) => {
    setDocs((d) => ({ ...d, [id]: html }));
    queueWrite(id, 'docs', html);
  };
  // Same document open in both panes: an edit in one is pushed into the other editor.
  const writeSynced = (id, html, from) => {
    writeDocNow(id, html);
    if (id !== splitId) return;
    const other = from === 'split' ? editorRefs.current.get(id) : editorRefs.current.get(`split:${id}`);
    if (other && other.getHtml() !== html) other.setHtml(html);
  };

  const addItem = (type, title, html) => {
    const node = newNode(type, title);
    setTree(insertNear(project.tree, selectedId, node));
    const content = html ?? (type === 'text' ? '<p></p>' : '');
    setDocs((d) => ({ ...d, [node.id]: content }));
    if (content) api.writeDoc(dir, node.id, 'docs', content).catch(report);
    go(node.id);
    if (view !== 'corkboard') setView('editor');
    return node;
  };

  const patchNode = (id, patch) => setTree(updateNode(project.tree, id, patch));

  const trashSelection = () => {
    let tree = project.tree;
    for (const id of selectedIds.size ? selectedIds : [selectedId]) {
      const n = findNode(tree, id);
      if (n && !n.root) tree = moveToTrash(tree, id);
    }
    setTree(tree);
  };

  // --- Batch A: binder and document commands ---
  const selectionList = () => (selectedIds.size ? [...selectedIds] : selectedId ? [selectedId] : []).filter((id) => {
    const n = findNode(project.tree, id);
    return n && !n.root;
  });
  const restoreSelection = () => {
    let tree = project.tree;
    for (const id of selectionList()) tree = restoreFromTrash(tree, id);
    if (tree !== project.tree) setTree(tree);
    else setToast('Selecția nu e în coș.');
  };
  const moveSelectionTo = (targetId) => setTree(moveManyInto(project.tree, selectionList(), targetId));
  const toggleSeparator = () => {
    let tree = project.tree;
    for (const id of selectionList()) tree = updateNode(tree, id, { separator: !findNode(tree, id).separator });
    setTree(tree);
  };
  const revealInBinder = () => {
    if (!selectedId) return;
    setHideBinder(false);
    setActiveCollectionId(null);
    if (hoistId && hoistId !== selectedId && !ancestorIds(project.tree, selectedId).includes(hoistId)) setHoistId(null);
    setRevealId(null);
    setTimeout(() => setRevealId(selectedId), 0);
  };
  const hoistSelection = () => {
    const n = selected && (selected.children ? selected : findParent(project.tree, selected.id));
    if (n) setHoistId(n.id);
  };
  const toggleFullScreen = () => (api.toggleFullScreen ? api.toggleFullScreen().catch(report) : document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  const openMediaExternal = () => {
    const file = selected?.media?.file;
    if (file && api.openMediaExternal) api.openMediaExternal(dir, file).catch(report);
  };
  const selectionHtml = () => {
    const ed = (editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId))?.editor;
    if (!ed || ed.state.selection.empty) return '';
    return getHTMLFromFragment(ed.state.selection.content().content, ed.schema);
  };
  const appendSelectionTo = async (targetId) => {
    const html = selectionHtml();
    if (!html) return setToast('Selectează mai întâi un text.');
    await flush();
    const current = docs[targetId] ?? (await api.readDoc(dir, targetId, 'docs'));
    const next = appendHtml(current, html);
    writeDocNow(targetId, next);
    editorRefs.current.get(targetId)?.setHtml(next);
    editorRefs.current.get(`split:${targetId}`)?.setHtml(next);
    setToast(`Selecția a fost adăugată la „${findNode(project.tree, targetId)?.title}”.`);
  };
  const openScrivenings = (title, ids) => {
    if (!ids.length) return setToast('Nimic de afișat în Scrivenings.');
    loadAllDocs()
      .then(() => {
        setScrivList({ title, ids });
        setView('editor');
      })
      .catch(report);
  };
  const lookupWord = (kind) => {
    const h = editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId);
    const word = (h?.getSelectionText() || '').trim().split(/\s+/).slice(0, 6).join(' ');
    if (!word) return setToast('Selectează un cuvânt.');
    window.open(lookupUrl(kind, word), '_blank');
  };
  const autoSynopsisSelection = async () => {
    let tree = project.tree;
    let n = 0;
    for (const id of selectionList()) {
      const node = findNode(tree, id);
      if (node.type !== 'text') continue;
      const html = docs[id] ?? (await api.readDoc(dir, id, 'docs'));
      const syn = autoSynopsis(htmlToText(html || ''));
      if (syn) {
        tree = updateNode(tree, id, { synopsis: syn });
        n += 1;
      }
    }
    setTree(tree);
    setToast(`Sinopsis generat pentru ${n} documente.`);
  };
  const snapshotSelection = async () => {
    await flush();
    const stamp = `Snapshot ${new Date().toLocaleString('ro-RO')}`;
    const ids = selectionList().filter((id) => findNode(project.tree, id).type === 'text');
    for (const id of ids) await api.takeSnapshot(dir, id, stamp);
    setToast(`Snapshot salvat pentru ${ids.length} documente.`);
  };
  const swapPanes = () => {
    if (!splitId || !selectedId) return;
    const a = selectedId;
    go(splitId);
    setSplitId(a);
  };
  const saveLayouts = async (layouts) => {
    await api.setSettings({ layouts });
    setSettings(await api.getSettings());
  };
  const toggleView = (key) => setEditorView({ ...editorView, [key]: !editorView[key] });

  // --- Split at cursor (Ctrl+K) and Merge (Ctrl+Shift+M) ---
  // Layouts (Window > Layouts): named combinations of views and panels.
  const saveLayout = async () => {
    const name = window.prompt('Numele layout-ului:', `Layout ${(settings.layouts || []).length + 1}`);
    if (!name) return;
    const layout = { name, view, showInspector, showAi, showEditorial, hideBinder, widths, editorView, split: Boolean(splitId) };
    const layouts = [...(settings.layouts || []).filter((l) => l.name !== name), layout];
    await api.setSettings({ layouts });
    setSettings(await api.getSettings());
    setToast(`Layout „${name}” salvat.`);
  };
  const applyLayout = (l) => {
    setView(l.view || 'editor');
    setShowInspector(l.showInspector !== false);
    setShowAi(Boolean(l.showAi));
    setShowEditorial(Boolean(l.showEditorial));
    setHideBinder(Boolean(l.hideBinder));
    if (l.widths) setWidths(l.widths);
    if (l.editorView) setEditorView(l.editorView);
    if (!l.split) setSplitId(null);
  };

  // Quick Reference: floating panels with another document (Scrivener: Open in Quick Reference).
  const openQuickRef = (id) =>
    setQuickRefs((q) => (q.some((x) => x.id === id) ? q : [...q, { id, x: 120 + q.length * 30, y: 90 + q.length * 30 }]));

  const goSibling = (dir) => {
    const id = selectedId && siblingInOrder(project.tree, selectedId, dir);
    if (id) go(id);
  };

  // New document from a Template Sheet: copies its text, notes, synopsis, label and keywords.
  const newFromTemplate = async (tpl) => {
    await flush();
    const node = newNode(tpl.type === 'folder' ? 'folder' : 'text', tpl.title);
    Object.assign(node, {
      synopsis: tpl.synopsis || '',
      label: tpl.label || 'Fără',
      keywords: [...(tpl.keywords || [])],
      custom: tpl.custom ? { ...tpl.custom } : undefined,
      includeInCompile: true,
    });
    setTree(insertNear(project.tree, selectedId, node));
    const html = docs[tpl.id] ?? (await api.readDoc(dir, tpl.id, 'docs'));
    const notes = await api.readDoc(dir, tpl.id, 'notes');
    if (html) await api.writeDoc(dir, node.id, 'docs', html);
    if (notes) await api.writeDoc(dir, node.id, 'notes', notes);
    setDocs((d) => ({ ...d, [node.id]: html || '' }));
    go(node.id);
    setView('editor');
  };

  // Images, PDFs, audio and video added to the Research folder.
  const addMediaToResearch = async () => {
    try {
      const items = await api.addMediaFiles(dir);
      if (!items || !items.length) return;
      const research = project.tree.find((n) => n.root === 'research');
      let tree = project.tree;
      for (const it of items) {
        const node = { ...newNode('text', it.title), id: it.id, type: 'file', media: it.media, includeInCompile: false };
        if (/^image\//.test(it.media.mime)) node.synopsisImage = it.media.file;
        tree = insertNear(tree, research.id, node);
      }
      setTree(tree);
      go(items[0].id);
      setView('editor');
    } catch (e) {
      report(e);
    }
  };

  // Alt-drag in the binder: copies the items (with children, text and notes) next to the target.
  const copyItems = async (ids, targetId, pos) => {
    await flush();
    let tree = project.tree;
    const copies = {};
    for (const id of ids) {
      const res = duplicateNode(tree, id, { withChildren: true });
      if (!res.id) continue;
      tree = moveNode(res.tree, res.id, targetId, pos);
      for (const [from, to] of res.pairs) {
        const html = docs[from] ?? (await api.readDoc(dir, from, 'docs'));
        const notes = await api.readDoc(dir, from, 'notes');
        if (html) {
          copies[to] = html;
          await api.writeDoc(dir, to, 'docs', html);
        }
        if (notes) await api.writeDoc(dir, to, 'notes', notes);
      }
    }
    saveProject({ ...project, tree });
    setDocs((d) => ({ ...d, ...copies }));
  };

  // Duplicates the selected item (with its notes, synopsis and, optionally, children).
  const duplicateSelection = async (withChildren) => {
    const node = selectedId && findNode(project.tree, selectedId);
    if (!node || node.root) return;
    await flush();
    const { tree, pairs, id } = duplicateNode(project.tree, node.id, { withChildren });
    if (!id) return;
    saveProject({ ...project, tree });
    const copies = {};
    for (const [from, to] of pairs) {
      const html = docs[from] ?? (await api.readDoc(dir, from, 'docs'));
      const notes = await api.readDoc(dir, from, 'notes');
      if (html) {
        copies[to] = html;
        await api.writeDoc(dir, to, 'docs', html);
      }
      if (notes) await api.writeDoc(dir, to, 'notes', notes);
    }
    setDocs((d) => ({ ...d, ...copies }));
    go(id);
  };

  const splitDocument = async (useSelectionAsTitle = false) => {
    const id = activeId.current || selectedId;
    const node = findNode(project.tree, id);
    const handle = editorRefs.current.get(id);
    if (!node || node.type !== 'text' || !handle) return;
    const parts = handle.splitAtCursor(useSelectionAsTitle);
    if (!parts) return;
    await flush();
    await api.takeSnapshot(dir, id, 'Automat înainte de împărțire').catch(report);
    const second = newNode('text', parts.title || `${node.title} (continuare)`);
    second.label = node.label;
    second.status = node.status;
    const tree = produce(project.tree, (t) => {
      const parent = findParent(t, id);
      const list = parent ? parent.children : t;
      list.splice(list.findIndex((n) => n.id === id) + 1, 0, second);
    });
    saveProject({ ...project, tree });
    handle.setHtml(parts.before);
    writeDocNow(id, parts.before);
    setDocs((d) => ({ ...d, [second.id]: parts.after }));
    await api.writeDoc(dir, second.id, 'docs', parts.after).catch(report);
    go(second.id);
  };

  const mergeSelection = async () => {
    const nodes = inOrder(project.tree, [...selectedIds]).filter((n) => n.type === 'text' && !n.root);
    if (nodes.length < 2) {
      report(new Error('Selectează cel puțin două documente (Ctrl+clic în binder) pentru Merge.'));
      return;
    }
    if (!window.confirm(`Unești ${nodes.length} documente în „${nodes[0].title}”? Celelalte se mută în coș.`)) return;
    await flush();
    const [first, ...rest] = nodes;
    await api.takeSnapshot(dir, first.id, 'Automat înainte de unire').catch(report);
    const html = nodes.map((n) => docs[n.id] || '').join('<p>* * *</p>');
    const notes = await Promise.all(nodes.map((n) => api.readDoc(dir, n.id, 'notes')));
    const synopsis = nodes.map((n) => n.synopsis).filter(Boolean).join('\n');
    let tree = updateNode(project.tree, first.id, { synopsis });
    for (const n of rest) tree = moveToTrash(tree, n.id);
    saveProject({ ...project, tree });
    writeDocNow(first.id, html);
    const mergedNotes = notes.filter((h) => htmlToText(h).trim()).join('<hr>');
    if (mergedNotes) queueWrite(first.id, 'notes', mergedNotes);
    editorRefs.current.get(first.id)?.setHtml(html);
    go(first.id);
  };

  // Advanced search replace: text, notes, titles and synopses, with a snapshot of every changed document.
  const replaceAdvanced = async (criteria, replacement) => {
    await flush();
    const fields = (criteria.fields && criteria.fields.length ? criteria.fields : ['title', 'text', 'notes', 'synopsis']).filter((f) => ['title', 'text', 'notes', 'synopsis'].includes(f));
    const notesById = {};
    if (fields.includes('notes')) for (const n of flatten(project.tree)) if (!n.root) notesById[n.id] = await api.readDoc(dir, n.id, 'notes');
    const terms = buildTerms(criteria);
    if (!terms || !terms.length) return 0;
    const results = searchProject(project, docs, notesById, criteria);
    let tree = project.tree;
    const nextDocs = {};
    let total = 0;
    for (const { node } of results) {
      let docHtml = docs[node.id] || '';
      let notesHtml = notesById[node.id] || '';
      let current = node;
      let count = 0;
      for (const re of terms) {
        const r = replaceInFields(current, docHtml, notesHtml, re, replacement, fields);
        current = r.node;
        docHtml = r.docHtml;
        notesHtml = r.notesHtml;
        count += r.count;
      }
      if (!count) continue;
      await api.takeSnapshot(dir, node.id, 'Automat înainte de înlocuire').catch(report);
      if (docHtml !== (docs[node.id] || '')) {
        await api.writeDoc(dir, node.id, 'docs', docHtml);
        nextDocs[node.id] = docHtml;
      }
      if (fields.includes('notes') && notesHtml !== (notesById[node.id] || '')) await api.writeDoc(dir, node.id, 'notes', notesHtml);
      tree = updateNode(tree, node.id, { title: current.title, synopsis: current.synopsis });
      total += count;
    }
    saveProject({ ...project, tree });
    setDocs((d) => ({ ...d, ...nextDocs }));
    for (const [id, html] of Object.entries(nextDocs)) editorRefs.current.get(id)?.setHtml(html);
    recordHistory();
    return total;
  };

  const replaceAllInProject = async (ids, re, replacement) => {
    await flush();
    let total = 0;
    const next = {};
    for (const id of ids) {
      const { html, count } = replaceInHtml(docs[id] || '', re, replacement);
      if (!count) continue;
      await api.takeSnapshot(dir, id, 'Automat înainte de înlocuire').catch(report);
      await api.writeDoc(dir, id, 'docs', html);
      next[id] = html;
      total += count;
    }
    setDocs((d) => ({ ...d, ...next }));
    for (const [id, html] of Object.entries(next)) editorRefs.current.get(id)?.setHtml(html);
    recordHistory();
    return total;
  };

  const importParts = (parts) => {
    let tree = project.tree;
    let anchor = selectedId;
    const created = [];
    for (const p of parts) {
      const node = newNode('text', p.title);
      tree = insertNear(tree, anchor, node);
      if (findNode(tree, anchor)?.children === undefined) anchor = node.id;
      created.push([node.id, p.html || '<p></p>']);
    }
    saveProject({ ...project, tree });
    setDocs((d) => ({ ...d, ...Object.fromEntries(created) }));
    Promise.all(created.map(([id, html]) => api.writeDoc(dir, id, 'docs', html))).catch(report);
    if (created.length) go(created[0][0]);
  };

  // OPML outline → binder items with synopsis, label and status names.
  const importOpmlOutline = async () => {
    const items = await api.importOpml();
    if (!items || !items.length) return;
    const byName = (list, name) => (name ? (list || []).find((x) => x.name === name)?.id : undefined);
    const build = (it) => {
      const kids = (it.children || []).map(build);
      const node = newNode(kids.length ? 'folder' : 'text', it.title || 'Fără titlu');
      if (it.synopsis) node.synopsis = it.synopsis;
      const lab = byName(project.labels, it.label);
      const st = byName(project.statuses, it.status);
      if (lab) node.label = lab;
      if (st) node.status = st;
      if (kids.length) node.children = kids;
      return node;
    };
    let tree = project.tree;
    let anchor = selectedId;
    for (const it of items) {
      const node = build(it);
      tree = insertNear(tree, anchor, node);
      anchor = node.id;
    }
    saveProject({ ...project, tree });
    setToast(`Import OPML: ${items.length} elemente de nivel superior.`);
  };
  const importWeb = async () => {
    const url = window.prompt('Adresa paginii web (http/https):', 'https://');
    if (!url || url === 'https://') return;
    const page = await api.importWebPage(url, dir);
    // The page and its images (saved offline in media/) go in with a single project save.
    const node = newNode('text', page.title || url);
    let tree = insertNear(project.tree, selectedId, node);
    for (const m of page.media || []) tree = insertNear(tree, node.id, { ...newNode('media', m.title), id: m.id, media: m.media });
    saveProject({ ...project, tree });
    setDocs((d) => ({ ...d, [node.id]: page.html }));
    await api.writeDoc(dir, node.id, 'docs', page.html);
    go(node.id);
  };
  const importFilesCmd = async (mode = 'none', separator = '#') => {
    const res = await api.importFiles(dir, mode, separator);
    if (!res) return;
    if (res.texts.length) importParts(res.texts);
    if (res.media.length) {
      let tree = project.tree;
      for (const m of res.media) {
        const node = { ...newNode('media', m.title), id: m.id, media: m.media };
        tree = insertNear(tree, selectedId, node);
      }
      saveProject({ ...project, tree });
    }
  };
  const saveAs = async () => {
    const title = window.prompt('Titlul copiei:', `${project.title} (copie)`);
    if (!title) return;
    await flush();
    const copy = await api.saveProjectAs(dir, title);
    if (copy) await openResult(copy);
  };
  const printCurrent = () => {
    const html = docs[selectedId];
    if (html == null) return;
    api.printDocument(`<h1>${(selected?.title || '').replace(/</g, '&lt;')}</h1>${html}`, selected?.title).catch(report);
  };

  const words = useMemo(() => (project ? projectWords(project, docs) : []), [project, docs]);
  const projectStyles = stylesOf(project);

  const allKeywords = useMemo(() => {
    const set = new Set();
    if (project) for (const n of flatten(project.tree)) (n.keywords || []).forEach((k) => set.add(k));
    return [...set].sort((a, b) => a.localeCompare(b, 'ro'));
  }, [project]);

  const contextForAi = () => {
    const research = project.tree.find((n) => n.root === 'research');
    const parts = [];
    for (const n of flatten(research.children)) {
      if (n.type !== 'text') continue;
      const text = htmlToText(docs[n.id]);
      if (text.trim()) parts.push(`## ${n.title}\n${text.slice(0, 4000)}`);
    }
    return parts.join('\n\n').slice(0, 60000);
  };

  // --- keyboard shortcuts: driven by the command registry (configurable in Settings) ---
  const commandsRef = useRef({});
  useEffect(() => {
    const onKey = (e) => {
      if (!project) return;
      if (e.key === 'Escape' && composition) {
        setComposition(false);
        return;
      }
      const combo = keyFromEvent(e);
      if (!combo) return;
      for (const [id, cmd] of Object.entries(commandsRef.current)) {
        if (cmd.key && cmd.key === combo && !cmd.disabled) {
          e.preventDefault();
          cmd.run();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  // Native application menu: send the menu built from the registry whenever it changes.
  const lastMenu = useRef('');
  useEffect(() => {
    if (!api.setAppMenu || !project) return;
    const titles = { file: 'Fișier', edit: 'Editare', view: 'Vizualizare', nav: 'Navigare', project: 'Proiect', document: 'Document', format: 'Format', tools: 'Unelte', window: 'Fereastră', help: 'Ajutor' };
    const spec = Object.entries(titles).map(([g, label]) => ({
      label: groupLabel(g) || label,
      items: Object.values(commandsRef.current)
        .filter((c) => c.group === g)
        .map((c) => ({ id: c.id, label: c.label, key: c.key, disabled: c.disabled })),
    }));
    const json = JSON.stringify(spec);
    if (json === lastMenu.current) return;
    lastMenu.current = json;
    api.setAppMenu(spec).catch(() => {});
  });
  // Native application menu: commands come back by id.
  useEffect(() => {
    if (!api.onMenuCommand) return undefined;
    return api.onMenuCommand((id) => commandsRef.current[id]?.run());
  }, [api]);

  // --- resizable panels ---
  const startResize = (which) => (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = widths[which];
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const w = which === 'binder' ? start + dx : start - dx;
      setWidths((ws) => ({ ...ws, [which]: Math.max(180, Math.min(600, w)) }));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!settings) return <div className="loading">Se încarcă…</div>;

  if (!project) {
    return (
      <>
        <Home
          api={api}
          settings={settings}
          onOpen={(res) => openResult(res).catch(report)}
          onError={report}
          onSettings={() => setDialog('settings')}
          onHelp={() => setHelp({ topic: null, tab: 'manual' })}
          onTutorial={api.newProject ? () => api.newProject('Tutorial Scribner', 'tutorial').then(openResult).catch(report) : undefined}
        />
        {help && (
          <HelpWindow
            initialTopic={help.topic}
            initialTab={help.tab}
            settings={settings}
            onClose={() => setHelp(null)}
            onStartTutorial={() => {
              setHelp(null);
              api.newProject('Tutorial Scribner', 'tutorial').then(openResult).catch(report);
            }}
          />
        )}
        {dialog === 'settings' && (
          <SettingsDialog
            onShortcuts={project ? () => setDialog('shortcuts') : undefined}
            api={api}
            settings={settings}
            project={null}
            onClose={async () => {
              setDialog(null);
              setSettings(await api.getSettings());
            }}
            onError={report}
          />
        )}
        {error && <ErrorToast message={error} onClose={() => setError('')} />}
      </>
    );
  }

  const trashRoot = project.tree.find((n) => n.root === 'trash');
  const inTrash = (id) => rootOf(project.tree, id)?.id === trashRoot.id;
  const scrivListNodes = scrivList && view === 'editor' ? scriveningsList(project.tree, scrivList.ids) : null;
  const isFolderView = Boolean(scrivListNodes) || (selected && selected.children && view === 'editor');
  // A text container shows its own text first, then its sub-documents (Scrivener file group).
  const scrivSections = scrivListNodes || (isFolderView ? [...(selected.type === 'text' ? [selected] : []), ...flatten(selected.children).filter((n) => n.type === 'text')] : []);
  // Binder shows the hoisted folder only; separators are displayed as a rule.
  const hoistNode = hoistId ? findNode(project.tree, hoistId) : null;
  const binderProject = binderProjectOf(project, hoistNode);
  const editorAreaClass = `editor-area ${editorView.hideFormatBar ? 'hide-formatbar' : ''} ${editorView.hideComments ? 'hide-comments' : ''} ${editorView.hideRevisions ? 'hide-revisions' : ''}`;
  const activeCollection = activeCollectionId ? (project.collections || []).find((c) => c.id === activeCollectionId) : null;
  const collectionIds = activeCollection ? collectionNodes(project, activeCollection, docs).map((n) => n.id) : null;
  const mainIds = new Set(isFolderView ? scrivSections.map((n) => n.id) : selected ? [selected.id] : []);
  const splitNode = splitId ? findNode(project.tree, splitId) : null;
  const registerRef = (id, r) => {
    if (r) editorRefs.current.set(id, r);
    else editorRefs.current.delete(id);
  };
  const smartQuotes = settings.smartQuotes !== false;
  const corrections = {
    smartDashes: settings.smartDashes !== false,
    smartEllipsis: settings.smartEllipsis !== false,
    smartFractions: Boolean(settings.smartFractions),
    autoCapitalize: Boolean(settings.autoCapitalize),
    replacements: settings.autoReplacements || [],
  };
  const corrKey = JSON.stringify(corrections);
  // AI is optional: with it off, every feature that needs Claude is hidden and nothing else changes.
  const aiEnabled = settings.aiEnabled !== false;
  // Loads every text document of the project into memory (views and AI jobs over the whole book).
  const loadAllDocs = async () => {
    const out = { ...docs };
    for (const n of flatten(project.tree)) {
      if (n.type === 'text' && out[n.id] === undefined) out[n.id] = await api.readDoc(dir, n.id, 'docs');
    }
    setDocs(out);
    return out;
  };
  const showWholeBook = (v) => loadAllDocs().then(() => setView(v)).catch(report);
  const manuscriptDocs = async () => {
    const all = await loadAllDocs();
    const draft = project.tree[0];
    const list = [];
    const walk = (nodes, chapter) => {
      for (const n of nodes || []) {
        if (n.type === 'text' && n.includeInCompile !== false) list.push({ id: n.id, title: n.title, text: htmlToText(all[n.id] || ''), synopsis: n.synopsis || '', chapter });
        walk(n.children, n.type === 'folder' ? n.title : chapter);
      }
    };
    walk(draft ? draft.children : [], draft?.title || '');
    return list;
  };
  const runBulkSynopsis = async () => {
    const list = (await manuscriptDocs()).filter((d) => !d.synopsis);
    if (!list.length) return setToast('Toate documentele au deja sinopsis.');
    const res = await api.aiBulkSynopsis(dir, list);
    let tree = project.tree;
    for (const [id, syn] of Object.entries(res.results)) tree = updateNode(tree, id, { synopsis: String(syn).trim() });
    saveProject({ ...project, tree });
    setToast(`Sinopsis scris pentru ${Object.keys(res.results).length} documente${Object.keys(res.errors).length ? `, ${Object.keys(res.errors).length} erori` : ''}.`);
  };
  const runConsistency = async () => {
    const res = await api.aiConsistency(dir, await manuscriptDocs(), project.livingSheets || null, '');
    saveProject({ ...project, livingSheets: res.sheets });
    setAiReport({ title: 'Consistență pe toată cartea', findings: res.findings });
  };
  const runZoomReview = async (levels) => {
    const res = await api.aiZoomReview(dir, await manuscriptDocs(), levels, '');
    setAiReport({ title: 'Revizie pe niveluri de zoom', findings: res.findings });
  };
  const exportScrivCmd = async () => {
    await flush();
    const r = await api.exportScriv(dir, project);
    if (r) setToast(`Exportat ca proiect Scrivener: ${r.dir}`);
  };
  // Project sync settings, falling back to Options → Sharing.
  const withSyncDefaults = (pj) => {
    const d = settings?.sharingSync || {};
    return {
      ...pj,
      syncFormat: pj.syncFormat || d.format || 'rtf',
      syncNotesFormat: pj.syncNotesFormat || (d.notesFormat && d.notesFormat !== 'same' ? d.notesFormat : undefined),
      syncIncludeNotes: pj.syncIncludeNotes ?? d.includeNotes !== false,
    };
  };
  const syncOutCmd = async () => {
    await flush();
    const sp = withSyncDefaults(project);
    const r = await api.syncOut(dir, sp, project.syncFolder, { format: sp.syncFormat, notesFormat: sp.syncNotesFormat, includeNotes: sp.syncIncludeNotes });
    if (r) saveProject({ ...project, syncFolder: r.folder });
  };
  const syncInCmd = async () => {
    await flush();
    const r = await api.syncIn(dir, project, project.syncFolder);
    if (!r) return;
    let tree = project.tree;
    const notesRoot = tree.find((n) => n.root === 'research') || tree[1];
    for (const c of r.created) {
      const node = { ...newNode('text', c.title), id: c.id };
      const parent = c.folder === 'draft' ? tree[0] : notesRoot;
      tree = updateNode(tree, parent.id, { children: [...(findNode(tree, parent.id).children || []), node] });
    }
    saveProject({ ...project, tree });
    const reload = {};
    for (const id of [...r.updated, ...r.created.map((c) => c.id)].map((x) => (typeof x === 'string' ? x : x.id))) reload[id] = await api.readDoc(dir, id, 'docs');
    setDocs((d) => ({ ...d, ...reload }));
    setToast(`Sincronizare: ${r.updated.length} actualizate, ${r.conflicts.length} conflicte (cu snapshot), ${r.created.length} noi.`);
  };
  // Glossaries and print TOC as documents in Research (replaced when generated again).
  const generateGlossaries = async () => {
    await flush();
    const book = await collectBookDocs(project, (id) => docs[id] ?? api.readDoc(dir, id, 'docs'));
    const names = profileFor(project, settings).names;
    const alogen = buildAlogenGlossary(book, { title: names.foreign });
    const reading = buildReadingGlossary(book, { title: names.reading, exclude: alogen.terms.map((t) => t.term) });
    const toc = buildPrintToc(project, { docs: book, includeHeadings: true, title: names.toc });
    let tree = project.tree;
    const research = tree.find((n) => n.root === 'research');
    const written = {};
    for (const g of [alogen, reading, toc]) {
      const existing = flatten(research.children || []).find((n) => n.title === g.title && n.type === 'text');
      const id = existing ? existing.id : null;
      if (existing) {
        await api.takeSnapshot(dir, id, 'Înainte de regenerare');
        written[id] = g.html;
      } else {
        const node = newNode('text', g.title);
        tree = updateNode(tree, research.id, { children: [...(findNode(tree, research.id).children || []), node] });
        written[node.id] = g.html;
      }
    }
    saveProject({ ...project, tree });
    for (const [id, html] of Object.entries(written)) await api.writeDoc(dir, id, 'docs', html);
    setDocs((d) => ({ ...d, ...written }));
    setToast(`Glosare generate în Cercetare: ${alogen.terms.length} termeni alogeni, ${reading.terms?.length ?? 0} termeni de lectură, cuprins cu ${toc.entries.length} intrări.`);
  };
  const helpContext = () => (composition ? 'composition' : view === 'editor' && selected?.children ? 'scrivenings' : dialog || view);
  const startTutorial = () => {
    setHelp(null);
    flush()
      .then(() => api.newProject('Tutorial Scribner', 'tutorial'))
      .then(openResult)
      .catch(report);
  };
  const scriptFormat = settings?.scriptFormat || null;
  const setScriptFormat = async (f) => {
    await api.setSettings({ scriptFormat: f });
    setSettings(await api.getSettings());
  };
  const speechText = () => {
    const h = activeHandle();
    return h?.getSelectionText() || h?.getText?.() || '';
  };
  const exportScript = async (fmt) => {
    const h = activeHandle();
    if (!h || !api.exportScript) return;
    await api.exportScript(fmt, h.getHtml(), selected?.title || 'Scenariu');
  };
  const activeHandle = () => editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId);
  const aiNode = (activeId.current && findNode(project.tree, activeId.current)) || selected;
  const editorialNode = aiNode && aiNode.type === 'text' ? aiNode : scrivSections[0] || null;
  // Look of the selection in the active editor, for "Redefine style from selection".
  const currentLook = () => {
    const ed = activeHandle()?.editor;
    if (!ed) return null;
    const align = ['center', 'right', 'justify'].find((a) => ed.isActive({ textAlign: a })) || '';
    return { bold: ed.isActive('bold'), italic: ed.isActive('italic'), underline: ed.isActive('underline'), align };
  };
  const linkTargets = flatten(project.tree)
    .filter((n) => !n.root && n.type !== 'folder' && !inTrash(n.id))
    .map((n) => ({ id: n.id, title: n.title }));
  const openLink = (id) => {
    if (findNode(project.tree, id)) {
      go(id);
      setView('editor');
    } else report(new Error('Documentul legat nu mai există în proiect.'));
  };
  const chapterFolder = selected && selected.children ? selected : findParent(project.tree, selectedId) || project.tree[0];
  const chapterDocs = flatten(chapterFolder.children || [])
    .filter((n) => n.type === 'text' && !inTrash(n.id))
    .map((n) => ({ id: n.id, title: n.title, html: docs[n.id] || '' }));

  const templateFolder = project.templateFolder ? findNode(project.tree, project.templateFolder) : null;
  const favorites = flatten(project.tree).filter((n) => n.favorite && !inTrash(n.id));
  const canContain = selected && !selected.root && selected.type !== 'file';

  const documentMenu = [
    { label: 'Caută în document', shortcut: 'Ctrl+F', action: () => (editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId))?.openFind() },
    { label: 'Împarte documentul la cursor', shortcut: 'Ctrl+K', action: () => splitDocument(false) },
    { label: 'Împarte cu selecția ca titlu', shortcut: 'Ctrl+Shift+K', action: () => splitDocument(true) },
    { label: 'Unește documentele selectate', shortcut: 'Ctrl+Shift+M', action: mergeSelection },
    { label: 'Duplică (cu sub-documente)', shortcut: 'Ctrl+D', action: () => duplicateSelection(true) },
    { label: 'Duplică doar elementul', action: () => duplicateSelection(false) },
    '-',
    { label: 'Convertește în dosar', action: () => setTree(convertNode(project.tree, selectedId, 'folder')), disabled: !canContain || selected.type === 'folder' },
    { label: 'Convertește în document text', action: () => setTree(convertNode(project.tree, selectedId, 'text')), disabled: !canContain || selected.type === 'text' },
    { label: 'Sortează conținutul A → Z', action: () => setTree(sortChildren(project.tree, selectedId, 'title')), disabled: !selected?.children },
    { label: 'Sortează conținutul Z → A', action: () => setTree(sortChildren(project.tree, selectedId, 'title', true)), disabled: !selected?.children },
    { label: 'Sortează după data creării', action: () => setTree(sortChildren(project.tree, selectedId, 'created')), disabled: !selected?.children },
    '-',
    ...(templateFolder && templateFolder.children && templateFolder.children.length
      ? templateFolder.children.map((t) => ({ label: `Nou din șablon: ${t.title}`, action: () => newFromTemplate(t) }))
      : [{ label: 'Nou din șablon (alege dosarul de șabloane în Setările proiectului)', action: () => {}, disabled: true }]),
    { label: 'Adaugă fișiere în Cercetare (imagini, PDF, audio, video)…', action: addMediaToResearch, disabled: !api.addMediaFiles },
  ];

  const navigateMenu = [
    { label: 'Mergi la…', shortcut: 'Ctrl+G', action: () => setDialog('goto') },
    { label: 'Documentul anterior', shortcut: 'Ctrl+Alt+↑', action: () => goSibling(-1) },
    { label: 'Documentul următor', shortcut: 'Ctrl+Alt+↓', action: () => goSibling(1) },
    { label: 'Dosarul părinte', action: () => {
      const parent = selectedId && findParent(project.tree, selectedId);
      if (parent) go(parent.id);
    } },
    { label: 'Înapoi', shortcut: 'Alt+←', action: back },
    { label: 'Înainte', shortcut: 'Alt+→', action: forward },
    '-',
    ...(favorites.length ? favorites.map((f) => ({ label: `★ ${f.title}`, action: () => go(f.id) })) : [{ label: 'Niciun favorit (bifează „Favorit” în Inspector)', action: () => {}, disabled: true }]),
  ];

  const projectMenu = [
    { label: 'Caută și înlocuiește…', shortcut: 'Ctrl+Shift+F', action: () => setDialog('find') },
    { label: 'Căutare avansată (câmpuri, filtre, colecții)…', action: () => { setSearchSeed(''); setDialog('advsearch'); } },
    { label: 'Cuvinte cheie…', action: () => setDialog('keywords') },
    { label: 'Importă Word / text / Markdown…', action: () => setDialog('import') },
    '-',
    { label: 'Istoricul scrisului…', action: () => setDialog('history'), disabled: !api.getHistory },
    { label: 'Backup-uri…', action: () => setDialog('backup'), disabled: !api.listBackups },
    '-',
    { label: 'Setările proiectului (etichete, statusuri, metadate, tipuri de secțiune)…', action: () => setDialog('projectSettings') },
    { label: 'Ținte și termen limită…', action: () => setDialog('targets') },
    { label: 'Statistici…', action: () => setDialog('stats') },
    { label: 'Stiluri…', action: () => setDialog('styles') },
    { label: 'Compilează…', action: () => flush().then(() => setDialog('compile')) },
    { label: 'Setări…', action: () => setDialog('settings') },
  ];

  // Command registry: every command has an id, a label, a menu group and a
  // configurable shortcut. Used by the keyboard handler, the native menu and Settings.
  const editorHandle = () => editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId);
  const commandList = [
    ['file', 'save', 'Salvează acum', () => flush()],
    ['file', 'compile', 'Compilează…', () => flush().then(() => setDialog('compile'))],
    ['file', 'import', 'Importă Word / text / Markdown…', () => setDialog('import')],
    ['file', 'importFiles', 'Importă fișiere (RTF, ODT, HTML, Fountain, media)…', () => setDialog('importSplit'), !api.importFiles],
    ['file', 'importOpml', 'Importă OPML…', () => importOpmlOutline().catch(report), !api.importOpml],
    ['file', 'importWeb', 'Importă pagină web…', () => importWeb().catch(report), !api.importWebPage],
    ['file', 'exportFiles', 'Exportă documente / OPML / CSV…', () => flush().then(() => setDialog('export'))],
    ['file', 'saveAs', 'Salvează ca…', () => saveAs().catch(report), !api.saveProjectAs],
    ['file', 'print', 'Tipărește documentul…', printCurrent, !api.printDocument],
    ['file', 'backups', 'Backup-uri…', () => setDialog('backup'), !api.listBackups],
    ['file', 'closeProject', 'Închide proiectul', closeProject],
    ['edit', 'findDoc', 'Caută în document', () => editorHandle()?.openFind()],
    ['edit', 'findProject', 'Caută și înlocuiește în proiect…', () => setDialog('find')],
    ['edit', 'advSearch', 'Căutare avansată…', () => { setSearchSeed(''); setDialog('advsearch'); }],
    ['view', 'viewEditor', 'Editor', () => setView('editor')],
    ['view', 'viewCorkboard', 'Corkboard', () => setView('corkboard')],
    ['view', 'viewOutline', 'Outline', () => setView('outline')],
    ['view', 'composition', 'Mod compunere', () => setComposition((c) => !c)],
    ['view', 'toggleInspector', 'Arată / ascunde Inspectorul', () => setShowInspector((v) => !v)],
    ['view', 'toggleBinder', 'Arată / ascunde binderul', () => setHideBinder((v) => !v)],
    ['view', 'split', 'Împarte documentul la cursor', () => splitDocument(false)],
    ['view', 'quickRef', 'Quick Reference pentru documentul curent', () => selected && !selected.root && openQuickRef(selected.id)],
    ['nav', 'goto', 'Mergi la…', () => setDialog('goto')],
    ['nav', 'prevDoc', 'Documentul anterior', () => goSibling(-1)],
    ['nav', 'nextDoc', 'Documentul următor', () => goSibling(1)],
    ['nav', 'back', 'Înapoi', back],
    ['nav', 'forward', 'Înainte', forward],
    ['project', 'newText', 'Document nou', () => addItem('text')],
    ['project', 'newFolder', 'Dosar nou', () => addItem('folder')],
    ['project', 'projectSettings', 'Setările proiectului…', () => setDialog('projectSettings')],
    ['project', 'targets', 'Ținte și termen limită…', () => setDialog('targets')],
    ['project', 'stats', 'Statistici…', () => setDialog('stats')],
    ['project', 'keywords', 'Cuvinte cheie…', () => setDialog('keywords')],
    ['project', 'history', 'Istoricul scrisului…', () => setDialog('history'), !api.getHistory],
    ['document', 'splitTitle', 'Împarte cu selecția ca titlu', () => splitDocument(true)],
    ['document', 'merge', 'Unește documentele selectate', mergeSelection],
    ['document', 'duplicate', 'Duplică', () => duplicateSelection(true)],
    ['document', 'snapshot', 'Snapshot acum', async () => {
      if (!selected || selected.root) return;
      await flush();
      await api.takeSnapshot(dir, selected.id, `Snapshot ${new Date().toLocaleString('ro-RO')}`).catch(report);
      setToast('Snapshot salvat.');
    }],
    ['format', 'styles', 'Stiluri…', () => setDialog('styles')],
    ['tools', 'irep', 'I-REP / I-EDIT', () => setShowEditorial((v) => !v)],
    ['tools', 'ai', 'Asistent AI', () => setShowAi((v) => !v), !aiEnabled],
    ['view', 'floatInspector', 'Inspector plutitor (compoziție)', () => setShowFloatInspector((v) => !v), !composition],
    ['view', 'viewTimeline', 'Cronologie', () => showWholeBook('timeline')],
    ['view', 'viewRelations', 'Hartă de relații', () => showWholeBook('relations')],
    ['view', 'viewPacing', 'Analiză de ritm', () => showWholeBook('pacing')],
    ['view', 'posNouns', 'Focus lingvistic: substantive', () => setEditorView({ ...editorView, posFocus: editorView.posFocus === 'noun' ? '' : 'noun' })],
    ['view', 'posVerbs', 'Focus lingvistic: verbe', () => setEditorView({ ...editorView, posFocus: editorView.posFocus === 'verb' ? '' : 'verb' })],
    ['view', 'posOff', 'Focus lingvistic: oprit', () => setEditorView({ ...editorView, posFocus: '' })],
    ['project', 'bookmarks', 'Semne de carte ale proiectului…', () => setDialog('bookmarks')],
    ['project', 'bookmarkAdd', 'Adaugă documentul la semne de carte', () => !(project.bookmarks || []).some((b) => b.id === selectedId) && saveProject({ ...project, bookmarks: [...(project.bookmarks || []), { id: selectedId, title: selected?.title }] }), !selectedId],
    ['project', 'projectNotes', 'Note proiect (file)…', () => setDialog('projectNotes')],
    ['file', 'exportScriv', 'Exportă ca proiect Scrivener (.scriv)…', () => exportScrivCmd().catch(report), !api.exportScriv],
    ['file', 'syncOut', 'Sincronizează cu folder extern: scrie…', () => syncOutCmd().catch(report), !api.syncOut],
    ['file', 'syncIn', 'Sincronizează cu folder extern: citește modificările', () => syncInCmd().catch(report), !api.syncIn || !project?.syncFolder],
    ['file', 'importBib', 'Importă bibliografie (Zotero BibTeX / CSL-JSON)…', () => api.importBibliography().then((r) => r && saveProject({ ...project, bibliography: r.entries })).catch(report), !api.importBibliography],
    ['file', 'exportLatex', 'Exportă LaTeX…', () => flush().then(() => api.exportLatex(dir, project)).catch(report), !api.exportLatex],
    ['file', 'exportPandoc', 'Exportă Pandoc Markdown…', () => flush().then(() => api.exportPandoc(dir, project)).catch(report), !api.exportPandoc],
    ['file', 'exportMmd', 'Exportă MultiMarkdown…', () => flush().then(() => api.exportPandoc(dir, project, { flavor: 'mmd' })).catch(report), !api.exportPandoc],
    ['tools', 'aiBulkSynopsis', 'Sinopsis AI în bloc', () => runBulkSynopsis().catch(report), !aiEnabled || !api.aiBulkSynopsis],
    ['tools', 'aiConsistency', 'Consistență pe toată cartea (fișe vii)', () => runConsistency().catch(report), !aiEnabled || !api.aiConsistency],
    ['tools', 'aiZoomReview', 'Revizie pe niveluri de zoom', () => runZoomReview(ZOOM_LEVELS).catch(report), !aiEnabled || !api.aiZoomReview],
    ['file', 'newWindow', 'Fereastră nouă', () => api.newWindow().catch(report), !api.newWindow],
    ['file', 'exportBundle', 'Exportă pachet pentru web / mobil…', () => flush().then(() => api.exportBundle(dir)).catch(report), !api.exportBundle],
    ['file', 'importBundle', 'Importă pachet de proiect…', () => api.importBundle().then(openResult).catch(report), !api.importBundle],
    ['tools', 'research', 'Cercetare în proiect (RAG)', () => setShowResearch((v) => !v), !api.ragQuery],
    ['tools', 'glossaries', 'Generează glosare și cuprins de tipar', () => generateGlossaries().catch(report)],
    ['file', 'editorPackage', 'Pachet pentru editor…', () => flush().then(() => api.editorPackage(dir, project)).then((r) => r && setToast(`Pachet creat în ${r.dir} (${r.files.length} fișiere)`)).catch(report), !api.editorPackage],
    ['file', 'saveTemplate', 'Salvează ca șablon…', () => flush().then(() => setDialog('saveTemplate')), !api.saveAsTemplate],
    ['file', 'pageSetup', 'Configurare pagină…', () => setDialog('pageSetup'), !api.getPageSetup],
    ['file', 'printPreview', 'Previzualizare tipărire', () => flush().then(() => api.printPreview(dir, project, { ids: selectedId ? [selectedId] : [] })).catch(report), !api.printPreview],
    ['help', 'help', 'Manualul Scribner', () => setHelp({ topic: null, tab: 'manual' })],
    ['help', 'helpContext', 'Ajutor pentru vederea curentă', () => setHelp({ topic: helpContext(), tab: 'manual' })],
    ['help', 'helpShortcuts', 'Lista scurtăturilor', () => setHelp({ topic: null, tab: 'shortcuts' })],
    ['help', 'helpPlaceholders', 'Placeholders pentru Compile', () => setHelp({ topic: null, tab: 'placeholders' })],
    ['help', 'helpSyntax', 'Sintaxă Markdown / Fountain / Script Mode', () => setHelp({ topic: null, tab: 'syntax' })],
    ['help', 'tutorial', 'Tutorial interactiv', startTutorial, !api.newProject],
    ['help', 'reportIssue', 'Raportează o problemă…', () => window.open('https://github.com/Hermeneuticus-of-things/Scriptorium/issues', '_blank')],
    ['help', 'about', 'Despre Scribner', () => window.alert('Scribner: program de scris pentru texte lungi, inspirat de Scrivener 3.'), Boolean(api.setAppMenu)],
    ['tools', 'nameGen', 'Generator de nume…', () => setDialog('names')],
    ['tools', 'scratchpad', 'Ciorne (Scratchpad)', () => setShowScratch((v) => !v)],
    ['tools', 'speech', 'Citire cu voce tare / Dictare', () => setShowSpeech((v) => !v)],
    ['format', 'scriptOff', 'Mod scenariu: dezactivat', () => setScriptFormat(null).catch(report), !scriptFormat],
    ...SCRIPT_FORMAT_LIST.map((f) => ['format', `script_${f.id}`, `Mod scenariu: ${f.label}`, () => setScriptFormat(f.id).catch(report), scriptFormat === f.id]),
    ['file', 'exportFdx', 'Exportă scenariu Final Draft (.fdx)…', () => flush().then(() => exportScript('fdx')).catch(report), !api.exportScript || !scriptFormat],
    ['file', 'exportFountain', 'Exportă scenariu Fountain…', () => flush().then(() => exportScript('fountain')).catch(report), !api.exportScript || !scriptFormat],
    ['tools', 'settings', 'Setări…', () => setDialog('settings')],
    ['tools', 'shortcuts', 'Scurtături de tastatură…', () => setDialog('shortcuts')],
    ['window', 'saveLayout', 'Salvează layout-ul curent…', saveLayout],
    ['window', 'manageLayouts', 'Gestionează layout-urile…', () => setDialog('layouts')],
    ['window', 'fullScreen', 'Ecran complet', toggleFullScreen],
    ['document', 'moveTo', 'Mută în…', () => setDialog('moveTo'), !selectionList().length],
    ['document', 'toggleSeparator', 'Marchează / demarchează ca separator', toggleSeparator, !selectionList().length],
    ['document', 'restoreTrash', 'Restaurează din coș', restoreSelection, !selectionList().some((id) => inTrash(id))],
    ['document', 'appendSelection', 'Adaugă selecția la document…', () => setDialog('appendTo')],
    ['document', 'openExternal', 'Deschide în editor extern', openMediaExternal, !selected?.media?.file || !api.openMediaExternal],
    ['document', 'autoSynopsis', 'Sinopsis automat din primele fraze', () => autoSynopsisSelection().catch(report), !selectionList().length],
    ['document', 'snapshotSelection', 'Snapshot pentru documentele selectate', () => snapshotSelection().catch(report), !selectionList().length],
    ['nav', 'revealBinder', 'Arată în binder', revealInBinder, !selectedId],
    ['nav', 'hoist', 'Focus pe dosar (hoist)', hoistSelection, !selected],
    ['nav', 'unhoist', 'Ieși din focus', () => setHoistId(null), !hoistId],
    ['view', 'scrivSelection', 'Scrivenings pentru selecție', () => openScrivenings(`${selectionList().length} documente selectate`, selectionList())],
    ['view', 'scrivCollection', 'Scrivenings pentru colecția activă', () => openScrivenings(activeCollection?.title || '', collectionIds || []), !activeCollection],
    ['view', 'scrivTitles', 'Scrivenings: arată / ascunde titlurile', () => toggleView('scrivHideTitles')],
    ['view', 'scrivSeparators', 'Scrivenings: arată / ascunde separatoarele', () => toggleView('scrivHideSeparators')],
    ['view', 'toggleFormatBar', 'Arată / ascunde bara de format', () => toggleView('hideFormatBar')],
    ['view', 'toggleComments', 'Aspect text: evidențierea comentariilor', () => toggleView('hideComments')],
    ['view', 'toggleRevisions', 'Aspect text: culorile reviziilor', () => toggleView('hideRevisions')],
    ['view', 'splitHorizontal', 'Split orizontal / vertical', () => toggleView('splitHorizontal')],
    ['view', 'swapPanes', 'Inversează panourile', swapPanes, !splitId],
    ['tools', 'lookupDict', 'Caută în dicționar (dexonline)', () => lookupWord('dictionary')],
    ['tools', 'lookupSyn', 'Găsește sinonime (dexonline)', () => lookupWord('synonyms')],
    ['tools', 'lookupWiki', 'Caută pe Wikipedia', () => lookupWord('wikipedia')],
    ['tools', 'lookupGoogle', 'Caută cu Google', () => lookupWord('google')],
    ['tools', 'checkSpelling', 'Verifică ortografia acum', () => api.recheckSpelling().catch(report), !api.recheckSpelling],
    ...(settings.layouts || []).map((l, i) => ['window', `layout:${i}`, `Layout: ${l.name}`, () => applyLayout(l)]),
  ];
  const commands = Object.fromEntries(
    commandList.map(([group, id, label, run, disabled]) => [id, { group, id, label: cmdLabel(id, label), run, disabled: Boolean(disabled), key: shortcutFor(id, settings) }]),
  );
  commandsRef.current = commands;

  return (
    <div
      className={`app ${composition ? 'composition' : ''} ${composition && settings.compPaper !== false ? 'comp-paper' : ''} ${composition && settings.compBgImage ? 'has-bg-image' : ''}`}
      data-fit={settings.compBgImageFit || 'cover'}
      style={
        composition
          ? {
              '--comp-bg': settings.compBg || undefined,
              '--comp-width': `${settings.compWidth || 40}em`,
              '--comp-fade': (settings.compFade || 100) / 100,
              '--comp-bg-image': settings.compBgImage ? `url("${/^(data:|https?:|file:)/.test(settings.compBgImage) ? settings.compBgImage : encodeURI(`file:///${settings.compBgImage.replace(/\\/g, '/').replace(/^\//, '')}`)}")` : undefined,
            }
          : undefined
      }
    >
      <style>{styleCss(projectStyles)}</style>
      <header className="toolbar">
        <button onClick={closeProject} title="Închide proiectul">⌂</button>
        <button onClick={back} disabled={nav.index <= 0} title="Înapoi (Alt+←)" aria-label="Înapoi"><BackIcon /></button>
        <button onClick={forward} disabled={nav.index >= nav.stack.length - 1} title="Înainte (Alt+→)" aria-label="Înainte"><ForwardIcon /></button>
        <strong className="project-title">{project.title}</strong>
        <div className="seg">
          <button className={view === 'editor' ? 'on' : ''} onClick={() => setView('editor')} title="Editor / Scrivenings"><span className="sc-ico"><ScriveningsIcon />Editor</span></button>
          <button className={view === 'corkboard' ? 'on' : ''} onClick={() => setView('corkboard')} title="Corkboard"><span className="sc-ico"><CorkboardIcon />Corkboard</span></button>
          <button className={view === 'outline' ? 'on' : ''} onClick={() => setView('outline')} title="Outline"><span className="sc-ico"><OutlineIcon />Outline</span></button>
        </div>
        <span className="spacer" />
        <button className={splitId ? 'on' : ''} onClick={() => setSplitId(splitId ? null : selected && !selected.root ? selected.id : null)} title="Split editor (Alt+clic în binder alege documentul din dreapta)">
          <span className="sc-ico"><SplitIcon />Split</span>
        </button>
        <button onClick={() => setComposition(true)} title="Mod compunere (F11)"><span className="sc-ico"><ComposeIcon />Compunere</span></button>
        <button onClick={() => flush().then(() => setDialog('compile'))} title="Compilează (Ctrl+Shift+E)"><span className="sc-ico"><CompileIcon />Compile</span></button>
        <button className={showInspector ? 'on' : ''} onClick={() => setShowInspector((v) => !v)} title="Inspector"><span className="sc-ico"><InspectorIcon />Inspector</span></button>
        <button className={showEditorial ? 'on' : ''} onClick={() => setShowEditorial((v) => !v)} title="I-REP (reparare + reverificare) și I-EDIT (runde editoriale)">
          {aiEnabled ? 'I-REP / I-EDIT' : 'I-REP'}
        </button>
        {aiEnabled && <button className={showAi ? 'on' : ''} onClick={() => setShowAi((v) => !v)}>Asistent AI</button>}
        <Menu label="Document" items={documentMenu} />
        <Menu label="Navigare" items={navigateMenu} />
        <Menu label="Proiect" items={projectMenu} />
        {!api.setAppMenu &&
          ['file', 'view', 'format', 'tools', 'help'].map((g) => (
            <Menu
              key={g}
              label={groupLabel(g)}
              items={Object.values(commands)
                .filter((c) => c.group === g)
                .map((c) => ({ label: c.label, action: c.run, disabled: c.disabled, shortcut: c.key }))}
            />
          ))}
      </header>

      <div className="main">
        {!hideBinder && !composition && (<>
        <div className="binder-col" style={{ width: widths.binder }}>
        <CollectionsBar
          project={project}
          active={activeCollectionId}
          onSelect={setActiveCollectionId}
          onChange={saveProject}
          selectedIds={[...selectedIds]}
        />
        {hoistNode && (
          <div className="hoist-bar">
            <span>Focus: {hoistNode.title}</span>
            <button className="link" onClick={() => setHoistId(null)}>Ieși din focus</button>
          </div>
        )}
        <Binder
          binderEnter={settings.binderEnter}
          binderDoubleClick={settings.binderDoubleClick}
          onOpenItem={(id) => onBinderSelect(id, {})}
          onQuickRef={openQuickRef}
          project={binderProject}
          revealId={revealId}
          onCopy={(ids, targetId, pos) => copyItems(ids, targetId, pos).catch(report)}
          filterIds={collectionIds}
          filterTitle={activeCollection?.title}
          docs={docs}
          width={widths.binder}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelect={onBinderSelect}
          onAdd={addItem}
          onRename={(id, title) => patchNode(id, { title })}
          onMove={(id, targetId, pos) => setTree(moveNode(project.tree, id, targetId, pos))}
          onKeyMove={(dir2) => selectedId && setTree(keyMove(project.tree, selectedId, dir2))}
          onTrash={trashSelection}
          onEmptyTrash={() => {
            if (window.confirm('Golești coșul? Documentele din coș vor fi scoase din proiect.')) setTree(emptyTrash(project.tree));
          }}
        />
        </div>
        <div className="resizer" onMouseDown={startResize('binder')} role="separator" aria-label="Lățime binder" />
        </>)}

        <section className={`workspace ${splitNode && view === 'editor' ? 'split' : ''} ${editorView.splitHorizontal ? 'split-h' : ''}`}>
          <div className={`pane ${editorAreaClass}`}>
            {view === 'editor' && selected && !composition && (
              <div className="sc-header-bar">
                <button onClick={back} disabled={nav.index <= 0} title="Înapoi (Alt+←)" aria-label="Înapoi"><BackIcon /></button>
                <button onClick={forward} disabled={nav.index >= nav.stack.length - 1} title="Înainte (Alt+→)" aria-label="Înainte"><ForwardIcon /></button>
                <DocumentIcon />
                <strong style={{ flex: 1 }}>{selected.title}</strong>
                {selected.locked && <LockIcon title="Blocat" />}
                <button onClick={() => setSplitId(splitId ? null : !selected.root ? selected.id : null)} title="Split editor" aria-label="Split editor"><SplitIcon /></button>
              </div>
            )}
            {view === 'editor' && !scrivListNodes && selected && selected.type === 'file' && !selected.children && (
              <MediaView api={api} dir={dir} node={selected} onError={report} />
            )}
            {view === 'editor' && !scrivListNodes && selected && selected.type !== 'file' && !selected.children && (
              <Editor
                scriptFormat={scriptFormat}
                key={`${selected.id}-${smartQuotes}-${Boolean(selected.locked)}-${corrKey}`}
                corrections={corrections}
                defaultFormatting={project.defaultFormatting}
                showInvisibles={settings.showInvisibles}
                ref={(r) => registerRef(selected.id, r)}
                html={docs[selected.id] || ''}
                title={selected.title}
                readOnly={inTrash(selected.id) || Boolean(selected.locked)}
                typewriter={settings.typewriter}
                smartQuotes={smartQuotes}
                onFocus={() => (activeId.current = selected.id)}
                onChange={(html) => writeSynced(selected.id, html, 'main')}
                linkTargets={linkTargets}
                onOpenLink={openLink}
                words={words}
                styles={projectStyles}
                view={editorView}
                onViewChange={setEditorView}
                onManageStyles={() => setDialog('styles')}
              />
            )}
            {isFolderView && (
              <Scrivenings
                key={`${scrivList ? scrivList.ids.join(',') : selected?.id}-${smartQuotes}`}
                title={scrivList ? scrivList.title : selected?.title}
                sections={scrivSections}
                docs={docs}
                settings={settings}
                readOnlyIds={new Set(scrivSections.filter((n) => inTrash(n.id) || n.locked).map((n) => n.id))}
                registerRef={registerRef}
                onFocusSection={(id) => (activeId.current = id)}
                onChange={(id, html) => writeSynced(id, html, 'main')}
                showTitles={!editorView.scrivHideTitles}
                showSeparators={!editorView.scrivHideSeparators}
                onClose={scrivList ? () => setScrivList(null) : undefined}
                onOpen={(id) => go(id)}
              />
            )}
            {view === 'timeline' && <TimelineView project={project} onOpen={(id) => { go(id); setView('editor'); }} onClose={() => setView('editor')} />}
            {view === 'relations' && <RelationMap project={project} docs={docs} onOpen={(id) => { go(id); setView('editor'); }} onClose={() => setView('editor')} />}
            {view === 'pacing' && <PacingView project={project} docs={docs} onOpen={(id) => { go(id); setView('editor'); }} onClose={() => setView('editor')} />}
            {view === 'corkboard' && (
              <Corkboard
                project={project}
                folders={selectedIds.size > 1 ? [...selectedIds].map((id) => findNode(project.tree, id)).filter((n) => n && n.children) : undefined}
                onAddTo={(folderId) => {
                  const f = findNode(project.tree, folderId);
                  const node = newNode('text');
                  setTree(updateNode(project.tree, folderId, { children: [...(f.children || []), node] }));
                  setDocs((d) => ({ ...d, [node.id]: '<p></p>' }));
                  api.writeDoc(dir, node.id, 'docs', '<p></p>').catch(report);
                }}
                folder={selected && selected.children ? selected : findParent(project.tree, selectedId) || project.tree[0]}
                onOpen={(id) => {
                  go(id);
                  setView('editor');
                }}
                onPatch={patchNode}
                onAdd={() => addItem('text')}
                onMove={(id, targetId, pos) => setTree(moveNode(project.tree, id, targetId, pos))}
                onReorder={(folderId, ids) =>
                  setTree(
                    produce(project.tree, (t) => {
                      const f = findNode(t, folderId);
                      f.children.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
                    }),
                  )
                }
                readMedia={api.readMedia ? (file) => api.readMedia(dir, file) : null}
              />
            )}
            {view === 'outline' && (
              <Outliner
                project={project}
                docs={docs}
                root={selected && selected.children ? selected : project.tree[0]}
                counts={counts}
                onOpen={(id) => {
                  go(id);
                  setView('editor');
                }}
                onPatch={patchNode}
                onMove={(id, targetId, pos) => setTree(moveNode(project.tree, id, targetId, pos))}
              />
            )}
          </div>
          {splitNode && view === 'editor' && (
            <div className={`pane second ${editorAreaClass}`}>
              <div className="pane-head">
                <span>Panoul 2 · blocat pe „{splitNode.title}”</span>
                <button className="link" onClick={() => toggleView('splitHorizontal')}>{editorView.splitHorizontal ? 'Split vertical' : 'Split orizontal'}</button>
                <button className="link" onClick={swapPanes}>Inversează</button>
                <button className="link" onClick={() => go(splitNode.id)}>Deschide în principal</button>
                <button className="link" onClick={() => setSplitId(null)}>Închide</button>
              </div>
              {splitNode.children ? (
                <p className="hint">Alege un document cu Alt+clic în binder.</p>
              ) : (
                <Editor
                  scriptFormat={scriptFormat}
                  key={`split-${splitNode.id}-${smartQuotes}-${corrKey}`}
                  corrections={corrections}
                  defaultFormatting={project.defaultFormatting}
                defaultFormatting={project.defaultFormatting}
                  showInvisibles={settings.showInvisibles}
                  ref={(r) => registerRef(mainIds.has(splitNode.id) ? `split:${splitNode.id}` : splitNode.id, r)}
                  html={docs[splitNode.id] || ''}
                  title={splitNode.title}
                  readOnly={inTrash(splitNode.id) || Boolean(splitNode.locked)}
                  smartQuotes={smartQuotes}
                  onFocus={() => (activeId.current = splitNode.id)}
                  onChange={(html) => writeSynced(splitNode.id, html, 'split')}
                  linkTargets={linkTargets}
                  onOpenLink={openLink}
                  words={words}
                  styles={projectStyles}
                  view={editorView}
                  onViewChange={setEditorView}
                  onManageStyles={() => setDialog('styles')}
                />
              )}
            </div>
          )}
        </section>

        {(showInspector || showAi || showEditorial) && selected && !composition && (
          <>
            <div className="resizer" onMouseDown={startResize('side')} role="separator" aria-label="Lățime panou lateral" />
            <div className="side" style={{ width: widths.side }}>
              {showInspector && (
                <Inspector
                  key={`insp-${selected.id}`}
                  api={api}
                  dir={dir}
                  project={project}
                  node={selected}
                  html={docs[selected.id] || ''}
                  words={counts[selected.id] || 0}
                  allKeywords={allKeywords}
                  linkTargets={linkTargets}
                  onOpen={openLink}
                  onPatch={(patch) => patchNode(selected.id, patch)}
                  onNotesChange={(html) => queueWrite(selected.id, 'notes', html)}
                  onProjectNotesChange={(html) => queueWrite('project-notes', 'notes', html)}
                  onRestore={(html) => {
                    writeDocNow(selected.id, html);
                    editorRefs.current.get(selected.id)?.setHtml(html);
                  }}
                  onError={report}
                  flush={flush}
                  docs={docs}
                  counts={counts}
                  onPatchNode={patchNode}
                  onNotesChangeFor={(id, html) => queueWrite(id, 'notes', html)}
                  authorName={settings.authorName || project.author || ''}
                  onHtmlChange={(html, id) => {
                    writeDocNow(id, html);
                    editorRefs.current.get(id)?.setHtml(html);
                  }}
                  onJumpToComment={(index, c, id) => {
                    go(id);
                    setView('editor');
                  }}
                />
              )}
              {showResearch && dir && (
                <ResearchPanel api={api} dir={dir} aiEnabled={aiEnabled} onOpen={(id) => go(id)} onClose={() => setShowResearch(false)} />
              )}
              {showAi && aiEnabled && (
                <AiPanel
                  api={api}
                  hasKey={settings.hasApiKey}
                  node={aiNode}
                  getText={() => activeHandle()?.getSelectionText() || htmlToText(docs[aiNode.id])}
                  hasSelection={() => Boolean(activeHandle()?.getSelectionText())}
                  getContext={contextForAi}
                  onInsert={(text) => activeHandle()?.insertText(text)}
                  onReplace={(text) => activeHandle()?.replaceSelection(text)}
                  onReplaceAll={(text) => {
                    const html = textToHtml(text);
                    activeHandle()?.setHtml(html);
                    writeDocNow(aiNode.id, html);
                  }}
                  onSynopsis={(text) => patchNode(aiNode.id, { synopsis: text })}
                  onOpenSettings={() => setDialog('settings')}
                />
              )}
              {showEditorial && editorialNode && (
                <EditorialPanel
                  project={project}
                  dir={dir}
                  aiEnabled={aiEnabled}
                  key={`ed-${editorialNode.id}`}
                  api={api}
                  hasKey={settings.hasApiKey}
                  profile={profileFor(project)}
                  node={editorialNode}
                  html={docs[editorialNode.id] || ''}
                  chapter={chapterDocs}
                  onSelectionText={() => {
                    const h = editorRefs.current.get(editorialNode.id);
                    const ed = h?.editor;
                    if (!ed || ed.state.selection.empty) return '';
                    const { from, to } = ed.state.selection;
                    const slice = ed.state.doc.cut(from, to);
                    return htmlToManuscript(getHTMLFromFragment(slice.content, ed.schema));
                  }}
                  onJump={(issue) => {
                    if (!mainIds.has(editorialNode.id)) go(editorialNode.id);
                    setTimeout(() => editorRefs.current.get(editorialNode.id)?.findText(issue.match || issue.excerpt), 50);
                  }}
                  onApply={async (p) => {
                    await flush();
                    if (!p.safe) await api.takeSnapshot(dir, p.id, `Înainte de ${p.rounds ? 'I-EDIT' : 'I-REP'}`).catch(report);
                    if (p.selection) {
                      editorRefs.current.get(p.id)?.replaceSelectionHtml(p.after);
                      return;
                    }
                    writeDocNow(p.id, p.after);
                    editorRefs.current.get(p.id)?.setHtml(p.after);
                    const n = findNode(project.tree, p.id);
                    const stamp = new Date().toISOString();
                    const editorial = { ...(n?.editorial || {}), lastRep: stamp };
                    if (p.rounds) editorial.rounds = { ...(editorial.rounds || {}), ...Object.fromEntries(p.rounds.map((r) => [r, stamp])) };
                    patchNode(p.id, { editorial });
                  }}
                  onOpenSettings={() => setDialog('settings')}
                />
              )}
            </div>
          </>
        )}
      </div>

      <StatusBar
        node={selected}
        words={selected ? (isFolderView ? scrivSections.reduce((s, n) => s + (counts[n.id] || 0), 0) : counts[selected.id] || 0) : 0}
        chars={selected && !isFolderView ? htmlToText(docs[selected.id] || '').replace(/\s+/g, ' ').trim().length : 0}
        selectionCount={selectedIds.size}
        totalDraft={totals.draft}
        draftTarget={project.targets?.draft || 0}
        sessionWords={Math.max(0, totals.draft - sessionStart)}
        sessionTarget={project.targets?.session || 0}
        saveState={saveState}
        zoom={editorView.zoom || 100}
        onZoom={(z) => setEditorView({ ...editorView, zoom: z })}
      />

      {composition && <button className="exit-composition" onClick={() => setComposition(false)}>Ieși (Esc)</button>}
      {composition && settings.compShowTargets && selected && (
        <div className="comp-targets">
          <span>Document: {counts[selected.id] || 0}{selected.target ? ` / ${selected.target}` : ''}</span>
          <span>Sesiune: {Math.max(0, totals.draft - sessionStart)}{project.targets?.session ? ` / ${project.targets.session}` : ''}</span>
        </div>
      )}

      {composition && showFloatInspector && selected && floatNotes !== null && (
        <FloatingInspector
          node={selected}
          project={project}
          notesHtml={floatNotes}
          onPatch={(p) => patchNode(selected.id, p)}
          onNotesChange={(h) => queueWrite(selected.id, 'notes', h)}
          onClose={() => setShowFloatInspector(false)}
        />
      )}
      {dialog === 'bookmarks' && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <BookmarksPanel
              bookmarks={project.bookmarks || []}
              currentId={selectedId}
              nodeTitle={(id) => findNode(project.tree, id)?.title}
              readDoc={(id) => api.readDoc(dir, id, 'docs')}
              onChange={(bookmarks) => saveProject({ ...project, bookmarks })}
              onOpen={(id) => { go(id); setDialog(null); }}
              onError={report}
            />
          </div>
        </div>
      )}
      {dialog === 'projectNotes' && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <ProjectNotesTabs
              tabs={project.projectNotes}
              readNote={(id) => api.readDoc(dir, id, 'notes')}
              onNoteChange={(id, html) => queueWrite(id, 'notes', html)}
              onTabsChange={(projectNotes) => saveProject({ ...project, projectNotes })}
              onError={report}
            />
          </div>
        </div>
      )}
      {aiProgress && <div className="toast">{aiProgress}</div>}
      {aiReport && (
        <div className="modal-backdrop" onClick={() => setAiReport(null)}>
          <div className="modal wide" role="dialog" aria-label={aiReport.title} onClick={(e) => e.stopPropagation()}>
            <h2>{aiReport.title}</h2>
            {!aiReport.findings.length && <p>Nicio problemă găsită.</p>}
            <div className="ai-findings">
              {aiReport.findings.map((f, i) => (
                <div key={i} className={`finding sev-${f.severity}`}>
                  <strong>{f.severity}</strong> {f.level ? `[${f.level}] ` : ''}{f.title || f.character || ''}
                  {f.quote && <blockquote>{f.quote}</blockquote>}
                  <p>{f.issue}</p>
                  {f.suggestion && <p className="muted">{f.suggestion}</p>}
                  {f.docId && <button className="link" onClick={() => { go(f.docId); setAiReport(null); }}>Deschide</button>}
                </div>
              ))}
            </div>
            <div className="actions"><span className="spacer" /><button onClick={() => setAiReport(null)}>Închide</button></div>
          </div>
        </div>
      )}
      {help && <HelpWindow initialTopic={help.topic} initialTab={help.tab} settings={settings} onClose={() => setHelp(null)} onStartTutorial={startTutorial} />}
      {dialog === 'saveTemplate' && <SaveTemplateDialog api={api} dir={dir} project={project} onSaved={(t) => setToast(`Șablon salvat: ${t.title}`)} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'pageSetup' && <PageSetupDialog api={api} dir={dir} project={project} previewIds={selectedId ? [selectedId] : []} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'names' && <NameGeneratorDialog onClose={() => setDialog(null)} onInsert={(t) => activeHandle()?.replaceSelection(t)} />}
      {showScratch && <Scratchpad onSendToProject={({ title, html }) => { const parent = findNode(project.tree, project.inboxFolder || '') || project.tree.find((n) => n.root === 'research'); const node = newNode('text', title || 'Din Scratchpad'); setTree(updateNode(project.tree, parent.id, { children: [...(parent.children || []), node] })); setDocs((d) => ({ ...d, [node.id]: html })); api.writeDoc(dir, node.id, 'docs', html).catch(report); setToast(`Trimis în „${parent.title}”.`); }} load={() => settings.scratchpad || []} save={(notes) => api.setSettings({ scratchpad: notes }).catch(report)} onClose={() => setShowScratch(false)} />}
      {showSpeech && <SpeechBar getText={speechText} onInsertText={(t) => activeHandle()?.replaceSelection(t)} onClose={() => setShowSpeech(false)} />}
      {dialog === 'export' && <ExportDialog api={api} dir={dir} project={project} selectionIds={[...selectedIds]} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'compile' && <CompileDialog api={api} dir={dir} project={project} selectionIds={[...selectedIds]} onProjectChange={saveProject} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'settings' && (
        <SettingsDialog
            onShortcuts={project ? () => setDialog('shortcuts') : undefined}
          api={api}
          settings={settings}
          project={project}
          dir={dir}
          onProjectChange={saveProject}
          onClose={async () => {
            setDialog(null);
            setSettings(await api.getSettings());
          }}
          onError={report}
        />
      )}
      {dialog === 'find' && (
        <FindDialog
          project={project}
          docs={docs}
          onOpen={(id) => {
            go(id);
            setView('editor');
          }}
          onReplaceAll={replaceAllInProject}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'history' && <HistoryDialog api={api} dir={dir} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'backup' && (
        <BackupDialog
          api={api}
          dir={dir}
          onOpenProject={async (res) => {
            await flush();
            await openResult(res);
          }}
          onClose={() => setDialog(null)}
          onError={report}
        />
      )}
      {dialog === 'keywords' && (
        <KeywordsDialog
          project={project}
          onSave={(next) => saveProject(next)}
          onClose={() => setDialog(null)}
          onSearchKeyword={(name) => {
            setSearchSeed(name);
            setDialog('advsearch');
          }}
        />
      )}
      {dialog === 'advsearch' && (
        <AdvancedSearchDialog
          project={project}
          docs={docs}
          initialQuery={searchSeed}
          readNotes={(id) => api.readDoc(dir, id, 'notes')}
          onOpen={(id) => {
            go(id);
            setView('editor');
          }}
          onReplace={replaceAdvanced}
          onSaveAsCollection={(title, criteria) => {
            const { query, ...options } = criteria;
            const r = createCollection(project, { title, type: 'search', search: { query, options } });
            saveProject(r.project);
            setActiveCollectionId(r.id);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'goto' && (
        <GoToDialog
          items={flatten(project.tree)
            .filter((n) => !n.root && !inTrash(n.id))
            .map((n) => {
              const parts = [];
              let p = findParent(project.tree, n.id);
              while (p) {
                parts.unshift(p.title);
                p = findParent(project.tree, p.id);
              }
              return { id: n.id, title: n.title, path: parts.join(' / '), favorite: n.favorite };
            })}
          onGo={(id) => {
            go(id);
            setView('editor');
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'projectSettings' && (
        <ProjectSettingsDialog
          project={project}
          folders={flatten(project.tree)
            .filter((n) => n.children && n.type !== 'file')
            .map((n) => ({ id: n.id, title: n.title, path: n.title }))}
          onSave={(next) => {
            saveProject(next);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'stats' && <StatisticsDialog project={project} docs={docs} selectionIds={[...selectedIds]} onClose={() => setDialog(null)} />}
      {dialog === 'targets' && (
        <TargetsDialog
          project={project}
          draftWords={totals.draft}
          draftChars={totals.draftChars}
          onSave={(targets) => {
            saveProject({ ...project, targets });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'styles' && (
        <StylesDialog
          api={api}
          project={project}
          currentLook={currentLook()}
          onSave={(styles) => {
            saveProject({ ...project, styles });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
          onError={report}
        />
      )}
      {dialog === 'importReport' && importStats && <ImportReport report={importStats} onClose={() => setDialog(null)} />}
      {dialog === 'import' && <ImportDialog api={api} target={selected?.title || ''} onImported={importParts} onClose={() => setDialog(null)} onError={report} />}
      {quickRefs.map((q) => {
        const n = findNode(project.tree, q.id);
        if (!n) return null;
        return (
          <QuickRef
            key={q.id}
            node={n}
            html={docs[q.id] || ''}
            x={q.x}
            y={q.y}
            readOnly={inTrash(q.id) || Boolean(n.locked) || mainIds.has(q.id) || n.type !== 'text'}
            smartQuotes={smartQuotes}
            onChange={(html) => writeDocNow(q.id, html)}
            onMove={(x, y) => setQuickRefs((all) => all.map((r) => (r.id === q.id ? { ...r, x, y } : r)))}
            onClose={() => setQuickRefs((all) => all.filter((r) => r.id !== q.id))}
            onOpen={() => {
              setQuickRefs((all) => all.filter((r) => r.id !== q.id));
              go(q.id);
              setView('editor');
            }}
          />
        );
      })}
      {dialog === 'moveTo' && (
        <PickNodeDialog
          title="Mută selecția în…"
          items={moveTargets(project.tree, selectionList())}
          onPick={moveSelectionTo}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'appendTo' && (
        <PickNodeDialog
          title="Adaugă selecția la sfârșitul documentului…"
          items={flatten(project.tree)
            .filter((n) => n.type === 'text' && !inTrash(n.id) && !n.locked)
            .map((n) => ({ id: n.id, title: n.title, depth: ancestorIds(project.tree, n.id).length - 1 }))}
          onPick={(id) => appendSelectionTo(id).catch(report)}
          onClose={() => setDialog(null)}
          emptyText="Niciun document."
        />
      )}
      {dialog === 'importSplit' && <ImportSplitDialog onImport={(mode, sep) => importFilesCmd(mode, sep).catch(report)} onClose={() => setDialog(null)} />}
      {dialog === 'layouts' && (
        <LayoutsDialog layouts={settings.layouts || []} onChange={(l) => saveLayouts(l).catch(report)} onApply={applyLayout} onClose={() => setDialog(null)} />
      )}
      {dialog === 'shortcuts' && (
        <ShortcutsDialog
          commands={commandList.map(([group, id, label]) => ({ group, id, label: cmdLabel(id, label) }))}
          settings={settings}
          onSave={async (shortcuts) => {
            await api.setSettings({ shortcuts });
            setSettings(await api.getSettings());
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {error && <ErrorToast message={error} onClose={() => setError('')} />}
      {toast && (
        <div className="toast ok-toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="Închide">×</button>
        </div>
      )}
    </div>
  );
}

function ErrorToast({ message, onClose }) {
  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Închide">×</button>
    </div>
  );
}

function sumWords(node, counts) {
  if (!node.includeInCompile && !node.root) return 0;
  let total = counts[node.id] || 0;
  for (const c of node.children || []) total += sumWords(c, counts);
  return total;
}

// Binder view of the project, hoisted to one folder when focus is on.
function binderProjectOf(project, hoistNode) {
  return hoistNode ? { ...project, tree: [hoistNode] } : project;
}
