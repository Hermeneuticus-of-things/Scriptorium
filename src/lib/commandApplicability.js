// Context applicability is distinct from a missing but fixable configuration.
// Unknown commands keep their existing explicit capability/validation checks.
const SINGLE_TEXT = new Set(['formatDocument','split','splitTitle','snapshot','snapshotTitled','preserveFormat']);
const TEXT_SELECTION = new Set(['readSel','dictateSel','grammarSel','aiResearchSel','aiDefineSel','aiTranslateSel','aiProofreadSel','researchAskSel','nlmAskSel','nlmConsultSel']);
const ELEMENT_SELECTION = new Set(['moveTo','toggleSeparator','autoSynopsis','snapshotSelection']);
export const SERVICE_COMMANDS = { deeplInApp: 'deepl', googleInApp: 'googleTranslate', grammarSel: 'languagetool', synonymsInApp: 'datamuse', importZotero: 'zotero', nlmAskSel: 'notebookLm', nlmConsultSel: 'notebookLm', lookupDict: 'webResearch', lookupSyn: 'webResearch', lookupWiki: 'webResearch', lookupGoogle: 'webResearch', selDeepl: 'webResearch', selGoogleTranslate: 'webResearch', selLinguee: 'webResearch', selIate: 'webResearch', selWiktionary: 'webResearch', selScholar: 'webResearch' };
export function isCommandApplicable(id, c = {}) {
  if (SERVICE_COMMANDS[id] && c.services?.[SERVICE_COMMANDS[id]]?.configured !== true) return false;
  if (/^read(?:Sel|Here|Sentence|Paragraph|All|Book)$/.test(id) && c.canRead === false) return false;
  if (['dictateHere', 'dictateSel', 'dictate', 'transcribeAudio'].includes(id) && c.canDictate === false) return false;
  if (id === 'dictateStop') return Boolean(c.dictating);
  const nodes = c.nodes || [];
  const mutable = nodes.length > 0 && nodes.every((n) => !n.root && !n.inTrash);
  if (id === 'duplicate') return mutable;
  if (id === 'merge') return mutable && nodes.filter((n) => n.type === 'text').length >= 2;
  if (SINGLE_TEXT.has(id)) return Boolean(c.node && !c.node.root && c.node.type === 'text' && !c.node.inTrash);
  if (ELEMENT_SELECTION.has(id)) return mutable && (id !== 'snapshotSelection' || nodes.some((n) => n.type === 'text'));
  if (id === 'restoreTrash') return nodes.some((n) => !n.root && n.inTrash);
  if (id === 'newText' || id === 'newFolder') return c.node?.root !== 'trash' && !c.node?.inTrash;
  if (id === 'stopRead') return Boolean(c.reading);
  if (TEXT_SELECTION.has(id)) return Boolean(c.textSelection);
  if (id === 'openExternal') return Boolean(c.node?.media?.file);
  return true;
}
