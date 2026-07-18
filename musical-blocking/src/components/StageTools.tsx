import { useAppStore } from '../store/useAppStore';
import { neighborKeyframeBeat, previousKeyframe } from '../lib/interpolation';

/** Quick blocking tools inspired by Stage Write / formation apps. */
export function StageTools() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const selectedRoleId = useAppStore((s) => s.selectedRoleId);
  const showPaths = useAppStore((s) => s.showPaths);
  const showGhosts = useAppStore((s) => s.showGhosts);
  const showNumberLine = useAppStore((s) => s.showNumberLine);
  const setShowPaths = useAppStore((s) => s.setShowPaths);
  const setShowGhosts = useAppStore((s) => s.setShowGhosts);
  const setShowNumberLine = useAppStore((s) => s.setShowNumberLine);
  const jumpToNeighborKeyframe = useAppStore((s) => s.jumpToNeighborKeyframe);
  const copyFromPreviousKeyframe = useAppStore((s) => s.copyFromPreviousKeyframe);
  const mirrorRoleAtPlayhead = useAppStore((s) => s.mirrorRoleAtPlayhead);

  const hasPrev = neighborKeyframeBeat(work.keyframes, currentBeat, -1) != null;
  const hasNext = neighborKeyframeBeat(work.keyframes, currentBeat, 1) != null;
  const canCopy = Boolean(previousKeyframe(work.keyframes, currentBeat, selectedRoleId));
  const selectedName = work.roles.find((r) => r.id === selectedRoleId)?.name;

  return (
    <div className="stage-tools" aria-label="무대 도구">
      <div className="stage-tools-group">
        <button
          type="button"
          className="btn ghost"
          disabled={!hasPrev}
          onClick={() => jumpToNeighborKeyframe(-1)}
          title="이전 키프레임 [ "
        >
          ← KF
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!hasNext}
          onClick={() => jumpToNeighborKeyframe(1)}
          title="다음 키프레임 ] "
        >
          KF →
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!canCopy}
          onClick={() => copyFromPreviousKeyframe()}
          title="이전 키프레임 위치를 지금 박에 복사 (C)"
        >
          {selectedName ? `${selectedName} 이전위치` : '이전위치 복사'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!selectedRoleId}
          onClick={() => selectedRoleId && mirrorRoleAtPlayhead(selectedRoleId, 'x')}
          title="선택 배역을 중앙선 기준 좌우 대칭"
        >
          좌우대칭
        </button>
      </div>
      <div className="stage-tools-group toggles">
        <button
          type="button"
          className={`chip-toggle ${showPaths ? 'on' : ''}`}
          aria-pressed={showPaths}
          onClick={() => setShowPaths(!showPaths)}
        >
          경로
        </button>
        <button
          type="button"
          className={`chip-toggle ${showGhosts ? 'on' : ''}`}
          aria-pressed={showGhosts}
          onClick={() => setShowGhosts(!showGhosts)}
        >
          고스트
        </button>
        <button
          type="button"
          className={`chip-toggle ${showNumberLine ? 'on' : ''}`}
          aria-pressed={showNumberLine}
          onClick={() => setShowNumberLine(!showNumberLine)}
        >
          넘버라인
        </button>
      </div>
    </div>
  );
}
