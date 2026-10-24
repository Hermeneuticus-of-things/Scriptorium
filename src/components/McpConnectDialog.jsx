import React, { useEffect, useState } from 'react';
import { t } from '../lib/i18n.js';

// Ajutor → Conectează la Claude (MCP): gives Claude Desktop / Claude Code access to the open project
// through the MCP server shipped with the app (Scribner runs it itself; no Node.js needed).
export default function McpConnectDialog({ api, dir, onClose }) {
  const [readOnly, setReadOnly] = useState(false);
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');
  const opts = { projects: dir ? [dir] : [], readOnly };

  useEffect(() => {
    api.mcpConnectInfo(opts).then(setInfo).catch((e) => setMsg(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, readOnly]);

  const toDesktop = async () => {
    try {
      const r = await api.mcpConnectDesktop(opts);
      setMsg(t('ui.mcp.scris_desktop', { file: r.file }));
    } catch (e) {
      setMsg(e.message);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.command);
      setMsg(t('ui.mcp.comanda_copiata'));
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-label={t('ui.mcp.titlu')} onClick={(e) => e.stopPropagation()}>
        <h2>{t('ui.mcp.titlu')}</h2>
        <p className="muted small">{dir ? t('ui.mcp.proiect', { dir }) : t('ui.mcp.fara_proiect')}</p>
        <label className="check">
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /> {t('ui.mcp.doar_citire')}
        </label>
        <h4>Claude Desktop</h4>
        <p className="muted small">{t('ui.mcp.desktop_tip')}</p>
        <button className="primary" onClick={toDesktop} disabled={!info}>{t('ui.mcp.adauga_desktop')}</button>
        <h4>Claude Code</h4>
        <p className="muted small">{t('ui.mcp.code_tip')}</p>
        {info && <pre className="mcp-command">{info.command}</pre>}
        <button onClick={copy} disabled={!info}>{t('ui.mcp.copiaza_comanda')}</button>
        {msg && <p className="muted small" role="status">{msg}</p>}
        <div className="actions">
          <span className="spacer" />
          <button onClick={onClose}>{t('btn.close')}</button>
        </div>
      </div>
    </div>
  );
}
