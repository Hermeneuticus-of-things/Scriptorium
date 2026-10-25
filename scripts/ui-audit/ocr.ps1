# OCR of a PNG with Tesseract (local), printing one line per recognized word as "y<TAB>x<TAB>text".
# Reads menu shortcuts and labels the accessibility layer does not expose. Language ron+eng
# (Romanian diacritics + ASCII shortcuts). Falls back to the Windows OCR engine if Tesseract is absent.
# Env: OCR_TESSDATA (dir with ron/eng traineddata), OCR_LANG (default ron+eng), OCR_PSM (default 6).
# Usage: powershell -File ocr.ps1 <png> [-X0 px]
param([Parameter(Mandatory)][string]$Png, [int]$X0 = 0)
$ErrorActionPreference = 'Stop'
$S = 3  # upscale: small menu-font glyphs (B, I, F11) are misread at native size
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $Png).Path)
$big = New-Object System.Drawing.Bitmap ($src.Width * $S), ($src.Height * $S)
$g = [System.Drawing.Graphics]::FromImage($big)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, $big.Width, $big.Height); $g.Dispose(); $src.Dispose()
$bigPath = [IO.Path]::ChangeExtension((Resolve-Path $Png).Path, ".x$S.png"); $big.Save($bigPath); $big.Dispose()

$tess = Get-Command tesseract -ErrorAction SilentlyContinue
if ($tess) {
  $data = if ($env:OCR_TESSDATA) { $env:OCR_TESSDATA } else { 'C:\Users\Ionut\AppData\Local\ui-audit-tessdata' }
  $lang = if ($env:OCR_LANG) { $env:OCR_LANG } else { 'ron+eng' }
  $psm = if ($env:OCR_PSM) { $env:OCR_PSM } else { '6' }
  # TSV gives per-word boxes: level page block par line word left top width height conf text
  $tsv = & $tess.Source $bigPath stdout --tessdata-dir $data -l $lang --psm $psm tsv 2>$null
  Remove-Item $bigPath -ErrorAction SilentlyContinue
  $first = $true
  foreach ($row in $tsv) {
    if ($first) { $first = $false; continue }  # header row
    $c = $row -split "`t"
    if ($c.Count -lt 12) { continue }
    $text = $c[11].Trim()
    if (-not $text -or [double]$c[10] -lt 40) { continue }  # drop conf < 40
    $x = [int]([int]$c[6] / $S); $y = [int]([int]$c[7] / $S)
    if ($x -lt $X0) { continue }
    "{0}`t{1}`t{2}" -f $y, $x, $text
  }
  return
}

# --- Fallback: Windows built-in OCR (WinRT) ---
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(); $task.Result }
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($bigPath)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$res = Await ($eng.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
foreach ($l in $res.Lines) {
  $w = $l.Words | Where-Object { $_.BoundingRect.X / $S -ge $X0 }
  if ($w) { "{0}`t{1}`t{2}" -f [int]($w[0].BoundingRect.Y / $S), [int]($w[0].BoundingRect.X / $S), (($w | ForEach-Object Text) -join ' ') }
}
Remove-Item $bigPath -ErrorAction SilentlyContinue
