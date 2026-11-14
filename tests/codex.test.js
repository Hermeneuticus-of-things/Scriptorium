// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { codexMatches, codexContextSection, codexEntity, CODEX_TYPES } from '../src/lib/codex.js';

const entities = [
  codexEntity({ id: 'e1', name: 'Ștefan cel Mare', type: 'Personaj', description: 'Voievodul Moldovei.', aliases: ['Ștefan', 'Voievodul'] }),
  codexEntity({ id: 'e2', name: 'Suceava', type: 'Locație', description: 'Capitala Moldovei.', aliases: [] }),
  codexEntity({ id: 'e3', name: 'Bulava', type: 'Obiect', description: 'Tochia domnească.', aliases: ['toiata'] }),
];

describe('codexMatches — entități menționate în text', () => {
  it('găsește după nume, pe cuvinte întregi, fold pe diacritice', () => {
    const m = codexMatches('Ștefan cel Mare a intrat în Suceava.', entities);
    expect(m.map((x) => x.id)).toEqual(['e1', 'e2']);
  });

  it('găsește după alias', () => {
    const m = codexMatches('Voievodul a adunat oștenii.', entities);
    expect(m.map((x) => x.id)).toEqual(['e1']);
  });

  it('fold pe diacritice: stefan îl găsește pe Ștefan', () => {
    const m = codexMatches('stefan a venit.', entities);
    expect(m.map((x) => x.id)).toEqual(['e1']);
  });

  it('nu prinde substringuri: Ion nu îl găsește pe Ionel', () => {
    const e = [codexEntity({ id: 'i', name: 'Ion', type: 'Personaj', description: 'x' })];
    expect(codexMatches('Ionel a venit.', e)).toHaveLength(0);
    expect(codexMatches('Ion a venit.', e)).toHaveLength(1);
  });

  it('text fără mențiuni: nimic', () => {
    expect(codexMatches('Nimic relevant aici.', entities)).toHaveLength(0);
    expect(codexMatches('', entities)).toHaveLength(0);
  });

  it('duplicatele nu se repetă', () => {
    const m = codexMatches('Ștefan cel Mare și Ștefan au venit.', entities);
    expect(m.filter((x) => x.id === 'e1')).toHaveLength(1);
  });
});

describe('codexContextSection — secțiunea pentru contextul AI', () => {
  it('include numele, tipul și descrierea', () => {
    const r = codexContextSection([entities[0]], 4000);
    expect(r.section).toContain('Ștefan cel Mare (Personaj)');
    expect(r.section).toContain('Voievodul Moldovei');
    expect(r.entities.map((x) => x.id)).toEqual(['e1']);
  });

  it('respectă bugetul rămas: buget 0 → secțiune goală', () => {
    expect(codexContextSection(entities, 0).section).toBe('');
  });

  it('trunchiază la buget: nu depășește limita', () => {
    const big = Array.from({ length: 40 }, (_, i) => codexEntity({ id: 'x' + i, name: 'Entitate ' + i, type: 'Termen', description: 'Descriere lungă '.repeat(10) }));
    const r = codexContextSection(big, 1200);
    expect(r.section.length).toBeLessThanOrEqual(1200);
    expect(r.entities.length).toBeGreaterThan(0);
  });
});

describe('codexEntity — normalizare', () => {
  it('tip necunoscut → Altfel; aliasuri goale filtrate', () => {
    const e = codexEntity({ id: 'x', name: 'N', type: 'Zombie', description: 42, aliases: ['a', '', null] });
    expect(e.type).toBe('Altfel');
    expect(e.description).toBe('42');
    expect(e.aliases).toEqual(['a']);
  });
  it('CODEX_TYPES include toate tipurile', () => {
    expect(CODEX_TYPES).toEqual(['Personaj', 'Locație', 'Termen', 'Obiect', 'Altfel']);
  });
});

import { buildEditorialContext } from '../src/lib/editorialContext.js';

describe('injectarea Codex în contextul AI (buildEditorialContext)', () => {
  const pj = {
    title: 'Cartea',
    bookType: '',
    tree: [
      { id: 'ms', root: 'draft', type: 'folder', title: 'Manuscris', children: [
        { id: 'doc', type: 'text', title: 'Capitol 1', children: [] },
      ] },
      { id: 'res', root: 'research', type: 'folder', title: 'Cercetare', children: [] },
      { id: 'trash', root: 'trash', type: 'folder', title: 'Coș', children: [] },
    ],
    codex: entities,
  };
  const docs = { doc: '<p>Ștefan cel Mare a intrat în Suceava cu bulava în mână.</p>', 'res-x': '' };

  it('entitățile menționate apar în context ca secțiune Codex, înainte de cercetare', () => {
    const r = buildEditorialContext(pj, docs, { documentId: 'doc', text: 'Ștefan cel Mare a intrat în Suceava.' });
    expect(r.text).toContain('## Codex');
    expect(r.text).toContain('Ștefan cel Mare (Personaj)');
    expect(r.text).toContain('Suceava (Locație)');
    expect(r.text.indexOf('## Codex')).toBeGreaterThan(-1);
    expect(r.codex.map((x) => x.id).sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('aliasurile contorizează: „bulava" pentru entitatea Obiect', () => {
    const r = buildEditorialContext(pj, docs, { documentId: 'doc' });
    expect(r.codex.some((x) => x.id === 'e3')).toBe(true);
  });

  it('proiect fără Codex: context fără secțiunea Codex, fără erori', () => {
    const r = buildEditorialContext({ ...pj, codex: [] }, docs, { documentId: 'doc' });
    expect(r.text).not.toContain('## Codex');
    expect(r.codex).toEqual([]);
  });
});
