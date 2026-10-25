# ONE Desktop-3 session that drives the classic program exhaustively with REAL input (foreground on D3)
# and screenshots every state with PrintWindow, so the analysis afterwards needs no more desktop switches.
# Switches to Desktop 3, maximizes the window, walks inspector tabs, views, context menus, and every dialog
# (opened by shortcut or menu, tabs cycled with Ctrl+Tab), then switches back to the user's desktop.
# Usage: pwsh drive-classic-d3.ps1 -Process Scrivener -Out <dir> [-D3 2]
param([Parameter(Mandatory)][string]$Process, [Parameter(Mandatory)][string]$Out, [int]$D3 = 2)
$ErrorActionPreference = 'Continue'
Import-Module VirtualDesktop | Out-Null
Add-Type -AssemblyName System.Drawing, System.Windows.Forms, UIAutomationClient
$A = [System.Windows.Automation.AutomationElement]
New-Item -ItemType Directory -Force $Out | Out-Null
Add-Type -Name D3 -Namespace DR -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
[DllImport("user32.dll")] public static extern void mouse_event(uint f,uint dx,uint dy,uint d,System.IntPtr e);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h);
[DllImport("user32.dll")] public static extern bool PrintWindow(System.IntPtr h,System.IntPtr dc,uint flags);
[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h,int n);
public delegate bool CB(System.IntPtr h, System.IntPtr l);
[DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, System.IntPtr l);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint pid);
[DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
public static System.Collections.Generic.List<System.IntPtr> Of(uint[] pids){ var r=new System.Collections.Generic.List<System.IntPtr>(); EnumWindows((h,l)=>{ uint p; GetWindowThreadProcessId(h,out p); if(IsWindowVisible(h)&&System.Array.IndexOf(pids,p)>=0) r.Add(h); return true;}, System.IntPtr.Zero); return r; }
'@
$pids = [uint32[]]@((Get-Process -Name $Process).Id)
$hwnd = (Get-Process -Name $Process).MainWindowHandle
function Wins { [DR.D3]::Of([uint32[]]@((Get-Process -Name $Process -ErrorAction SilentlyContinue).Id)) }
function MainWin { $hwnd }
function Shot($h, $file) { try { $e = $A::FromHandle($h); $r = $e.Current.BoundingRectangle; $w = [int]$r.Width; $hh = [int]$r.Height; if ($w -lt 2) { return }; $b = New-Object System.Drawing.Bitmap $w, $hh; $g = [System.Drawing.Graphics]::FromImage($b); $dc = $g.GetHdc(); [DR.D3]::PrintWindow($h, $dc, 2) | Out-Null; $g.ReleaseHdc($dc); $g.Dispose(); $b.Save($file); $b.Dispose() } catch {} }
function FG { [DR.D3]::SetForegroundWindow($hwnd) | Out-Null; Start-Sleep -Milliseconds 400 }
function Click($x, $y, [string]$btn = 'L', [int]$n = 1) { [DR.D3]::SetCursorPos([int]$x, [int]$y) | Out-Null; Start-Sleep -Milliseconds 150; $dn = if ($btn -eq 'R') { 8 } else { 2 }; $up = if ($btn -eq 'R') { 16 } else { 4 }; for ($i = 0; $i -lt $n; $i++) { [DR.D3]::mouse_event($dn, 0, 0, 0, [IntPtr]::Zero); [DR.D3]::mouse_event($up, 0, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 120 } }
function Keys($s) { [System.Windows.Forms.SendKeys]::SendWait($s); Start-Sleep -Milliseconds 500 }
function NewWin($before) { @(Wins | Where-Object { $before -notcontains $_ } | ForEach-Object { $A::FromHandle($_) } | Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window } | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending | Select-Object -First 1) }
# Open a dialog by key (SendKeys string) or by menu letter+item, capture it, cycle tabs with Ctrl+Tab, close.
function Dialog($id, $open) {
  FG; $before = @(Wins); & $open; Start-Sleep -Milliseconds 1200
  $dlg = NewWin $before; if (-not $dlg) { Write-Host "NODLG:$id"; return }
  $dh = [IntPtr]$dlg.Current.NativeWindowHandle
  Shot $dh (Join-Path $Out "$id-0.png")
  for ($t = 1; $t -le 12; $t++) { Keys '^{TAB}'; Shot $dh (Join-Path $Out "$id-$t.png") }
  Keys '{ESC}'; Start-Sleep -Milliseconds 300
  # some dialogs ignore Esc; try Cancel/OK button
  if (NewWin $before) { try { $bc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button); $btn = $dlg.FindAll([System.Windows.Automation.TreeScope]::Descendants, $bc) | Where-Object { $_.Current.Name -match '^(Cancel|Close|OK|Done)$' } | Select-Object -First 1; if ($btn) { $btn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } } catch {} }
  Start-Sleep -Milliseconds 400
}

$cur = Get-DesktopIndex -Desktop (Get-CurrentDesktop)
Switch-Desktop (Get-Desktop $D3); Start-Sleep 1
[DR.D3]::ShowWindow($hwnd, 3) | Out-Null; FG
$m = $A::FromHandle($hwnd); $r = $m.Current.BoundingRectangle; $RX = [int]$r.Width

# 1) Main + views (toggles top-center ~ x 1275/1315/1355 at y 89)
Shot $hwnd (Join-Path $Out 'main.png')
Click 1355 89; Shot $hwnd (Join-Path $Out 'outliner.png')
Click 1275 89; Shot $hwnd (Join-Path $Out 'document.png')
Click 1315 89; Shot $hwnd (Join-Path $Out 'corkboard.png')

# 2) Inspector tabs (icons along y~168, right side). Open inspector first (info icon top-right).
Click ($RX - 12) 89; Start-Sleep -Milliseconds 500
$ix = @(1745, 1778, 1818, 1858, 1896); $names = @('notes', 'bookmarks', 'meta', 'snapshots', 'comments'); $k = 0
foreach ($x in $ix) { Click $x 168; Start-Sleep -Milliseconds 400; Shot $hwnd (Join-Path $Out ("insp-" + $names[$k] + '.png')); $k++ }

# 3) Context menus: right-click a binder item, then in the editor text.
Click 100 191; Start-Sleep -Milliseconds 300
$before = @(Wins); Click 100 191 'R'; Start-Sleep -Milliseconds 700
$cm = @(Wins | Where-Object { $before -notcontains $_ } | Select-Object -First 1); if ($cm) { Shot $cm (Join-Path $Out 'ctx-binder.png') }; Keys '{ESC}'
Click 1275 89; Start-Sleep -Milliseconds 300; Click 700 400; Start-Sleep -Milliseconds 200
$before = @(Wins); Click 700 400 'R'; Start-Sleep -Milliseconds 700
$cm = @(Wins | Where-Object { $before -notcontains $_ } | Select-Object -First 1); if ($cm) { Shot $cm (Join-Path $Out 'ctx-text.png') }; Keys '{ESC}'

# 4) Dialogs by shortcut (reliable on foreground)
Dialog 'compile'    { Keys '^+e' }
Dialog 'targets'    { Keys '^+t' }
Dialog 'options'    { Keys '^,' }
Dialog 'pagesetup'  { Keys '^+p' }
Dialog 'projbookmarks' { Keys '^+3' }
# Win-key shortcuts and others via the menu bar (click menu, then item by its accelerator letter)
Dialog 'statistics'   { Click 320 51; Start-Sleep -Milliseconds 400; Keys 's' }
Dialog 'projsettings' { Click 320 51; Start-Sleep -Milliseconds 400; Keys 'e' }
Dialog 'writinghist'  { Click 320 51; Start-Sleep -Milliseconds 400; Keys 'w' }
Dialog 'keywords'     { Click 320 51; Start-Sleep -Milliseconds 400; Keys 'k' }
Dialog 'namegen'      { Click 73 51;  Start-Sleep -Milliseconds 400; Keys 'w'; Start-Sleep -Milliseconds 300; Keys 'n' }

# 5) Composition mode (F11) and Scratchpad (Window menu)
FG; Keys '{F11}'; Start-Sleep 1; Shot $hwnd (Join-Path $Out 'composition.png'); Keys '{ESC}'; Start-Sleep -Milliseconds 500
Dialog 'scratchpad' { Click 555 51; Start-Sleep -Milliseconds 400; Keys 's' }

Switch-Desktop (Get-Desktop $cur)
Write-Host "DONE prev-desktop=$cur out=$Out"
