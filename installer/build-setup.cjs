// Builds release/Scribner-Setup-<version>.exe with Inno Setup from release/win-unpacked.
// Needs Windows with Inno Setup 6 (ISCC.exe on PATH or in the default install folders).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
if (!fs.existsSync(path.join(root, 'release', 'win-unpacked', 'Scribner.exe'))) {
  console.error('Lipsește release/win-unpacked/Scribner.exe. Rulează întâi: npm run dist:win');
  process.exit(1);
}
const ico = path.join(root, 'build', 'icon.ico');
if (!fs.existsSync(ico)) {
  console.error('Lipsește build/icon.ico. Fișierul face parte din repo; refă-l din public/icon.svg dacă s-a pierdut');
  process.exit(1);
}
const candidates = [
  process.env.ISCC,
  'ISCC.exe',
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
].filter(Boolean);
for (const iscc of candidates) {
  try {
    execFileSync(iscc, [`/DAppVersion=${version}`, path.join(__dirname, 'scribner.iss')], { stdio: 'inherit' });
    console.log(`Gata: release/Scribner-Setup-${version}.exe`);
    process.exit(0);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
console.error('Nu găsesc Inno Setup 6 (ISCC.exe). Instalează-l de la https://jrsoftware.org/isdl.php sau setează ISCC=<cale>.');
process.exit(1);
