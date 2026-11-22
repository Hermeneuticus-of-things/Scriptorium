'use strict';

const { parentPort } = require('worker_threads');
const backup = require('../lib/backup.cjs');

const operations = {
  backupProject: (...args) => backup.backupProject(...args),
  backupOnOpen: (...args) => backup.backupOnOpen(...args),
  restoreBackup: (...args) => backup.restoreBackup(...args),
};

parentPort.on('message', async ({ id, operation, args }) => {
  try {
    const fn = operations[operation];
    if (!fn) throw new Error(`Operație backup necunoscută: ${operation}`);
    const value = await fn(...args);
    parentPort.postMessage({ id, ok: true, value });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: { message: error?.message || String(error), code: error?.code } });
  }
});
