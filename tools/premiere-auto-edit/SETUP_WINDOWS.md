# Windows 로컬 GPU 설치 (openai-whisper)

이 PC에서 NVIDIA GPU로 Whisper를 돌리려면 아래 순서만 따르면 됩니다.

## 사전 조건
- Windows 10/11
- **NVIDIA GPU** + 최신 [Game Ready / Studio 드라이버](https://www.nvidia.com/Download/index.aspx)
- Python 3.10~3.12 ([python.org](https://www.python.org/downloads/) — 설치 시 **Add to PATH** 체크)

## 원클릭 설치
PowerShell을 **이 폴더**에서 열고:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\setup_windows.ps1
```

스크립트가 하는 일:
1. `.venv` 가상환경 생성
2. CUDA용 PyTorch 설치
3. `openai-whisper` 설치
4. ffmpeg 확인/안내
5. GPU 인식 테스트 + Whisper `turbo` 모델 사전 다운로드 (~1.6GB)

## 실행

```powershell
.\edit.bat "C:\Users\sea36\OneDrive\바탕 화면\강의\IMG_3348.MOV"
```

또는:

```powershell
.\.venv\Scripts\Activate.ps1
python engine\auto_cut.py "영상경로.MOV" --preset 표준
```

결과물: `output\` 아래 `_cut.xml` / `_cut_audio.wav` / `_cut.srt`

## GPU가 안 잡힐 때
1. PowerShell에서 `nvidia-smi` 실행 → 드라이버 확인
2. CUDA torch 재설치 (스크립트가 안내하는 명령)
3. 그래도 CPU로만 되면 느리니, `config.json`에 `"STT_MODEL": "small"` 권장
