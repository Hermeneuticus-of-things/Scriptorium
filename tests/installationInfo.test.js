import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const info = require('../lib/installationInfo.cjs');

function fakeInstall(root, version) {
  const exe = path.join(root, 'Pneuma Sofer', 'Pneuma Sofer.exe');
  fs.mkdirSync(path.join(root, 'Pneuma Sofer', 'resources', 'app'), { recursive: true });
  fs.writeFileSync(exe, 'fake');
  fs.writeFileSync(path.join(root, 'Pneuma Sofer', 'resources', 'app', 'package.json'), JSON.stringify({ version }));
  return exe;
}

describe('installationInfo', () => {
  it('listează copiile cunoscute și le marchează după versiune', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pneuma-installs-'));
    const current = fakeInstall(path.join(root, 'current'), '1.2.7');
    fakeInstall(path.join(root, 'local'), '1.2.6');
    const installations = info.listKnownInstallations({
      currentExe: current,
      platform: 'win32',
      registryText: '',
      env: { LOCALAPPDATA: path.join(root, 'local'), ProgramW6432: '', ProgramFiles: '', 'ProgramFiles(x86)': '' },
    });
    const described = info.describeInstallations({ current: { version: '1.2.7' }, installations });
    expect(described).toHaveLength(2);
    expect(described.find((item) => item.current)).toMatchObject({ version: '1.2.7', state: 'current' });
    expect(described.find((item) => !item.current)).toMatchObject({ version: '1.2.6', state: 'different-version' });
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('citește versiunea din intrarea Windows Uninstall', () => {
    const text = [
      'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Pneuma',
      '    DisplayName    REG_SZ    Pneuma Sofer',
      '    DisplayVersion    REG_SZ    1.2.6',
      '    InstallLocation    REG_SZ    C:\\Apps\\Pneuma Sofer',
      '',
    ].join('\n');
    expect(info.parseUninstallRegistry(text)).toEqual([{ exePath: 'C:\\Apps\\Pneuma Sofer\\Pneuma Sofer.exe', version: '1.2.6' }]);
  });
});
