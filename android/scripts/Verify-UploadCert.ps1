#!/usr/bin/env pwsh
# Compare your keystore/JKS SHA-1 to Google Play Console "Upload key certificate".
# Usage:
#   .\scripts\Verify-UploadCert.ps1 -Keystore "..\shiftcoach-upload-new.jks" -Alias upload
# Run from repo: android folder, or adjust paths.

param(
    [Parameter(Mandatory)]
    [string] $Keystore,
    [Parameter(Mandatory)]
    [string] $Alias,
    [string] $ExpectedSha1FromPlay = "7C:3C:6E:02:9F:94:DF:21:AD:E9:23:77:45:43:A0:27:00:30:6D:A4",
    [string] $Keytool = "${env:ProgramFiles}\Android\Android Studio\jbr\bin\keytool.exe"
)

if (-not (Test-Path $Keytool)) {
    Write-Error "keytool not found at: $Keytool`nSet -Keytool to your JDK keytool.exe path."
    exit 1
}

if (-not (Test-Path $Keystore)) {
    Write-Error "Keystore not found: $Keystore"
    exit 1
}

Write-Host "Keystore : $Keystore"
Write-Host "Alias    : $Alias"
Write-Host "Expected SHA1 (Play upload cert, until reset): $ExpectedSha1FromPlay"
Write-Host ""
Write-Host "Enter keystore password when prompted."
Write-Host "---"

$output = & $Keytool @("list","-v","-keystore",$Keystore,"-alias",$Alias) 2>&1 | Out-String
Write-Host $output

$m = [regex]::Match($output, "SHA1:\s*([A-Fa-f0-9:]+)")
if (-not $m.Success) {
    Write-Warning "Could not parse SHA1 from keytool output."
    exit 1
}

$actual = $m.Groups[1].Value.Trim()
Write-Host "---"
Write-Host "Parsed SHA1: $actual"
$normActual = ($actual -replace ":", "").ToUpperInvariant()
$normExpected = ($ExpectedSha1FromPlay -replace ":", "").ToUpperInvariant()
if ($normActual.Equals($normExpected, [System.StringComparison]::Ordinal)) {
    Write-Host "Match: Upload key matches Play (you can upload before any reset)." -ForegroundColor Green
} else {
    Write-Host "No match: Either use this keystore only AFTER Play accepts your upload-key reset," -ForegroundColor Yellow
    Write-Host "           or locate the upload keystore whose SHA1 matches Play." -ForegroundColor Yellow
}
