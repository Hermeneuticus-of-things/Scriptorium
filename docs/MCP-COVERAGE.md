# Acoperire MCP ↔ Aplicație (matricea de paritate)

Directivă autor (14 nov 2026): serverul MCP trebuie să aibă tool-uri pentru **tot** ce poate face aplicația (paritate UI ↔ MCP), plus tool-uri pentru ce aplicația nu poate face. „GUI-only" se acceptă doar cu motiv tehnic puternic.

**Suprafața aplicației:** 195 de comenzi în 15 grupuri (registry-ul din `src/App.jsx`) + operațiile I/O din meniuri/panouri.
**Suprafața MCP:** **84 de tool-uri** (21 în `mcp/server.mjs` + 63 în `mcp/fullTools.mjs`).

## Acoperite de tool-uri existente (84)

- Binder: list_binder, read_document, write_document, create_document (text+dosar), move_item, convert_item, duplicate_item, split_document, merge_documents, trash_item, list_trash, restore_from_trash, empty_trash
- Metadate: set_metadata, manage_label, manage_status, manage_keyword, list_keywords, manage_custom_field, manage_section_type, manage_collection, list_collections, manage_bookmark, list_bookmarks
- Note/comentarii/note de subsol: get_notes, set_notes, list_project_notes, manage_project_note_tab, add_comment, list_comments, update_comment, delete_comment, add_footnote, list_footnotes
- Snapshots: list_snapshots, take_snapshot, restore_snapshot, manage_snapshot, compare_snapshots
- Căutare: search, replace (proiect, cu înlocuire), research_search (RAG), scriv_search/scriv_read/scriv_outline
- Compile: compile (docx/epub/html/rtf/odt/md/mmd/txt/fountain/fdx/tex/print), list_compile_formats, export_documents, export_outline
- Editorial AI: editorial_round, editorial_autofix, author_journal, team_activity
- Statistici: statistics, timeline, analyze_pacing, character_relations, writing_history
- Import/export: import_files, import_web_page, import_bibliography, import_scriv, import_bundle, export_bundle, export_scriv, export_notebooklm, export_editor_package, save_project_as, create_project
- Întreținere: backup_now, list_backups, restore_backup, read_errors, glossary_list, glossary_add, build_glossaries, lookup_url, set_targets, get_targets, set_project_info, list_templates, list_project_notes

## GUI-only cu motiv tehnic (documentate, nu defecte)

- Dictare/transcriere live (D&TED, dispozitiv audio) — need hardware/mic; transcrierea de fișiere rămâne o extensie viitoare.
- Citire cu voce (speech) — redare audio locală.
- NotebookLM Studio (nlmStudio/nlmAskDoc/nlmConsult) — rulează în fereastra logged-in; export_notebooklm acoperă partea de export.
- Print/Print Preview — dialoguri native de sistem.
- Layou­ts de fereastră (saveLayout/manageLayouts), zoom, split, corkboard/outline views — starea vizuală a ferestrei, nu date ale proiectului.
- Comenzi de selecție/editor (selectWord, findNext…) — natura interactivă a editorului.

## Lipsă (goluri de paritate — de implementat)

| Gol | Comenzi UI sursă | Librărie existentă | Prioritate |
|---|---|---|---|
| page_setup (get/set) | pageSetup, pageViewSetup | lib/printSetup.cjs | mare |
| save_template | saveTemplate | lib/templates.cjs saveUserTemplate | mare |
| sync_folder (syncOut/syncIn) | syncOut, syncIn | lib/folderSync.cjs + handler-e IPC existente | mare |
| strip_notation (doc/proiect) | stripNotationDoc/Project | src/lib/notationOps.js | mare |
| convert annot/comment/footnote | convertAnnotToComment, convertCommentToAnnot, convertFootnoteToLinked, convertLinkedToFootnote | logica din App.jsx (de extras) | medie |
| split_title | splitTitle | varianta split_document + titluri | medie |
| format_document | formatDocument, formatManuscript | src/lib/paragraphAlignment.js formatDocuments | medie |
| auto_synopsis | autoSynopsis | pipeline AI din editorial (#87) | medie (cere cheie) |

## Istoric acoperire

- #87: canalele online-speech listate GUI-only cu motiv; aceasta este prima matrice completă de paritate.
