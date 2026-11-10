import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('unsaved changes protection', () => {
  it('offers save, discard and cancel in the app UI', () => {
    const app = read('src/App.jsx');
    expect(app).toContain("tr('ui.unsaved.title')");
    expect(read('src/lib/i18n-ui.js')).toContain('Ai modificări nesalvate');
    expect(read('src/lib/i18n-ui.js')).toContain('You have unsaved changes');
    expect(app).toContain('onDiscard={() => resolveUnsavedDecision(\'discard\')}');
    expect(app).toContain('onCancel={() => resolveUnsavedDecision(\'cancel\')}');
    expect(app).toContain('onSave={() => resolveUnsavedDecision(\'save\')}');
  });

  it('blocks browser unload when edits are pending', () => {
    const app = read('src/App.jsx');
    expect(app).toContain("event.preventDefault();");
    expect(app).toContain("event.returnValue = '';");
    expect(app).toContain('hasUnsavedChanges()');
  });

  it('provides the Electron close handshake', () => {
    expect(read('electron/preload.cjs')).toContain("onWindowCloseRequest");
    expect(read('electron/preload.cjs')).toContain("windowCloseResponse");
    const main = read('electron/main.cjs');
    expect(main).toContain("window:close-request");
    expect(main).toContain("window:close-response");
    expect(main).toContain('win.__closePromptPending');
  });
});
