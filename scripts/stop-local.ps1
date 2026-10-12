$projectRoot = Split-Path -Parent $PSScriptRoot
$processFile = Join-Path $projectRoot '.local/processes.json'
if (Test-Path -LiteralPath $processFile) {
    $ownedProcesses = Get-Content -LiteralPath $processFile | ConvertFrom-Json
    foreach ($processId in @($ownedProcesses.backend, $ownedProcesses.frontend)) {
        $runningProcess = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($runningProcess -and $runningProcess.ProcessName -in @('python','node')) { Stop-Process -Id $processId }
    }
    Remove-Item -LiteralPath $processFile
}
