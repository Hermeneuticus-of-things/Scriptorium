// Regenerates the README images in assets/readme/*.png from the browser demo.
//
// The script builds nothing itself. First serve the demo:
//   npx vite build --outDir dist-web && npx vite preview --outDir dist-web --port 4183
// then, in another terminal:
//   node scripts/readme-shots.cjs              # all images
//   node scripts/readme-shots.cjs irep ruler   # only some
//
// Each image: the app is captured at 1440×900 (device scale 2), then placed in a framed
// composite (kicker, serif headline, subtitle, macOS-style window) rendered from an HTML
// template and saved at 2400×1910 (hero: 2400×1200). If pngquant is installed, the PNGs are
// compressed with it. Env: SCRIBNER_URL (default http://localhost:4183/?demo; e.g. http://localhost:4199/?demo for a
// second preview server).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { menuPick, menuCmd, caretEnd } = require('../tests/e2e/browser/_helpers.cjs');

const URL = process.env.SCRIBNER_URL || 'http://localhost:4183/?demo';
const OUT = path.join(__dirname, '..', 'assets', 'readme');
const W = 1440;
const H = 900;

async function openApp(browser, query = '') {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(URL + query);
  await page.getByText('Deschide proiect .scribner').first().click();
  await page.waitForSelector('.pane .ProseMirror');
  await page.waitForTimeout(400);
  return page;
}
const ed = (p) => p.locator('.pane .ProseMirror').first();
const pick = async (p, title) => {
  await p.locator('.binder-row', { hasText: title }).first().click();
  await p.waitForTimeout(300);
};
const openMenu = async (p, menu) => {
  await p.locator('header.toolbar .menu > button').filter({ hasText: new RegExp(`^${menu}`) }).first().click();
  await p.waitForTimeout(150);
};
const hoverItem = async (p, label) => {
  await p.locator('.menu-pop [role="menuitem"]').filter({ hasText: label }).first().hover();
  await p.waitForTimeout(250);
};
// Replace the text of the open document (one paragraph per array item).
async function setText(p, paras, loc = ed(p)) {
  await loc.click();
  await p.keyboard.press('Control+A');
  for (let i = 0; i < paras.length; i++) {
    if (i) await p.keyboard.press('Enter');
    await p.keyboard.insertText(paras[i]);
  }
  await p.waitForTimeout(400);
}
const noCaret = (p) => p.evaluate(() => document.activeElement && document.activeElement.blur());

// --- the images: kicker, title, subtitle and how to reach the state in the demo ----------------
const SHOTS = {
  hero: {
    hero: true,
    async setup(p) {
      await pick(p, 'Partea întâi');
      await p.keyboard.press('Control+2');
      await p.waitForTimeout(500);
    },
  },
  translate: {
    kicker: 'Pentru traducători',
    title: 'Originalul și traducerea, alături',
    sub: 'Împarți editorul în două: textul primit de la editură într-o parte, traducerea ta în cealaltă.',
    async setup(p) {
      await pick(p, 'Drumul');
      await setText(p, [
        'On the road he met old Matei, who gave him a map drawn by hand. "Follow the river," the old man said, "and never cross it at night."',
        'Andrei folded the map twice and put it in his coat. The rain had stopped, but the path was still muddy.',
      ]);
      await pick(p, 'Începutul');
      await setText(p, [
        'Pe drum l-a întâlnit pe bătrânul Matei, care i-a dat o hartă desenată de mână. „Mergi pe lângă râu”, i-a spus bătrânul, „și nu-l trece niciodată noaptea.”',
        'Andrei a împăturit harta de două ori și a pus-o în haină. Ploaia se oprise, dar poteca era încă plină de noroi.',
      ]);
      await pick(p, 'Drumul');
      await menuPick(p, 'Vizualizare', 'Împarte editorul (Split)');
      await pick(p, 'Începutul');
      await noCaret(p);
    },
  },
  context: {
    kicker: 'Clic dreapta pe un cuvânt',
    title: 'Traduci și cauți fără să pleci din text',
    sub: 'DeepL, Google Translate, dicționare, cercetare pe web și asistentul AI, direct din meniul cuvântului.',
    async setup(p) {
      await pick(p, 'Căutarea');
      const box = await p.evaluate(() => {
        const el = document.querySelector('.pane .ProseMirror p');
        const i = el.firstChild.textContent.indexOf('rece');
        const r = document.createRange(); r.setStart(el.firstChild, i + 1); r.setEnd(el.firstChild, i + 2);
        const b = r.getBoundingClientRect(); return { x: b.x + 1, y: b.y + b.height / 2 };
      });
      await ed(p).click({ position: { x: 5, y: 5 } });
      await p.mouse.click(box.x, box.y, { button: 'right' });
      await p.waitForTimeout(250);
      await p.locator('[role="menuitem"]', { hasText: 'Tradu' }).first().hover();
      await p.waitForTimeout(300);
    },
  },
  corkboard: {
    kicker: 'Panoul de fișe',
    title: 'Fiecare scenă pe fișa ei',
    sub: 'Titlu, rezumat și stare. Muți fișa și textul se mută odată cu ea.',
    async setup(p) {
      await pick(p, 'Partea întâi');
      await p.keyboard.press('Control+2');
      await p.waitForTimeout(500);
    },
  },
  timeline: {
    kicker: 'Cronologie',
    title: 'Cine unde e, zi cu zi',
    sub: 'Scenele așezate pe zile, câte un fir pentru fiecare personaj, ca să prinzi contradicțiile la timp.',
    async setup(p) {
      await menuPick(p, 'Vizualizare', 'Vederi pe toată cartea', 'Cronologie');
      await p.waitForTimeout(600);
    },
  },
  irep: {
    kicker: 'Revizie fără AI',
    title: 'Greșelile mărunte, găsite singure',
    sub: 'Ghilimele, spații, punctuație, repetiții: revizia trece prin tot textul, îți arată problemele și le repară cu un clic.',
    async setup(p) {
      await pick(p, 'Căutarea');
      await menuPick(p, 'AI', 'I-REP');
      await p.waitForSelector('.editorial');
      await p.waitForTimeout(500);
      await noCaret(p);
    },
  },
  repetition: {
    kicker: 'Repetiția apropiată · textul tău',
    title: 'Vezi repetițiile. Textul tău rămâne al tău',
    sub: 'Același cuvânt în fraze vecine apare ca semnal, cu un clic până la el. Ce scrii de mână nu e schimbat de AI.',
    async setup(p) {
      await pick(p, 'Cabana');
      await setText(p, [
        'Desigur, Andrei ridică scutul de lemn și îl sprijini de perete. Scutul îl apărase toată noaptea.',
        'Seara coborî peste sat. Ilinca aprinse focul și se uită lung la hartă.',
      ]);
      await menuPick(p, 'AI', 'I-REP');
      await p.waitForSelector('.near-rep');
      await p.locator('.near-rep').scrollIntoViewIfNeeded();
      await p.waitForTimeout(400);
      await noCaret(p);
    },
  },
  ai: {
    kicker: 'Asistent AI, dacă vrei',
    title: 'Vezi exact ce schimbă',
    sub: 'Corectură, rezumate sau o a doua părere, cu înainte și după. Accepți doar ce îți place.',
    async setup(p) {
      await pick(p, 'Căutarea');
      await menuPick(p, 'AI', 'Asistent AI');
      await p.waitForTimeout(300);
      await p.evaluate(() => {
        const v = document.querySelector('.pane .ProseMirror').editor;
        const first = v.state.doc.firstChild;
        v.commands.setTextSelection({ from: 1, to: 1 + first.content.size });
      });
      await p.locator('.ai-panel button', { hasText: 'Corectură' }).first().click();
      await p.waitForSelector('.ai-result', { timeout: 10000 });
      await p.waitForTimeout(500);
    },
  },
  snapshots: {
    kicker: 'Snapshot-uri',
    title: 'O „poză” a textului, înainte de rescriere',
    sub: 'Compari versiunile una lângă alta și te întorci oricând la cea bună.',
    async setup(p) {
      await pick(p, 'Începutul');
      const tab = p.locator('.inspector .tabs button').nth(4);
      await tab.click();
      await p.locator('.snapshots > button').first().click();
      await p.waitForTimeout(300);
      await ed(p).click();
      await p.keyboard.press('Control+End');
      await p.keyboard.press('Enter');
      await p.keyboard.insertText('Pe prag s-a oprit o clipă și a ascultat ploaia. Apoi a plecat fără să se uite înapoi.');
      await p.waitForTimeout(800);
      await tab.click();
      await p.locator('.snapshots li').first().locator('button.link').nth(1).click();
      await p.waitForTimeout(400);
      await noCaret(p);
    },
  },
  compile: {
    kicker: 'Compile',
    title: 'La final, cartea întreagă',
    sub: 'Manuscris pentru editură, carte tipărită sau e-book: un singur fișier Word, PDF sau EPUB.',
    async setup(p) {
      await menuPick(p, 'Fișier', 'Compilează…');
      await p.waitForTimeout(600);
    },
  },
  compileContent: {
    kicker: 'Compile · ce intră în carte',
    title: 'Alegi formatul și bucățile',
    sub: 'Tot manuscrisul, un dosar sau selecția, filtre după etichetă și stare, copertă, pagină de titlu și cuprins.',
    async setup(p) {
      await menuPick(p, 'Fișier', 'Compilează…');
      await p.waitForSelector('.compile-dialog');
      await p.locator('.compile-dialog .cd-formats li button', { hasText: 'Carte tipărită' }).first().click();
      await p.waitForTimeout(400);
    },
  },
  compileSections: {
    kicker: 'Compile · tipuri de secțiune',
    title: 'Fiecare parte își are aspectul ei',
    sub: 'Părți, capitole și scene: titlu cu „Capitolul <$n>”, pagină nouă, aliniere, majuscule sau doar textul.',
    async setup(p) {
      await menuPick(p, 'Fișier', 'Compilează…');
      await p.waitForSelector('.compile-dialog');
      await p.locator('.compile-dialog .cd-formats li button', { hasText: 'Carte tipărită' }).first().click();
      await p.locator('.compile-dialog .cd-tabs button').nth(1).click();
      await p.waitForTimeout(400);
    },
  },
  compilePage: {
    kicker: 'Compile · pagina de tipar',
    title: 'Pagina de carte, gata de tipar',
    sub: 'Format, margini în oglindă, antet cu titlul capitolului (<$t>), număr de pagină (<$p>), fonturi și spațiere.',
    async setup(p) {
      await menuPick(p, 'Fișier', 'Compilează…');
      await p.waitForSelector('.compile-dialog');
      await p.locator('.compile-dialog .cd-formats li button', { hasText: 'Carte tipărită' }).first().click();
      await p.locator('.compile-dialog .cd-tabs button').nth(5).click();
      await p.waitForTimeout(400);
    },
  },
  customize: {
    kicker: 'Interfață pe gustul tău',
    title: 'Bara de instrumente o alegi tu',
    sub: 'Adaugi, scoți și muți butoanele. Ce scoți rămâne în meniuri.',
    async setup(p) {
      await menuPick(p, 'Vizualizare', 'Personalizează bara de instrumente…');
      await p.waitForSelector('.tb-customize');
      await p.waitForTimeout(300);
    },
  },
  aimenu: {
    kicker: 'Meniul AI',
    title: 'Tot ce ține de AI, într-un singur loc',
    sub: 'Asistentul, revizia, AI pe selecție sau pe toată cartea, NotebookLM și setările. Restul meniurilor rămân curate.',
    async setup(p) {
      await openMenu(p, 'AI');
      await hoverItem(p, 'AI pe selecție');
    },
  },
  ruler: {
    kicker: 'Rigla',
    title: 'Indentări și tab-uri, ca în Word',
    sub: 'Tragi de marcaje pentru indentare. Tab-uri la stânga, centrate, la dreapta sau zecimale, exacte în DOCX.',
    async setup(p) {
      await pick(p, 'Scrisoarea');
      await setText(p, ['Cuprins', 'Partea întâi\t7', 'Partea a doua\t42', 'Epilog\t118']);
      await p.keyboard.press('Control+Alt+Shift+R');
      await p.waitForTimeout(200);
      const ruler = p.locator('.pane .ruler').first();
      const box = await ruler.boundingBox();
      const cm = 96 / 2.54;
      // select the three entry lines and give them a right tab at 14 cm and a left indent
      await p.evaluate(() => {
        const v = document.querySelector('.pane .ProseMirror').editor;
        const d = v.state.doc;
        const from = d.firstChild.nodeSize + 1;
        v.commands.setTextSelection({ from, to: d.content.size - 1 });
        v.commands.focus();
      });
      await p.mouse.click(box.x + 7 * cm, box.y + 3); // left tab at 7 cm
      await p.waitForTimeout(150);
      const sel = ruler.locator('.ruler-tabtype');
      await sel.click(); await sel.click(); // selector shows the next type: left → center → right
      await p.waitForTimeout(150);
      const h = await ruler.locator('.ruler-handle.left').boundingBox();
      await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
      await p.mouse.down();
      await p.mouse.move(box.x + 1 * cm, h.y + h.height / 2, { steps: 6 });
      await p.mouse.up();
      await p.waitForTimeout(200);
      await p.evaluate(() => { const v = document.querySelector('.pane .ProseMirror').editor; v.commands.setTextSelection(v.state.doc.content.size - 1); });
      await noCaret(p);
    },
  },
  pagesetup: {
    kicker: 'Pagină și tipărire',
    title: 'Pagina, cum o vrei la tipar',
    sub: 'Format, margini, orientare și antet. În aplicația desktop vezi pagina înainte s-o tipărești.',
    async setup(p) {
      await menuPick(p, 'Fișier', 'Tipărire', 'Configurare pagină…');
      await p.waitForTimeout(500);
    },
  },
  reference: {
    kicker: 'Panoul de referință',
    title: 'Un al doilea text, doar de citit',
    sub: 'Vizualizare → Deschide ca referință: ții alături planul, o scenă veche sau originalul, fără să-l modifici din greșeală.',
    async setup(p) {
      await pick(p, 'Drumul');
      await menuPick(p, 'Vizualizare', 'Deschide ca referință');
      await pick(p, 'Începutul');
      await noCaret(p);
    },
  },
  research: {
    kicker: 'Cercetare · Întreabă',
    title: 'Întrebi sursele, primești răspuns cu trimiteri',
    sub: 'Răspunsul arată de unde vine fiecare idee [1], [2]. Continui discuția sau alegi una dintre întrebările propuse.',
    async setup(p) {
      await p.locator('header.toolbar button', { hasText: 'Inspector' }).first().click();
      await p.waitForTimeout(200);
      await menuCmd(p, 'Cercetare în proiect');
      await p.waitForSelector('.research-chat .research-ask');
      const box = p.locator('.research-chat .research-ask textarea, .research-chat .research-ask input').first();
      const askQ = async (q) => {
        await box.fill(q);
        await p.locator('.research-chat .research-ask-btn').first().click();
        await p.waitForFunction(() => !document.querySelector('.research-live'), null, { timeout: 15000 });
        await p.waitForTimeout(400);
      };
      await askQ('Ce culoare au ochii lui Andrei?');
      await askQ('Și Ilinca, cum arată?');
      await p.locator('.research-chat .research-turn-sources').last().evaluate((d) => { d.open = true; });
      await p.locator('.research-chat .research-followups').last().scrollIntoViewIfNeeded();
      await p.waitForTimeout(300);
      await noCaret(p);
    },
  },
  dictation: {
    kicker: 'Dictare · D&TED',
    title: 'Vorbești, iar textul apare în carte',
    sub: 'F9 pornește dictarea. Fără selecție, textul intră la cursor; peste o frază selectată, o înlocuiește. Recunoașterea vorbirii se face pe calculatorul tău, fără internet.',
    query: '&dted',
    async setup(p) {
      await caretEnd(p);
      await p.keyboard.press('F9');
      await p.waitForFunction(() => document.querySelector('.pane .ProseMirror').innerText.includes('drumul urca'), null, { timeout: 6000 });
      await p.waitForTimeout(250);
    },
  },
  team: {
    kicker: 'Lucru în echipă',
    title: 'Vezi cine lucrează acum și cine ce a schimbat',
    sub: 'Proiectul stă pe NAS sau în cloud. Fiecare om are un nume și o culoare; jurnalul arată cine, când și cât a scris, pe document sau în tot proiectul.',
    query: '&team',
    async setup(p) {
      await caretEnd(p);
      await p.keyboard.type(' Vântul bătea tare.');
      await p.waitForTimeout(9000);
      await menuCmd(p, /^Echipă…/);
      await p.waitForSelector('.team-dialog .team-log li');
      await p.waitForTimeout(300);
    },
  },
  conflict: {
    kicker: 'Lucru în echipă · conflict',
    title: 'Același paragraf, schimbat pe două calculatoare',
    sub: 'Variantele stau alături. Pentru fiecare loc alegi varianta ta, a celuilalt sau pe amândouă; varianta celuilalt rămâne oricum în Snapshot-uri.',
    query: '&conflict',
    async setup(p) {
      await ed(p).click();
      await p.evaluate(() => {
        const v = document.querySelector('.pane .ProseMirror').editor;
        v.commands.setTextSelection(1);
      });
      await p.keyboard.type('Ploua mărunt. ');
      await p.waitForTimeout(400);
      await p.evaluate(() => {
        window.__demoExternalEdit((h) => h.replace('rece de octombrie', 'cețoasă de noiembrie'));
      });
      while (await p.locator('.toast button').count()) await p.locator('.toast button').first().click();
      await p.locator('button.sync-conflict').click();
      await p.waitForSelector('.conflict-dialog');
      await p.waitForTimeout(300);
    },
  },
  report: {
    kicker: 'Ai găsit o problemă?',
    title: 'Descrii problema, restul vine singur',
    sub: 'Ajutor → Raportează o problemă: versiunea, sistemul și ultimele erori se completează automat. Textul cărții nu se trimite.',
    async setup(p) {
      await p.evaluate(() => setTimeout(() => { throw new TypeError("Cannot read properties of undefined (reading 'title')"); }, 0));
      await p.waitForTimeout(300);
      await p.locator('.report-toast button[aria-label]').click().catch(() => {});
      await menuPick(p, 'Ajutor', 'Raportează o problemă');
      const d = p.locator('.report-problem');
      await d.locator('textarea').first().fill('Am apăsat Compile pe tot manuscrisul și nu s-a creat niciun fișier.');
      await d.locator('textarea').nth(1).fill('Mutasem două scene în Partea a doua.');
      await d.locator('summary').click();
      await p.waitForTimeout(300);
      await noCaret(p);
    },
  },
};

// --- composition ------------------------------------------------------------------------------
const FONT_SERIF = "'DejaVu Serif', Georgia, 'Times New Roman', serif";
const FONT_SANS = "Inter, 'DejaVu Sans', 'Segoe UI', Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const windowHtml = (src, w) => `
  <div class="win" style="width:${w}px">
    <div class="bar"><i style="background:#ec6a5e"></i><i style="background:#f4bf4f"></i><i style="background:#61c554"></i></div>
    <img src="${src}" style="width:${w}px;display:block">
  </div>`;
const BASE_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f3efe6;font-family:${FONT_SANS};color:#1f1b16;overflow:hidden}
  .kicker{font-family:${FONT_SANS};font-weight:700;letter-spacing:.24em;text-transform:uppercase;font-size:19px}
  .win{border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 30px 60px rgba(60,45,25,.18),0 6px 16px rgba(60,45,25,.10);border:1px solid #e3dccd}
  .bar{height:38px;background:#ebe5d8;display:flex;align-items:center;gap:9px;padding-left:16px}
  .bar i{width:14px;height:14px;border-radius:50%;display:block}`;

function frameHtml(s, src) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:1200px;height:955px;padding:46px 47px 0}
  .kicker{color:#3f8f5a}
  h1{font-family:${FONT_SERIF};font-weight:400;font-size:52px;line-height:1.15;margin:18px 0 14px;letter-spacing:-.01em}
  p.sub{font-size:22px;line-height:1.5;color:#3d362d;max-width:830px}
  .holder{margin-top:24px;display:flex;justify-content:center}
  </style></head><body>
  <div class="kicker">${esc(s.kicker)}</div><h1>${esc(s.title)}</h1><p class="sub">${esc(s.sub)}</p>
  <div class="holder">${windowHtml(src, 1030)}</div></body></html>`;
}
function heroHtml(src) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:1200px;height:600px;padding:50px 47px;position:relative}
  .kicker{color:#c2413a}
  h1{font-family:${FONT_SERIF};font-weight:400;font-size:84px;margin:12px 0 18px;letter-spacing:-.02em}
  .tag{font-family:${FONT_SERIF};font-style:italic;font-size:30px;line-height:1.3;color:#2a241d}
  p.sub{font-size:19px;line-height:1.55;color:#4a4238;width:420px;margin:22px 0 26px}
  .btn{display:inline-block;font-size:17px;font-weight:600;border-radius:30px;padding:11px 18px;margin-right:8px;border:2px solid #1f1b16}
  .dark{background:#1f1b16;color:#fff}
  .shot{position:absolute;left:510px;top:84px;transform:rotate(-1.2deg)}
  .card{position:absolute;background:#fffdf6;border-radius:4px;box-shadow:0 12px 26px rgba(60,45,25,.22);padding:24px 18px 16px;width:200px}
  .card b{font-size:18px;display:block;padding-bottom:6px;border-bottom:2px solid #c2413a}
  .card span{font-family:${FONT_SERIF};font-size:15px;display:block;margin-top:10px;color:#3d362d}
  .pin{position:absolute;top:-8px;left:50%;width:16px;height:16px;border-radius:50%;margin-left:-8px}
  </style></head><body>
  <div class="kicker">Program de scris · gratuit</div>
  <h1>Scribner</h1>
  <div class="tag">Cartea ta, pe bucăți.<br>Apoi întreagă.</div>
  <p class="sub">Scrii sau traduci scenă cu scenă, le muți ca pe fișe și la final primești cartea în Word, PDF sau EPUB.</p>
  <span class="btn dark">Windows · fără internet</span><span class="btn">AI doar dacă vrei</span>
  <div class="shot">${windowHtml(src, 650)}</div>
  <div class="card" style="left:470px;top:410px;transform:rotate(-3deg)"><i class="pin" style="background:#c2413a"></i><b>Cap. 1</b><span>Plecarea de acasă</span></div>
  <div class="card" style="left:960px;top:400px;transform:rotate(2.5deg)"><i class="pin" style="background:#2b6fd6"></i><b>Notă</b><span>Ilinca are ochi verzi.</span></div>
  </body></html>`;
}

async function compose(browser, name, shot, png) {
  const src = `data:image/png;base64,${png.toString('base64')}`;
  const hero = Boolean(shot.hero);
  const ctx = await browser.newContext({ viewport: { width: 1200, height: hero ? 600 : 955 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(hero ? heroHtml(src) : frameHtml(shot, src), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  await ctx.close();
  return file;
}

function optimise(file) {
  try {
    execFileSync('pngquant', ['--force', '--skip-if-larger', '--quality=70-92', '--speed=1', '--output', file, file], { stdio: 'ignore' });
  } catch { /* pngquant missing or no gain: keep the original */ }
}

(async () => {
  const only = process.argv.slice(2);
  const names = only.length ? only : Object.keys(SHOTS);
  const browser = await chromium.launch();
  for (const name of names) {
    const shot = SHOTS[name];
    if (!shot) { console.error(`unknown image: ${name}`); process.exitCode = 1; continue; }
    const page = await openApp(browser, shot.query);
    try {
      await shot.setup(page);
      const png = await page.screenshot();
      const file = await compose(browser, name, shot, png);
      optimise(file);
      console.log(`${name}.png  ${Math.round(fs.statSync(file).size / 1024)} KB`);
    } catch (e) {
      console.error(`${name}: ${e.message}`);
      process.exitCode = 1;
    } finally {
      await page.context().close();
    }
  }
  await browser.close();
})();
