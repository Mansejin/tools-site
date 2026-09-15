#Requires -Version 7
# UTF-8: 시험 작성 도구 웹 UI 기동 (Windows PowerShell 7)
$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$WebDir = Join-Path $Root "exam-tools-web"
$ToolsDir = Join-Path $Root "exam-tools"
$VenvPython = Join-Path $WebDir ".venv\Scripts\python.exe"
$Activate = Join-Path $WebDir ".venv\Scripts\Activate.ps1"

if (-not (Test-Path $ToolsDir)) {
    Write-Error "형제 폴더가 없습니다: $ToolsDir (exam-tools 와 exam-tools-web 이 같은 edu_works 아래에 있어야 합니다)"
}
if (-not (Test-Path $WebDir)) {
    Write-Error "웹 폴더가 없습니다: $WebDir"
}

Set-Location $WebDir

if (-not (Test-Path $VenvPython)) {
    Write-Host "venv 생성 중..."
    python -m venv .venv
}

& $Activate
pip install -r requirements.txt
Write-Host "http://127.0.0.1:8765/ 에서 접속하세요. 중지: Ctrl+C"
uvicorn app:app --host 127.0.0.1 --port 8765
