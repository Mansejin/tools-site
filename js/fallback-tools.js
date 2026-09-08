/** Embedded fallback for file:// preview. Sync from data/tools.json when tools change. */
const FALLBACK_TOOLS = [
  {
    id: "clipboard-paste-jpg",
    name: "clipboard-paste-jpg",
    tagline: {
      ko: "탐색기에 클립보드 이미지를 JPG로 저장",
      en: "Save clipboard images as JPG in File Explorer",
    },
    description: {
      ko: "Win+Shift+S로 캡처한 이미지를 탐색기 폴더에서 Ctrl+Shift+V 한 번으로 JPG 파일로 저장합니다. Ctrl+Shift+V는 탐색기에서 클립보드에 이미지가 있을 때만 동작하며, 브라우저·에디터 등 다른 앱에서는 그대로 사용됩니다. Ctrl+V는 건드리지 않습니다.",
      en: "Capture with Win+Shift+S, then press Ctrl+Shift+V in an Explorer folder to save a JPG. Ctrl+Shift+V only activates in Explorer when the clipboard holds an image — browsers and other apps keep their normal shortcuts. Ctrl+V is never intercepted.",
    },
    tags: {
      ko: ["Windows", "클립보드", "유틸"],
      en: ["Windows", "Clipboard", "Utility"],
    },
    download: "https://github.com/Mansejin/clipboard-paste-jpg/releases/latest/download/clipboard-paste-jpg-win64.zip",
    github: "https://github.com/Mansejin/clipboard-paste-jpg",
    install: {
      ko: "1. 위 \"다운로드\"에서 zip 받기\n2. 압축 풀기\n3. 설치.bat 더블클릭",
      en: "1. Click Download above\n2. Extract the zip\n3. Double-click install.bat",
    },
    installAdvanced: {
      ko: "개발자용 (Python 필요):\ngit clone https://github.com/Mansejin/clipboard-paste-jpg.git\ncd clipboard-paste-jpg\npowershell -ExecutionPolicy Bypass -File .\\install_startup.ps1",
      en: "For developers (Python required):\ngit clone https://github.com/Mansejin/clipboard-paste-jpg.git\ncd clipboard-paste-jpg\npowershell -ExecutionPolicy Bypass -File .\\install_startup.ps1",
    },
    shortcut: "Ctrl+Shift+V",
    platform: "Windows 10/11",
    status: "stable",
  },
];

/** Shown only in offline/file preview — not on the live site. */
const PREVIEW_DUMMY_TOOL = {
  id: "preview-dummy",
  name: "preview-dummy",
  tagline: {
    ko: "로컬 미리보기용 더미 카드",
    en: "Dummy card for local preview",
  },
  description: {
    ko: "index.html을 더블클릭해서 열 때 보이는 테스트용 도구입니다. 실제 사이트에는 올라가지 않습니다.",
    en: "Test tool shown when opening index.html directly. Not published on the live site.",
  },
  tags: {
    ko: ["미리보기", "더미"],
    en: ["Preview", "Dummy"],
  },
  github: "https://github.com/Mansejin/tools-site",
  install: "powershell -ExecutionPolicy Bypass -File .\\preview.bat",
  shortcut: "—",
  platform: "Local only",
  status: "beta",
};
