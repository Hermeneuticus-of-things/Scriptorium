'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const sourceDir = path.join(ROOT, 'assets', 'readme');
const workDir = path.join(ROOT, '.work', 'readme-gif-raster');
const python = process.env.PYTHON || 'python';
const sources = fs.readdirSync(sourceDir)
  .filter((name) => /\.(png|jpe?g|webp|svg)$/i.test(name))
  .sort();

function fileUrl(file) {
  return `file:///${file.replace(/\\/g, '/')}`;
}

(async () => {
  fs.mkdirSync(workDir, { recursive: true });
  let browser;
  try {
    for (const name of sources) {
      const source = path.join(sourceDir, name);
      const stem = name.replace(/\.[^.]+$/, '');
      const raster = path.join(workDir, `${stem}.png`);
      if (/\.svg$/i.test(name)) {
        browser ||= await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 });
        await page.setContent(fs.readFileSync(source, 'utf8'), { waitUntil: 'domcontentloaded' });
        await page.locator('svg').screenshot({ path: raster, timeout: 5000, omitBackground: false });
        await page.close();
      } else {
        fs.copyFileSync(source, raster);
      }
    }
  } finally {
    if (browser) await browser.close();
  }
  execFileSync(python, [path.join(__dirname, 'animate-readme-assets.py')], { cwd: ROOT, stdio: 'inherit' });
})();
