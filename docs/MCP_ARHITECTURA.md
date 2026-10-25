# Scribner ca extensie a agentului AI (MCP)

Un model de limbaj singur generează text. Legat prin MCP de Scribner, devine agent: citește cartea, caută în ea, propune și, cu acordul autorului, scrie în proiect. Modelul rămâne planul de raționament (înțelege cererea, împarte munca în pași, alege unealta). Scribner e planul de execuție: primește apeluri structurate, le verifică, lucrează pe disc și întoarce rezultatul.

## 1. Canalele protocolului (JSON-RPC 2.0)

| Canal | Ce oferă Scribner | Unde |
|---|---|---|
| `initialize` | nume, versiune, capabilități (tools, resources, prompts) și instrucțiuni pentru model | `mcp/server.mjs` |
| `tools/list`, `tools/call` | peste 80 de unelte cu schemă JSON (zod); fiecare marcată `readOnlyHint` / `destructiveHint` | `mcp/server.mjs`, `mcp/fullTools.mjs` |
| `resources/*` | `scribner://projects`, `scribner://binder`, `scribner://doc/{id}`, `scribner://ghid` | `mcp/server.mjs` |
| `prompts/*` | `revizie_capitol`, `rezumat_proiect`, `importa_scriv` | `mcp/server.mjs` |

Exemplu de unealtă de scriere: `write_document(id, content)` pune textul direct în documentul din proiect (după snapshot); pentru un proiect `.scriv` există citire pe loc (`scriv_outline`, `scriv_read`, `scriv_search`) și import complet (`import_scriv`, din folderul `.scriv` sau din fișierul `.scrivx`).

## 2. Bucla agentului (gândește → decide → acționează → observă)

1. Modelul citește lista de unelte și ghidul (`scribner://ghid`), apoi trimite un apel JSON.
2. Scribner validează argumentele după schemă (un argument greșit e respins înainte de orice scriere), verifică blocările și modul doar citire, execută.
3. Rezultatul se întoarce ca text sau JSON; lucrurile mari se cer pe bucăți (un document, o căutare cu limită), nu tot proiectul deodată.
4. Pentru sarcini cu mai mulți pași (citește capitolul 1, compară cu 2, corectează 3) bucla se repetă; scrierile sunt una câte una, sub lacătul `project.json` comun cu aplicația.

## 3. Transport: același calculator sau rețea

- **stdio** (implicit): clientul AI pornește serverul. Comanda generală, fără date personale:
  `cmd /c %LOCALAPPDATA%\Programs\Scribner\scribner-mcp.cmd`
- **Streamable HTTP**: `--http 9123` → `http://127.0.0.1:9123/mcp`, cu `Authorization: Bearer <token>` obligatoriu (`--token` sau `SCRIBNER_MCP_TOKEN`); `--host` pentru o adresă din rețea, de exemplu Tailscale. Un singur răspuns pe rând.

## 4. Date private: împachetare și rehidratare (`--anonymize`)

Cu `--anonymize`, înainte ca textul să plece spre model:

1. **APPEND / PACK:** doar ce e scris în `<proiect>/private-names.txt` (câte un nume pe rând) devine jeton fix, de forma `$ENT:PERSON:7f3a1c`. Rândurile `+email` și `+telefon` ascund și adresele de email și numerele de telefon (`$ENT:EMAIL:…`, `$ENT:PHONE:…`). Într-un roman, personajele, emailurile și telefoanele inventate rămân vizibile: modelul are nevoie de ele ca să ajute la text; pe listă intră doar oameni reali (o dedicație, un model real al unui personaj, date de contact reale). Același nume dă mereu același jeton, deci modelul poate urmări personajul fără să-i știe numele.
2. **HYDRATE:** jetoanele din ce trimite agentul înapoi (argumentele uneltelor) se înlocuiesc local cu valorile reale, pe calculatorul autorului, înainte de scrierea pe disc.

Implementare: `lib/anonymize.cjs`; test: `tests/mcpAnonymize.test.js`.

## 5. Securitate: implicit nimic, doar ce e expus

- **Default-deny:** agentul nu are linie de comandă și nici acces la disc în afara uneltelor. Căile ascunse sau de pornire (`.ssh`, dotfiles, Startup) sunt refuzate și după urmarea legăturilor; exporturile nu suprascriu fișiere străine și nu scriu prin legături simbolice.
- **Validare:** fiecare apel trece prin schema uneltei; tiparele regex periculoase sunt refuzate; importul de pagini web refuză adresele locale și din rețeaua proprie (inclusiv formele IPv6), cu limită de 20 MB.
- **Om în buclă:** uneltele de citire sunt marcate `readOnlyHint`, cele care șterg sau suprascriu `destructiveHint`, ca clientul să ceară aprobarea autorului. `--read-only` refuză orice scriere.
- **Reversibil:** fiecare scriere face întâi un snapshot (`restore_snapshot` o anulează), schimbările de structură fac backup la `project.json`, totul e notat în `agent-log.jsonl`. Documentele blocate de un coleg nu se ating (nici prin mutarea sau golirea dosarului care le conține).

## 6. Verificare

- `tests/mcp*.test.js`: unelte, rezumat de securitate, prin rețea, anonimizare.
- `mcp/eval/`: o carte de test și 10 întrebări pentru un agent real; `tests/mcpEval.test.js` confirmă că fiecare răspuns se găsește cu uneltele de citire.
