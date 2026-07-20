#Requires -Version 5.1
<#
.SYNOPSIS
  Premiere-Pro-edit-bibl Windows GPU 설치 스크립트
.DESCRIPTION
  - Python venv 생성
  - CUDA PyTorch + openai-whisper 설치
  - ffmpeg 확인
  - GPU 테스트 + Whisper turbo 모델 사전 다운로드
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host "=== Premiere Auto-Edit / Whisper GPU 설치 ===" -ForegroundColor Cyan
Write-Host "폴더: $Root"
Write-Host ""

# ── Python ──
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Host "[오류] python 이 PATH에 없습니다." -ForegroundColor Red
    Write-Host "https://www.python.org/downloads/ 에서 3.10~3.12 설치 후"
    Write-Host "'Add python.exe to PATH' 체크하고 다시 실행하세요."
    exit 1
}
$ver = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
Write-Host "[OK] Python $ver  ($($py.Source))"

# ── NVIDIA ──
$nvsmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($nvsmi) {
    Write-Host "[OK] nvidia-smi 발견"
    & nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
} else {
    Write-Host "[경고] nvidia-smi 없음 — NVIDIA 드라이버를 설치하세요." -ForegroundColor Yellow
    Write-Host "       https://www.nvidia.com/Download/index.aspx"
    Write-Host "       계속하면 CPU로 설치됩니다 (매우 느림)."
}

# ── venv ──
$venvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host ""
    Write-Host "> 가상환경 생성 (.venv)..."
    & python -m venv .venv
}
$venvPip = Join-Path $Root ".venv\Scripts\pip.exe"
& $venvPy -m pip install -U pip wheel setuptools | Out-Host

# ── CUDA Torch ──
Write-Host ""
Write-Host "> CUDA PyTorch 설치 (cu124 휠)..." -ForegroundColor Cyan
& $venvPip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
if ($LASTEXITCODE -ne 0) {
    Write-Host "[경고] cu124 실패 → cu121 재시도" -ForegroundColor Yellow
    & $venvPip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
}

Write-Host ""
Write-Host "> openai-whisper / numpy 설치..."
& $venvPip install -r (Join-Path $Root "requirements.txt")

# ── ffmpeg ──
Write-Host ""
$ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ff) {
    Write-Host "[OK] ffmpeg: $($ff.Source)"
} else {
    Write-Host "[필요] ffmpeg 가 PATH에 없습니다." -ForegroundColor Yellow
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "> winget 으로 Gyan.FFmpeg 설치 시도..."
        & winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "수동 설치: https://www.gyan.dev/ffmpeg/builds/  (ffmpeg-release-essentials.zip)"
        Write-Host "압축 풀고 bin 폴더를 PATH에 추가하세요."
    }
}

# ── GPU + 모델 테스트 ──
Write-Host ""
Write-Host "> GPU / Whisper 모델 검증 (turbo 최초 다운로드 ~1.6GB)..." -ForegroundColor Cyan

$configPath = Join-Path $Root "config.json"
if (-not (Test-Path $configPath)) {
    @'
{
  "STT_MODEL": "turbo"
}
'@ | Set-Content -Path $configPath -Encoding UTF8
    Write-Host "[OK] config.json 생성 (STT_MODEL=turbo)"
}

& $venvPy -c @"
import torch, whisper, sys
print('torch', torch.__version__)
print('cuda_available', torch.cuda.is_available())
if torch.cuda.is_available():
    print('gpu', torch.cuda.get_device_name(0))
    print('vram_gb', round(torch.cuda.get_device_properties(0).total_memory/1024**3, 1))
    device = 'cuda'
else:
    print('GPU 미감지 — CPU로 동작합니다')
    device = 'cpu'
print('Whisper turbo 로드 중...')
m = whisper.load_model('turbo', device=device)
print('MODEL_OK', device)
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "[오류] Whisper 검증 실패" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== 설치 완료 ===" -ForegroundColor Green
Write-Host "실행 예:"
Write-Host '  .\edit.bat "C:\Users\sea36\OneDrive\바탕 화면\강의\IMG_3348.MOV"'
Write-Host ""
Write-Host "모델 캐시 위치: %USERPROFILE%\.cache\whisper\"
Write-Host ""
