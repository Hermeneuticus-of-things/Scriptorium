# Schema de conținut a sistemului Help (PS-HELP-001 §21)

O singură sursă de adevăr. Fiecare articol = un obiect JS cu ID stabil și metadate;
toate suprafețele (Help Center, Smart Search, Command Finder, tooltip-uri, empty states,
What's New) consumă aceeași bază. Fără texte duplicate per funcție.

## Structura articolului

```js
{
  id: 'help.binder.reorder',        // ID stabil, ierarhic, fără spații
  title: 'Cum reordonezi documentele',
  summary: 'Un rând: ce rezolvă articolul.',   // apare în rezultatele de căutare
  content: 'md',                     // corpul: markdown redat în Help Center
  category: 'organizare',            // una din categoriile fixe (mai jos)
  contentType: 'procedure',          // explanation|procedure|tutorial|command|shortcut|
                                     // troubleshooting|tip|faq|task-guide|tour|glossary
  difficulty: 'beginner',            // beginner|intermediate|advanced|expert
  keywords: ['reordonez', 'mut', 'drag'],
  synonyms: ['schimb ordinea', 'deplasez capitol', 'mută document'],
  relatedFeatures: ['binder', 'collections'],
  relatedArticles: ['help.binder.split', 'help.binder.merge'],
  uiComponentIds: ['binder', 'binder.item'],   // selectori stabili pentru tururi/ajutor contextual
  commandIds: ['revealBinder'],               // ID-uri din registrul de comenzi real
  workflowIds: ['S3-W.03'],                   // trimitere la docs/audit/scrivener3/workflows.md
  platform: 'all',                            // all|win|mac
  minAppVersion: '1.0',
  language: 'ro',
  searchTerms: ['cum mut un capitol'],        // întrebări naturale frecvente
  lastVerified: '1.2.8',                      // versiunea la care s-a verificat conținutul
  status: 'verified',                         // draft|verified|stale
}
```

## Reguli de integritate

- `commandIds` trebuie să existe în registrul de comenzi (test automat: orice ID mort =
  testul pică — documentația nu poate descrie comenți inexistente).
- `uiComponentIds` trebuie să existe în mapa UI (`ui-mapping.md` / `src/lib/help/uiMap.js`).
- `status: 'stale'` la orice articol al cărui `commandIds`/`uiComponentIds` s-au schimbat —
  testul de integritate îl semnalează, nu îl șterge.
- Conținutul descrie NUMAI funcții verificate (REGULA ZERO din misiune).

## Categorii fixe

`proiecte` · `organizare` · `redactare` · `editare` · `cercetare` · `metadate` · `căutare` ·
`navigare` · `compile-export` · `print` · `setări` · `scurtături` · `ai` · `dictare` ·
`semnale-reparații` · `backup-recuperare` · `performanță` · `accesibilitate`.

## Nivelurile de căutare (PS-HELP-001 §4.3)

1. potrivire exactă (id, titlu, comandă) — scor maxim;
2. potrivire aproximativă (fuzzy pe titlu/keywords — prag generos pentru greșeli de tastare);
3. sinonime + `searchTerms` (întrebări naturale, formulate de om);
4. fără nivel semantic extern în v1 — arhitectura lasă loc (interfață `Matcher`), dar Help-ul
   elementar funcționează complet offline (regula §17: fără dependență de servicii AI).

Rezultatele poartă: titlu, categorie, summary, tip, dificultate, acțiune asociată
(comandă/articol) — deschid direct secțiunea, nu pagina principală.
