import React from 'react';
import { t } from '../lib/i18n.js';

// Options › Keyboard: the shortcut editor opens in its own window (search, file sets, per-command reset).
export default function KeyboardPane({ settings, onShortcuts }) {
  const custom = Object.keys((settings && settings.shortcuts) || {}).length;
  return (
    <>
      <p className="muted small">{t('set.keyboardInfo')}</p>
      <p className="muted small">{t('ui.p4.scurtaturiProprii', { n: custom })}</p>
      <button disabled={!onShortcuts} onClick={() => onShortcuts?.()}>{t('set.openShortcuts')}</button>
    </>
  );
}
