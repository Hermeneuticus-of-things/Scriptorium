# Runs uia-dump.ps1 for every scene in scenes.json against the reference program.
# Usage: pwsh run-classic.ps1 -Out <dir> [-Process Scrivener] [-Only id,id]
param([Parameter(Mandatory)][string]$Out, [string]$Process = 'Scrivener', [string[]]$Only = @())
$scenes = Get-Content (Join-Path $PSScriptRoot 'scenes.json') -Raw | ConvertFrom-Json
foreach ($s in $scenes) {
  if (-not $s.classic -or ($Only.Count -and $Only -notcontains $s.id)) { continue }
  $a = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'uia-dump.ps1'), '-Process', $Process, '-Out', (Join-Path $Out $s.id))
  if ($s.classic.path) { $a += @('-Path', $s.classic.path) }
  if ($s.classic.tabs) { $a += '-Tabs' }
  if ($s.classic.close) { $a += '-Close' }
  if ($s.classic.inspectorTabs) { $a += '-InspectorTabs' }
  if ($s.classic.rightClickBinder) { $a += @('-RightClickBinder', $s.classic.rightClickBinder) }
  if ($s.classic.rightClickText) { $a += '-RightClickText' }
  Write-Host "== $($s.id)"
  & pwsh @a 2>&1 | Select-Object -Last 2
}
