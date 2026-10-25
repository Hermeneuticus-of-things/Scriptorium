import React from 'react';
import Editor from './Editor.jsx';
import { t } from '../lib/i18n.js';

// Several documents edited as one continuous text: a single editor holds every document as a
// section (src/editor/scriveningsBoundary.js), so the caret, selection (mouse, Shift+arrows,
// Ctrl+A), copy, find and replace run across sections, while each section still saves to its
// own document and edits never merge two documents.
// `title` names the set (a folder, a multiple selection, a collection, search results).
// showTitles / showSeparators toggle the section titles and the dashed dividers.
export default function Scrivenings({ title, folder, sections, docs, settings, readOnlyIds, onChange, onFocusSection, registerRef, onOpen, showTitles = true, showSeparators = true, onClose, corrections, styles, defaultFormatting, linkTargets, onOpenLink }) {
  const name = title ?? folder?.title ?? '';
  if (sections.length === 0) {
    return <p className="hint">„{name}{t('ui.scrivenings.nu_are_documente_text_apasa')}</p>;
  }
  const list = sections.map((n) => ({ id: n.id, title: n.title, html: docs[n.id] || '', readOnly: readOnlyIds.has(n.id) }));
  const allRo = list.every((s) => s.readOnly);
  // A document becoming (un)locked rebuilds the editor, as for a single document.
  const roKey = list.map((s) => (s.readOnly ? 1 : 0)).join('');
  return (
    <div className={`scrivenings ${showTitles ? '' : 'no-titles'} ${showSeparators ? '' : 'no-separators'}`}>
      <div className="scriv-head">
        <strong>{name}</strong> <span className="muted">· {sections.length} {t('ui.scrivenings.documente_editate_impreuna_scrivenings')}</span>
        {onClose && (
          <button className="link" onClick={onClose}>
            {t('btn.close')}
          </button>
        )}
      </div>
      <Editor
        key={roKey}
        compact
        sections={list}
        readOnly={allRo}
        smartQuotes={settings.smartQuotes !== false}
        typewriter={settings.typewriter}
        corrections={corrections}
        styles={styles}
        defaultFormatting={defaultFormatting}
        showInvisibles={settings.showInvisibles}
        linkTargets={linkTargets}
        onOpenLink={onOpenLink}
        onSectionChange={(id, html) => onChange(id, html)}
        onSectionFocus={(id) => onFocusSection(id)}
        registerSectionRef={registerRef}
        onOpenSection={(id) => onOpen(id)}
      />
    </div>
  );
}
