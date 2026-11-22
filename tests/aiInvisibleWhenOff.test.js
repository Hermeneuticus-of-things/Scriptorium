import { describe, it, expect } from 'vitest';
import fs from 'fs';
// Directivă autor (22.11.2026): un scriitor care nu vrea AI nu trebuie să vadă NICIUN gram
// de AI — meniul AI dispare complet când AI e oprit; se activează doar din Program → Setări
// (cheie + bifa „Funcții AI"). Programul merge integral fără.
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
import { AI_ONLY_COMMANDS } from '../src/lib/menuLayout.js';

describe('AI invizibil când e oprit (directiva autor 22.11.2026)', () => {
  it('toate porțile AI sunt gate-uite: meniu, I-REP/I-EDIT, setări AI, MCP, NotebookLM', () => {
    for (const id of ['ai', 'irep', 'iedit', 'aiCancelJob', 'aiSettings', 'aiProjectSettings', 'mcpConnect', 'nlmExport', 'nlmOpen', 'nlmAskSel', 'nlmConsultSel', 'aiBulkSynopsis', 'aiConsistency', 'aiZoomReview', 'aiResearchSel', 'aiDefineSel', 'aiTranslateSel', 'aiProofreadSel', 'researchAskSel']) {
      expect(AI_ONLY_COMMANDS.has(id), id).toBe(true);
    }
  });
  it('App ascunde exact setul gate-uit când AI e oprit', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("(aiEnabled || !AI_ONLY_COMMANDS.has(id))");
  });
  it('grupul gol de meniu se elimină (buildMenuLayout filtrează grupurile fără itemi)', () => {
    expect(src('src/lib/menuLayout.js')).toMatch(/\.filter\(\(m\) => m\.items\.length\)/);
  });
  it('activarea e self-service în Program → Setări (bifa aiEnabled, nu un meniu AI ascuns)', () => {
    const sd = src('src/components/SettingsDialog.jsx');
    expect(sd).toContain("check('aiEnabled', t('set.aiEnabled'))");
  });
});
