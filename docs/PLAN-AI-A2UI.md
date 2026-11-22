# Matricea de compatibilitate A2UI ↔ Pneuma Sofer (misiune 23.11.2026)

Sursa A2UI verificată direct: github.com/a2ui-project/a2ui (overview.mdx, v1.0) — protocol
Apache 2.0 pentru **UI generate de agenți externi**: Agent SDK + compiler validează contra
un catalog JSON; rendererul client desenează cu widget-uri native; data binding `@path`;
actions vs local state; streaming în format „inference"; MCP ca transport.

## Verdictul arhitectural: **Varianta 1 — principii, nu framework**

| Variantă | Verdict | Motiv |
|---|---|---|
| 1. Principii A2UI + componente React native | **ALEasă** | cost zero de integrare; acoperă problema reală (forma rezultatului); păstrează motorul/limbajul existent |
| 2. Renderer React A2UI doar pentru răspunsuri structurate | respins | pachete TS + protocol AG-UI/A2A concepute pentru agenți externi — redundanțe cu runAi/streaming propriu; React/TS compat de verificat pe fiecare minor release |
| 3. Sistem A2UI complet cu catalog propriu | respins | al doilea sistem AI în paralel cu MCP/motorul existent — contramisiunii |

## Matricea mecanismelor

| Mecanism A2UI | În Pneuma Sofer | Decizie |
|---|---|---|
| Component Catalog | cardurile/etichetele existente | **principiu adoptat** — vocabular propriu: issue card, accept/reject, full-diff fallback (aiReviewQueue) |
| Data Binding | stare React + editorView/saveUi | **principiu adoptat** — `acceptedSet` ca singură stare a revizuirii (fără dubluri) |
| Actions vs local state | Accept/Respinge/Audit existau | **adus la card** — acțiuni per schimbare; auditul rămâne pe fiecare acceptare |
| Streaming | onDelta + status pill există | păstrat, nemodificat |
| Validation | garda frazelor fixate + authorGate | păstrat; cardurile sunt componente proprii (modelul nu generează HTML/JS — modelul de securitate A2UI satisfăcut prin design) |
| MCP Catalog | server MCP propriu cu permisiuni | **nu se ating** — rezultatele MCP rămân în mecanismul lor |
| Multi-Surface | AI dock/float (aiPanelMode) | deja existent (23.11) |
| Framework packages @a2ui/* | — | **nu se instalează** |

## Implementat (tranșa 1 din Etapa 2 a planului AI dedicat)

- `src/lib/aiReviewQueue.js` (pur): `diffSegments` (diff word-level → schimbări individuale
  cu context), `applySubset` (textul cu doar schimbările acceptate — reconstrucție din
  părțile diff), `changeContext` (vecinătăți pentru card). Fallback: null → diff monolitic.
- `AiPanel.jsx`: rezultatele `proofread`/`revise` afișează **coada de revizuire** — card per
  schimbare (înainte/după + context), Accept/Respinge individual, „Acceptă tot ce a rămas",
  „Resetează", full-diff în `<details>`. Aplicarea = subsetul acceptat prin calea
  tranzacțională existentă (snapshot + applyTextProposal + garda frazelor fixate + audit).
- 8 teste noi (`tests/aiReviewQueue.test.js`); 2297 trecute; build + e2e OK.

## Etapele următoare (din PLAN-AI-DEDICAT, neatinse aici)

- Etapa 3: Critica/Consistența/bulk în aceeași coadă de constatări; „repară doar fragmentul".
- Istoric rundelor în proiect (`editorial/`), asociat documentului.
- Confirmarea estimării de cost peste prag pentru bucle bulk.
