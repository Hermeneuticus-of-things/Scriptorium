# Gap audit: Scribner vs Scrivener 3 (Windows + macOS)

Internal document. Audit date: 2026-10-24. Each row was checked in the code (not in
`FEATURES-SCRIVENER3.md`); the evidence column points to the implementing file:line.
The official manual (literatureandlatte.com) is not reachable from the build container, so the
feature list comes from knowledge of the Scrivener 3 manual and UI.

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
| `[[Title]]` with no match creates a new document | missing | – | M | L |
| Automatic back-links (bookmark added to the link target) | missing | – | M | M |
| In-text bookmarks, highlights, text colour | present | src/components/BookmarksPanel.jsx:4; src/components/FormatBar.jsx:14 | – | M |
| Preserve Formatting blocks (kept verbatim in Compile) | missing | no `preserve` handling in lib/compile.cjs | M | L |
| Writing direction RTL | present | src/components/FormatBar.jsx:513 | – | L |
| Images with links, resize, alignment | present | src/components/FormatBar.jsx:317; lib/compile.cjs | – | M |
| Equations / MathType | excluded | FEATURES-SCRIVENER3.md §R (commercial plug-in) | L | L |
| Selection word/character count in footer | **present (implemented now)** | src/components/StatusBar.jsx (useEditorSelection); src/lib/text.js selectionStats | S | H |
| Text transformations (case, spaces, quotes, dashes) | present | src/components/FormatBar.jsx:432-439 | – | M |
| Copy Special, Paste and Match Style | present | src/components/Editor.jsx | – | M |
| Spelling (ro/en), auto-complete list, substitutions | present | src/editor/writing.js:275; src/editor/corrections.js | – | H |
| **Corkboard** | | | | |
| Freeform, arrange by label/status/keyword, stacked folders | present | src/components/Corkboard.jsx:10,115 | – | M |
| Card size/ratio/spacing, stamps, pins, label tint, synopsis image | present | src/components/Corkboard.jsx | – | M |
| Card shapes (rounded/square/ruled cards, macOS appearance) | missing | – | S | L |
| **Outliner** | | | | |
| Column chooser, custom metadata columns, sort, inline edit | present | src/components/Outliner.jsx:8,39 | – | M |
| **Scrivenings / split** | | | | |
| Scrivenings for folders, selection, collections | present | src/components/Scrivenings.jsx | – | H |
| Split editor horizontal/vertical, lock in place, swap | present | src/App.jsx:1680,1987 | – | H |
| Copyholders (third/fourth viewer inside an editor) | partial | Quick Reference windows substitute (src/components/QuickRef.jsx:6) | M | M |
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
| Footnote number format (i, a, symbols) | missing | lib/compile.cjs:66 (arabic only) | M | L |
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

- present: 63 (of which 4 implemented or fixed in this audit)
- partial: 1 (copyholders)
- missing: 7 (PDF annotations, `[[` creates new document, back-links, Preserve Formatting, card shapes, footnote number format; `[[` link itself is now present)
- excluded: 3 (MathType, Kindle KPF, iOS sync)

## Implemented in this audit

| Item | Code | Tests |
|---|---|---|
| Selection word/character count in status bar; i18n of status bar and Composition targets | src/components/StatusBar.jsx, src/lib/text.js, src/App.jsx, src/lib/i18n-ui.js | tests/gapAudit.test.js; tests/e2e/browser/gap-audit.cjs |
| Snapshot compare levels | src/lib/snapshotDiff.js, src/components/Inspector.jsx, src/lib/i18n-ui.js | tests/gapAudit.test.js |
| `[[Title]]` internal links | src/editor/writing.js (WikiLink), src/editor/extensions.js, src/components/Editor.jsx | tests/gapAudit.test.js; tests/e2e/browser/gap-audit.cjs |

Help: src/help/manual.ro.js and manual.en.js (snapshots-compare, links, targets/status bar).

## Remaining (not done, with reason)

- Automatic back-links (M effort, M value): needs a project-level setting and a hook on every link
  creation path (format bar, `[[`, paste); next candidate.
- Copyholders (M, M): Quick Reference windows already cover side-by-side reference.
- `[[New title]]` creating a document (M, L), Preserve Formatting (M, L), footnote number formats
  (M, L; DOCX footnote numbering needs section properties), card shapes (S, L): low value.
- PDF annotations (L, L), MathType (excluded), iOS sync (excluded).
