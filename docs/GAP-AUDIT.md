# Gap audit: Scribner, complete feature list

Internal document. Audit date: 2026-10-24. Each row was checked in the code (not in
`docs/FEATURES.md`); the evidence column points to the implementing file:line.
The official manual (literatureandlatte.com) is not reachable from the build container, so the
feature list comes from the reference feature list.

Status: **present** · **partial** · **missing** · **excluded** (deliberately out of scope).
Effort: S (< 1 day) · M (days) · L (week+). Value for a novelist/translator: H · M · L.

## Findings that contradict the checklist

- The help (`manual.ro.js`, `manual.en.js`) and the checklist (B: "Scrivener Links `[[`") promised
  typing `[[` for an internal link, but no code implemented it. **Fixed** (see below).
- The status bar had hard-coded Romanian (`selectate`, `Manuscris:`, `Sesiune`, `Zoom text`) and the
  Composition targets overlay had `Document:`/`Sesiune:` untranslated. **Fixed**.
- Snapshot compare was word-level only (checklist said "compare", Scrivener offers four levels). **Fixed**.

## Table

| Feature | Status | Evidence | Effort | Value |
|---|---|---|---|---|
| **Binder** | | | | |
| Draft / Research / Trash, folders, text-with-children | present | src/components/Binder.jsx:38, src/lib/tree.js | – | H |
| Custom icons, icon colour, label tint on icons | present | src/components/Binder.jsx:116 | – | M |
| Label colour dot in binder rows | present | src/components/Binder.jsx:308 | – | M |
| Document Templates folder (Template Sheets) | present | src/App.jsx:1571 | – | M |
| Research media: images, PDF, audio, video, web | present | src/components/MediaView.jsx:32-34 | – | M |
| PDF annotations (highlight/notes on the PDF itself, macOS) | missing | MediaView uses a plain `<iframe>` | L | L |
| Hoisting, restore from trash, separators | present | src/App.jsx:246, src/lib/tree.js | – | M |
| **Editor** | | | | |
| Page View, text zoom | present | src/components/FormatBar.jsx:486, src/components/StatusBar.jsx | – | M |
| Format bar (fonts, size, colour, highlight, alignment, lists, tables, images) | present | src/components/FormatBar.jsx:14,402,501 | – | H |
| Line-spacing presets, ruler, tab stops, indents | present | src/components/FormatBar.jsx:501, src/components/Ruler.jsx:3 | – | M |
| Styles panel, paragraph/character styles | present | src/components/StylesDialog.jsx, src/editor/writing.js | – | H |
| Inline vs linked notes, annotations, conversions | present | src/components/FormatBar.jsx:441-445 | – | H |
| Revision mode, 5 coloured levels, find by revision | present | src/editor/writing.js:9,119; src/editor/formatting.js:423 | – | H |
| Comments & Footnotes in Inspector | present | src/components/Inspector.jsx (CommentItem) | – | H |
| Linguistic Focus incl. Dialogue Focus | present | src/editor/writing.js:193; src/App.jsx:1685 | – | M |
| Typewriter scrolling | present | src/lib/settingsDefaults.js:19 | – | M |
| Composition mode: backdrop, width, opacity, fade, floating Inspector | present | src/lib/settingsDefaults.js:24 | – | M |
| Internal document links from the format bar | present | src/components/FormatBar.jsx:395 | – | H |
| Typing `[[Title]]` creates an internal link | **present (implemented now; was missing despite help)** | src/editor/writing.js (WikiLink, findLinkTarget) | S | M |
| `[[Title]]` with no match creates a new document | **present (round 2)** | src/editor/writing.js (onMissing, resolveWikiLink); src/components/Editor.jsx (wiki-offer); src/lib/backlinks.js insertLinkedDoc | M | L |
| Automatic back-links (bookmark added to the link target) | **present (round 2)** | src/lib/backlinks.js; src/App.jsx writeSynced; Settings → Editing; Inspector "Links to this document" | M | M |
| In-text bookmarks, highlights, text colour | present | src/components/BookmarksPanel.jsx:4; src/components/FormatBar.jsx:14 | – | M |
| Preserve Formatting blocks (kept verbatim in Compile) | **present (round 2)** | src/editor/formatting.js PreserveFormat; lib/compile.cjs (mapText, parseBlocks `preserve`, DOCX paragraph) | M | L |
| Writing direction RTL | present | src/components/FormatBar.jsx:513 | – | L |
| Images with links, resize, alignment | present | src/components/FormatBar.jsx:317; lib/compile.cjs | – | M |
| Equations / MathType | excluded | docs/FEATURES.md §R (commercial plug-in) | L | L |
| Selection word/character count in footer | **present (implemented now)** | src/components/StatusBar.jsx (useEditorSelection); src/lib/text.js selectionStats | S | H |
| Text transformations (case, spaces, quotes, dashes) | present | src/components/FormatBar.jsx:432-439 | – | M |
| Copy Special, Paste and Match Style | present | src/components/Editor.jsx | – | M |
| Spelling (ro/en), auto-complete list, substitutions | present | src/editor/writing.js:275; src/editor/corrections.js | – | H |
| **Corkboard** | | | | |
| Freeform, arrange by label/status/keyword, stacked folders | present | src/components/Corkboard.jsx:10,115 | – | M |
| Card size/ratio/spacing, stamps, pins, label tint, synopsis image | present | src/components/Corkboard.jsx | – | M |
| Card shapes (rounded/square/ruled cards, colour by label) | **present (round 2)** | src/components/Corkboard.jsx corkClass; src/editor-extra.css | S | L |
| **Outliner** | | | | |
| Column chooser, custom metadata columns, sort, inline edit | present | src/components/Outliner.jsx:8,39 | – | M |
| **Scrivenings / split** | | | | |
| Scrivenings for folders, selection, collections | present | src/components/Scrivenings.jsx | – | H |
| Split editor horizontal/vertical, lock in place, swap | present | src/App.jsx:1680,1987 | – | H |
| Copyholders (third viewer beside editor/split) | **present (round 2)**; one copyholder pane, not one per split pane | src/App.jsx (copyholder state, `.pane.copyholder`) | M | M |
| Quick Reference panels | present | src/components/QuickRef.jsx:6 | – | M |
| **Inspector** | | | | |
| Synopsis text + image, notes, metadata, keywords | present | src/components/Inspector.jsx | – | H |
| Custom metadata types text/checkbox/list/date | present | src/components/Inspector.jsx:230 | – | M |
| Bookmarks (document + project) | present | src/components/Inspector.jsx:474 | – | M |
| Lock Inspector | present | src/components/Inspector.jsx:104 | – | L |
| **Snapshots** | | | | |
| Take, title, rename, delete, restore (rollback) | present | src/components/Inspector.jsx (snapshots tab) | – | H |
| Compare with current text / between two snapshots | present | src/components/Inspector.jsx | – | H |
| Compare by word / phrase / sentence / paragraph | **present (implemented now; was word only)** | src/lib/snapshotDiff.js; src/components/Inspector.jsx (diff-level) | S | M |
| **Project** | | | | |
| Collections (manual + saved search) | present | src/lib/collections.js:1,5 | – | M |
| Project search incl. metadata, saved searches, replace | present | src/lib/projectSearch.js; src/components/AdvancedSearchDialog.jsx | – | H |
| Project targets: deadline, writing days, session reset, notifications | present | src/lib/stats.js:203; src/App.jsx:326 | – | H |
| Writing history (daily/monthly, CSV) | present | src/components/HistoryDialog.jsx | – | M |
| Project & text statistics, word frequency | present | src/lib/stats.js:160 | – | M |
| Keywords HUD | present | src/components/KeywordsDialog.jsx:2 | – | M |
| Name generator | present | src/lib/nameGenerator.js:83 | – | L |
| Project notes (tabs), document notes | present | src/components/ProjectNotesTabs.jsx:3 | – | H |
| Labels/status/metadata/section types editor | present | src/components/ProjectSettingsDialog.jsx:207 | – | M |
| Favorites, Go To, history back/forward | present | src/components/GoToDialog.jsx:44; src/App.jsx | – | M |
| **Compile** | | | | |
| Formats DOCX/PDF/EPUB/HTML/RTF/ODT/MMD/LaTeX/Fountain/FDX/print | present | lib/compile.cjs:3; lib/compileFormats.cjs | – | H |
| Section layouts, separators, front/back matter, compile groups | present | lib/compile.cjs:738-860 | – | H |
| Replacements, transformations, metadata | present | lib/compile.cjs:366 | – | H |
| Footnotes / endnotes / endnotes per chapter | present | lib/compile.cjs:811 | – | H |
| Footnote number format (1, i, a, symbols) + restart per chapter | **present (round 2)**; RTF/ODT format only, EPUB already restarts per chapter file | lib/compile.cjs noteLabel, footnoteState, docxSections; lib/rtfWriter.cjs | M | L |
| Kindle KPF | excluded | closed format; EPUB is accepted by KDP | – | L |
| **Script writing** | | | | |
| Screenplay / stage play / comic / radio, Tab/Enter, auto-complete | present | src/extensions/ScriptMode.js:6 | – | L |
| **Import / Export / Sync** | | | | |
| Word with split, web page, OPML, Final Draft, Fountain, .scriv | present | lib/docxImport.cjs:2; lib/importers.cjs:2; src/App.jsx:1193 | – | H |
| Export files, .scriv export | present | lib/exporters.cjs; lib/scrivExport.cjs | – | M |
| Sync with external folder | present | electron/v04Handlers.cjs:10; lib/folderSync.cjs | – | M |
| Sync with Scrivener iOS | excluded | proprietary mobile format | L | M |
| Backups (zip, on open/close/interval) | present | lib/backup.cjs:158 | – | H |
| Zotero / bibliography | present | lib/zotero.cjs:2; lib/bibliography.cjs | – | M |
| **Application** | | | | |
| Keyboard shortcut customisation | present | src/components/ShortcutsDialog.jsx:7 | – | M |
| Layouts, themes, full screen | present | src/App.jsx:104,754; src/components/SettingsDialog.jsx:35 | – | M |
| Dictation, speak text | present | src/lib/speech.js:1 | – | L |
| Status bar / Composition overlay localised | **present (fixed now)** | src/components/StatusBar.jsx; src/App.jsx comp-targets | S | H |

## Counts

- present: 69 (4 implemented in the first audit, 6 in round 2)
- partial: 0
- missing: 1 (PDF annotations)
- excluded: 3 (MathType, Kindle KPF, iOS sync)

## Implemented in this audit

| Item | Code | Tests |
|---|---|---|
| Selection word/character count in status bar; i18n of status bar and Composition targets | src/components/StatusBar.jsx, src/lib/text.js, src/App.jsx, src/lib/i18n-ui.js | tests/gapAudit.test.js; tests/e2e/browser/gap-audit.cjs |
| Snapshot compare levels | src/lib/snapshotDiff.js, src/components/Inspector.jsx, src/lib/i18n-ui.js | tests/gapAudit.test.js |
| `[[Title]]` internal links | src/editor/writing.js (WikiLink), src/editor/extensions.js, src/components/Editor.jsx | tests/gapAudit.test.js; tests/e2e/browser/gap-audit.cjs |

Help: src/help/manual.ro.js and manual.en.js (snapshots-compare, links, targets/status bar).

## Implemented in round 2

| Item | Code | Tests |
|---|---|---|
| Automatic back-links (Settings → Editing, off by default): a new link from A to B adds A to B's document bookmarks (any path: Ctrl+L, `[[`, format bar, paste, drag), never into B's text; Inspector lists "Links to this document" | src/lib/backlinks.js, src/App.jsx (writeSynced), src/components/Inspector.jsx, src/components/SettingsDialog.jsx, src/lib/settingsDefaults.js | tests/gapAudit2.test.js; tests/e2e/browser/gap-audit-2.cjs |
| `[[New title]]` with no match: offer bar (Create and link / Cancel, Esc), folder = same as current doc or chosen one (remembered as `project.newLinkFolderId`); the link replaces the typed text only if it is still there | src/editor/writing.js, src/editor/extensions.js, src/components/Editor.jsx, src/App.jsx (createLinkedDoc) | same |
| Copyholder: View → Open as reference / Close reference pane, Alt+Shift+click in the binder; read-only unless "Editable"; edits synced with the main/split editors; scroll kept per document; saved in the project UI state and in layouts | src/App.jsx, src/editor-extra.css | tests/e2e/browser/gap-audit-2.cjs |
| Footnote numbering 1/i/a/symbols + restart per chapter: HTML/PDF/EPUB marks and note lists, endnotes, DOCX `w:footnotePr/w:numFmt` (+ one section per chapter with `w:numRestart eachSect`), ODT citation labels, RTF `\ftnnrlc/\ftnnalc/\ftnnchi` | lib/compile.cjs, lib/rtfWriter.cjs, src/components/CompileDialog.jsx | tests/gapAudit2.test.js |
| Corkboard card look: rounded/square corners, ruled cards, card colour by label (stacked groups already existed) | src/components/Corkboard.jsx, src/editor-extra.css | tests/gapAudit2.test.js |
| Preserve Formatting: Format → Preserve formatting wraps the paragraphs in `<div data-preserve-format>`; Compile skips replacements/quotes/dashes inside it, drops compile indent/spacing, keeps the block's font and size (DOCX) and inline style (HTML) | src/editor/formatting.js, src/editor/extensions.js, lib/compile.cjs | tests/gapAudit2.test.js; tests/e2e/browser/gap-audit-2.cjs |

Not covered: restart per chapter in RTF/ODT (format only); EPUB numbering already restarts in every
chapter file and the "no restart" option does not continue the count there; one copyholder for the
whole window (not one per split pane).

## Remaining (not done, with reason)

- PDF annotations (L, L), MathType (excluded), iOS sync (excluded).
