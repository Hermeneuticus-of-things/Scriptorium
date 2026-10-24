import React from 'react';
import Editor from './Editor.jsx';
import { t } from '../lib/i18n.js';

// Several documents edited as one continuous text; each section saves to its own document.
// `title` names the set (a folder, a multiple selection, a collection, search results).
// showTitles / showSeparators toggle the section titles and the dashed dividers.
// Each section is a full editor: same autocorrections, styles, default formatting, invisibles and links as the main editor.
export default function Scrivenings({ title, folder, sections, docs, settings, readOnlyIds, onChange, onFocusSection, registerRef, onOpen, showTitles = true, showSeparators = true, onClose, corrections, styles, defaultFormatting, linkTargets, onOpenLink }) {
  const name = title ?? folder?.title ?? '';
  if (sections.length === 0) {
    return <p className="hint">„{name}{t('ui.scrivenings.nu_are_documente_text_apasa')}</p>;
  }
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
      {sections.map((n) => (
        <div key={n.id} className="scriv-section">
          <Editor
            key={readOnlyIds.has(n.id) ? 'ro' : 'rw'}
            ref={(r) => registerRef(n.id, r)}
            compact
            html={docs[n.id] || ''}
            title={n.title}
            readOnly={readOnlyIds.has(n.id)}
            smartQuotes={settings.smartQuotes !== false}
            typewriter={settings.typewriter}
            corrections={corrections}
            styles={styles}
            defaultFormatting={defaultFormatting}
            showInvisibles={settings.showInvisibles}
            linkTargets={linkTargets}
            onOpenLink={onOpenLink}
            onChange={(html) => onChange(n.id, html)}
            onFocus={() => onFocusSection(n.id)}
            onTitleClick={() => onOpen(n.id)}
          />
        </div>
      ))}
    </div>
  );
}
