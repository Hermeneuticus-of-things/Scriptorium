// Builds release/PneumaSofer-Setup-<version>.exe with Inno Setup from release/win-unpacked.
// Needs Windows with Inno Setup 6 (ISCC.exe on PATH or in the default install folders).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version } = require(path.join(root, 'package.json'));
if (!fs.existsSync(path.join(root, 'release', 'win-unpacked', 'Pneuma Sofer.exe'))) {
  console.error('Lipsește release/win-unpacked/Pneuma Sofer.exe. Rulează întâi: npm run dist:win');
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
    // Ordine corectă de semnare Authenticode (docs/DISTRIBUTIE-WINDOWS.md):
    //   1. executabilele aplicației din win-unpacked (înainte să intre în installer)
    //   2. installerul, construit ulterior
    //   3. verificarea semnăturilor (pas separat, obligatoriu pentru Release public)
    // Fără certificat configurat → Development mode (build merge, publicarea Release se blochează).
    const { execSync } = require('child_process');
    const unpacked = path.join(root, 'release', 'win-unpacked');
    const innerExes = fs.readdirSync(unpacked).filter((f) => f.endsWith('.exe')).map((f) => path.join(unpacked, f));
    // portabilul e construit înaintea installerului și se semnează și el (distribution artifacts)
    const portable = path.join(root, 'release', `PneumaSofer-${version}-portabil.exe`);
    if (fs.existsSync(portable)) innerExes.push(portable);
    const SIGN = process.env.PNEUMA_SIGN_PFX ? 'pfx' : (process.env.PNEUMA_TS_ACCOUNT && process.env.PNEUMA_TS_ENDPOINT ? 'azure' : 'none');
    const inner = innerExes.map((f) => `"${f}"`).join(',');
    let signed = false;
    try {
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(root, 'scripts', 'sign-release.ps1')}" -Files ${inner}`, { stdio: 'inherit' });
      signed = true;
    } catch (e) {
      if (e.status === 2) console.log('Development mode — installer NESIGNAT (nu publica ca Release).');
      else throw e;
    }
    execFileSync(iscc, [`/DAppVersion=${version}`, path.join(__dirname, 'pneuma.iss')], { stdio: 'inherit' });
    const setup = path.join(root, 'release', `PneumaSofer-Setup-${version}.exe`);
    try {
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(root, 'scripts', 'sign-release.ps1')}" -Files "${setup}"`, { stdio: 'inherit' });
    } catch (e) {
      if (e.status !== 2) throw e;
    }
    // Verificare obligatorie: Release public doar cu semnături valide (când certificatul e configurat).
    if (signed) {
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(root, 'scripts', 'sign-release.ps1')}" -VerifyOnly -Files "${setup}"`, { stdio: 'inherit' });
    } else {
      fs.writeFileSync(path.join(root, 'release', 'UNSIGNED.txt'), 'Build in Development mode: fara certificat de semnare. NU publica ca Release public.');
    }
    console.log(`Gata: release/PneumaSofer-Setup-${version}.exe`);
    process.exit(0);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
console.error('Nu găsesc Inno Setup 6 (ISCC.exe). Instalează-l de la https://jrsoftware.org/isdl.php sau setează ISCC=<cale>.');
process.exit(1);
