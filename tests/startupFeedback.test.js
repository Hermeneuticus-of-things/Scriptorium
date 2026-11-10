import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('startup feedback', () => {
  it('shows a static splash before React mounts', () => {
    const html = read('index.html');
    expect(html).toContain('id="boot-splash"');
    expect(html).toContain('Pneuma Sofer');
  });

  it('removes the static splash after the first React frame', () => {
    expect(read('src/main.jsx')).toContain("document.getElementById('boot-splash')?.remove()");
  });

  it('keeps an accessible skeleton while settings are loading', () => {
    const app = read('src/App.jsx');
    const css = read('src/styles.css');
    expect(app).toContain('loading-screen');
    expect(app).toContain('aria-live="polite"');
    expect(css).toContain('.loading-skeleton');
  });
});
