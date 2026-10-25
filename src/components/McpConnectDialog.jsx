import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';

// AI → Conectează la Claude (MCP): gives an AI client (Claude Desktop/Code, Cursor, Gemini CLI,
// OpenCode, Windsurf, VS Code, Codex) access to the open project through the MCP server shipped with
// the app. Scribner runs the server itself (no Node.js). Detected clients are offered first, each
// with a one-click "add" that writes/merges that client's own config file (with a backup).
export default function McpConnectDialog({ api, dir, onClose }) {
  const [readOnly, setReadOnly] = useState(false);
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');
  // No project in the command/config: the agent sees the projects in Scribner's recent list, so the
  // same line can be shared or pasted into any client without naming the book or the computer.
  const opts = { projects: [], readOnly };

  useEffect(() => {
    api.mcpConnectInfo(opts).then(setInfo).catch((e) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, readOnly]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(t('ui.mcp.comanda_copiata'));
    } catch (e) {
      setMsg(e.message);
    }
  };
  const addTo = async (client) => {
    try {
      const r = client.id === 'claudeDesktop' ? await api.mcpConnectDesktop(opts) : await api.mcpConnectClient(client.id, opts);
      setMsg(t('ui.mcp.scris_client', { label: client.label, file: r.file }));
    } catch (e) {
      setMsg(e.message);
    }
  };

  const clients = info ? [...info.clients].sort((a, b) => Number(b.detected) - Number(a.detected)) : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.mcp.titlu')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.mcp.titlu')}</h2>
        <p className="muted small">{t('ui.mcp.general')}</p>
        <label className="check">
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /> {t('ui.mcp.doar_citire')}
        </label>
        {!info && <p className="muted small" role="status">…</p>}
        {clients.map((c) => (
          <div key={c.id} className="mcp-client">
            <h4>
              {c.label}{' '}
              <span className={c.detected ? 'ok small' : 'muted small'}>{c.detected ? t('ui.mcp.detectat') : t('ui.mcp.nedetectat')}</span>
            </h4>
            {c.kind === 'command' ? (
              <>
                <p className="muted small">{t('ui.mcp.code_tip')}</p>
                <pre className="mcp-command">{c.command}</pre>
                <button onClick={() => copy(c.command)}>{t('ui.mcp.copiaza_comanda')}</button>
              </>
            ) : (
              <>
                <p className="muted small">{t('ui.mcp.calea', { path: c.path })}</p>
                <button className={c.detected ? 'primary' : ''} onClick={() => addTo(c)}>{t('ui.mcp.adauga_in', { label: c.label })}</button>
                <details>
                  <summary className="muted small">{t('ui.mcp.vezi_config')}</summary>
                  <pre className="mcp-command">{c.preview}</pre>
                  <button onClick={() => copy(c.preview)}>{t('ui.ctx.copiaza')}</button>
                </details>
              </>
            )}
          </div>
        ))}
        {msg && <p className="muted small" role="status">{msg}</p>}
        <div className="actions">
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
