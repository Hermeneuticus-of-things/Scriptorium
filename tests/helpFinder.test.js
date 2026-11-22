import { describe, it, expect } from 'vitest';
import fs from 'fs';
// Help Finder omnibox (PS-HELP-001 §3–§5): cablaj + integrarea cu registrul real de comenzi.
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('HelpFinderDialog — cablaj în aplicație', () => {
  it('comanda helpFinder există, cu tastă implicită, și deschide omnibox-ul', () => {
    const app = src('src/App.jsx');
    expect(app).toContain("'helpFinder'");
    expect(app).toContain('<HelpFinderDialog');
    expect(app).toContain("setHelpFinder(true)");
    expect(src('src/lib/commands.js')).toContain("helpFinder: 'Ctrl+Shift+H'");
  });
  it('Command Finder primește comenzile reale (registry, fără cele ascunse)', () => {
    expect(src('src/App.jsx')).toContain("Object.values(commands).filter((c) => !c.hidden)");
  });
  it('execuția respectă disabled — comenzile blocate nu pornesc din căutare', () => {
    expect(src('src/App.jsx')).toContain("if (!c.disabled) c.run()");
  });
  it('etichetele RO/EN ale omnibox-ului există', () => {
    const i = src('src/lib/i18n-ui.js');
    for (const k of ['helpfinder.title', 'helpfinder.placeholder', 'helpfinder.none', 'helpfinder.weak', 'helpfinder.howto', 'helpfinder.commands']) {
      expect(i.match(new RegExp(`"${k}"`, 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
  });
});
