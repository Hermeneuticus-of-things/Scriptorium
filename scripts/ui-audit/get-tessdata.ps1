# One-time setup for the Tesseract OCR used by ocr.ps1: downloads the ron + eng "best" models into a
# user-writable tessdata dir and copies Tesseract's config files there (needed for the tsv output).
# The models (~24 MB) are not committed. Run once; ocr.ps1 reads OCR_TESSDATA or this default dir.
# Usage: pwsh get-tessdata.ps1 [-Dir <path>]
param([string]$Dir = 'C:\Users\Ionut\AppData\Local\ui-audit-tessdata')
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $Dir | Out-Null
$base = 'https://github.com/tesseract-ocr/tessdata_best/raw/main'
foreach ($l in 'ron', 'eng') {
  $out = Join-Path $Dir "$l.traineddata"
  if (Test-Path $out) { Write-Host "$l: deja ($([int]((Get-Item $out).Length/1MB)) MB)"; continue }
  Invoke-WebRequest "$base/$l.traineddata" -OutFile $out -TimeoutSec 180
  Write-Host "$l: descărcat ($([int]((Get-Item $out).Length/1MB)) MB)"
}
# tsv/other output configs live next to the installed traineddata, not in tessdata_best
$tess = (Get-Command tesseract -ErrorAction SilentlyContinue)?.Source
$pf = if ($tess) { Join-Path (Split-Path $tess) 'tessdata' } else { 'C:\Program Files\Tesseract-OCR\tessdata' }
foreach ($sub in 'configs', 'tessconfigs') {
  if ((Test-Path "$pf\$sub") -and -not (Test-Path "$Dir\$sub")) { Copy-Item "$pf\$sub" "$Dir\$sub" -Recurse -Force; Write-Host "copiat $sub" }
}
Write-Host "Gata. Setează OCR_TESSDATA=$Dir dacă folosești alt folder."
