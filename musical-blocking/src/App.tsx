import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { ScriptPanel } from './components/ScriptPanel';
import { StageCanvas } from './components/StageCanvas';
import { StageTools } from './components/StageTools';
import { RoleToggles } from './components/RoleToggles';
import { Timeline } from './components/Timeline';
import { CaptureDock } from './components/CaptureDock';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { UnlockGate, isUnlocked } from './components/UnlockGate';
import { snapshotCurrentState } from './lib/recovery';
import './App.css';

export default function App() {
  const [ready, setReady] = useState(() => isUnlocked());
  const work = useAppStore((s) => s.activeWork());
  const works = useAppStore((s) => s.works);
  const activeTab = useAppStore((s) => s.activeTab);
  const lyricsOpen = useAppStore((s) => s.lyricsOpen);
  const setTab = useAppStore((s) => s.setTab);
  const setActiveWork = useAppStore((s) => s.setActiveWork);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const keyframeCount = work.keyframes.length;

  useEffect(() => {
    snapshotCurrentState('app-boot');
  }, []);

  useEffect(() => {
    if (!ready || keyframeCount === 0) return;
    const t = window.setTimeout(() => snapshotCurrentState('auto-keyframes'), 800);
    return () => window.clearTimeout(t);
  }, [ready, keyframeCount, work.updatedAt]);

  // Capture shortcuts: Space play, [ ] KF jump, C copy previous
  useEffect(() => {
    if (!ready || activeTab !== 'stage') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      ) {
        return;
      }
      const s = useAppStore.getState();
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        s.setPlaying(!s.isPlaying);
        return;
      }
      if (e.key === '[' || e.code === 'BracketLeft') {
        e.preventDefault();
        s.jumpToNeighborKeyframe(-1);
        return;
      }
      if (e.key === ']' || e.code === 'BracketRight') {
        e.preventDefault();
        s.jumpToNeighborKeyframe(1);
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        s.copyFromPreviousKeyframe();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, activeTab, setPlaying]);

  if (!ready) {
    return <UnlockGate onDone={() => setReady(true)} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-name">StageCue</p>
            <p className="brand-sub">듣고 · 찍고 · 맞추기</p>
          </div>
        </div>

        <label className="work-switch">
          <span>작품</span>
          <select value={work.id} onChange={(e) => setActiveWork(e.target.value)}>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>

        <nav className="tabs" aria-label="메인 탭">
          <button
            type="button"
            className={activeTab === 'stage' ? 'active' : ''}
            onClick={() => setTab('stage')}
          >
            캡처
          </button>
          <button
            type="button"
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            설정
          </button>
        </nav>
      </header>

      {activeTab === 'stage' ? (
        <main className={`stage-layout ${lyricsOpen ? 'lyrics-open' : 'lyrics-closed'}`}>
          <CaptureDock />
          <div className="stage-column">
            <StageTools />
            <StageCanvas />
            <RoleToggles />
            <Timeline />
          </div>
          {lyricsOpen && <ScriptPanel />}
        </main>
      ) : (
        <main className="settings-layout">
          <SettingsPanel />
        </main>
      )}
    </div>
  );
}
