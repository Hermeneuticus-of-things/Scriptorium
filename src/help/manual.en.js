// Scribner user manual (English, condensed). Same chapter and section ids as manual.ro.js
// so context help works in both languages.

const k = (s) => s.split('+').map((p) => `<kbd>${p}</kbd>`).join('+');

export const MANUAL_EN = [
  {
    id: 'start',
    title: 'Getting started',
    sections: [
      { id: 'start-intro', title: 'What Scribner is', html: `<p>Scribner is a writing program for long texts. You write in <strong>small documents</strong> (scenes, chapters, sections) arranged in a tree called the <strong>binder</strong>, move them freely, and <strong>Compile</strong> them into one manuscript (DOCX, PDF, EPUB and more). It is written from scratch; <code>.scriv</code> projects can be imported and exported. AI is <strong>optional</strong> and can be switched off entirely in <em>Settings → AI</em>.</p>` },
      { id: 'start-window', title: 'The main window', html: `<p><strong>Binder</strong> on the left (Draft, Research, Trash; toggle ${k('Ctrl+Shift+B')}), the <strong>work area</strong> in the middle (Editor ${k('Ctrl+1')}, Corkboard ${k('Ctrl+2')}, Outline ${k('Ctrl+3')}), the <strong>Inspector</strong> on the right (${k('Ctrl+Shift+I')}). The top bar is kept uncluttered: ⌂ (close project), Back/Forward, the project title, the <em>Editor / Corkboard / Outline</em> switch, <em>Compile</em> and <em>Inspector</em>. Everything else is in the menus: <em>File, Edit, View, Project, Documents, Navigate, Tools, AI, Help</em> (in the desktop app, in the window's native menu), with related commands grouped in submenus (▸) such as <em>File → Import ▸ / Export ▸</em>; <em>Format</em> is a submenu of <em>Edit</em> and <em>Window</em> one of <em>View</em>. Split editor is <em>View → Split editor</em>, Composition is in <em>View</em> (F11). Panel widths are remembered per project.</p>
<p>The <strong>AI menu</strong> holds everything AI: <em>AI assistant</em>, <em>I-REP / I-EDIT</em>, <em>AI on selection ▸</em>, <em>AI on the whole book ▸</em>, <em>NotebookLM ▸</em>, <em>AI settings…</em> and, in the desktop app, <em>Connect to Claude (MCP)…</em>. With AI turned off only <em>I-REP</em> (works without AI) and <em>AI settings…</em> remain.</p>
<p><strong>Customize the toolbars</strong> with <em>View → Customize toolbar…</em>: for the top bar and the format bar, add, remove and reorder items (drag, or ↑/↓; Alt+↑/↓ in the list), add separators and flexible spaces, choose the display (icon and text / icon only / text only), or <em>Restore defaults</em>. Anything removed stays in the menus. The format bar moves what does not fit on one row into <em>»</em>.</p>` },
      { id: 'start-first-project', title: 'Your first project in five minutes', html: `<ol><li>On the Home screen pick a template, type a title, click Create and choose a folder.</li><li>Select a scene in the binder and write.</li><li>${k('Ctrl+N')} adds a document, ${k('Ctrl+Shift+N')} a folder.</li><li>Fill in the synopsis in the Inspector; it shows on the corkboard card.</li><li>${k('Ctrl+Shift+E')} opens Compile.</li></ol><p>Saving is automatic; ${k('Ctrl+S')} saves immediately. To learn by doing, use <em>Help → Interactive tutorial</em>.</p>` },
      { id: 'start-saving', title: 'Saving, backups and project files', html: `<p>A project is a <code>Name.scribner</code> folder of plain files (<code>project.json</code>, <code>docs/</code>, <code>notes/</code>, <code>snapshots/</code>, <code>media/</code>). Autosave runs after a few idle seconds. Automatic backups are configured in <em>Settings → Backup</em>; <em>File → Backups…</em> lists and restores them (as a separate project). <em>Save as…</em> (${k('Ctrl+Shift+S')}) copies the project.</p>` },
    ],
  },
  {
    id: 'projects',
    title: 'Projects and templates',
    sections: [
      { id: 'projects-home', title: 'Home screen', html: `<p>Recent projects (pin favourites, clear list), open, import from Scrivener, and new project from a template. <em>Settings → General</em> can reopen the last project at startup.</p>` },
      { id: 'projects-templates', title: 'Built-in templates', html: `<p>General: Blank. Fiction: Novel, Novel with parts, Short story collection, Short story (manuscript format), Formatted novel. Non-fiction: Non-fiction, Essay, Thesis, Lecture notes, Recipe collection. Script: Screenplay, Stage play. Poetry: Poetry collection. Some include a <em>Templates</em> folder (character and place sheets) used by <em>Document → New from template</em>.</p>` },
      { id: 'projects-user-templates', title: 'Your own templates', html: `<p><em>File → Save as template…</em> stores the current project (without snapshots and history) with a title, category, description and icon. It appears on the Home screen.</p>` },
      { id: 'projects-properties', title: 'Project properties and settings', html: `<p><em>Project → Project settings…</em>: title, author, title abbreviation, labels, statuses, custom metadata, section types, default formatting, auto-complete, template folder, backup options. Author and title feed Compile placeholders.</p>` },
      { id: 'projects-windows', title: 'Windows and layouts', html: `<p><em>File → New window</em>. <em>Window → Save current layout…</em> and <em>Manage layouts…</em>; each saved layout becomes a Window menu command. Full screen: ${k('Ctrl+Shift+F11')}.</p>` },
    ],
  },
  {
    id: 'binder',
    title: 'Binder',
    sections: [
      { id: 'binder-basics', title: 'Draft, Research, Trash', html: `<p>Only <strong>Draft</strong> (Manuscris) is compiled. <strong>Research</strong> holds notes, sources and media. <strong>Trash</strong> keeps deleted items; <em>Restore from Trash</em> puts them back. Text documents can have children.</p>` },
      { id: 'binder-organize', title: 'Creating, moving, renaming', html: `<p>${k('Ctrl+N')} / ${k('Ctrl+Shift+N')} new document / folder (created after the selection, title ready to type; ${k('Enter')} then moves to the editor); ${k('F2')} rename; ${k('↑')}/${k('↓')}/${k('←')}/${k('→')} navigate, collapse, expand, type letters to jump; ${k('Delete')} moves to the Trash (no confirmation; Empty Trash asks); ${k('Ctrl+Z')}/${k('Ctrl+Y')} undo/redo binder moves while the binder has focus; ${k('Esc')} back to the editor; drag &amp; drop (Alt-drag copies); ${k('Ctrl')}/${k('Shift')}+click for multiple selection; ${k('Ctrl+↑')}/${k('Ctrl+↓')} move, ${k('Ctrl+←')}/${k('Ctrl+→')} change level. <em>Move to…</em>, <em>Duplicate</em> (${k('Ctrl+D')}), convert, sort and separator commands are in the Document menu.</p>` },
      { id: 'binder-hoist', title: 'Hoist, favourites, binder search', html: `<p><em>Navigate → Hoist binder</em> shows only one folder. <em>Reveal in Binder</em>: ${k('Ctrl+Alt+R')}. Tick <em>Favourite</em> in the Inspector to list a document in the Navigate menu. Icons and colours are set in the Inspector.</p>` },
      { id: 'binder-media', title: 'Media in Research', html: `<p><em>Document → Add files to Research</em> imports images, PDF, audio and video, viewable in the editor. <code>&lt;$img:Name&gt;</code> inserts a Research image at Compile.</p>` },
    ],
  },
  {
    id: 'editor',
    title: 'Editor and formatting',
    sections: [
      { id: 'editor-basics', title: 'Writing', html: `<p>Format Bar: styles, font, bold/italic/underline/strike, super/subscript, small caps, colours, highlight, alignment, lists, comments. Smart quotes, dashes, ellipses, auto-capitalisation and custom replacements are set in <em>Settings → Corrections</em>. ${k('Ctrl+Shift+V')} pastes and matches style.</p>` },
      { id: 'editor-paragraph', title: 'Paragraphs, ruler, tables, images', html: `<p>Paragraph menu for spacing and indents, ruler with tab stops, numbered lists, tables, images with width and alignment, inserts (date, page break, link, placeholder), RTL paragraphs. Select paragraph/sentence/word: ${k('Ctrl+Alt+Shift+P')}/${k('S')}/${k('W')}. Copy/paste formatting: ${k('Ctrl+Alt+C')}/${k('Ctrl+Alt+V')}.</p>` },
      { id: 'editor-split-merge', title: 'Split and merge', html: `<p>Split at cursor ${k('Ctrl+K')}, split with selection as title ${k('Ctrl+Shift+K')}, merge ${k('Ctrl+Shift+M')}; a snapshot is taken first. <em>Append selection to document…</em> sends text elsewhere.</p>` },
      { id: 'editor-view', title: 'Zoom, page view, focus', html: `<p>Footer with counts and target, page view, typewriter scrolling, invisibles, current-line highlight, fading, linguistic focus (nouns, verbs), and text-appearance toggles for comments and revisions.</p>` },
      { id: 'editor-revisions', title: 'Revision mode and tracked changes', html: `<p>Five revision colours. Tracked changes in DOCX become revision marks on import and are written back on export.</p>` },
      { id: 'editor-links', title: 'Links, bookmarks, look-up', html: `<p>Type <code>[[</code> for an internal link. Project bookmarks in the Project menu. Dictionary, synonyms (dexonline), Wikipedia and Google look-ups in the Tools menu. Spelling uses the system spellchecker (Romanian and English).</p>` },
    ],
  },
  {
    id: 'styles',
    title: 'Styles',
    sections: [
      { id: 'styles-basics', title: 'Paragraph and character styles', html: `<p><em>Format → Styles…</em>: create, rename, redefine from selection, next style, shortcuts.</p>` },
      { id: 'styles-compile', title: 'Styles on import and Compile', html: `<p>Import a stylesheet from another project. Style names are kept in DOCX output.</p>` },
    ],
  },
  {
    id: 'comments',
    title: 'Comments and notes',
    sections: [
      { id: 'comments-comments', title: 'Comments', html: `<p>Linked comments with colour, author and date, listed in the Inspector. Inline annotations convert to comments and back. Neither reaches the compiled book (comments can be exported as Word comments).</p>` },
      { id: 'comments-footnotes', title: 'Footnotes', html: `<p>Insert from the Format Bar; double-click to edit. Compile can output footnotes, chapter endnotes or book endnotes.</p>` },
      { id: 'comments-notes', title: 'Document and project notes', html: `<p>Each document has notes in the Inspector. <em>Project → Project notes (tabs)…</em> holds shared notes.</p>` },
      { id: 'comments-find-format', title: 'Find by formatting', html: `<p>${k('Ctrl+Alt+F')} finds comments, notes, annotations, highlights, colours, revisions, styles, bookmarks.</p>` },
    ],
  },
  {
    id: 'scrivenings',
    title: 'Scrivenings, split, Quick Reference, composition',
    sections: [
      { id: 'scrivenings-basics', title: 'Scrivenings', html: `<p>Selecting a folder in Editor view shows its documents as one editable text. Also for a selection or the active collection; titles and separators can be toggled.</p>` },
      { id: 'scrivenings-split', title: 'Split editor', html: `<p>The Split button opens a second pane; ${k('Alt')}+click in the binder opens a document there. Horizontal/vertical, swap, lock.</p>` },
      { id: 'scrivenings-quickref', title: 'Quick Reference', html: `<p>${k('Ctrl+Shift+R')} opens the current document in a small floating window.</p>` },
      { id: 'scrivenings-composition', title: 'Composition mode', html: `<p>${k('F11')} hides everything but the text; options in <em>Settings → Appearance</em>. ${k('Esc')} leaves.</p>` },
      { id: 'scrivenings-nav', title: 'Navigation', html: `<p>Back/Forward ${k('Alt+←')}/${k('Alt+→')}, previous/next document ${k('Ctrl+Alt+↑')}/${k('Ctrl+Alt+↓')}, Go to ${k('Ctrl+G')}.</p>` },
    ],
  },
  {
    id: 'corkboard',
    title: 'Corkboard',
    sections: [
      { id: 'corkboard-basics', title: 'Index cards', html: `<p>${k('Ctrl+2')}: cards with title and synopsis; drag to reorder. Double-click a title to open the document; click selects a card, arrows move between cards, ${k('Enter')}/${k('F2')} edits the title, ${k('Ctrl+Enter')} opens, ${k('Ctrl+←')}/${k('Ctrl+→')} reorders; <em>+ Card</em> adds after the selected card with its title ready to type. Outline: click selects, double-click opens, ↑/↓ navigate, ←/→ collapse/expand, ${k('Enter')} renames.</p>` },
      { id: 'corkboard-options', title: 'Size, freeform, arrange', html: `<p>Card size, ratio, spacing, columns; freeform mode with <em>Commit order</em>; arrange by label, status or keyword; several folders stacked.</p>` },
    ],
  },
  {
    id: 'outline',
    title: 'Outline',
    sections: [{ id: 'outline-basics', title: 'The outliner', html: `<p>${k('Ctrl+3')}: hierarchical list with selectable columns (label, status, include, words, characters, target, progress, dates, keywords, section type, custom metadata), sorting, inline editing, drag &amp; drop.</p>` }],
  },
  {
    id: 'inspector',
    title: 'Inspector and metadata',
    sections: [
      { id: 'inspector-basics', title: 'What the Inspector holds', html: `<p>Synopsis (text or image), label, status, include in Compile, section type, keywords, custom metadata, target, dates, icon, favourite, notes, bookmarks, snapshots, comments and footnotes. The lock keeps it on one document.</p>` },
      { id: 'inspector-labels', title: 'Labels, status, keywords', html: `<p>Defined in Project settings; <em>Project → Keywords…</em> manages keywords. <em>Auto-generate synopsis from text</em> works without AI.</p>` },
      { id: 'inspector-metadata', title: 'Custom metadata and section types', html: `<p>Text, Checkbox, List and Date fields. Section types tell Compile how each document looks; assigned by level or manually.</p>` },
    ],
  },
  {
    id: 'snapshots',
    title: 'Snapshots',
    sections: [
      { id: 'snapshots-basics', title: 'Document versions', html: `<p>${k('Ctrl+5')} takes a snapshot. Automatic snapshots before split, merge, project replace, sync and MCP writes.</p>` },
      { id: 'snapshots-compare', title: 'Compare and restore', html: `<p>View, diff against current text or another snapshot, rename, delete, restore (the current text is snapshotted first).</p>` },
    ],
  },
  {
    id: 'search',
    title: 'Search and collections',
    sections: [
      { id: 'search-doc', title: 'Find in document', html: `<p>${k('Ctrl+F')} opens find and replace in the current document, with highlighting and next/previous.</p>` },
      { id: 'search-project', title: 'Project find and replace', html: `<p>${k('Ctrl+Shift+F')}: regex, whole words, case, trash; replace also in titles, synopses, notes, with a snapshot first.</p>` },
      { id: 'search-advanced', title: 'Advanced search', html: `<p>Search in specific fields with filters; save as a search collection.</p>` },
      { id: 'search-collections', title: 'Collections', html: `<p>Tabs above the binder holding document lists; Scrivenings and Compile can use them.</p>` },
    ],
  },
  {
    id: 'targets',
    title: 'Targets and statistics',
    sections: [
      { id: 'targets-project', title: 'Project and session targets', html: `<p><em>Project → Targets and deadline…</em>: book target (words, characters or pages), session target, deadline and writing days, reset rules, notification.</p>` },
      { id: 'targets-document', title: 'Document target', html: `<p>Set in the Inspector; shown in the footer and Outline.</p>` },
      { id: 'targets-stats', title: 'Statistics and writing history', html: `<p>${k('Ctrl+Alt+Shift+I')} statistics, ${k('Ctrl+Shift+T')} targets; <em>Writing history…</em> with daily/monthly charts and CSV.</p>` },
    ],
  },
  {
    id: 'compile',
    title: 'Compile',
    sections: [
      { id: 'compile-basics', title: 'How Compile works', html: `<p>${k('Ctrl+Shift+E')}. Choose a <strong>format</strong> (Standard manuscript, Paperback, E-book, Modern, PDF A5 reading, Default, Times New Roman, Courier), an <strong>output</strong> (DOCX, PDF, EPUB, HTML, RTF, ODT, Markdown, MultiMarkdown, plain text, Fountain, FDX, LaTeX, Print) and the <strong>contents</strong>. Duplicate built-in formats to edit them; <em>Save global</em> shares a format across projects.</p>` },
      { id: 'compile-content', title: 'Contents tab', html: `<p>Compiled folder, filters by label/status/collection, per-document include, front and back matter.</p>` },
      { id: 'compile-sections', title: 'Sections and separators', html: `<p>Each section type gets a layout (title, prefix/suffix such as <code>Chapter &lt;$n&gt;</code>, case, alignment, page break). Separators: text, page break, blank line or none.</p>` },
      { id: 'compile-placeholders', title: 'Placeholders', html: `<p><code>&lt;$n&gt;</code> (with <code>:roman</code>, <code>:lroman</code>, <code>:words</code>, <code>:Words</code>, <code>:WORDS</code>), <code>&lt;$t&gt;</code>, <code>&lt;$wc&gt;</code>, <code>&lt;$projecttitle&gt;</code>, <code>&lt;$abbr_title&gt;</code>, <code>&lt;$author&gt;</code>, <code>&lt;$surname&gt;</code>, <code>&lt;$forename&gt;</code>, <code>&lt;$date&gt;</code>, <code>&lt;$year&gt;</code>, <code>&lt;$p&gt;</code> (headers/footers), <code>&lt;$img:Name&gt;</code>. Full list in the Placeholders tab. Number words are Romanian.</p>` },
      { id: 'compile-replacements', title: 'Replacements and transformations', html: `<p>Find → replace pairs applied only to the compiled text (regex, whole word, case); quote/dash conversion, highlight and colour removal.</p>` },
      { id: 'compile-notes', title: 'Notes and comments', html: `<p>Footnotes, chapter endnotes or book endnotes; comments removed or exported as Word comments (DOCX).</p>` },
      { id: 'compile-page', title: 'Page setup', html: `<p>Paper size, margins, font, line spacing, headers and footers (first page and odd/even can differ). For single documents: <em>File → Page setup…</em>, <em>Print preview</em>, <em>Print</em> (${k('Ctrl+P')}).</p>` },
      { id: 'compile-epub', title: 'EPUB and metadata', html: `<p>Title, author, ISBN, language, keywords, cover image; EPUB 3 with title page and generated TOC.</p>` },
      { id: 'compile-other-exports', title: 'LaTeX, Pandoc, MultiMarkdown', html: `<p>Direct exports in the File menu; <code>[@key]</code> citations use the imported bibliography.</p>` },
    ],
  },
  {
    id: 'import',
    title: 'Import/export, Scrivener .scriv, sync',
    sections: [
      { id: 'import-files', title: 'Importing files', html: `<p>Word, RTF, ODT, text, Markdown (plus HTML, Fountain, FDX on desktop) with splitting at Heading 1, Heading 1–2 or a separator line. Also OPML, web pages, Zotero bibliographies and project bundles.</p>` },
      { id: 'import-scrivener', title: 'Scrivener projects', html: `<p>Import Scrivener 1/2/3 from the Home screen; everything is converted and a full copy stays in <code>scrivener-original/</code>; an import report follows. <em>File → Export as Scrivener project</em> writes back.</p>` },
      { id: 'import-export', title: 'Exporting documents', html: `<p>Documents as DOCX/RTF/ODT/TXT/MD with folder structure, OPML, CSV metadata, editor package, web/mobile bundle.</p>` },
      { id: 'import-sync', title: 'External folder sync', html: `<p>Write documents to a folder (RTF, TXT, MD, FDX, Fountain), edit elsewhere, then read changes back (snapshots first). Can run on open/close.</p>` },
    ],
  },
  {
    id: 'script',
    title: 'Script Mode',
    sections: [
      { id: 'script-basics', title: 'Scripts', html: `<p><em>Format → Script mode</em>: Screenplay, Stage play, Stage play (UK), Comic, BBC radio drama. Each paragraph has an element.</p>` },
      { id: 'script-keys', title: 'Tab and Enter', html: `<p><kbd>Tab</kbd> changes the element, ${k('Shift+Tab')} goes back, <kbd>Enter</kbd> picks the next element. See the Syntax tab. Character names and scene headings auto-complete.</p>` },
      { id: 'script-export', title: 'Final Draft and Fountain', html: `<p>Export .fdx and .fountain from the File menu or Compile; both can be imported.</p>` },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    sections: [
      { id: 'tools-names', title: 'Name generator', html: `<p>Names by culture, gender and format; copy or insert.</p>` },
      { id: 'tools-scratchpad', title: 'Scratchpad', html: `<p>A global notepad; send a note into the open project.</p>` },
      { id: 'tools-speech', title: 'Read aloud and dictation', html: `<p>System voices read the text; dictation where the system supports it.</p>` },
      { id: 'tools-timeline', title: 'Timeline', html: `<p>Scenes on a time axis from custom metadata (Date, Time, Duration, Location, POV) or <code>Date: …</code> lines in the synopsis.</p>` },
      { id: 'tools-relations', title: 'Relationship map', html: `<p>Characters that share scenes, guessed from capitalised names.</p>` },
      { id: 'tools-pacing', title: 'Pacing analysis', html: `<p>Per-scene length, dialogue share and sentence length, without AI.</p>` },
      { id: 'tools-research', title: 'Project research and glossaries', html: `<p>Local retrieval over the project (RAG), with an optional AI answer; glossary and print TOC generation.</p>` },
    ],
  },
  {
    id: 'irep',
    title: 'I-REP/I-EDIT review and profiles',
    sections: [
      { id: 'irep-basics', title: 'I-REP', html: `<p>Check, apply safe fixes, re-check, in loops; works without AI.</p>` },
      { id: 'irep-iedit', title: 'I-EDIT', html: `<p>Editorial rounds run by the AI, previewed before applying, with a snapshot first.</p>` },
      { id: 'irep-profiles', title: 'Profiles: Generic and Romanian', html: `<p><strong>Generic</strong> (default): typography and LLM residue for any text. <strong>Romanian</strong>: DOOM III, P1–P13, R0–R11, foreign terms. Set in <em>Settings → AI</em>; stored per project.</p>` },
      { id: 'irep-near', title: 'Near repetitions (S70)', html: `<p>The panel's <em>Near repetitions (S70)</em> section lists the same content word (same lemma or form) in one sentence or in two neighbouring sentences, anadiplosis „…scutul. Scutul…” included: one line <code>⚠ REP L&lt;n&gt; «form» ×k</code> per paragraph (L = paragraph number) where the group occurs; a click selects it in the editor. Function words, locutions („în fața”) are not counted and reduplicates („pas cu pas”) count once; the book's own terms are counted. It is a <strong>signal</strong>: it never stops the loop, is never fixed automatically and never goes to the repair prompt (S70: a term is not changed only to avoid repeating it). The list goes only to I-EDIT round <strong>R8b The word and the letter</strong>.</p>` },
      { id: 'irep-author', title: 'Your text: editing a proposal and protecting your paragraphs', html: `<p>What you write by hand is a decision. Paragraphs you change in the editor become <strong>author text</strong> (after a short pause) and every save is journaled in <code>editorial/MODIFICARI_AUTOR.jsonl</code>, one row per changed chunk. In a proposal, <em>✎ Edit</em> lets you correct the proposed text; <em>Save</em> takes a <code>.bak-autor-&lt;date-time&gt;</code> snapshot first and refuses when the document changed meanwhile (409) or the new text is under 20% of the old one (412, with <em>Save anyway</em>). The loop never rewrites author text: the <code>fraza_autor_atinsa</code> gate rejects any result that changes, moves or deletes it, showing the line and why. The model sees your paragraphs under „TEXT AL AUTORULUI (doar semnalezi)”; issues on them come to you in <em>COADA_AUTOR</em>, issues next to them go to the repair with a note, and safe fixes skip them. A save during a loop is logged as <code>MODIFICARE_AUTOR</code>, the report lists „Your changes in the text”, and the text is re-checked right before any write. A rejected proposal stays rejected only while the document text is unchanged.</p>` },
    ],
  },
  {
    id: 'ai',
    title: 'Optional AI and MCP',
    sections: [
      { id: 'ai-setup', title: 'Enabling AI', html: `<p><em>Settings → AI</em>: enable and enter an Anthropic API key, encrypted by the OS and kept in the main process.</p>` },
      { id: 'ai-assistant', title: 'The assistant', html: `<p>Proofreading, synopsis, continuation, critique, consistency and questions; bulk synopsis, living character sheets and zoom-level review in the Tools menu.</p>` },
      { id: 'ai-mcp', title: 'AI agents via MCP', html: `<p><code>mcp/server.mjs</code> gives an MCP client everything the app does without a window: binder, text, search, metadata, notes tabs, keywords, labels, targets, collections, comments, footnotes, split/merge, trash, snapshot compare, statistics, timeline, research, glossary, Compile in every format, import/export (including <code>.scriv</code>, NotebookLM, editor package), new projects from templates and backups; every write is snapshotted and logged in <code>agent-log.jsonl</code>. <code>--read-only</code> limits to reading. The exact command is in <em>Settings → AI → MCP connection</em>.</p>` },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    sections: [{ id: 'settings-tabs', title: 'Settings tabs', html: `<p>General, Appearance, Behaviors, Corrections, Editing, Backup, Keyboard, AI, Language. In Corrections, <em>Learn from my corrections</em> (on by default) adds a misspelled word you fix by hand (select it and type the right form, or pick a suggestion from the right-click menu) to the auto-replacements, marked <em>learned</em>, so it is fixed while typing next time. The portable build keeps settings in <code>Scribner-data/</code> next to the executable.</p>` }],
  },
  {
    id: 'shortcuts',
    title: 'Shortcuts',
    sections: [
      { id: 'shortcuts-config', title: 'Customising shortcuts', html: `<p><em>Tools → Keyboard shortcuts…</em>: click a command, press the keys, save. Empty disables; conflicts are marked.</p>` },
      { id: 'shortcuts-common', title: 'Most used', html: `<p>${k('Ctrl+S')} save, ${k('Ctrl+N')} new document, ${k('Ctrl+1')}–${k('Ctrl+3')} views, ${k('F11')} composition, ${k('Ctrl+K')} split, ${k('Ctrl+G')} go to, ${k('Ctrl+5')} snapshot, ${k('Ctrl+Shift+E')} Compile, ${k('F1')} manual.</p>` },
    ],
  },
  {
    id: 'faq',
    title: 'Troubleshooting and FAQ',
    sections: [
      { id: 'faq-missing-compile', title: 'A document is missing from the compiled book', html: `<p>Is it in Draft? Is <em>Include in Compile</em> ticked? Do the Contents filters exclude it? Does its section type hide text?</p>` },
      { id: 'faq-placeholder', title: 'A placeholder shows as text', html: `<p>Check spelling and the Placeholders tab; <code>&lt;$p&gt;</code> only works in headers/footers.</p>` },
      { id: 'faq-spelling', title: 'Romanian spelling not underlined', html: `<p>On Windows/macOS install the Romanian language pack in the OS.</p>` },
      { id: 'faq-lost-text', title: 'I lost text', html: `<p>Undo, snapshots, Trash, then <em>File → Backups…</em>.</p>` },
      { id: 'faq-ai', title: 'AI commands are greyed out', html: `<p>Enable AI and enter the key in <em>Settings → AI</em>.</p>` },
      { id: 'faq-scriv', title: 'Scrivener import missed something', html: `<p>Read the import report; the original copy is in <code>scrivener-original/</code>.</p>` },
      { id: 'faq-report', title: 'Reporting a problem', html: `<p><em>Help → Report a problem</em> opens the GitHub issues page. Include the version, OS and steps to reproduce.</p>` },
    ],
  },
  {
    id: 'yours',
    title: 'What you do (steps that depend on your accounts and computer)',
    sections: [
      {
        id: 'yours-overview',
        title: 'In short',
        html: `<p>The program is complete, but a few things depend on your accounts, keys and settings. Without them those features stay off; everything else works.</p>
<ul>
<li>keys for outside services (translation, grammar, voice, bibliography);</li>
<li>a key for an AI model;</li>
<li>the Romanian language pack for the Windows spell checker;</li>
<li>the Claude Code connection (MCP), if you want an agent to work in the project;</li>
<li>a synced folder (OneDrive, Dropbox, Google Drive or a NAS), if you also write in the browser.</li>
</ul>`,
      },
      {
        id: 'yours-services',
        title: 'Service keys: DeepL, Google, LanguageTool, Speechify, Zotero',
        html: `<p>Open <em>Settings → Services and accounts</em>. Each service has a <em>Where do I find the key</em> link. Paste the key and press <em>Save</em>; it is encrypted on your computer and cannot be read back from the interface. Zotero needs your numeric user ID too; then use <em>File → Import bibliography from Zotero</em>.</p>`,
      },
      {
        id: 'yours-ai',
        title: 'AI key and a test with a real model',
        html: `<p>In <em>Settings → AI</em> choose the provider, paste the key and type the model id. Models are retired often: if you see <em>the model was retired</em>, pick another one. Free options: OpenRouter models ending in <code>:free</code>, the free credits of a <code>nvapi-…</code> key from build.nvidia.com, or Ollama / LM Studio locally.</p>
<pre>$env:OPENROUTER_API_KEY = "sk-or-…"
node scripts\ai-smoke.cjs openrouter</pre>
<p>The script picks a model that answers and tries proofreading, translation and a definition. Never put keys in files or messages; regenerate any key that leaked.</p>`,
      },
      {
        id: 'yours-spelling',
        title: 'Romanian spell checking on Windows',
        html: `<p>Windows uses the system spell checker: <em>Windows Settings → Time &amp; language → Language &amp; region → Add a language → Romanian</em>, with spell checking. Restart Scribner.</p>`,
      },
      {
        id: 'yours-mcp',
        title: 'Connecting Claude, Codex and other AI agents (MCP)',
        html: `<p>Scribner ships an MCP server (70+ tools). Any MCP client can use it, and no Node.js is needed: the installed app runs the server itself with <code>ELECTRON_RUN_AS_NODE=1</code>. Easiest: open the project and use <em>AI → Connect to Claude (MCP)…</em>. Installer paths on Windows (current user):</p>
<pre>Program: C:\\Users\\YOU\\AppData\\Local\\Programs\\Scribner\\Scribner.exe
Server:  C:\\Users\\YOU\\AppData\\Local\\Programs\\Scribner\\resources\\app\\mcp\\server.mjs</pre>
<p><strong>Claude Code:</strong></p>
<pre>claude mcp add scribner --scope user -e ELECTRON_RUN_AS_NODE=1 -- "&lt;Program&gt;" "&lt;Server&gt;" --project "D:\\Books\\My book.scribner"</pre>
<p><strong>OpenAI Codex:</strong></p>
<pre>codex mcp add scribner --env ELECTRON_RUN_AS_NODE=1 -- "&lt;Program&gt;" "&lt;Server&gt;" --project "D:\\Books\\My book.scribner"</pre>
<p><strong>Gemini CLI:</strong></p>
<pre>gemini mcp add scribner -e ELECTRON_RUN_AS_NODE=1 "&lt;Program&gt;" "&lt;Server&gt;" --project "D:\\Books\\My book.scribner"</pre>
<p><strong>Claude Desktop, Cursor, Windsurf, LM Studio</strong> (<code>mcpServers</code> JSON; double every backslash), and <strong>VS Code</strong> (<code>.vscode\\mcp.json</code>, key <code>servers</code>, <code>"type": "stdio"</code>):</p>
<pre>"scribner": {
  "command": "&lt;Program&gt;",
  "args": ["&lt;Server&gt;", "--project", "D:\\\\Books\\\\My book.scribner"],
  "env": { "ELECTRON_RUN_AS_NODE": "1" }
}</pre>
<p>Add <code>--read-only</code> for read access only. Every write takes a snapshot first and is logged in <code>agent-log.jsonl</code>.</p>`,
      },
      {
        id: 'yours-sync',
        title: 'The same project on the desktop and in the browser',
        html: `<p>Keep the <code>.scribner</code> folder in OneDrive, Dropbox, Google Drive or on a NAS. In Chrome or Edge the web version opens that same folder and writes into it; changes from the other side show up within seconds. Do not edit the same document in two places at once. Phones cannot open folders: use the .json bundle there.</p>`,
      },
      {
        id: 'yours-karma',
        title: 'Your Scrivener projects and I-REP / I-EDIT rules',
        html: `<p>Import a real <code>.scriv</code> with <em>File → Import Scrivener project</em> and read the import report. I-REP / I-EDIT follow your VKB2 definitions: near repetitions (S70, round R8b) and protection of the text you write (see the <em>I-REP/I-EDIT review</em> chapter).</p>`,
      },
      {
        id: 'yours-limits',
        title: 'Known limits',
        html: `<ul>
<li>Exact tab stops from the ruler are exact in DOCX; in PDF, EPUB and HTML tabs are even, after the first stop. Left tabs only.</li>
<li>Kindle: EPUB, which Amazon accepts; KPF cannot be produced with open tools.</li>
<li>No sync with Scrivener for iOS (closed format).</li>
</ul>`,
      },
    ],
  },
];

export default MANUAL_EN;
