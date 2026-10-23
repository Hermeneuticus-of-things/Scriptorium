import React from 'react';
import Editor from './Editor.jsx';

// Several documents edited as one continuous text; each section saves to its own document.
// `title` names the set (a folder, a multiple selection, a collection, search results).
// showTitles / showSeparators toggle the section titles and the dashed dividers.
export default function Scrivenings({ title, folder, sections, docs, settings, readOnlyIds, onChange, onFocusSection, registerRef, onOpen, showTitles = true, showSeparators = true, onClose }) {
  const name = title ?? folder?.title ?? '';
  if (sections.length === 0) {
    return <p className="hint">„{name}” nu are documente text. Apasă Ctrl+N pentru unul nou.</p>;
  }
  return (
    <div className={`scrivenings ${showTitles ? '' : 'no-titles'} ${showSeparators ? '' : 'no-separators'}`}>
      <div className="scriv-head">
        <strong>{name}</strong> <span className="muted">· {sections.length} documente editate împreună (Scrivenings)</span>
        {onClose && (
          <button className="link" onClick={onClose}>
            Închide
          </button>
        )}
      </div>
      {sections.map((n) => (
        <div key={n.id} className="scriv-section">
          <Editor
            ref={(r) => registerRef(n.id, r)}
            compact
            html={docs[n.id] || ''}
            title={n.title}
            readOnly={readOnlyIds.has(n.id)}
            smartQuotes={settings.smartQuotes !== false}
            typewriter={settings.typewriter}
            onChange={(html) => onChange(n.id, html)}
            onFocus={() => onFocusSection(n.id)}
            onTitleClick={() => onOpen(n.id)}
          />
        </div>
      ))}
    </div>
  );
}
