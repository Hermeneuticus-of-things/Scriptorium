# Architecture decision: Pneuma Sofer and the D&TED engine

**Status:** accepted (2026-10-26)  
**Product:** Pneuma Sofer (Electron/React; repo Scriptorium)  
**Engine:** D&TED ÔÇö Dictare ╚Öi Transcriere Express Digital (`Hermeneuticus-of-things/dted`)

## Decision

Pneuma Sofer **does not ship or fork its own speech/transcription engine**. It uses the **D&TED engine as-is** (identical motor: same `DTED.exe` / `--serviciu` binary and models that a standalone D&TED install would use). Pneuma provides **only its own graphical interface** on top (editor, binder, settings, dictation bar, import/transcribe UX).

When D&TED improves (native C++ pipeline, Parakeet ASR, CUDA summarizer, protocol extensions, etc.), Pneuma picks up those improvements by updating the shared D&TED dependency ÔÇö not by re-implementing the motor inside Electron.

## Consequences

1. **Shared, independently updatable dependency**  
   D&TED is discovered and run as an external (or side-by-side managed) install. It is not frozen forever inside a single Pneuma release artifact.

2. **Stable versioned interface**  
   Integration stays on the **JSON line protocol** (`DTED.exe --serviciu`, currently protocol 1; see `docs/DTED.md`). The protocol must remain versioned and negotiated so the engine can evolve underneath without breaking Pneuma's UI layer.

3. **Update channel (design)**  
   The product update story has two layers:
   - Pneuma Sofer app updates (Electron shell / UI) ÔÇö update-check currently **ON HOLD** in docs.
   - D&TED engine updates ÔÇö a dedicated update channel so Pneuma can pull a newer compatible D&TED build when the motor improves (month or year later). Design of that channel must treat D&TED as an updatable dependency, not a fixed subprocess path. Implementation is deferred; design is tracked separately.

4. **No parallel motor in Pneuma**  
   Do not grow a second ASR/summarizer stack inside Scriptorium. Embedded/whisper.cpp notes in older docs are historical; the long-term source of truth for recognition and related engine work is upstream D&TED.

## Boundaries

| Layer | Owns |
|---|---|
| D&TED | Mic/VAD/ASR/summarizer/models, `--serviciu` protocol, packaging of the motor |
| Pneuma Sofer | UI, project/document model, how dictation/transcription results land in the manuscript |

## Related docs

- `docs/DTED.md` ÔÇö protocol, discovery, IPC into the renderer  
- Cross-project notes on the D&TED side (`docs/CROSS_PROJECT_PNEUMA.md` in the dted repo)  
- Future: design note for the D&TEDÔåÆPneuma update channel (not implemented yet)

## Record

Written 2026-10-26 so future work (native motor, Parakeet, CUDA, update-check) does not re-litigate ÔÇ£does Pneuma own a separate engine?ÔÇØ ÔÇö it does not; it owns the UI on the shared D&TED motor.
