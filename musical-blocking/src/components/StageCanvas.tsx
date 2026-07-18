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
  const isPlaying = useAppStore((s) => s.isPlaying);

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const stampBeatRef = useRef<number | null>(null);

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
      if (!pos) return;
      const stamp = stampBeatRef.current ?? useAppStore.getState().currentBeat;
      moveRoleAtCurrentCue(dragging, pos, stamp);
    };
    const onUp = () => {
      setDragging(null);
      stampBeatRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, moveRoleAtCurrentCue, pointerToPos]);

  return (
    <div className={`stage-wrap ${isPlaying ? 'capturing' : ''}`}>
      <div className="stage-frame">
        <div className="stage-label upstage">UPSTAGE</div>
        <div
          ref={stageRef}
          className="stage-floor"
          style={{ aspectRatio: `${work.stage.widthM / work.stage.depthM}` }}
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
                    const beat = useAppStore.getState().currentBeat;
                    stampBeatRef.current = useAppStore.getState().snapToBeat
                      ? Math.round(beat)
                      : beat;
                    setSelectedRole(role.id);
                    setDragging(role.id);
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  }}
                  title={`${role.name} — 드래그하면 현재 순간에 동선 저장`}
                >
                  <span className="actor-dot">{role.shortName}</span>
                  <span className="actor-name">{role.name}</span>
                </button>
              );
            })}
        </div>
        <div className="stage-label downstage">
          DOWNSTAGE · 객석
          <span className="stage-size">
            {work.stage.widthM}×{work.stage.depthM}m
          </span>
        </div>
      </div>
    </div>
  );
}
