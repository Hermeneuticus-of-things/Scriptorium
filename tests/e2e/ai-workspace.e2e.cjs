// AI workspace e2e (AIW-G6 + AIP-G4): dedicated window, dock/undock in the side panel,
// context levels from the binder menu, book type visible, placement persistence.
const createHarness = require('./full-app-harness.cjs');

(async () => {
  const H = await createHarness('ai-workspace');
  const enableAi = async () => H.settingsFixture({ aiEnabled: true });
  const openAi = async () => { await H.command('ai'); await H.p.waitForSelector('.ai-workspace, .side-ai', { timeout: 10000 }); };
  const windowUp = () => H.p.locator('.ai-workspace');
  const sideUp = () => H.p.locator('.side .side-ai');
  const openContextFor = async (id) => {
    await H.row(id).click({ button: 'right' });
    await H.p.waitForSelector('.ctx-menu-root', { timeout: 8000 });
    await H.p.getByText('Asistent AI — lucrează pe:', { exact: true }).click();
    await H.p.waitForSelector('.ctx-menu-root', { timeout: 8000 });
  };

  H.test('ai-window-opens', {
    surface: 'AI menu → floating window',
    control: 'ai command without configured provider',
    initial: 'Fixture project, AI enabled, no API key',
    expected: 'The dedicated window opens over the text, shows book+document context and the configuration notice (separate from text)',
    act: async () => { await enableAi(); await openAi(); },
    verify: async () => {
      await H.wait(() => windowUp().isVisible());
      const text = await windowUp().textContent();
      H.assert(text.includes('Carte:'), 'Book context missing in the AI window');
      H.assert(text.includes('Document:'), 'Document context missing in the AI window');
      await H.wait(() => windowUp().locator('.ai-setup').isVisible(), 5000);
    },
  });

  H.test('ai-dock-undock', {
    surface: 'AI window header → side panel',
    control: 'dock / undock buttons',
    initial: 'Floating AI window open',
    expected: 'Dock moves the assistant into the right column; undock returns the floating window; never both',
    act: async () => {
      await windowUp().getByRole('button', { name: 'Fixează în panoul lateral' }).click();
      await H.wait(() => sideUp().isVisible(), 8000);
      await sideUp().getByRole('button', { name: 'Deschide ca fereastră' }).click();
      await H.wait(() => windowUp().isVisible(), 8000);
    },
    verify: async () => {
      H.assert(await windowUp().isVisible(), 'Window did not return after undock');
      H.assert(!(await sideUp().count()), 'Side panel still mounted while the window is open');
    },
  });

  H.test('ai-levels-from-binder-context', {
    surface: 'Binder context menu → AI levels',
    control: 'chapter scope on a folder',
    initial: 'AI window closed; doc-a inside folder-a',
    expected: 'The context menu opens the assistant scoped to the chapter: container note visible, no scope selector, replace/insert actions hidden',
    act: async () => {
      await H.command('ai'); await H.wait(() => windowUp().isVisible(), 8000);
      await windowUp().getByRole('button', { name: 'Închide' }).click();
      await openContextFor('doc-a');
      await H.p.getByText('Capitolul: ', { exact: false }).first().click();
      await H.p.waitForSelector('.ai-workspace', { timeout: 10000 });
    },
    verify: async () => {
      const w = windowUp();
      const text = await w.textContent();
      H.assert(text.includes('Capitolul:'), 'Chapter scope label missing');
      H.assert(text.includes('sub-documentele'), 'Container note missing');
      const selects = w.locator('.ai-taskbar select');
      H.assert((await selects.count()) === 1, 'Scope selector should be hidden on container scope');
      H.assert((await w.locator('.ai-taskbar select option[value="proofread"]').count()) === 0, 'Replace actions must be hidden on container scope');
    },
  });

  H.test('ai-book-type-visible', {
    surface: 'AI window header',
    control: 'project.bookType',
    initial: 'Book type set to a historical novel through the project fixture',
    expected: 'The AI window shows the book type tag with its Romanian label',
    act: async () => {
      await H.fixture((pj) => { pj.bookType = 'novel-historical'; });
      await enableAi();
      await openAi();
    },
    verify: async () => {
      const text = await H.p.textContent('.ai-book-context');
      H.assert(text.includes('Tip carte: Roman istoric'), 'Book type tag missing in the AI context header');
    },
  });

  H.test('ai-mode-persisted', {
    surface: 'project UI state',
    control: 'docked placement reload',
    initial: 'Assistant docked in the side panel',
    expected: 'After a reload the assistant opens docked again (same entry point, state remembered)',
    act: async () => {
      await windowUp().getByRole('button', { name: 'Fixează în panoul lateral' }).click();
      await H.wait(() => sideUp().isVisible(), 8000);
      await H.p.reload();
      await H.p.waitForSelector('text=Proiect nou', { timeout: 15000 });
      await H.answer(H.dir);
      await H.p.getByRole('button', { name: /^Deschide un proiect/ }).first().click();
      await H.p.waitForSelector('.binder', { timeout: 10000 });
      await H.command('ai');
    },
    verify: async () => {
      await H.wait(() => sideUp().isVisible(), 10000);
      H.assert(!(await windowUp().count()), 'Window mounted although the docked mode was saved');
    },
  });

  const r = await H.run();
  console.log(JSON.stringify(r));
  process.exit(r.failed || r.executed !== r.total ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
