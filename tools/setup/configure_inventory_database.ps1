$ErrorActionPreference = 'Stop'

$inventoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$backendPath = Join-Path $inventoryRoot 'backend'
$envPath = Join-Path $backendPath '.env'
$startScript = Join-Path $backendPath 'start-local-server.ps1'
$migrationPath = [IO.Path]::GetFullPath((Join-Path $backendPath '..\supabase\migrations\202608240001_tcms_inspection_requests.sql'))
$databaseToolPath = Join-Path $PSScriptRoot 'inventory_database_tool.mjs'

function Write-EnvLines([string[]]$Lines) {
    [IO.File]::WriteAllLines($envPath, $Lines, [Text.UTF8Encoding]::new($false))
}

function Set-DatabaseUrl([string[]]$Lines, [string]$DatabaseUrl) {
    $updatedLines = [Collections.Generic.List[string]]::new()
    $found = $false
    foreach ($line in $Lines) {
        if ($line -match '^DATABASE_URL=') {
            $updatedLines.Add("DATABASE_URL=$DatabaseUrl")
            $found = $true
        } else {
            $updatedLines.Add($line)
        }
    }
    if (-not $found) { $updatedLines.Add("DATABASE_URL=$DatabaseUrl") }
    return [string[]]$updatedLines.ToArray()
}

function Test-InventoryDatabase {
    $env:CCWD_INVENTORY_BACKEND = $backendPath
    try {
        $output = & node $databaseToolPath test
    } finally {
        Remove-Item Env:CCWD_INVENTORY_BACKEND -ErrorAction SilentlyContinue
    }
    $jsonLine = $output | Where-Object { "$_".TrimStart().StartsWith('{') } | Select-Object -Last 1
    if (-not $jsonLine) { throw 'The database test did not return a result.' }
    return $jsonLine | ConvertFrom-Json
}

if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Inventory backend .env was not found: $envPath"
}

$configuredLines = [string[]](Get-Content -LiteralPath $envPath)
$databaseLine = $configuredLines | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $databaseLine) {
    throw 'DATABASE_URL is missing from the Inventory backend .env file.'
}

$currentValue = $databaseLine.Substring('DATABASE_URL='.Length).Trim().Trim('"')

# pg already receives rejectUnauthorized=false in backend/db/pool.js. Keeping sslmode=require
# in the URL overrides that option in current pg versions and causes SELF_SIGNED_CERT_IN_CHAIN.
$normalizedValue = $currentValue -replace '\?sslmode=require$', ''
if ($normalizedValue -ne $currentValue) {
    $configuredLines = Set-DatabaseUrl $configuredLines $normalizedValue
    Write-EnvLines $configuredLines
    $currentValue = $normalizedValue
    Write-Host 'Removed an incompatible SSL option from DATABASE_URL.' -ForegroundColor Yellow
}

try {
    $currentUri = [Uri]$currentValue
} catch {
    throw 'The existing DATABASE_URL is invalid. Restore a valid Inventory Supabase connection string first.'
}

$userInfoParts = $currentUri.UserInfo.Split(':', 2)
$databaseUser = [Uri]::UnescapeDataString($userInfoParts[0])
$databaseName = $currentUri.AbsolutePath.TrimStart('/')
if ([string]::IsNullOrWhiteSpace($databaseUser) -or [string]::IsNullOrWhiteSpace($databaseName)) {
    throw 'The existing DATABASE_URL does not contain a database user and database name.'
}

Write-Host 'Smart Inventory database repair' -ForegroundColor Cyan
Write-Host "Supabase host: $($currentUri.Host)"
Write-Host "Database user: $databaseUser"
Write-Host
Write-Host 'Testing the currently saved Inventory database password...'
$testResult = Test-InventoryDatabase

if (-not $testResult.ok) {
    Write-Host "Current database login failed: $($testResult.message)" -ForegroundColor Yellow
    Write-Host
    Write-Host 'Enter the current database password for the Inventory Supabase project.'
    Write-Host 'The password is hidden and is never printed or written to a log.'
    $securePassword = Read-Host 'Inventory Supabase database password' -AsSecureString

    $passwordPointer = [IntPtr]::Zero
    try {
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        if ([string]::IsNullOrWhiteSpace($plainPassword)) {
            throw 'The database password cannot be empty.'
        }

        $encodedUser = [Uri]::EscapeDataString($databaseUser)
        $encodedPassword = [Uri]::EscapeDataString($plainPassword)
        $newDatabaseUrl = "postgresql://${encodedUser}:${encodedPassword}@$($currentUri.Host):$($currentUri.Port)/${databaseName}"
        $previousLines = $configuredLines
        $configuredLines = Set-DatabaseUrl $configuredLines $newDatabaseUrl
        Write-EnvLines $configuredLines
    } finally {
        $plainPassword = $null
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
    }

    $testResult = Test-InventoryDatabase
    if (-not $testResult.ok) {
        Write-EnvLines $previousLines
        Write-Host
        Write-Host 'The supplied database settings were rejected. The previous configuration was restored.' -ForegroundColor Red
        Write-Host $testResult.message
        exit 1
    }
}

Write-Host
Write-Host 'Database login succeeded.' -ForegroundColor Green

if (-not $testResult.migration_installed) {
    Write-Host 'The inspection request tables are not installed yet.' -ForegroundColor Yellow
    $applyMigration = Read-Host 'Apply the Inventory inspection-request migration now? [Y/n]'
    if ([string]::IsNullOrWhiteSpace($applyMigration) -or $applyMigration -match '^[Yy]') {
        if (-not (Test-Path -LiteralPath $migrationPath)) {
            throw "Migration file was not found: $migrationPath"
        }
        $env:CCWD_INVENTORY_MIGRATION = $migrationPath
        $env:CCWD_INVENTORY_BACKEND = $backendPath
        try {
            $migrationOutput = & node $databaseToolPath migrate
        } finally {
            Remove-Item Env:CCWD_INVENTORY_BACKEND -ErrorAction SilentlyContinue
            Remove-Item Env:CCWD_INVENTORY_MIGRATION -ErrorAction SilentlyContinue
        }
        $migrationJson = $migrationOutput | Where-Object { "$_".TrimStart().StartsWith('{') } | Select-Object -Last 1
        if (-not $migrationJson) { throw 'The Inventory migration did not return a result.' }
        $migrationResult = $migrationJson | ConvertFrom-Json
        if (-not $migrationResult.ok) { throw "The Inventory migration failed: $($migrationResult.message)" }
        Write-Host 'Inspection request tables are ready.' -ForegroundColor Green
    } else {
        Write-Host "Run this migration before opening Inspection Requests: $migrationPath" -ForegroundColor Yellow
    }
}

$listeners = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
    $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq 'node') {
        Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
    } elseif ($process) {
        throw "Port 5000 is used by $($process.ProcessName), so the Inventory API was not restarted."
    }
}

& $startScript
$healthReady = $false
for ($attempt = 0; $attempt -lt 10; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/health' -TimeoutSec 2
        if ($health.status -eq 'ok') {
            $healthReady = $true
            break
        }
    } catch {
        # The API may still be starting.
    }
}

if (-not $healthReady) {
    throw 'The database login succeeded, but the Inventory API health check did not become ready.'
}

Write-Host 'Inventory LAN API is online and connected to Supabase.' -ForegroundColor Green
Write-Host 'You can reopen Smart Inventory and refresh Inspection Requests.'
