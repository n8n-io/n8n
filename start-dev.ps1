# Load .env.dev and start n8n in dev mode
# Usage: .\start-dev.ps1

$envFile = Join-Path $PSScriptRoot ".env.dev"
if (-not (Test-Path $envFile)) {
    Write-Error ".env.dev not found at $envFile"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $val = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
            Write-Host "Set $key"
        }
    }
}

Write-Host "`nEnvironment loaded from .env.dev"
Write-Host "N8N_USER_FOLDER = $env:N8N_USER_FOLDER"
Write-Host "DB_SQLITE_DATABASE = $env:DB_SQLITE_DATABASE"
Write-Host "`nStarting n8n dev..."

pnpm turbo run dev --parallel --env-mode=loose --filter=!@n8n/design-system --filter=!@n8n/chat --filter=!@n8n/task-runner --filter=!n8n-playwright
