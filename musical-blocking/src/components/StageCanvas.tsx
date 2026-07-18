import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  positionsAtBeat,
  previousKeyframe,
  rolePathPoints,
} from '../lib/interpolation';
import type { Position } from '../types';

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pathD(points: Position[]): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(4)} ${p.y.toFixed(4)}`)
    .join(' ');
}

export function StageCanvas() {
  const work = useAppStore((s) => s.activeWork());
  const currentBeat = useAppStore((s) => s.currentBeat);
  const selectedRoleId = useAppStore((s) => s.selectedRoleId);
  const setSelectedRole = useAppStore((s) => s.setSelectedRole);
  const moveRoleAtCurrentCue = useAppStore((s) => s.moveRoleAtCurrentCue);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const showPaths = useAppStore((s) => s.showPaths);
  const showGhosts = useAppStore((s) => s.showGhosts);
  const showNumberLine = useAppStore((s) => s.showNumberLine);

  const stageRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const stampBeatRef = useRef<number | null>(null);

  const roleIds = work.roles.map((r) => r.id);
  const positions = positionsAtBeat(work.keyframes, currentBeat, roleIds);
  const visibleRoles = work.roles.filter((r) => r.visible);

  const prevKf = useMemo(
    () => previousKeyframe(work.keyframes, currentBeat),
    [work.keyframes, currentBeat],
  );
  const ghostPositions = useMemo(() => {
    if (!prevKf || !showGhosts) return null;
    return prevKf.positions;
  }, [prevKf, showGhosts]);

  const numberMarks = useMemo(() => {
    const n = Math.max(2, work.stage.gridDivisions);
    // Stage Write–style: center 0, numbers out to wings
    const half = Math.floor(n / 2);
    const marks: { x: number; label: string }[] = [];
    for (let i = -half; i <= half; i++) {
      const x = (i + half) / n + 1 / (2 * n);
      marks.push({ x, label: String(Math.abs(i)) });
    }
    return marks;
  }, [work.stage.gridDivisions]);

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
        <div className="stage-label upstage">
          <span>SR</span>
          <span>UPSTAGE</span>
          <span>SL</span>
        </div>
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

          <div className="stage-crosshair" aria-hidden>
            <span className="stage-vline" />
            <span className="stage-hline" />
          </div>

          {showNumberLine && (
            <div className="stage-number-line" aria-hidden>
              {numberMarks.map((m) => (
                <span
                  key={`${m.label}-${m.x}`}
                  className="stage-number-tick"
                  style={{ left: `${m.x * 100}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          )}

          {showPaths && (
            <svg
              className="stage-paths"
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                {visibleRoles.map((role) => (
                  <marker
                    key={`m-${role.id}`}
                    id={`arrow-${role.id}`}
                    markerWidth="0.04"
                    markerHeight="0.04"
                    refX="0.02"
                    refY="0.02"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 0 0 L 0.04 0.02 L 0 0.04 Z"
                      fill={role.color}
                      opacity="0.85"
                    />
                  </marker>
                ))}
              </defs>
              {visibleRoles.map((role) => {
                const pts = rolePathPoints(work.keyframes, role.id).map((p) => p.pos);
                if (pts.length < 2) return null;
                const active = !selectedRoleId || selectedRoleId === role.id;
                return (
                  <path
                    key={role.id}
                    d={pathD(pts)}
                    className={`traffic-path ${active ? 'focus' : 'dim'}`}
                    style={{
                      stroke: role.color,
                      markerEnd: `url(#arrow-${role.id})`,
                    }}
                  />
                );
              })}
            </svg>
          )}

          {ghostPositions &&
            visibleRoles.map((role) => {
              const g = ghostPositions[role.id];
              if (!g) return null;
              const cur = positions[role.id];
              if (
                cur &&
                Math.abs(cur.x - g.x) < 0.01 &&
                Math.abs(cur.y - g.y) < 0.01
              ) {
                return null;
              }
              return (
                <div
                  key={`ghost-${role.id}`}
                  className="actor-ghost"
                  style={{
                    left: `${g.x * 100}%`,
                    top: `${g.y * 100}%`,
                    '--actor-color': role.color,
                  } as CSSProperties}
                  title={`${role.name} · 이전 키프레임`}
                >
                  <span className="actor-dot ghost">{role.shortName}</span>
                </div>
              );
            })}

          {visibleRoles.map((role) => {
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
          <span>SR</span>
          <span>
            DOWNSTAGE · 객석
            <span className="stage-size">
              {work.stage.widthM}×{work.stage.depthM}m
            </span>
          </span>
          <span>SL</span>
        </div>
      </div>
    </div>
  );
}
