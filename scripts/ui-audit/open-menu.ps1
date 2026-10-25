# Opens a menu path in the target process via UI Automation and then idles briefly. Run as a throwaway
# child process: a menu item that opens a MODAL dialog blocks Invoke until the dialog closes, so doing it
# here keeps the main capture process free to screenshot the dialog and then close it (which releases this).
# Usage: pwsh open-menu.ps1 -Process Scrivener -Path 'Project>Statistics...'
param([Parameter(Mandatory)][string]$Process, [Parameter(Mandatory)][string]$Path)
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$A = [System.Windows.Automation.AutomationElement]
Add-Type -Namespace OM -Name W -MemberDefinition @"
public delegate bool CB(System.IntPtr h, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool EnumWindows(CB cb, System.IntPtr l);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint pid);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr h);
public static System.IntPtr Main(uint[] pids) {
  System.IntPtr best = System.IntPtr.Zero; int area = 0;
  EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (IsWindowVisible(h) && System.Array.IndexOf(pids, p) >= 0) { var e = System.Windows.Automation.AutomationElement.FromHandle(h); var r = e.Current.BoundingRectangle; int a = (int)(r.Width*r.Height); if (a > area) { area = a; best = h; } } return true; }, System.IntPtr.Zero);
  return best;
}
"@
$ids = [uint32[]]@((Get-Process -Name $Process -ErrorAction SilentlyContinue).Id)
$mh = [OM.W]::Main($ids); if ($mh -eq [IntPtr]::Zero) { exit 1 }
$root = $A::FromHandle($mh)
function NormN($x) { return ($x -replace '[.…]+$', '').Trim() }
function Find($r, $n) {
  try { $e = $r.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::NameProperty, $n))); if ($e) { return $e } } catch {}
  # tolerate '...' vs '…' and trailing-dot differences by matching the normalized name
  try { $want = NormN $n; foreach ($c in $r.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::MenuItem)))) { if ((NormN $c.Current.Name) -eq $want) { return $c } } } catch {}
  $null
}
function Open($it) { foreach ($p in @([System.Windows.Automation.ExpandCollapsePattern], [System.Windows.Automation.InvokePattern], [System.Windows.Automation.SelectionItemPattern])) { try { $x = $it.GetCurrentPattern($p::Pattern); if ($p -eq [System.Windows.Automation.ExpandCollapsePattern]) { $x.Expand() } elseif ($p -eq [System.Windows.Automation.InvokePattern]) { $x.Invoke() } else { $x.Select() }; return } catch {} } }
foreach ($part in ($Path -split '>')) { $it = Find $root $part; if (-not $it) { $it = Find $A::RootElement $part }; if (-not $it) { exit 2 }; Open $it; Start-Sleep -Milliseconds 400; $root = $A::RootElement }
Start-Sleep -Seconds 30
