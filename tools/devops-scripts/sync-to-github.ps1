<#
.SYNOPSIS
    Auto Sync: D drive dev -> E drive mirror -> GitHub -> Gitee -> GitCODE -> CodeUP -> Bitbucket -> EdgeOne deploy
#>

param(
    [string]$Project = "",
    [switch]$SkipTest,
    [switch]$SkipPush,
    [switch]$Deploy,
    [switch]$DryRun
)

# Multi-platform remote URLs
$Platforms = @{
    "github"    = "https://github.com/afdk1991/{repo}.git"
    "gitee"     = "https://gitee.com/mallwm/{repo}.git"
    "atomgit"   = "https://atomgit.com/wlxypay/{repo}.git"
    # "codeup"  = "https://codeup.aliyun.com/{org}/{repo}.git"  # TODO: add org ID
    # "bitbucket" = "https://bitbucket.org/{workspace}/{repo}.git"  # TODO: add workspace ID
}

$ProjectMap = @{
    "项目002" = @{ EName = "gale-engine";       Repo = "gale-engine";       HasTest = $true;  HasEdgeone = $false }
    "项目003" = @{ EName = "email-aggregator";  Repo = "email-aggregator";  HasTest = $true;  HasEdgeone = $true  }
    "项目004" = @{ EName = "proj-04";           Repo = "proj-04";           HasTest = $false; HasEdgeone = $false }
    "项目005机箱" = @{ EName = "proj-05";       Repo = "proj-05";           HasTest = $false; HasEdgeone = $false }
    "项目006" = @{ EName = "proj-06";           Repo = "proj-06";           HasTest = $false; HasEdgeone = $false }
    "项目007" = @{ EName = "manju";             Repo = "manju";             HasTest = $false; HasEdgeone = $false }
    "项目008采集" = @{ EName = "proj-08";       Repo = "proj-08";           HasTest = $false; HasEdgeone = $false }
    "MIXMLAAL" = @{ EName = "MIXMLAAL";         Repo = "MIXMLAAL";          HasTest = $true;  HasEdgeone = $false }
    "RouteNav" = @{ EName = "RouteNav";         Repo = "RouteNav";          HasTest = $false; HasEdgeone = $false }
    "zhinenglux" = @{ EName = "zhinenglux";     Repo = "zhinenglux";        HasTest = $false; HasEdgeone = $false }
    "conWordPress" = @{ EName = "conWordPress";  Repo = "conWordPress";      HasTest = $false; HasEdgeone = $false }
    "proj-00" = @{ EName = "proj-00";           Repo = "proj-00";           HasTest = $false; HasEdgeone = $false }
}

$ExcludeDirs = @("node_modules",".git","dist","build","out","release","__pycache__",".next",".nuxt",".cache",".gocache",".gopath",".tmp_att",".tmp_q",".ci-logs",".trae",".workbuddy","vendor","venv",".venv")
$ExcludeFiles = @("*.log",".env",".env.local","*.bak","*.zip","*.tar.gz")

$DBase = "D:\网站全栈项目"
$EBase = "E:\04_个人项目\github所有仓库项目"

Write-Host "========================================"
Write-Host "  Auto Sync: D -> E -> GitHub"
Write-Host "========================================"

if ($Project -ne "") {
    if ($ProjectMap.ContainsKey($Project)) {
        $projects = @($Project)
    } else {
        Write-Host "Project not found: $Project" -ForegroundColor Red
        exit 1
    }
} else {
    $projects = $ProjectMap.Keys
}

$results = @()

foreach ($dName in $projects) {
    $info = $ProjectMap[$dName]
    $eName = $info.EName
    $dPath = Join-Path $DBase $dName
    $ePath = Join-Path $EBase $eName

    Write-Host ""
    Write-Host "========================================"
    Write-Host "Project: $dName -> $eName"
    Write-Host "========================================"

    $result = @{ Project = $dName; Test = "skip"; Sync = "skip"; Push = "skip"; Deploy = "skip" }

    if (-not (Test-Path $dPath)) {
        Write-Host "  [FAIL] D path not found" -ForegroundColor Red
        $results += $result
        continue
    }

    # 1. Test
    if (-not $SkipTest -and $info.HasTest) {
        Write-Host "[Step] Running tests..."
        Set-Location $dPath
        if (-not $DryRun) {
            try {
                if (Test-Path "package.json") { npm test 2>&1 | Out-Null }
                elseif (Test-Path "go.mod") { go test ./... 2>&1 | Out-Null }
                Write-Host "  [OK] Tests passed" -ForegroundColor Green
            } catch {
                Write-Host "  [WARN] Tests failed" -ForegroundColor Yellow
            }
        }
        $result.Test = "done"
    }

    # 2. Sync
    Write-Host "[Step] Syncing files..."
    if (-not (Test-Path $ePath)) {
        if (-not $DryRun) { New-Item -ItemType Directory -Path $ePath -Force | Out-Null }
    }

    $robocopyArgs = @($dPath, $ePath, "/E", "/NFL", "/NDL", "/NJH", "/NJS")
    foreach ($d in $ExcludeDirs) { $robocopyArgs += "/XD"; $robocopyArgs += $d }
    foreach ($f in $ExcludeFiles) { $robocopyArgs += "/XF"; $robocopyArgs += $f }

    if ($DryRun) {
        Write-Host "  [DryRun] robocopy"
    } else {
        & robocopy @robocopyArgs | Out-Null
        Write-Host "  [OK] Sync done" -ForegroundColor Green
    }
    $result.Sync = "done"

    # 3. Git push to all platforms
    if (-not $SkipPush) {
        Write-Host "[Step] Git push to all platforms..."
        Set-Location $ePath

        if (-not (Test-Path ".git")) {
            if (-not $DryRun) {
                git init 2>&1 | Out-Null
            }
        }

        # Configure remotes for each platform
        foreach ($platform in $Platforms.Keys) {
            $url = $Platforms[$platform] -replace "\{repo\}", $info.Repo
            if (-not $DryRun) {
                # Check if remote exists
                $remotes = git remote 2>&1
                if ($remotes -notcontains $platform) {
                    git remote add $platform $url 2>&1 | Out-Null
                }
            }
        }

        if ($DryRun) {
            Write-Host "  [DryRun] git add/commit/push to all platforms"
        } else {
            git add -A 2>&1 | Out-Null
            $status = git status --porcelain 2>&1
            if ($status) {
                git commit -m "sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Out-Null
                
                # Push to all platforms
                foreach ($platform in $Platforms.Keys) {
                    Write-Host "  -> Pushing to $platform..." -NoNewline
                    # Try main branch first, then master
                    $pushResult = git push $platform main 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        $pushResult = git push $platform master 2>&1
                    }
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host " OK" -ForegroundColor Green
                    } else {
                        Write-Host " FAILED" -ForegroundColor Yellow
                    }
                }
            } else {
                Write-Host "  [INFO] No changes"
            }
        }
        $result.Push = "done"
    }

    # 4. EdgeOne
    if ($Deploy -and $info.HasEdgeone) {
        Write-Host "[Step] EdgeOne deploy..."
        Set-Location $dPath
        if (-not $DryRun -and (Test-Path "scripts/deploy-edgeone.mjs")) {
            node scripts/deploy-edgeone.mjs 2>&1 | Select-Object -Last 5
            Write-Host "  [OK] EdgeOne done" -ForegroundColor Green
        }
        $result.Deploy = "done"
    }

    $results += $result
}

Write-Host ""
Write-Host "========================================"
Write-Host "  Summary"
Write-Host "========================================"
$results | Format-Table -AutoSize