import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// A local `const tr = …` in a file that imports `t as tr` turns every later tr('key') call into a crash.
describe('i18n function is never shadowed by a top-level binding', () => {
  const dir = path.resolve(__dirname, '../src');
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.jsx?$/.test(e.name) && files.push(path.join(d, e.name))));
  walk(dir);
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const m = src.match(/import \{[^}]*\bt(?: as (\w+))?\b[^}]*\} from '[^']*i18n(?:\.js)?'/);
    if (!m) continue;
    const name = m[1] || 't';
    it(path.relative(dir, f), () => {
      expect(src).not.toMatch(new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*=`));
    });
  }
});
