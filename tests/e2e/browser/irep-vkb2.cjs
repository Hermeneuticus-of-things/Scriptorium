// VKB2 I-REP / I-EDIT in the demo: near repetitions (S70) listed as signals with jump, typed
// paragraphs become author text (COADA_AUTOR), and „✎ Editează” on a proposal saves with the
// 412 guard. Run: node tests/e2e/browser/irep-vkb2.cjs against `npx vite preview --port 4183`.
const { open, ed, check, done, menuPick } = require('./_helpers.cjs');
(async () => {
  const { browser, page: p, errors } = await open();
  await ed(p).click();
  await p.keyboard.press('Control+A');
  await p.keyboard.type('Desigur, omul ridică scutul. Scutul îl apără.');
  await p.keyboard.press('Enter');
  await p.keyboard.type('Seara coboară peste sat.');
  await p.waitForTimeout(300);
  await menuPick(p, 'AI', 'I-REP');
  await p.waitForSelector('.editorial');
  const near = p.locator('.near-rep li');
  check('near repetition line', (await near.allInnerTexts()).includes('⚠ REP L1 «scutul» ×2'), JSON.stringify(await near.allInnerTexts()));
  check('S70 note shown', /S70: termenul nu se schimbă doar ca să nu se repete/.test(await p.locator('.near-rep').innerText()));
  await near.first().click();
  await p.waitForTimeout(200);
  check('click selects the occurrence', (await p.evaluate(() => String(window.getSelection()))) === 'scutul', await p.evaluate(() => String(window.getSelection())));
  check('signal is not a blocking issue', !/REP L1/.test(await p.locator('.editorial > ul.issues').innerText()));

  // Hand edits become author text once the writer pauses (8 s).
  await p.waitForTimeout(9000);
  const queue = p.locator('.author-queue');
  check('author text recorded', (await queue.count()) === 1 && /Text al autorului: 2 paragrafe/.test(await queue.innerText()), (await queue.count()) ? await queue.innerText() : 'none');
  check('issue on author text goes to COADA_AUTOR', /COADA_AUTOR: [1-9]\d* (de )?semnal(e)?/.test(await queue.innerText()) && /desigur/i.test(await queue.innerText()));

  // A proposal (demo model) and the author's own edit with the 412 guard.
  await p.getByRole('button', { name: /I-REP: repară/ }).click();
  await p.waitForSelector('.proposal', { timeout: 15000 });
  check('loop report has „Modificările tale în text”', /Modificările tale în text/.test(await p.locator('.rep-log').innerText()));
  await p.getByRole('button', { name: '✎ Editează' }).click();
  const ta = p.locator('.author-edit textarea');
  await ta.fill('x');
  await p.getByRole('button', { name: 'Salvează', exact: true }).click();
  check('412 under 20%', /412/.test(await p.locator('.author-edit').innerText()) && (await p.getByRole('button', { name: 'Salvează oricum' }).count()) === 1);
  await ta.fill('Desigur, omul ridică scutul. Scutul îl apără.\n\nSeara coboară încet peste sat.');
  await p.getByRole('button', { name: 'Salvează', exact: true }).click();
  await p.waitForTimeout(400);
  check('edited text applied', /coboară încet peste sat/.test(await ed(p).innerText()));
  check('save logged', /salvat textul tău/.test(await p.locator('.rep-log').innerText()));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  done();
})();
