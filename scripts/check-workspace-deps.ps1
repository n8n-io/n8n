# Handle both space-separated string and array of arguments
$files = if ($args.Count -eq 1 -and $args[0] -match ' ') {
    $args[0] -split ' ' | Where-Object { $_ }
} else {
    $args | Where-Object { $_ }
}

$foundError = $false

foreach ($file in $files) {
    if ($file -and (Test-Path $file)) {
        if (Select-String -Path $file -Pattern 'workspace:\^' -Quiet) {
            Write-Host ''
            Write-Host "ERROR: Found 'workspace:^' in package.json files."
            Write-Host ''
            Write-Host "Use 'workspace:*' instead to pin exact versions."
            Write-Host "Using 'workspace:^' causes npm to resolve semver ranges when users"
            Write-Host "install from npm, which can lead to version mismatches between"
            Write-Host "@n8n/* packages and break n8n startup."
            Write-Host ''
            $foundError = $true
        }
    }
}

if ($foundError) {
    exit 1
}
