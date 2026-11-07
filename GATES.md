# Gates: ADL T6 — menu:command nativ → engine.dispatch înainte de fallback

OWNS: src/lib/focusMenus.js, src/App.jsx, tests/focusMenus.test.js

Scope: Comenzile din meniul nativ (IPC `menu:command`) trec ÎNTÂI prin motorul de focus
(`engine.dispatch`, bubbling din suprafața activă) și cad în fallback-ul actual (commandList /
menuActions) doar când niciun strat nu consumă comanda; TDD, branch feat/adl-t6, fără push.

- [x] G1: Teste unitare noi pentru `runNativeMenuItem` în tests/focusMenus.test.js acoperă cele
  trei căi (suprafață consumă → fallback NErulat; nimeni nu consumă → fallback rulat; fără motor
  sau fără id → fallback direct) și trec.
  CHECK: npx vitest run tests/focusMenus.test.js
  EXPECT: /Test Files\s+1 passed \(1\)/
  EVIDENCE: 1 passed (1), Tests 14 passed (14) — 3 teste noi (RED înainte de implementare:
  3 failed | 11 passed).

- [x] G2: Receptorul `menu:command` din App.jsx rulează comanda prin `runNativeMenuItem(focusEngine,
  id, fallback)` (dispatch întâi, fallback doar la null), fără a modifica meniurile din main
  process și fără a modifica lista de comenzi.
  CHECK: node -e "const fs=require('fs');const a=fs.readFileSync('src/App.jsx','utf8');const f=fs.readFileSync('src/lib/focusMenus.js','utf8');if(!a.includes('runNativeMenuItem(focusEngine'))throw new Error('App.jsx nu foloseste runNativeMenuItem');if(!f.includes('export function runNativeMenuItem'))throw new Error('focusMenus.js nu exporta helperul');if(!a.includes('commandsRef.current[id] ? commandsRef.current[id].run() : menuActionsRef.current[id]?.()'))throw new Error('fallback-ul actual a disparut');console.log('T6 integration ok')"
  EXPECT: T6 integration ok
  EVIDENCE: „T6 integration ok” (git diff App.jsx: doar import + receptorul IPC; electron/main.cjs
  și lista de comenzi neatinse).

- [x] G3: Suita completă rămâne verde (fără regresii față de baza 336508c).
  CHECK: npx vitest run
  EXPECT: /Test Files\s+\d+ passed \(\d+\)/
  EVIDENCE: baseline 336508c — 165 passed (165), 1739 passed | 4 skipped (1743);
  după T6 — 165 passed (165), 1742 passed | 4 skipped (1746) (+3 teste noi, 0 regresii).

- [x] G4: Commit-uri mici pe feat/adl-t6, mesaje în română cu prefixul „ADL T6:", fără push.
  EVIDENCE: eaf096a „ADL T6: runNativeMenuItem — dispatch prin motor înainte de fallback (teste +
  helper)"; 2cd367e „ADL T6: receptorul menu:command din App.jsx trece prin motor înainte de
  fallback"; acest commit pentru GATES.md. Branch local, fără push.
