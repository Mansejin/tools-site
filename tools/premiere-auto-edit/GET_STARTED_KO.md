# 받는 방법 / 로컬 GPU 실행

## GitHub에서 받기 (아티팩트 다운로드 불필요)

1. 이 PR/브랜치에서 `tools/premiere-auto-edit/dist/Premiere-Pro-edit-bibl-windows.zip` 다운로드
   - 또는 저장소 클론 후 해당 폴더 사용
2. 압축 해제
3. `설치_GPU.bat` 실행 (최초 1회, GPU Whisper 설치)
4. `edit.bat "영상경로.MOV"` 실행

이미 돌린 IMG_3348 결과(자막·XML·리포트):
- `dist/IMG_3348_edit_results.zip`
- `sample-output-IMG_3348/`

> `_cut_audio.wav`(323MB)는 GitHub에 안 올렸습니다. 로컬에서 `edit.bat` 다시 돌리면 생성됩니다.

## 왜 클라우드 에이전트로는 GPU를 못 쓰나

클라우드 에이전트는 **원격 Linux 서버**에서 돌아갑니다.  
내 Windows GPU / 파일을 직접 쓸 수 없고, Whisper를 클라우드에서 돌리면 **토큰·시간이 많이** 듭니다.

토큰을 아끼려면:
- **Cursor Desktop → 로컬 에이전트**로 이 폴더를 열고 편집 요청  
  (작업이 내 PC에서 실행됨)
- 또는 `edit.bat`만 로컬에서 실행 (에이전트 토큰 0)
