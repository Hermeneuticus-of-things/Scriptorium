---
name: ionut-application-design-language
description: Ionuț Application Design Language (also "design application language" / "design logic language") — UX and UI rules for every app. For ANY AI (OpenCode, Claude, Cursor, GitHub Copilot, Grok Bot, or any other). At the start of every new project, before any UI work, ask the caller yes/no whether to use this design language; apply it only on yes. Covers focus levels (active surface + level, routing, return), core function, complete menus, scales, dropdowns, a11y, Hallmark visual floor, maintenance.
---

# Ionuț Application Design Language — skill

*Also recognized as:* **design application language** (app-facing) and **design logic language** (tool/engine logic). Full source: `IONUT_APPLICATION_DESIGN_LANGUAGE.md`. This skill is the same rules, condensed; on any doubt the full file wins. Tool-agnostic: plain Markdown, loadable as a skill, rules file, project instruction, or by reading it.

**Scope:** UX as well as UI — interaction, focus, movement through the app, engine state, and visuals. **Acceptance bar:** with only the full document plus the codebase you can implement everything; no external references needed.

## Step 1 — Adoption: ask first (mandatory for any AI)

At the start of **every new project** (new repo, new app, or a new product area the caller calls a new project), **before** proposing layouts or writing UI code, ask exactly this, as a yes/no widget if your tool has one, else as one clear question:

> **Use the Ionuț Application Design Language for this project? (yes / no)**
> It covers UX and UI: focus levels, core function in front, complete menus, compact controls, the Hallmark opaque foundation (Liquid Glass only as chrome effects).

- **Yes** → follow every rule below (and the full file), run the checklist before handing over UI work. Record `Design language: Ionuț ADL — yes` in README / `AGENTS.md` / project instructions.
- **No** → do not apply; do not bring it up again unless asked. Record `Design language: Ionuț ADL — no`.
- **No answer yet** → no UI work; non-UI work is fine.
- **Never assume silently** — not from past projects, memory, or because this skill is installed. Ask once per project, not per task.

## Glossary (one meaning each)

**Core function** — the app's primary job, product-wide foreground (writing app → editor). **Surface** — any region the user works in (editor, settings, menu, dropdown, image viewer, panel, list, dialog, palette). **Active surface** — the one surface owning input, commands, emphasis now; one per window. **Focus level** — app → window → surface → object. **Focus** — always this level-based focus; the control indicator is the **focus ring**. **Selection** — what is chosen inside a surface; not focus. **Trigger** — what opened a surface. **Surrounding controls** — menus, toolbars, panels, status bars (never "chrome"). **Hallmark visual foundation** — warm, opaque, line-art, content-first base under everything; Liquid Glass is an effect layer on surrounding controls only (§15.6).

## Implementer job lines (all sections)

- §0 Scope — apply rules to how the app behaves and how it looks, never one without the other.
- §1 Adoption — ask the yes/no question at project start; apply fully on yes, not at all on no.
- §2 Focus levels — know the active surface; route input, commands, emphasis to it at its level; move focus in on open; return exactly on leave.
- §3 Core function — name it, give it the largest area and priority, make it active on window open, keep every surrounding control.
- §4 Scales — named tokens; replace off-scale sizes with the nearest token.
- §5 Disappear vs available — every hidden control returns from a fixed place; never remove a command's last access path.
- §6 Dropdowns — compact dropdowns for choosing values; exceptions untouched.
- §7 Buttons — visible buttons only for primary/confirm; secondary in menus/icons/palette; six states.
- §8 Accessibility — keyboard + screen reader everywhere, AA contrast, visible focus ring, every theme.
- §9 Vector-scalable — crisp at any zoom via vectors and scaled tokens; no scaling modes.
- §10 Surrounding controls — precise names; visually secondary; reachable; can become active surface.
- §11 Density — group on 4/8/12; one hierarchy per view; organize, never delete, nested menus.
- §12 Feedback — at the cause, quiet, actionable, non-blocking for short waits, never stealing focus.
- §13 Theming/motion — tokens on the Hallmark foundation; AA in every theme; motion optional and short.
- §14 AI-assisted UI — change toward this doc without removing anything; focus as engine logic; report command count + checklist.
- §15 Hallmark — draw every surface on the warm opaque line-art floor so the active surface and core function are obvious.
- §16 Maintenance — update incrementally in the same pattern; mirror to .md, .SKILL.md, desktop-user-interface every time.
- §17 Checklist — verify every item; report failures.

## §2 Focus levels (core)

**Rule (caller's words):** focus is not only on the app's overall purpose; it is on the **active window** and the **level of the object**. Writing text → focus on the text. Into settings → focus on settings. Settings for something else, a menu for something else, a window or image for something else → focus on that. Each task/window gets its own focus at its level. **The active window owns the work**; the app never moves focus on its own except opening/closing surfaces and blocking feedback.

**Levels:** app → window → surface → object. Each top-level window has its own focus stack; exactly one active surface per window; outer levels stay visible and reachable.

**Receiving focus = all three:** (1) input routing to the active surface first; (2) command dispatch active surface first, then bubble outward if unhandled; (3) visual emphasis — active header/selection; inactive only neutral header/selection, never hidden, blurred, dimmed below AA, or stripped.

**Focus ≠ selection:** store separately. Do: paragraph stays selected (inactive color) while Settings has focus; restored active on return. Don't: clear selection on blur; route `Delete` to a selected row while user types in the editor; same color for both.

**Open → in:** push and activate immediately. Initial target: last-focused control this session → search field → first editable control → surface container; never Close or destructive. Modal: `Tab` trapped, background inert. Non-modal: `Tab`/`F6`/click move between siblings.

**Close → back:** restore previous surface (usually the trigger's) + control/trigger, caret, selection, scroll. If gone → nearest open parent's last object. Never focus on nothing (after deleting a focused row → next, else previous, else list). Never jump to app-level controls unless the whole work level closed. Siblings remember their own state. `Escape` closes innermost transient first (dropdown → menu → popover → dialog → non-modal surface), one per press; no-op in the core function at window level; IME composition owns `Escape`.

**Engine:**
```
FocusState { stack: FocusEntry[] (per window; top = active), registry }
FocusEntry { surfaceId, level, triggerId?, lastFocusedControlId?, caret?, scroll?, selection? }
SurfaceRegistration { id, level, parentId, modal, commands, initialFocus?, onFocus, onBlur }
registerFocusableSurface(reg) -> unregister
pushFocus(id, triggerId) | popFocus(id) (also pops children) | switchFocus(id) | dispatch(cmd, args) | onSurfaceDestroyed(id)
```
Ids: `<kind>.<scope>[.<instanceId>]` — `editor.document.<docId>`, `settings.app`, `settings.document.<docId>`, `settings.plugin.<id>`, `menu.<id>`, `dropdown.<fieldId>`, `dialog.<id>`, `panel.<id>`, `image.viewer.<assetId>`, `palette.commands`, `window.<windowId>`.
Rules: `stack.top` is the single source of truth; native focus is synced to it (web `focus({preventScroll:true})` + `inert`; Qt `setFocus`; WPF `FocusManager`); wrap an existing framework focus manager, don't duplicate; pointer clicks call push/switch; **toolbar button clicks dispatch to the active surface and do not take focus** (toolbar is active only when entered by keyboard); unregistered input surfaces are bugs.
Tests: open→close restores caret; settings→dropdown→dialog then 3× `Escape` reverses; parent close pops children; dispatch + bubbling; delete row → next row; toolbar click keeps editor focus; two windows, two stacks.

**Commands:** local to active surface — find, select all, copy/cut/paste, delete, navigation, field undo/redo, Escape/close, surface-specific actions. Bubble to window — save, save as, print, export, close document. Bubble to app — new, open, quit, preferences, toggle panels, palette, help. Menus/palette list active surface's commands first.

**Reference: Settings in a writing app.** Id `settings.document.<docId>` or `settings.app`, level surface, parent = window. Non-modal panel/page when live effect on text helps; modal only for one-shot confirmed choices; app preferences may be a separate window (own stack). Open via menu/gear/shortcut → `pushFocus` → search field or first field. Groups with labels, §6 fields, ≤1 primary button; apply live with per-field reset unless expensive/irreversible (then Apply/Cancel). `find/reset/close` local; `save/export` → window; `palette/quit` → app. Close → editor caret, selection, scroll restored.

**Emphasis tokens:** `focus.surface.header.text` active `text.primary` / inactive `text.secondary`; `focus.surface.border` 1 px `border.active` or 2 px top accent / 1 px `border.subtle`; `selection.bg` `selection.active.bg` / `selection.inactive.bg`; `focus.ring` 2 px on focused control; content text always full contrast. No blur/opacity/animation required.

**Reinforcements:** dense panels keep full keyboard rigor (Carbon); same model across platforms and inputs (Fluent); patterns, not just components (Polaris).

**Effort:** tracking, routing, dispatch, exact return, focus vs selection, registration, tests. **Out of scope:** transition animation, header hue, framework choice, persisting the stack across restarts.

**NOT:** focus rings alone; one global focus forever; stripping menus; the same as §3; platform keyboard-only guidance; distraction-free mode.

## §3 Core function + completeness

Writing → editor; news → news; email → emails; AI → the interaction; image editor → the image. Largest area, highest contrast, active on window open; stays visible/readable when another surface is active. **Never strip** commands, menus, submenus, settings unless the owner explicitly removes them; when unsure keep. Correct: full menu bar intact; all AI commands in one AI menu. Avoid: deleting Export submenu; dashboard pushing editor below the fold. NOT minimalism by deletion.

## §4–§14 Practical rules (condensed)

- **§4 Scales:** control 24/28/32 px; icons 16/20; UI type 12–14 (content text exempt); spacing 4/8/12; one radius 4–8; padding 4–8; toolbar 32–40; targets ≥32 pointer / ≥44 touch (hit area may exceed visual); named tokens. Avoid 56 px buttons, 32 px toolbar icons.
- **§5 Disappear vs available:** toolbar → collapsible panels → popover → palette → shortcuts. Hide only if an equal path remains (shortcut alone is not enough). Test: every command always has a menu item, palette entry, or visible toolbar button. Popover/palette open = `pushFocus`.
- **§6 Dropdowns:** toggle for on/off; dropdown 3+ choices; segmented or dropdown for 2; inline edit for typed text/numbers; width ≤280–320; items at control height; search >12 items; arrows/Enter/Escape/typeahead; selected not by color alone; open dropdown = active surface `dropdown.<fieldId>`, close returns to trigger. Exceptions: primary commits, live readouts, steppers, free text.
- **§7 Buttons:** primary or confirm only; ≤1 primary per surface; primary/secondary/tertiary/destructive; hover·focus·active·disabled·loading·error; confirm irreversible destructive, prefer undo; default control never destructive.
- **§8 Accessibility:** AA (4.5:1 text, 3:1 large/icons/boundaries); 2 px focus ring; full keyboard; name/role/state; announce active-surface changes; reduced motion. Ring ≠ §2.
- **§9 Vector-scalable:** vector icons; tokens × scale; test 100/150/200%; no "High-DPI mode"; user images exempt.
- **§10 Surrounding controls:** say surrounding controls / interface elements / menus / toolbars / panels; quiet, reachable; become active surface when worked in (except pointer toolbar clicks).
- **§11 Density:** 4 inside group, 8 between controls, 12 between groups; core → local tools → app navigation; organize nested menus, never delete.
- **§12 Feedback:** in place; no takeover <2 s; long ops show progress, cancellable; errors = what happened + what to do, next to cause; quiet success; never steal focus unless blocking (then push/pop per §2.5).
- **§13 Theming/motion:** tokens on the Hallmark foundation; AA in all themes; dark theme stays warm; motion ≤~200 ms, skipped under reduced motion.
- **§14 AI-assisted UI:** preserve every command; rearrange over delete; apply scales + Hallmark; no hero/filler; doc is mandatory; §2 as engine logic; report command count before/after + checklist.

## §15 Hallmark visual foundation

Not a separate product language — the **warm opaque foundation under** this language (§2 decides where attention goes; Hallmark how it looks). Source: Scriptorium `assets/readme/` (`hero.png`, `corkboard.png`, `aimenu.png`, related shots and SVGs) and Hallmark code comments (line icons, no emoji in controls, warm brown/copper, anti-slop). Older `DESIGN_LANGUAGE.md` (Hallmark) rules are carried here; this doc wins on conflict.

Look: warm paper ground `#F3EFE6`, cards/page `#FFFEF6`, text `#1F1B16` / `#3D362D`; matte cork `#B98F5F` boards with index cards and muted-red stamped status labels; copper/warm-brown accent for marks; selection may follow OS accent via tokens; single-weight line icons 16/20 px, no emoji in menus/toolbars/status; serif for content and README headlines, sans 12–14 for UI; content-first screenshots of the real app (no fake frames, kickers, gradients, AI orbs); opaque matte surfaces, 1 px borders, small radius, at most soft shadow.

Reinforces focus: active surface = brightest paper + full-contrast header; inactive = neutral header/selection, content readable; surrounding controls quiet; cork/card warmth only on content surfaces; one complete AI menu = complete, grouped, quiet, active when open.

**Liquid Glass — effect layer (adopted hybrid with Hallmark):** Roles are split — do not merge into one material. **Hallmark** = warm **opaque** foundation (corkboard/paper, line-art, content panels). **Liquid Glass effects** (translucency, depth, specular highlights, adaptive surfaces) apply **only** on chrome/overlays floating above that base (toolbars, menus, popovers, floating panels) — never as the fill of content or the core-function surface. Retained principle: chrome stays secondary to content. If an effect drops AA contrast over the Hallmark base, reduce or drop the effect. Correct: opaque editor + lightly translucent floating toolbar. Avoid: glass-filling the window; see-through text surfaces; blending Hallmark warmth and glass into one material.

## §16 Maintenance

Update when a new app is built or a rule changes: add to the existing structure (subsection, row, example), don't rewrite from zero; keep the pattern (rule · job line · effort/out of scope · correct/avoid · what this is NOT); add new terms to the glossary first; recorded decisions change only by the caller. Mirror every change to `IONUT_APPLICATION_DESIGN_LANGUAGE.md`, this `.SKILL.md`, and the `desktop-user-interface` copy (and repos carrying it). Unmirrored = not done. After edits check numbering, cross-references, checklist.

## §17 Checklist (run before shipping UI)

Adoption asked + recorded · UX and UI checked · every input surface registered with id pattern · routing + bubbling · open moves focus in, modals trap Tab · close restores surface/control/caret/scroll, never stranded, no jump to app-level · focus ≠ selection · toolbar clicks keep focus, per-window stacks · focus tests pass · core function primary and active on open · nothing stripped · scales/targets · hidden controls reachable · dropdowns · buttons + six states · AA, ring, keyboard, SR labels, reduced motion · vector at 100/150/200% · precise wording · density/menus · feedback in place without stealing focus · color tokens, AA all themes · Hallmark opaque base + Liquid Glass effects only on chrome (line icons, no emoji) · mirrored.

**Closing:** the full document stands alone with the codebase — no other design doc or external guideline is needed to implement it. If something can't be implemented as written, fix the document (§16), don't improvise.
