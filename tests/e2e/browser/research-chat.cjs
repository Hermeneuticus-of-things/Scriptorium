// Research conversation in browser demo mode: ask, streamed answer with citations, follow-up
// (history), citation click opens the document, save as note, sources chips, conversation
// survives a reload, new conversation.
// Run: node tests/e2e/browser/research-chat.cjs (against `npx vite preview --outDir dist-web --port 4183`).
const { open, check, done, menuCmd } = require('./_helpers.cjs');

(async () => {
  const { browser, page: p, errors } = await open({ beforeOpen: (pg) => pg.evaluate(() => localStorage.clear()) });
  const panel = p.locator('.research-panel');
  const openPanel = async () => {
    if (await panel.count()) return;
    await menuCmd(p, 'Cercetare în proiect (RAG)');
    await panel.waitFor({ timeout: 3000 });
  };
  await openPanel();
  check('panel is a chat with AI on', (await p.locator('.research-chat textarea').count()) === 1);
  // default sources: Research + Notes chips
  const chips = await p.locator('.research-scope .research-chip').allInnerTexts();
  check('default source chips are Cercetare + Note', chips.some((c) => c.startsWith('Cercetare')) && chips.some((c) => c.startsWith('Note')), JSON.stringify(chips));

  // 1. ask
  await p.locator('.research-chat textarea').fill('Ce ochi are Andrei?');
  await p.locator('.research-ask-btn').click();
  await p.waitForSelector('.research-live', { timeout: 3000 });
  await p.waitForFunction(() => (document.querySelector('.research-live .research-answer')?.innerText || '').length > 20, null, { timeout: 5000 });
  const streamed = await p.locator('.research-live .research-answer').innerText();
  await p.waitForSelector('.research-live', { state: 'detached', timeout: 10000 });
  check('answer streams while written (no follow-up heading shown)', !/Întrebări de continuare/.test(streamed), streamed.slice(0, 80));
  check('one turn with an answer', (await p.locator('.research-turn').count()) === 1);
  const cites = p.locator('.research-turn .ai-cite');
  check('answer has clickable citations', (await cites.count()) >= 1);
  const followups = p.locator('.research-followup');
  check('2-3 suggested follow-ups', (await followups.count()) >= 2 && (await followups.count()) <= 3);

  // 2. citation click opens the passage's document
  await cites.first().click();
  await p.waitForTimeout(300);
  const editorText = await p.locator('.pane .ProseMirror').first().innerText();
  check('citation opens the cited document', /ochi verzi/.test(editorText), editorText.slice(0, 60));

  // 3. follow-up (clicked suggestion) keeps the conversation
  await followups.first().click();
  await p.waitForSelector('.research-live', { state: 'detached', timeout: 10000 });
  await p.waitForTimeout(100);
  check('follow-up adds a second turn', (await p.locator('.research-turn').count()) === 2);
  const second = await p.locator('.research-turn').nth(1).locator('.research-answer').innerText();
  check('follow-up answer knows the previous question', /Continuând discuția/.test(second), second.slice(0, 80));

  // 4. save as note -> Research / Note
  await p.locator('.research-turn').first().getByRole('button', { name: 'Salvează ca notă' }).click();
  await p.waitForTimeout(400);
  check('saved-as-note toast', /Salvat ca notă/.test(await panel.innerText()));
  const binder = await p.locator('.binder').first().innerText();
  check('note document appears in the binder', /Ce ochi are Andrei\?/.test(binder) && /\bNote\b/.test(binder), binder.slice(-200));

  // 5. copy and insert buttons are there
  check('copy and insert buttons', (await p.locator('.research-turn').first().getByRole('button', { name: 'Copiază' }).count()) === 1 && (await p.locator('.research-turn').first().getByRole('button', { name: 'Inserează în document' }).count()) === 1);

  // insert at the cursor: citations become footnotes
  const before = await p.locator('.pane .ProseMirror .footnote').count();
  await p.locator('.research-turn').first().getByRole('button', { name: 'Inserează în document' }).click();
  await p.waitForTimeout(300);
  check('insert adds the answer with footnote citations', (await p.locator('.pane .ProseMirror .footnote').count()) > before);

  // 6. sources picker: tick Manuscript, chip appears; paste text as a source
  await p.locator('.research-sources-toggle').click();
  await p.locator('.research-kind', { hasText: 'Manuscris' }).locator('input').check();
  check('Manuscris chip after ticking', (await p.locator('.research-scope .research-chip', { hasText: 'Manuscris' }).count()) === 1);
  await p.getByRole('button', { name: 'Lipește text ca sursă' }).click();
  await p.locator('.research-paste input').fill('Sursă lipită');
  await p.locator('.research-paste textarea').fill('Cabana din Apuseni are acoperiș roșu.');
  await p.getByRole('button', { name: 'Adaugă sursa' }).click();
  await p.waitForTimeout(400);
  check('pasted source added to the binder', /Sursă lipită/.test(await p.locator('.binder').first().innerText()));

  // 7. conversation saved: close + reopen the panel shows it again
  await menuCmd(p, 'Cercetare în proiect (RAG)');
  await openPanel();
  await p.waitForTimeout(300);
  check('conversation restored after reopening', (await p.locator('.research-turn').count()) === 2);
  await p.locator('.research-new').click();
  check('new conversation is empty', (await p.locator('.research-turn').count()) === 0);
  check('saved conversation listed', (await p.locator('.research-chatbar select option').count()) >= 2);

  check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  done();
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
