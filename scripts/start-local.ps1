$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) { python -m venv .venv }
& '.venv/Scripts/python.exe' -m pip install -r backend/requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências Python.' }
& npm.cmd ci --prefix frontend
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar dependências frontend.' }
& '.venv/Scripts/python.exe' -m alembic -c backend/alembic.ini upgrade head
if ($LASTEXITCODE -ne 0) { throw 'Falha nas migrações.' }
New-Item -ItemType Directory -Force '.local' | Out-Null
$pythonExe = Join-Path $projectRoot '.venv/Scripts/python.exe'
$backendProcess = Start-Process -FilePath $pythonExe -ArgumentList '-m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput '.local/backend.log' -RedirectStandardError '.local/backend-error.log'
$viteScript = Join-Path $projectRoot 'frontend/node_modules/vite/bin/vite.js'
$frontendProcess = Start-Process -FilePath 'node' -ArgumentList @("`"$viteScript`"", '--host', '127.0.0.1', '--port', '3000') -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.local/frontend.log') -RedirectStandardError (Join-Path $projectRoot '.local/frontend-error.log')
@{backend=$backendProcess.Id;frontend=$frontendProcess.Id} | ConvertTo-Json | Set-Content '.local/processes.json'
Write-Host 'FiscalFlow: http://localhost:3000 | API: http://localhost:8000/docs'
