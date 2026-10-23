import React from 'react';

export default function Outliner({ project, root, counts, onOpen, onPatch }) {
  const rows = [];
  const visit = (nodes, depth) => {
    for (const n of nodes) {
      rows.push({ n, depth });
      if (n.children) visit(n.children, depth + 1);
    }
  };
  visit(root.children || [], 0);
  const total = (n) => (counts[n.id] || 0) + (n.children || []).reduce((s, c) => s + total(c), 0);
  return (
    <div className="outliner">
      <h2>{root.title}</h2>
      <table>
        <thead>
          <tr>
            <th>Titlu</th>
            <th>Sinopsis</th>
            <th>Etichetă</th>
            <th>Status</th>
            <th>În Compile</th>
            <th className="num">Cuvinte</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ n, depth }) => (
            <tr key={n.id}>
              <td style={{ paddingLeft: 8 + depth * 16 }}>
                <button className="link" onClick={() => onOpen(n.id)}>
                  {n.children ? '📁 ' : ''}
                  {n.title}
                </button>
              </td>
              <td className="syn">{n.synopsis}</td>
              <td>
                <select value={n.label} onChange={(e) => onPatch(n.id, { label: e.target.value })}>
                  {project.labels.map((l) => (
                    <option key={l.name}>{l.name}</option>
                  ))}
                </select>
              </td>
              <td>
                <select value={n.status} onChange={(e) => onPatch(n.id, { status: e.target.value })}>
                  {project.statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                <input type="checkbox" checked={n.includeInCompile !== false} onChange={(e) => onPatch(n.id, { includeInCompile: e.target.checked })} />
              </td>
              <td className="num">{total(n).toLocaleString('ro-RO')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
