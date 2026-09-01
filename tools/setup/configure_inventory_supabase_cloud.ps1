$ErrorActionPreference = 'Stop'

$projectRef = 'lnplmxyevcjohgpdpgfh'
$supabaseUrl = "https://$projectRef.supabase.co"
$inventoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$backendRoot = Join-Path $inventoryRoot 'backend'
$frontendEnv = Join-Path $inventoryRoot 'frontend\.env.tauri'

function Read-Required([string]$Prompt) {
    do { $value = (Read-Host $Prompt).Trim() } while (-not $value)
    return $value
}

function Read-Secret([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

Write-Host ''
Write-Host 'Smart Inventory Supabase Cloud Setup' -ForegroundColor Cyan
Write-Host 'This keeps database and secret keys out of the Tauri installer.'
Write-Host ''

$publishableKey = Read-Required 'Inventory Supabase publishable key'
$secretKey = Read-Secret 'Inventory Supabase secret key (hidden)'
$masterUsername = Read-Required 'Existing Inventory master-admin username'
$masterPassword = Read-Secret 'Existing master-admin password (hidden)'
$integrationPassword = Read-Secret 'Create a password for the TCMS integration account (hidden)'

$integrationKey = [Environment]::GetEnvironmentVariable('INVENTORY_INTEGRATION_KEY', 'User')
if (-not $integrationKey) {
    $integrationKey = Read-Secret 'Existing shared Inventory integration key (hidden)'
}
if (-not $integrationKey) { throw 'The shared Inventory integration key is required.' }

Write-Host ''
Write-Host 'Signing in to the Supabase CLI...' -ForegroundColor Cyan
Push-Location $inventoryRoot
try {
    & npx.cmd --yes supabase@latest login
    if ($LASTEXITCODE -ne 0) { throw 'Supabase CLI login failed.' }

    Write-Host 'Applying the cloud authentication migration...'
    & node.exe (Join-Path $backendRoot 'scripts\apply-cloud-migration.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Inventory database migration failed.' }

    $secretFile = Join-Path ([IO.Path]::GetTempPath()) ("inventory-edge-{0}.env" -f [guid]::NewGuid())
    try {
        [IO.File]::WriteAllText($secretFile, "INVENTORY_INTEGRATION_KEY=$integrationKey`r`n")
        & npx.cmd --yes supabase@latest secrets set --project-ref $projectRef --env-file $secretFile
        if ($LASTEXITCODE -ne 0) { throw 'Could not configure the Edge Function integration secret.' }
    } finally {
        if (Test-Path -LiteralPath $secretFile) { Remove-Item -LiteralPath $secretFile -Force }
    }

    Write-Host 'Deploying the authenticated Inventory Edge API...'
    & npx.cmd --yes supabase@latest functions deploy inventory-api --project-ref $projectRef
    if ($LASTEXITCODE -ne 0) { throw 'Inventory Edge Function deployment failed.' }

    Write-Host 'Linking the master administrator and TCMS integration accounts...'
    $env:INVENTORY_SUPABASE_URL = $supabaseUrl
    $env:INVENTORY_SUPABASE_SECRET_KEY = $secretKey
    $env:INVENTORY_MASTER_USERNAME = $masterUsername
    $env:INVENTORY_MASTER_PASSWORD = $masterPassword
    $env:INVENTORY_INTEGRATION_PASSWORD = $integrationPassword
    & node.exe (Join-Path $backendRoot 'scripts\bootstrap-cloud-auth.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Inventory cloud account bootstrap failed.' }

    $lines = [Collections.Generic.List[string]]::new()
    if (Test-Path -LiteralPath $frontendEnv) {
        foreach ($line in [IO.File]::ReadAllLines($frontendEnv)) {
            if ($line -notmatch '^VITE_SUPABASE_' -and $line -notmatch '^VITE_API_URL=') { $lines.Add($line) }
        }
    }
    $lines.Insert(0, "VITE_API_URL=$supabaseUrl/functions/v1/inventory-api")
    $lines.Insert(0, "VITE_SUPABASE_PUBLISHABLE_KEY=$publishableKey")
    $lines.Insert(0, "VITE_SUPABASE_URL=$supabaseUrl")
    [IO.File]::WriteAllLines($frontendEnv, $lines)

    [Environment]::SetEnvironmentVariable('INVENTORY_SUPABASE_URL', $supabaseUrl, 'User')
    [Environment]::SetEnvironmentVariable('INVENTORY_SUPABASE_PUBLISHABLE_KEY', $publishableKey, 'User')
    [Environment]::SetEnvironmentVariable('INVENTORY_INTEGRATION_EMAIL', 'tcms-integration@inventory.ccwd.invalid', 'User')
    [Environment]::SetEnvironmentVariable('INVENTORY_INTEGRATION_PASSWORD', $integrationPassword, 'User')
    [Environment]::SetEnvironmentVariable('INVENTORY_INTEGRATION_URL', "$supabaseUrl/functions/v1/inventory-api", 'User')
    [Environment]::SetEnvironmentVariable('INVENTORY_INTEGRATION_KEY', $integrationKey, 'User')

    Write-Host ''
    Write-Host 'Cloud endpoint configured:' -ForegroundColor Green
    Write-Host "  $supabaseUrl/functions/v1/inventory-api"
    Write-Host 'The Supabase secret key and account passwords were not written to project files.'
} finally {
    $env:INVENTORY_SUPABASE_SECRET_KEY = $null
    $env:INVENTORY_MASTER_PASSWORD = $null
    $env:INVENTORY_INTEGRATION_PASSWORD = $null
    $secretKey = $null
    $masterPassword = $null
    Pop-Location
}
