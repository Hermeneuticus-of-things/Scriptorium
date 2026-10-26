# Dependency updates — D&TED

**Pneuma Sofer** (this product; GitHub repo [Scriptorium](https://github.com/Hermeneuticus-of-things/Scriptorium)) can use **[D&TED](https://github.com/Hermeneuticus-of-things/dted)** as an optional local dictation / transcription engine.

## How D&TED is called today

| Mechanism | Detail |
|-----------|--------|
| Transport | Subprocess: `DTED.exe --serviciu` or `python -m dictare_transcriere_romana --serviciu` |
| Wire | JSON lines on stdin/stdout, **protocol 1** |
| Locator / process manager | `lib/dted.cjs` |
| IPC | `electron/dtedHandlers.cjs` |
| Editor behaviour | `src/lib/useDictation.js`, `src/lib/dictation.js`, `src/components/DictationBar.jsx` |
| Spec | [`docs/DTED.md`](DTED.md) |

There is **no** `package.json` dependency on D&TED and **no** MCP client to D&TED for dictation. (Pneuma’s own MCP server is separate.) Since **v0.9.0**, Pneuma also has a **built-in whisper.cpp** engine; D&TED is the Romanian-optimised optional path (eek model).

## Required: detect and install newer D&TED

**Check frequency:** at app startup, and optionally every few days in the background; plus a **manual** “update D&TED now” action.

**Source of truth:** GitHub Releases for `Hermeneuticus-of-things/dted` and/or a shared **version manifest JSON** (version, protocol, download URL, sha256).

**Install:** user-folder only (no admin). Switch the active D&TED path to the new build.

**Fallback:** if the new D&TED fails to start or fails the protocol handshake, keep the last working version.

**API:** keep protocol versioning so upgrades do not break Pneuma without an explicit prompt.

D&TED tracks the same dependency in [dted issue #15](https://github.com/Hermeneuticus-of-things/dted/issues/15) and `docs/CROSS_PROJECT_PNEUMA.md`.

*Documentation / planning only — 2026-10-26.*


## Status — D&TED update-check build (ON HOLD)

**2026-10-26:** Implementation and rebuild of the in-app D&TED update check (startup/periodic check, non-blocking notification, user-folder install, fallback, Settings button) are **ON HOLD**, not cancelled. The owner will handle the build later.

This file and [`docs/DTED.md`](DTED.md) §8 remain the **reference** for when that work resumes. No application code for the update flow has been added in this note.
