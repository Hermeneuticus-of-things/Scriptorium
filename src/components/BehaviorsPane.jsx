import React from 'react';
import { t } from '../lib/i18n.js';

const choice = (s, set, key, label, values) => (
  <label>
    {label}
    <select value={s[key]} onChange={set(key)}>
      {values.map((v) => <option key={v} value={v}>{t(`ui.p4.${key}.${v}`)}</option>)}
    </select>
  </label>
);

// Options › Behaviors: binder clicks, default views, drag and drop, links, trash, targets.
export default function BehaviorsPane({ s, set, check }) {
  return (
    <>
      <fieldset>
        <legend>Binder</legend>
        <label>
          {t('set.binderEnter')}
          <select value={s.binderEnter} onChange={set('binderEnter')}>
            {['edit', 'newDoc'].map((x) => <option key={x} value={x}>{t(`set.binderEnter.${x}`)}</option>)}
          </select>
        </label>
        <label>
          {t('set.binderDbl')}
          <select value={s.binderDoubleClick} onChange={set('binderDoubleClick')}>
            {['rename', 'openQuickRef'].map((x) => <option key={x} value={x}>{t(`set.binderDbl.${x}`)}</option>)}
          </select>
        </label>
        {choice(s, set, 'folderDoubleClick', t('ui.p4.dubluClicDosar'), ['behaviour', 'expand', 'corkboard', 'outline'])}
        {choice(s, set, 'binderDragToEditor', t('ui.p4.tragereInEditor'), ['link', 'text', 'image'])}
        {check('autoFolderOnChildren', t('ui.p4.autoDosar'))}
        {check('confirmEmptyTrash', t('ui.p4.confirmaCos'))}
      </fieldset>
      <fieldset>
        <legend>{t('ui.p4.vizualizari')}</legend>
        {choice(s, set, 'folderView', t('ui.p4.vedereDosar'), ['keep', 'editor', 'corkboard', 'outline'])}
        {choice(s, set, 'parentDocView', t('ui.p4.vedereParinte'), ['keep', 'editor', 'corkboard', 'outline'])}
        {choice(s, set, 'multiSelectView', t('ui.p4.selectieMultipla'), ['scrivenings', 'corkboard', 'outline'])}
      </fieldset>
      <fieldset>
        <legend>{t('ui.p4.legaturi')}</legend>
        {choice(s, set, 'internalLinksOpen', t('ui.p4.legaturiInterne'), ['current', 'other', 'quickRef'])}
        {choice(s, set, 'bookmarksOpen', t('ui.p4.semneCarte'), ['editor', 'quickRef'])}
      </fieldset>
      <fieldset>
        <legend>{t('ui.p4.documente')}</legend>
        {check('untitledFirstLine', t('ui.p4.primaLinie'))}
        {check('snapshotOnSave', t('set.snapshotOnSave'))}
        {check('typewriter', t('set.typewriter'))}
        {check('targetSound', t('ui.p4.sunetTinta'))}
      </fieldset>
    </>
  );
}
