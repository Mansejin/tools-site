import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAppStore } from '../store/useAppStore';
import { positionsAtBeat } from '../lib/interpolation';
import type { Position } from '../types';

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function StageCanvas() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const selectedRoleId = useAppStore((s) => s.selectedRoleId);
  const setSelectedRole = useAppStore((s) => s.setSelectedRole);
  const moveRoleAtCurrentCue = useAppStore((s) => s.moveRoleAtCurrentCue);
  const selectedLineIds = useAppStore((s) => s.selectedLineIds);

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const roleIds = work.roles.map((r) => r.id);
  const positions = positionsAtBeat(work.keyframes, currentBeat, roleIds);

  const pointerToPos = useCallback((clientX: number, clientY: number): Position | null => {
    const el = stageRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    return { x, y };
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const pos = pointerToPos(e.clientX, e.clientY);
      if (pos) moveRoleAtCurrentCue(dragging, pos);
    };
    const onUp = () => setDragging(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, moveRoleAtCurrentCue, pointerToPos]);

  const aspect = work.stage.widthM / work.stage.depthM;
  const hasCue = selectedLineIds.length > 0;

  return (
    <div className="stage-wrap">
      <div className="stage-meta">
        <span>
          무대 {work.stage.widthM}m × {work.stage.depthM}m
        </span>
        <span className={hasCue ? 'hint ok' : 'hint'}>
          {hasCue
            ? '대사를 선택한 뒤 배역을 드래그하면 키프레임이 저장됩니다'
            : '대본에서 대사·큐를 선택한 뒤 배역을 옮기세요'}
        </span>
      </div>

      <div className="stage-frame">
        <div className="stage-label upstage">UPSTAGE</div>
        <div
          ref={stageRef}
          className="stage-floor"
          style={{ aspectRatio: `${aspect}` }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedRole(null);
          }}
        >
          {work.stage.showGrid && (
            <div
              className="stage-grid"
              style={{
                backgroundSize: `${100 / work.stage.gridDivisions}% ${100 / work.stage.gridDivisions}%`,
              }}
            />
          )}

          <div className="stage-center-mark" />

          {work.roles
            .filter((r) => r.visible)
            .map((role) => {
              const pos = positions[role.id] ?? { x: 0.5, y: 0.5 };
              const active = selectedRoleId === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`actor ${active ? 'active' : ''} ${dragging === role.id ? 'dragging' : ''}`}
                  style={{
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    '--actor-color': role.color,
                  } as CSSProperties}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedRole(role.id);
                    setDragging(role.id);
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  }}
                  title={`${role.name} — 드래그하여 위치 지정`}
                >
                  <span className="actor-dot">{role.shortName}</span>
                  <span className="actor-name">{role.name}</span>
                </button>
              );
            })}
        </div>
        <div className="stage-label downstage">DOWNSTAGE · 객석</div>
      </div>
    </div>
  );
}
