# Audit exhaustiv Scrivener 3 ↔ Pneuma Sofer — registrul consolidat

Creat: 2026-11-21. Referința: **Scrivener 3.1.6 Windows** (manualul oficial inclus în
instalare, 774 pag., `C:\Program Files\Scrivener3\Resources\Scrivener-Manual.pdf`) + manualul
oficial macOS (diferențe de platformă). Clauza de bază: acoperire integrală, element cu
element, cu dovezi; inventarul crește pe baza descoperirilor, nu e limitat la o listă.

## Structura registrului

| Document | Conținut |
|---|---|
| `sources.md` | Sursele folosite: manuale, anexe, release notes, cu versiuni și extrase |
| `sources/*.txt` | Extrasele de text din manual (capitolele lipsă din auditurile anterioare + anexele A–F) |
| `scrivener-ch01-ch07-ch14.md` | Inventar + comparație: cap. 1–7 (interfață, proiecte, binder, fișiere/foldere) și 14 (Cloud & Sharing) |
| `scrivener-appendix-a-menus.md` | Anexa A: fiecare meniu și comandă, Windows (+ diferențe macOS) |
| `scrivener-appendix-b-c-settings.md` | Anexa B (Options) + C (Project Settings), fiecare setare individual |
| `scrivener-appendix-d-e-f.md` | Anexa D (Compile Formats) + E (What's New 3.0–3.1.6) + F (Extras Pack) |
| `comparison_registry.md` | Registrul consolidat cu ID-uri stabile (toate sursele, dedup verificat) |
| `missing_features.md` | Raportul lipsurilor pe categoriile A–Q din misiune |
| `omissions-discovery.md` | SCRIVENER3-OMISSIONS-DISCOVERY — descoperiri în afara enumerării inițiale |
| `workflows.md` | Fluxuri complete de utilizare (creare→publicare) verificate pas cu pas |
| `final-anti-omission-review.md` | FINAL ANTI-OMISSION REVIEW — a doua trecere independentă |
| `implementation_plan.md` | Plan pe tranșe mici și testabile |
| `verification_report.md` | Dovezi de verificare per stare |

## Moștenire (nu se dublează)

Auditurile de paritate anterioare rămân surse de proveniență pentru capitolele 8–13, 15–26:
`docs/PARITY-AUDIT-NEXT-CHAPTERS.md` (ch. 10, 12, 18, 20, 24), `docs/PARITY-AUDIT-ch08-ch15-editor.md`
(8, 15), `-ch09-ch13-` (9, 13), `-ch16-ch17-` (16, 17), `-ch19-ch21-ch22-` (19, 21, 22),
`-ch23-ch25-ch26-` (23, 25, 26), căutarea: `docs/SCRIVENER-SEARCH-EVIDENCE.md` (ch. 11).
Registrul consolidat își păstrează ID-urile proprii (S3-*) și face trimitere la acestea.

## Stări (exact ca în misiune)

`COMPLETE` / `PARTIAL` / `UNINTEGRATED` / `BROKEN` / `MISSING` / `NOT_APPLICABLE` /
`UNVERIFIED` / `EQUIVALENT` / `SUPERIOR`.
Reguli: fără dovadă (file:line sau căutare documentată) nu se folosește COMPLETE,
EQUIVALENT sau SUPERIOR. MISSING cere căutarea negativă documentată (ce s-a căutat).

## ID-uri

`S3-<capitol|anexă>.<secțiune>.<nr>` — ex. `S3-05.2.3`, `S3-A.FILE.07`, `S3-B.GEN.12`,
`S3-D.03`, `S3-W.01` (workflow), `S3-O.01` (omisiune descoperită). Stabile odată emise.

## Reconcilierea inventarului (A–N)

Sursele reconciliate în `comparison_registry.md`: (A) lista din misiune; (B) manualele
oficiale; (C) Anexa A; (D) Options; (E) Project Settings; (F) Compile Formats; (G) Release
Notes (Anexa E + pagina oficială); (H) tutoriale oficiale; (I) documentație suplimentară;
(J) cercetare independentă; (K) workflow-uri; (L) capabilități combinate; (M) interfață +
comenzi contextuale; (N) alte surse verificabile. Proveniența fiecărui element se păstrează
(coloana «Sursă»).
