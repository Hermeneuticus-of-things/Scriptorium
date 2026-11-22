# Distribuția Windows: build, installer și SmartScreen (nesemnat, prin alegere)

Data: 23.11.2026. Decizia proiectului: **distribuție fără certificate de code signing** —
fără Azure Trusted Signing, fără PFX, fără secrete de semnare, fără pași CI care cer
certificate. Avertismentul de reputație SmartScreen pentru executabile nesemnate este
**acceptat și documentat**; nu se folosesc și nu se vor folosi metode de ocolire a
protecțiilor Windows (SmartScreen, Defender, UAC, Mark-of-the-Web).

## 1. De ce apare avertismentul „Windows protected your PC"

Microsoft Defender SmartScreen nu e un antivirus care descoperă malware: e un **sistem de
reputație**. La un fișier descărcat de pe Internet (cu Mark-of-the-Web), evaluează:

- **reputația fișierului** — hash-ul e cunoscut și are istoric de descărcări sigure?
- **reputația semnăturii/publisherului** — există o identitate digitală cu istoric?
- **prevalența** — câți utilizatori au rulat fișierul până acum;
- **euristica de malware** — comparatie cu listele de fișiere malițioase.

Un program **nesemnat și nou** are reputație zero → apare avertismentul, chiar dacă
programul e curat. Mesajul **nu** înseamnă „fișier infectat" — înseamnă „Windows nu are
încă destule dovezi de încredere". Documentația oficială:
[SmartScreen reputation for Windows app developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

De aceea multe programe populare pornesc fără avertisment: sunt semnate cu identități cu
istoric sau au mii de descărcări care le-au construit reputația. Un build nou al aceluiași
program poate declanșa din nou avertismentul (hash nou = reputație nouă de construit).

## 2. Configurația de distribuție (actuală, fără certificat)

| Element | Stare |
|---|---|
| Build aplicație | Electron (electron-builder) → `release/win-unpacked` + portabil |
| Installer | Inno Setup 6, per-user fără admin, wizard ro/en, detectare instanță activă |
| Metadata | `AppPublisher=Pneuma Sofer`, AppPublisherURL/AppUpdatesURL pe Releases, VersionInfoCompany/Description/Copyright; exe-uri: CompanyName/LegalTrademarks din package.json |
| Semnătură | **fără** (alegere deliberată); executabilele nu pretend o identitate certificată |
| Integritate | `SHA256SUMS` publicat în fiecare Release, calculat pe fișierele finale |
| Update | updaterul din aplicație verifică SHA-256 înainte de instalare |
| CI | build + teste + e2e + packaging + silent-install check, **fără secrete de semnare** |

## 3. Pipeline Release (reproductibil, fără certificate)

1. Checkout → `npm ci` → teste unitare → e2e pe aplicația reală.
2. `dist:win` (win-unpacked + portabil) → `dist:win:setup` (Inno Setup installer).
3. Silent install + CLI check pe runner.
4. Publicare Release cu installer + portabil + `SHA256SUMS` (hash pe fișierele finale).

Nu există pași care depind de certificate, secrete de semnare sau scope-uri speciale de
token. Workflow-ul se poate edita cu orice PAT cu drepturi de push obișnuite.

## 4. Integritate, nu identitate

`SHA256SUMS` din Release permite verificarea că fișierul descărcat e **exact** fișierul
publicat (integritate). Hash-ul **nu** dovedește identitatea publisherului — identitatea
se verifică prin faptul că descărcarea vine din pagina oficială
[Releases](https://github.com/Hermeneuticus-of-things/Scriptorium/releases/latest) a
repo-ului oficial. Verificare:

```powershell
Get-FileHash .\PneumaSofer-Setup-<versiune>.exe -Algorithm SHA256   # compară cu SHA256SUMS
```

## 5. Clasificări greșite: procedura Microsoft

Înainte de fiecare Release: încarcă installerul pe
[VirusTotal](https://www.virustotal.com) și verifică detecțiile. Dacă un antivirus
semnalează greșit, raportează fals pozitiv direct la
[Microsoft — Submit a file for malware analysis](https://www.microsoft.com/en-us/wdsi/filesubmission)
(portalul oficial WDSI; acoperă și disputele de detecție). Notează rezultatul în
notele Release-ului — transparență pentru utilizatori.

## 6. Ce poate și ce nu poate controla dezvoltatorul fără certificat

**Poate:** metadata coerentă a produsului, installer de calitate, integritate publicată,
distribuție transparentă pe Releases, raportarea fals-positivelor, documentația pentru
utilizatori, o reputație care crește treptat odată cu descărcările.

**Nu poate:** garanta dispariția avertismentului pentru executabile nesemnate; construi
reputația instant; controla politicile SmartScreen ale calculatorului utilizatorului.

Dacă la un moment dat proiectul va dori eliminarea avertismentului, calea legitimă rămâne
un certificat de code signing cu identitate verificată (vezi istoricul deciziei în git);
până atunci, distribuția nesemnată e alegerea proiectului.
