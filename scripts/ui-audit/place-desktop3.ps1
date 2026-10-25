# Moves all top-level windows of a process to a dedicated virtual desktop (default: Desktop 3, index 2)
# so capture menus/dialogs never appear on the user's active desktop. Capture then works from any desktop
# via PrintWindow + UI Automation (neither needs the target desktop to be active).
# Needs the VirtualDesktop PowerShell module (Install-Module VirtualDesktop). Usage:
#   pwsh place-desktop3.ps1 -Process Scrivener [-Index 2]
param([Parameter(Mandatory)][string]$Process, [int]$Index = 2)
$ErrorActionPreference = 'Stop'
Import-Module VirtualDesktop -ErrorAction Stop | Out-Null
while ((Get-DesktopCount) -le $Index) { New-Desktop | Out-Null }  # ensure Desktop <Index+1> exists
$desk = Get-Desktop $Index
Add-Type -Namespace PD -Name W -MemberDefinition @"
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
$ids = [uint32[]]@((Get-Process -Name $Process -ErrorAction SilentlyContinue).Id)
if (-not $ids) { Write-Warning "no process $Process"; return }
$n = 0
foreach ($h in [PD.W]::Of($ids)) { try { Move-Window -Desktop $desk -Hwnd $h | Out-Null; $n++ } catch {} }
Write-Host "Mutat $n ferestre ale $Process pe Desktop $($Index + 1)."
