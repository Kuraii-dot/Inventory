param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,

  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [int]$Port = 5432,
  [string]$Database = 'postgres',

  [Parameter(Mandatory = $true)]
  [string]$Username
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$pgRestore = Get-Command pg_restore.exe -ErrorAction SilentlyContinue
if (-not $pgRestore) {
  $candidate = 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe'
  if (Test-Path -LiteralPath $candidate) {
    $pgRestore = Get-Item -LiteralPath $candidate
  } else {
    throw 'pg_restore.exe was not found. Install PostgreSQL command-line tools first.'
  }
}

$restoreOrder = @(
  'users',
  'categories',
  'suppliers',
  'classifications',
  'items',
  'allocations',
  'distributions',
  'combinations',
  'combination_items',
  'personnel',
  'serialized_assets',
  'asset_assignments',
  'asset_maintenance',
  'asset_phase_outs',
  'activity_logs'
)

$temporaryList = Join-Path $env:TEMP ("smart-inventory-restore-{0}.list" -f ([guid]::NewGuid()))
$securePassword = Read-Host 'Supabase database password' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $env:PGPASSWORD = $plainPassword

  $archiveList = & $pgRestore.FullName --list $BackupPath
  if ($LASTEXITCODE -ne 0) { throw 'Unable to read the PostgreSQL backup.' }

  # Custom archives can list table data in an order that does not respect
  # foreign keys. Build an explicit dependency-safe restore list.
  $selected = @()
  foreach ($table in $restoreOrder) {
    $selected += $archiveList | Where-Object {
      $_ -match " TABLE DATA public $table "
    }
  }
  foreach ($table in $restoreOrder) {
    $selected += $archiveList | Where-Object {
      $_ -match " SEQUENCE SET public ${table}_id_seq "
    }
  }

  if (-not $selected) { throw 'No supported Smart Inventory records were found in the backup.' }
  [System.IO.File]::WriteAllLines($temporaryList, [string[]]$selected)

  & $pgRestore.FullName `
    --exit-on-error `
    --single-transaction `
    --data-only `
    --no-owner `
    --no-privileges `
    --use-list=$temporaryList `
    --host=$HostName `
    --port=$Port `
    --username=$Username `
    --dbname=$Database `
    $BackupPath

  if ($LASTEXITCODE -ne 0) { throw "Restore failed with exit code $LASTEXITCODE." }
  Write-Host 'Smart Inventory records restored successfully.' -ForegroundColor Green
} finally {
  $env:PGPASSWORD = $null
  $plainPassword = $null
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  if (Test-Path -LiteralPath $temporaryList) {
    Remove-Item -LiteralPath $temporaryList -Force
  }
}
