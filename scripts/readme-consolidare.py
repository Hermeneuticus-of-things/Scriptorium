# Consolidare pagina principală (cerință autor 2026-11-22):
#  1. Fără număr de versiune în README — „ultima versiune" (linkul releases/latest rămâne mereu corect)
#  2. Totul adunat pe main: harta documentației pe pagina principală, nu risipită prin pagini secundare
#  3. Rădăcina repo-ului curățată: rămășițe de unelte (cache audit, db, poze vechi) în assets/legacy/
# Rulează O SINGURĂ DATĂ, după ce #112 e pe main și branch-ul release e actualizat:
#   python scripts/readme-consolidare.py
import re, subprocess, os, shutil

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(R, 'README.md')
s = open(p, encoding='utf-8').read()

# 1) fără numere de versiune
s = s.replace('**[Descarcă Pneuma Sofer 1.3.0 pentru Windows](../../releases/latest)**',
              '**[Descarcă ultima versiune pentru Windows](../../releases/latest)**')
s = s.replace('## Nou în 1.3.0', '## Noutăți din ultima versiune')

# 2) harta documentației, adunată pe pagina principală (înainte de Instalare)
harta = '''
## Documentație, pe scurt

Tot ce e important e pe această pagină. Doar aceste trimiteri duc mai adânc, când ai nevoie:

| Vrei… | Unde |
|---|---|
| Manualul complet, din program | **F1** (23 de capitole, ro + en) |
| Ajutor și comenzi, cu căutare | **Ctrl+Shift+H** în program |
| Ce s-a schimbat în fiecare versiune | [`CHANGELOG.md`](CHANGELOG.md) |
| Paritatea cu Scrivener 3, element cu element | [`docs/audit/scrivener3/comparison_registry.md`](docs/audit/scrivener3/comparison_registry.md) (799 intrări cu dovezi) |
| Cum e construit programul | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DESIGN.md`](docs/DESIGN.md) |
| Limbajul de design (Ionuț ADL) | [`docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md`](docs/IONUT_APPLICATION_DESIGN_LANGUAGE.md) |
| Dictarea (D&TED) | [`docs/DTED.md`](docs/DTED.md) |
| Planul următoarelor versiuni | [`ROADMAP.md`](ROADMAP.md) |
| Cum raportezi o problemă | secțiunea [Ai găsit o problemă?](#ai-găsit-o-problemă) de mai jos |

'''
anchor = '## 9. Instalare, întrebări, probleme'
assert anchor in s, 'ancora Instalare lipsește'
s = s.replace(anchor, harta + anchor, 1)
open(p, 'w', encoding='utf-8').write(s)
print('README: versiuni scoase + harta documentației adăugată')

# 3) rădăcina repo-ului: rămășițe în assets/legacy
legacy = os.path.join(R, 'assets', 'legacy')
os.makedirs(legacy, exist_ok=True)
for name in ['compile.png', 'find.png', 'ol.png', 'Test.docx', 'ruvector.db']:
    src = os.path.join(R, name)
    if os.path.exists(src):
        subprocess.run(['git', 'mv', name, os.path.join('assets', 'legacy', name)], cwd=R, check=False)
        print('git mv', name)
log = os.path.join(R, 'npm-install.log')
if os.path.exists(log):
    os.remove(log)
    print('npm-install.log șters')
cache = os.path.join(R, 'Scriptorium')
if os.path.isdir(cache):
    subprocess.run(['git', 'rm', '-r', '-q', 'Scriptorium'], cwd=R, check=False)
    print('Scriptorium/ (cache ui-audit) scos din repo')
print('GATA — comite cu: git add -A && git commit')
