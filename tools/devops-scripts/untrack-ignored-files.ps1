# =============================================================================
#  Git index cleanup (ASCII-only to avoid PS 5.1 codepage issues)
#
#  Removes from the Git index those tracked files that the project's own
#  .gitignore now marks as "should not be tracked". Files stay on disk.
#
#  Safety design:
#   1. Scope is computed by git itself (ls-files -i -c --exclude-standard),
#      never by hand-written path guesses.
#   2. Before a whole-directory untrack, it verifies
#      (junk-in-dir == tracked-in-dir). If not equal, that directory holds
#      files that must stay, so it falls back to per-file untracking.
#   3. Only `git rm --cached` is used. No file is ever deleted from disk.
#   4. No commit, no push. Everything stays staged for human review.
# =============================================================================

$ErrorActionPreference = 'Stop'

$Root = 'D:\网站全栈项目'
$Projects = @(
  '项目003',
  '项目004',
  '项目005机箱',
  '项目006',
  '项目007',
  '项目008采集'
)

function Get-Tracked($repo, $sub) {
  if ($sub) { return @(git -C $repo -c core.quotepath=false ls-files -- $sub) }
  return @(git -C $repo -c core.quotepath=false ls-files)
}

function Get-Junk($repo) {
  return @(git -C $repo -c core.quotepath=false ls-files -i -c --exclude-standard)
}

$Summary = New-Object System.Collections.ArrayList

foreach ($proj in $Projects) {
  $repo = Join-Path $Root $proj
  if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) {
    Write-Output ("[" + $proj + "] SKIP: not a git repo")
    continue
  }

  Write-Output ""
  Write-Output "================================================================="
  Write-Output ("  " + $proj)
  Write-Output "================================================================="

  $before = (Get-Tracked $repo $null).Count
  $junk = Get-Junk $repo
  $junkCount = $junk.Count

  if ($junkCount -eq 0) {
    Write-Output "  nothing to untrack, skip."
    [void]$Summary.Add([pscustomobject]@{ Project = $proj; Before = $before; After = $before; Removed = 0 })
    continue
  }

  Write-Output ("  tracked(before) = " + $before + "   to-untrack = " + $junkCount)

  # ---- candidate directories (depth<=2 prefixes) ----
  $prefixGroups = $junk | ForEach-Object {
    $parts = $_ -split '/'
    if ($parts.Count -ge 2) { ($parts[0..1] -join '/') } else { $null }
  } | Where-Object { $_ } | Group-Object

  $wholeDirs = @()
  foreach ($g in ($prefixGroups | Sort-Object Count -Descending)) {
    $dir = $g.Name
    $trackedInDir = (Get-Tracked $repo $dir).Count
    if ($trackedInDir -gt 0 -and $trackedInDir -eq $g.Count) {
      $wholeDirs += $dir
    }
  }

  # drop children already covered by a parent
  $wholeDirs = @($wholeDirs | Where-Object {
    $d = $_
    -not (@($wholeDirs | Where-Object { $_ -ne $d -and $d.StartsWith($_ + '/') }).Count -gt 0)
  } | Sort-Object -Unique)

  $remaining = @()
  if ($wholeDirs.Count -gt 0) {
    Write-Output "  -> whole-dir untrack (verified: no keepers inside):"
    foreach ($d in $wholeDirs) {
      $n = @($junk | Where-Object { $_.StartsWith($d + '/') }).Count
      Write-Output ("       " + $d + "/    (" + $n + " files)")
      git -C $repo rm -r --cached --quiet -- $d
      if ($LASTEXITCODE -ne 0) { throw ("whole-dir untrack failed: " + $proj + "/" + $d) }
    }
    $remaining = @(Get-Junk $repo)
  } else {
    $remaining = $junk
  }

  if ($remaining.Count -gt 0) {
    Write-Output ("  -> per-file untrack (" + $remaining.Count + " files):")
    $remaining | Select-Object -First 15 | ForEach-Object { Write-Output ("       " + $_) }
    if ($remaining.Count -gt 15) {
      Write-Output ("       ... and " + ($remaining.Count - 15) + " more")
    }
    foreach ($f in $remaining) {
      git -C $repo rm --cached --quiet -- $f
      if ($LASTEXITCODE -ne 0) { throw ("per-file untrack failed: " + $proj + "/" + $f) }
    }
  }

  $after = (Get-Tracked $repo $null).Count
  $leftover = @(Get-Junk $repo).Count
  Write-Output ("  tracked(after) = " + $after + "   leftover-to-untrack = " + $leftover)

  [void]$Summary.Add([pscustomobject]@{
    Project = $proj
    Before  = $before
    After   = $after
    Removed = ($before - $after)
  })
}

Write-Output ""
Write-Output "================================================================="
Write-Output "  SUMMARY"
Write-Output "================================================================="
$Summary | Format-Table -AutoSize | Out-String -Width 100 | Write-Output
Write-Output "NOTE: index-only change. No disk file deleted. No commit, no push."
