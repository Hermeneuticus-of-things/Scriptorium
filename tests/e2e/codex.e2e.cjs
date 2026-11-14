// Codex e2e (directivă 14 nov, direcția B): panoul „Registrul cărții" — adăugare entitate,
// persistență în project.json, editare și ștergere. Fără rețea: totul e date locale.
const createHarness = require('./full-app-harness.cjs');

(async () => {
  const H = await createHarness('codex');
  const openPanel = async () => {
    await H.command('codex');
    await H.p.waitForSelector('.codex-panel', { timeout: 10000 });
  };

  H.test('codex-panel-opens', {
    surface: 'Project → Codex-ul cărții',
    control: 'command codex',
    initial: 'Fixture project, Codex gol',
    expected: 'The registry panel opens with its search, add button and empty notice',
    act: async () => { await openPanel(); },
    verify: async () => {
      const text = await H.p.locator('.codex-panel').textContent();
      H.assert(text.includes('Registrul cărții'), 'Panel title missing');
      H.assert(text.includes('Codex-ul este gol') || text.includes('este gol'), 'Empty notice missing');
    },
  });

  H.test('codex-add-entity-persists', {
    surface: 'Codex panel → add form',
    control: 'name/type/description/aliases',
    initial: 'Codex empty',
    expected: 'Adding an entity persists it in project.json (name, type, description, aliases) and shows it grouped',
    act: async () => {
      await openPanel();
      await H.p.getByRole('button', { name: 'Adaugă entitate' }).click();
      await H.p.waitForSelector('.codex-form', { timeout: 5000 });
      await H.p.locator('.codex-form input').first().fill('Ștefan cel Mare');
      await H.p.locator('.codex-form select').selectOption('Personaj');
      await H.p.locator('.codex-form textarea').fill('Voievodul Moldovei.');
      await H.p.locator('.codex-form input').nth(1).fill('Ștefan, Voievodul');
      await H.p.locator('.codex-form button[type="submit"]').click();
      await H.save();
    },
    verify: async () => {
      const pj = H.project();
      H.assert(Array.isArray(pj.codex) && pj.codex.length === 1, 'Entity not persisted');
      H.assert(pj.codex[0].name === 'Ștefan cel Mare', 'Name wrong');
      H.assert(pj.codex[0].type === 'Personaj', 'Type wrong');
      H.assert(pj.codex[0].description === 'Voievodul Moldovei.', 'Description wrong');
      H.assert(pj.codex[0].aliases.includes('Voievodul'), 'Aliases wrong');
      H.assert((await H.p.locator('.codex-item').count()) === 1, 'Entity row not shown');
    },
  });

  H.test('codex-edit-and-delete', {
    surface: 'Codex panel → edit / delete',
    control: 'edit form, delete button',
    initial: 'One entity persisted (from the previous case state)',
    setup: async () => {
      await openPanel();
      await H.p.getByRole('button', { name: 'Adaugă entitate' }).click();
      await H.p.locator('.codex-form input').first().fill('Suceava');
      await H.p.locator('.codex-form select').selectOption('Locație');
      await H.p.locator('.codex-form textarea').fill('Capitala Moldovei.');
      await H.p.locator('.codex-form button[type="submit"]').click();
      await H.save();
    },
    expected: 'Editing changes the description; delete removes the entity from project.json',
    act: async () => {
      await H.p.locator('.codex-item button', { hasText: 'Editează' }).first().click();
      await H.p.locator('.codex-form textarea').fill('Capitala istorică a Moldovei.');
      await H.p.locator('.codex-form button[type="submit"]').click();
      await H.save();
      const pj = H.project();
      H.assert(pj.codex[0].description === 'Capitala istorică a Moldovei.', 'Edit not persisted');
      await H.p.locator('.codex-item button', { hasText: 'Șterge' }).first().click();
      await H.save();
    },
    verify: async () => {
      H.assert(H.project().codex.length === 0, 'Entity not deleted');
    },
  });

  const r = await H.run();
  console.log(JSON.stringify(r));
  process.exit(r.failed || r.executed !== r.total ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
