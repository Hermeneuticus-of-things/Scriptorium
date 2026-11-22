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
  // Pachetul de carte (universal): stratul de sus al motorului AI — frazele fixate nu se ating,
  // formulele oprite apar de zero ori în textul livrat. Orice carte își aduce propriul pachet.
  const [fixedPhrases, setFixedPhrases] = useState(project?.editorialProfile?.fixedPhrases || '');
  const [bannedFormulas, setBannedFormulas] = useState(project?.editorialProfile?.bannedFormulas || '');
  const [scope, setScope] = useState(() => readScope(dir));
  const [mcp, setMcp] = useState(null);
  const [bookType, setBookType] = useState(project?.bookType || '');
  const [detecting, setDetecting] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [detectError, setDetectError] = useState('');
  const [dirty, setDirty] = useState(false);
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
        const rulesChanged = rules !== (project.editorialProfile?.aiRules || '')
          || fixedPhrases !== (project.editorialProfile?.fixedPhrases || '')
          || bannedFormulas !== (project.editorialProfile?.bannedFormulas || '');
        if (typeChanged || rulesChanged) {
          const next = { ...project };
          if (typeChanged) next.bookType = bookType || null;
          if (rulesChanged) next.editorialProfile = { ...(next.editorialProfile || {}), aiRules: rules, fixedPhrases, bannedFormulas };
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
  const close = () => {
    const originalRules = project?.editorialProfile?.aiRules || '';
    const originalType = project?.bookType || '';
    const originalScope = readScope(dir);
    const scopeChanged = JSON.stringify(scope) !== JSON.stringify(originalScope);
    if (dirty || rules !== originalRules || bookType !== originalType || scopeChanged) {
      if (!window.confirm(t('ui.settingsDialog.renunti'))) return;
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal settings-dialog project-ai-dialog" role="dialog" aria-label={t('cmd.aiProjectSettings')} aria-describedby="project-ai-scope" onClick={(e) => e.stopPropagation()} onChangeCapture={() => setDirty(true)}>
        <h2>{t('cmd.aiProjectSettings').replace(/.$/, '')}</h2>
        <p id="project-ai-scope" className="surface-scope" role="note">{t('ui.projectAi.scope')}</p>
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
              <label>
                {t('set.fixedPhrases')}
                <textarea rows={3} value={fixedPhrases} onChange={(e) => setFixedPhrases(e.target.value)} placeholder={t('set.fixedPhrasesPlaceholder')} />
              </label>
              <label>
                {t('set.bannedFormulas')}
                <textarea rows={3} value={bannedFormulas} onChange={(e) => setBannedFormulas(e.target.value)} placeholder={t('set.bannedFormulasPlaceholder')} />
              </label>
              <p className="muted small">{t('set.bookPackageInfo')}</p>
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
          {dirty && <span className="muted settings-dirty" role="status">{t('ui.settingsDialog.unsaved')}</span>}
          <button onClick={close}>{t('btn.cancel')}</button>
          <button className="primary" onClick={save} disabled={!project}>{t('btn.save')}</button>
        </div>
      </div>
    </div>
  );
}
