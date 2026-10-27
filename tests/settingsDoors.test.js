import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { dictionaries } from '../src/lib/i18n.js';

// Owner decisions 2026-10-27: scriptFormat is per project; AI menu has two separate doors (program / project).
const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('scriptFormat is a project setting', () => {
  const app = src('src/App.jsx');
  it('reads project.scriptFormat first and writes the open project, not the global settings', () => {
    expect(app).toContain('project && project.scriptFormat !== undefined ? project.scriptFormat || null : settings?.scriptFormat || null');
    const fn = app.slice(app.indexOf('const setScriptFormat'), app.indexOf('const setScriptFormat') + 400);
    expect(fn.indexOf('saveProject({ ...cur, scriptFormat: f || null })')).toBeGreaterThan(-1);
    expect(fn.indexOf('saveProject')).toBeLessThan(fn.indexOf('api.setSettings'));
  });
  it('Format > Mod scenariu menu is unchanged', () => {
    expect(app).toContain("['format', 'scriptOff', tr('cmd.scriptOff'), () => setScriptFormat(null)");
    expect(app).toContain('...SCRIPT_FORMAT_LIST.map((f) => [\'format\', `script_${f.id}`');
  });
});

describe('AI menu: two separate settings doors', () => {
  it('AI_ORDER lists program then project AI settings', () => {
    expect(src('src/lib/menuLayout.js')).toContain("'aiSettings', 'aiProjectSettings', 'mcpConnect'");
  });
  it('commands exist and are labelled in ro + en', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("['ai', 'aiSettings', tr('cmd.aiSettings'), () => openSettings('ai')]");
    expect(app).toContain("['ai', 'aiProjectSettings', tr('cmd.aiProjectSettings'), () => setDialog('projectAi'), !project]");
    for (const l of ['ro', 'en']) {
      expect(dictionaries[l]['cmd.aiSettings']).toMatch(/program/);
      expect(dictionaries[l]['cmd.aiProjectSettings']).toMatch(/proiect|project/);
    }
  });
  it('program AI dialog no longer shows project AI fields; project dialog has them', () => {
    const sd = src('src/components/SettingsDialog.jsx');
    expect(sd).toContain('const PROJECT_AI_IN_PROGRAM_DIALOG = false;');
    expect(sd).toContain('{PROJECT_AI_IN_PROGRAM_DIALOG && api.mcpInfo && dir && (');
    expect(sd).toContain('if (PROJECT_AI_IN_PROGRAM_DIALOG && project && aiOnly');
    const pd = src('src/components/ProjectAiSettingsDialog.jsx');
    for (const k of ["t('set.aiRules')", "t('set.mcp')", 'ce_poate_folosi_ai_ul', 'pneuma-research-scope:']) expect(pd).toContain(k);
    for (const k of ['aiTimeoutSec', 'ai.provider', 'setAiKeys', 'setSettings']) expect(pd).not.toContain(k);
  });
  it('project AI settings are not reachable from Proiect > Setarile proiectului (AI isolation)', () => {
    const ps = src('src/components/ProjectSettingsDialog.jsx');
    expect(ps).not.toContain('aiRules');
    expect(ps).not.toContain('ProjectAiSettingsDialog');
  });
});
