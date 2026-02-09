#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$ApiPort = if ($env:API_PORT) { $env:API_PORT } else { 4000 }
$WebPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { 5199 }
$RootDir = Split-Path -Parent $PSScriptRoot

$ApiProcess = $null
$WebProcess = $null

function Cleanup {
    Write-Host ""
    Write-Host "Shutting down..."
    if ($script:ApiProcess -and !$script:ApiProcess.HasExited) {
        Stop-Process -Id $script:ApiProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped API server (PID $($script:ApiProcess.Id))"
    }
    if ($script:WebProcess -and !$script:WebProcess.HasExited) {
        Stop-Process -Id $script:WebProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped Vite dev server (PID $($script:WebProcess.Id))"
    }
}

function Test-PortAvailable {
    param([int]$Port, [string]$Name)

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $ownerPid = $conn[0].OwningProcess
        Write-Host "Port $Port is already in use (PID $ownerPid)."
        $answer = Read-Host "Kill it and start ${Name}? [y/N]"
        if ($answer -match '^[Yy]$') {
            Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
            Write-Host "Freed port $Port."
        } else {
            Write-Host "Skipping $Name."
            return $false
        }
    }
    return $true
}

function Wait-ForApi {
    $maxAttempts = 30
    # Bypass system proxy for localhost health checks
    $savedProxy = [System.Net.WebRequest]::DefaultWebProxy
    [System.Net.WebRequest]::DefaultWebProxy = [System.Net.GlobalProxySelection]::GetEmptyWebProxy()
    try {
        for ($i = 0; $i -lt $maxAttempts; $i++) {
            try {
                $null = Invoke-RestMethod -Uri "http://127.0.0.1:$ApiPort/api/system/health" -TimeoutSec 2 -ErrorAction Stop
                return $true
            } catch {
                Start-Sleep -Seconds 1
            }
        }
        return $false
    } finally {
        [System.Net.WebRequest]::DefaultWebProxy = $savedProxy
    }
}

Write-Host "=== Fluxmaster Dev Servers ==="
Write-Host ""

# Start API server
if (Test-PortAvailable -Port $ApiPort -Name "API server") {
    Write-Host "Starting API server on port $ApiPort..."
    $env:PORT = $ApiPort
    $ApiProcess = Start-Process -NoNewWindow -PassThru -WorkingDirectory $RootDir `
        -FilePath "cmd.exe" -ArgumentList "/c", "npx tsx packages/server/src/index.ts"

    Write-Host -NoNewline "Waiting for API server..."
    if (Wait-ForApi) {
        Write-Host " ready (PID $($ApiProcess.Id))"
    } else {
        Write-Host " failed."
        if (!$ApiProcess.HasExited) { Stop-Process -Id $ApiProcess.Id -Force }
        exit 1
    }
}

# Start Vite dev server
if (Test-PortAvailable -Port $WebPort -Name "Vite dev server") {
    Write-Host "Starting Vite dev server on port $WebPort..."
    $env:API_PORT = $ApiPort
    $WebProcess = Start-Process -NoNewWindow -PassThru -WorkingDirectory "$RootDir\packages\web" `
        -FilePath "cmd.exe" -ArgumentList "/c", "npx vite --port $WebPort"

    Start-Sleep -Seconds 2
    if (!$WebProcess.HasExited) {
        Write-Host "Vite dev server running (PID $($WebProcess.Id))"
    } else {
        Write-Host "Vite dev server failed to start."
        Cleanup
        exit 1
    }
}

Write-Host ""
Write-Host "Ready:"
if ($ApiProcess) { Write-Host "  API:  http://localhost:$ApiPort" }
if ($WebProcess) { Write-Host "  Web:  http://localhost:$WebPort" }
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers."

try {
    # Keep script alive until Ctrl+C
    while ($true) {
        if ($ApiProcess -and $ApiProcess.HasExited) {
            Write-Host "API server exited unexpectedly (exit code $($ApiProcess.ExitCode))."
            break
        }
        if ($WebProcess -and $WebProcess.HasExited) {
            Write-Host "Vite dev server exited unexpectedly (exit code $($WebProcess.ExitCode))."
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Cleanup
}
