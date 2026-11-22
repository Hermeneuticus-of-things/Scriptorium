# Distribuția Windows: SmartScreen, code signing și pipeline-ul Release

Data: 22–23.11.2026. Cauza mesajului „Windows protected your PC" la
`PneumaSofer-Setup-1.4.0.exe` și planul legitim de rezolvare.

## 1. Audit (ce am găsit)

| Element | Stare găsită |
|---|---|
| Build aplicație | Electron (electron-builder), `asar:false`, output `release/win-unpacked` + portabil |
| Build installer | Inno Setup 6 (`installer/pneuma.iss` via `installer/build-setup.cjs`) |
| Semnătură Authenticode | **ABSENTĂ** — `CSC_IDENTITY_AUTO_DISCOVERY:false` și niciun signtool în pipeline |
| Metadata exe | productName + icon corecte; `author` lipsă → **CompanyName gol** în proprietăți (reparat: `author=Pneuma Sofer` + `legalTrademarks`) |
| Installer metadata | AppPublisher/Icon/per-user (fără admin) corecte; adăugate AppPublisherURL/AppUpdatesURL/VersionInfo* |
| Identitate publisher | nevalidată de nimeni → SmartScreen nu are pe cine să creadă |
| SHA256SUMS | generate corect, dar înainte de semnare nu exista — acum se generează DUPĂ semnare |
| Pipeline Release | fără pași de semnare/verificare; acuma are semnare condiționată + verificare + blocare |
| Actualizare | updater propriu verifică SHA-256; cu fișier semnat verifică și Authenticode implicit |

**Cauza avertismentului**: executabil NESIGNAT + hash never-văzut de SmartScreen + publisher
fără reputație. SmartScreen decide pe reputația fișierului (număr de descărcări/vechime) și
pe semnătura digitală. Nu există (și nu se vor folosi) metode legitime de „ocolire" — doar
autenticitate + reputație construită.

## 2. Ce s-a implementat (indiferent de certificat)

1. `scripts/sign-release.ps1` — semnare Authenticode SHA256 + timestamp RFC 3161 (DigiCert
   TSA implicit) + mod `-VerifyOnly` de verificare. Două moduri: **PFX pe disc** sau
   **Azure Trusted Signing**. Fără certificat → Development mode (exit 2 + `release/UNSIGNED.txt`).
2. `installer/build-setup.cjs` — ordinea corectă: semnează exe-urile din `win-unpacked` și
   portabilul **înainte** de Inno Setup, construiește installerul, îl semnează, apoi
   **verifică** semnătura (`-VerifyOnly`). Scrie `release/UNSIGNED.txt` când nu s-a semnat.
3. `.github/workflows/windows.yml` — pasul Installer decodează PFX-ul din secret
   (`PNEUMA_SIGN_PFX_B64`), semnează; jobul de Release **blochează publicarea** dacă
   `UNSIGNED.txt` există; `SHA256SUMS` se generează după semnare.
4. Metadata: `package.json.author` + `legalTrademarks` → CompanyName în exe-uri;
   installerul are AppPublisherURL/AppUpdatesURL/VersionInfoCompany/Description/Copyright.
5. Installer rămâne **per-user, fără drepturi de administrator** (PrivilegesRequired=lowest,
   cu dialogul „pentru toți" doar când e rulat elevated) — permisiuni minime.

## 3. Opțiuni de certificat (decizia owner-ului — NU se cumpără fără aprobarea ta)

| Opțiune | Cost orientativ | SmartScreen | Observații |
|---|---|---|---|
| **Azure Trusted Signing** | ~9,99 $/lună | **reputație aproape instant** (infrastructura Microsoft) | identitate verificată la înscriere; semnare în cloud prin `azuresigntool`; cea mai bună cale pentru proiect nou |
| **Certificat OV code signing** | ~200–400 €/an | reputație construită treptat (descărcări + timp; săptămâni–luni) | cheie pe token USB sau HSM (cerință CA/B Forum); semnare manuală pe calculatorul tău sau CI cu HSM-cloud |
| **Certificat EV code signing** | ~300–700 €/an | **reputație instant** istoric; azi Windows tratează EV similar cu OV în unele scenarii, dar rămâne cel mai puternic semnal | cel mai scump; token hardware obligatoriu |
| **Self-signed** | 0 | **niciun efect** pe SmartScreen la utilizatori | doar pentru teste interne |

**Recomandarea mea**: Azure Trusted Signing (cel mai rapid spre SmartScreen curat, cel mai
ieftin pe termen lung, integrare în CI deja gata în `sign-release.ps1` prin
`PNEUMA_TS_ACCOUNT`/`PNEUMA_TS_ENDPOINT`). Alternativa: certificat OV (acceptă câteva
săptămâni de SmartScreen „necunoscut" în timp ce reputația crește cu fiecare descărcare).

**Ce trebuie să faci tu (o singură dată):**
1. Alegi opțiunea și îți creezi contul/certificatul (identitate persoană fizică sau firmă).
2. Mi dai secretele ca GitHub Secrets (nu în chat):
   - varianta Azure: `PNEUMA_TS_ACCOUNT`, `PNEUMA_TS_ENDPOINT`
   - varianta PFX: `PNEUMA_SIGN_PFX_B64` (fișier .pfx encodat base64) + `PNEUMA_SIGN_PFX_PASSWORD`
3. Următorul push pe main construiește installer **semnat**; Release-ul se publică singur.

## 4. EXE vs MSI vs MSIX (analiza de format)

| Criteriu | EXE (Inno, actual) | MSI | MSIX |
|---|---|---|---|
| Semnare obligatorie | recomendată (facultativă tehnic) | obligatorie practice | **obligatorie** |
| Instalare per-user fără admin | da (actual) | greu (MSI = per-machine) | da, în container |
| Actualizare proprie | da (updaterul actual, neschinbat) | da (cu mecanism separat) | doar prin store/pipe MSIX |
| Ieșirea din Store + SmartScreen | avertisment până la reputație/semnare | la fel | cel mai curat |
| Efort de migrare | — | mare (convertire + maintenance dublă) | mare (restrictii VirtualFS; MCP + PATH + auto-update ar trebui reproiectate) |
| MCP/CLI la PATH | da (MERGETASKS=addtopath) | posibil | limitat (container) |

**Decizia**: rămân **EXE (Inno) semnat Authenticode** — păstrează installerul inteligent,
updaterul propriu, MCP-ul și CLI-ul; MSIX ar rupe updaterul și integrarea MCP pentru un
câștig care vine oricum din semnare. MSIX rămâne opțiune viitoare dacă dorim Windows Store.

## 5. Ce mai reduce avertismentul legitim (fără ocoliri)

- Fiecare descărcare verificată crește reputația hash-ului — publicarea constantă ajută.
- Pagina Releases + note clare; utilizatorii apasă „More info → Run anyway" până apare
  reputația (cu OV) sau deloc (cu Azure Trusted Signing/EV).
- Virustotal/analize false-positive: dacă un AV semnalează, se raportează ca fals pozitiv
  (canalele vendor-ilor) — nu se „obliga" nimic în build.

## 6. Verificare pentru cineva care descarcă

```powershell
Get-AuthenticodeSignature .\PneumaSofer-Setup-1.4.0.exe | Format-List
Get-FileHash .\PneumaSofer-Setup-1.4.0.exe -Algorithm SHA256   # compară cu SHA256SUMS din Release
```

## 7. Checkpoint pipeline (stare actuală)

Build → semnare exe-uri aplicație + portabil → Inno Setup installer → semnare installer →
**verificare semnătură** → Silent install + CLI check (test pe runner) → Release job:
blocare dacă UNSIGNED.txt → SHA256SUMS după semnare → publicare GitHub Release.
