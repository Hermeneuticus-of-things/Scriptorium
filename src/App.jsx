import { addBacklinks, addedLinks, insertLinkedDoc } from './lib/backlinks.js';
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
import { diffParagraphs, journalRows, updateAuthorHashes } from './lib/authorText.js';
import { projectWords } from './editor/writing.js';
import { styleCss, stylesOf } from './lib/styles.js';
import CompileDialog from './components/CompileDialog.jsx';
import ExportDialog from './components/ExportDialog.jsx';
import { collectBookDocs, buildAlogenGlossary, buildReadingGlossary, buildPrintToc, findGlossaryDoc, glossaryEntryHtml, glossaryHasTerm } from './lib/glossary.js';
import { AddIcon, BackIcon, BinderIcon, BookmarkIcon, CompileIcon, ComposeIcon, CorkboardIcon, DocumentIcon, ForwardIcon, InspectorIcon, LockIcon, NotesIcon, OutlineIcon, ScriveningsIcon, SearchIcon, SnapshotIcon, SplitIcon } from './components/Icons.jsx';
import { TOP_ITEMS, topItemAvailable, toolbarPrefs, setFormatLayout } from './lib/toolbars.js';
import ToolbarCustomizeDialog from './components/ToolbarCustomizeDialog.jsx';
import { mediaNode, opmlToNodes, targetCrossed } from './lib/panelsExtra.js';
import SaveTemplateDialog from './components/SaveTemplateDialog.jsx';
import PageSetupDialog from './components/PageSetupDialog.jsx';
import PrintPreviewDialog from './components/PrintPreviewDialog.jsx';
import HelpWindow from './components/HelpWindow.jsx';
import ReportProblemDialog from './components/ReportProblemDialog.jsx';
import { errorKey, noteAction, onMemoryError } from './lib/reportProblem.js';
import ResearchPanel from './components/ResearchPanel.jsx';
import AiJobBar from './components/AiJobBar.jsx';
import McpConnectDialog from './components/McpConnectDialog.jsx';
import { buildMenuLayout, nativeMenuSpec, AI_ONLY_COMMANDS } from './lib/menuLayout.js';
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
import DialogA11y from './components/DialogA11y.jsx';
import { setLanguage, cmdLabel, groupLabel, t as tr, uiLocale } from './lib/i18n.js';
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
  dropMany,
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
  restoreManyFromTrash,
  moveManyInto,
  moveTargets,
  ancestorIds,
  scriveningsList,
  appendHtml,
  keyMoveMany,
  selectionAfterRemoval,
  emptyHistory,
  historyPush,
  historyUndo,
  historyRedo,
} from './lib/tree.js';
import { autoSynopsis, lookupUrl } from './lib/textTools.js';
import { LANG_NAMES, lookupGroups } from './lib/lookups.js';
import { applyTextEdits, replaceRangeText } from './lib/serviceApply.js';
import { mergeBibliography } from './lib/bibMerge.js';
import ContextMenu from './components/ContextMenu.jsx';
import ServiceResultDialog from './components/ServiceResultDialog.jsx';
import { PickNodeDialog, ImportSplitDialog, LayoutsDialog } from './components/BatchADialogs.jsx';
import { learnCorrection } from './lib/learnCorrections.js';
import { htmlToText, newNode, textToHtml, wordCount } from './lib/text.js';
import { mergeProject } from './lib/projectMerge.js';
import { pullExternalDocs } from './lib/syncGuard.js';
import { mergeDoc, resolveMerge } from './lib/team.js';
import { useTeam } from './lib/useTeam.js';
import { useDictation } from './lib/useDictation.js';
import { createLocalSpeech } from './lib/localSpeech.js';
import { AUDIO_EXT, transcriptHtml } from './lib/dictation.js';
import DictationBar from './components/DictationBar.jsx';
import TeamDialog from './components/TeamDialog.jsx';
import ConflictDialog from './components/ConflictDialog.jsx';

const SAVE_DELAY = 700;
const RETRY_DELAY = 15000; // offline queue: retry unwritten edits every 15 s
const queueKey = (dir) => `scribner-queue:${dir}`;
function saveQueue(dir, items) {
  try {
    if (items && Object.keys(items).length) localStorage.setItem(queueKey(dir), JSON.stringify(items));
    else localStorage.removeItem(queueKey(dir));
  } catch { /* storage full or blocked: the in-memory queue still retries */ }
}
function loadQueue(dir) {
  try {
    const v = JSON.parse(localStorage.getItem(queueKey(dir)) || 'null');
    return v && typeof v === 'object' && Object.keys(v).length ? v : null;
  } catch {
    return null;
  }
}
const TYPED_COMMIT_DELAY = 400;
// I-EDIT: a run of hand edits is journaled (MODIFICARI_AUTOR) once the writer pauses this long,
// so autosave never writes one row per keystroke.
const AUTHOR_COMMIT_DELAY = 8000;
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

export default function App({ api: apiProp }) {
  // Text of each document as last read from or written to disk: the base of the three-way merge
  // when the same document changes on another computer (src/lib/team.js mergeDoc). Every write
  // of a document goes through this api, so no save path can leave the base stale.
  const diskDocs = useRef(new Map());
  const api = useMemo(() => {
    // defineProperty: the desktop api (contextBridge) has read-only properties, so plain
    // assignment over the inherited ones throws.
    return Object.create(apiProp, {
      writeDoc: {
        value: async (d, id, kind, html) => {
          const r = await apiProp.writeDoc(d, id, kind, html);
          if (kind !== 'notes') diskDocs.current.set(id, String(html ?? ''));
          return r;
        },
      },
      readDoc: {
        value: async (d, id, kind) => {
          const html = await apiProp.readDoc(d, id, kind);
          if (kind !== 'notes' && !diskDocs.current.has(id)) diskDocs.current.set(id, html);
          return html;
        },
      },
    });
  }, [apiProp]);
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
  const [docsState, setDocs] = useState({}); // id -> html cache (main text)
  // Typing does not go through React state on every keystroke: re-rendering App (and every
  // project-wide derived value: word counts, auto-complete words, target checks, binder,
  // inspector) cost ~30 ms per key on a 50k-word document. The newest text of each edited
  // document waits here and is committed to `docsState` once typing pauses (or on flush).
  const typed = useRef(new Map());
  const typedTimer = useRef(null);
  const docsStateRef = useRef(docsState);
  docsStateRef.current = docsState;
  const commitTyped = useCallback(() => {
    clearTimeout(typedTimer.current);
    if (!typed.current.size) return;
    const t = Object.fromEntries(typed.current);
    typed.current.clear();
    setDocs((d) => ({ ...d, ...t }));
  }, []);
  const dropTyped = () => {
    clearTimeout(typedTimer.current);
    typed.current.clear();
  };
  // Every document's newest text, for handlers (the render-time `docs` can be a few keys behind).
  const docsNow = () => (typed.current.size ? { ...docsStateRef.current, ...Object.fromEntries(typed.current) } : docsStateRef.current);
  // Render-time view: state plus pending typing, with a stable identity while neither changes
  // so the memos below are not recomputed by unrelated re-renders.
  const mergedDocs = useRef({ base: null, out: null });
  const docs = (() => {
    const m = mergedDocs.current;
    if (!typed.current.size) return docsState;
    if (m.base === docsState && [...typed.current].every(([id, h]) => m.out[id] === h)) return m.out;
    mergedDocs.current = { base: docsState, out: docsNow() };
    return mergedDocs.current.out;
  })();
  useEffect(() => () => clearTimeout(typedTimer.current), []);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [conflict, setConflict] = useState(null); // { id, title, pieces, html } (ConflictDialog)
  const team = useTeam({ api, dir, settings, docId: selectedId });
  // D&TED dictation (text at the cursor, or replacing the selection) and audio transcription.
  // The built-in recogniser (default, desktop) or the separate D&TED program (Settings).
  const speechMode = settings?.speechEngine === 'dted' || !api.whisperStatus ? 'dted' : 'local';
  const speechApi = useMemo(
    () => (speechMode === 'local' ? createLocalSpeech(api, { terms: () => settingsRef.current?.dtedTerms || '' }) : api),
    [api, speechMode],
  );
  // The previous engine's dictation ends with it (microphone released, bar cleared).
  useEffect(() => () => speechApi.dispose?.(), [speechApi]);
  const dict = useDictation({
    api: speechApi,
    getEditor: () => activeHandle()?.editor,
    replacements: settings?.autoReplacements,
    switchedMessage: tr('ui.dted.oprita_la_schimbare'),
    onMessage: (m) => setToast(m),
    onTranscript: (r, job) => {
      const html = transcriptHtml(r, { timestamps: settings?.dtedTimestamps !== false });
      addResearchDocs([{ title: tr('ui.dted.titlu_transcriere', { title: job.title }), html }])
        .then((ids) => {
          if (ids[0]) go(ids[0]);
          setToast(tr('ui.dted.transcriere_gata', { title: job.title }));
        })
        .catch(report);
    },
  });
  const [view, setView] = useState('editor');
  const [showInspector, setShowInspector] = useState(true);
  const [showAi, setShowAi] = useState(false);
  const [editorCtx, setEditorCtx] = useState(null); // { x, y } in-app editor menu (browser build)
  const [aiRequest, setAiRequest] = useState(null);
  const [researchRequest, setResearchRequest] = useState(null); // { q, mode, n } run by ResearchPanel
  const [findSeed, setFindSeed] = useState('');
  const [serviceResult, setServiceResult] = useState(null); // { source, result, handle } from DeepL / Google / LanguageTool // { action, n } run by AiPanel
  const [showEditorial, setShowEditorial] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [toast, setToast] = useState('');
  // Split / reference panes: the pane last clicked or typed in is marked active (green border, see
  // styles.css), so it is clear which text a command or the keyboard goes to.
  useEffect(() => {
    const mark = (ev) => {
      const pane = ev.target?.closest?.('.workspace .pane');
      if (!pane || pane.hasAttribute('data-active')) return;
      for (const p of pane.parentElement?.querySelectorAll(':scope > .pane[data-active]') || []) p.removeAttribute('data-active');
      pane.setAttribute('data-active', '');
    };
    document.addEventListener('focusin', mark);
    document.addEventListener('mousedown', mark);
    return () => {
      document.removeEventListener('focusin', mark);
      document.removeEventListener('mousedown', mark);
    };
  }, []);
  // Help → Report a problem, and the discreet "send a report?" toast for a newly captured error.
  const [reportOpen, setReportOpen] = useState(false);
  const [errorPrompt, setErrorPrompt] = useState(false);
  const seenErrors = useRef(new Set());
  useEffect(() => {
    const onErr = (e) => {
      const k = errorKey(e || {});
      if (seenErrors.current.has(k)) return;
      seenErrors.current.add(k);
      setErrorPrompt(true);
    };
    return api.onAppError ? api.onAppError(onErr) : onMemoryError(onErr);
  }, [api]);
  // Learned corrections: a misspelled word fixed by hand becomes an auto-replacement (Settings →
  // Corrections), so the same typo is fixed while typing next time.
  const replacementsNow = useCallback(() => settingsRef.current?.autoReplacements || [], []);
  const learnPair = useCallback(async (from, to) => {
    const cur = settingsRef.current;
    if (!cur || cur.learnCorrections === false) return;
    const next = learnCorrection(cur.autoReplacements, from, to);
    if (!next) return;
    try {
      await api.setSettings({ autoReplacements: next });
      setSettings(await api.getSettings());
      setToast(tr('ui.app.corectura_invatata', { from, to }));
    } catch {
      /* settings not writable: nothing learned */
    }
  }, [api]);
  // Typed over a selected word: learn only when the spell checker flags the old word and accepts
  // the new one (without a checker, e.g. in the browser, nothing is learned from typing).
  const learnFromEdit = useCallback((from, to) => {
    if (!api.isMisspelled) return;
    Promise.resolve()
      .then(async () => (await api.isMisspelled(from)) && !(await api.isMisspelled(to)))
      .then((ok) => ok && learnPair(from, to))
      .catch(() => {});
  }, [api, learnPair]);
  useEffect(() => (api.onSpellReplaced ? api.onSpellReplaced(({ from, to }) => learnPair(from, to)) : undefined), [api, learnPair]);
  const [help, setHelp] = useState(null);
  const [showScratch, setShowScratch] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [settingsTab, setSettingsTab] = useState('');
  const openSettings = (tab = '') => { setSettingsTab(typeof tab === 'string' ? tab : ''); setDialog('settings'); };
  const [revealId, setRevealId] = useState(null);
  const [showFloatInspector, setShowFloatInspector] = useState(false);
  const [floatNotes, setFloatNotes] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [aiProgress, setAiProgress] = useState(null);
  const [showSpeech, setShowSpeech] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [hideBinder, setHideBinder] = useState(false);
  const [quickRefs, setQuickRefs] = useState([]); // [{id, x, y}]
  // Copyholder: a reference pane beside the editor (and the split), read-only unless toggled.
  const [copyholder, setCopyholder] = useState(null); // {id, editable} | null
  const copyScroll = useRef(new Map()); // doc id -> scrollTop of the copyholder pane
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
  const [printOpts, setPrintOpts] = useState(null); // File > Print Preview: { ids, pageSetup? }
  const [composition, setComposition] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveStateRaw] = useState('salvat');
  // Called on every keystroke: setting the same value still made React re-render App each time.
  const saveStateRef = useRef('salvat');
  const setSaveState = useCallback((v) => {
    if (saveStateRef.current === v) return;
    saveStateRef.current = v;
    setSaveStateRaw(v);
  }, []);
  // Offline queue: edits that could not be written stay in `pending` and are retried by themselves
  // (every 15 s, at once when the folder or the network comes back). Shown in the status bar.
  const [offline, setOffline] = useState(false);
  const [queued, setQueued] = useState(0);
  const queuedRef = useRef(0);
  const retryTimer = useRef(null);
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

  // Word counts per document; only documents whose HTML changed are counted again.
  const countCache = useRef(new Map());
  const counts = useMemo(() => {
    const map = {};
    for (const [id, html] of Object.entries(docs)) {
      const hit = countCache.current.get(id);
      if (hit && hit.html === html) map[id] = hit.n;
      else {
        map[id] = wordCount(html);
        countCache.current.set(id, { html, n: map[id] });
      }
    }
    return map;
  }, [docs]);
  // Character counts, cached the same way (character targets, history): never the whole book again.
  const charCache = useRef(new Map());
  const charsOf = useCallback((id, html) => {
    const hit = charCache.current.get(id);
    if (hit && hit.html === html) return hit.n;
    const n = htmlToText(html || '').length;
    charCache.current.set(id, { html, n });
    return n;
  }, []);

  // Notification when a document reaches its target (Project Targets → notify documents).
  useEffect(() => {
    if (!project || project.targets?.notifyDocuments === false) return;
    for (const n of flatten(project.tree)) {
      if (!n.target || n.targetNotify === false) continue;
      const cur = n.targetType === 'Characters' ? charsOf(n.id, docs[n.id]) : counts[n.id] || 0;
      const prev = prevTargetCounts.current[n.id];
      if (prev != null && targetCrossed(prev, cur, n.target) && typeof Notification !== 'undefined') new Notification(tr('ui.app.tinta_atinsa'), { body: `„${n.title}”: ${n.target}` });
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

  // now = record at once (before showing the history), returns the write's promise.
  const recordHistory = useCallback((now = false) => {
    clearTimeout(historyTimer.current);
    const write = () => {
      if (!dir || !api.recordHistory) return Promise.resolve();
      const pj = projectRef.current;
      const ds = docsNow();
      const chars = (ids) => ids.reduce((n, id) => n + charsOf(id, ds[id]), 0);
      let extra = {};
      if (pj) {
        const trash = new Set(flatten(pj.tree.find((n) => n.root === 'trash').children).map((n) => n.id));
        extra = { draftChars: chars(flatten(pj.tree[0].children).map((n) => n.id)), totalChars: chars(Object.keys(ds).filter((id) => !trash.has(id))) };
      }
      return api.recordHistory(dir, { ...totalsRef.current, ...extra }).catch(() => {});
    };
    if (now === true) return write();
    historyTimer.current = setTimeout(write, HISTORY_DELAY);
    return undefined;
  }, [api, dir, charsOf]);

  const flush = useCallback(async () => {
    for (const h of editorRefs.current.values()) h.flush?.();
    commitTyped();
    clearTimeout(timer.current);
    const items = [...pending.current.entries()];
    pending.current.clear();
    if (!items.length) return;
    let i = 0;
    try {
      for (; i < items.length; i += 1) {
        const [id, kind] = items[i][0].split('|');
        await api.writeDoc(dir, id, kind, items[i][1]);
      }
      setSaveState('salvat');
      if (queuedRef.current) {
        queuedRef.current = 0;
        setQueued(0);
        saveQueue(dir, null);
      }
      recordHistory();
    } catch (e) {
      // Keep the unwritten edits queued (unless newer text replaced them) so the next save retries them.
      for (const [k, html] of items.slice(i)) if (!pending.current.has(k)) pending.current.set(k, html);
      setSaveState(tr('ui.app.eroare_la_salvare'));
      // Only the first failure is reported; the queue then retries quietly until it gets through.
      if (!queuedRef.current) report(e);
      queuedRef.current = pending.current.size;
      setQueued(pending.current.size);
      // Kept on this computer too: closing the app while the folder is away loses nothing.
      saveQueue(dir, queueEntries());
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => flushRef.current?.(), RETRY_DELAY);
    }
  }, [api, dir, report, recordHistory, commitTyped]);

  const flushRef = useRef(null);
  flushRef.current = flush;
  // What the queue stores: the text and the disk version it was written over (for merging later).
  const queueEntries = () =>
    Object.fromEntries([...pending.current].map(([k, html]) => [k, { html, base: k.endsWith('|docs') ? diskDocs.current.get(k.split('|')[0]) : undefined }]));
  // Leaving a project: its unsent edits stay stored under its own folder and never follow into
  // the next project.
  const parkQueue = (fromDir) => {
    if (fromDir && pending.current.size) saveQueue(fromDir, queueEntries());
    pending.current.clear();
    clearTimeout(retryTimer.current);
    queuedRef.current = 0;
    setQueued(0);
  };
  const dirNowRef = useRef(null);
  dirNowRef.current = dir;
  useEffect(() => {
    const back = () => flushRef.current?.();
    window.addEventListener('online', back);
    return () => {
      window.removeEventListener('online', back);
      clearTimeout(retryTimer.current);
    };
  }, []);

  const queueWrite = useCallback(
    (id, kind, html) => {
      pending.current.set(`${id}|${kind}`, html);
      setSaveState(tr('ui.app.se_salveaza'));
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

  // Reload documents changed outside the app (AI agents via MCP, sync clients, the same folder
  // open on another computer). A document with unsaved local edits keeps the local text; the
  // version that arrived is kept as a snapshot and the writer is told (src/lib/syncGuard.js).
  useEffect(() => {
    if (!dir || !api.onProjectChanged) return undefined;
    api.watchProject(dir).catch(() => {});
    return api.onProjectChanged(async ({ dir: changedDir, files, offline, online }) => {
      if (changedDir !== dir) return;
      if (offline) {
        setOffline(true);
        return setToast(tr('ui.app.folder_indisponibil'));
      }
      if (online) {
        setOffline(false);
        setToast(tr('ui.app.folder_din_nou_disponibil'));
        flushRef.current?.(); // send what was queued while the folder was away
      }
      try {
        if (files.some((f) => f === 'project.json')) {
          const before = projectRef.current;
          const res = await (api.reloadProject ? api.reloadProject(dir) : api.openProject(dir));
          if (projectRef.current === before) setProject(res.project);
          // A binder edit made while reading: the reloaded version is now the merge base, so the
          // edit is merged onto it here (saving the older copy would undo the outside change).
          else saveProject(mergeProject(before, projectRef.current, res.project));
        }
        const ids = files.map((f) => /^docs\/([A-Za-z0-9-]+)\.html$/.exec(f)).filter(Boolean).map((m) => m[1]);
        if (!ids.length) return;
        // Typing an editor has not handed over yet counts as a local edit too.
        for (const id of ids) for (const k of [id, `split:${id}`, `copy:${id}`]) editorRefs.current.get(k)?.flush?.();
        const time = new Date().toLocaleTimeString(uiLocale(), { hour: '2-digit', minute: '2-digit' });
        const { updated, merged, theirs, conflicts, clashes } = await pullExternalDocs({
          api,
          dir,
          ids,
          hasLocal: (id) => pending.current.has(`${id}|docs`),
          localHtml: (id) => pending.current.get(`${id}|docs`),
          baseHtml: (id) => diskDocs.current.get(id),
          merge: mergeDoc,
          label: tr('ui.app.versiunea_de_pe_celalalt_calculator', { time }),
        });
        for (const [id, html] of Object.entries(theirs)) diskDocs.current.set(id, html);
        if (Object.keys(merged).length) {
          setDocs((d) => ({ ...d, ...merged }));
          for (const [id, html] of Object.entries(merged)) {
            setEditorHtml(id, html);
            queueWrite(id, 'docs', html);
          }
          setSaveState(tr('ui.app.imbinat_cu_celalalt_calculator'));
        }
        if (Object.keys(updated).length) {
          setDocs((d) => ({ ...d, ...updated }));
          for (const [id, html] of Object.entries(updated)) setEditorHtml(id, html);
          setSaveState(tr('ui.app.actualizat_din_exterior'));
        }
        if (conflicts.length) {
          const titles = conflicts.map((id) => findNode(projectRef.current.tree, id)?.title || id);
          // Paragraph-level clashes: the writer chooses in the dialog, one document at a time.
          const first = conflicts.find((id) => clashes?.[id]);
          setToast(tr('ui.app.editat_in_doua_locuri', { titles: titles.join(', '), time }) + (first ? ` ${tr('ui.conflict.alege_jos')}` : ''));
          // Not opened by itself: a window popping up would take the keyboard while you type.
          if (first) setConflict({ id: first, title: findNode(projectRef.current.tree, first)?.title || first, pieces: clashes[first], html: merged[first] ?? docsNow()[first] });
        }
      } catch (e) {
        report(e);
      }
    });
  }, [api, dir, report]);

  // Conflict copies left by the sync client (OneDrive, Dropbox…) are never loaded: tell the writer.
  useEffect(() => {
    if (!dir || !api.syncConflicts) return;
    api
      .syncConflicts(dir)
      .then((list) => list?.length && setToast(tr('ui.app.copii_in_conflict', { files: list.slice(0, 5).join(', ') + (list.length > 5 ? ', …' : '') })))
      .catch(() => {});
  }, [api, dir]);

  // "Notify when target is reached" (Project Targets): once per session and per target.
  const notified = useRef({});
  useEffect(() => {
    if (!project || project.targets?.notify === false) return;
    const t = project.targets || {};
    const checks = [
      ['session', t.session, Math.max(0, totals.draft - sessionStart), tr('ui.app.ai_atins_tinta_sesiunii')],
      ['draft', t.draft, totals.draft, tr('ui.app.ai_atins_tinta_cartii')],
    ];
    for (const [key, target, value, msg] of checks) {
      if (target > 0 && value >= target && !notified.current[key]) {
        notified.current[key] = true;
        setToast(tr('ui.app.x_x_cuvinte', { msg: msg, v1: value.toLocaleString(uiLocale()) }));
      }
    }
  }, [project, totals.draft, sessionStart]);

  // Remember UI state per project.
  useEffect(() => {
    if (dir) saveUi(dir, { selectedId, view, widths, showInspector, splitId, copyholder });
  }, [dir, selectedId, view, widths, showInspector, splitId, copyholder]);

  const saveProject = useCallback(
    (next) => {
      // Handlers that save twice before the next render (I-EDIT author text, then the
      // editorial stamp) must build on this version, not on the render-time one.
      projectRef.current = next;
      setProject(next);
      api.saveProject(dir, next).catch(report);
    },
    [api, dir, report],
  );

  const setTree = useCallback((tree) => saveProject({ ...project, tree }), [project, saveProject]);
  // Binder structure changes (add, move, trash, restore) are undoable with Ctrl+Z while the
  // binder has focus, as in Scrivener. Metadata edits made in between are preserved.
  const binderHistory = useRef(emptyHistory());
  const [renameId, setRenameId] = useState(null);
  const setTreeU = (tree) => {
    if (tree === project.tree) return;
    binderHistory.current = historyPush(binderHistory.current, project.tree, tree);
    setTree(tree);
  };
  const undoBinder = (redo = false) => {
    const res = (redo ? historyRedo : historyUndo)(binderHistory.current, project.tree);
    if (!res) {
      if ((redo ? binderHistory.current.future : binderHistory.current.past).length) {
        binderHistory.current = emptyHistory();
        setToast(tr('ui.app.nu_se_mai_poate_anula'));
      }
      return;
    }
    binderHistory.current = res.history;
    setTree(res.tree);
    if (selectedId && !findNode(res.tree, selectedId)) {
      const first = res.tree[0];
      setSelectedId(first.id);
      setSelectedIds(new Set([first.id]));
    }
  };
  useEffect(() => {
    binderHistory.current = emptyHistory();
  }, [dir]);

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
      dropTyped();
      diskDocs.current = new Map(entries);
      // A queue left from a session closed while the folder was away: shown and sent now.
      if (dirNowRef.current && dirNowRef.current !== res.dir) parkQueue(dirNowRef.current);
      const left = loadQueue(res.dir);
      if (left) {
        const ids = new Set(all.map((n) => n.id));
        let n = 0;
        for (const [k, item] of Object.entries(left)) {
          const [id, kind] = k.split('|');
          if (!ids.has(id)) continue; // deleted meanwhile: not recreated
          let html = typeof item === 'string' ? item : item?.html;
          if (typeof html !== 'string') continue;
          const base = typeof item === 'object' ? item.base : undefined;
          if (kind === 'docs') {
            // Changed on disk since (another computer): merged, never overwritten blindly.
            const disk = cache[id] ?? '';
            if (base !== undefined && disk !== base && disk !== html) {
              const r = mergeDoc(base, html, disk);
              html = r.html;
              if (r.conflicts) api.takeSnapshot(res.dir, id, tr('ui.app.versiunea_de_pe_celalalt_calculator', { time: '' })).catch(() => {});
            }
            cache[id] = html;
          }
          pending.current.set(k, html);
          n++;
        }
        if (n) {
          queuedRef.current = n; // cleared (with the stored copy) once written
          setQueued(n);
          setToast(tr('ui.sync.recuperat', { n }));
          setTimeout(() => flushRef.current?.(), 0);
        } else saveQueue(res.dir, null);
      }
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
      setCopyholder(ui.copyholder?.id && findNode(res.project.tree, ui.copyholder.id) ? { id: ui.copyholder.id, editable: Boolean(ui.copyholder.editable) } : null);
      const openCounts = Object.fromEntries(entries.map(([id, h]) => [id, wordCount(h)]));
      const draftAtOpen = sumWords(res.project.tree[0], openCounts);
      setSessionStart(draftAtOpen);
      const sOpen = settingsRef.current?.sharingSync || {};
      if (res.project.syncFolder && (res.project.syncAuto || sOpen.syncOnOpen) && api.syncAuto) {
        api.syncAuto(res.dir, { ...res.project, syncAuto: true, syncFormat: res.project.syncFormat || sOpen.format || 'rtf' }, 'open').then((r) => r?.action === 'in' && setToast(tr('ui.app.sincronizare_automata_x_actualizate_x', { length: r.updated.length, length1: r.created.length }))).catch(() => {});
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
    parkQueue(dir);
    if (project?.syncFolder && (project.syncAuto || settings?.sharingSync?.syncOnClose)) await api.syncAuto?.(dir, { ...withSyncDefaults(project), syncAuto: true }, 'close').catch(() => {});
    api.releaseProject?.().catch(() => {});
    setProject(null);
    setDir(null);
    dropTyped();
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
    if (alt && shift) {
      openCopyholder(id);
      return;
    }
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

  // I-EDIT author text: paragraphs the writer changes by hand. authorBase holds, per document,
  // the text before the current run of hand edits; commitAuthor() diffs it against the newest
  // text, journals one row per changed chunk and records the new paragraphs as author text
  // (node.authorHashes). Programmatic writes (AI proposals, merges, replace) are not author text.
  const authorBase = useRef(new Map());
  const authorTimer = useRef(null);
  const [authorEvent, setAuthorEvent] = useState({ seq: 0 });
  const commitAuthor = (only, extra = {}) => {
    const ids = only ? [only].filter((id) => authorBase.current.has(id) || extra[id]) : [...authorBase.current.keys()];
    if (!only) clearTimeout(authorTimer.current);
    if (!ids.length || !dir) return;
    const pj = projectRef.current;
    const now = docsNow();
    let tree = pj.tree;
    const events = [];
    for (const id of ids) {
      const node = findNode(tree, id);
      const x = extra[id];
      const base = x ? x.base : authorBase.current.get(id);
      const after = x ? x.after : now[id] || '';
      if (!x) authorBase.current.delete(id);
      if (!node || base === undefined || base === after) continue;
      const chunks = diffParagraphs(base, after);
      if (!chunks.length) continue;
      const rows = journalRows(id, node.title, chunks);
      api.appendAuthorJournal?.(dir, rows).catch(report);
      const prev = node.authorHashes || [];
      // Edited in the I-EDIT preview: the author's words are what differs from the model's proposal.
      const own = x && x.authorFrom !== undefined ? diffParagraphs(x.authorFrom, after) : chunks;
      const next = updateAuthorHashes(prev, after, own.flatMap((c) => c.newHashes));
      if (next.length !== prev.length || next.some((h, i) => h !== prev[i])) tree = updateNode(tree, id, { authorHashes: next });
      events.push({ id, title: node.title, rows, chunks });
    }
    team.record(events);
    if (tree !== pj.tree) saveProject({ ...pj, tree });
    if (events.length) setAuthorEvent((e) => ({ seq: e.seq + 1, events }));
  };
  const commitAuthorRef = useRef(commitAuthor);
  commitAuthorRef.current = commitAuthor;
  const noteHandEdit = (id) => {
    if (!authorBase.current.has(id)) authorBase.current.set(id, docsNow()[id] ?? '');
    clearTimeout(authorTimer.current);
    authorTimer.current = setTimeout(() => commitAuthorRef.current(), AUTHOR_COMMIT_DELAY);
  };
  useEffect(() => {
    const onUnload = () => commitAuthorRef.current();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      commitAuthorRef.current();
    };
  }, [dir]);

  const writeDocNow = (id, html, { hand = false } = {}) => {
    // A programmatic write closes the run of hand edits first: they stay the writer's.
    if (!hand && authorBase.current.has(id)) commitAuthor(id);
    typed.current.set(id, html);
    queueWrite(id, 'docs', html);
    clearTimeout(typedTimer.current);
    typedTimer.current = setTimeout(commitTyped, TYPED_COMMIT_DELAY);
  };
  // Content changed outside the editors (replace all, merge, AI, snapshots…): push it into every
  // open editor of that document — the main/Scrivenings one and the split pane — otherwise a
  // stale pane writes the old text back on its next edit.
  const setEditorHtml = (id, html) => {
    editorRefs.current.get(id)?.setHtml(html);
    editorRefs.current.get(`split:${id}`)?.setHtml(html);
    editorRefs.current.get(`copy:${id}`)?.setHtml(html);
  };
  // Same document open in both panes: an edit in one is pushed into the other editor.
  const writeSynced = (id, html, from) => {
    if (settings?.autoBacklinks) {
      const added = addedLinks(docsNow()[id], html);
      const pj = projectRef.current;
      const tree = added.length ? addBacklinks(pj.tree, id, added) : pj.tree;
      if (tree !== pj.tree) saveProject({ ...pj, tree });
    }
    noteHandEdit(id);
    writeDocNow(id, html, { hand: true });
    const others = [from !== 'main' && editorRefs.current.get(id), from !== 'split' && id === splitId && editorRefs.current.get(`split:${id}`), from !== 'copy' && editorRefs.current.get(`copy:${id}`)];
    for (const other of others) if (other && other.getHtml() !== html) other.setHtml(html);
  };

  // New items go after the selection (inside it when it is a folder), are selected and put in
  // rename mode in the binder (Scrivener); Enter on the title then moves the cursor to the editor.
  const addItem = (type, title, html, anchorId = selectedId) => {
    const node = newNode(type, title);
    setTreeU(insertNear(project.tree, anchorId, node));
    if (!title && !hideBinder) setRenameId(node.id);
    const content = html ?? (type === 'text' ? '<p></p>' : '');
    setDocs((d) => ({ ...d, [node.id]: content }));
    if (content) api.writeDoc(dir, node.id, 'docs', content).catch(report);
    go(node.id);
    if (view !== 'corkboard') setView('editor');
    return node;
  };

  // Puts the cursor in the editor of a document once it is mounted (after go()).
  const focusEditor = (id, tries = 10) => {
    const h = id && editorRefs.current.get(id);
    if (h?.focus) h.focus();
    else if (tries > 0) setTimeout(() => focusEditor(id, tries - 1), 50);
  };
  const patchNode = (id, patch) => setTree(updateNode(project.tree, id, patch));

  const trashSelection = () => {
    let tree = project.tree;
    const ids = [...(selectedIds.size ? selectedIds : [selectedId])].filter((id) => {
      const n = findNode(tree, id);
      return n && !n.root && !inTrash(id);
    });
    if (!ids.length) {
      if (selectedId && inTrash(selectedId)) setToast(tr('ui.app.elementul_e_deja_in_cos'));
      return;
    }
    const nextSel = selectionAfterRemoval(tree, ids);
    for (const id of ids) tree = moveToTrash(tree, id);
    setTreeU(tree);
    // like Scrivener: the selection moves to the neighbour, not into the trash
    const sel = nextSel && findNode(tree, nextSel) ? nextSel : tree[0].id;
    setSelectedId(sel);
    setSelectedIds(new Set([sel]));
  };

  // --- Batch A: binder and document commands ---
  const selectionList = () => (selectedIds.size ? [...selectedIds] : selectedId ? [selectedId] : []).filter((id) => {
    const n = findNode(project.tree, id);
    return n && !n.root;
  });
  const restoreSelection = () => {
    const tree = restoreManyFromTrash(project.tree, selectionList());
    if (tree !== project.tree) setTreeU(tree);
    else setToast(tr('ui.app.selectia_nu_e_in_cos'));
  };
  const moveSelectionTo = (targetId) => setTreeU(moveManyInto(project.tree, selectionList(), targetId));
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
    if (!html) return setToast(tr('ui.app.selecteaza_mai_intai_un_text'));
    await flush();
    const current = docsNow()[targetId] ?? (await api.readDoc(dir, targetId, 'docs'));
    const next = appendHtml(current, html);
    writeDocNow(targetId, next);
    setEditorHtml(targetId, next);
    setToast(tr('ui.app.selectia_a_fost_adaugata_la', { v0: findNode(project.tree, targetId)?.title }));
  };
  const openScrivenings = (title, ids) => {
    if (!ids.length) return setToast(tr('ui.app.nimic_de_afisat_in_scrivenings'));
    loadAllDocs()
      .then(() => {
        setScrivList({ title, ids });
        setView('editor');
      })
      .catch(report);
  };
  const selectedText = () => (editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId))?.getSelectionText() || '';
  const openWeb = (url) => (api.openLink ? api.openLink(url).catch(report) : window.open(url, '_blank', 'noopener'));
  // Word or phrase lookups; translation takes the whole selection, dictionaries a short phrase.
  const lookupWord = (kind) => {
    const text = selectedText().trim();
    if (!text) return setToast(tr('ui.app.selecteaza_un_cuvant'));
    const url = lookupUrl(kind, text, { from: settings.translateFrom || 'auto', to: settings.translateTo || 'ro' });
    if (!url) return setToast(tr('ui.app.selectie_prea_lunga'));
    return openWeb(url);
  };
  const aiOnSelection = (action) => {
    if (!aiEnabled) return setToast(tr('ui.app.ai_oprit'));
    setShowAi(true);
    setAiRequest((r) => ({ action, n: (r?.n || 0) + 1 }));
    return undefined;
  };
  // NotebookLM has no search link: the selection goes to the clipboard and the notebook opens.
  const askNotebookLm = async () => {
    const text = selectedText().trim();
    if (!text) return setToast(tr('ui.app.selecteaza_un_cuvant'));
    try {
      await navigator.clipboard.writeText(text);
      await api.nlmOpen();
      setToast(tr('ui.app.nlm_lipeste'));
    } catch (e) {
      report(e);
    }
    return undefined;
  };
  // In-app translation (DeepL / Google) and grammar check (LanguageTool) of the selection; the
  // keys stay in the main process. The editor that held the selection receives the result.
  // The document range holding exactly `source` (the trimmed selection), so the result replaces
  // that text and not the spaces around it nor wherever the caret is when the user clicks Replace.
  const serviceRange = (ed, source) => {
    if (!ed) return null;
    let { from, to } = ed.state.selection;
    const text = (a, b) => ed.state.doc.textBetween(a, b, '\n\n'); // as Editor getSelectionText
    while (from < to && /^\s/.test(text(from, Math.min(from + 1, to)))) from += 1;
    while (to > from && /\s$/.test(text(Math.max(to - 1, from), to))) to -= 1;
    return text(from, to) === source ? { from, to } : null;
  };
  // Puts `text` in place of the range captured by runService (when it still holds the source).
  // One line keeps the formatting of the range; grammar `edits` change only the corrected spans.
  const applyServiceText = (sr, text, after = false, edits = null) => {
    const ed = sr.handle?.editor;
    if (!ed) return;
    const { range, source } = sr;
    const ok = range && range.to <= ed.state.doc.content.size && ed.state.doc.textBetween(range.from, range.to, '\n\n') === source;
    if (!ok) return setToast(tr('ui.app.textul_s_a_schimbat'));
    if (edits && applyTextEdits(ed, range, source, edits)) return undefined;
    if (!/[\r\n]/.test(text)) return void replaceRangeText(ed, range, text, after);
    const at = after ? { from: range.to, to: range.to } : range;
    ed.chain().focus().insertContentAt(at, textToHtml(text)).run();
    return undefined;
  };
  const runService = async (kind, service) => {
    const handle = editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId);
    const source = (handle?.getSelectionText() || '').trim();
    if (!source) return setToast(tr('ui.app.selecteaza_un_cuvant'));
    const range = serviceRange(handle.editor, source);
    const label = kind === 'grammar' ? 'LanguageTool' : service === 'google' ? 'Google Translate' : 'DeepL';
    setToast(tr('ui.services.lucrez', { service: label }));
    try {
      const result = kind === 'grammar'
        ? { kind, ...(await api.checkGrammar({ text: source, language: settings.grammarLanguage || 'auto' })) }
        : { kind, ...(await api.translateText({ service, text: source })) };
      setServiceResult({ source, result, handle, range });
    } catch (e) {
      report(e);
    } finally {
      setToast('');
    }
    return undefined;
  };
  const searchProjectFor = () => {
    const text = selectedText().trim();
    if (!text) return setToast(tr('ui.app.selecteaza_un_cuvant'));
    setFindSeed(text.slice(0, 200));
    setDialog('find');
    return undefined;
  };
  // Research panel: passages from the project's own documents and notes; with AI, an answer citing them.
  const researchSelection = (mode) => {
    const text = selectedText().trim();
    if (!text) return setToast(tr('ui.app.selecteaza_un_cuvant'));
    setShowResearch(true);
    setResearchRequest((r) => ({ q: text.slice(0, 500), mode, n: (r?.n || 0) + 1 }));
    return undefined;
  };
  // Translator's glossary: the term goes to the "Glosar…" research document (created when missing).
  const addToGlossary = async () => {
    const term = selectedText().trim().replace(/\s+/g, ' ');
    if (!term) return setToast(tr('ui.app.selecteaza_un_cuvant'));
    if (term.length > 120) return setToast(tr('ui.app.selectie_prea_lunga'));
    const found = findGlossaryDoc(project);
    const research = found.research;
    let node = found.node;
    const line = glossaryEntryHtml(term);
    try {
      if (node) {
        const html = docsNow()[node.id] ?? ((await api.readDoc(dir, node.id, 'docs')) || '');
        if (glossaryHasTerm(html, term)) return setToast(tr('ui.app.deja_in_glosar', { term }));
        const next = html + line;
        setDocs((d) => ({ ...d, [node.id]: next }));
        setEditorHtml(node.id, next);
        await api.writeDoc(dir, node.id, 'docs', next);
      } else {
        node = newNode('text', tr('ui.app.glosar'));
        setTree(updateNode(project.tree, research.id, { children: [...(research.children || []), node] }));
        setDocs((d) => ({ ...d, [node.id]: line }));
        await api.writeDoc(dir, node.id, 'docs', line);
      }
      setToast(tr('ui.app.adaugat_in_glosar', { term, title: node.title }));
    } catch (e) {
      report(e);
    }
    return undefined;
  };
  const autoSynopsisSelection = async () => {
    let tree = project.tree;
    let n = 0;
    for (const id of selectionList()) {
      const node = findNode(tree, id);
      if (node.type !== 'text') continue;
      const html = docsNow()[id] ?? (await api.readDoc(dir, id, 'docs'));
      const syn = autoSynopsis(htmlToText(html || ''));
      if (syn) {
        tree = updateNode(tree, id, { synopsis: syn });
        n += 1;
      }
    }
    setTree(tree);
    setToast(tr('ui.app.sinopsis_generat_pentru_x_documente', { n: n }));
  };
  const snapshotSelection = async () => {
    await flush();
    const stamp = `Snapshot ${new Date().toLocaleString(uiLocale())}`;
    const ids = selectionList().filter((id) => findNode(project.tree, id).type === 'text');
    for (const id of ids) await api.takeSnapshot(dir, id, stamp);
    setToast(tr('ui.app.snapshot_salvat_pentru_x_documente', { length: ids.length }));
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
    const layout = { name, view, showInspector, showAi, showEditorial, hideBinder, widths, editorView, split: Boolean(splitId), copyholder };
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
    setCopyholder(l.copyholder?.id && findNode(project.tree, l.copyholder.id) ? l.copyholder : null);
  };
  const openCopyholder = (id) => {
    const node = id && findNode(project.tree, id);
    if (node && !node.root && !node.children) setCopyholder((c) => ({ id, editable: c?.id === id ? c.editable : false }));
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
    const html = docsNow()[tpl.id] ?? (await api.readDoc(dir, tpl.id, 'docs'));
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
        const node = mediaNode(newNode, it);
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
    let tree = projectRef.current.tree;
    const copies = {};
    for (const id of ids) {
      const res = duplicateNode(tree, id, { withChildren: true });
      if (!res.id) continue;
      tree = moveNode(res.tree, res.id, targetId, pos);
      for (const [from, to] of res.pairs) {
        const html = docsNow()[from] ?? (await api.readDoc(dir, from, 'docs'));
        const notes = await api.readDoc(dir, from, 'notes');
        if (html) {
          copies[to] = html;
          await api.writeDoc(dir, to, 'docs', html);
        }
        if (notes) await api.writeDoc(dir, to, 'notes', notes);
      }
    }
    binderHistory.current = historyPush(binderHistory.current, projectRef.current.tree, tree);
    saveProject({ ...projectRef.current, tree });
    setDocs((d) => ({ ...d, ...copies }));
  };

  // Duplicates the selected item (with its notes, synopsis and, optionally, children).
  const duplicateSelection = async (withChildren) => {
    const node = selectedId && findNode(project.tree, selectedId);
    if (!node || node.root) return;
    await flush();
    const { tree, pairs, id } = duplicateNode(projectRef.current.tree, node.id, { withChildren });
    if (!id) return;
    saveProject({ ...projectRef.current, tree });
    const copies = {};
    for (const [from, to] of pairs) {
      const html = docsNow()[from] ?? (await api.readDoc(dir, from, 'docs'));
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
    await api.takeSnapshot(dir, id, tr('ui.app.automat_inainte_de_impartire')).catch(report);
    const second = newNode('text', parts.title || tr('ui.app.x_continuare', { title: node.title }));
    second.label = node.label;
    second.status = node.status;
    const tree = produce(projectRef.current.tree, (t) => {
      const parent = findParent(t, id);
      const list = parent ? parent.children : t;
      list.splice(list.findIndex((n) => n.id === id) + 1, 0, second);
    });
    saveProject({ ...projectRef.current, tree });
    setEditorHtml(id, parts.before);
    writeDocNow(id, parts.before);
    setDocs((d) => ({ ...d, [second.id]: parts.after }));
    await api.writeDoc(dir, second.id, 'docs', parts.after).catch(report);
    go(second.id);
    focusEditor(second.id); // Scrivener: the cursor continues in the new part
  };

  const mergeSelection = async () => {
    const nodes = inOrder(project.tree, [...selectedIds]).filter((n) => n.type === 'text' && !n.root);
    if (nodes.length < 2) {
      report(new Error(tr('ui.app.selecteaza_cel_putin_doua_documente')));
      return;
    }
    if (!window.confirm(tr('ui.app.unesti_x_documente_in_x', { length: nodes.length, title: nodes[0].title }))) return;
    await flush();
    const [first, ...rest] = nodes;
    await api.takeSnapshot(dir, first.id, tr('ui.app.automat_inainte_de_unire')).catch(report);
    const html = nodes.map((n) => docsNow()[n.id] || '').join('<p>* * *</p>');
    const notes = await Promise.all(nodes.map((n) => api.readDoc(dir, n.id, 'notes')));
    const synopsis = nodes.map((n) => n.synopsis).filter(Boolean).join('\n');
    const keywords = [...new Set(nodes.flatMap((n) => n.keywords || []))];
    let tree = updateNode(projectRef.current.tree, first.id, { synopsis, ...(keywords.length ? { keywords } : {}) });
    // Documents nested under a merged one stay in the book: they move under the first document.
    for (const n of rest) for (const c of findNode(tree, n.id)?.children || []) tree = moveNode(tree, c.id, first.id, 'inside');
    for (const n of rest) tree = moveToTrash(tree, n.id);
    saveProject({ ...projectRef.current, tree });
    writeDocNow(first.id, html);
    const mergedNotes = notes.filter((h) => htmlToText(h).trim()).join('<hr>');
    if (mergedNotes) queueWrite(first.id, 'notes', mergedNotes);
    setEditorHtml(first.id, html);
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
    const docs = docsNow();
    const results = searchProject(project, docs, notesById, criteria);
    const nodeUpdates = [];
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
      await api.takeSnapshot(dir, node.id, tr('ui.app.automat_inainte_de_inlocuire')).catch(report);
      if (docHtml !== (docs[node.id] || '')) {
        await api.writeDoc(dir, node.id, 'docs', docHtml);
        nextDocs[node.id] = docHtml;
      }
      if (fields.includes('notes') && notesHtml !== (notesById[node.id] || '')) await api.writeDoc(dir, node.id, 'notes', notesHtml);
      nodeUpdates.push([node.id, { title: current.title, synopsis: current.synopsis }]);
      total += count;
    }
    // Snapshots and writes above are awaited: build on the project as it is now, not as it was at the start.
    if (nodeUpdates.length) saveProject({ ...projectRef.current, tree: nodeUpdates.reduce((t, [id, patch]) => updateNode(t, id, patch), projectRef.current.tree) });
    setDocs((d) => ({ ...d, ...nextDocs }));
    for (const [id, html] of Object.entries(nextDocs)) setEditorHtml(id, html);
    recordHistory();
    return total;
  };

  const replaceAllInProject = async (ids, re, replacement) => {
    await flush();
    const docs = docsNow();
    let total = 0;
    const next = {};
    const nodeUpdates = [];
    for (const id of ids) {
      const node = findNode(projectRef.current.tree, id);
      if (!node || node.locked || team.lockOf(id)) continue; // locked documents are left as they are
      // Titles and synopses too: the dialog lists matches there.
      const r = replaceInFields(node, docs[id] || '', '', re, replacement, ['title', 'synopsis', 'text']);
      if (!r.count) continue;
      await api.takeSnapshot(dir, id, tr('ui.app.automat_inainte_de_inlocuire')).catch(report);
      if (r.docHtml !== (docs[id] || '')) {
        await api.writeDoc(dir, id, 'docs', r.docHtml);
        next[id] = r.docHtml;
      }
      if (r.node.title !== node.title || r.node.synopsis !== node.synopsis) nodeUpdates.push([id, { title: r.node.title, synopsis: r.node.synopsis }]);
      total += r.count;
    }
    if (nodeUpdates.length) saveProject({ ...projectRef.current, tree: nodeUpdates.reduce((t, [id, patch]) => updateNode(t, id, patch), projectRef.current.tree) });
    setDocs((d) => ({ ...d, ...next }));
    for (const [id, html] of Object.entries(next)) setEditorHtml(id, html);
    recordHistory();
    return total;
  };

  // baseTree: lets a caller that also adds other nodes save everything in one project write.
  const importParts = (parts, baseTree = projectRef.current.tree) => {
    let tree = baseTree;
    let anchor = selectedId;
    const created = [];
    for (const p of parts) {
      const node = newNode('text', p.title);
      tree = insertNear(tree, anchor, node);
      if (findNode(tree, anchor)?.children === undefined) anchor = node.id;
      created.push([node.id, p.html || '<p></p>']);
    }
    saveProject({ ...projectRef.current, tree });
    setDocs((d) => ({ ...d, ...Object.fromEntries(created) }));
    Promise.all(created.map(([id, html]) => api.writeDoc(dir, id, 'docs', html))).catch(report);
    if (created.length) go(created[0][0]);
  };

  // OPML outline → binder items with synopsis, label and status names.
  const importOpmlOutline = async () => {
    const items = await api.importOpml();
    if (!items || !items.length) return;
    let tree = project.tree;
    let anchor = selectedId;
    for (const node of opmlToNodes(items, project, newNode, tr('ui.app.fara_titlu'))) {
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
    // The download can take seconds; the binder may have changed meanwhile.
    const pj = projectRef.current;
    let tree = insertNear(pj.tree, selectedId, node);
    for (const m of page.media || []) tree = insertNear(tree, node.id, mediaNode(newNode, m));
    saveProject({ ...pj, tree });
    setDocs((d) => ({ ...d, [node.id]: page.html }));
    await api.writeDoc(dir, node.id, 'docs', page.html);
    go(node.id);
  };
  // Research chat: new documents appended to the Research folder (or a named subfolder of it).
  const addResearchDocs = async (items, folderTitle = '') => {
    const pj = projectRef.current;
    let tree = pj.tree;
    const research = tree.find((n) => n.root === 'research');
    if (!research) return [];
    let parentId = research.id;
    if (folderTitle) {
      const existing = (research.children || []).find((n) => n.type === 'folder' && n.title === folderTitle);
      if (existing) parentId = existing.id;
      else {
        const folder = { ...newNode('folder', folderTitle), children: [] };
        tree = updateNode(tree, research.id, { children: [...(research.children || []), folder] });
        parentId = folder.id;
      }
    }
    const created = [];
    for (const it of items) {
      const node = newNode('text', it.title || tr('ui.app.fara_titlu'));
      const parent = findNode(tree, parentId);
      tree = updateNode(tree, parentId, { children: [...(parent.children || []), node] });
      for (const m of it.media || []) tree = insertNear(tree, node.id, mediaNode(newNode, m));
      created.push([node.id, it.html || '<p></p>']);
    }
    saveProject({ ...pj, tree });
    setDocs((d) => ({ ...d, ...Object.fromEntries(created) }));
    await Promise.all(created.map(([id, html]) => api.writeDoc(dir, id, 'docs', html)));
    // Index the new sources right away so the next question can use them.
    if (api.ragBuild) api.ragBuild(dir).catch(() => {});
    return created.map(([id]) => id);
  };
  const importWebSource = async () => {
    const url = window.prompt(tr('ui.researchChat.pagina_web_adresa'), 'https://');
    if (!url || url === 'https://') return false;
    await flush();
    const page = await api.importWebPage(url, dir);
    await addResearchDocs([{ title: page.title || url, html: page.html, media: page.media }]);
    return true;
  };
  const importFilesCmd = async (mode = 'none', separator = '#') => {
    const res = await api.importFiles(dir, mode, separator);
    if (!res) return;
    // Media first, then the texts on top of that tree: two separate saves from the same
    // `project` snapshot made the second one drop the first one's items.
    const pj = projectRef.current;
    let tree = pj.tree;
    for (const m of res.media) {
      const node = mediaNode(newNode, m);
      tree = insertNear(tree, selectedId, node);
    }
    if (res.texts.length) importParts(res.texts, tree);
    else if (res.media.length) saveProject({ ...pj, tree });
  };
  const saveAs = async () => {
    const title = window.prompt(tr('ui.app.titlul_copiei'), tr('ui.app.x_copie', { title: project.title }));
    if (!title) return;
    await flush();
    const copy = await api.saveProjectAs(dir, title);
    if (copy) await openResult(copy);
  };
  // File > Print Preview / Print: current document or selected binder documents, with the Page Setup.
  const openPrintPreview = (pageSetup) =>
    flush()
      .then(() => {
        setPrintOpts({ ids: selectionList(), ...(pageSetup ? { pageSetup } : {}) });
        setDialog('printPreview');
      })
      .catch(report);
  const printCurrent = () => {
    if (api.printDocuments && dir) {
      flush().then(() => api.printDocuments(dir, projectRef.current, { ids: selectionList() })).catch(report);
      return;
    }
    const html = docsNow()[selectedId];
    if (html == null) return;
    api.printDocument(`<h1>${(selected?.title || '').replace(/</g, '&lt;')}</h1>${html}`, selected?.title).catch(report);
  };

  const words = useMemo(() => (project ? projectWords(project, docs) : []), [project, docs]);
  // Character count for the status bar: htmlToText parses the whole document, so only redo it
  // when that document's text changes.
  const selectedHtml = selectedId ? docs[selectedId] || '' : '';
  const statusChars = useMemo(() => htmlToText(selectedHtml).replace(/\s+/g, ' ').trim().length, [selectedHtml]);
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
      const text = htmlToText(docsNow()[n.id]);
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
        // Esc closes only the top-most layer: a dialog, menu or find bar handles its own Esc
        // (the target may already be detached when the layer closed, closest() still works).
        const layer = e.target?.closest?.('.modal-backdrop, .modal, .menu-pop, .ctx-menu, .find-bar, .help-window, input, textarea, select');
        if (!layer) setComposition(false);
        return;
      }
      const combo = keyFromEvent(e);
      if (!combo) return;
      // A dialog is open: only Save still works behind it.
      const inDialog = document.querySelector('.modal-backdrop');
      // Typing in a field outside the editor: plain, Shift- or Alt-only keys belong to the field.
      const field = e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
      const inField = field && !field.closest('.ProseMirror') && !(e.ctrlKey || e.metaKey) && !/^F\d+$/.test(e.key);
      for (const [id, cmd] of Object.entries(commandsRef.current)) {
        if ((inDialog && id !== 'save') || inField) continue;
        if (cmd.key && cmd.key === combo && !cmd.disabled) {
          e.preventDefault();
          cmd.run();
          return;
        }
      }
    };
    // Ctrl+Shift app shortcuts typed in the editor run before the editor sees the key, so it does
    // not also apply its own formatting on the same keys (Ctrl+Shift+E centring, +S strike…).
    const onEditorKey = (e) => {
      if (!project || !(e.ctrlKey || e.metaKey) || !e.shiftKey || !e.target?.closest?.('.ProseMirror')) return;
      if (document.querySelector('.modal-backdrop')) return;
      const combo = keyFromEvent(e);
      const cmd = combo && Object.values(commandsRef.current).find((c) => c.key === combo && !c.disabled);
      if (!cmd) return;
      e.preventDefault();
      e.stopPropagation();
      cmd.run();
    };
    window.addEventListener('keydown', onEditorKey, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onEditorKey, true);
      window.removeEventListener('keydown', onKey);
    };
  });
  // Format bar layout (customizable) is published for every FormatBar.
  useEffect(() => {
    if (settings) setFormatLayout(toolbarPrefs(settings.toolbars).format);
  }, [settings]);
  // Native application menu: send the menu built from the registry whenever it changes.
  const lastMenu = useRef('');
  const menuLayoutRef = useRef(null);
  const menuActionsRef = useRef({});
  useEffect(() => {
    if (!api.setAppMenu || !project) return;
    const { spec, actions } = nativeMenuSpec(menuLayoutRef.current || []);
    menuActionsRef.current = actions;
    const json = JSON.stringify(spec);
    if (json === lastMenu.current) return;
    lastMenu.current = json;
    api.setAppMenu(spec).catch(() => {});
  });
  // Native application menu: commands come back by id.
  useEffect(() => {
    if (!api.onMenuCommand) return undefined;
    return api.onMenuCommand((id) => (commandsRef.current[id] ? commandsRef.current[id].run() : menuActionsRef.current[id]?.()));
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

  if (!settings) return <div className="loading">{tr('ui.app.se_incarca')}</div>;

  if (!project) {
    return (
      <>
        <DialogA11y />
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
            initialTab={settingsTab}
            onShortcuts={project ? () => setDialog('shortcuts') : undefined}
            api={api}
            settings={settings}
            project={null}
            onClose={async () => {
              setDialog(null);
              setSettingsTab('');
              setSettings(await api.getSettings());
            }}
            onError={report}
          />
        )}
        <ReportUi api={api} open={reportOpen} setOpen={setReportOpen} prompt={errorPrompt} setPrompt={setErrorPrompt} onDone={setToast} />
        <Toasts error={error} onCloseError={() => setError('')} toast={toast} onCloseToast={() => setToast('')} />
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
  const copyNode = copyholder ? findNode(project.tree, copyholder.id) : null;
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
    // Read live: new or learned replacements apply without rebuilding the editors.
    getReplacements: replacementsNow,
    onLearn: settings.learnCorrections === false ? null : learnFromEdit,
  };
  const corrKey = JSON.stringify(corrections);
  const toolbars = toolbarPrefs(settings.toolbars);
  // AI is optional: with it off, every feature that needs Claude is hidden and nothing else changes.
  const aiEnabled = settings.aiEnabled !== false;
  // Loads every text document of the project into memory (views and AI jobs over the whole book).
  const loadAllDocs = async () => {
    const loaded = {};
    const have = docsNow();
    for (const n of flatten(project.tree)) {
      if (n.type === 'text' && have[n.id] === undefined) loaded[n.id] = await api.readDoc(dir, n.id, 'docs');
    }
    // Merge, not replace: text typed while the documents were being read must not be lost.
    if (Object.keys(loaded).length) setDocs((d) => ({ ...loaded, ...d }));
    return { ...loaded, ...docsNow() };
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
    if (!list.length) return setToast(tr('ui.app.toate_documentele_au_deja_sinopsis'));
    const res = await api.aiBulkSynopsis(dir, list);
    let tree = project.tree;
    for (const [id, syn] of Object.entries(res.results)) tree = updateNode(tree, id, { synopsis: String(syn).trim() });
    saveProject({ ...project, tree });
    setToast(tr('ui.app.xsinopsis_scris_pentru_x_documentex', { v0: res.cancelled ? tr('ui.app.anulat') : '', length: Object.keys(res.results).length, v2: Object.keys(res.errors).length ? tr('ui.app.x_erori', { n: Object.keys(res.errors).length }) : '' }));
  };
  const runConsistency = async () => {
    const res = await api.aiConsistency(dir, await manuscriptDocs(), project.livingSheets || null, '');
    saveProject({ ...project, livingSheets: res.sheets });
    setAiReport({ title: tr('ui.app.consistenta_pe_toata_carteax', { v0: res.cancelled ? tr('ui.app.anulata_fise_partiale') : '' }), findings: res.findings });
  };
  const runZoomReview = async (levels) => {
    const res = await api.aiZoomReview(dir, await manuscriptDocs(), levels, '');
    setAiReport({ title: tr('ui.app.revizie_pe_niveluri_de_zoomx', { v0: res.cancelled ? tr('ui.app.anulata_rezultate_partiale') : '' }), findings: res.findings });
  };
  const exportScrivCmd = async () => {
    await flush();
    const r = await api.exportScriv(dir, project);
    if (r) setToast(tr('ui.app.exportat_ca_proiect_scrivener_x', { dir: r.dir }));
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
    setToast(tr('ui.app.sincronizare_x_actualizate_x_conflicte', { length: r.updated.length, length1: r.conflicts.length, length2: r.created.length }));
  };
  // Glossaries and print TOC as documents in Research (replaced when generated again).
  const generateGlossaries = async () => {
    await flush();
    const book = await collectBookDocs(project, (id) => docsNow()[id] ?? api.readDoc(dir, id, 'docs'));
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
        await api.takeSnapshot(dir, id, tr('ui.app.inainte_de_regenerare'));
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
    setToast(tr('ui.app.glosare_generate_in_cercetare_x', { length: alogen.terms.length, v1: reading.terms?.length ?? 0, length2: toc.entries.length }));
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
  // [[New title]] → new document (same folder as the current one, or the chosen folder, which is
  // remembered per project as the default).
  const linkFolders = flatten(project.tree)
    .filter((n) => n.children && !inTrash(n.id) && n.root !== 'trash')
    .map((n) => ({ id: n.id, title: n.title }));
  const createLinkedDoc = (fromId) => (label, folderId) => {
    const node = newNode('text', label);
    const pj = projectRef.current;
    const tree = insertLinkedDoc(pj.tree, fromId, folderId, node);
    binderHistory.current = historyPush(binderHistory.current, pj.tree, tree);
    saveProject({ ...pj, tree, newLinkFolderId: folderId || '' });
    setDocs((d) => ({ ...d, [node.id]: '<p></p>' }));
    api.writeDoc(dir, node.id, 'docs', '<p></p>').catch(report);
    return node;
  };
  const openLink = (id) => {
    if (findNode(project.tree, id)) {
      go(id);
      setView('editor');
    } else report(new Error(tr('ui.app.documentul_legat_nu_mai_exista')));
  };
  const chapterFolder = selected && selected.children ? selected : findParent(project.tree, selectedId) || project.tree[0];
  const chapterDocs = flatten(chapterFolder.children || [])
    .filter((n) => n.type === 'text' && !inTrash(n.id))
    .map((n) => ({ id: n.id, title: n.title, html: docs[n.id] || '' }));

  const templateFolder = project.templateFolder ? findNode(project.tree, project.templateFolder) : null;
  const favorites = flatten(project.tree).filter((n) => n.favorite && !inTrash(n.id));
  const canContain = selected && !selected.root && selected.type !== 'file';

  const documentMenu = [
    { label: tr('cmd.findDoc'), shortcut: 'Ctrl+F', action: () => (editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId))?.openFind() },
    { label: tr('cmd.split'), shortcut: 'Ctrl+K', action: () => splitDocument(false) },
    { label: tr('cmd.splitTitle'), shortcut: 'Ctrl+Shift+K', action: () => splitDocument(true) },
    { label: tr('cmd.merge'), shortcut: 'Ctrl+Shift+M', action: mergeSelection },
    { label: tr('ui.app.duplica_cu_sub_documente'), shortcut: 'Ctrl+D', action: () => duplicateSelection(true) },
    { label: tr('ui.app.duplica_doar_elementul'), action: () => duplicateSelection(false) },
    '-',
    { label: tr('ui.app.converteste_in_dosar'), action: () => setTree(convertNode(project.tree, selectedId, 'folder')), disabled: !canContain || selected.type === 'folder' },
    { label: tr('ui.app.converteste_in_document_text'), action: () => setTree(convertNode(project.tree, selectedId, 'text')), disabled: !canContain || selected.type === 'text' },
    { label: tr('ui.app.sorteaza_continutul_a_z'), action: () => setTree(sortChildren(project.tree, selectedId, 'title')), disabled: !selected?.children },
    { label: tr('ui.app.sorteaza_continutul_z_a'), action: () => setTree(sortChildren(project.tree, selectedId, 'title', true)), disabled: !selected?.children },
    { label: tr('ui.app.sorteaza_dupa_data_crearii'), action: () => setTree(sortChildren(project.tree, selectedId, 'created')), disabled: !selected?.children },
    '-',
    ...(templateFolder && templateFolder.children && templateFolder.children.length
      ? templateFolder.children.map((t) => ({ label: tr('ui.app.nou_din_sablon_x', { title: t.title }), action: () => newFromTemplate(t) }))
      : [{ label: tr('ui.app.nou_din_sablon_alege_dosarul'), action: () => {}, disabled: true }]),
    { label: tr('ui.app.adauga_fisiere_in_cercetare_imagini'), action: addMediaToResearch, disabled: !api.addMediaFiles },
  ];

  const navigateMenu = [
    { label: tr('cmd.goto'), shortcut: 'Ctrl+G', action: () => setDialog('goto') },
    { label: tr('cmd.prevDoc'), shortcut: 'Ctrl+Alt+↑', action: () => goSibling(-1) },
    { label: tr('cmd.nextDoc'), shortcut: 'Ctrl+Alt+↓', action: () => goSibling(1) },
    { label: tr('ui.app.dosarul_parinte'), action: () => {
      const parent = selectedId && findParent(project.tree, selectedId);
      if (parent) go(parent.id);
    } },
    { label: tr('cmd.back'), shortcut: 'Alt+←', action: back },
    { label: tr('cmd.forward'), shortcut: 'Alt+→', action: forward },
    '-',
    ...(favorites.length ? favorites.map((f) => ({ label: `★ ${f.title}`, action: () => go(f.id) })) : [{ label: tr('ui.app.niciun_favorit_bifeaza_favorit_in'), action: () => {}, disabled: true }]),
  ];

  const projectMenu = [
    { label: tr('ui.app.cauta_si_inlocuieste'), shortcut: 'Ctrl+Shift+F', action: () => setDialog('find') },
    { label: tr('ui.app.cautare_avansata_campuri_filtre_colectii'), action: () => { setSearchSeed(''); setDialog('advsearch'); } },
    { label: tr('cmd.keywords'), action: () => setDialog('keywords') },
    { label: tr('cmd.import'), action: () => setDialog('import') },
    '-',
    { label: tr('cmd.history'), action: () => setDialog('history'), disabled: !api.getHistory },
    { label: tr('cmd.backups'), action: () => setDialog('backup'), disabled: !api.listBackups },
    '-',
    { label: tr('ui.app.setarile_proiectului_etichete_statusuri_metadate'), action: () => setDialog('projectSettings') },
    { label: tr('cmd.targets'), action: () => setDialog('targets') },
    { label: tr('cmd.stats'), action: () => setDialog('stats') },
    { label: tr('cmd.styles'), action: () => setDialog('styles') },
    { label: tr('cmd.compile'), action: () => flush().then(() => setDialog('compile')) },
    { label: tr('cmd.settings'), action: () => setDialog('settings') },
  ];

  // Command registry: every command has an id, a label, a menu group and a
  // configurable shortcut. Used by the keyboard handler, the native menu and Settings.
  const editorHandle = () => editorRefs.current.get(activeId.current) || editorRefs.current.get(selectedId);
  const commandList = [
    ['file', 'save', tr('cmd.save'), () => flush()],
    ['file', 'compile', tr('cmd.compile'), () => flush().then(() => setDialog('compile'))],
    ['file', 'import', tr('cmd.import'), () => setDialog('import')],
    ['file', 'importFiles', tr('cmd.importFiles'), () => setDialog('importSplit'), !api.importFiles],
    ['file', 'importOpml', tr('cmd.importOpml'), () => importOpmlOutline().catch(report), !api.importOpml],
    ['file', 'importWeb', tr('cmd.importWeb'), () => importWeb().catch(report), !api.importWebPage],
    ['file', 'transcribeAudio', tr('cmd.transcribeAudio'), async () => {
      const file = await speechApi.dtedPickAudio();
      if (file) dict.transcribe({ title: file.split(/[\\/]/).pop() }, (id) => speechApi.dtedTranscribe(file, id));
    }, !speechApi.dtedTranscribe],
    ['document', 'transcribeMedia', tr('cmd.transcribeMedia'), () => dict.transcribe({ title: selected.title }, (id) => speechApi.dtedTranscribeMedia(dir, selected.media, id)), !speechApi.dtedTranscribeMedia || !selected || selected.type !== 'file' || !AUDIO_EXT.test(selected.media || '')],
    ['tools', 'dictate', tr('cmd.dictate'), () => (dict.dictation ? dict.stop() : dict.start()), !dict.available],
    ['file', 'exportFiles', tr('cmd.exportFiles'), () => flush().then(() => setDialog('export'))],
    ['file', 'saveAs', tr('cmd.saveAs'), () => saveAs().catch(report), !api.saveProjectAs],
    ['file', 'print', tr('cmd.print'), printCurrent, !api.printDocument && !api.printDocuments],
    ['file', 'backups', tr('cmd.backups'), () => setDialog('backup'), !api.listBackups],
    ['file', 'closeProject', tr('cmd.closeProject'), closeProject],
    ['edit', 'findDoc', tr('cmd.findDoc'), () => editorHandle()?.openFind()],
    ['edit', 'findProject', tr('cmd.findProject'), () => { setFindSeed(''); setDialog('find'); }],
    ['edit', 'advSearch', tr('cmd.advSearch'), () => { setSearchSeed(''); setDialog('advsearch'); }],
    ['view', 'viewEditor', 'Editor', () => setView('editor')],
    ['view', 'viewCorkboard', 'Corkboard', () => setView('corkboard')],
    ['view', 'viewOutline', 'Outline', () => setView('outline')],
    ['view', 'composition', tr('cmd.composition'), () => { setView('editor'); setComposition((c) => !c); }],
    ['view', 'toggleInspector', tr('cmd.toggleInspector'), () => setShowInspector((v) => !v)],
    ['view', 'toggleBinder', tr('cmd.toggleBinder'), () => setHideBinder((v) => !v)],
    ['view', 'split', tr('cmd.split'), () => splitDocument(false)],
    ['view', 'quickRef', tr('cmd.quickRef'), () => selected && !selected.root && openQuickRef(selected.id)],
    ['nav', 'goto', tr('cmd.goto'), () => setDialog('goto')],
    ['nav', 'prevDoc', tr('cmd.prevDoc'), () => goSibling(-1)],
    ['nav', 'nextDoc', tr('cmd.nextDoc'), () => goSibling(1)],
    ['nav', 'back', tr('cmd.back'), back],
    ['nav', 'forward', tr('cmd.forward'), forward],
    ['project', 'newText', tr('cmd.newText'), () => addItem('text')],
    ['project', 'newFolder', tr('cmd.newFolder'), () => addItem('folder')],
    ['project', 'projectSettings', tr('cmd.projectSettings'), () => setDialog('projectSettings')],
    ['project', 'targets', tr('cmd.targets'), () => setDialog('targets')],
    ['project', 'stats', tr('cmd.stats'), () => setDialog('stats')],
    ['project', 'keywords', tr('cmd.keywords'), () => setDialog('keywords')],
    ['project', 'history', tr('cmd.history'), async () => {
      await flush();
      await recordHistory(true);
      setDialog('history');
    }, !api.getHistory],
    ['project', 'team', tr('cmd.team'), () => setDialog('team'), !api.teamFiles],
    ['document', 'splitTitle', tr('cmd.splitTitle'), () => splitDocument(true)],
    ['document', 'merge', tr('cmd.merge'), mergeSelection],
    ['document', 'duplicate', tr('cmd.duplicate'), () => duplicateSelection(true)],
    ['document', 'snapshot', tr('cmd.snapshot'), async () => {
      if (!selected || selected.root) return;
      await flush();
      await api.takeSnapshot(dir, selected.id, `Snapshot ${new Date().toLocaleString(uiLocale())}`).catch(report);
      setToast('Snapshot salvat.');
    }],
    ['format', 'styles', tr('cmd.styles'), () => setDialog('styles')],
    ['format', 'toggleRuler', tr('cmd.toggleRuler'), () => toggleView('ruler')],
    ['format', 'preserveFormat', tr('cmd.preserveFormat'), () => activeHandle()?.editor?.chain().focus().togglePreserveFormat().run()],
    ['ai', 'irep', aiEnabled ? 'I-REP / I-EDIT' : 'I-REP', () => setShowEditorial((v) => !v)],
    ['ai', 'ai', 'Asistent AI', () => setShowAi((v) => !v), !aiEnabled],
    ['ai', 'aiSettings', tr('cmd.aiSettings'), () => openSettings('ai')],
    ['ai', 'mcpConnect', tr('cmd.mcpConnect'), () => setDialog('mcp'), !api.mcpConnectInfo],
    ['view', 'customizeToolbar', tr('cmd.customizeToolbar'), () => setDialog('toolbars')],
    ['view', 'copyholder', tr('cmd.copyholder'), () => openCopyholder(selected?.id), !selected || Boolean(selected.root) || Boolean(selected.children)],
    ['view', 'copyholderClose', tr('cmd.copyholderClose'), () => setCopyholder(null), !copyholder],
    ['view', 'splitEditor', tr('cmd.splitEditor'), () => setSplitId(splitId ? null : selected && !selected.root ? selected.id : null)],
    ['view', 'floatInspector', tr('cmd.floatInspector'), () => setShowFloatInspector((v) => !v), !composition],
    ['view', 'viewTimeline', 'Cronologie', () => showWholeBook('timeline')],
    ['view', 'viewRelations', tr('cmd.viewRelations'), () => showWholeBook('relations')],
    ['view', 'viewPacing', tr('cmd.viewPacing'), () => showWholeBook('pacing')],
    ['view', 'posNouns', 'Focus lingvistic: substantive', () => setEditorView({ ...editorView, posFocus: editorView.posFocus === 'noun' ? '' : 'noun' })],
    ['view', 'posVerbs', 'Focus lingvistic: verbe', () => setEditorView({ ...editorView, posFocus: editorView.posFocus === 'verb' ? '' : 'verb' })],
    ['view', 'posOff', 'Focus lingvistic: oprit', () => setEditorView({ ...editorView, posFocus: '' })],
    ['project', 'bookmarks', tr('cmd.bookmarks'), () => setDialog('bookmarks')],
    ['project', 'bookmarkAdd', tr('cmd.bookmarkAdd'), () => !(project.bookmarks || []).some((b) => b.id === selectedId) && saveProject({ ...project, bookmarks: [...(project.bookmarks || []), { id: selectedId, title: selected?.title }] }), !selectedId],
    ['project', 'projectNotes', tr('cmd.projectNotes'), () => setDialog('projectNotes')],
    ['file', 'exportScriv', tr('cmd.exportScriv'), () => exportScrivCmd().catch(report), !api.exportScriv],
    ['file', 'syncOut', tr('cmd.syncOut'), () => syncOutCmd().catch(report), !api.syncOut],
    ['file', 'syncIn', tr('cmd.syncIn'), () => syncInCmd().catch(report), !api.syncIn || !project?.syncFolder],
    ['file', 'importZotero', tr('cmd.importZotero'), () => api.importZotero({}).then((r) => {
      const merged = mergeBibliography(project.bibliography || [], r.entries || []);
      saveProject({ ...project, bibliography: merged });
      setToast(tr('ui.app.zotero_importat', { n: (r.entries || []).length }));
    }).catch(report), !api.importZotero],
    ['file', 'importBib', tr('cmd.importBib'), () => api.importBibliography().then((r) => r && saveProject({ ...project, bibliography: r.entries })).catch(report), !api.importBibliography],
    ['file', 'exportLatex', tr('cmd.exportLatex'), () => flush().then(() => api.exportLatex(dir, project)).catch(report), !api.exportLatex],
    ['file', 'exportPandoc', tr('cmd.exportPandoc'), () => flush().then(() => api.exportPandoc(dir, project)).catch(report), !api.exportPandoc],
    ['file', 'exportMmd', tr('cmd.exportMmd'), () => flush().then(() => api.exportPandoc(dir, project, { flavor: 'mmd' })).catch(report), !api.exportPandoc],
    ['ai', 'aiBulkSynopsis', tr('cmd.aiBulkSynopsis'), () => runBulkSynopsis().catch(report), !aiEnabled || !api.aiBulkSynopsis],
    ['ai', 'aiConsistency', tr('cmd.aiConsistency'), () => runConsistency().catch(report), !aiEnabled || !api.aiConsistency],
    ['ai', 'aiZoomReview', tr('cmd.aiZoomReview'), () => runZoomReview(ZOOM_LEVELS).catch(report), !aiEnabled || !api.aiZoomReview],
    [aiEnabled ? 'ai' : 'tools', 'nlmExport', tr('cmd.nlmExport'), () => flush().then(() => api.nlmExport(dir)).then((r) => r && setToast(tr('ui.app.notebooklm_x_surse_in_x', { length: r.files.length, dir: r.dir, v2: r.warnings.length ? ` ${r.warnings.join(' ')}` : '' }))).catch(report), !dir || !api.nlmExport],
    [aiEnabled ? 'ai' : 'tools', 'nlmOpen', tr('cmd.nlmOpen'), () => api.nlmOpen().catch(report), !api.nlmOpen],
    ['file', 'newWindow', tr('cmd.newWindow'), () => api.newWindow().catch(report), !api.newWindow],
    ['file', 'exportBundle', tr('cmd.exportBundle'), () => flush().then(() => api.exportBundle(dir)).catch(report), !api.exportBundle],
    ['file', 'importBundle', tr('cmd.importBundle'), () => api.importBundle().then(openResult).catch(report), !api.importBundle],
    ['tools', 'research', tr('cmd.research'), () => setShowResearch((v) => !v), !api.ragQuery],
    ['tools', 'glossaries', tr('cmd.glossaries'), () => generateGlossaries().catch(report)],
    ['file', 'editorPackage', tr('cmd.editorPackage'), () => flush().then(() => api.editorPackage(dir, project)).then((r) => r && setToast(tr('ui.app.pachet_creat_in_x_x', { dir: r.dir, length: r.files.length }))).catch(report), !api.editorPackage],
    ['file', 'saveTemplate', tr('cmd.saveTemplate'), () => flush().then(() => setDialog('saveTemplate')), !api.saveAsTemplate],
    ['file', 'pageSetup', tr('cmd.pageSetup'), () => setDialog('pageSetup'), !api.getPageSetup],
    ['file', 'printPreview', tr('cmd.printPreview'), () => openPrintPreview(), !api.printPreview],
    ['help', 'help', 'Manualul Scribner', () => setHelp({ topic: null, tab: 'manual' })],
    ['help', 'helpContext', tr('cmd.helpContext'), () => setHelp({ topic: helpContext(), tab: 'manual' })],
    ['help', 'helpShortcuts', tr('cmd.helpShortcuts'), () => setHelp({ topic: null, tab: 'shortcuts' })],
    ['help', 'helpPlaceholders', tr('cmd.helpPlaceholders'), () => setHelp({ topic: null, tab: 'placeholders' })],
    ['help', 'helpSyntax', tr('cmd.helpSyntax'), () => setHelp({ topic: null, tab: 'syntax' })],
    ['help', 'tutorial', 'Tutorial interactiv', startTutorial, !api.newProject],
    ['help', 'reportIssue', tr('cmd.reportIssue'), () => setReportOpen(true)],
    ['help', 'about', 'Despre Scribner', () => window.alert(tr('ui.app.scribner_program_de_scris_pentru')), Boolean(api.setAppMenu)],
    ['tools', 'nameGen', tr('cmd.nameGen'), () => setDialog('names')],
    ['tools', 'scratchpad', 'Ciorne (Scratchpad)', () => setShowScratch((v) => !v)],
    ['tools', 'speech', tr('cmd.speech'), () => setShowSpeech((v) => !v)],
    ['format', 'scriptOff', tr('cmd.scriptOff'), () => setScriptFormat(null).catch(report), !scriptFormat],
    ...SCRIPT_FORMAT_LIST.map((f) => ['format', `script_${f.id}`, tr('ui.app.mod_scenariu_x', { label: tr(`ui.scriptFormat.${f.id}`) }), () => setScriptFormat(f.id).catch(report), scriptFormat === f.id]),
    ['file', 'exportFdx', tr('cmd.exportFdx'), () => flush().then(() => exportScript('fdx')).catch(report), !api.exportScript || !scriptFormat],
    ['file', 'exportFountain', tr('cmd.exportFountain'), () => flush().then(() => exportScript('fountain')).catch(report), !api.exportScript || !scriptFormat],
    ['tools', 'settings', tr('cmd.settings'), () => setDialog('settings')],
    ['tools', 'shortcuts', tr('cmd.shortcuts'), () => setDialog('shortcuts')],
    ['window', 'saveLayout', tr('cmd.saveLayout'), saveLayout],
    ['window', 'manageLayouts', tr('cmd.manageLayouts'), () => setDialog('layouts')],
    ['window', 'fullScreen', 'Ecran complet', toggleFullScreen],
    ['document', 'moveTo', tr('cmd.moveTo'), () => setDialog('moveTo'), !selectionList().length],
    ['document', 'toggleSeparator', tr('cmd.toggleSeparator'), toggleSeparator, !selectionList().length],
    ['document', 'restoreTrash', tr('cmd.restoreTrash'), restoreSelection, !selectionList().some((id) => inTrash(id))],
    ['document', 'appendSelection', tr('cmd.appendSelection'), () => setDialog('appendTo')],
    ['document', 'openExternal', tr('cmd.openExternal'), openMediaExternal, !selected?.media?.file || !api.openMediaExternal],
    ['document', 'autoSynopsis', tr('cmd.autoSynopsis'), () => autoSynopsisSelection().catch(report), !selectionList().length],
    ['document', 'snapshotSelection', tr('cmd.snapshotSelection'), () => snapshotSelection().catch(report), !selectionList().length],
    ['nav', 'revealBinder', tr('cmd.revealBinder'), revealInBinder, !selectedId],
    ['nav', 'hoist', tr('cmd.hoist'), hoistSelection, !selected],
    ['nav', 'unhoist', tr('cmd.unhoist'), () => setHoistId(null), !hoistId],
    ['view', 'scrivSelection', tr('cmd.scrivSelection'), () => openScrivenings(tr('ui.app.x_documente_selectate', { length: selectionList().length }), selectionList())],
    ['view', 'scrivCollection', tr('cmd.scrivCollection'), () => openScrivenings(activeCollection?.title || '', collectionIds || []), !activeCollection],
    ['view', 'scrivTitles', tr('cmd.scrivTitles'), () => toggleView('scrivHideTitles')],
    ['view', 'scrivSeparators', tr('cmd.scrivSeparators'), () => toggleView('scrivHideSeparators')],
    ['view', 'toggleFormatBar', tr('cmd.toggleFormatBar'), () => toggleView('hideFormatBar')],
    ['view', 'toggleComments', tr('cmd.toggleComments'), () => toggleView('hideComments')],
    ['view', 'toggleRevisions', 'Aspect text: culorile reviziilor', () => toggleView('hideRevisions')],
    ['view', 'splitHorizontal', tr('cmd.splitHorizontal'), () => toggleView('splitHorizontal')],
    ['view', 'swapPanes', tr('cmd.swapPanes'), swapPanes, !splitId],
    ['tools', 'lookupDict', tr('cmd.lookupDict'), () => lookupWord('dictionary')],
    ['tools', 'lookupSyn', tr('cmd.lookupSyn'), () => lookupWord('synonyms')],
    ['tools', 'lookupWiki', tr('cmd.lookupWiki'), () => lookupWord('wikipedia')],
    ['tools', 'lookupGoogle', tr('cmd.lookupGoogle'), () => lookupWord('google')],
    ['edit', 'selectWord', tr('cmd.selectWord'), () => activeHandle()?.selectAround('word')],
    ['edit', 'selectSentence', tr('cmd.selectSentence'), () => activeHandle()?.selectAround('sentence')],
    ['edit', 'selectParagraph', tr('cmd.selectParagraph'), () => activeHandle()?.selectAround('paragraph')],
    ['tools', 'selDeepl', tr('cmd.selDeepl'), () => lookupWord('deepl')],
    ['tools', 'selGoogleTranslate', tr('cmd.selGoogleTranslate'), () => lookupWord('googleTranslate')],
    ['tools', 'selLinguee', tr('cmd.selLinguee'), () => lookupWord('linguee')],
    ['tools', 'selIate', tr('cmd.selIate'), () => lookupWord('iate')],
    ['tools', 'selWiktionary', tr('cmd.selWiktionary'), () => lookupWord('wiktionary')],
    ['tools', 'selScholar', tr('cmd.selScholar'), () => lookupWord('scholar')],
    ['ai', 'aiResearchSel', tr('cmd.aiResearchSel'), () => aiOnSelection('research'), !aiEnabled],
    ['ai', 'aiDefineSel', tr('cmd.aiDefineSel'), () => aiOnSelection('define'), !aiEnabled],
    ['ai', 'aiTranslateSel', tr('cmd.aiTranslateSel'), () => aiOnSelection('translate'), !aiEnabled],
    ['ai', 'aiProofreadSel', tr('cmd.aiProofreadSel'), () => aiOnSelection('proofread'), !aiEnabled],
    ['tools', 'findSel', tr('cmd.findSel'), searchProjectFor],
    ['tools', 'researchSel', tr('cmd.researchSel'), () => researchSelection('search'), !api.ragQuery],
    ['ai', 'researchAskSel', tr('cmd.researchAskSel'), () => researchSelection('ask'), !api.ragAsk || !aiEnabled],
    ['tools', 'glossaryAdd', tr('cmd.glossaryAdd'), addToGlossary],
    ['tools', 'deeplInApp', tr('cmd.deeplInApp'), () => runService('translate', 'deepl'), !api.translateText],
    ['tools', 'googleInApp', tr('cmd.googleInApp'), () => runService('translate', 'google'), !api.translateText],
    ['tools', 'grammarSel', tr('cmd.grammarSel'), () => runService('grammar'), !api.checkGrammar],
    [aiEnabled ? 'ai' : 'tools', 'nlmAskSel', tr('cmd.nlmAskSel'), askNotebookLm, !api.nlmOpen],
    ['tools', 'checkSpelling', tr('cmd.checkSpelling'), () => api.recheckSpelling().catch(report), !api.recheckSpelling],
    ...(settings.layouts || []).map((l, i) => ['window', `layout:${i}`, `Layout: ${l.name}`, () => applyLayout(l)]),
  ];
  // AI off: every command that needs Claude is left out (menus, shortcuts, native menu); I-REP stays.
  // MCP needs the desktop app (browser mode has no api.mcpConnectInfo).
  const activeCommands = commandList.filter(([, id]) => (aiEnabled || !AI_ONLY_COMMANDS.has(id)) && (id !== 'mcpConnect' || api.mcpConnectInfo));
  const commands = Object.fromEntries(
    activeCommands.map(([group, id, label, run, disabled]) => [id, { group, id, label: id === 'irep' ? label : cmdLabel(id, label), run: (...a) => (noteAction(id), run(...a)), disabled: Boolean(disabled), key: shortcutFor(id, settings) }]),
  );
  commandsRef.current = commands;
  // Menu bar (in-app menus and the native application menu share this layout).
  const menuItem = (id) => {
    const c = commands[id];
    return c && { id, label: c.label, action: c.run, disabled: c.disabled, shortcut: c.key };
  };
  const menuLayout = buildMenuLayout(commands, {
    extras: { document: documentMenu, nav: navigateMenu, project: projectMenu },
    label: (k) => tr(k),
    item: menuItem,
  });
  menuLayoutRef.current = menuLayout;

  // Top toolbar from the customizable registry (src/lib/toolbars.js).
  const TB_ICONS = { back: BackIcon, forward: ForwardIcon, compile: CompileIcon, compose: ComposeIcon, inspector: InspectorIcon, split: SplitIcon, binder: BinderIcon, search: SearchIcon, add: AddIcon, snapshot: SnapshotIcon, bookmark: BookmarkIcon, notes: NotesIcon };
  const tbOn = { inspector: showInspector, binder: !hideBinder, splitEditor: Boolean(splitId), irep: showEditorial, ai: showAi, composition };
  const tbDisabled = { back: nav.index <= 0, forward: nav.index >= nav.stack.length - 1 };
  const renderTopItem = (id, i) => {
    if (id === 'sep') return <span key={`sep${i}`} className="tb-sep" role="separator" />;
    if (id === 'space') return <span key={`sp${i}`} className="spacer" />;
    const it = TOP_ITEMS.find((x) => x.id === id);
    if (!it || !topItemAvailable(it, { aiEnabled, desktop: Boolean(api.setAppMenu) })) return null;
    if (it.kind === 'title') return <strong key={id} className="project-title" title={project.title}>{project.title}</strong>;
    if (it.kind === 'aiMenu') {
      const m = menuLayout.find((x) => x.group === 'ai');
      return m ? <Menu key={id} label={m.label} items={m.items} className="menu-ai" /> : null;
    }
    if (it.kind === 'views') {
      return (
        <div key={id} className="seg" role="group" aria-label={tr('ui.tb.views')}>
          {[['editor', 'Editor', ScriveningsIcon, 'Editor / Scrivenings (Ctrl+1)'], ['corkboard', 'Corkboard', CorkboardIcon, 'Corkboard (Ctrl+2)'], ['outline', 'Outline', OutlineIcon, 'Outline (Ctrl+3)']].map(([v, l, Ic, t]) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)} title={t} aria-label={l}>
              <span className="sc-ico">{toolbars.display !== 'text' && <Ic />}{toolbars.display !== 'icon' && <span className="tb-label">{l}</span>}</span>
            </button>
          ))}
        </div>
      );
    }
    const cmd = commands[it.command];
    if (!cmd) return null;
    const Ic = it.icon && TB_ICONS[it.icon];
    const icon = Ic ? <Ic /> : it.glyph ? <span className="tb-glyph" aria-hidden="true">{it.glyph}</span> : null;
    const text = it.text ? (it.text.includes('.') ? tr(it.text) : it.text) : '';
    const showText = toolbars.display === 'text' || (toolbars.display === 'iconText' && text) || !icon;
    return (
      <button key={id} data-tb={id} className={tbOn[id] ? 'on' : ''} disabled={tbDisabled[id] || cmd.disabled} onClick={cmd.run} title={cmd.key ? `${cmd.label} (${cmd.key})` : cmd.label} aria-label={cmd.label}>
        <span className="sc-ico">
          {toolbars.display !== 'text' && icon}
          {showText && <span className="tb-label">{text || cmd.label}</span>}
        </span>
      </button>
    );
  };

  // Browser build: the desktop app shows the same actions in the native menu (electron/main.cjs).
  function onEditorContextMenu(e) {
    if (window.api || e.shiftKey || !e.target.closest?.('.ProseMirror')) return; // Shift: the browser's own menu (paste, spelling)
    e.preventDefault();
    setEditorCtx({ x: e.clientX, y: e.clientY });
  }
  const editorCtxItems = () => {
    const text = selectedText().trim();
    const run = (id) => () => commands[id]?.run();
    const items = [];
    if (text) {
      const g = lookupGroups(text, { from: settings.translateFrom || 'auto', to: settings.translateTo || 'ro', lang: settings.language || 'ro' });
      const links = (list) => list.map((l) => ({ label: l.label, action: () => openWeb(l.url) }));
      const inApp = api.translateText ? [{ label: tr('cmd.deeplInApp'), action: run('deeplInApp') }, { label: tr('cmd.googleInApp'), action: run('googleInApp') }, '-'] : [];
      if (g.translate.length) items.push({ label: tr('ui.ctx.traduce'), submenu: [...inApp, ...links(g.translate)] });
      if (api.checkGrammar) items.push({ label: tr('cmd.grammarSel'), action: run('grammarSel') });
      if (g.dict.length) items.push({ label: tr('ui.ctx.dictionare'), submenu: links(g.dict) });
      items.push({ label: tr('ui.ctx.cercetare_web'), submenu: links(g.research) });
      if (aiEnabled) {
        items.push({
          label: tr('ui.ctx.asistent_ai'),
          submenu: [
            { label: tr('ui.aiPanel.cercetare'), action: run('aiResearchSel') },
            { label: tr('ui.aiPanel.explica'), action: run('aiDefineSel') },
            { label: tr('ui.aiPanel.corectura'), action: run('aiProofreadSel') },
            { label: tr('ui.aiPanel.traduce'), action: run('aiTranslateSel') },
          ],
        });
      }
      items.push({
        label: tr('ui.ctx.in_proiect'),
        submenu: [
          { label: tr('cmd.findSel'), action: run('findSel') },
          ...(api.ragQuery ? [{ label: tr('cmd.researchSel'), action: run('researchSel') }] : []),
          ...(api.ragAsk && aiEnabled ? [{ label: tr('cmd.researchAskSel'), action: run('researchAskSel') }] : []),
          { label: tr('cmd.glossaryAdd'), action: run('glossaryAdd') },
        ],
      });
      if (api.nlmOpen) items.push({ label: tr('cmd.nlmAskSel'), action: askNotebookLm });
      items.push('-');
    }
    items.push({ label: tr('ui.ctx.extinde'), submenu: [{ label: tr('cmd.selectSentence'), action: run('selectSentence') }, { label: tr('cmd.selectParagraph'), action: run('selectParagraph') }] });
    if (text) {
      items.push({ label: tr('ui.ctx.taie'), action: () => { activeHandle()?.editor?.commands.focus(); document.execCommand('cut'); } });
      items.push({ label: tr('ui.ctx.copiaza'), action: () => navigator.clipboard?.writeText(text) });
    }
    return items;
  };

  return (
    <div
      className={`app ${composition ? 'composition' : ''} ${composition && settings.compPaper !== false ? 'comp-paper' : ''} ${composition && settings.compBgImage ? 'has-bg-image' : ''}`}
      data-fit={settings.compBgImageFit || 'cover'}
      onContextMenu={onEditorContextMenu}
      style={
        composition
          ? {
              '--comp-bg': settings.compBg || undefined,
              '--comp-width': `${settings.compWidth || 40}em`,
              '--comp-fade': (settings.compFade ?? 100) / 100,
              '--comp-bg-image': settings.compBgImage ? `url("${/^(data:|https?:|file:)/.test(settings.compBgImage) ? settings.compBgImage : encodeURI(`file:///${settings.compBgImage.replace(/\\/g, '/').replace(/^\//, '')}`)}")` : undefined,
            }
          : undefined
      }
    >
      <style>{styleCss(projectStyles)}</style>
      <header className={`toolbar tb-${toolbars.display}`}>
        {/* Browser: the full menu bar lives here; desktop: the native menu has it (AI can stay in-app via the toolbar). */}
        {!api.setAppMenu && (
          <nav className="menubar" aria-label={tr('ui.tb.menubar')}>
            {menuLayout.map((m) => <Menu key={m.group} label={m.label} items={m.items} caret={false} className={m.group === 'ai' ? 'menu-ai' : ''} />)}
          </nav>
        )}
        {toolbars.top.map((id, i) => renderTopItem(id, i))}
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
            <button className="link" onClick={() => setHoistId(null)}>{tr('cmd.unhoist')}</button>
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
          onPatchItems={(ids, patch) => setTree(ids.reduce((t, id) => updateNode(t, id, patch), project.tree))}
          onSetTemplateFolder={(id) => saveProject({ ...project, templateFolder: id || null })}
          filterIds={collectionIds}
          filterTitle={activeCollection?.title}
          docs={docs}
          width={widths.binder}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelect={onBinderSelect}
          onAdd={addItem}
          onRename={(id, title) => patchNode(id, { title })}
          onMove={(id, targetId, pos) => setTreeU(dropMany(project.tree, [id], targetId, pos))}
          onMoveMany={(ids, targetId, pos) => setTreeU(dropMany(project.tree, [...ids], targetId, pos))}
          onKeyMove={(dir2) => selectedId && setTreeU(keyMoveMany(project.tree, selectedIds.size ? [...selectedIds] : [selectedId], dir2))}
          onUndo={undoBinder}
          renameId={renameId}
          onRenameDone={(id, committed) => {
            setRenameId(null);
            if (committed && findNode(project.tree, id)?.type === 'text') focusEditor(id);
          }}
          onFocusEditor={() => focusEditor(selectedId)}
          onRangeSelect={(ids, id) => {
            setSelectedIds(new Set(ids));
            if (id) setSelectedId(id);
          }}
          onTrash={trashSelection}
          onEmptyTrash={() => {
            const trash = project.tree.find((n) => n.root === 'trash');
            if (!trash || !(trash.children || []).length) return;
            if (!window.confirm(tr('ui.app.golesti_cosul_documentele_din_cos'))) return;
            const gone = new Set(flatten(trash.children).map((n) => n.id));
            setTree(emptyTrash(project.tree));
            if (gone.has(selectedId)) setSelectedId(project.tree[0].id); // not a blank editor
          }}
        />
        </div>
        <div className="resizer" onMouseDown={startResize('binder')} role="separator" aria-label={tr('ui.app.latime_binder')} />
        </>)}

        <section className={`workspace ${(splitNode || copyNode) && view === 'editor' ? 'split' : ''} ${copyNode && view === 'editor' ? 'has-copyholder' : ''} ${editorView.splitHorizontal ? 'split-h' : ''}`}>
          <div className={`pane ${editorAreaClass}`}>
            {view === 'editor' && selected && !composition && (
              <div className="sc-header-bar">
                <button onClick={back} disabled={nav.index <= 0} title={tr('ui.app.inapoi_alt')} aria-label={tr('cmd.back')}><BackIcon /></button>
                <button onClick={forward} disabled={nav.index >= nav.stack.length - 1} title={tr('ui.app.inainte_alt')} aria-label={tr('cmd.forward')}><ForwardIcon /></button>
                <DocumentIcon />
                <strong style={{ flex: 1 }}>{selected.title}</strong>
                {selected.locked && <LockIcon title={tr('ui.app.blocat')} />}
                {team.live.filter((p) => p.doc === selected.id).map((p) => (
                  <span key={p.machine} className="team-chip" style={{ borderColor: p.color }} title={tr('ui.team.lucreaza_acum', { name: p.who })}>
                    <span className="team-dot" style={{ background: p.color }} /> {p.who}
                  </span>
                ))}
                {team.lockOf(selected.id) && (
                  <span className="team-chip locked" style={{ borderColor: team.lockOf(selected.id).color }}>
                    <LockIcon /> {tr('ui.team.blocat_de', { name: team.lockOf(selected.id).who })}
                  </span>
                )}
                {team.who && !selected.root && (team.myLocks.includes(selected.id) || !team.lockOf(selected.id)) && (
                  <button
                    className={team.myLocks.includes(selected.id) ? 'primary' : ''}
                    onClick={() => team.toggleLock(selected.id)}
                    title={team.myLocks.includes(selected.id) ? tr('ui.team.deblocheaza') : tr('ui.team.blocheaza')}
                    aria-label={team.myLocks.includes(selected.id) ? tr('ui.team.deblocheaza') : tr('ui.team.blocheaza')}
                    aria-pressed={team.myLocks.includes(selected.id)}
                  >
                    <LockIcon />
                  </button>
                )}
                <button onClick={() => setSplitId(splitId ? null : !selected.root ? selected.id : null)} title="Split editor" aria-label="Split editor"><SplitIcon /></button>
              </div>
            )}
            {view === 'editor' && !scrivListNodes && selected && selected.type === 'file' && !selected.children && (
              <MediaView api={api} dir={dir} node={selected} onError={report} />
            )}
            {view === 'editor' && !scrivListNodes && selected && selected.type !== 'file' && !selected.children && (
              <Editor
                scriptFormat={scriptFormat}
                key={`${selected.id}-${smartQuotes}-${Boolean(selected.locked)}-${Boolean(team.lockOf(selected.id))}-${corrKey}`}
                historyKey={selected.id}
                corrections={corrections}
                defaultFormatting={project.defaultFormatting}
                showInvisibles={settings.showInvisibles}
                ref={(r) => registerRef(selected.id, r)}
                html={docs[selected.id] || ''}
                title={selected.title}
                readOnly={inTrash(selected.id) || Boolean(selected.locked) || Boolean(team.lockOf(selected.id))}
                typewriter={settings.typewriter}
                smartQuotes={smartQuotes}
                onFocus={() => (activeId.current = selected.id)}
                onChange={(html) => writeSynced(selected.id, html, 'main')}
                linkTargets={linkTargets}
                onCreateLinkedDoc={createLinkedDoc(selected.id)}
                linkFolders={linkFolders}
                linkFolderDefault={project.newLinkFolderId || ''}
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
                key={`${scrivList ? scrivList.ids.join(',') : selected?.id}-${smartQuotes}-${corrKey}`}
                corrections={corrections}
                styles={projectStyles}
                defaultFormatting={project.defaultFormatting}
                linkTargets={linkTargets}
                onOpenLink={openLink}
                title={scrivList ? scrivList.title : selected?.title}
                sections={scrivSections}
                docs={docs}
                settings={settings}
                readOnlyIds={new Set(scrivSections.filter((n) => inTrash(n.id) || n.locked || team.lockOf(n.id)).map((n) => n.id))}
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
                  focusEditor(id);
                }}
                onPatch={patchNode}
                onAdd={(afterId) => {
                  const node = addItem('text', undefined, undefined, typeof afterId === 'string' ? afterId : selectedId);
                  setRenameId(null); // the card's own title goes into edit mode instead
                  return node;
                }}
                onRename={(id, title) => patchNode(id, { title })}
                onMove={(id, targetId, pos) => setTreeU(moveNode(project.tree, id, targetId, pos))}
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
                  focusEditor(id);
                }}
                onPatch={patchNode}
                onMove={(id, targetId, pos) => setTreeU(moveNode(project.tree, id, targetId, pos))}
              />
            )}
          </div>
          {splitNode && view === 'editor' && (
            <div className={`pane second ${editorAreaClass}`}>
              <div className="pane-head">
                <span title={tr('ui.app.panoul_2_blocat_pe_x', { title: splitNode.title })}>{tr('ui.app.panoul_2_blocat_pe')}{splitNode.title}”</span>
                <button className="link" onClick={() => toggleView('splitHorizontal')}>{editorView.splitHorizontal ? tr('ui.app.split_vertical') : tr('ui.app.split_orizontal')}</button>
                <button className="link" onClick={swapPanes}>{tr('ui.app.inverseaza')}</button>
                <button className="link" onClick={() => go(splitNode.id)}>{tr('ui.app.deschide_in_principal')}</button>
                <button className="link" onClick={() => setSplitId(null)}>{tr('btn.close')}</button>
              </div>
              {splitNode.children ? (
                <p className="hint">{tr('ui.app.alege_un_document_cu_alt')}</p>
              ) : (
                <Editor
                  scriptFormat={scriptFormat}
                  key={`split-${splitNode.id}-${smartQuotes}-${Boolean(team.lockOf(splitNode.id))}-${corrKey}`}
                  corrections={corrections}
                  defaultFormatting={project.defaultFormatting}
                  showInvisibles={settings.showInvisibles}
                  ref={(r) => registerRef(mainIds.has(splitNode.id) ? `split:${splitNode.id}` : splitNode.id, r)}
                  html={docs[splitNode.id] || ''}
                  title={splitNode.title}
                  readOnly={inTrash(splitNode.id) || Boolean(splitNode.locked) || Boolean(team.lockOf(splitNode.id))}
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
          {copyNode && view === 'editor' && (
            <div
              className="pane copyholder"
              ref={(el) => {
                if (el && el.dataset.doc !== copyNode.id) {
                  el.dataset.doc = copyNode.id;
                  el.scrollTop = copyScroll.current.get(copyNode.id) || 0;
                }
              }}
              onScroll={(e) => copyScroll.current.set(copyNode.id, e.currentTarget.scrollTop)}
            >
              <div className="pane-head">
                <span title={copyNode.title}>{tr('ui.app.copyholderTitle', { title: copyNode.title })}</span>
                <label className="check">
                  <input type="checkbox" checked={Boolean(copyholder.editable)} onChange={(e) => setCopyholder((c) => ({ ...c, editable: e.target.checked }))} /> {tr('ui.app.copyholderEditable')}
                </label>
                <button className="link" onClick={() => go(copyNode.id)}>{tr('ui.app.deschide_in_principal')}</button>
                <button className="link" onClick={() => setCopyholder(null)}>{tr('btn.close')}</button>
              </div>
              <Editor
                key={`copy-${copyNode.id}-${Boolean(copyholder.editable)}-${Boolean(team.lockOf(copyNode.id))}-${smartQuotes}-${corrKey}`}
                compact
                corrections={corrections}
                defaultFormatting={project.defaultFormatting}
                ref={(r) => registerRef(`copy:${copyNode.id}`, r)}
                html={docs[copyNode.id] || ''}
                title={copyNode.title}
                readOnly={!copyholder.editable || inTrash(copyNode.id) || Boolean(copyNode.locked) || Boolean(team.lockOf(copyNode.id))}
                smartQuotes={smartQuotes}
                onChange={(html) => writeSynced(copyNode.id, html, 'copy')}
                linkTargets={linkTargets}
                onOpenLink={openLink}
                words={words}
                styles={projectStyles}
              />
            </div>
          )}
        </section>

        {/* Only panels that will actually render open the side column (Research alone; no empty column when AI is off). */}
        {(showInspector || (showAi && aiEnabled) || (showEditorial && editorialNode) || (showResearch && dir)) && selected && !composition && (
          <>
            <div className="resizer" onMouseDown={startResize('side')} role="separator" aria-label={tr('ui.app.latime_panou_lateral')} />
            <div className="side" style={{ width: widths.side }}>
              {showInspector && (
                <Inspector
                  key={`insp-${selected.id}`}
                  teamLockOf={team.lockOf}
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
                    setEditorHtml(selected.id, html);
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
                    setEditorHtml(id, html);
                  }}
                  onJumpToComment={(index, c, id) => {
                    go(id);
                    setView('editor');
                  }}
                />
              )}
              {showResearch && dir && (
                <ResearchPanel
                  request={researchRequest}
                  api={api}
                  dir={dir}
                  project={project}
                  aiEnabled={aiEnabled}
                  aiLabel={settings.aiLabel}
                  onOpen={(id) => go(id)}
                  onClose={() => setShowResearch(false)}
                  onSaveNote={async ({ title, html }) => {
                    await flush();
                    await addResearchDocs([{ title, html }], tr('ui.researchChat.note_folder'));
                  }}
                  onInsert={(html) => {
                    const h = activeHandle();
                    if (!h || !h.insertHtmlAfter) return false;
                    return h.insertHtmlAfter(html) !== false;
                  }}
                  onAddSources={async (list) => {
                    await flush();
                    await addResearchDocs(list);
                  }}
                  onImportWeb={api.importWebPage ? importWebSource : undefined}
                />
              )}
              {showAi && aiEnabled && (
                <AiPanel
                  api={api}
                  hasKey={settings.hasApiKey}
                  aiLabel={settings.aiLabel}
                  aiModel={settings.aiModel}
                  getHandle={activeHandle}
                  node={aiNode}
                  getText={() => activeHandle()?.getSelectionText() || htmlToText(docsNow()[aiNode.id])}
                  hasSelection={() => Boolean(activeHandle()?.getSelectionText())}
                  getContext={contextForAi}
                  onInsert={(text) => activeHandle()?.insertText(text)}
                  onReplace={(text) => activeHandle()?.replaceSelection(text)}
                  onReplaceAll={(text) => {
                    const html = textToHtml(text);
                    setEditorHtml(aiNode.id, html);
                    writeDocNow(aiNode.id, html);
                  }}
                  onSynopsis={(text) => patchNode(aiNode.id, { synopsis: text })}
                  onOpenSettings={openSettings}
                  translateTo={LANG_NAMES[settings.translateTo || 'ro'] || settings.translateTo}
                  request={aiRequest}
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
                  aiLabel={settings.aiLabel}
                  aiModel={settings.aiModel}
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
                  authorEvent={authorEvent}
                  onJump={(issue) => {
                    if (!mainIds.has(editorialNode.id)) go(editorialNode.id);
                    setTimeout(() => editorRefs.current.get(editorialNode.id)?.findText(issue.match || issue.excerpt, { block: issue.paragraph, at: issue.at }), 50);
                  }}
                  onApply={async (p) => {
                    await flush();
                    // Hand edits made so far are the writer's (author text) before anything is written.
                    commitAuthor(p.id);
                    if (!p.selection && !p.safe) {
                      // Re-check the bytes right before writing: a save of the author's at this
                      // moment (or an agent's write) is never overwritten.
                      const cur = docsNow()[p.id] || '';
                      const disk = api.readDoc ? await api.readDoc(dir, p.id, 'docs').catch(() => null) : null;
                      if (cur !== p.before || (disk && disk !== p.before)) throw new Error(tr('ui.app.document_schimbat_409', { title: p.title }));
                    }
                    const now = new Date();
                    const pad = (x) => String(x).padStart(2, '0');
                    if (p.authorEdit) await api.takeSnapshot(dir, p.id, `.bak-autor-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`);
                    else if (!p.safe) await api.takeSnapshot(dir, p.id, tr('ui.app.inainte_de_x', { v0: p.rounds ? 'I-EDIT' : 'I-REP' })).catch(report);
                    if (p.selection) {
                      editorRefs.current.get(p.id)?.replaceSelectionHtml(p.after);
                      return;
                    }
                    writeDocNow(p.id, p.after);
                    setEditorHtml(p.id, p.after);
                    const pj = projectRef.current;
                    const n = findNode(pj.tree, p.id);
                    const stamp = now.toISOString();
                    const editorial = { ...(n?.editorial || {}), lastRep: stamp };
                    if (p.rounds) editorial.rounds = { ...(editorial.rounds || {}), ...Object.fromEntries(p.rounds.map((r) => [r, stamp])) };
                    saveProject({ ...pj, tree: updateNode(pj.tree, p.id, { editorial, authorHashes: updateAuthorHashes(n?.authorHashes, p.after) }) });
                    // Edited in the preview: journal the save and mark the author's own words.
                    if (p.authorEdit) commitAuthor(p.id, { [p.id]: { base: p.before, after: p.after, authorFrom: p.proposed } });
                  }}
                  onOpenSettings={openSettings}
                />
              )}
            </div>
          </>
        )}
      </div>

      <DictationBar dict={dict} />
      <StatusBar
        node={selected}
        words={selected ? (isFolderView ? scrivSections.reduce((s, n) => s + (counts[n.id] || 0), 0) : counts[selected.id] || 0) : 0}
        chars={selected && !isFolderView ? statusChars : 0}
        selectionCount={selectedIds.size}
        totalDraft={totals.draft}
        draftTarget={project.targets?.draft || 0}
        sessionWords={Math.max(0, totals.draft - sessionStart)}
        sessionTarget={project.targets?.session || 0}
        saveState={saveState}
        onSync={() => conflict && setConflict((c) => c && { ...c, open: true })}
        sync={conflict ? { state: 'conflict' } : offline || queued ? { state: 'pending', n: queued } : team.who ? { state: 'ok' } : null}
        team={team.who ? team : null}
        onTeam={() => setDialog('team')}
        zoom={editorView.zoom || 100}
        onZoom={(z) => setEditorView({ ...editorView, zoom: z })}
      />

      {composition && <button className="exit-composition" onClick={() => setComposition(false)}>{tr('ui.app.iesi_esc')}</button>}
      {composition && settings.compShowTargets && selected && (
        <div className="comp-targets">
          <span>{tr('ui.statusBar.document')}: {counts[selected.id] || 0}{selected.target ? ` / ${selected.target}` : ''}</span>
          <span>{tr('ui.statusBar.session')}: {Math.max(0, totals.draft - sessionStart)}{project.targets?.session ? ` / ${project.targets.session}` : ''}</span>
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
      {aiEnabled && <AiJobBar api={api} />}
      {aiReport && (
        <div className="modal-backdrop" onClick={() => setAiReport(null)}>
          <div className="modal wide" role="dialog" aria-label={aiReport.title} onClick={(e) => e.stopPropagation()}>
            <h2>{aiReport.title}</h2>
            {!aiReport.findings.length && <p>{tr('ui.app.nicio_problema_gasita')}</p>}
            <div className="ai-findings">
              {aiReport.findings.map((f, i) => (
                <div key={i} className={`finding sev-${f.severity}`}>
                  <strong>{f.severity}</strong> {f.level ? `[${f.level}] ` : ''}{f.title || f.character || ''}
                  {f.quote && <blockquote>{f.quote}</blockquote>}
                  <p>{f.issue}</p>
                  {f.suggestion && <p className="muted">{f.suggestion}</p>}
                  {f.docId && <button className="link" onClick={() => { go(f.docId); setAiReport(null); }}>{tr('ui.app.deschide')}</button>}
                </div>
              ))}
            </div>
            <div className="actions"><span className="spacer" /><button onClick={() => setAiReport(null)}>{tr('btn.close')}</button></div>
          </div>
        </div>
      )}
      {help && <HelpWindow initialTopic={help.topic} initialTab={help.tab} settings={settings} onClose={() => setHelp(null)} onStartTutorial={startTutorial} />}
      {dialog === 'saveTemplate' && <SaveTemplateDialog api={api} dir={dir} project={project} onSaved={(t) => setToast(tr('ui.app.sablon_salvat_x', { title: t.title }))} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'pageSetup' && (
        <PageSetupDialog
          api={api}
          project={project}
          onSave={(pageSetup) => saveProject({ ...projectRef.current, pageSetup })}
          onPreview={dir ? (pageSetup) => openPrintPreview(pageSetup) : null}
          onClose={() => setDialog(null)}
          onError={report}
        />
      )}
      {dialog === 'printPreview' && printOpts && <PrintPreviewDialog api={api} dir={dir} project={project} options={printOpts} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'toolbars' && (
        <ToolbarCustomizeDialog
          api={api}
          settings={settings}
          aiEnabled={aiEnabled}
          desktop={Boolean(api.setAppMenu)}
          onClose={async () => {
            setDialog(null);
            setSettings(await api.getSettings());
          }}
          onError={report}
        />
      )}
      {conflict?.open && (
        <ConflictDialog
          conflict={conflict}
          onClose={() => setConflict(null)}
          onApply={(choices) => {
            const now = docsNow()[conflict.id];
            setConflict(null);
            // Typed on meanwhile: the choice would overwrite it; their version is in the snapshots.
            if (now !== undefined && now !== conflict.html) return setToast(tr('ui.conflict.schimbat_intre_timp'));
            const html = resolveMerge(conflict.pieces, choices);
            setDocs((d) => ({ ...d, [conflict.id]: html }));
            setEditorHtml(conflict.id, html);
            queueWrite(conflict.id, 'docs', html);
          }}
        />
      )}
      {dialog === 'team' && (
        <TeamDialog
          team={team}
          currentId={selected && !selected.root && !selected.children ? selected.id : ''}
          titleOf={(id) => findNode(project.tree, id)?.title}
          onOpenDoc={(id) => {
            if (!findNode(project.tree, id)) return;
            setDialog(null);
            go(id);
            setView('editor');
          }}
          onSettings={() => {
            setDialog(null);
            openSettings('sharing');
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'mcp' && api.mcpConnectInfo && <McpConnectDialog api={api} dir={dir} onClose={() => setDialog(null)} />}
      {dialog === 'names' && <NameGeneratorDialog onClose={() => setDialog(null)} onInsert={(t) => activeHandle()?.replaceSelection(t)} />}
      {showScratch && <Scratchpad onSendToProject={({ title, html }) => { const parent = findNode(project.tree, project.inboxFolder || '') || project.tree.find((n) => n.root === 'research'); const node = newNode('text', title || tr('ui.app.din_scratchpad')); setTree(updateNode(project.tree, parent.id, { children: [...(parent.children || []), node] })); setDocs((d) => ({ ...d, [node.id]: html })); api.writeDoc(dir, node.id, 'docs', html).catch(report); setToast(tr('ui.app.trimis_in_x', { title: parent.title })); }} load={() => settings.scratchpad || []} save={(notes) => api.setSettings({ scratchpad: notes }).catch(report)} onClose={() => setShowScratch(false)} />}
      {serviceResult && (
        <ServiceResultDialog
          source={serviceResult.source}
          result={serviceResult.result}
          onReplace={(text, edits) => { applyServiceText(serviceResult, text, false, edits); setServiceResult(null); }}
          onInsertAfter={(text) => { applyServiceText(serviceResult, text, true); setServiceResult(null); }}
          onClose={() => setServiceResult(null)}
        />
      )}
      {editorCtx && <ContextMenu x={editorCtx.x} y={editorCtx.y} items={editorCtxItems()} onClose={() => setEditorCtx(null)} />}
      {showSpeech && <SpeechBar api={api} getText={speechText} onInsertText={(t) => activeHandle()?.replaceSelection(t)} onClose={() => setShowSpeech(false)} />}
      {dialog === 'export' && <ExportDialog api={api} dir={dir} project={project} selectionIds={[...selectedIds]} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'compile' && <CompileDialog api={api} dir={dir} project={project} selectionIds={[...selectedIds]} onProjectChange={saveProject} onClose={() => setDialog(null)} onError={report} />}
      {dialog === 'settings' && (
        <SettingsDialog
            initialTab={settingsTab}
            onShortcuts={project ? () => setDialog('shortcuts') : undefined}
          api={api}
          settings={settings}
          project={project}
          dir={dir}
          onProjectChange={saveProject}
          onClose={async () => {
            setDialog(null);
            setSettingsTab('');
            setSettings(await api.getSettings());
          }}
          onError={report}
        />
      )}
      {dialog === 'find' && (
        <FindDialog
          initialQuery={findSeed}
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
          flush={flush}
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
          title={tr('ui.app.muta_selectia_in')}
          items={moveTargets(project.tree, selectionList())}
          onPick={moveSelectionTo}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'appendTo' && (
        <PickNodeDialog
          title={tr('ui.app.adauga_selectia_la_sfarsitul_documentului')}
          items={flatten(project.tree)
            .filter((n) => n.type === 'text' && !inTrash(n.id) && !n.locked)
            .map((n) => ({ id: n.id, title: n.title, depth: ancestorIds(project.tree, n.id).length - 1 }))}
          onPick={(id) => appendSelectionTo(id).catch(report)}
          onClose={() => setDialog(null)}
          emptyText={tr('ui.app.niciun_document')}
        />
      )}
      {dialog === 'importSplit' && <ImportSplitDialog onImport={(mode, sep) => importFilesCmd(mode, sep).catch(report)} onClose={() => setDialog(null)} />}
      {dialog === 'layouts' && (
        <LayoutsDialog layouts={settings.layouts || []} onChange={(l) => saveLayouts(l).catch(report)} onApply={applyLayout} onClose={() => setDialog(null)} />
      )}
      {dialog === 'shortcuts' && (
        <ShortcutsDialog
          commands={activeCommands.map(([group, id, label]) => ({ group, id, label: cmdLabel(id, label) }))}
          settings={settings}
          onSave={async (shortcuts) => {
            await api.setSettings({ shortcuts });
            setSettings(await api.getSettings());
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      <DialogA11y />
      <ReportUi api={api} open={reportOpen} setOpen={setReportOpen} prompt={errorPrompt} setPrompt={setErrorPrompt} onDone={setToast} />
      <Toasts error={error} onCloseError={() => setError('')} toast={toast} onCloseToast={() => setToast('')} />
    </div>
  );
}

// Live regions stay in the DOM all the time so screen readers announce the messages that
// appear in them (a region inserted together with its text is often not read).
function ReportUi({ api, open, setOpen, prompt, setPrompt, onDone }) {
  return (
    <>
      {prompt && !open && (
        <div className="report-toast" role="status">
          <span>{tr('ui.report.toast')}</span>
          <button
            className="primary"
            onClick={() => {
              setPrompt(false);
              setOpen(true);
            }}
          >
            {tr('ui.report.toastSend')}
          </button>
          <button onClick={() => setPrompt(false)} aria-label={tr('btn.close')}>×</button>
        </div>
      )}
      {open && (
        <ReportProblemDialog
          api={api}
          onClose={() => setOpen(false)}
          onDone={(m) => {
            setOpen(false);
            onDone(m);
          }}
        />
      )}
    </>
  );
}

function Toasts({ error, onCloseError, toast, onCloseToast }) {
  return (
    <>
      <div className="live-region" role="alert" aria-live="assertive" aria-atomic="true">
        {error && (
          <div className="toast">
            <span>{error}</span>
            <button onClick={onCloseError} aria-label={tr('btn.close')}>×</button>
          </div>
        )}
      </div>
      <div className="live-region" role="status" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className="toast ok-toast">
            <span>{toast}</span>
            <button onClick={onCloseToast} aria-label={tr('btn.close')}>×</button>
          </div>
        )}
      </div>
    </>
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
