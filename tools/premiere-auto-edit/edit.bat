@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [오류] .venv 가 없습니다. 먼저 setup_windows.ps1 을 실행하세요.
  echo   powershell -ExecutionPolicy Bypass -File setup_windows.ps1
  exit /b 1
)

if "%~1"=="" (
  echo 사용법: edit.bat "원본영상.mp4"
  echo 예: edit.bat "C:\Users\sea36\OneDrive\바탕 화면\강의\IMG_3348.MOV"
  exit /b 1
)

if not exist "%~1" (
  echo 파일을 찾을 수 없음: %~1
  exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo [경고] ffmpeg 가 PATH에 없습니다. 설치 후 다시 실행하세요.
)

set PYTHONUNBUFFERED=1
".venv\Scripts\python.exe" "engine\auto_cut.py" %*
echo.
echo 결과물: %~dp0output\
endlocal
