// Web/PWA store: a bundle round-trip keeps the writing history, and deleting a project
// leaves nothing of it behind in the browser store.
import { describe, it, expect } from 'vitest';
import { createWebApi, createMemoryKv } from '../src/lib/webApi.js';

const make = () => {
  const kv = createMemoryKv();
  return { kv, api: createWebApi({ kv, channel: null }) };
};

describe('web bundles and project deletion', () => {
  it('export → import keeps docs, notes, snapshots and the writing history', async () => {
    const { api } = make();
    const { dir, project } = await api.newProject('Carte');
    const id = project.tree[0].children[0].id;
    await api.writeDoc(dir, id, 'docs', '<p>Text</p>');
    await api.writeDoc(dir, id, 'notes', '<p>Notă</p>');
    await api.takeSnapshot(dir, id, 'unu');
    await api.recordHistory(dir, { draft: 10, total: 12 });
    const data = await api.exportBundleData(dir);
    const { dir: dir2 } = await api.importBundleData(JSON.parse(JSON.stringify(data)));
    expect(await api.readDoc(dir2, id, 'docs')).toBe('<p>Text</p>');
    expect(await api.readDoc(dir2, id, 'notes')).toBe('<p>Notă</p>');
    expect((await api.listSnapshots(dir2, id)).map((s) => s.name)).toEqual(['unu']);
    expect(await api.getHistory(dir2)).toEqual(await api.getHistory(dir));
  });
  it('deleting a project removes every key of it (docs, snapshots, history, author journal)', async () => {
    const { kv, api } = make();
    const { dir, project } = await api.newProject('Carte');
    const id = project.tree[0].children[0].id;
    await api.writeDoc(dir, id, 'docs', '<p>Text</p>');
    await api.takeSnapshot(dir, id, 'unu');
    await api.recordHistory(dir, { draft: 1, total: 1 });
    await api.appendAuthorJournal(dir, [{ doc: id, old: 'a', new: 'b' }]);
    await api.deleteProject(dir);
    const left = (await kv.keys('')).filter((k) => k.includes(dir));
    expect(left).toEqual([]);
  });
});
