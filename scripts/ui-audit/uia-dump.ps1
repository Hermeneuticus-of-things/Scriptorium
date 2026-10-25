# Dumps the UI Automation tree of a running program's windows to JSON, plus a PNG of each window.
# Records only what the accessibility layer reports (names, roles, order, enabled, toggle/value,
# shortcuts, focus); no files of the observed program are read.
# Usage: pwsh uia-dump.ps1 -Process Scrivener -Out out\classic\main [-Menus] [-Path 'Fișier>Opțiuni...']
param(
  [Parameter(Mandatory)][string]$Process,
  [Parameter(Mandatory)][string]$Out,
  [switch]$Menus,          # also expand every top-level menu and dump its items (one level of submenus)
  [string]$Path = '',      # menu path to invoke first, items separated by '>' (opens a dialog/view)
  [int]$Depth = 40,
  [int]$WaitMs = 900,
  [switch]$Tabs,          # in the dialog opened by -Path: select every tab / page-list item and dump each
  [switch]$Close,         # close that dialog afterwards (Cancel/Close button, else window close)
  [string]$RightClickBinder = '', # focus this binder item and open its context menu (via the Menu key, no mouse)
  [switch]$RightClickText,        # focus the main editor and open its context menu (via the Menu key, no mouse)
  [switch]$InspectorTabs,         # activate the inspector and dump each of its tabs
  [ValidateSet('', 'text')][string]$Context = ''   # 'text': focus the main text editor and select all before capturing
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms, System.Drawing
$A = [System.Windows.Automation.AutomationElement]
$T = [System.Windows.Automation.TreeWalker]::ControlViewWalker
New-Item -ItemType Directory -Force $Out | Out-Null

Add-Type -Namespace UA -Name Win -MemberDefinition @"
public delegate bool CB(System.IntPtr h, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint pid);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
public static System.Collections.Generic.List<System.IntPtr> Of(uint[] pids) {
  var r = new System.Collections.Generic.List<System.IntPtr>();
  EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (IsWindowVisible(h) && System.Array.IndexOf(pids, p) >= 0) r.Add(h); return true; }, System.IntPtr.Zero);
  return r;
}
"@
# Top-level visible windows of the process, found by handle (UIA root enumeration misses some, e.g. Qt windows)
function Windows-Of($name) {
  $ids = [uint32[]]@((Get-Process -Name $name -ErrorAction SilentlyContinue).Id)
  foreach ($h in [UA.Win]::Of($ids)) { try { $e = $A::FromHandle($h); if ($e.Current.BoundingRectangle.Width -gt 40) { $e } } catch {} }
}
function State($e) {
  $s = @{}
  try { $s.toggle = "$($e.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Current.ToggleState)" } catch {}
  try { $s.value = $e.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value } catch {}
  try { $s.selected = $e.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected } catch {}
  try { $s.expanded = "$($e.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Current.ExpandCollapseState)" } catch {}
  try { $r = $e.GetCurrentPattern([System.Windows.Automation.RangeValuePattern]::Pattern).Current; $s.range = "$($r.Value) [$($r.Minimum)..$($r.Maximum)]" } catch {}
  $s
}
function Node($e, $d) {
  $c = $e.Current
  $n = [ordered]@{ role = $c.ControlType.ProgrammaticName -replace '^ControlType\.', ''; name = $c.Name; id = $c.AutomationId
    enabled = $c.IsEnabled; focus = $c.HasKeyboardFocus; key = $c.AcceleratorKey; access = $c.AccessKey; help = $c.HelpText }
  foreach ($kv in (State $e).GetEnumerator()) { $n[$kv.Key] = $kv.Value }
  if ($d -lt $Depth) {
    $kids = @(); $k = $T.GetFirstChild($e)
    while ($k) { $kids += Node $k ($d + 1); $k = $T.GetNextSibling($k) }
    if ($kids.Count) { $n.children = $kids }
  }
  $n
}
function Shot($e, $file) {
  $r = $e.Current.BoundingRectangle; if ($r.Width -lt 2) { return }
  $b = New-Object System.Drawing.Bitmap ([int]$r.Width), ([int]$r.Height)
  $g = [System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen([int]$r.X, [int]$r.Y, 0, 0, $b.Size); $b.Save($file); $g.Dispose(); $b.Dispose()
}
function Find-Item($root, $name) {
  $c = New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $name)
  $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $c)
}
function Open($item) {
  try { $item.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand(); return } catch {}
  try { $item.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke(); return } catch {}
  Write-Warning "cannot open: $($item.Current.Name)"
}
# No simulated keystrokes anywhere: the user may be working in other windows meanwhile.
function Close-Item($item) { try { $item.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Collapse() } catch {}; Start-Sleep -Milliseconds 200 }
function Dump-All($tag) {
  $i = 0
  foreach ($w in Windows-Of $Process) {
    $f = Join-Path $Out ("$tag-$i"); (Node $w 0) | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 "$f.json"; Shot $w "$f.png"; $i++
  }
  # Menus and popups are often separate top-level elements of the same process
  $c = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Menu)
  $ids = (Get-Process -Name $Process).Id
  foreach ($m in $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $c) | Where-Object { $ids -contains $_.Current.ProcessId }) {
    $f = Join-Path $Out ("$tag-popup$i"); (Node $m 0) | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 "$f.json"; Shot $m "$f.png"; $i++
  }
}

$main = @(Windows-Of $Process | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending)[0]; if (-not $main) { throw "no window for $Process" }
try { $main.SetFocus() } catch { Add-Type -Name W -Namespace U -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);'; [U.W]::SetForegroundWindow([IntPtr]$main.Current.NativeWindowHandle) | Out-Null }
# Clean state: a previous run may have left a dialog or menu open, which blocks the menu bar.
# Close every secondary top-level window (Cancel/Close, else window close), then clear open menus.
Add-Type -Name Kb0 -Namespace UA0 -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint f, System.IntPtr e);' -ErrorAction SilentlyContinue
foreach ($extra in @(Windows-Of $Process | Where-Object { $_.Current.NativeWindowHandle -ne $main.Current.NativeWindowHandle })) {
  $bc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
  $cancel = $extra.FindAll([System.Windows.Automation.TreeScope]::Descendants, $bc) | Where-Object { $_.Current.Name -match '^(Cancel|Close|Done|OK|Anulează|Închide)$' } | Select-Object -First 1
  if ($cancel) { try { $cancel.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } catch {} }
  else { try { $extra.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close() } catch {} }
  Start-Sleep -Milliseconds 300
}
[UA0.Kb0]::keybd_event(0x1B, 0, 0, [IntPtr]::Zero); [UA0.Kb0]::keybd_event(0x1B, 0, 2, [IntPtr]::Zero); Start-Sleep -Milliseconds 200
$main = @(Windows-Of $Process | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending)[0]
try { $main.SetFocus() } catch {}
if ($Path) {
  $root = $main
  foreach ($part in $Path -split '>') { $it = Find-Item $root $part; if (-not $it) { $it = Find-Item $A::RootElement $part }; if (-not $it) { throw "menu item not found: $part" }; Open $it; Start-Sleep -Milliseconds 350; $root = $A::RootElement }
  Start-Sleep -Milliseconds $WaitMs
}
if ($Context -eq 'text') {
  # select a text document in the binder so the editor shows text
  $ti = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::TreeItem)
  for ($i = 0; $i -lt 3; $i++) { foreach ($x in $main.FindAll([System.Windows.Automation.TreeScope]::Descendants, $ti)) { try { $x.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand() } catch {} }; Start-Sleep -Milliseconds 300 }
  $doc = Find-Item $main 'Scena 1.1'
  if ($doc) { try { $doc.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() } catch { Write-Warning 'cannot select binder item' }; Start-Sleep -Milliseconds 800 }
  # the largest editable text control of the main window is the editor
  $c = New-Object System.Windows.Automation.OrCondition((New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)), (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Document)))
  $ed = $main.FindAll([System.Windows.Automation.TreeScope]::Descendants, $c) | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending | Select-Object -First 1
  try { $ed.SetFocus() } catch {}; try { $ed.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern).DocumentRange.Select() } catch { Write-Warning 'no text pattern on editor' }; Start-Sleep -Milliseconds 300
}
Dump-All 'scene'
$dlg = @(Windows-Of $Process | Where-Object { $_.Current.NativeWindowHandle -ne $main.Current.NativeWindowHandle })[0]
function Pick($el) {
  foreach ($p in @([System.Windows.Automation.SelectionItemPattern], [System.Windows.Automation.InvokePattern], [System.Windows.Automation.TogglePattern])) {
    try { $pt = $el.GetCurrentPattern($p::Pattern); if ($p -eq [System.Windows.Automation.SelectionItemPattern]) { $pt.Select() } elseif ($p -eq [System.Windows.Automation.InvokePattern]) { $pt.Invoke() } else { $pt.Toggle() }; return } catch {}
  }
  Write-Warning "cannot pick $($el.Current.Name)"
}
function Of-Role($root, $ct) { @($root.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, $ct)))) }
if ($Tabs -and $dlg) {
  # outer pages: tab items, or the row of toggle buttons along the top of a settings dialog
  $outer = Of-Role $dlg ([System.Windows.Automation.ControlType]::TabItem)
  if (-not $outer.Count) {
    $top = $dlg.Current.BoundingRectangle.Y
    $outer = @(Of-Role $dlg ([System.Windows.Automation.ControlType]::CheckBox) | Where-Object { $_.Current.BoundingRectangle.Width -gt 0 -and $_.Current.BoundingRectangle.Y -lt $top + 110 })
    # only the row itself: same top edge as the first toggle (a page checkbox can sit just below it)
    if ($outer.Count) { $y0 = ($outer | ForEach-Object { $_.Current.BoundingRectangle.Y } | Measure-Object -Minimum).Minimum; $outer = @($outer | Where-Object { [math]::Abs($_.Current.BoundingRectangle.Y - $y0) -lt 6 }) }
  }
  if (-not $outer.Count) { $outer = @($null) }
  $n = 0
  foreach ($o in $outer) {
    if ($o) { $oname = $o.Current.Name; Pick $o; Start-Sleep -Milliseconds 600 } else { $oname = 'page' }
    # inner pages: the leftmost list of the dialog, if any
    $list = Of-Role $dlg ([System.Windows.Automation.ControlType]::List) | Where-Object { $_.Current.BoundingRectangle.Width -gt 0 } | Sort-Object { $_.Current.BoundingRectangle.X } | Select-Object -First 1
    $inner = if ($list) { @($list.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)) } else { @() }
    if (-not $inner.Count) { $inner = @(Of-Role $dlg ([System.Windows.Automation.ControlType]::TabItem) | Where-Object { $_.Current.BoundingRectangle.Width -gt 0 }) }
    if (-not $inner.Count) { Dump-All ("tab{0:d2}-{1}" -f $n, ($oname -replace '[^\w]', '')); $n++; continue }
    foreach ($pg in $inner) {
      $iname = $pg.Current.Name; Pick $pg; Start-Sleep -Milliseconds 450
      Dump-All ("tab{0:d2}-{1}--{2}" -f $n, ($oname -replace '[^\w]', ''), ($iname -replace '[^\w]', '')); $n++
    }
  }
}
if ($Close -and $dlg) {
  $bc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
  $btn = $dlg.FindAll([System.Windows.Automation.TreeScope]::Descendants, $bc) | Where-Object { $_.Current.Name -match '^(Cancel|Close|Done)$' } | Select-Object -First 1
  if ($btn) { $btn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } else { try { $dlg.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close() } catch { Write-Warning 'dialog left open' } }
  Start-Sleep -Milliseconds 400
}
# Shortcut text by OCR of the popup region: the accessibility layer of some toolkits leaves it out.
function Ocr-Region($x, $y, $w, $h) {
  $png = Join-Path $env:TEMP ("ua-ocr-{0}.png" -f [guid]::NewGuid().ToString('N').Substring(0, 8))
  $b = New-Object System.Drawing.Bitmap ([int]$w), ([int]$h); $g = [System.Drawing.Graphics]::FromImage($b)
  $g.CopyFromScreen([int]$x, [int]$y, 0, 0, $b.Size); $b.Save($png); $g.Dispose(); $b.Dispose()
  $rows = & powershell -NoProfile -File (Join-Path $PSScriptRoot 'ocr.ps1') $png
  Remove-Item $png
  foreach ($r in $rows) { $p = $r -split "`t"; [pscustomobject]@{ y = [int]$p[0] + $y; x = [int]$p[1] + $x; text = $p[2] } }
}
function Popup-Items($item, $depth) {
  Open $item; Start-Sleep -Milliseconds 450
  $host_ = $item; $first = $T.GetFirstChild($item); if ($first -and $first.Current.ControlType -eq [System.Windows.Automation.ControlType]::Menu) { $host_ = $first }
  $kids = @(); $k = $T.GetFirstChild($host_); while ($k) { $kids += $k; $k = $T.GetNextSibling($k) }
  $rects = $kids | ForEach-Object { $_.Current.BoundingRectangle } | Where-Object { $_.Width -gt 0 }
  $ocr = @()
  if ($rects) {
    $x0 = ($rects | Measure-Object X -Minimum).Minimum; $y0 = ($rects | Measure-Object Y -Minimum).Minimum
    $x1 = ($rects | ForEach-Object { $_.X + $_.Width } | Measure-Object -Maximum).Maximum; $y1 = ($rects | ForEach-Object { $_.Y + $_.Height } | Measure-Object -Maximum).Maximum
    $ocr = @(Ocr-Region $x0 $y0 ($x1 - $x0) ($y1 - $y0))
  }
  $out = @()
  foreach ($k in $kids) {
    $c = $k.Current; $r = $c.BoundingRectangle; $s = State $k
    $role = $c.ControlType.ProgrammaticName -replace '^ControlType\.', ''
    $it = [ordered]@{ role = $role; name = $c.Name; enabled = $c.IsEnabled; key = $c.AcceleratorKey }
    if ($s.toggle) { $it.toggle = $s.toggle }
    if (-not $it.key -and $r.Width -gt 0) {
      # the shortcut is the OCR text in the right half of this item's row
      $hit = $ocr | Where-Object { $_.y -ge $r.Y - 3 -and $_.y -lt $r.Y + $r.Height - 2 -and $_.x -gt $r.X + $r.Width * 0.55 }
      if ($hit) { $it.key = (($hit | ForEach-Object text) -join ' ') }
    }
    $sub = $false; try { $null = $k.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern); $sub = $true } catch {}
    if ($sub -and $depth -lt 3 -and $c.IsEnabled -and $role -eq 'MenuItem') { $it.children = @(Popup-Items $k ($depth + 1)); Close-Item $k }
    elseif ($sub) { $it.submenu = $true }
    $out += $it
  }
  $out
}
if ($Menus) {
  $c = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::MenuBar)
  $bar = $main.FindAll([System.Windows.Automation.TreeScope]::Descendants, $c) | Where-Object { $_.Current.Name -notmatch 'System|Sistem' } | Select-Object -First 1
  $tops = @(); $k = $T.GetFirstChild($bar)
  while ($k) {
    $tops += [ordered]@{ role = 'MenuItem'; name = $k.Current.Name; children = @(Popup-Items $k 1) }
    Close-Item $k
    $k = $T.GetNextSibling($k)
  }
  [ordered]@{ role = 'MenuBar'; name = $Process; children = $tops } | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $Out 'menus.json')
}

# Open a context menu on the focused element with the Menu/Apps key (Shift+F10 fallback), no mouse,
# then dump the popup the same way as the menu bar. Returns the serialized popup or $null.
Add-Type -Name Kb -Namespace UA2 -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint f, System.IntPtr e);' -ErrorAction SilentlyContinue
function Send-Vk($vk) { [UA2.Kb]::keybd_event($vk, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 40; [UA2.Kb]::keybd_event($vk, 0, 2, [IntPtr]::Zero) }
function Context-Menu($tag) {
  Send-Vk 0x5D; Start-Sleep -Milliseconds 600            # VK_APPS
  $ids = (Get-Process -Name $Process).Id
  $mc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Menu)
  $pop = $A::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $mc) | Where-Object { $ids -contains $_.Current.ProcessId -and $_.Current.BoundingRectangle.Width -gt 0 } | Select-Object -First 1
  if (-not $pop) { Write-Warning "no context menu for $tag"; return }
  $items = @(); $k = $T.GetFirstChild($pop); while ($k) { $items += [ordered]@{ role = ($k.Current.ControlType.ProgrammaticName -replace '^ControlType\.', ''); name = $k.Current.Name; enabled = $k.Current.IsEnabled }; $k = $T.GetNextSibling($k) }
  [ordered]@{ role = 'ContextMenu'; name = $tag; children = $items } | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $Out "ctx-$tag.json")
  Shot $pop (Join-Path $Out "ctx-$tag.png")
  Send-Vk 0x1B                                            # VK_ESCAPE
}
if ($RightClickBinder) {
  $ti = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::TreeItem)
  for ($i = 0; $i -lt 3; $i++) { foreach ($x in $main.FindAll([System.Windows.Automation.TreeScope]::Descendants, $ti)) { try { $x.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand() } catch {} }; Start-Sleep -Milliseconds 250 }
  $it = Find-Item $main $RightClickBinder
  if ($it) { try { $it.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() } catch {}; try { $it.SetFocus() } catch {}; Start-Sleep -Milliseconds 400; Context-Menu 'binder' } else { Write-Warning "binder item not found: $RightClickBinder" }
}
if ($RightClickText) {
  $c = New-Object System.Windows.Automation.OrCondition((New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)), (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Document)))
  $ed = $main.FindAll([System.Windows.Automation.TreeScope]::Descendants, $c) | Sort-Object { $_.Current.BoundingRectangle.Width * $_.Current.BoundingRectangle.Height } -Descending | Select-Object -First 1
  if ($ed) { try { $ed.SetFocus() } catch {}; Start-Sleep -Milliseconds 400; Context-Menu 'text' } else { Write-Warning 'editor not found' }
}
if ($InspectorTabs) {
  # Activate the inspector (menu item or toolbar toggle), then dump each of its tab items.
  $insp = Find-Item $main 'Inspector'
  if ($insp) { try { $insp.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } catch { try { $insp.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Toggle() } catch {} }; Start-Sleep -Milliseconds 700 }
  $tc = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)
  $tabs = @($main.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tc) | Where-Object { $_.Current.BoundingRectangle.Width -gt 0 } | Sort-Object { $_.Current.BoundingRectangle.X })
  $n = 0
  foreach ($tb in $tabs) { try { $tb.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() } catch {}; Start-Sleep -Milliseconds 450; Dump-All ("insp{0:d2}-{1}" -f $n, ($tb.Current.Name -replace '[^\w]', '')); $n++ }
}