import { useRef } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';
import { exportMapJson, importMapJson } from '../lib/db';
import InboxPanel from './InboxPanel';

export default function Header() {
  const map = useThoughtStore((s) => s.map);
  const calmMode = useThoughtStore((s) => s.calmMode);
  const isSaving = useThoughtStore((s) => s.isSaving);
  const toggleCalmMode = useThoughtStore((s) => s.toggleCalmMode);
  const persist = useThoughtStore((s) => s.persist);
  const loadSampleMap = useThoughtStore((s) => s.loadSampleMap);
  const setMap = useThoughtStore((s) => s.setMap);
  const updateMapTitle = useThoughtStore((s) => s.updateMapTitle);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportMapJson(map);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${map.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-logo">PhilosTree</h1>
        <input
          className="map-title-input"
          value={map.title}
          onChange={(e) => updateMapTitle(e.target.value)}
        />
      </div>

      <InboxPanel />

      <div className="header-right">
        <button
          type="button"
          className={`toggle-btn ${calmMode ? 'active' : ''}`}
          onClick={toggleCalmMode}
          title="선택한 생각 주변만 강조"
        >
          Calm {calmMode ? 'ON' : 'OFF'}
        </button>
        <button type="button" onClick={() => persist()} disabled={isSaving}>
          {isSaving ? '저장 중...' : '저장'}
        </button>
        <button type="button" onClick={handleExport}>보내기</button>
        <button type="button" onClick={() => fileRef.current?.click()}>가져오기</button>
        <button type="button" onClick={loadSampleMap}>샘플</button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={handleImport} />
      </div>
    </header>
  );
}
