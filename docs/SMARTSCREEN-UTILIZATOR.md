# „Windows protected your PC" — ce înseamnă și ce faci (ghid pentru utilizatori)

La descărcarea și rularea `PneumaSofer-Setup-<versiune>.exe`, Windows poate afișa:

> **Windows protected your PC** — Microsoft Defender SmartScreen prevented an
> unrecognised app from starting. Running this app might put your PC at risk.

Acest mesaj **nu înseamnă că programul e infectat**. E un mesaj de **reputație**:
SmartScreen compare fișierul descărcat cu ecosistemul Microsoft și, dacă executabilul e
nou (puține descărcări până acum) și **nesemnat digital** (alegere deliberată a
proiectului Pneuma Sofer — vezi
[`docs/DISTRIBUTIE-WINDOWS.md`](DISTRIBUTIE-WINDOWS.md)), sistemul nu are încă destule
dovezi de încredere și cere confirmarea ta explicită.

## 1. Verifică sursa oficială înainte de orice

- Descarcă installerul **doar** din pagina oficială de versiuni:
  [github.com/Hermeneuticus-of-things/Scriptorium/releases/latest](https://github.com/Hermeneuticus-of-things/Scriptorium/releases/latest)
- Fișierele corecte: `PneumaSofer-Setup-<versiune>.exe` (instalator) și
  `PneumaSofer-<versiune>-portabil.exe` (portabil). Alte surse (pagini reclame, linkuri
  primite, mirror-e) nu sunt oficiale.

## 2. Verifică integritatea fișierului (SHA-256)

Fiecare Release publică fișierul `SHA256SUMS` cu amprentele fișierelor distribuite:

```powershell
Get-FileHash .\PneumaSofer-Setup-1.4.0.exe -Algorithm SHA256
```

Compară rezultatul cu linia corespunzătoare din `SHA256SUMS`. Dacă valorile sunt identice,
fișierul descărcat e **exact** cel publicat de proiect (hash-ul verifică integritatea
fișierului raportat la valoarea publicată — nu este o dovadă de identitate a publisherului).

## 3. Ce face „More info" din fereastra SmartScreen

- **More info** dezvăluie un al doilea rând cu numele aplicației și butonul
  **„Run anyway"** („Rulează oricum").
- Alegerea ta: dacă ai descărcat din sursa oficială și ai verificat hash-ul, continuarea
  este o decizie informată. Windows îți va mai întreba o dată confirmarea.
- Dacă sistemul tău e gestionat de o firmă/școală, politica de securitate poate să nu
  permită continuarea — în acest caz contactează administratorul.

## 4. Ce NU trebuie făcut

- **Nu dezactiva** Microsoft Defender, SmartScreen sau alte protecții Windows pentru a
  instala programe.
- **Nu ignora** avertismentele antivirus reale (care spun „trojan/virus detected" — altceva
  decât mesajul de reputație SmartScreen); verifică-le prin sursa oficială și raportează.
- **Nu descărca** installerul din alte surse „de care să nu te mai atingi de avertisment" —
  exact aceste surse sunt riscul real.

## 5. Dacă antivirusul tău semnalează fișierul

Avertismentul SmartScreen (reputație) e diferit de detecția unui antivirus (semnătură de
malware). Dacă un antivirus semnalează installerul oficial:

1. Verifică hash-ul SHA-256 (secțiunea 2) — dacă se potrivește, fișierul e cel publicat.
2. Raportează detecția ca **fals pozitiv** la producătorul antivirusului și la
   [Microsoft — Submit a file for malware analysis](https://www.microsoft.com/en-us/wdsi/filesubmission).
3. Proiectul verifică fiecare installer înainte de publicare; notele Release pot conține
   starea analizelor.

## 6. De ce proiectul a ales distribuția nesemnată

Code signing cu identitate verificată rezolvă avertismentul, dar cere certificate plătite
și infrastructură de semnare — o dependență pe care proiectul a decis să nu o aibă
(decizia e documentată în [`docs/DISTRIBUTIE-WINDOWS.md`](DISTRIBUTIE-WINDOWS.md)).
Compensăm cu: distribuție transparentă pe GitHub Releases, hash-uri publicate, installer
per-user fără drepturi de administrator, tot codul open source verificabil.
