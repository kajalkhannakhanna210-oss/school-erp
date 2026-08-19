# Download a Chromium snapshot for Windows and extract to .local-chrome
# Usage: Open PowerShell as admin and run: ./scripts/download-chromium.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $root "..\.local-chrome"
$dest = Resolve-Path -Path $dest -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Path -ErrorAction SilentlyContinue
if (-not $dest) { $dest = Join-Path $root "..\.local-chrome" }
$dest = [System.IO.Path]::GetFullPath($dest)

if (Test-Path $dest) {
    Write-Host "Chromium already downloaded at: $dest"
    Write-Host "Set PUPPETEER_EXECUTABLE_PATH to: $dest\chrome-win\chrome.exe"
    exit 0
}

$base = 'https://storage.googleapis.com/chromium-browser-snapshots/Win'
Write-Host "Querying latest Chromium snapshot..."
$lastChangeUrl = "$base/LAST_CHANGE"
$last = (Invoke-RestMethod -Uri $lastChangeUrl -UseBasicParsing).ToString().Trim()
if (-not $last) { Write-Error "Could not determine latest snapshot."; exit 1 }

$zipUrl = "$base/$last/chrome-win.zip"
Write-Host "Downloading Chromium build #$last..."

$tmp = Join-Path $env:TEMP "chromium-$last.zip"
Invoke-WebRequest -Uri $zipUrl -OutFile $tmp -UseBasicParsing -Verbose

Write-Host "Extracting to $dest"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -LiteralPath $tmp -DestinationPath $dest
Remove-Item $tmp -Force

$exe = Join-Path $dest "chrome-win\chrome.exe"
if (Test-Path $exe) {
    Write-Host "Chromium downloaded to: $dest\chrome-win"
    Write-Host "Set environment variable for current PowerShell session with:`n$env:PUPPETEER_EXECUTABLE_PATH = \"$exe\"`
    Write-Host "To set permanently (current user):`n[Environment]::SetEnvironmentVariable('PUPPETEER_EXECUTABLE_PATH', '$exe', 'User')"
    exit 0
} else {
    Write-Error "Download succeeded but chrome.exe not found in extracted output. Check the archive or try again."; exit 2
}
