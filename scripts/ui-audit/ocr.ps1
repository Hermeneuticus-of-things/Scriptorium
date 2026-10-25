# OCR of a PNG with the Windows built-in engine; prints one line per text line with its y and x.
# Used to read menu shortcuts that the accessibility layer does not expose.
# Must run in Windows PowerShell 5.1 (WinRT): powershell -File ocr.ps1 <png> [-X0 px]
param([Parameter(Mandatory)][string]$Png, [int]$X0 = 0)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, $t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(); $task.Result }
# 3x upscale: single-letter shortcuts (B, I, O) are misread at menu font size
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $Png).Path); $S = 3
$big = New-Object System.Drawing.Bitmap ($src.Width * $S), ($src.Height * $S); $g = [System.Drawing.Graphics]::FromImage($big)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($src, 0, 0, $big.Width, $big.Height); $g.Dispose(); $src.Dispose()
$bigPath = [IO.Path]::ChangeExtension((Resolve-Path $Png).Path, ".x3.png"); $big.Save($bigPath); $big.Dispose()
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
