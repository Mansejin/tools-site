import { useRef, useState } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';
import { exportMapJson, importMapJson } from '../lib/db';
import InboxPanel from './InboxPanel';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Header() {
  const map = useThoughtStore((s) => s.map);
  const calmMode = useThoughtStore((s) => s.calmMode);
  const isSaving = useThoughtStore((s) => s.isSaving);
  const toggleCalmMode = useThoughtStore((s) => s.toggleCalmMode);
  const persist = useThoughtStore((s) => s.persist);
  const loadSampleMap = useThoughtStore((s) => s.loadSampleMap);
  const setMap = useThoughtStore((s) => s.setMap);
  const updateMapTitle = useThoughtStore((s) => s.updateMapTitle);
  const openWelcome = useThoughtStore((s) => s.openWelcome);
  const isMobile = useIsMobile();

  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleExport = () => {
    const json = exportMapJson(map);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importMapJson(reader.result as string);
        setMap(imported);
      } catch {
        alert('올바르지 않은 JSON 파일입니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setMenuOpen(false);
  };

  const actionButtons = (
    <>
      <button type="button" className="ai-btn" disabled title="AI 정리 기능 준비 중">
        ✦ AI 정리
      </button>
      <button
        type="button"
        className={`toggle-btn ${calmMode ? 'active' : ''}`}
        onClick={toggleCalmMode}
        title="선택한 생각 주변만 강조"
      >
        집중 {calmMode ? 'ON' : 'OFF'}
      </button>
      <button type="button" onClick={() => persist()} disabled={isSaving}>
        {isSaving ? '저장 중...' : '저장'}
      </button>
      <button type="button" onClick={handleExport}>보내기</button>
      <button type="button" onClick={() => fileRef.current?.click()}>가져오기</button>
      <button type="button" onClick={loadSampleMap}>샘플</button>
    </>
  );

  return (
    <header className="app-header">
      <div className="header-row">
        <div className="header-left">
          <button type="button" className="app-logo" onClick={openWelcome} title="소개 보기">
            Mindtree
          </button>
          <input
            className="map-title-input"
            value={map.title}
            onChange={(e) => updateMapTitle(e.target.value)}
          />
        </div>

        <div className="header-right">
          {isMobile ? (
            <>
              <button
                type="button"
                className={`toggle-btn header-focus-btn ${calmMode ? 'active' : ''}`}
                onClick={toggleCalmMode}
              >
                집중
              </button>
              <button
                type="button"
                className="menu-toggle"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="메뉴"
              >
                ⋯
              </button>
            </>
          ) : (
            actionButtons
          )}
        </div>
      </div>

      <InboxPanel />

      {isMobile && menuOpen && (
        <div className="header-menu">
          <button type="button" className="ai-btn" disabled>
            ✦ AI 정리 (준비 중)
          </button>
          <button type="button" onClick={() => { persist(); setMenuOpen(false); }} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={handleExport}>보내기</button>
          <button type="button" onClick={() => fileRef.current?.click()}>가져오기</button>
          <button type="button" onClick={() => { loadSampleMap(); setMenuOpen(false); }}>샘플</button>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".json" hidden onChange={handleImport} />
    </header>
  );
}
