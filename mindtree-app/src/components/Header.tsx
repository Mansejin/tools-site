import { useThoughtStore } from '../store/useThoughtStore';

export default function Header() {
  const map = useThoughtStore((s) => s.map);
  const updateMapTitle = useThoughtStore((s) => s.updateMapTitle);
  const openWelcome = useThoughtStore((s) => s.openWelcome);

  return (
    <header className="app-header compact">
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
      </div>
    </header>
  );
}
