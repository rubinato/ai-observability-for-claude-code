# Windows. Runs from a clone, or straight from GitHub when piped to iex.
$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error 'Node.js 22+ is required: winget install OpenJS.NodeJS.LTS'; exit 1 }
$cli = if ($PSScriptRoot) { Join-Path $PSScriptRoot 'cli.mjs' }
if ($cli -and (Test-Path $cli)) { node $cli install } else { npx -y github:rubinato/ai-observability-for-claude-code install }
