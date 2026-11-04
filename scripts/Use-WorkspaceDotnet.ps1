# Dot-source from the repository root: . ./scripts/Use-WorkspaceDotnet.ps1
$dppWorkspaceRoot = Split-Path -Parent $PSScriptRoot
$dppSdkRoot = Join-Path $dppWorkspaceRoot '.tools/dotnet'
if (-not (Test-Path -LiteralPath (Join-Path $dppSdkRoot 'dotnet.exe'))) {
    throw 'Workspace SDK is unavailable. Install the .NET 10 SDK and use dotnet normally.'
}
$env:DOTNET_ROOT = $dppSdkRoot
$env:DOTNET_CLI_HOME = Join-Path $dppWorkspaceRoot '.tools/cli'
$env:NUGET_PACKAGES = Join-Path $dppWorkspaceRoot '.tools/nuget'
$env:PATH = "$dppSdkRoot;$env:PATH"
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
Write-Output 'Using the workspace .NET 10 SDK for this PowerShell session.'
