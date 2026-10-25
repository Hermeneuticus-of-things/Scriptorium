// Scrivenings as one continuous text: every document of the set is a `scrivSection` node
// of a single ProseMirror document (doc = scrivSection+). Selection, caret movement,
// select-all, copy and find/replace therefore run across sections, while the sections
// themselves are boundaries that edits cannot remove or merge:
// - deleting or typing over a selection that spans sections deletes the text in each
//   section separately and keeps every section (and its document);
// - Backspace at the start / Delete at the end of a section does nothing;
// - any other transaction that would add, drop, merge or reorder sections, or change a
//   read-only section, is refused (filterTransaction);
// - on save every section is serialized on its own and goes back to its own document.
import { Node, elementFromString, getHTMLFromFragment } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { DOMParser, DOMSerializer, Fragment, Slice } from '@tiptap/pm/model';
import { PARSE_OPTIONS } from './syncDoc.js';

export const SECTION = 'scrivSection';
// Meta: true = a transaction allowed to change the section structure (building the
// document, attribute changes); 'external' = an outside update of one document, which
// may change a read-only section but not the structure.
export const SCRIV_ALLOW = 'scrivAllow';
export const scriveningsKey = new PluginKey('scrivenings');

// ---- pure helpers (also used by the tests) ----

/** Section content ranges: [{id, node, index, pos, from, to}] (from/to = content start/end). */
export function sectionRanges(doc) {
  const out = [];
  doc.forEach((node, offset, index) => {
    if (node.type.name !== SECTION) return;
    out.push({ id: node.attrs.id, node, index, pos: offset, from: offset + 1, to: offset + node.nodeSize - 1 });
  });
  return out;
}

/** The section that contains document position `pos` (null outside every section). */
export function sectionAt(doc, pos) {
  for (const s of sectionRanges(doc)) if (pos >= s.from && pos <= s.to) return s;
  return null;
}

/** Parses one document's HTML into section content (the blocks a single editor would load). */
export function sectionContent(html, schema) {
  const top = schema.nodes[SECTION].create(null, schema.nodes.paragraph.create());
  return DOMParser.fromSchema(schema).parse(elementFromString(html || '<p></p>'), { ...PARSE_OPTIONS, topNode: top }).content;
}

/** Builds the Scrivenings document from [{id, title, html, readOnly}]. */
export function buildScriveningsDoc(schema, sections) {
  const type = schema.nodes[SECTION];
  const kids = sections.map((s) => type.create({ id: s.id, title: s.title || '', readOnly: Boolean(s.readOnly) }, sectionContent(s.html, schema)));
  return schema.topNodeType.create(null, kids);
}

/** Section HTML exactly as a single-document editor saves it. */
export function sectionHtml(node, schema) {
  return getHTMLFromFragment(node.content, schema);
}

/** Splits the Scrivenings document back into documents: [{id, html}] in order. */
export function splitScriveningsDoc(doc, schema) {
  return sectionRanges(doc).map((s) => ({ id: s.id, html: sectionHtml(s.node, schema) }));
}

/** Same sections, same order, nothing merged or lost; read-only sections untouched. */
export function structureIntact(before, after, { ignoreReadOnly = false } = {}) {
  if (before.childCount !== after.childCount) return false;
  for (let i = 0; i < before.childCount; i++) {
    const a = before.child(i);
    const b = after.child(i);
    if (b.type.name !== SECTION || a.attrs.id !== b.attrs.id) return false;
    if (a.attrs.readOnly && !ignoreReadOnly && !a.eq(b)) return false;
  }
  return true;
}

/** True when the range [from, to] touches more than one section. */
export function crossesSections(doc, from, to) {
  if (from === to) return false;
  const a = sectionAt(doc, from);
  const b = sectionAt(doc, to);
  return !a || !b || a.index !== b.index;
}

/**
 * Deletes [from, to] section by section (last first, so earlier positions stay valid):
 * the boundaries stay, every section keeps at least an empty paragraph, read-only
 * sections are skipped. Returns the transaction's position of `from` afterwards.
 */
export function deleteAcrossSections(tr, from, to) {
  const secs = sectionRanges(tr.doc).filter((s) => s.to > from && s.from < to);
  for (let i = secs.length - 1; i >= 0; i--) {
    const s = secs[i];
    if (s.node.attrs.readOnly) continue;
    const a = Math.max(from, s.from);
    const b = Math.min(to, s.to);
    if (b <= a) continue;
    const whole = a === s.from && b === s.to;
    try {
      if (whole) throw new Error('whole');
      tr.delete(a, b);
    } catch {
      // The whole section's text (or an invalid partial cut): leave one empty paragraph.
      if (whole || (a <= s.from + 1 && b >= s.to - 1)) tr.replaceWith(s.from, s.to, tr.doc.type.schema.nodes.paragraph.create());
    }
  }
  return tr.mapping.map(from, -1);
}

// The first section that the selection starts in, with the caret put at `pos` in it.
function caretAfterDelete(tr, pos) {
  const $p = tr.doc.resolve(Math.min(pos, tr.doc.content.size));
  const sel = TextSelection.findFrom($p, 1, true) || TextSelection.findFrom($p, -1, true);
  if (sel) tr.setSelection(sel);
  return tr;
}

/** Slice copied from Scrivenings: drop the section wrappers so it pastes as plain blocks. */
export function unwrapSections(slice) {
  let has = false;
  slice.content.forEach((n) => { if (n.type.name === SECTION) has = true; });
  if (!has) return slice;
  const kids = [];
  slice.content.forEach((n) => {
    if (n.type.name === SECTION) n.content.forEach((c) => kids.push(c));
    else kids.push(n);
  });
  return new Slice(Fragment.from(kids), Math.max(0, slice.openStart - 1), Math.max(0, slice.openEnd - 1));
}

// At the very start (Backspace) or end (Delete) of a section: the key would merge two documents.
function atSectionEdge(state, dir) {
  const { selection } = state;
  if (!selection.empty) return false;
  const s = sectionAt(state.doc, selection.from);
  if (!s) return false;
  const $p = selection.$from;
  if (dir < 0) return $p.parentOffset === 0 && TextSelection.findFrom(state.doc.resolve(s.from), 1, true)?.from === selection.from;
  return $p.parentOffset === $p.parent.content.size && TextSelection.findFrom(state.doc.resolve(s.to), -1, true)?.from === selection.from;
}

function crossSel(state) {
  const { from, to } = state.selection;
  return crossesSections(state.doc, from, to);
}

// ---- TipTap extensions ----

/** Top node for Scrivenings: one or more sections. */
export const ScriveningsDoc = Node.create({
  name: 'doc',
  topNode: true,
  content: `${SECTION}+`,
});

/**
 * One document of the set. Options: onOpen(id) for a click on the section title,
 * openTitle (tooltip of the title), readOnlyLabel (hint shown in read-only sections).
 */
export const ScrivSection = Node.create({
  name: SECTION,
  content: 'block+',
  isolating: true,
  defining: true,
  selectable: false,
  draggable: false,
  addOptions() {
    return { onOpen: null, openTitle: '', readOnlyLabel: '' };
  },
  addAttributes() {
    return {
      id: { default: null, rendered: false },
      title: { default: '', rendered: false },
      readOnly: { default: false, rendered: false },
    };
  },
  // Never created by parsing: pasted HTML lands inside the current section.
  parseHTML() {
    return [];
  },
  renderHTML({ node }) {
    return ['div', { 'data-scriv-section': node.attrs.id || '' }, 0];
  },
  addNodeView() {
    const opts = this.options;
    return ({ node }) => {
      let cur = node;
      const dom = document.createElement('div');
      const title = document.createElement('h2');
      const hint = document.createElement('p');
      const body = document.createElement('div');
      title.contentEditable = 'false';
      hint.contentEditable = 'false';
      hint.className = 'hint scriv-ro-hint';
      title.className = 'doc-title';
      body.className = 'scriv-body';
      title.addEventListener('mousedown', (e) => {
        e.preventDefault();
        opts.onOpen?.(cur.attrs.id);
      });
      const paint = () => {
        dom.className = `scriv-section${cur.attrs.readOnly ? ' scriv-ro' : ''}`;
        dom.setAttribute('data-scriv-id', cur.attrs.id || '');
        title.textContent = cur.attrs.title || '';
        title.title = opts.openTitle || '';
        hint.textContent = opts.readOnlyLabel || '';
        hint.hidden = !cur.attrs.readOnly;
      };
      paint();
      dom.append(title, hint, body);
      return {
        dom,
        contentDOM: body,
        update: (next) => {
          if (next.type !== cur.type) return false;
          cur = next;
          paint();
          return true;
        },
        // Clicks and selection on the title / hint are not document edits.
        stopEvent: (e) => e.target === title || e.target === hint,
        ignoreMutation: (m) => m.type !== 'selection' && (m.target === title || m.target === hint || title.contains(m.target) || hint.contains(m.target) || (m.target === dom && m.type === 'attributes')),
      };
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: scriveningsKey,
        filterTransaction: (tr, state) => {
          if (!tr.docChanged) return true;
          const allow = tr.getMeta(SCRIV_ALLOW);
          if (allow === true) return true;
          return structureIntact(state.doc, tr.doc, { ignoreReadOnly: allow === 'external' });
        },
        props: {
          transformPasted: (slice) => unwrapSections(slice),
          handleKeyDown: (view, e) => {
            const { state } = view;
            if (e.isComposing) return false;
            const mod = e.ctrlKey || e.metaKey;
            if ((e.key === 'Backspace' || e.key === 'Delete') && !mod && !e.altKey) {
              if (crossSel(state)) {
                const tr = state.tr;
                const at = deleteAcrossSections(tr, state.selection.from, state.selection.to);
                view.dispatch(caretAfterDelete(tr, at).scrollIntoView());
                return true;
              }
              return atSectionEdge(state, e.key === 'Backspace' ? -1 : 1);
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && mod && !state.selection.empty) {
              if (crossSel(state)) {
                const tr = state.tr;
                view.dispatch(caretAfterDelete(tr, deleteAcrossSections(tr, state.selection.from, state.selection.to)));
                return true;
              }
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && mod && state.selection.empty) return atSectionEdge(state, e.key === 'Backspace' ? -1 : 1);
            // Enter over a cross-section selection: clear it first, then let Enter split the paragraph.
            if (e.key === 'Enter' && crossSel(state)) {
              const tr = state.tr;
              view.dispatch(caretAfterDelete(tr, deleteAcrossSections(tr, state.selection.from, state.selection.to)));
              return false;
            }
            return false;
          },
          // Typing over a cross-section selection replaces the text section by section.
          handleTextInput: (view, from, to, text) => {
            if (!crossesSections(view.state.doc, from, to)) return false;
            const tr = view.state.tr;
            const at = deleteAcrossSections(tr, from, to);
            caretAfterDelete(tr, at);
            tr.insertText(text, tr.selection.from);
            view.dispatch(tr.scrollIntoView());
            return true;
          },
          handlePaste: (view) => {
            if (!crossSel(view.state)) return false;
            const tr = view.state.tr;
            view.dispatch(caretAfterDelete(tr, deleteAcrossSections(tr, view.state.selection.from, view.state.selection.to)));
            return false; // the paste itself goes on into the cleared spot
          },
          handleDOMEvents: {
            // Cut across sections: copy as usual, then delete section by section.
            cut: (view, e) => {
              const { state } = view;
              if (!crossSel(state) || !e.clipboardData) return false;
              const slice = unwrapSections(state.selection.content());
              const wrap = document.createElement('div');
              wrap.appendChild(DOMSerializer.fromSchema(state.schema).serializeFragment(slice.content));
              e.clipboardData.setData('text/html', wrap.innerHTML);
              e.clipboardData.setData('text/plain', state.doc.textBetween(state.selection.from, state.selection.to, '\n\n', '\n'));
              e.preventDefault();
              const tr = state.tr;
              view.dispatch(caretAfterDelete(tr, deleteAcrossSections(tr, state.selection.from, state.selection.to)).scrollIntoView().setMeta('uiEvent', 'cut'));
              return true;
            },
          },
        },
      }),
    ];
  },
});

/** Extensions to add for a Scrivenings editor (the StarterKit document must be off). */
export function scriveningsExtensions(opts = {}) {
  return [ScriveningsDoc, ScrivSection.configure(opts)];
}

/** Replaces one section's content (external update of that document); keeps the caret. */
export function replaceSectionContent(tr, id, html) {
  const s = sectionRanges(tr.doc).find((x) => x.id === id);
  if (!s) return false;
  const next = sectionContent(html, tr.doc.type.schema);
  if (s.node.content.eq(next)) return false;
  const start = s.node.content.findDiffStart(next);
  if (start == null) return false;
  let { a: endA, b: endB } = s.node.content.findDiffEnd(next);
  const overlap = start - Math.min(endA, endB);
  if (overlap > 0) {
    endA += overlap;
    endB += overlap;
  }
  const nextNode = s.node.copy(next);
  tr.replace(s.from + start, s.from + endA, nextNode.slice(start, endB));
  tr.setMeta(SCRIV_ALLOW, 'external');
  return true;
}
