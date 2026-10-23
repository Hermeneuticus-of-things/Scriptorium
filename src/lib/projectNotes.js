// Project notes with several tabs (Scrivener: Project Notes).
// project.projectNotes = [{ id, title }]; each tab's text is stored as notes/<id>.html.
// The first tab keeps id 'project-notes' so projects from older versions (one
// notes/project-notes.html file) keep their notes.

export const LEGACY_NOTES_ID = 'project-notes';

export function projectNoteTabs(project) {
  const list = project && Array.isArray(project.projectNotes) ? project.projectNotes.filter((t) => t && t.id) : [];
  return list.length ? list : [{ id: LEGACY_NOTES_ID, title: 'Note proiect' }];
}

export function newNoteId(tabs, now = Date.now()) {
  const taken = new Set(tabs.map((t) => t.id));
  let id = `pn-${now.toString(36)}`;
  for (let i = 2; taken.has(id); i++) id = `pn-${now.toString(36)}-${i}`;
  return id;
}

export function addNoteTab(tabs, title, now) {
  const base = projectNoteTabs({ projectNotes: tabs });
  const tab = { id: newNoteId(base, now), title: (title || '').trim() || `Note ${base.length + 1}` };
  return { tabs: [...base, tab], tab };
}

export function renameNoteTab(tabs, id, title) {
  const t = (title || '').trim();
  if (!t) return tabs;
  return projectNoteTabs({ projectNotes: tabs }).map((x) => (x.id === id ? { ...x, title: t } : x));
}

// The legacy tab cannot be removed (it is the fallback); neither can the last one.
export function removeNoteTab(tabs, id) {
  const base = projectNoteTabs({ projectNotes: tabs });
  if (id === LEGACY_NOTES_ID || base.length <= 1) return base;
  return base.filter((x) => x.id !== id);
}

export function moveNoteTab(tabs, id, delta) {
  const base = [...projectNoteTabs({ projectNotes: tabs })];
  const i = base.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= base.length) return base;
  [base[i], base[j]] = [base[j], base[i]];
  return base;
}
