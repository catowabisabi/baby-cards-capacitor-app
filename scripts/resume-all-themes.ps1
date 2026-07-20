# Resume all 8 remaining card-generation themes in series.
#
# After relaunching ComfyUI on http://127.0.0.1:8188, run from PowerShell:
#
#   $env:PATH = "C:\Program Files\nodejs;$env:PATH"
#   cd "C:\Users\enoma\Desktop\opencode-work\agent-works\software\baby-cards"
#   .\scripts\resume-all-themes.ps1
#
# Each theme runs sequentially through comfyui_cards.py. After each theme:
#   - npm run cards:manifest refreshes the public/cards/manifest.json
#   - The theme directory is staged and committed in one atomic commit
#
# Exit code 0 on full success; non-zero on first failure (stops the pipeline).
# Requires: ComfyUI on http://127.0.0.1:8188 with all patches in place
#           (see docs/RESUME_CARDGEN.md "Verified patches" section).
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Test-ComfyUI {
    try {
        $r = Invoke-WebRequest "http://127.0.0.1:8188/system_stats" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $j = $r.Content | ConvertFrom-Json
        $v = $j.system.comfyui_version
        Write-Host "  ComfyUI v$v reachable" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ComfyUI not reachable on 127.0.0.1:8188. Relaunch ComfyUI Desktop first." -ForegroundColor Red
        return $false
    }
}

function Run-Theme {
    param([string]$Theme, [int]$Start, [int]$Count)

    Write-Host ""
    Write-Host "=== $Theme (No.${Start}-$($Start + $Count - 1)) ===" -ForegroundColor Cyan
    & python scripts/comfyui_cards.py --theme $Theme --start $Start --count $Count
    if ($LASTEXITCODE -ne 0) {
        throw "  comfyui_cards.py failed for theme=$Theme (exit=$LASTEXITCODE). Pipeline halted."
    }

    Write-Host "  -- refreshing manifest --"
    & npm run cards:manifest
    if ($LASTEXITCODE -ne 0) {
        throw "  cards:manifest failed (exit=$LASTEXITCODE). Pipeline halted."
    }

    Write-Host "  -- committing $Theme --"
    & git -c core.autocrlf=false add "public/cards/$Theme/"
    & git -c core.autocrlf=false add "public/cards/manifest.json"
    & git -c core.autocrlf=false commit -m "feat(cards): regenerate $Theme with realistic style"
    if ($LASTEXITCODE -ne 0) {
        throw "  git commit failed for $Theme (exit=$LASTEXITCODE). Pipeline halted."
    }
    Write-Host "  -- done: $Theme --" -ForegroundColor Green
}

# Pre-flight
Write-Host "=== Pre-flight ===" -ForegroundColor Cyan
if (-not (Test-ComfyUI)) {
    Write-Host "Aborting." -ForegroundColor Red
    exit 1
}

# In order. animals first (matches existing commit history), then cars, fruits, food,
# family, body, clothes, toys. animals needs --start 4 because cards 1-3 (cat/dog/rabbit)
# are kawaii; cards 4-100 get replaced by realistic.
Run-Theme -Theme "animals" -Start 4 -Count 100
Run-Theme -Theme "cars"    -Start 1 -Count 100
Run-Theme -Theme "fruits"  -Start 1 -Count 100
Run-Theme -Theme "food"    -Start 1 -Count 100
Run-Theme -Theme "family"  -Start 1 -Count 100
Run-Theme -Theme "body"    -Start 1 -Count 100
Run-Theme -Theme "clothes" -Start 1 -Count 100
Run-Theme -Theme "toys"    -Start 1 -Count 100

Write-Host ""
Write-Host "=== All themes regenerated + committed ===" -ForegroundColor Green
Write-Host "Run: git push origin main" -ForegroundColor Cyan
