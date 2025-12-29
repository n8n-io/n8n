# Quick ShellCheck installer for Windows (n8n development)
# Run this once to install ShellCheck for bash script linting

if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Installing ShellCheck via winget..."
    winget install --id koalaman.shellcheck --accept-package-agreements
} elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
    Write-Host "Installing ShellCheck via Scoop..."
    scoop install shellcheck
} elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Installing ShellCheck via Chocolatey..."
    choco install shellcheck -y
} else {
    Write-Warning "No package manager found. Please install ShellCheck manually from: https://github.com/koalaman/shellcheck/releases"
    exit 1
}

# Verify installation
if (Get-Command shellcheck -ErrorAction SilentlyContinue) {
    Write-Host "✅ ShellCheck installed successfully!"
    & shellcheck --version
} else {
    Write-Error "❌ ShellCheck installation failed"
    exit 1
}