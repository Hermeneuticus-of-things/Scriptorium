# Robustly captures ONE classic window/dialog on its virtual desktop: opens it via UI Automation,
# screenshots it with PrintWindow (works occluded / on an inactive desktop), OCRs the image, and walks a
# shallow UIA tree (bounded, so a Qt dialog that stalls FindAll can't hang the run). Then closes it.
# Output per scene <id>: <id>.png, <id>.txt (OCR), <id>.json (shallow UIA). Run one scene per process
# invocation with an outer timeout, so one stuck dialog never blocks the others.
# Usage: pwsh capture-one.ps1 -Process Scrivener -Out dir -Id stats [-Path 'Project>Statistics...'] [-Tabs] [-Close]
param(
  [Parameter(Mandatory)][string]$Process,
  [Parameter(Mandatory)][string]$Out,
  [Parameter(Mandatory)][string]$Id,
  [string]$Path = '',
  [switch]$Tabs,
  [switch]$Close,
  [switch]$Tree,       # also dump a shallow UIA tree (useful for the main window/menus; Qt dialogs expose nothing and can stall, so off by default)
  [int]$Depth = 10
)
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Drawing
$A = [System.Windows.Automation.AutomationElement]
$T = [System.Windows.Automation.TreeWalker]::ControlViewWalker
New-Item -ItemType Directory -Force $Out | Out-Null
Add-Type -Namespace C1 -Name W -MemberDefinition @"
public delegate bool CB(System.IntPtr h, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint pid);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool PrintWindow(System.IntPtr h, System.IntPtr dc, uint flags);
public static System.Collections.Generic.List<System.IntPtr> Of(uint[] pids) {
  var r = new System.Collections.Generic.List<System.IntPtr>();
  EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (IsWindowVisible(h) && System.Array.IndexOf(pids, p) >= 0) r.Add(h); return true; }, System.IntPtr.Zero);
  return r;
}
"@
function Wins { $ids = [uint32[]]@((Get-Process -Name $Process -ErrorAction SilentlyContinue).Id); foreach ($h in [C1.W]::Of($ids)) { try { $e = $A::FromHandle($h); if ($e.Current.BoundingRectangle.Width -gt 40) { $e } } catch {} } }
function Shot($hwnd, $file) {
  try { $el = $A::FromHandle($hwnd); $r = $el.Current.BoundingRectangle; $w = [int]$r.Width; $h = [int]$r.Height; if ($w -lt 2) { return $null }
    $b = New-Object System.Drawing.Bitmap $w, $h; $g = [System.Drawing.Graphics]::FromImage($b); $dc = $g.GetHdc()
    [C1.W]::PrintWindow($hwnd, $dc, 2) | Out-Null; $g.ReleaseHdc($dc); $g.Dispose(); $b.Save($file); $b.Dispose(); return $file } catch { return $null }
}
function Ocr($png, $txt) { try { $rows = & powershell -NoProfile -File (Join-Path $PSScriptRoot 'ocr.ps1') $png 2>$null; ($rows | ForEach-Object { ($_ -split "`t")[2] } | Where-Object { $_ }) -join "`n" | Set-Content -Encoding utf8 $txt } catch {} }
function Node($e, $d) {
  $c = $e.Current
  $n = [ordered]@{ role = $c.ControlType.ProgrammaticName -replace '^ControlType\.', ''; name = $c.Name; enabled = $c.IsEnabled }
  try { $n.toggle = "$($e.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Current.ToggleState)" } catch {}
  try { $n.value = $e.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
  if ($d -lt $Depth) { $kids = @(); $k = $T.GetFirstChild($e); $i = 0; while ($k -and $i -lt 200) { $kids += Node $k ($d + 1); $k = $T.GetNextSibling($k); $i++ }; if ($kids.Count) { $n.children = $kids } }
  $n
}
function NormN($x) { return ($x -replace '[.…]+$', '').Trim() }
function Find($root, $name) {
  try { $e = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $name))); if ($e) { return $e } } catch {}
  try { $want = NormN $name; foreach ($c in $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::MenuItem)))) { if ((NormN $c.Current.Name) -eq $want) { return $c } } } catch {}
  $null
}
function Open($it) { foreach ($p in @([System.Windows.Automation.ExpandCollapsePattern], [System.Windows.Automation.InvokePattern], [System.Windows.Automation.SelectionItemPattern])) { try { $x = $it.GetCurrentPattern($p::Pattern); if ($p -eq [System.Windows.Automation.ExpandCollapsePattern]) { $x.Expand() } elseif ($p -eq [System.Windows.Automation.InvokePattern]) { $x.Invoke() } else { $x.Select() }; return $true } catch {} } return $false }

$main = @(Wins | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending)[0]
if (-not $main) { Write-Host "NO-WINDOW"; exit 1 }
$mh = [IntPtr]$main.Current.NativeWindowHandle
# Clean state: close any leftover dialog from a previous (possibly killed) run that would block the menu bar.
foreach ($extra in @(Wins | Where-Object { $_.Current.NativeWindowHandle -ne $mh })) {
  $bc0 = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
  $cx = $null; try { $cx = $extra.FindAll([System.Windows.Automation.TreeScope]::Children, $bc0) | Where-Object { $_.Current.Name -match '^(Cancel|Close|Done|OK|Anulează|Închide)$' } | Select-Object -First 1 } catch {}
  if ($cx) { try { $cx.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } catch {} } else { try { $extra.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close() } catch {} }
  Start-Sleep -Milliseconds 300
}
$main = @(Wins | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending)[0]
$mh = [IntPtr]$main.Current.NativeWindowHandle
$before = (Wins | ForEach-Object { $_.Current.NativeWindowHandle })

$opener = $null
if ($Path) {
  # Open in a throwaway child process: a modal dialog blocks Invoke, so opening there keeps us free.
  $opener = Start-Process pwsh -PassThru -WindowStyle Hidden -ArgumentList '-NoProfile', '-File', (Join-Path $PSScriptRoot 'open-menu.ps1'), '-Process', $Process, '-Path', $Path
  # Wait for the actual dialog: a new top-level Window (not the transient menu popup that opens first).
  $target = $null
  for ($i = 0; $i -lt 30 -and -not $target; $i++) {
    Start-Sleep -Milliseconds 400
    $target = @(Wins | Where-Object { $before -notcontains $_.Current.NativeWindowHandle -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window } | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending)[0]
  }
  if (-not $target) { Write-Host "NO-DIALOG:$Path"; if ($opener) { try { $opener.Kill() } catch {} }; exit 3 }
} else { $target = $main }
if (-not $target) { $target = $main }
$th = [IntPtr]$target.Current.NativeWindowHandle
$png = Join-Path $Out "$Id.png"; Shot $th $png | Out-Null; Ocr $png (Join-Path $Out "$Id.txt")

if ($Tabs) {
  $tc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)
  $tabs = @(); try { $tabs = @($target.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tc)) } catch {}
  if (-not $tabs.Count) { $cc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::CheckBox); try { $top = $target.Current.BoundingRectangle.Y; $tabs = @($target.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cc) | Where-Object { $_.Current.BoundingRectangle.Y -lt $top + 120 }) } catch {} }
  $n = 0
  foreach ($tb in $tabs) { Open $tb | Out-Null; Start-Sleep -Milliseconds 500; $nm = ($tb.Current.Name -replace '[^\w]', ''); $p2 = Join-Path $Out ("$Id-tab{0:d2}-{1}.png" -f $n, $nm); Shot $th $p2 | Out-Null; Ocr $p2 (Join-Path $Out ("$Id-tab{0:d2}-{1}.txt" -f $n, $nm)); $n++ }
}
if ($Close -and $th -ne $mh) {
  $bc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
  $btn = $null; try { $btn = $target.FindAll([System.Windows.Automation.TreeScope]::Descendants, $bc) | Where-Object { $_.Current.Name -match '^(Cancel|Close|Done|OK|Anulează|Închide)$' } | Select-Object -First 1 } catch {}
  if ($btn) { try { $btn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } catch {} } else { try { $target.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close() } catch {} }
}
# UIA tree last and only on request: for the main window / menus it is useful; the dialog is already
# captured and closed, so a Qt tree that stalls here cannot block capturing the next window.
if ($Tree) { try { $src = if ($th -eq $mh) { $main } else { $target }; (Node $src 0) | ConvertTo-Json -Depth 60 | Set-Content -Encoding utf8 (Join-Path $Out "$Id.json") } catch { Write-Host "TREE-ERR" } }
if ($opener) { try { $opener.Kill() } catch {} }
Write-Host "OK:$Id"
