# Scribner: instalare dintr-o singură comandă (Windows PowerShell 5.1 sau PowerShell 7).
#
#   irm https://raw.githubusercontent.com/Hermeneuticus-of-things/Scriptorium/main/install.ps1 | iex
#
# Ia ultima versiune publicată (Releases), verifică amprenta SHA-256 a fișierului cu cea publicată
# de GitHub și pornește installerul. Fără drepturi de administrator (instalare pentru utilizatorul curent).
# Opțiuni prin variabile de mediu, puse înainte de comandă:
#   $env:SCRIBNER_PATH = '1'       adaugă și comanda `scribner` în PATH
#   $env:SCRIBNER_SILENT = '1'     instalare fără ferestre
#   $env:SCRIBNER_PORTABLE = '1'   descarcă varianta portabilă pe Desktop, fără instalare
#   $env:SCRIBNER_VERSION = 'v0.8.7'  o anumită versiune în loc de ultima
#   $env:SCRIBNER_DRYRUN = '1'     doar verifică (descarcă și controlează amprenta), fără instalare
#   $env:GITHUB_TOKEN = 'ghp_…'    necesar cât timp depozitul e privat (token cu drept de citire)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest e mult mai rapid fără bara de progres
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$Repo = 'Hermeneuticus-of-things/Scriptorium'

function Say($text) { Write-Host "Scribner: $text" }

if ($env:OS -ne 'Windows_NT') { throw 'Scriptul de instalare e doar pentru Windows. Pe alte sisteme, vezi README (din cod sursă).' }

$tag = $env:SCRIBNER_VERSION
$api = if ($tag) { "https://api.github.com/repos/$Repo/releases/tags/$tag" } else { "https://api.github.com/repos/$Repo/releases/latest" }
Say 'caut ultima versiune...'
$headers = @{ 'User-Agent' = 'scribner-install'; 'Accept' = 'application/vnd.github+json' }
if ($env:GITHUB_TOKEN) { $headers['Authorization'] = "Bearer $($env:GITHUB_TOKEN)" }
try {
  $release = Invoke-RestMethod -Uri $api -Headers $headers
} catch {
  if ("$_" -match '404|Not Found') { throw 'Nu găsesc versiunea publicată. Dacă depozitul e privat, pune înainte $env:GITHUB_TOKEN = ''token-ul tău''.' }
  throw
}

$portable = $env:SCRIBNER_PORTABLE -eq '1'
$pattern = if ($portable) { '^Scribner-.*-portabil\.exe$' } else { '^Scribner-Setup-.*\.exe$' }
$asset = $release.assets | Where-Object { $_.name -match $pattern } | Select-Object -First 1
if (-not $asset) { throw "Nu am găsit fișierul de instalare în versiunea $($release.tag_name)." }

$dir = if ($portable) { [Environment]::GetFolderPath('Desktop') } else { Join-Path $env:TEMP 'scribner-install' }
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$file = Join-Path $dir $asset.name

Say "descarc $($asset.name) ($([math]::Round($asset.size / 1MB)) MB)..."
if ($env:GITHUB_TOKEN) {
  # Private repository: the asset comes from the API with the token, as a binary stream.
  $dl = @{ 'User-Agent' = 'scribner-install'; 'Accept' = 'application/octet-stream'; 'Authorization' = "Bearer $($env:GITHUB_TOKEN)" }
  Invoke-WebRequest -Uri $asset.url -Headers $dl -OutFile $file -UseBasicParsing
} else {
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $file -UseBasicParsing
}

# Amprenta publicată de GitHub pentru fișier ("sha256:..."); fără ea nu pornim nimic.
$expected = "$($asset.digest)" -replace '^sha256:', ''
if (-not $expected) { Remove-Item $file -Force; throw 'Versiunea nu are amprentă SHA-256 publicată; descarcă manual din pagina Releases.' }
$actual = (Get-FileHash -Path $file -Algorithm SHA256).Hash
if ($actual -ne $expected.ToUpper()) { Remove-Item $file -Force; throw 'Fișierul descărcat nu corespunde amprentei publicate. L-am șters; încearcă din nou.' }
Say 'amprenta SHA-256 e corectă.'

if ($env:SCRIBNER_DRYRUN -eq '1') {
  if (-not $portable) { Remove-Item $file -Force }
  Say "verificare reușită: $($asset.name), $($release.tag_name)."
  return
}

if ($portable) {
  Say "gata: $file (pornește-l cu dublu clic)."
  return
}

$setupArgs = @('/SP-', '/NORESTART')
if ($env:SCRIBNER_SILENT -eq '1') { $setupArgs += @('/VERYSILENT', '/SUPPRESSMSGBOXES') }
if ($env:SCRIBNER_PATH -eq '1') { $setupArgs += '/MERGETASKS=addtopath' }
Say "pornesc installerul $($release.tag_name)..."
$p = Start-Process -FilePath $file -ArgumentList $setupArgs -Wait -PassThru
Remove-Item $file -Force -ErrorAction SilentlyContinue
if ($p.ExitCode -ne 0) { throw "Installerul s-a oprit (cod $($p.ExitCode))." }
Say 'instalat. Îl găsești în meniul Start și pe Desktop.'
if ($env:SCRIBNER_PATH -eq '1') { Say 'deschide un terminal nou și scrie: scribner help' }
