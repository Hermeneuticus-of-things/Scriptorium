// AI workspace e2e (AIW-G6 + AIP-G4): dedicated window, dock/undock in the side panel,
// context levels from the binder menu, book type visible, placement persistence.
// Contractele reale verificate în cod (ciclul 4 de reparare a e2e-urilor nerulate):
// - suprafața AI cere furnizor configurat (aiEnabled && hasApiKey) → fixture Ollama (fără cheie);
// - comanda I-REP deschide fereastra pe tab-ul I-REP/I-EDIT → tab „Asistent" arată contextul cărții;
// - meniul contextual Binder („Asistent AI — lucrează pe:") deschide PANOUL andocat (panel:true).
const createHarness = require('./full-app-harness.cjs');

(async () => {
  const H = await createHarness('ai-workspace');
  const enableAi = async () => H.settingsFixture({ aiEnabled: true, aiProvider: 'ollama' });
  const openWindow = async () => {
    await H.command('irep');
    await H.p.waitForSelector('.ai-workspace, .side-ai', { timeout: 10000 });
    // aiPanelMode persistă în starea UI salvată: dacă asistentul a apărut andocat, îl desandochiem.
    if (await sideUp().count()) {
      await sideUp().getByRole('button', { name: 'Deschide ca fereastră' }).click();
      await H.p.waitForSelector('.ai-workspace', { timeout: 8000 });
    }
    // I-REP deschide pe tab-ul Editorial: trecem pe „Asistent" pentru contextul cărții.
    await H.p.getByRole('tab', { name: 'Asistent', exact: true }).click().catch(() => {});
  };
  const windowUp = () => H.p.locator('.ai-workspace');
  const sideUp = () => H.p.locator('.side .side-ai');
  const openContextFor = async (id) => {
    await H.row(id).click({ button: 'right' });
    // Meniul vizibil e .ctx-menu (position:fixed); wrapper-ul .ctx-menu-root are înălțime 0.
    await H.p.waitForSelector('.ctx-menu', { timeout: 8000 });
    await H.p.getByText('Asistent AI — lucrează pe:', { exact: true }).click();
    await H.p.waitForSelector('.ctx-menu', { timeout: 8000 });
  };

  H.test('ai-window-opens', {
    surface: 'I-REP command → floating window → Asistent tab',
    control: 'keyless provider configured (ollama)',
    initial: 'Fixture project, AI enabled, keyless provider',
    expected: 'The dedicated window opens over the text and the Asistent tab shows book+document context (separate from text)',
    act: async () => { await enableAi(); await openWindow(); },
    verify: async () => {
      await H.wait(() => windowUp().isVisible());
      const text = await windowUp().textContent();
      H.assert(text.includes('Carte:'), 'Book context missing in the AI window');
      H.assert(text.includes('Document:'), 'Document context missing in the AI window');
    },
  });

  H.test('ai-dock-undock', {
    surface: 'AI window header → side panel',
    control: 'dock / undock buttons',
    initial: 'Floating AI window open',
    setup: async () => { await enableAi(); await openWindow(); },
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
    surface: 'Binder context menu → AI levels → docked panel',
    control: 'chapter scope on a folder',
    initial: 'AI closed; doc-a inside folder-a',
    setup: async () => { await enableAi(); },
    expected: 'The context menu opens the docked assistant scoped to the chapter: container note visible, no scope selector, replace/insert actions hidden',
    act: async () => {
      await openContextFor('doc-a');
      await H.p.getByText('Capitolul: ', { exact: false }).first().click();
      await H.p.waitForSelector('.side .side-ai', { timeout: 10000 });
    },
    verify: async () => {
      const s = sideUp();
      const text = await s.textContent();
      H.assert(text.includes('Capitolul:'), 'Chapter scope label missing');
      H.assert(text.includes('sub-documentele'), 'Container note missing');
      const selects = s.locator('.ai-taskbar select');
      H.assert((await selects.count()) === 1, 'Scope selector should be hidden on container scope');
      H.assert((await s.locator('.ai-taskbar select option[value="proofread"]').count()) === 0, 'Replace actions must be hidden on container scope');
    },
  });

  H.test('ai-book-type-visible', {
    surface: 'Asistent tab context header',
    control: 'project.bookType',
    initial: 'Book type set to a historical novel through the project fixture',
    expected: 'The assistant context shows the book type tag with its Romanian label',
    act: async () => {
      await H.fixture((pj) => { pj.bookType = 'novel-historical'; });
      await enableAi();
      await openWindow();
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
    setup: async () => { await enableAi(); await openWindow(); await windowUp().getByRole('button', { name: 'Fixează în panoul lateral' }).click(); await H.wait(() => sideUp().isVisible(), 8000); },
    expected: 'After a reload the assistant opens docked again (same entry point, state remembered)',
    act: async () => {
      await H.p.reload();
      await H.p.waitForSelector('text=Proiect nou', { timeout: 15000 });
      await H.answer(H.dir);
      await H.p.getByRole('button', { name: /^Deschide un proiect/ }).first().click();
      await H.p.waitForSelector('.binder', { timeout: 10000 });
      await H.command('irep');
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
