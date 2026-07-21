import { useThoughtStore } from '../store/useThoughtStore';

export default function MobileTabBar() {
  const mobileTab = useThoughtStore((s) => s.mobileTab);
  const setMobileTab = useThoughtStore((s) => s.setMobileTab);
  return (
    <nav className="mobile-tab-bar" aria-label="모바일 탐색">
      <button
        type="button"
        className={mobileTab === 'map' ? 'active' : ''}
        onClick={() => setMobileTab('map')}
      >
        <span className="tab-icon">◎</span>
        <span>맵</span>
      </button>
      <button
        type="button"
        className={mobileTab === 'list' ? 'active' : ''}
        onClick={() => setMobileTab('list')}
      >
        <span className="tab-icon">☰</span>
        <span>목록</span>
      </button>
    </nav>
  );
}
