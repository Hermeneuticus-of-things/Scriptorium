// AI assistant workflow in the demo (simulated AI): live progress, diff + Accept as one undo step at the captured range, Esc cancel + retry, insert, synopsis, Ctrl+Enter ask, history.
const { open, ed, check, done, caretEnd } = require('./_helpers.cjs');
const S=process.argv[2] || require('os').tmpdir();
(async () => {
  const { browser:b, page:p, errors } = await open();
  // Research toggled alone: does the panel appear?
  await p.evaluate(()=>0);
  await p.getByRole('button', {name:'Asistent AI'}).first().click(); await p.waitForTimeout(300);
  const panel = p.locator('.ai-panel').first();
  check('provider shown', /Model: Demo/.test(await panel.innerText()));
  // select first word and proofread
  await p.waitForTimeout(500); await caretEnd(p); await p.keyboard.press('Enter');
  await p.keyboard.type('Era dimineata si frig .', {delay:5}); await p.waitForTimeout(700);
  await p.evaluate(() => { const v = document.querySelector('.pane .ProseMirror').editor; const d = v.state.doc; const last = d.content.size; const start = last - 1 - d.lastChild.content.size; v.commands.setTextSelection({ from: start, to: last - 1 }); });
  console.log('SEL', await p.evaluate(() => { const v = document.querySelector('.pane .ProseMirror').editor; const {from,to}=v.state.selection; return v.state.doc.textBetween(from,to); }));
  await panel.locator('button', {hasText:'Corectură'}).click();
  await p.waitForTimeout(250);
  const liveTxt = await panel.innerText();
  check('live progress while waiting', /se gândește|scrie/.test(liveTxt), liveTxt.slice(-120));
  await p.waitForSelector('.ai-result', {timeout:8000});
  console.log(await p.locator('.ai-result').innerText());
  await p.screenshot({path:S+'/proof.png'});
  // move caret elsewhere, then accept: must still replace captured range
  await ed(p).click(); await p.keyboard.press('Control+End');
  const before = await ed(p).innerText();
  const acc = p.locator('.ai-result button', {hasText:'Acceptă'});
  check('accept button present', await acc.count()===1);
  if (await acc.count()) { await acc.click(); await p.waitForTimeout(200); }
  const after = await ed(p).innerText(); 
  check('Accept replaces the captured selection even after the caret moved (needs App getHandle)', /Era dimineață și frig\.$/.test(after.trim()) && !after.includes('dimineata si'), JSON.stringify(after.slice(-60)));
  await ed(p).click(); await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  check('one undo restores', (await ed(p).innerText())===before, JSON.stringify(await ed(p).innerText()));
  // continue + cancel with Esc
  await panel.locator('button', {hasText:'Continuă'}).click(); await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const t = await panel.innerText();
  check('Esc cancels with retry', /anulată/.test(t) && /Reîncearcă/.test(t), t.slice(-200));
  await panel.locator('button', {hasText:'Reîncearcă'}).click();
  await p.waitForSelector('.ai-result button:has-text("Inserează")', {timeout:8000});
  await p.locator('.ai-result button', {hasText:'Inserează'}).click(); await p.waitForTimeout(200);
  check('continue inserted', /Vântul a adus/.test(await ed(p).innerText()));
  // synopsis
  await panel.locator('button', {hasText:'Sinopsis'}).click();
  await p.waitForSelector('.ai-result button:has-text("sinopsis")', {timeout:8000});
  await p.locator('.ai-result button', {hasText:'sinopsis'}).click(); await p.waitForTimeout(300);
  // ask with Ctrl+Enter
  await panel.locator('textarea').fill('Câte cuvinte?'); await panel.locator('textarea').press('Control+Enter');
  await p.waitForSelector('.ai-result', {timeout:8000});
  check('ctrl+enter ask', /Răspuns demo/.test(await p.locator('.ai-result').innerText()));
  check('history', /Rezultate recente \((\d)\)/.test(await panel.innerText()), (await panel.innerText()).match(/Rezultate recente \(\d+\)/)?.[0]);
  await p.screenshot({path:S+'/ai.png'});
  console.log(errors); done(); await b.close();
})();
