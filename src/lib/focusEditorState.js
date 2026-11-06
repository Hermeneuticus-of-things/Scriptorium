// ADL §2 + §5, campania adl-campaign item 5 (T5) — captură/restaurare REALĂ a editorului de
// documente la push/pop pe motorul de focus (docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md): când un
// strat translucid — meniu, dropdown, dialog, popover — se deschide peste funcția de bază,
// închiderea îi aduce înapoi exact „caret, selection, scroll"; utilizatorul nu rămâne niciodată
// străin în propriul document. Modul pur: funcțiile primesc handle-ul Editor (sau direct editorul
// tiptap), deci motorul rămâne testabil fără React, iar integrarea din App.jsx este pasivă —
// componentele existente (Menu, Dialog, FormatBar) nu se ating.
import { TextSelection } from '@tiptap/pm/state';

/** Panoul care defapt scrollează editorul (.pane are overflow:auto în styles.css). */
export function editorScrollEl(editor) {
  return editor?.view?.dom?.closest?.('.pane') || null;
}

// Handle vs editor: handle-ul imperativ din Editor.jsx poartă instanța la .editor; modulele
// primesc oricare din ele, ca testele să poată da direct un editor fals.
function editorOf(handle) {
  const ed = handle?.editor ?? handle;
  return ed && !ed.isDestroyed ? ed : null;
}

/**
 * Instanta stării de suprafață: selecția (from/to) și scrollTop-ul panoului care scrollează.
 * null când editorul e lipsă/distrus sau fără selecție — restaurarea devine no-op, nu ațârnă.
 */
export function captureEditorState(handle) {
  const ed = editorOf(handle);
  if (!ed?.state?.selection) return null;
  const sc = editorScrollEl(ed);
  return { from: ed.state.selection.from, to: ed.state.selection.to, scrollTop: sc ? sc.scrollTop : null };
}

/**
 * Restaurare exactă, în ordinea focus → selecție → scroll: ÎNTÂI focus (o view nefocalizată
 * sincronizează la focus selecția veche din DOM înapoi în editor — aceeași ordine ca selectAround
 * din Editor.jsx), APOI selecția, APOI o simplă atribuire scrollTop; niciodată scrollIntoView
 * agresiv — caretul trebuie să revină pe același ecran, nu să sară la început sau la centru.
 *
 * DECIZIE pentru doc-ul schimbat între captură și restaurare (editări programatice din alt
 * panou, sync split, schimbare de document): pozițiile se validează contra dimensiunii
 * ACTUALE a doc-ului — cele valide revin exact, cele ieșite din limite se strâng (clamp) la
 * cea mai apropiată poziție validă. Nu ținem evidența pașilor dintre captură și restaurare
 * (maparea pozițiilor ar costa mai mult decât câștigă), deci clamp e aproximația noastră a
 * „celei mai apropiate poziții valide". Am ales clamp în locul lui „deloc" pentru că ADL cere
 * ca utilizatorul să nu rămână fără caret („never stranded"): o poziție validă apropiată bate
 * niciuna; excepția e editorul lipsă/distrus → no-op complet. Niciodată nu aruncăm excepția
 * mai departe: o restaurare eșuată lasă starea curentă neatinsă.
 */
export function restoreEditorState(handle, stare) {
  const ed = editorOf(handle);
  if (!ed || !stare) return false;
  const sc = editorScrollEl(ed);
  const hasSel = Number.isFinite(stare.from) && Number.isFinite(stare.to);
  const hasScroll = Boolean(sc) && Number.isFinite(stare.scrollTop);
  if (!hasSel && !hasScroll) return false;
  try {
    if (!ed.view?.hasFocus?.()) ed.view?.focus?.();
  } catch { /* focus imposibil: continuăm cu selecția/scroll-ul */ }
  let ok = true;
  if (hasSel) {
    try {
      const size = ed.state.doc.content.size;
      const from = Math.max(0, Math.min(stare.from, size));
      const to = Math.max(from, Math.min(stare.to, size));
      ed.view.dispatch(ed.state.tr.setSelection(TextSelection.create(ed.state.doc, from, to)).setMeta('addToHistory', false));
    } catch {
      ok = false; // poziție imposibilă chiar și după clamp (nod non-text etc.)
    }
  }
  if (hasScroll) {
    try {
      sc.scrollTop = stare.scrollTop; // după focus/selecție: nimic nu mai scrollează peste ea
    } catch {
      ok = false;
    }
  }
  return ok;
}

/**
 * Focus simplu pe editor, fără mutarea selecției sau a scroll-ului: comenzile tiptap `focus`
 * pot scrolLIntoView, aici caretul trebuie să rămână exact unde era (motorul o apelează la
 * pop/switchFocus prin registration.focus, după restore).
 */
export function focusEditorPlain(handle) {
  const ed = editorOf(handle);
  if (!ed) return false;
  try {
    if (!ed.view?.hasFocus?.()) ed.view?.focus?.();
    return true;
  } catch {
    return false;
  }
}

/**
 * Înregistrarea de suprafață pentru editorul de documente, pe motorul ADL (§2): capture() rulează
 * automat la push-ul ORICĂRUI strat translucid peste editor și restore() la pop — motorul ține
 * câte o captură PER NIVEL de stivă (LIFO), deci cascadele meniu-peste-dialog-peste-editor
 * restaurează fiecare nivel pe al său. `getHandle` citește handle-ul LIVE la apel (panoul se
 * poate remonta sub același id; un panou închis degradează la no-op, nu aruncă). `commands`
 * rămân cele ale suprafeței de bază (registry-ul de comenzi din App.jsx).
 */
export function editorSurfaceRegistration(getHandle, commands = {}) {
  return {
    capture: () => captureEditorState(getHandle?.()),
    restore: (stare) => restoreEditorState(getHandle?.(), stare),
    focus: () => focusEditorPlain(getHandle?.()),
    commands,
  };
}
