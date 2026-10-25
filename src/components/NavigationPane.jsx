import React from 'react';
import { t } from '../lib/i18n.js';

// Options › Navigation: split editor, selection sync, cursor, outliner keys, Quick Reference, layout.
export default function NavigationPane({ s, set, check }) {
  return (
    <>
      <fieldset>
        <legend>{t('ui.p4.editorImpartit')}</legend>
        {check('splitOpenInOther', t('ui.p4.deschideInCelalalt'))}
        {check('syncBinderSelection', t('ui.p4.selectieInBinder'))}
      </fieldset>
      <fieldset>
        <legend>Editor</legend>
        {check('rememberCaret', t('ui.p4.pozitieCursor'))}
        {check('restoreLayoutOnOpen', t('ui.p4.restaureazaAranjament'))}
        {check('quickRefOnTop', t('ui.p4.quickRefDeasupra'))}
      </fieldset>
      <fieldset>
        <legend>Outliner</legend>
        <label>
          {t('ui.p4.outlinerEnter')}
          <select value={s.outlinerEnter} onChange={set('outlinerEnter')}>
            {['edit', 'newRow'].map((v) => <option key={v} value={v}>{t(`ui.p4.outlinerEnter.${v}`)}</option>)}
          </select>
        </label>
        <label>
          {t('ui.p4.outlinerTab')}
          <select value={s.outlinerTab} onChange={set('outlinerTab')}>
            {['indent', 'none'].map((v) => <option key={v} value={v}>{t(`ui.p4.outlinerTab.${v}`)}</option>)}
          </select>
        </label>
      </fieldset>
    </>
  );
}
