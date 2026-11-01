# Ionuț Application Design Language

This is a **general application design language**. It applies to **every application**, any app, any project — writing tools, news readers, email clients, AI assistants, dashboards, and thousands of other app types. The rules are identical regardless of product name or domain.

**Purpose:** eliminate generic, noisy, AI-generated interface slop. Put the app’s real work in front; keep supporting controls quiet, complete, and reachable.

---

## 1. Core function (varies by app type)

Define the **core function** of the application first. That function occupies the foreground. Everything else supports it.

Examples (same language for all):

| App type | Core function in the foreground |
|----------|----------------------------------|
| Writing app | Writing |
| News app | Showing news |
| Email app | Showing emails |
| AI app | The AI interaction |
| Any other app | That app’s primary job |

The design language does **not** change with app type. Only which surface counts as “core” changes.

### Completeness is required — do not strip controls

Putting the core function in the foreground does **not** mean removing controls. An AI (or designer) must **not** “simplify” menus by deleting items the user needs. Even when tasks, menus, submenus, and sub-submenus are complex, **keep them all** and arrange them with a clear layout. Stripping needed menu items violates this design language. **Completeness of functionality is required;** only the visual presentation should be quiet and organized.

---

## 2. Focus levels

Focus is **not only** the application’s overall purpose or core task. It also tracks the **active window** and the **level of the object** the user is working on.

Examples:

- Writing text → focus is on that text.
- Opening settings from that text → focus shifts to settings so they can be configured with the same clarity and detail.
- Opening settings (or another panel) for something else → focus shifts to that surface.

**Rule:** when the user is in the core task, keep focus there. When they enter an intermediate surface that itself needs detail — settings, inspectors, panels, dialogs — focus the **active level**, not only the app’s global scope. Focus must follow both the active window and the object’s level.

This does not replace §1: the core function still defines the product. It requires that intermediate levels receive real focus while they are active, then return focus to the core surface when the user leaves them.

## 3. Measurable scales

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

---

## 4. Disappear vs stay available

Supporting controls stay **available**; they must not vanish permanently.

Preferred patterns:

1. **Minimal persistent toolbar** — always-visible strip of the few actions used constantly.
2. **Collapsible panels** — hide density, not capability; restore in one click or shortcut.
3. **Popover / overlay** — temporary detail without leaving the core surface.
4. **Command palette** — keyboard-first access to the full command set.
5. **Keyboard shortcuts** — every frequent action has a shortcut; document them.

**When a control may hide:** only when another equally discoverable path remains (toolbar overflow, menu, palette, or shortcut).  
**How it reappears:** same entry point every time; no scavenger hunt; state remembered for the session when useful.

---

## 5. Dropdown specifications

Prefer **compact dropdown menus** for changing a field value (instead of large button rows or icon banks).

| Topic | Rule |
|-------|------|
| Field types | Enumerations, modes, presets, sort/filter, status, view options |
| Dropdown vs toggle | Toggle for binary on/off; dropdown for 3+ choices |
| Dropdown vs inline edit | Inline edit for free text and numbers the user types |
| Max width | Fit content; cap ~280–320 px unless list labels need more |
| Item height | Match control height (24/28/32 px) |
| Long lists | Add search/filter above ~12 items |
| Keyboard | Arrow keys, Enter to select, Escape to close, typeahead |
| Selected state | Clear check or highlight; do not rely on color alone |
| Grouping | Optional section labels for related items |
| Exceptions | Primary commit actions, live data readouts, numeric steppers, and free-text fields are **not** forced into dropdowns |

---

## 6. Buttons and actions

- Buttons are for a **primary action** or an explicit **confirmation**.
- No huge buttons.
- Secondary actions live in menus, small icons, or the command palette.
- Hierarchy: **primary / secondary / tertiary / destructive**.
- States (every actionable control): **hover · focus · active · disabled · loading · error**.

Destructive actions require confirmation when irreversible.

---

## 7. Accessibility

Quiet does **not** mean low contrast.

- Minimum **WCAG AA** contrast for text and essential icons.
- **Visible focus** ring on keyboard navigation.
- **Full keyboard** access to every action.
- **Screen reader** labels on controls (name, role, state).
- Honor **reduced motion** preferences; no essential info only in animation.

---

## 8. Vector-scalable interface (one rule)

**One rule:** the interface is **vector-scalable** — layout, icons, and controls scale cleanly with resolution and user zoom as vectors (or equivalent crisp scaling), without separate “raster” and “vector” product modes. Density tokens above stay proportional when the UI scale factor changes.

---

## 9. Surrounding controls (wording)

Call supporting UI **surrounding controls**, **interface elements**, **menus**, **toolbars**, or **panels**. Do not use vague slang for the frame around the core function.

Surrounding controls:

- Stay in the background visually (small, discrete, readable at needed size).
- Never steal the foreground from the core function.
- Remain reachable (see §4 and the completeness rule in §1).

---

## 10. Density and layout

- Prefer compact grouping over scattered large hit areas.
- Align to the spacing scale (4/8/12).
- One clear visual hierarchy per view: core surface → local tools → global app navigation (app menu / sidebar) when needed.
- Nested menus are allowed and expected when the product is complex — organize them; do not delete them for aesthetics.

---

## 11. Feedback and errors

- Loading: in-place on the control or a small status, not a blocking full-screen takeover for short waits.
- Errors: actionable text next to the relevant control; avoid generic empty alerts.
- Success: quiet confirmation (status or brief toast), not celebratory noise.

---

## 12. Theming and motion

- Support light and dark if the product has themes; keep AA contrast in both.
- Motion is optional polish; never required to understand state.
- No decorative animation that delays the core function.

---

## 13. AI-assisted UI work

When an AI edits UI:

1. Preserve every existing command, menu item, and setting unless the human explicitly removes it.
2. Prefer rearranging and resizing over deleting.
3. Apply the measurable scales and quiet presentation.
4. Do not invent large hero buttons, empty marketing panels, or decorative filler.
5. Treat this document as mandatory — not optional inspiration.

---

## 14. Conformance checklist

Before shipping a screen or accepting an AI UI change, verify:

- [ ] Core function for **this** app type is visually primary.
- [ ] Focus tracks active window and object level (§2), not only app scope.
- [ ] No needed menu/submenu items were removed for “simplicity.”
- [ ] Control heights are 24/28/32; icons 16/20; UI type 12–14; spacing 4/8/12.
- [ ] Click targets ≥32 px pointer / ≥44 px touch.
- [ ] Supporting controls are small, discrete, and still reachable.
- [ ] Hide patterns use toolbar / panel / popover / palette / shortcuts — not permanent loss.
- [ ] Field changes use compact dropdowns where appropriate (§5).
- [ ] Buttons only for primary or confirm; hierarchy and states present.
- [ ] AA contrast, visible focus, keyboard, screen-reader labels, reduced motion.
- [ ] Vector-scalable rule applied (one rule).
- [ ] No vague wording; no immense buttons or oversized icons.
- [ ] Language is general — works for any application, not one product.

---

*Ionuț Application Design Language — governing UI rules for every application.*

