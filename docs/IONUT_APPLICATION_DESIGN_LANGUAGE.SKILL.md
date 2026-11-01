---
name: ionut-application-design-language
description: General UI design language for any application — core function foreground, focus levels (active window and object level), complete menus, quiet discrete controls, measurable scales, dropdowns, button hierarchy, accessibility, vector-scalable as one rule. Use when designing or redesigning any app UI, menus, toolbars, or reviewing AI-generated interface changes.
---

# Ionuț Application Design Language

This is a **general application design language**. It applies to **every application**, any app, any project. Follow it exactly when designing, redesigning, or reviewing UI.

**Purpose:** eliminate generic, noisy, AI-generated interface slop. Put the app’s real work in front; keep supporting controls quiet, complete, and reachable.

## 1. Core function (varies by app type)

Define the **core function** first. It occupies the foreground.

Examples (same language for all app types):

- Writing app → writing
- News app → showing news
- Email app → showing emails
- AI app → the AI interaction
- Any other app → that app’s primary job

### Completeness is required — do not strip controls

Foreground core function does **not** mean removing controls. Do **not** simplify menus by deleting items the user needs. Keep complex menus, submenus, and sub-submenus; arrange them with clear layout. Stripping needed items violates this language. Completeness of functionality is required; only visual presentation should be quiet and organized.

## 2. Focus levels

Focus is **not only** the app’s overall purpose. It also tracks the **active window** and the **level of the object**.

- Writing text → focus on that text.
- Open settings from that text → focus shifts to settings.
- Open another settings/panel → focus shifts there.

**Rule:** focus the active level (core task *or* intermediate surface that needs detail). Follow both the active window and the object’s level — not only the app’s global scope. When the user leaves an intermediate surface, return focus to the core function (§1).

## 3. Measurable scales

- Control height: **24 / 28 / 32 px**
- Icons: **16 / 20 px**
- UI typography: **12–14 px**
- Spacing: **4 / 8 / 12 px**
- Corner radius: **4–8 px**
- Control padding: **4–8 px**
- Toolbar height: **32–40 px**
- Min click target: **32 px** pointer · **44 px** touch

No immense buttons. No oversized icons.

## 4. Disappear vs stay available

Controls stay available. Prefer: minimal persistent toolbar; collapsible panels; popover/overlay; command palette; keyboard shortcuts. Hide only when another discoverable path remains. Reappear from the same entry point every time.

## 5. Dropdown specifications

Prefer compact dropdowns for field value changes.

- Enumerations/modes/presets/sort/filter/status/view → dropdown
- Binary → toggle; free text/numbers → inline edit
- Max width ~280–320 px; item height matches control height
- Search/filter above ~12 items; arrow/Enter/Escape/typeahead
- Clear selected state; optional grouping
- Exceptions: primary commit, live data, steppers, free text

## 6. Buttons and actions

Buttons only for **primary action** or **confirmation**. No huge buttons. Secondary actions in menus, small icons, or command palette. Hierarchy: primary / secondary / tertiary / destructive. States: hover, focus, active, disabled, loading, error. Confirm irreversible destructive actions.

## 7. Accessibility

Quiet ≠ low contrast. Min WCAG AA. Visible focus. Full keyboard. Screen reader labels. Honor reduced motion.

## 8. Vector-scalable interface (one rule)

The interface is **vector-scalable**: layout, icons, and controls scale cleanly with resolution and zoom. One rule — not separate raster/vector modes. Density tokens stay proportional to UI scale.

## 9. Surrounding controls (wording)

Say surrounding controls, interface elements, menus, toolbars, panels. Supporting UI stays visually background, discrete, readable, and reachable.

## 10. Density and layout

Compact grouping; spacing 4/8/12; clear hierarchy. Nested menus allowed — organize, do not delete.

## 11. Feedback and errors

Short waits: in-place/status. Errors: actionable next to the control. Success: quiet.

## 12. Theming and motion

AA in every theme. Motion optional; never required to understand state.

## 13. AI-assisted UI work

1. Preserve every command/menu/setting unless the human removes it.
2. Prefer rearrange/resize over delete.
3. Apply scales and quiet presentation.
4. No hero buttons, marketing filler, or decorative empty panels.
5. This document is mandatory.

## 14. Conformance checklist

- [ ] Core function for this app type is primary
- [ ] Focus tracks active window and object level (§2)
- [ ] No needed menu items removed for “simplicity”
- [ ] Heights 24/28/32; icons 16/20; type 12–14; spacing 4/8/12; targets 32/44
- [ ] Supporting controls small, discrete, reachable
- [ ] Hide via toolbar/panel/popover/palette/shortcuts only
- [ ] Focus levels per §2; dropdowns per §5; buttons per §6; a11y per §7
- [ ] Vector-scalable one rule applied
- [ ] General language — any application

*Ionuț Application Design Language — governing UI rules for every application.*

