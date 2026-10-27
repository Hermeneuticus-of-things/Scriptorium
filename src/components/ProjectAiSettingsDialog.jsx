import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { DEFAULT_SCOPE, toggleScope } from '../lib/researchChat.js';

// AI > Setari AI proiect... : the OPEN BOOK's AI settings only (owner decision 2026-10-27).
// Own AI rules (project.editorialProfile.aiRules), what the AI may use (per-project research scope)
// and the MCP connection for this project. Program AI (provider, key, NotebookLM, timeout) stays in
// AI > Setari AI program... (SettingsDialog aiOnly). Program and project never share a dialog.
// Moved here from SettingsDialog (not deleted there: hidden behind PROJECT_AI_IN_PROGRAM_DIALOG).
// Same storage as before: aiRules in the project file, scope in localStorage under the same key.
const SCOPE_KEY = (dir) => 'pneuma-research-scope:' + dir;
const readScope = (dir) => {
  try {
    const v = dir && localStorage.getItem(SCOPE_KEY(dir));
    return v ? JSON.parse(v) : DEFAULT_SCOPE;
  } catch {
    return DEFAULT_SCOPE;
  }
};

export default function ProjectAiSettingsDialog({ api, dir, project, onSave, onClose, onError }) {
  const [rules, setRules] = useState(project?.editorialProfile?.aiRules || '');
  const [scope, setScope] = useState(() => readScope(dir));
  const [mcp, setMcp] = useState(null);
  const kinds = [['docs', t('ui.researchChat.manuscris')], ['research', t('ui.advancedSearchDialog.cercetare')], ['notes', t('ui.advancedSearchDialog.note')]];

  const save = () => {
    try {
      if (dir) {
        try {
          localStorage.setItem(SCOPE_KEY(dir), JSON.stringify(scope));
        } catch {
          /* storage unavailable */
        }
        window.dispatchEvent(new CustomEvent('pneuma:research-scope', { detail: { dir, scope } }));
      }
      if (project && rules !== (project.editorialProfile?.aiRules || '')) {
        onSave({ ...project, editorialProfile: { ...(project.editorialProfile || {}), aiRules: rules } });
      } else {
        onClose();
      }
    } catch (e) {
      onError?.(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-dialog project-ai-dialog" role="dialog" aria-label={t('cmd.aiProjectSettings')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('cmd.aiProjectSettings').replace(/.$/, '')}</h2>
        <p className="muted small">{t('set.projectAiInfo')}</p>
        {!project ? (
          <p className="muted small">{t('set.aiRulesNoProject')}</p>
        ) : (
          <>
            <fieldset>
              <legend>{t('set.aiFunctions')}</legend>
              <label>
                {t('set.aiRules')}
                <textarea rows={4} value={rules} onChange={(e) => setRules(e.target.value)} placeholder={t('set.aiRulesPlaceholder')} />
              </label>
            </fieldset>
            {dir && (
              <fieldset>
                <legend>{t('ui.researchChat.ce_poate_folosi_ai_ul')}</legend>
                {kinds.map(([k, label]) => (
                  <label key={k} className="check research-kind">
                    <input type="checkbox" checked={(scope.kinds || []).includes(k)} onChange={() => setScope((sc) => toggleScope(sc, 'kind', k))} /> {label}
                  </label>
                ))}
              </fieldset>
            )}
            {api?.mcpInfo && dir && (
              <fieldset>
                <legend>{t('set.mcp')}</legend>
                <p className="muted small">{t('set.mcpInfo')}</p>
                <button onClick={async () => setMcp(await api.mcpInfo(dir))}>{t('set.mcpShow')}</button>
                {mcp && (
                  <>
                    <label>
                      Claude Code
                      <textarea readOnly rows={2} value={mcp.claudeCode} onFocus={(e) => e.target.select()} />
                    </label>
                    <label>
                      Claude Desktop (claude_desktop_config.json)
                      <textarea readOnly rows={7} value={mcp.desktopJson} onFocus={(e) => e.target.select()} />
                    </label>
                  </>
                )}
              </fieldset>
            )}
          </>
        )}
        <div className="actions">
          <button onClick={onClose}>{t('btn.cancel')}</button>
          <button className="primary" onClick={save} disabled={!project}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
