import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { SUBMENUS, AI_ONLY_COMMANDS } from '../src/lib/menuLayout.js';
import { TOP_ITEMS, TOP_DEFAULT } from '../src/lib/toolbars.js';

// AI isolation (2026-10-27): every AI command and AI setting is reachable only from the top-level AI menu.
const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const flat = (subs) => (subs || []).flatMap(([, ids]) => ids);

describe('AI isolation', () => {
  it('AI menu keeps every AI command (moved, not deleted)', () => {
    const ai = flat(SUBMENUS.ai);
    for (const id of ['aiResearchSel', 'aiDefineSel', 'aiProofreadSel', 'aiTranslateSel', 'researchAskSel', 'aiBulkSynopsis', 'aiConsistency', 'aiZoomReview', 'nlmExport', 'nlmOpen', 'nlmAskSel', 'nlmConsultSel']) expect(ai).toContain(id);
    const ms = src('src/lib/menuLayout.js');
    for (const id of ['ai', 'irep', 'iedit', 'aiCancelJob', 'aiSettings', 'mcpConnect']) expect(ms).toMatch(new RegExp(`AI_ORDER = \\[[^\\]]*'${id}'`));
    expect(AI_ONLY_COMMANDS.has ? AI_ONLY_COMMANDS.has('iedit') : AI_ONLY_COMMANDS.includes('iedit')).toBe(true);
  });
  it('Tools menu has no NotebookLM copy', () => {
    expect(flat(SUBMENUS.tools)).not.toContain('nlmAskSel');
  });
  it('toolbar has no AI item', () => {
    expect(TOP_ITEMS.some((i) => ['ai', 'aiMenu', 'irep'].includes(i.id))).toBe(false);
    expect(TOP_DEFAULT).not.toContain('aiMenu');
  });
  it('context menus (native + web) carry no AI entries', () => {
    const main = src('electron/main.cjs');
    for (const id of ['aiResearchSel', 'aiDefineSel', 'aiProofreadSel', 'aiTranslateSel', 'researchAskSel', 'nlmAskSel', 'nlmConsultSel']) expect(main).not.toContain(`cmd('${id}')`);
    const app = src('src/App.jsx');
    const ctx = app.slice(app.indexOf('editorCtxItems'), app.indexOf('editorCtxItems') + 6000);
    for (const id of ['aiResearchSel', 'aiDefineSel', 'researchAskSel']) expect(ctx).not.toContain(`run('${id}')`);
    expect(ctx).not.toContain('askNotebookLm });');
  });
  it('general Settings never lists the AI tab; AI settings have their own dialog', () => {
    const sd = src('src/components/SettingsDialog.jsx');
    expect(sd).toContain("aiOnly ? ['ai'] : TABS.filter((k) => k !== 'ai' && panes[k])");
    expect(src('src/App.jsx').match(/aiOnly=\{settingsTab === 'ai'\}/g)).toHaveLength(2);
  });
});
