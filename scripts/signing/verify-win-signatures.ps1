param(
  [string]$ReleaseDir = "release",
  [string]$UnpackedDir = "",
  [string]$InstalledDir = "",
  [switch]$RequireSigned,
  [string]$ExpectedPublisher = "",
  [string]$JsonOutputPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $RequireSigned -and $env:ATHENA_REQUIRE_CODE_SIGNING -eq "true") {
  $RequireSigned = $true
}

if ([string]::IsNullOrWhiteSpace($UnpackedDir)) {
  $UnpackedDir = Join-Path $ReleaseDir "win-unpacked"
}

$targets = [System.Collections.Generic.List[string]]::new()

if (Test-Path $ReleaseDir) {
  Get-ChildItem -Path $ReleaseDir -File -Filter "Athena.IDE-*-win-*.exe" | ForEach-Object {
    $targets.Add($_.FullName)
  }
}

if (Test-Path $UnpackedDir) {
  Get-ChildItem -Path $UnpackedDir -Recurse -File | Where-Object { $_.Extension -in ".exe", ".dll" } | ForEach-Object {
    $targets.Add($_.FullName)
  }
}

if (-not [string]::IsNullOrWhiteSpace($InstalledDir) -and (Test-Path $InstalledDir)) {
  Get-ChildItem -Path $InstalledDir -Recurse -File | Where-Object { $_.Extension -in ".exe", ".dll" } | ForEach-Object {
    $targets.Add($_.FullName)
  }
}

$uniqueTargets = $targets | Select-Object -Unique
if ($uniqueTargets.Count -eq 0) {
  Write-Error "No Windows release binaries found under '$ReleaseDir' or '$UnpackedDir'."
  exit 1
}

$signtool = Get-Command signtool.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1
if (-not $signtool) {
  $kitsBase = "C:\Program Files (x86)\Windows Kits\10\bin"
  if (Test-Path $kitsBase) {
    $signtool = Get-ChildItem -Path $kitsBase -Filter "signtool.exe" -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match "\\x64\\signtool\.exe$" } |
      Sort-Object FullName -Descending |
      Select-Object -First 1 -ExpandProperty FullName
  }
}

$records = @()
$corruptFailures = @()
$missingSignFailures = @()

foreach ($filePath in $uniqueTargets) {
  $sig = Get-AuthenticodeSignature -LiteralPath $filePath
  $subj = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { $null }
  $issuer = if ($sig.SignerCertificate) { $sig.SignerCertificate.Issuer } else { $null }
  $notAfter = if ($sig.SignerCertificate) { $sig.SignerCertificate.NotAfter.ToString("yyyy-MM-ddTHH:mm:ssZ") } else { $null }
  $tsSubj = if ($sig.TimeStamperCertificate) { $sig.TimeStamperCertificate.Subject } else { $null }
  $sha256 = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLower()
  $isMsft = ($sig.Status -eq "Valid" -and $subj -like "CN=Microsoft Corporation*")

  $signtoolVerified = $null
  if ($signtool -and $sig.Status -eq "Valid") {
    & $signtool verify /pa $filePath *> $null
    $signtoolVerified = ($LASTEXITCODE -eq 0)
  }

  $record = [PSCustomObject]@{
    fileName          = [System.IO.Path]::GetFileName($filePath)
    path              = $filePath
    status            = [string]$sig.Status
    statusMessage     = $sig.StatusMessage
    publisher         = $subj
    issuer            = $issuer
    notAfter          = $notAfter
    timestampSubject  = $tsSubj
    microsoftSigned   = $isMsft
    signtoolVerifyPa  = $signtoolVerified
    sha256            = $sha256
  }
  $records += $record

  # Even in non-strict mode, corrupted/tampered or untrusted signatures always fail verification.
  if ($sig.Status -in @("HashMismatch", "NotTrusted", "UnknownError")) {
    $corruptFailures += "$($record.fileName): $($sig.Status) ($($sig.StatusMessage))"
  }
  elseif ($sig.Status -ne "Valid") {
    $missingSignFailures += "$($record.fileName): NotSigned"
  }
  else {
    if ([string]::IsNullOrWhiteSpace($tsSubj)) {
      $missingSignFailures += "$($record.fileName): Valid signature lacks RFC 3161 timestamp"
    }
    if (-not $isMsft -and -not [string]::IsNullOrWhiteSpace($ExpectedPublisher) -and ($subj -notlike "*$ExpectedPublisher*")) {
      $missingSignFailures += "$($record.fileName): Publisher '$subj' does not match expected '$ExpectedPublisher'"
    }
    if ($signtoolVerified -eq $false) {
      $corruptFailures += "$($record.fileName): signtool verify /pa failed"
    }
  }
}

$records | Format-Table fileName, status, microsoftSigned, @{Label="timestamped";Expression={[bool]$_.timestampSubject}}, publisher -AutoSize

$nonMsUnsigned = $records | Where-Object { $_.status -ne "Valid" }
$allSigned = ($corruptFailures.Count -eq 0 -and $missingSignFailures.Count -eq 0 -and $nonMsUnsigned.Count -eq 0)

$report = [PSCustomObject]@{
  generatedAt               = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  signingStatus             = if ($allSigned) { "signed" } elseif ($corruptFailures.Count -gt 0) { "invalid" } else { "unsigned" }
  smartAppControlCompatible = [bool]$allSigned
  requireSignedEnforced     = [bool]$RequireSigned
  totalFilesChecked         = $records.Count
  signedCount               = ($records | Where-Object { $_.status -eq "Valid" }).Count
  unsignedCount             = ($records | Where-Object { $_.status -ne "Valid" }).Count
  corruptFailures           = $corruptFailures
  missingSignFailures       = $missingSignFailures
  files                     = $records
}

if (-not [string]::IsNullOrWhiteSpace($JsonOutputPath)) {
  $resolvedOut = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($JsonOutputPath)
  $parentDir = Split-Path -Path $resolvedOut -Parent
  if (-not [string]::IsNullOrWhiteSpace($parentDir) -and -not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($resolvedOut, ($report | ConvertTo-Json -Depth 6), $utf8NoBom)
  Write-Host "Wrote Windows signature report to $JsonOutputPath"
}

if ($corruptFailures.Count -gt 0) {
  Write-Error ("Invalid/corrupted Authenticode signature(s) detected:`n - " + ($corruptFailures -join "`n - "))
  exit 1
}

if ($RequireSigned -and $missingSignFailures.Count -gt 0) {
  Write-Error ("Strict code-signing verification failed:`n - " + ($missingSignFailures -join "`n - "))
  exit 1
}

if (-not $allSigned) {
  Write-Warning "Windows binaries are UNSIGNED (Smart App Control incompatible). Pass -RequireSigned when release signing credentials are configured."
} else {
  Write-Host "All checked Windows executables and DLLs have valid, timestamped Authenticode signatures."
}
exit 0
