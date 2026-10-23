import React, { useState } from 'react';

export default function SettingsDialog({ api, settings, project, dir, onProjectChange, onClose, onError }) {
  const [apiKey, setApiKey] = useState('');
  const [theme, setTheme] = useState(settings.theme || 'system');
  const [fontSize, setFontSize] = useState(settings.fontSize || 18);
  const [typewriter, setTypewriter] = useState(Boolean(settings.typewriter));
  const [smartQuotes, setSmartQuotes] = useState(settings.smartQuotes !== false);
  const [backupOnClose, setBackupOnClose] = useState(settings.backupOnClose !== false);
  const [backupEveryMin, setBackupEveryMin] = useState(settings.backupEveryMin || 0);
  const [backupKeep, setBackupKeep] = useState(settings.backupKeep || 10);
  const [backupDir, setBackupDir] = useState(settings.backupDir || '');
  const [draft, setDraft] = useState(project?.targets?.draft || 0);
  const [edBase, setEdBase] = useState(project?.editorialProfile?.base || 'karma');
  const [edRules, setEdRules] = useState(project?.editorialProfile?.rules || {});
  const [edLimit, setEdLimit] = useState(project?.editorialProfile?.canvasWordLimit ?? 3000);
  const [mcp, setMcp] = useState(null);
  const [session, setSession] = useState(project?.targets?.session || 0);

  const save = async () => {
    try {
      const patch = {
        theme,
        fontSize: Number(fontSize) || 18,
        typewriter,
        smartQuotes,
        backupOnClose,
        backupEveryMin: Number(backupEveryMin) || 0,
        backupKeep: Math.max(1, Number(backupKeep) || 10),
        backupDir,
      };
      if (apiKey.trim()) patch.apiKey = apiKey.trim();
      await api.setSettings(patch);
      if (project) {
        onProjectChange({
          ...project,
          targets: { ...(project.targets || {}), draft: Number(draft) || 0, session: Number(session) || 0 },
          editorialProfile: { ...(project.editorialProfile || {}), base: edBase, rules: edRules, canvasWordLimit: Number(edLimit) || 0 },
        });
      }
      onClose();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Setări" onClick={(e) => e.stopPropagation()}>
        <h2>Setări</h2>
        <label>
          Temă
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">Ca sistemul</option>
            <option value="light">Luminoasă</option>
            <option value="dark">Întunecată</option>
            <option value="sepia">Sepia</option>
          </select>
        </label>
        <label>
          Mărimea textului în editor (px)
          <input type="number" min="12" max="32" value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={typewriter} onChange={(e) => setTypewriter(e.target.checked)} /> Defilare tip mașină de scris (rândul curent la mijloc)
        </label>
        <label className="check">
          <input type="checkbox" checked={smartQuotes} onChange={(e) => setSmartQuotes(e.target.checked)} /> Ghilimele „românești”, — din -- și … din trei puncte, automat
        </label>
        {api.chooseBackupDir && (
          <fieldset>
            <legend>Backup</legend>
            <label className="check">
              <input type="checkbox" checked={backupOnClose} onChange={(e) => setBackupOnClose(e.target.checked)} /> Backup automat la închidere
            </label>
            <div className="row">
              <label>
                Și la fiecare (minute, 0 = nu)
                <input type="number" min="0" step="5" value={backupEveryMin} onChange={(e) => setBackupEveryMin(e.target.value)} />
              </label>
              <label>
                Păstrează ultimele
                <input type="number" min="1" max="100" value={backupKeep} onChange={(e) => setBackupKeep(e.target.value)} />
              </label>
            </div>
            <label>
              Folder backup (gol = lângă proiect)
              <div className="row">
                <input value={backupDir} readOnly placeholder="lângă proiect, în <Nume>.backups" />
                <button onClick={async () => setBackupDir((await api.chooseBackupDir()) || backupDir)}>Alege…</button>
                {backupDir && <button onClick={() => setBackupDir('')}>Implicit</button>}
              </div>
            </label>
          </fieldset>
        )}
        {project && (
          <div className="row">
            <label>
              Țintă carte (cuvinte)
              <input type="number" min="0" step="1000" value={draft} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <label>
              Țintă sesiune (cuvinte)
              <input type="number" min="0" step="100" value={session} onChange={(e) => setSession(e.target.value)} />
            </label>
          </div>
        )}
        {project && (
          <fieldset>
            <legend>Profil editorial (I-REP / I-EDIT)</legend>
            <label>
              Reguli de bază
              <select value={edBase} onChange={(e) => setEdBase(e.target.value)}>
                <option value="karma">Karma (karma-book-engine: P1–P13, R0–R11, ALOGEN, DOOM III)</option>
                <option value="generic">Generic românesc (tipografie + reziduuri LLM)</option>
              </select>
            </label>
            <label>
              Limita de cuvinte pe canvas (0 = fără)
              <input type="number" min="0" step="100" value={edLimit} onChange={(e) => setEdLimit(e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(edRules.canvasHeader)} onChange={(e) => setEdRules((r) => ({ ...r, canvasHeader: e.target.checked }))} /> Verifică prima linie „Cap. N / Secț. N / Subcap. N”
            </label>
            <label className="check">
              <input type="checkbox" checked={Boolean(edRules.canvasFooter)} onChange={(e) => setEdRules((r) => ({ ...r, canvasFooter: e.target.checked }))} /> Verifică nota finală „¹ Cap. N / Subcap. … · ← anterior · → următor”
            </label>
          </fieldset>
        )}
        {api.mcpInfo && dir && (
          <fieldset>
            <legend>Conexiune MCP pentru agenți AI</legend>
            <p className="muted small">Agenții (Claude Code, Claude Desktop, alți clienți MCP) pot citi și edita proiectele prin serverul MCP Scriptorium. Fiecare scriere face snapshot înainte.</p>
            <button onClick={async () => setMcp(await api.mcpInfo(dir))}>Arată comanda de conectare</button>
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
        <label>
          Cheie API Anthropic {settings.hasApiKey ? '(setată, lasă gol ca s-o păstrezi)' : ''}
          <input type="password" autoComplete="off" placeholder="sk-ant-…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </label>
        {settings.hasApiKey && (
          <button className="link" onClick={() => api.setSettings({ apiKey: '' }).then(onClose).catch(onError)}>
            Șterge cheia API
          </button>
        )}
        <div className="actions">
          <button onClick={onClose}>Anulează</button>
          <button className="primary" onClick={save}>Salvează</button>
        </div>
      </div>
    </div>
  );
}
