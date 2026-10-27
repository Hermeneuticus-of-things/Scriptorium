# Pneuma Sofer ÔÇö core product requirements

**Status:** accepted (2026-10-26)  
**Repo:** Scriptorium (Pneuma Sofer)  
**Companion:** `docs/ARCHITECTURE.md` (shared D&TED engine; UI-only shell)

These requirements sit alongside the architecture decision that Pneuma uses the D&TED motor as-is and owns only its graphical interface.

---

## 1. Read-only / viewer mode (no editing required)

Pneuma Sofer **must be able to work without editing**.

- The app must support a **read-only / viewer mode** in which the user can open and read documents with **no editing capability enabled**.
- Viewing manuscripts, research binder items, and related materials must remain fully usable when editing is off or unavailable.
- This is a **core product requirement**, not an optional polish item. It ranks with the D&TED engine integration as a foundational capability.
- Implementation details (how the mode is toggled, what chrome is hidden, how projects are opened locked) are deferred; this note records the requirement only.

---

## 2. Dictation is optional

Pneuma Sofer **must work fully without dictation**.

- Dictation (via the shared D&TED / ASR engine) is a **feature that may be absent** without breaking the application.
- On weaker computers where D&TED cannot run, models are missing, CUDA/CPU budgets are insufficient, or the user never installs the engine, Pneuma must still function as a **document editor and/or viewer**.
- Menus and commands that depend on D&TED should degrade gracefully (disabled with a clear explanation), matching the existing pattern in `docs/DTED.md` for ÔÇ£D&TED not installedÔÇØ.
- Absence of dictation must not block: opening projects, reading, editing (when not in viewer mode), export/compile, and other non-ASR features.

---

## Record

Written 2026-10-26 next to `ARCHITECTURE.md` so future UI and packaging work do not assume that editing or dictation is always available.
