# Ionuț Application Design Language

*Also recognized as:* **design application language** (the app-facing side: what the user sees and does) and **design logic language** (the tool/engine logic side: how the app tracks state, routes input, and dispatches commands). These are alternate names for this same document; file names stay unchanged.

This is a **general application design language**. It applies to **every application**, any app, any project — writing tools, news readers, email clients, AI assistants, image editors, dashboards, and thousands of other app types. The rules are identical regardless of product name or domain.

**Purpose:** eliminate generic, noisy, AI-generated interface slop. Put the app's real work in front; keep supporting controls quiet, complete, and reachable.

---

## 0. Scope: UX as well as UI

**If you are implementing this, your job is:** apply these rules to both how the app looks **and** how it behaves — layout and visuals, plus interaction logic, focus behavior, and how the user moves through the app.

This design language covers **UX as well as UI**. It is **not only** about visual interface (sizes, colors, icons). It governs the **whole user experience**:

- **Visual interface (UI):** scales, density, buttons, dropdowns, theming (§3, §5, §6, §8, §10, §12).
- **Interaction logic (UX):** what the core function is (§1), which surface is active and receives input (§2), how controls hide and reappear (§4), feedback and errors (§11).
- **Movement through the app:** opening and closing settings, menus, dialogs, panels, and returning to where the user was (§2.4).
- **Engine logic:** focus state, input routing, command dispatch, surface registration (§2.5).

**How to read this document:** every numbered section has the same parts — the rule, an "If you are implementing this, your job is" line, where effort matters vs. what is out of scope, correct / avoid examples, and "What this is NOT" where the rule is easy to confuse. Rules are mandatory (§13). Where a number is given, it is the default; deviate only for a documented platform requirement.

**Acceptance bar:** an implementer (human or AI) with only this document and the codebase must be able to implement every rule without guessing. If a rule cannot be implemented as written, that is a defect in this document, not permission to improvise.

**What this is NOT:** not a visual style guide alone; not a brand guide (no colors, logos, or product names are prescribed); not specific to any one product.

---

## 1. Core function (varies by app type)

**If you are implementing this, your job is:** name the app's single core function, give that surface the largest share of space and visual priority, and keep every existing supporting control available around it.

Define the **core function** of the application first. That function occupies the foreground. Everything else supports it.

Examples (same language for all):

| App type | Core function in the foreground |
|----------|----------------------------------|
| Writing app | Writing |
| News app | Showing news |
| Email app | Showing emails |
| AI app | The AI interaction |
| Image editor | The image being edited |
| Any other app | That app's primary job |

The design language does **not** change with app type. Only which surface counts as "core" changes.

**Concretely, "foreground" means:** the core surface gets the largest area of the main window, the highest contrast content, and is the default focus when the app opens (§2). Surrounding controls (§9) sit at the edges at the sizes in §3.

### 1.1 Completeness is required — do not strip controls

Putting the core function in the foreground does **not** mean removing controls. An AI (or designer) must **not** "simplify" menus by deleting items the user needs. Even when tasks, menus, submenus, and sub-submenus are complex, **keep them all** and arrange them with a clear layout. Stripping needed menu items violates this design language. **Completeness of functionality is required;** only the visual presentation should be quiet and organized.

"Needed" means: any command, menu item, or setting that exists in the current app, unless the human owner explicitly asks to remove it. When unsure, keep it.

- **Effort matters:** identifying the core surface correctly; preserving every command; organizing menus into clear groups.
- **Out of scope / not important:** marketing copy, hero sections, onboarding illustrations, decorative imagery.
- **Correct:** a writing app with a large editor, a compact toolbar, and a full menu bar with all submenus intact.
- **Avoid:** deleting the "Export" submenu because it "clutters"; a dashboard-style home screen pushing the editor below the fold.

**What this is NOT:** not minimalism by deletion; not "focus mode" that removes chrome; not the same as §2 (§1 is the product-wide foreground; §2 is which surface is active at this moment).

---

## 2. Focus levels

**If you are implementing this, your job is:** make the application always know which surface is active (text editor, settings, menu, image, panel, dialog), send keyboard input, commands, and visual emphasis to that surface at its own level, and when that surface closes, return focus to exactly where the user was before.

### 2.1 The rule

Focus is **not only** the application's overall purpose or core task (§1). Focus also follows the **active window** and the **level of the object** the user is working on — whatever kind of surface that is.

Every surface that the user is actively working in gets **its own focus, at its own level**:

| User is working in… | Focus is on… |
|---|---|
| Text in the editor | That text, at the caret / selection |
| Settings opened from that text | The settings surface, so it can be configured with the same clarity and detail as the text |
| Settings for something else (another document, a tool, a plugin) | That other settings surface |
| A menu or submenu | That menu, and the highlighted item in it |
| An image (viewer, crop, inspector) | That image and its local tools |
| A panel, inspector, sidebar, or list | That panel and its selected item |
| A dialog or confirmation | That dialog and its default control |

If the app is only about one task (e.g. only writing), focus stays on that task. When the user enters an **intermediate level** that itself needs detail — settings, menus, inspectors, images, panels, dialogs — that level becomes the focus **while it is active**. Focus tracks **both** the active window **and** the level of the object, not only the app's global scope.

### 2.2 Focus levels (the model)

Treat the app as nested levels. A typical stack, from outermost to innermost:

1. **App level** — global chrome: app menu, main navigation, window title bar.
2. **Window / workspace level** — the document window, the main view.
3. **Surface level** — the editor, an image viewer, a settings page, a side panel.
4. **Object level** — the paragraph or selection, the setting field, the menu item, the layer in an image.

Exactly **one** surface is the **active focus surface** at any moment. Its level determines what receives input, what commands mean, and what is visually emphasized. Outer levels remain visible and reachable (§1 completeness, §4) but are visually and logically secondary while an inner level is active.

### 2.3 What "receiving focus" means (all three, not just one)

When a surface becomes active, the app must do **all** of the following:

1. **Input routing** — typed keys, pointer wheel, and shortcuts go to the active surface first. Example: pressing `Ctrl+F` in the settings surface searches settings, not the document; in the editor it searches the text.
2. **Command dispatch** — commands (menu items, palette entries, shortcuts) resolve against the active surface first, then bubble outward to parent levels only if the active surface does not handle them. Example: `Delete` in an image layer list deletes the layer; in the editor it deletes text; `Ctrl+S` is not handled by settings, so it bubbles to the window and saves the document.
3. **Visual emphasis** — the active surface is clearly the most prominent: full contrast, active header/title state, visible selection; inactive surfaces are de-emphasized (slightly muted header, inactive selection color) but **never hidden, blurred into unreadability, or stripped of controls**.

### 2.4 Return / transition rule (concrete)

When the user **leaves** a surface (closes it, presses `Escape`, clicks back, or completes it):

1. **Restore focus to the previously focused surface** — the one the user came from, not a default or "home" surface.
2. **Restore the previous position inside it** when possible: the same control, the same caret position and selection in text, the same scroll position, the same selected list item or image layer.
3. If the previous surface no longer exists (it was closed or deleted meanwhile), go to its nearest still-open parent level and focus its last-focused object.
4. **Never** leave focus stranded on a closed or hidden surface (keys going nowhere).
5. **Never** jump to unrelated global chrome (app menu, main navigation, window title) **unless** the user closed the whole level that contained the work (e.g. closed the document window).
6. Switching between two sibling surfaces (e.g. editor ↔ side panel via click or shortcut) moves focus directly; each sibling remembers its own last-focused object and caret.

Example: user is typing at word 120 → opens Settings → changes font size → presses `Escape` → caret is back at word 120 with the same selection, and typing continues immediately. Wrong: caret jumps to the start of the document, or focus lands on the toolbar, or nothing has focus.

### 2.5 Engine logic (how to implement in code)

This is a logic rule, not only a visual one. Implement it with an explicit focus model in the app's state, independent of any single UI framework:

**State object**

```
FocusState {
  stack: FocusEntry[]          // bottom = outermost level, top = active surface
  registry: Map<surfaceId, SurfaceRegistration>
}
FocusEntry {
  surfaceId: string
  level: "app" | "window" | "surface" | "object"
  lastFocusedControlId?: string
  caret?: { start, end }       // for text surfaces
  scroll?: { x, y }
  selection?: any              // list item, image layer, etc.
}
```

**Registration — every focusable surface registers itself at its level**

```
registerFocusableSurface({
  id: "settings.editor",
  level: "surface",
  parentId: "window.document-1",
  commands: { "find": searchSettings, "close": closeSettings },
  onFocus: () => { /* emphasize, focus default or last control */ },
  onBlur:  () => { /* save caret/scroll/selection into its FocusEntry */ },
})
// returns unregister(); call it when the surface is destroyed
```

**Operations**

- `pushFocus(surfaceId)` — when a surface opens: call current top's `onBlur` (which saves its caret/control/scroll), push the new entry, call its `onFocus`.
- `popFocus(surfaceId)` — when a surface closes: remove it, then call `onFocus` on the new top and restore its saved `lastFocusedControlId`, `caret`, `scroll`, `selection`.
- `switchFocus(surfaceId)` — sibling switch: replace top without destroying the other sibling's saved entry.
- `dispatch(command, args)` — walk the stack from top to bottom; the first surface whose `commands` handles the command runs it; if none, ignore or show it as unavailable. Menus and the command palette show commands available for the **active** surface first.
- `onSurfaceDestroyed(id)` — unregister; if it was in the stack, pop it and apply return rule step 3.

**Rules for the implementation**

- There is a **single source of truth** for the active surface (`stack.top`). UI components read it; they do not each guess focus on their own.
- Native/OS focus (DOM focus, widget focus) is **synchronized** to `stack.top` — it is the effect, not the source.
- Every modal or non-modal surface that takes input (dialog, menu, popover, panel, image viewer, settings page) **must** register; unregistered surfaces are a bug.
- Pointer clicks into a registered surface call `switchFocus` / `pushFocus`, so mouse and keyboard users get the same model.
- Write tests for: open → close restores caret; nested open (settings → submenu → dialog) → three closes return in reverse order; closing a parent pops its children; commands dispatch to the active surface.

### 2.6 Where effort matters / what is out of scope

- **Effort matters:** correct active-surface tracking; input and command routing; exact return (surface + control + caret); emphasis of the active surface; registration of every surface.
- **Not important here:** the exact animation of focus transitions; the specific color of the active header (follow §7 and §12); choosing a particular framework or library — any implementation that meets §2.5 is acceptable.

### 2.7 What this is NOT

- **Not keyboard focus rings alone.** A visible focus ring (§7) is required for accessibility, but §2 is about which **surface and level** owns input, commands, and emphasis. A ring on the right button with input going to the wrong surface fails §2.
- **Not a single global focus forever.** Focus is not permanently locked on the core surface; intermediate surfaces get real focus while active.
- **Not stripping menus or controls.** De-emphasizing inactive surfaces never means removing or hiding their controls (§1 completeness, §4).
- **Not the same as §1.** §1 defines the product's core function (what is foreground overall). §2 defines which surface is active right now. Both apply together.
- **Not Material / HIG / platform keyboard-only focus guidance.** Platform guidelines about tab order and focus indicators still apply (§7), but this rule adds level-based focus: surface tracking, routing, dispatch, and return.
- **Not "focus mode" / distraction-free mode.** Hiding all chrome is a separate optional feature, not what this rule requires.

**Correct:** settings opened from text get full emphasis and input; `Escape` returns the caret to where it was.
**Avoid:** settings open but typing still goes into the document; closing a dialog leaves nothing focused; closing settings sends focus to the app menu; hiding the toolbar to "focus" the user.

---

## 3. Measurable scales

**If you are implementing this, your job is:** use these exact values as design tokens for every control, and replace any off-scale size with the nearest token value.

Use these sizes unless a platform standard forces a documented exception:

| Token | Values |
|-------|--------|
| Control height | **24 / 28 / 32 px** |
| Icons | **16 / 20 px** |
| UI typography | **12–14 px** |
| Spacing | **4 / 8 / 12 px** |
| Corner radius | **4–8 px** (small, consistent) |
| Control padding | **4–8 px** horizontal; match height vertically |
| Toolbar height | **32–40 px** |
| Minimum click target | **32 px** pointer · **44 px** touch |

No immense buttons. No oversized icons. Controls are only large enough to read and hit reliably.

**Clarifications:**
- Values are at **100% UI scale**; they scale proportionally with zoom (§8).
- "UI typography" means labels, menus, toolbars, status text. **Content** typography (the document text, the email body, the article) is set by the content's needs and user preference, not capped at 14 px.
- A **click target** may be larger than the visible control (padding or invisible hit area) — e.g. a 24 px control with a 32 px hit area is correct.
- Use one corner radius value consistently within an app (pick one in 4–8 px).
- Define these as named tokens in code (e.g. `control.height.md = 28`), not repeated literals.

- **Effort matters:** consistency across the whole app; tokens in code; meeting target sizes.
- **Out of scope / not important:** pixel-perfect matching of platform native widgets that already meet the scale.
- **Correct:** 28 px buttons, 16 px icons, 8 px gaps in a toolbar.
- **Avoid:** 56 px buttons, 32 px icons in toolbars, 18 px menu labels, random 10 px / 15 px spacings.

**What this is NOT:** not a limit on content text size; not a limit on the core surface's area.

---

## 4. Disappear vs stay available

**If you are implementing this, your job is:** make sure every supporting control that is hidden can be brought back from a fixed, discoverable place, and never remove a control's last access path.

Supporting controls stay **available**; they must not vanish permanently.

Preferred patterns:

1. **Minimal persistent toolbar** — always-visible strip of the few actions used constantly.
2. **Collapsible panels** — hide density, not capability; restore in one click or shortcut.
3. **Popover / overlay** — temporary detail without leaving the core surface.
4. **Command palette** — keyboard-first access to the full command set.
5. **Keyboard shortcuts** — every frequent action has a shortcut; document them.

**When a control may hide:** only when another equally discoverable path remains (toolbar overflow, menu, palette, or shortcut). A shortcut alone is **not** enough for a command that has no menu or palette entry.
**How it reappears:** same entry point every time; no scavenger hunt; state remembered for the session when useful (e.g. a collapsed panel stays collapsed until the user reopens it).

**Concrete test:** for every command, at least one of {menu item, command palette entry, visible toolbar button} exists at all times.

- **Effort matters:** the command palette containing the full command set; a consistent restore control for each collapsible panel.
- **Out of scope / not important:** auto-hide on idle timers; animation of collapse.
- **Correct:** a side panel collapses to a 32 px strip with an expand button; its commands are also in the menu and palette.
- **Avoid:** a toolbar that disappears on scroll with no way back except reloading; features available only through an undocumented gesture.

**What this is NOT:** not a requirement to show everything at once; not permission to hide controls behind hover-only reveals with no keyboard path.

---

## 5. Dropdown specifications

**If you are implementing this, your job is:** replace large button rows and icon banks used for choosing a field value with compact dropdowns that follow the table below, and leave the listed exceptions alone.

Prefer **compact dropdown menus** for changing a field value (instead of large button rows or icon banks).

| Topic | Rule |
|-------|------|
| Field types | Enumerations, modes, presets, sort/filter, status, view options |
| Dropdown vs toggle | Toggle for binary on/off; dropdown for 3+ choices |
| Two non-binary choices | Segmented control or dropdown; either is acceptable |
| Dropdown vs inline edit | Inline edit for free text and numbers the user types |
| Max width | Fit content; cap ~280–320 px unless list labels need more |
| Item height | Match control height (24/28/32 px) |
| Long lists | Add search/filter above ~12 items |
| Keyboard | Arrow keys, Enter to select, Escape to close, typeahead |
| Selected state | Clear check or highlight; do not rely on color alone |
| Grouping | Optional section labels for related items |
| Focus | An open dropdown is the active focus surface (§2); closing it returns focus to its trigger |
| Exceptions | Primary commit actions, live data readouts, numeric steppers, and free-text fields are **not** forced into dropdowns |

- **Effort matters:** keyboard behavior; clear selected state; search on long lists.
- **Out of scope / not important:** custom dropdown animations; replacing native selects that already meet the table.
- **Correct:** a "Sort by" dropdown with 5 options, 28 px items, a check on the current one.
- **Avoid:** a row of five large buttons for sort order; a 40-item font list with no search.

**What this is NOT:** not a rule to turn every action into a dropdown; not a rule for navigation menus (those are menus, §9–§10).

---

## 6. Buttons and actions

**If you are implementing this, your job is:** keep visible buttons only for the primary action and confirmations, move secondary actions into menus, small icons, or the palette, and give every actionable control the full set of states.

- Buttons are for a **primary action** or an explicit **confirmation**.
- No huge buttons (heights per §3).
- Secondary actions live in menus, small icons, or the command palette.
- Hierarchy: **primary / secondary / tertiary / destructive**.
- States (every actionable control): **hover · focus · active · disabled · loading · error**.
- At most **one primary** button per surface (per dialog, per panel).

Destructive actions require confirmation when irreversible. If the action is reversible (undo exists), prefer undo over a confirmation dialog.

- **Effort matters:** one clear primary per surface; all six states implemented; destructive confirmation.
- **Out of scope / not important:** button gradients, shadows, decorative icons inside buttons.
- **Correct:** a dialog with one primary "Save", a secondary "Cancel", and a small destructive "Delete" styled distinctly.
- **Avoid:** three equally prominent large buttons; a disabled button with no visible disabled state; deleting without confirmation when there is no undo.

**What this is NOT:** not a ban on buttons; not a ban on icon buttons in toolbars (they are allowed at §3 sizes).

---

## 7. Accessibility

**If you are implementing this, your job is:** make every control reachable and operable by keyboard and screen reader, with AA contrast and a visible focus indicator, in every theme.

Quiet does **not** mean low contrast.

- Minimum **WCAG AA** contrast for text and essential icons (4.5:1 normal text, 3:1 large text and essential icons/control boundaries).
- **Visible focus** ring on keyboard navigation.
- **Full keyboard** access to every action.
- **Screen reader** labels on controls (name, role, state).
- Honor **reduced motion** preferences; no essential info only in animation.

- **Effort matters:** contrast checks; tab order; labels on icon-only controls; focus visibility.
- **Out of scope / not important:** exceeding AA (AAA is welcome but not required).
- **Correct:** a 16 px icon button with an accessible name and a visible 2 px focus ring.
- **Avoid:** light-grey labels on white "to look quiet"; icon buttons with no label; focus ring removed via CSS.

**What this is NOT:** the focus ring here is the **control-level indicator**. It does not replace §2 focus levels (surface-level focus, input routing, return). Both are required.

---

## 8. Vector-scalable interface (one rule)

**If you are implementing this, your job is:** ensure the whole interface scales crisply at any resolution and zoom using vector assets and relative tokens, with no separate scaling modes.

**One rule:** the interface is **vector-scalable** — layout, icons, and controls scale cleanly with resolution and user zoom as vectors (or equivalent crisp scaling), without separate "raster" and "vector" product modes. Density tokens above stay proportional when the UI scale factor changes.

- **Effort matters:** vector icons (SVG / icon font / platform vector); tokens multiplied by the UI scale factor; testing at 100%, 150%, 200%.
- **Out of scope / not important:** user content images (photos in a document are content, not UI).
- **Correct:** at 200% zoom, a 28 px control becomes 56 physical px and its 16 px icon stays sharp.
- **Avoid:** blurry PNG toolbar icons; a "High-DPI mode" toggle; layouts that break at 150%.

**What this is NOT:** not a requirement to convert user images to vectors; not a responsive-redesign rule.

---

## 9. Surrounding controls (wording)

**If you are implementing this, your job is:** name supporting UI precisely in code, docs, and reviews, and keep it visually secondary to the core function while fully reachable.

Call supporting UI **surrounding controls**, **interface elements**, **menus**, **toolbars**, or **panels**. Do not use vague slang for the frame around the core function (e.g. "stuff", "bits", "chrome-y things").

Surrounding controls:

- Stay in the background visually (small, discrete, readable at needed size).
- Never steal the foreground from the core function.
- Remain reachable (see §4 and the completeness rule in §1.1).
- Become the active focus surface when the user works in them (§2).

- **Effort matters:** precise terms in component names and docs; secondary visual weight.
- **Out of scope / not important:** renaming existing code identifiers just for wording.
- **Correct:** "Formatting toolbar", "Layers panel", "File menu".
- **Avoid:** "the UI stuff around the editor"; a toolbar louder than the document.

**What this is NOT:** "background" means visual weight, not hidden or inaccessible.

---

## 10. Density and layout

**If you are implementing this, your job is:** group related controls compactly on the §3 spacing scale, keep one clear hierarchy per view, and organize — never delete — nested menus.

- Prefer compact grouping over scattered large hit areas.
- Align to the spacing scale (4/8/12): 4 within a control group, 8 between controls, 12 between groups.
- One clear visual hierarchy per view: core surface → local tools → global app navigation (app menu / sidebar) when needed.
- Nested menus are allowed and expected when the product is complex — organize them; do not delete them for aesthetics.

- **Effort matters:** grouping by task; consistent spacing; menu organization with separators and section labels.
- **Out of scope / not important:** making every screen fit without scrolling.
- **Correct:** a menu with grouped sections and two-level submenus; toolbar groups separated by 12 px.
- **Avoid:** controls scattered across the window; flattening a submenu into an endless top-level list; removing a submenu "for cleanliness".

**What this is NOT:** not "cram everything"; density stays readable and within §3 target sizes.

---

## 11. Feedback and errors

**If you are implementing this, your job is:** show progress, errors, and success at the place they relate to, quietly and actionably, without blocking the core function for short waits.

- Loading: in-place on the control or a small status, not a blocking full-screen takeover for short waits (under ~2 s; longer operations show progress and stay cancellable when possible).
- Errors: actionable text next to the relevant control (what happened + what to do); avoid generic empty alerts.
- Success: quiet confirmation (status or brief toast), not celebratory noise.
- Feedback does not steal focus (§2) unless the user must act on it (e.g. a blocking error dialog).

- **Effort matters:** placement next to the cause; actionable wording.
- **Out of scope / not important:** custom illustrations for empty or error states.
- **Correct:** "Could not save — disk full. Free space or choose another folder." under the Save control.
- **Avoid:** "Something went wrong."; full-screen spinner for a 300 ms request; confetti on save.

**What this is NOT:** not a ban on dialogs for errors that require a decision.

---

## 12. Theming and motion

**If you are implementing this, your job is:** keep AA contrast in every theme and make motion optional, short, and never required to understand state.

- Support light and dark if the product has themes; keep AA contrast in both.
- Motion is optional polish; never required to understand state.
- No decorative animation that delays the core function.
- Theme colors come from tokens, not hard-coded per component.

- **Effort matters:** contrast in all themes; reduced-motion honored.
- **Out of scope / not important:** adding themes the product does not already have; elaborate transitions.
- **Correct:** a 150 ms panel slide that is skipped with reduced motion.
- **Avoid:** a 1 s intro animation before the editor is usable; dark theme with 3:1 body text.

**What this is NOT:** not a requirement to add a dark theme; not a color palette.

---

## 13. AI-assisted UI work

**If you are implementing this, your job is:** change UI toward this document without removing anything, and report what you changed.

When an AI edits UI:

1. Preserve every existing command, menu item, and setting unless the human explicitly removes it.
2. Prefer rearranging and resizing over deleting.
3. Apply the measurable scales and quiet presentation.
4. Do not invent large hero buttons, empty marketing panels, or decorative filler.
5. Treat this document as mandatory — not optional inspiration.
6. Implement focus behavior (§2) as engine logic, not only as styling.
7. Run the §14 checklist and report any item that fails or was out of scope.

- **Effort matters:** a before/after inventory of commands (count must not drop); checklist results.
- **Out of scope / not important:** rewriting unrelated business logic; changing product features.
- **Correct:** "Moved 6 toolbar actions into the Format menu; all 42 commands still present; added focus stack for settings/dialogs."
- **Avoid:** "Simplified the UI" with 10 commands missing; adding a landing page nobody asked for.

**What this is NOT:** not a license to redesign product features; not optional.

---

## 14. Conformance checklist

**If you are implementing this, your job is:** verify every item below before shipping a screen or accepting an AI UI change, and report failures explicitly.

- [ ] Scope: changes were checked for UX (interaction, focus, navigation) **and** UI (visuals) (§0).
- [ ] Core function for **this** app type is visually primary (§1).
- [ ] No needed menu/submenu items were removed for "simplicity" (§1.1, §13).
- [ ] Focus tracks the active window/surface and object level (§2), not only app scope.
- [ ] Every focusable surface (text, settings, menu, image, panel, dialog) registers at its level (§2.5).
- [ ] Input and commands route to the active surface, bubbling outward only if unhandled (§2.3).
- [ ] Closing a surface restores the previous surface, control, and caret; never stranded, never jumps to unrelated global chrome (§2.4).
- [ ] Control heights are 24/28/32; icons 16/20; UI type 12–14; spacing 4/8/12 (§3).
- [ ] Click targets ≥32 px pointer / ≥44 px touch (§3).
- [ ] Supporting controls are small, discrete, and still reachable (§4, §9).
- [ ] Hide patterns use toolbar / panel / popover / palette / shortcuts — not permanent loss (§4).
- [ ] Field changes use compact dropdowns where appropriate (§5).
- [ ] Buttons only for primary or confirm; hierarchy and all states present (§6).
- [ ] AA contrast, visible focus ring, full keyboard, screen-reader labels, reduced motion (§7).
- [ ] Vector-scalable rule applied (one rule) (§8).
- [ ] Density and grouping on the spacing scale; nested menus organized (§10).
- [ ] Feedback in place, actionable errors, quiet success (§11).
- [ ] AA in every theme; motion optional (§12).
- [ ] No vague wording; no immense buttons or oversized icons.
- [ ] Language is general — works for any application, not one product.

---

*Ionuț Application Design Language (design application language · design logic language) — governing UX and UI rules for every application.*
