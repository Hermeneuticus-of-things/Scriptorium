# PLAN — Experiența AI dedicată (I-EDIT / I-REP) — analiza divergent-convergent

Data: 2026-10-31. Întrebarea autorului: „Nu sunt convins că AI-ul e corect implementat în cadrul
software. Probabil ar trebui să-i facem ceva DEDICAT — mai coerent și corect — ca UI și ca
încorporare în program." Metodă: 3 agenți divergenți (UX, arhitectură, conturi/traducere) pe același
cod + convergența orchestratorului.

## ✓ CONVERGENȚE (ce susțin toate perspectivele)

1. **Fundația e bună**: provider-urile, cheile criptate cu safeStorage, rundele I-EDIT (17 runde,
   repair loop cu autofix→lint→AI→authorGate), snapshot înainte de aplicare, joburile bulk — toate
   există și sunt testate.
2. **Problema centrală e FORMA rezultatului, nu motorul**: azi fiecare rundă produce un
   **diff monolitic pe tot documentul**, acceptat integral sau respins. Nu există revizuire per
   paragraf / per sugestie — de aici senzația de „nu e coerent".
3. **Patru „uși" AI cu patru limbaje vizuale** (Asistent AI cu streaming, I-REP/I-EDIT cu log,
   joburi bulk cu toast/modal, servicii cu dialog) — autorul nu poate prezice unde trăiește
   răspunsul. Serviciile au primit deja popoverul ancorat (v0.13.2+); modelul trebuie extins.
4. **Traducerea in-app e 90% făcută** (înlocuire pe loc + Ctrl+Z, API-uri oficiale); lipsa doar
   varianta fără cheie (fallback Google gtx) și OAuth Desktop pentru Google.

## ⚡ DIVERGENȚE PRODUCTIVE

- **UX** vrea panou dedicat cu carduri per paragraf și acțiuni per issue; **Arhitectură** preferă
  extinderea mecanismului existent (job-uri cu stare + diff segmentat) în loc de un panou nou —
  rezolvabil: același panou Editorial, dar cu **coadă de revizuire** (carduri) în loc de diff
  monolitic; nu se creează o a doua suprafață.
- **Conturi** arată că NotebookLM cu user+parolă nu e fezabil (2FA, ToS); UX-ul nu trebuie să
  promită login Google clasic — în UI se oferă OAuth Desktop (Google) și cookie-ședință
  (NotebookLM), cu explicația scurtă în pagină.

## ⚠ TENSIUNI NEREZOLVATE

1. **Cost/latență vs. granularitate**: review per paragraf înseamnă mai multe apeluri AI sau un
   singur apel cu răspuns structurat pe paragrafe (mai fragil la parsare). Decizie: apel unic cu
   răspuns pe segmente (marker per paragraf) + parsare tolerantă cu fallback la diff monolitic.
2. **Unde trăiește istoricul rundelor**: în panou (dispare la schimbarea documentului) sau în
   proiect (persistă)? Propun: în proiect, sub `editorial/` (JSON per rundă), afișat în panou.
3. **Autonomia buclelor**: câte bucle automate e sigur să lași fără supraveghere (azi maxLoops
   liber)? Propun: estimare afișată înainte de run („7 documente × 3 bucle ≈ 21 apeluri") și
   confirmare peste un prag.

## → VERDICT INTEGRAT (plan pe etape)

**Etapa 1 (S, în v0.13.x):** streaming + progres per rundă în EditorialPanel (infrastructura
runId/onDelta există; panoul doar nu o folosește); i18n pe string-urile hardcodate; estimarea de
cost înainte de run.

**Etapa 2 (M, v0.14.0 — „coada de revizuire"):** rezultatul rundei devine **carduri per paragraf**
cu acceptă/refuză pe fiecare (aplicarea subsetului = o singură scriere + snapshot); dif-ul rămâne
disponibil per card; propunerile învechite se re-difează la revenire, nu blochează.

**Etapa 3 (M, v0.14.x — „o singură suprafață Editorial"):** Corectura/Critica/Consistența din
Asistent AI + rezultatele bulk intră în același panou cu acțiuni per finding; AI pe fiecare issue
(„repară doar fragmentul ăsta"); excludere în liste direct din panou.

**Etapa 4 (M/L — conturi & auth):** Google via **OAuth Desktop (loopback)** — token-ul de
reîmprospătare în safeStorage, niciodată parolă; **NotebookLM via cookie-ședință** — fereastră
încorporată cu partiție persistentă în care autorul se loghează o dată, cookie-urile merg către
serverul notebooklm-mcp; „Alte conturi" reetichetat ca agendă de logări (ce e robust fără API);
scraping cu parolă pentru Google/NotebookLM: nu (ToS + fragilitate), documentat în ajutor.

**Etapa 0 (făcută azi):** traducerea fără popup — popoverul ancorat cu mărimi dinamice (vezi
PR servicii-in-pagina) + fără linkuri web la traducere; fallback Google fără cheie — de adăugat
în lib/translate.cjs (S).
