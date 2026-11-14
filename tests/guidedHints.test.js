import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('guided hints', () => {
  it('connects blocked service actions to selection and settings hints', () => {
    const app = read('src/App.jsx');
    expect(app).toContain("showHint('editor-selection')");
    expect(app).toContain("openSettings('accounts')");
    expect(app).toContain('service-key-${service}');
  });

  it('marks the editor, settings tab and service fields as hint targets', () => {
    expect(read('src/components/Editor.jsx')).toContain("data-hint={!readOnly ? 'editor-selection' : undefined}");
    expect(read('src/components/SettingsDialog.jsx')).toContain("'services-tab'");
    expect(read('src/components/ServicesPanel.jsx')).toContain('service-key-${id}');
  });

  it('provides a reduced-motion-safe glow style', () => {
    const css = read('src/styles.css');
    expect(css).toContain('.hint-glow');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
