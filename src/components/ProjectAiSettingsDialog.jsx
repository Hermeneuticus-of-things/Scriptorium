import React, { useState } from 'react';
import { t, uiLocale } from '../lib/i18n.js';
import { htmlToText } from '../lib/text.js';
import { DEFAULT_SCOPE, toggleScope } from '../lib/researchChat.js';
import { bookTypeById, bookTypeFromReply, bookTypeDetectPrompt, bookTypeLabel, bookTypeOptions } from '../lib/bookTypes.js';

// AI > Setari AI proiect... : the OPEN BOOK's AI settings only (owner decision 2026-10-27).
// Own AI rules (project.editorialProfile.aiRules), what the AI may use (per-project research scope),
// the book type the AI must see (project.bookType, directive 2026-11-10) and the MCP connection for
// this project. Program AI (provider, key, NotebookLM, timeout) stays in AI > Setari AI program...
// (SettingsDialog aiOnly). Program and project never share a dialog.
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
  const [bookType, setBookType] = useState(project?.bookType || '');
  const [detecting, setDetecting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [detectError, setDetectError] = useState('');
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
      if (project) {
        const typeChanged = bookType !== (project.bookType || '');
        const rulesChanged = rules !== (project.editorialProfile?.aiRules || '');
        if (typeChanged || rulesChanged) {
          const next = { ...project };
          if (typeChanged) next.bookType = bookType || null;
          if (rulesChanged) next.editorialProfile = { ...(next.editorialProfile || {}), aiRules: rules };
          onSave(next);
          return;
        }
      }
      onClose();
    } catch (e) {
      onError?.(e);
    }
  };

  // AI „vede" ce tip de carte este (directivă autor 2026-11-10): propune un tip din eșantionul
  // primului document de manuscris; alegerea rămâne a autorului — nimic nu se salvează automat.
  const detect = async () => {
    if (detecting) return;
    setDetectError(''); setSuggestion(null); setDetecting(true);
    try {
      const draft = (project?.tree || []).find((n) => n.root === 'draft');
      const findFirst = (ns) => {
        for (const n of ns || []) {
          if (n.type === 'text' && !n.locked && !n.readOnly) return n;
          const found = findFirst(n.children);
          if (found) return found;
        }
        return null;
      };
      const first = findFirst(draft?.children);
      const sample = first ? htmlToText(await api.readDoc(dir, first.id, 'docs')).slice(0, 4000) : '';
      if (!sample.trim()) throw new Error(t('ui.projectAi.detectNoText'));
      const res = await api.runAi({ action: 'ask', text: sample, question: bookTypeDetectPrompt(), runId: 'bt' + Date.now().toString(36), dir, projectTitle: project.title, documentTitle: first.title, textScope: 'document' });
      const id = bookTypeFromReply(res?.text);
      if (!id) throw new Error(t('ui.projectAi.detectUnclear'));
      setSuggestion(id);
    } catch (e) {
      setDetectError(e.message);
    } finally {
      setDetecting(false);
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
              <legend>{t('ui.projectAi.bookType')}</legend>
              <label>
                {t('ui.projectAi.bookTypeLabel')}
                <select
                  aria-label={t('ui.projectAi.bookTypeLabel')}
                  value={bookType}
                  onChange={(e) => setBookType(e.target.value)}
                  disabled={detecting}
                >
                  <option value="">{t('ui.projectAi.bookTypeNone')}</option>
                  {['fiction', 'nonfiction'].map((group) => (
                    <optgroup key={group} label={group === 'fiction' ? 'Ficțiune' : 'Non-ficțiune'}>
                      {bookTypeOptions(uiLocale()).filter((o) => o.group === (group === 'fiction' ? 'Ficțiune' : 'Non-ficțiune')).map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {bookType && <p className="muted small">{bookTypeById(bookType)?.hint}</p>}
              <div className="row">
                <button type="button" onClick={detect} disabled={detecting}>{detecting ? t('ui.projectAi.detecting') : t('ui.projectAi.detect')}</button>
                {suggestion && (
                  <span className="muted small">
                    {t('ui.projectAi.suggestion', { label: bookTypeLabel(suggestion, uiLocale()) })}{' '}
                    <button type="button" className="link" onClick={() => setBookType(suggestion)}>{t('ui.projectAi.use')}</button>
                  </span>
                )}
              </div>
              {detectError && <p role="alert" className="small">{detectError}</p>}
              <p className="muted small">{t('ui.projectAi.bookTypeHelp')}</p>
            </fieldset>
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
