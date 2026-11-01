# Hallmark design language — every application

**This document IS Hallmark.** Hallmark and this design language are one system, not two add-ons. Any UI, README, icon, or surface work under Hallmark must follow these rules. Any future AI or human working on any of the caller’s applications must follow them.

Applies to **every application** built from now on (Scriptorium / Pneuma Soft, Havis, Grokbox, and all future apps). Not limited to one product.

Source: owner voice call-543328d8 (2026-11-01, Europe/Paris), plus the owner’s chat completion note (design-system gaps). Rewritten so wording cannot be misread.

---

## Core principle

The application’s **core function** is always the **foreground**.

Everything that supports that function lives in the **background**: small, discrete, readable only at the size needed, never large, never prominent, never occupying space.

**Surrounding controls and interface elements do not disappear.** They remain reachable whenever the user needs them, but they serve silently.

- No immense buttons.
- No oversized icons.
- Prefer **compact dropdown menus** over buttons when changing field values.
- The interface should feel **quiet**, so attention stays on the **work itself**, not on surrounding controls and interface elements.

### Romanian statement (same call — general form)

> Principiul de design: scrierea textului este în prim-plan. Toate butoanele, meniurile și elementele de interfață rămân disponibile, dar discrete, în fundal — mici, doar cât să le citești, fără să ocupe spațiu. Nu dispar, pentru că utilizatorul le poate avea nevoie oricând. Rolul lor este să servească în background, nu să apară în față.

*(For a writing app, “core function” is writing text. Every other app must name its own core function explicitly — see below.)*

---

## Words that must not be used

| Do **not** say | Say instead |
| --- | --- |
| chrome (sounds like the Chrome browser) | surrounding controls, interface elements, UI surroundings |
| “Hallmark vs design language” as separate things | Hallmark design language (one system) |
| “Pneuma-only” framing for these rules | every application |

Never introduce the word “chrome” to mean UI.

---

## Vector-scalable interface (one concept)

**Vectorial redimensionabil** is **one** rule, not two:

The UI is **vector-scalable**: when the window or surface is resized, the interface scales as vectors — crisp at any size, not as stretched raster bitmaps.

- Windows and the application must be **resizable**.
- Graphics, icons, and UI chrome equivalents must stay sharp under resize (SVG / vector paths / scalable layout — not pixel-bake that blurs).
- Do not treat “vectorial” and “redimensionabil” as separate checklist items; they describe the same requirement.

---

## Governing rules (normative)

1. **Core work is foreground.** Whatever the app exists to do gets attention first. Nothing else competes with it.
2. **Each app MUST declare its core function** and its foreground zone in its own README or `DESIGN.md` (one short sentence). Without that declaration, “core work” is too vague to enforce.
3. **Supporting UI stays available but background.** Buttons, menus, toolbars, side panels, and other surrounding controls remain available — the user may need them anytime — but stay small, discrete, and silent. They must not steal focus from the work.
4. **Minimal size.** Controls are only large enough to read and use. No wasted space. Never prominent. Never occupying the foreground.
5. **No large buttons. No oversized icons.**
6. **Field changes → compact dropdowns** unless an exception below applies.
7. **Quiet interface.** Attention stays on the work.
8. **Vector-scalable interface** (see above).
9. **Hallmark = this document.** Hallmark work without these rules is incomplete.

---

## Available vs occupying space (how controls stay reachable)

“Do not disappear” and “do not occupy space” together mean:

| Pattern | Use when |
| --- | --- |
| Persistent minimal toolbar | Always-needed actions; keep visually small |
| Collapsible panels | Secondary tools; collapsed by default if they compete with work |
| Popover / overlay | Short contextual choices; dismiss easily |
| Command palette | Power actions without permanent buttons |
| Keyboard shortcuts | Primary path for frequent actions |
| Hide-on-focus / distraction-free | Only if there is an obvious, documented way to restore controls |

Controls may collapse or tuck away; they must not become unreachable. Never remove a control with no path back.

---

## Dropdowns (compact)

Prefer compact dropdown menus for **enumerated field values** (status, mode, style preset, alignment, theme, etc.).

| Prefer dropdown | Prefer something else |
| --- | --- |
| Choosing among a fixed set of values | Primary confirm action → small button |
| Long enum with search | Free text → inline edit / text field |
| Grouped options | On/off → compact toggle |
| | Dates / numbers → appropriate compact picker or stepper |

Requirements for dropdowns:

- Compact item height; no tall “hero” rows.
- Max panel width tied to content; for long lists, include type-ahead / search.
- Full keyboard navigation; clear selected state; optional grouping.
- Do not replace dropdowns with large button grids for the same job.

---

## Buttons and actions

- Use a visible button for a **primary action** or **confirmation**, not for every field change.
- Secondary / tertiary actions: small menus, small icons, or the command palette.
- Hierarchy: primary / secondary / tertiary / destructive — destructive never looks “friendly large”.
- States required: hover, focus, active, disabled, loading, error — all discrete, none oversized.

---

## Measurable scale (proposed defaults — ratify per app)

Until an app publishes its own tokens, use these **proposed** Hallmark defaults (owner chat completion 2026-11-01). Apps SHOULD replace “small / compact” talk with tokens:

| Token idea | Proposed default |
| --- | --- |
| Control height | 24 / 28 / 32 px |
| Icons | 16 / 20 px |
| UI type | 12–14 px |
| Spacing | 4 / 8 / 12 px |
| Pointer hit area | ≥ 32 px (visual control may be smaller) |
| Touch hit area | ≥ 44 px |
| Motion | 120–200 ms, no bounce, orientation only |

**Quiet does not mean low contrast.** Accessibility is mandatory:

- Contrast at least WCAG AA for text and essential controls
- Visible focus
- Full keyboard navigation
- Screen-reader labels
- Respect `prefers-reduced-motion`
- Hit areas may be larger than the visible glyph

---

## Layout, density, feedback, motion

- Prefer **compact** density for tools; offer comfortable only if needed.
- On small screens: surrounding controls tuck (collapse / overlay); core work keeps the largest share of space.
- Supporting UI must not permanently cover the work surface.
- Loading / empty / error / success / offline / permission-denied: discrete, clear, no huge modals, no focus-stealing toast storms.
- Motion only for orientation (show where something went), never for spectacle.

---

## Design tokens and shared components (direction)

Hallmark becomes a **design system** when rules are implemented as shared tokens and reference components — not reinvented per app:

- CSS variables / JSON tokens for size, type, space, color
- Reference components: toolbar, dropdown, menu, side panel, inline edit, command palette
- No app invents one-off giant controls “because it looked modern”

Until the shared library exists, apps MUST still obey the visual rules above.

---

## Anti-patterns

**Do not:**

- Oversized “hero” buttons or icons
- Field value changes only via large button bars
- Raster icons that blur on resize
- Hiding controls with no restore path
- Using the word “chrome” for UI
- Treating Hallmark and this file as separate optional layers
- Flashy motion or low-contrast “quiet” that fails accessibility

**Do:**

- One declared core function per app
- Small, reachable surrounding controls
- Compact dropdowns for enums
- Vector-scalable, resizable windows
- Checklist review before shipping UI

---

## Governance

- **Owner** ratifies exceptions and token defaults.
- Version this file when rules change; apps pin or follow latest Hallmark design language.
- Deviation requires an explicit owner exception note in the app’s docs.
- Soft UI / Hallmark UI work: present and implement these as **Hallmark rules**, never as a separate optional add-on.
- Before merge of UI work: run the compliance checklist below.

---

## Compliance checklist

- [ ] App declares its **core function** and foreground zone
- [ ] Core function is visually dominant
- [ ] No oversized buttons or icons
- [ ] Enum fields use compact dropdowns (or documented exception)
- [ ] Surrounding controls remain reachable without competing with work
- [ ] Interface is **vector-scalable** (crisp when resized) and windows are resizable
- [ ] Contrast and focus meet AA / visible focus
- [ ] Keyboard paths exist for frequent actions
- [ ] No use of the word “chrome” for UI in docs or code comments meant for humans
- [ ] Change framed as **Hallmark**, not a parallel design track

---

## Tracking

- Scriptorium issue (Hallmark design language): https://github.com/Hermeneuticus-of-things/Scriptorium/issues/41
- Related formatting (not this file): https://github.com/Hermeneuticus-of-things/Scriptorium/issues/40
- Local SoT path on HpHavis: `C:\Users\Ionut\Clona-Havis\docs\DESIGN_LANGUAGE.md`
- Copies belong in each product repo under `docs/DESIGN_LANGUAGE.md` (Hallmark), linked from that repo’s ROADMAP or README

---

## For future AI readers

1. This file **is** Hallmark. Do not invent a second design track.
2. Apply to **all** apps, not one named product.
3. Never use “chrome” for UI; say **surrounding controls** / **interface elements**.
4. **Vectorial redimensionabil** = one vector-scalable resize rule.
5. Do not make controls large to look modern or “AI-generated.”
6. Do not remove controls from reach; keep them available and silent.
7. Prefer measurable tokens over adjectives once defaults are ratified.
