# Semnare Authenticode a artefactelor de distribuție Windows (Pneuma Sofer).
# principii: se semnează DOAR artefactele Release; timestamp verificabil (RFC 3161);
# verificare automată după semnare; fără chei în repo/loguri; Development mode fără certificat.
#
# Moduri de semnare (alese automat după variabilele de mediu prezente):
#   1. PFX pe disc:   PNEUMA_SIGN_PFX=<cale.pfx>  PNEUMA_SIGN_PFX_PASSWORD=<parolă>
#   2. Azure Trusted Signing: PNEUMA_TS_ACCOUNT=<cont>  PNEUMA_TS_ENDPOINT=<url>  (+ az login în CI)
#
# Utilizare:
#   powershell -File scripts\sign-release.ps1 -Files release\PneumaSofer-Setup-1.4.0.exe,release\win-unpacked\"Pneuma Sofer.exe" [-VerifyOnly]
#   -VerifyOnly  → doar verifică semnăturile existente (pipeline Release: pas separat, obligatoriu)
#
# Ce se semnează (în ordine): executabilele din win-unpacked (aplicația), apoi installerul
# (construit DUPĂ semnarea conținutului — installerul e semnat ultimul).

param(
  [string[]]$Files = @(),
  [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$TSA = $env:PNEUMA_SIGN_TSA; if (-not $TSA) { $TSA = 'http://timestamp.digicert.com' }

function Find-Signtool {
  $cands = @(
    (Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending | Select-Object -First 1).FullName,
    (Get-ChildItem 'C:\Program Files\Windows Kits\10\bin' -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending | Select-Object -First 1).FullName,
    'signtool.exe'
  ) | Where-Object { $_ }
  foreach ($c in $cands) { if (Get-Command $c -ErrorAction SilentlyContinue) { return $c } }
  throw 'signtool.exe nu a fost găsit. Instalează Windows 10/11 SDK (componenta Signing Tools).'
}

function Resolve-Mode {
  if ($env:PNEUMA_SIGN_PFX -and $env:PNEUMA_SIGN_PFX_PASSWORD) { return 'pfx' }
  if ($env:PNEUMA_TS_ACCOUNT -and $env:PNEUMA_TS_ENDPOINT) { return 'azure' }
  return 'none'
}

$mode = Resolve-Mode
$signtool = Find-Signtool
Write-Host "signtool: $signtool"
Write-Host "mod semnare: $mode (TSA: $TSA)"

if ($VerifyOnly) {
  if (-not $Files -or $Files.Count -eq 0) { throw 'VerifyOnly cere -Files.' }
  foreach ($f in $Files) {
    if (-not (Test-Path $f)) { throw "Fișier lipsă la verificare: $f" }
    $out = & $signtool verify /pa /all /v /q $f 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Host ($out | Out-String); throw "SEMNĂTURĂ INVALIDĂ sau LIPSĂ: $f" }
    Write-Host "OK semnătură: $f"
  }
  Write-Host 'Toate semnăturile sunt valide (Authenticode + timestamp).'
  exit 0
}

if ($mode -eq 'none') {
  Write-Host 'Development mode: fără certificat de semnare configurat.'
  Write-Host '  Artifacts NU sunt semnate — NU publica aceste build-uri ca Release public.'
  Write-Host '  Configurare: PNEUMA_SIGN_PFX + PNEUMA_SIGN_PFX_PASSWORD (certificat OV/EV code signing)'
  Write-Host '  sau PNEUMA_TS_ACCOUNT + PNEUMA_TS_ENDPOINT (Azure Trusted Signing). Vezi docs/DISTRIBUTIE-WINDOWS.md.'
  exit 2   # cod distinct: build-ul merge, dar publicarea Release trebuie blocată
}

foreach ($f in $Files) {
  if (-not (Test-Path $f)) { throw "Fișier lipsă la semnare: $f" }
  if ($mode -eq 'pfx') {
    & $signtool sign /fd SHA256 /td SHA256 /tr $TSA /f $env:PNEUMA_SIGN_PFX /p $env:PNEUMA_SIGN_PFX_PASSWORD $f
  } else {
    & azuresigntool sign -kv $env:PNEUMA_TS_ACCOUNT -tr $TSA -td SHA256 `
      -d $env:PNEUMA_TS_ENDPOINT $f
  }
  if ($LASTEXITCODE -ne 0) { throw "Semnarea a eșuat: $f" }
  Write-Host "semnat: $f"
}
exit 0
