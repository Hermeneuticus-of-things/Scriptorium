import React from 'react';
import Editor from './Editor.jsx';

// Several documents edited as one continuous text; each section saves to its own document.
export default function Scrivenings({ folder, sections, docs, settings, readOnlyIds, onChange, onFocusSection, registerRef, onOpen }) {
  if (sections.length === 0) {
    return <p className="hint">Dosarul „{folder.title}” nu are documente. Apasă Ctrl+N pentru unul nou.</p>;
  }
  return (
    <div className="scrivenings">
      <div className="scriv-head">
        <strong>{folder.title}</strong> <span className="muted">· {sections.length} documente editate împreună (Scrivenings)</span>
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
