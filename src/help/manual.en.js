// Pneuma Sofer user manual (English, condensed). Same chapter and section ids as manual.ro.js
// so context help works in both languages.

const k = (s) => s.split('+').map((p) => `<kbd>${p}</kbd>`).join('+');

export const MANUAL_EN = [
  {
    id: 'start',
    title: 'Getting started',
    sections: [
      { id: 'start-intro', title: 'What Pneuma Sofer is', html: `<p>Pneuma Sofer is a writing program for long texts. You write in <strong>small documents</strong> (scenes, chapters, sections) arranged in a tree called the <strong>binder</strong>, move them freely, and <strong>Compile</strong> them into one manuscript (DOCX, PDF, EPUB and more). It is written from scratch; <code>.scriv</code> projects can be imported and exported. AI is <strong>optional</strong> and can be switched off entirely in <em>AI → AI settings</em>.</p>` },
      { id: 'start-window', title: 'The main window', html: `<p><strong>Binder</strong> on the left (Draft, Research, Trash; toggle ${k('Ctrl+Shift+B')}), the <strong>work area</strong> in the middle (Editor ${k('Ctrl+1')}, Corkboard ${k('Ctrl+2')}, Outline ${k('Ctrl+3')}), the <strong>Inspector</strong> on the right (${k('Ctrl+Shift+I')}). The top bar is kept uncluttered: ⌂ (close project), Back/Forward, the project title, the <em>Editor / Corkboard / Outline</em> switch, <em>Compile</em> and <em>Inspector</em>. Everything else is in the menus: <em>File, Edit, View, Project, Documents, Navigate, Tools, AI, Help</em> (in the desktop app, in the window's native menu), with related commands grouped in submenus (▸) such as <em>File → Import ▸ / Export ▸</em>; <em>Format</em> is a submenu of <em>Edit</em> and <em>Window</em> one of <em>View</em>. Split editor is <em>View → Split editor</em>, Composition is in <em>View</em> (F11). Panel widths are remembered per project. With two panes open, the one you type in has a green border and the other is slightly faded.</p>
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
      { id: 'projects-home', title: 'Home screen', html: `<p>Recent projects (pin favourites, clear list), open, import a .scriv project, and new project from a template. <em>Settings → General</em> can reopen the last project at startup.</p>` },
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
      { id: 'editor-links', title: 'Links, bookmarks, look-up', html: `<p>Type <code>[[Title]]</code> to link to the project document with that title (case and diacritics are ignored; a unique start of the title is enough). With no match the app offers to create that document (in the same folder or a chosen one, remembered per project) and link it; <kbd>Esc</kbd> or <em>Cancel</em> keeps the text as typed. With <em>Settings → Editing → Add back-links automatically</em>, every new link to a document adds the current document to the target's bookmarks (not to its text). The Inspector lists <em>Links to this document</em> under the bookmarks. Internal links can also be picked from the format bar. Project bookmarks in the Project menu. Dictionary, synonyms (dexonline, sinonimul.ro), Wikipedia and Google look-ups in the Tools menu and the right-click menu. Spelling uses the system spellchecker (Romanian and English).</p><p>When text is selected, the status bar shows its word and character count.</p>` },
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
    title: 'Continuous text, split, Quick Reference, composition',
    sections: [
      { id: 'scrivenings-basics', title: 'Continuous text', html: `<p>Selecting a folder in Editor view shows its documents as one editable text. Also for a selection or the active collection; titles and separators can be toggled.</p>` },
      { id: 'scrivenings-split', title: 'Split editor', html: `<p>The Split button opens a second pane; ${k('Alt')}+click in the binder opens a document there. Horizontal/vertical, swap, lock.</p>` },
      { id: 'scrivenings-quickref', title: 'Quick Reference', html: `<p>${k('Ctrl+Shift+R')} opens the current document in a small floating window.</p><p><strong>Reference pane</strong>: <em>View → Open as reference</em> or Alt+Shift+click in the binder shows a document in a pane beside the editor (and the split). Read-only unless <em>Editable</em> is ticked; the scroll position is kept and the pane is saved with the project and in layouts.</p>` },
      { id: 'scrivenings-composition', title: 'Composition mode', html: `<p>${k('F11')} hides everything but the text; options in <em>Settings → Appearance</em>. ${k('Esc')} leaves.</p>` },
      { id: 'scrivenings-nav', title: 'Navigation', html: `<p>Back/Forward ${k('Alt+←')}/${k('Alt+→')}, previous/next document ${k('Ctrl+Alt+↑')}/${k('Ctrl+Alt+↓')}, Go to ${k('Ctrl+G')}.</p>` },
    ],
  },
  {
    id: 'corkboard',
    title: 'Corkboard',
    sections: [
      { id: 'corkboard-basics', title: 'Index cards', html: `<p>${k('Ctrl+2')}: cards with title and synopsis; drag to reorder. Double-click a title to open the document; click selects a card, arrows move between cards, ${k('Enter')}/${k('F2')} edits the title, ${k('Ctrl+Enter')} opens, ${k('Ctrl+←')}/${k('Ctrl+→')} reorders; <em>+ Card</em> adds after the selected card with its title ready to type. Outline: click selects, double-click opens, ↑/↓ navigate, ←/→ collapse/expand, ${k('Enter')} renames.</p>` },
      { id: 'corkboard-options', title: 'Size, freeform, arrange', html: `<p>Card size, ratio, spacing, columns; freeform mode with <em>Commit order</em>; arrange by label, status or keyword; several folders stacked. Card look: rounded or square corners, ruled cards, card color by label.</p>` },
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
      { id: 'snapshots-compare', title: 'Compare and restore', html: `<p>View, diff against current text or another snapshot, rename, delete, restore (the current text is snapshotted first). Compare by word, phrase (up to a comma), sentence or paragraph; the coarser levels read better after a heavy rewrite.</p>` },
    ],
  },
  {
    id: 'search',
    title: 'Search and collections',
    sections: [
      { id: 'search-doc', title: 'Find in document', html: `<p>${k('Ctrl+F')} opens find and replace in the current document, with highlighting and next/previous.</p>` },
      { id: 'search-project', title: 'Project find and replace', html: `<p>${k('Ctrl+Shift+F')}: regex, whole words, case, trash; replace also in titles, synopses, notes, with a snapshot first.</p>` },
      { id: 'search-advanced', title: 'Advanced search', html: `<p>Search in specific fields with filters; save as a search collection.</p>` },
      { id: 'search-collections', title: 'Collections', html: `<p>Tabs above the binder holding document lists; Continuous text and Compile can use them.</p>` },
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
      { id: 'compile-notes', title: 'Notes and comments', html: `<p>Footnotes, chapter endnotes or book endnotes; comments removed or exported as Word comments (DOCX).</p><p><em>Note numbering</em>: 1, 2, 3 · i, ii, iii · a, b, c · symbols (*, †, ‡, §); <em>Restart numbering in every chapter</em> starts again at each chapter that begins on a new page (DOCX: one Word section per chapter). RTF and ODT get the format only.</p><p><strong>Preserve formatting</strong> (<em>Format → Preserve formatting</em>): the dashed block compiles exactly as written: no replacements, quotes or dashes, no compile indent or spacing, its own font and size.</p>` },
      { id: 'compile-page', title: 'Page setup', html: `<p>Paper size, margins, font, line spacing, headers and footers (first page and odd/even can differ). For single documents: <em>File → Page setup…</em>, <em>Print preview</em>, <em>Print</em> (${k('Ctrl+P')}).</p>` },
      { id: 'compile-epub', title: 'EPUB and metadata', html: `<p>Title, author, ISBN, language, keywords, cover image; EPUB 3 with title page and generated TOC.</p>` },
      { id: 'compile-other-exports', title: 'LaTeX, Pandoc, MultiMarkdown', html: `<p>Direct exports in the File menu; <code>[@key]</code> citations use the imported bibliography.</p>` },
    ],
  },
  {
    id: 'import',
    title: 'Import/export, .scriv projects, sync',
    sections: [
      { id: 'import-files', title: 'Importing files', html: `<p>Word, RTF, ODT, text, Markdown (plus HTML, Fountain, FDX on desktop) with splitting at Heading 1, Heading 1–2 or a separator line. Also OPML, web pages, Zotero bibliographies and project bundles.</p>` },
      { id: 'import-scrivener', title: '.scriv projects', html: `<p>Import a .scriv project (versions 1/2/3) from the Home screen; everything is converted and a full copy stays in <code>scrivener-original/</code>; an import report follows. <em>File → Export as .scriv project</em> writes back.</p>` },
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
      { id: 'script-export', title: '.fdx and Fountain', html: `<p>Export .fdx and .fountain from the File menu or Compile; both can be imported.</p>` },
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
      { id: 'irep-profiles', title: 'Profiles: Generic and Romanian', html: `<p><strong>Generic</strong> (default): typography and LLM residue for any text. <strong>Romanian</strong>: DOOM III, P1–P13, R0–R11, foreign terms. Set in <em>Settings → Editorial</em>; stored per project.</p>` },
      { id: 'irep-near', title: 'Near repetitions (S70)', html: `<p>The panel's <em>Near repetitions (S70)</em> section lists the same content word (same lemma or form) in one sentence or in two neighbouring sentences, anadiplosis „…scutul. Scutul…” included: one line <code>⚠ REP L&lt;n&gt; «form» ×k</code> per paragraph (L = paragraph number) where the group occurs; a click selects it in the editor. Function words, locutions („în fața”) are not counted and reduplicates („pas cu pas”) count once; the book's own terms are counted. It is a <strong>signal</strong>: it never stops the loop, is never fixed automatically and never goes to the repair prompt (S70: a term is not changed only to avoid repeating it). The list goes only to I-EDIT round <strong>R8b The word and the letter</strong>.</p>` },
      { id: 'irep-author', title: 'Your text: editing a proposal and protecting your paragraphs', html: `<p>What you write by hand is a decision. Paragraphs you change in the editor become <strong>author text</strong> (after a short pause) and every save is journaled in <code>editorial/MODIFICARI_AUTOR.jsonl</code>, one row per changed chunk. In a proposal, <em>✎ Edit</em> lets you correct the proposed text; <em>Save</em> takes a <code>.bak-autor-&lt;date-time&gt;</code> snapshot first and refuses when the document changed meanwhile (409) or the new text is under 20% of the old one (412, with <em>Save anyway</em>). The loop never rewrites author text: the <code>fraza_autor_atinsa</code> gate rejects any result that changes, moves or deletes it, showing the line and why. The model sees your paragraphs under „TEXT AL AUTORULUI (doar semnalezi)”; issues on them come to you in <em>COADA_AUTOR</em>, issues next to them go to the repair with a note, and safe fixes skip them. A save during a loop is logged as <code>MODIFICARE_AUTOR</code>, the report lists „Your changes in the text”, and the text is re-checked right before any write. A rejected proposal stays rejected only while the document text is unchanged.</p>` },
    ],
  },
  {
    id: 'ai',
    title: 'Optional AI and MCP',
    sections: [
      { id: 'ai-setup', title: 'Enabling AI', html: `<p><em>AI → AI settings</em>: enable and enter an Anthropic API key, encrypted by the OS and kept in the main process.</p>` },
      { id: 'ai-assistant', title: 'The assistant', html: `<p>Proofreading, synopsis, continuation, critique, consistency and questions; bulk synopsis, living character sheets and zoom-level review in the Tools menu.</p>` },
      { id: 'ai-research-chat', title: 'Conversation with your sources', html: `<p><em>Tools → Project research (RAG)</em> becomes, with AI enabled, a conversation about your sources: answers use only the passages found and cite them as [1], [2] (click to open the document). Follow-up questions keep the last turns in mind. <em>Choose sources…</em> picks Manuscript, Research, Notes or specific folders and documents (default: Research and Notes) and adds sources from files (PDF text, DOCX, TXT, MD, HTML), web pages or pasted text, indexed right away. Each answer can be saved as a note in Research → Notes, inserted at the cursor (citations as footnotes or links) or copied; suggested follow-up questions appear as buttons. Conversations are saved in the project (<code>research-chats.json</code>); <em>New conversation</em> starts afresh. Without AI the panel is a local search.</p>` },
      { id: 'ai-mcp', title: 'AI agents via MCP', html: `<p><code>mcp/server.mjs</code> gives an MCP client everything the app does without a window: binder, text, search, metadata, notes tabs, keywords, labels, targets, collections, comments, footnotes, split/merge, trash, snapshot compare, statistics, timeline, research, glossary, Compile in every format, import/export (including <code>.scriv</code>, NotebookLM, editor package), interrogating a NotebookLM notebook on its sources with follow-up questions (<code>consult_notebook</code>, optional, when a notebook and the <code>notebooklm-mcp</code> server are configured), new projects from templates and backups; every write is snapshotted and logged in <code>agent-log.jsonl</code>. <code>--read-only</code> limits to reading. The exact command is in <em>AI → AI settings → MCP connection</em>.</p>` },
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
      { id: 'faq-ai', title: 'AI commands are greyed out', html: `<p>Enable AI and enter the key in <em>AI → AI settings</em>.</p>` },
      { id: 'faq-scriv', title: '.scriv import missed something', html: `<p>Read the import report; the original copy is in <code>scrivener-original/</code>.</p>` },
      { id: 'faq-report', title: 'Reporting a problem', html: `<p><em>Help → Report a problem…</em> opens a simple window where you describe the problem in your own words. No technical knowledge is needed.</p>
<ol>
<li>Under <em>What happened?</em> write what you saw (e.g. “I clicked Compile and no file was created”).</li>
<li>Optionally, under <em>What were you doing before?</em>, the steps before it.</li>
<li>Click <em>Send on GitHub</em>: the project page opens with the report filled in; click <em>Submit new issue</em> there. A free GitHub account is needed. Without one, use <em>Copy report</em> and send the text any way you like.</li>
</ol>
<p><strong>What is sent:</strong> the program version, operating system, interface language, the latest errors recorded by the program and the names of the last commands used. You can see all of it under <em>Technical details sent</em> before sending. <strong>What is not sent:</strong> your book's text, notes, your user name, project paths (shown as <code>~</code> and <code>&lt;proiect&gt;</code>) and API keys.</p>
<p>When the program hits an error, a discreet message appears at the bottom right: <em>Something went wrong. Send a report?</em> (once per distinct error). You can safely close it. Errors are kept in a small log in the app's data folder (<code>logs/errors.jsonl</code>, at most 200 entries).</p>` },
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
        html: `<p>Open <em>Settings → Services and accounts</em>. For each service paste the key (and, if you like, an <em>Account email</em> + <em>Account password</em> to keep the login), press <em>Save</em> — everything is encrypted on your computer and cannot be read back from the interface. The <em>Test connection</em> button makes one real request and tells you whether the key is accepted.</p>
<ul>
<li><strong>DeepL</strong> — key from <a href="https://www.deepl.com/your-account/keys">deepl.com/your-account/keys</a>. The free account (key ends in <code>:fx</code>) gives 500,000 characters a month.</li>
<li><strong>Google Cloud Translation</strong> — key from the <a href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a>, with two conditions: (1) enable the <a href="https://console.cloud.google.com/apis/library/translate.googleapis.com">Cloud Translation API</a>; (2) on the key, under <em>API restrictions</em>, choose <em>Don't restrict key</em> or add <em>Cloud Translation API</em> to the list — otherwise Google blocks it with <code>API_KEY_SERVICE_BLOCKED</code> (403). The project needs billing enabled.</li>
<li><strong>LanguageTool</strong> — works without an account (free); with Premium add your email and a key from <a href="https://languagetool.org/editor/settings/access-tokens">languagetool.org</a>.</li>
<li><strong>Speechify</strong> — key from the <a href="https://console.sws.speechify.com/api-keys">Speechify API console</a> (the developer product) and a voice id (e.g. <code>george</code>). Note: the regular Speechify subscription (app.speechify.com, consumer premium) does <em>not</em> give an API key — API access is a separate product.</li>
<li><strong>Zotero</strong> — your numeric user ID and a key from <a href="https://www.zotero.org/settings/keys">zotero.org/settings/keys</a>; then <em>File → Import bibliography from Zotero</em>.</li>
</ul>
<p>For services you log into with an account (not a key), fill <em>Account email</em> + <em>Account password</em> on that service, or add any other service under <em>Other accounts</em> (name, site, user, password). The login is stored, but the action that calls the service (e.g. Speechify reading) still runs on the API key.</p>
<p>Quick check: <em>Test connection</em>, or select a paragraph, right-click, <em>In the app: DeepL</em> / <em>Check grammar</em>.</p>`,
      },
      {
        id: 'yours-ai',
        title: 'AI key and a test with a real model',
        html: `<p>In <em>AI → AI settings</em> choose the provider, paste the key and type the model id. Models are retired often: if you see <em>the model was retired</em>, pick another one. Free options: OpenRouter models ending in <code>:free</code>, the free credits of a <code>nvapi-…</code> key from build.nvidia.com, or Ollama / LM Studio locally.</p>
<pre>$env:OPENROUTER_API_KEY = "sk-or-…"
node scripts\ai-smoke.cjs openrouter</pre>
<p>The script picks a model that answers and tries proofreading, translation and a definition. Never put keys in files or messages; regenerate any key that leaked.</p>`,
      },
      {
        id: 'yours-spelling',
        title: 'Romanian spell checking on Windows',
        html: `<p>Windows uses the system spell checker: <em>Windows Settings → Time &amp; language → Language &amp; region → Add a language → Romanian</em>, with spell checking. Restart Pneuma Sofer.</p>`,
      },
      {
        id: 'yours-mcp',
        title: 'Connecting Claude, Codex and other AI agents (MCP)',
        html: `<p>Pneuma Sofer ships an MCP server (70+ tools). Any MCP client can use it, and no Node.js is needed: the installed app runs the server itself with <code>ELECTRON_RUN_AS_NODE=1</code>. Easiest: open the project and use <em>AI → Connect to Claude (MCP)…</em>. Installer paths on Windows (current user):</p>
<pre>Program: C:\\Users\\YOU\\AppData\\Local\\Programs\\Pneuma Sofer\\Pneuma Sofer.exe
Server:  C:\\Users\\YOU\\AppData\\Local\\Programs\\Pneuma Sofer\\resources\\app\\mcp\\server.mjs</pre>
<p><strong>General command (the same on any computer, for any AI client; names no book and no user; the agent sees the projects in Pneuma Sofer's recent list):</strong></p>
<pre>claude mcp add pneuma --scope user -- cmd /c %LOCALAPPDATA%\\Programs\\Pneuma Sofer\\pneuma-mcp.cmd</pre>
<pre>"pneuma": { "command": "cmd", "args": ["/c", "%LOCALAPPDATA%\\\\Programs\\\\Pneuma Sofer\\\\pneuma-mcp.cmd"] }</pre>
<p>Add <code>--read-only</code> at the end for reading only. The forms below, with a named project, still work.</p>
<p><strong>Claude Code:</strong></p>
<pre>claude mcp add pneuma --scope user -e ELECTRON_RUN_AS_NODE=1 -- "&lt;Program&gt;" "&lt;Server&gt;" --project "D:\\\\Carti\\\\My book.scribner"</pre>
<p><strong>OpenAI Codex:</strong></p>
<pre>codex mcp add pneuma --env ELECTRON_RUN_AS_NODE=1 -- "&lt;Program&gt;" "&lt;Server&gt;" --project "D:\\\\Carti\\\\My book.scribner"</pre>
<p><strong>Gemini CLI:</strong></p>
<pre>gemini mcp add pneuma -e ELECTRON_RUN_AS_NODE=1 "&lt;Program&gt;" "&lt;Server&gt;" --project "D:\\\\Carti\\\\My book.scribner"</pre>
<p><strong>Claude Desktop, Cursor, Windsurf, LM Studio</strong> (<code>mcpServers</code> JSON; double every backslash), and <strong>VS Code</strong> (<code>.vscode\\mcp.json</code>, key <code>servers</code>, <code>"type": "stdio"</code>):</p>
<pre>"pneuma": {
  "command": "&lt;Program&gt;",
  "args": ["&lt;Server&gt;", "--project", "D:\\\\\\Carti\\\\\\My book.scribner"],
  "env": { "ELECTRON_RUN_AS_NODE": "1" }
}</pre>
<p>Add <code>--read-only</code> for read access only. Every write takes a snapshot first and is logged in <code>agent-log.jsonl</code>.</p>`,
      },
      {
        id: 'yours-cli',
        title: 'Command line (CLI)',
        html: `<p>Pneuma Sofer also has a command line: read, search, compile and export a project from a terminal or a script, without opening the window. Read-only commands never lock the project; writing commands (<code>snapshot</code>, <code>import</code>) wait until the app has finished saving.</p>
<h4>Running it</h4>
<p>The installed Windows app needs no Node.js. Copy <code>pneuma.cmd</code> (from the source <code>installer</code> folder) next to <code>Pneuma Sofer.exe</code> in <code>%LOCALAPPDATA%\\Programs\\Pneuma Sofer</code> and add that folder to PATH; then type <code>pneuma …</code>. Without the wrapper, in PowerShell:</p>
<pre>$env:ELECTRON_RUN_AS_NODE=1; &amp; "$env:LOCALAPPDATA\\Programs\\Pneuma Sofer\\Pneuma Sofer.exe" "$env:LOCALAPPDATA\\Programs\\Pneuma Sofer\\resources\\app\\cli\\pneuma.cjs" info "D:\\\\Carti\\\\Drumul spre munte.scribner"</pre>
<p>From source, with Node.js: <code>node cli/pneuma.cjs help</code>.</p>
<h4>Commands</h4>
<pre>pneuma info "D:\\\\Carti\\\\Drumul spre munte.scribner"              title, author, words, last modified
pneuma list "D:\\\\Carti\\\\Drumul spre munte.scribner" --tree       the binder, with ids
pneuma cat "D:\\\\Carti\\\\Drumul spre munte.scribner" "Chapter 1" --md
pneuma search "D:\\\\Carti\\\\Drumul spre munte.scribner" "pădure" --whole
pneuma stats "D:\\\\Carti\\\\Drumul spre munte.scribner"             words per document, targets, history
pneuma compile "D:\\\\Carti\\\\Drumul spre munte.scribner" --format docx --preset paperback -o "D:\\Export"
pneuma export-docs "D:\\\\Carti\\\\Drumul spre munte.scribner" -o "D:\\Export\\Docs" --format md
pneuma backup "D:\\\\Carti\\\\Drumul spre munte.scribner"
pneuma snapshot "D:\\\\Carti\\\\Drumul spre munte.scribner" "Chapter 1" --name "Before revision"
pneuma import "D:\\Texts\\Novel.docx" -o "D:\\\\Carti\\\\Novel.scribner" --split h1
pneuma mcp "D:\\\\Carti\\\\Drumul spre munte.scribner"               the MCP server for AI agents</pre>
<p>Add <code>--json</code> for script-friendly output and <code>--lang en</code> for English messages. Exit codes: 0 ok, 1 error, 2 bad usage. PDF is made only in the app (<em>Compile → PDF</em>); from the terminal use <code>--format docx</code> or <code>html</code>.</p>
<h4>Your book as sources for NotebookLM, Gemini, ChatGPT or Manus</h4>
<pre>pneuma export-sources "D:\\\\Carti\\\\Drumul spre munte.scribner" -o "D:\\NotebookLM"</pre>
<p>This writes the folder <code>Surse - Drumul spre munte</code>: <code>00 - Cuprins</code> (outline with synopses), one file per chapter, research and notes, plus <code>sources.json</code> (the source list). Options: <code>--per document</code> (one file per document instead of per chapter), <code>--format txt</code> or <code>docx</code>, <code>--max-sources 50</code>, <code>--target notebooklm</code> (at most 50 sources; chapters are merged) or <code>gemini</code>, <code>chatgpt</code>, <code>manus</code>.</p>
<ol>
<li>Run the command above.</li>
<li>Open <a href="https://notebooklm.google.com">notebooklm.google.com</a> → <em>New notebook</em> → <em>Add sources</em> → <em>Upload</em> and select every file in the folder (not <code>sources.json</code>).</li>
<li>Ask the notebook about the book: characters, timeline, contradictions between chapters.</li>
</ol>
<p>For the NotebookLM limit there is also <code>pneuma export-notebooklm … -o folder</code>, which merges chapters to stay within 50 sources. The same folder can be uploaded to a Gemini Gem, a ChatGPT project or Manus (manus.im). After writing more, run the command again and replace the sources.</p>`,
      },
      {
        id: 'yours-sync',
        title: 'The same project on the desktop and in the browser',
        html: `<p>Keep the <code>.scribner</code> folder in OneDrive, Dropbox, Google Drive or on a NAS. In Chrome or Edge the web version opens that same folder and writes into it; changes from the other side show up within seconds. If the same document was changed in two places, the changes are merged paragraph by paragraph. When the same paragraph was changed on both sides, <strong>Conflict</strong> appears in the status bar: click it to see both versions side by side and choose, for each place, <em>mine</em>, <em>theirs</em> or <em>both</em>. The other version also stays in <em>Snapshots</em>, and text you wrote meanwhile is never overwritten. If the project folder is unreachable, what you write waits in a queue (status bar: <em>Waiting: n documents</em>), is retried every 15 s and sent as soon as the folder is back, even after closing the app; <em>Synced</em> means everything reached the folder. Conflict copies left by the sync service (such as <code>project (conflicted copy …).json</code> or <code>project-PC.json</code>) are never loaded: the app lists them when the project opens so you can compare and delete them. If the folder cannot be reached (NAS disconnected, permission withdrawn) you get a message; changes show up again when it is back. Phones cannot open folders: use the .json bundle there.</p>`,
      },
      {
        id: 'yours-team',
        title: 'Team work: several people, one project',
        html: `<p>Put the project in a shared folder (NAS, OneDrive, Dropbox, Google Drive). On each computer, in <em>Settings → Sharing → Team</em>, type your name and pick a color. With no name nothing changes from working alone.</p>
<ul>
<li><strong>Who is working now:</strong> the name of whoever has the document open shows next to its title; the status bar shows how many of you are working (click it for the <em>Team</em> window).</li>
<li><strong>Who changed what:</strong> <em>Project → Team…</em> shows the log: person, date and time, words added and removed, a sample. Filters: the open document or the whole project, the person, the last day, week or month. Click a title to open the document.</li>
<li><strong>Lock:</strong> the padlock button next to the title locks the document for the others; on their computers it opens read-only, with “Locked by …”. Click again to unlock. A computer silent for 30 minutes loses its locks.</li>
<li><strong>Merge:</strong> changes made by two people in different paragraphs are merged by themselves; the same paragraph: <strong>Conflict</strong> appears in the status bar and a click lets you choose mine, theirs or both; theirs also stays in <em>Inspector → Snapshots</em>.</li>
<li><strong>AI agents:</strong> writes through MCP appear in the log as “AI agent (MCP)”; the <code>team_activity</code> tool shows agents who is working and what is locked.</li>
</ul>
<p>Team files live in <code>team/</code>, one per computer, so the sync service makes no conflict copies.</p>`,
      },
      {
        id: 'yours-dictation',
        title: 'Dictation and transcription (D&TED)',
        html: `<p>Romanian speech recognition is built into Pneuma Sofer and works on your computer, without internet. The first time: <em>Settings → Services and accounts → Dictation and transcription → Download the engine</em> (about 590 MB, once; tick <em>I have an NVIDIA graphics card</em> for the faster version). The engine (whisper.cpp, model large-v3-turbo) runs only on your computer; the downloaded files are checked against their fingerprints. If you have the <a href="https://github.com/Hermeneuticus-of-things/dted">D&amp;TED</a> program you can choose it instead, in the same place.</p>
<ul>
<li><strong>F9</strong> (or <em>Tools → Dictation</em>) starts and stops dictation. Text appears every ~4 seconds of speech, with spaces and a capital at sentence starts.</li>
<li><strong>New text:</strong> with nothing selected it goes in at the cursor. <strong>Edit:</strong> over a selection it replaces it; one Ctrl+Z brings the old text back.</li>
<li>In the bar: <em>Pause</em> (what you say is not written), <em>Stop</em>, <em>Cancel</em> (takes out everything dictated since starting).</li>
<li><strong>Best accuracy:</strong> choose D&amp;TED in the settings; after <em>Check</em> you pick the model (default <em>eek</em>, tuned for Romanian: 5.8% words wrong against 10.9% for the standard model) and see which one is in use now.</li>
<li><em>File → Import → Transcribe audio file…</em>: MP3, WAV, M4A, OGG, FLAC → a new document in Research, in paragraphs, with the recording time [mm:ss] (can be turned off in settings). On an audio file in the binder: <em>Documents → Transcribe with D&amp;TED</em>.</li>
<li>The book's names and terms, typed in settings, help recognition; auto-replacements also apply to dictated text. A locked document gets no dictated text.</li>
</ul>`,
      },
      {
        id: 'yours-realproject',
        title: 'Your .scriv projects and I-REP / I-EDIT rules',
        html: `<p>Import a real <code>.scriv</code> with <em>File → Import .scriv project</em> and read the import report. I-REP / I-EDIT follow your VKB2 definitions: near repetitions (S70, round R8b) and protection of the text you write (see the <em>I-REP/I-EDIT review</em> chapter).</p>`,
      },
      {
        id: 'yours-limits',
        title: 'Known limits',
        html: `<ul>
<li>Exact tab stops from the ruler are exact in DOCX; in PDF, EPUB and HTML tabs are even, after the first stop. Left tabs only.</li>
<li>Kindle: EPUB, which Amazon accepts; KPF cannot be produced with open tools.</li>
</ul>`,
      },
    ],
  },
];

export default MANUAL_EN;
