// Seeded random-action fuzz of the editor. Usage: node editor-fuzz.cjs [firstSeed] [seeds] [steps]
// After each step: no page errors, undo+redo round-trips the HTML, and (on switch) the saved
// document equals what the editor showed.
const { open, ed, check, done } = require('./_helpers.cjs');
const [S0 = 1, N = 6, STEPS = 60] = process.argv.slice(2).map(Number);
const rng = (s) => () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const WORDS = ['ștergem', 'țară', 'mână', 'înăuntru', 'brânză', '„citat”', 'și', 'apoi', 'ŞŢ', 'dacă', '"drept"', "it's"];
const PASTES = [
  ['text/html', '<meta charset="utf-8"><b style="font-weight:normal" id="docs-internal-guid-1"><p dir="ltr"><span style="font-weight:700">Google</span><span> țară</span></p><p dir="ltr"><span style="font-style:italic">al doilea</span></p></b>'],
  ['text/html', '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><!--StartFragment--><p class=MsoNormal>Word <b>îngroșat</b><o:p></o:p></p><p class=MsoListParagraph style="mso-list:l0 level1 lfo1"><![if !supportLists]>1.<![endif]>listă</p><!--EndFragment--></body></html>'],
  ['text/html', '<p style="margin-bottom: 0in; line-height: 100%">LibreOffice <i>înclinat</i></p><table><tr><td>a</td><td>b</td></tr></table>'],
  ['text/plain', 'rând1\r\nrând2\tcu tab\r\n\r\nrând3'],
  ['text/plain', 'simplu fără newline'],
];
const editorJs = (fn) => `(() => { const e = document.querySelector('.pane .ProseMirror').editor; return (${fn})(e); })()`;

async function run(seed) {
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const { browser, page, errors } = await open();
  const binder = (t) => page.locator('.binder').getByText(t, { exact: true });
  const log = [];
  let fail = null;
  const html = () => page.evaluate(editorJs((e) => e.getHTML()));
  await binder('Începutul').click();
  await ed(page).click({ delay: 60 });
  await page.waitForTimeout(80);
  for (let i = 0; i < STEPS && !fail; i++) {
    const a = pick(['type', 'type', 'type', 'enter', 'bs', 'undoredo', 'select', 'bold', 'italic', 'list', 'paste', 'switch', 'footnote', 'home']);
    log.push(a);
    try {
      if (a === 'type') await page.keyboard.type(' ' + pick(WORDS), { delay: 5 });
      else if (a === 'enter') await page.keyboard.press('Enter');
      else if (a === 'bs') await page.keyboard.press('Backspace');
      else if (a === 'home') await page.keyboard.press(pick(['Home', 'End', 'Control+End', 'ArrowLeft', 'ArrowUp']));
      else if (a === 'select') await page.keyboard.press(pick(['Shift+ArrowLeft', 'Shift+Home', 'Control+Shift+ArrowLeft']));
      else if (a === 'bold') await page.keyboard.press('Control+b');
      else if (a === 'italic') await page.keyboard.press('Control+i');
      else if (a === 'list') await page.evaluate(editorJs((e) => e.chain().focus().toggleBulletList().run()));
      else if (a === 'footnote') await page.evaluate(editorJs((e) => e.chain().focus().insertFootnote('notă ș').run()));
      else if (a === 'paste') {
        const [type, data] = pick(PASTES);
        await page.evaluate(([type, data]) => {
          const dt = new DataTransfer();
          dt.setData(type, data);
          if (type === 'text/html') dt.setData('text/plain', 'x');
          document.querySelector('.pane .ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        }, [type, data]);
      } else if (a === 'undoredo') {
        await page.waitForTimeout(600); // close the history group
        const before = await html();
        await page.keyboard.press('Control+z');
        await page.keyboard.press('Control+Shift+z');
        const after = await html();
        if (before !== after) fail = `undo/redo changed HTML\n${before}\n${after}`;
      } else if (a === 'switch') {
        const before = await html();
        await binder('Drumul').click();
        await page.waitForTimeout(100);
        await binder('Începutul').click();
        await page.waitForTimeout(100);
        const after = await html();
        if (before !== after) fail = `switch lost content\n${before}\n${after}`;
        await ed(page).click({ delay: 60 });
        await page.waitForTimeout(80);
      }
    } catch (e) { fail = String(e); }
    if (errors.length) fail = errors.join(' | ');
  }
  await browser.close();
  check(`seed ${seed}`, !fail, fail ? `${fail}\nsteps: ${log.join(',')}` : '');
}
(async () => { for (let s = S0; s < S0 + N; s++) await run(s); done(); })();
