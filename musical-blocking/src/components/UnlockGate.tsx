import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { unlockSeed } from '../lib/unlockSeed';
import { parseScriptBundle } from '../lib/scriptParser';
import { roleColorAt, shortNameFrom } from '../lib/colors';
import { useAppStore } from '../store/useAppStore';
import {
  bestRecoverableWork,
  collectWorksFromStorage,
  mergeKeyframesOntoWork,
  snapshotCurrentState,
} from '../lib/recovery';
import type { MusicalWork, Role } from '../types';

const UNLOCK_FLAG = 'stagecue-unlocked-v3';

export function isUnlocked(): boolean {
  return localStorage.getItem(UNLOCK_FLAG) === '1';
}

function buildWorkFromSeed(
  seed: Awaited<ReturnType<typeof unlockSeed>>,
): MusicalWork {
  const cueSpacing = 2;
  const bundle = parseScriptBundle(seed.script, seed.bpm, cueSpacing);
  const roles: Role[] = seed.roles.map((name, i) => ({
    id: uuid(),
    name,
    shortName: shortNameFrom(name),
    color: roleColorAt(i),
    visible: true,
  }));
  const now = Date.now();
  return {
    id: uuid(),
    title: seed.title,
    bpm: seed.bpm,
    beatsPerBar: seed.beatsPerBar,
    cueSpacing,
    tempoMap: bundle.tempoMap,
    numbers: bundle.numbers,
    audioOffsetMs: 0,
    syncStartBeat: 0,
    syncAnchors: [],
    stage: {
      widthM: 12,
      depthM: 8,
      showGrid: true,
      gridDivisions: 8,
    },
    roles,
    script: bundle.script,
    keyframes: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function UnlockGate({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const recoverable = useMemo(() => {
    const source = bestRecoverableWork(collectWorksFromStorage());
    if (!source) return null;
    return {
      title: source.title,
      count: source.keyframes.length,
    };
  }, []);

  const applySeed = async (preserveKeyframes: boolean) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      snapshotCurrentState('pre-unlock');
      const seed = await unlockSeed(pin);
      let work = buildWorkFromSeed(seed);

      if (preserveKeyframes) {
        const source = bestRecoverableWork(collectWorksFromStorage());
        if (source) {
          const merged = mergeKeyframesOntoWork(work, source);
          work = merged.work;
          setInfo(
            merged.restored > 0
              ? `키프레임 ${merged.restored}개 복구됨 (${source.title})`
              : '복구할 키프레임을 찾지 못했습니다.',
          );
        }
      }

      useAppStore.setState({
        works: [work],
        activeWorkId: work.id,
        selectedLineIds: [],
        charSelection: null,
        currentBeat: 0,
        isPlaying: false,
        selectedRoleId: null,
        activeTab: 'stage',
      });
      localStorage.setItem(UNLOCK_FLAG, '1');
      onDone();
    } catch {
      setError('비밀번호가 맞지 않습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="unlock-gate">
      <div className="unlock-card">
        <p className="brand-name">StageCue</p>
        <p className="unlock-sub">비공개 리허설 데이터 · 비밀번호 필요</p>

        {recoverable && (
          <div className="unlock-recover">
            브라우저에 이전 작업이 남아 있습니다.
            <br />
            <strong>
              {recoverable.title} · 키프레임 {recoverable.count}개
            </strong>
            <br />
            아래 <em>키프레임 유지하고 열기</em>를 누르세요.
          </div>
        )}

        <label>
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void applySeed(true);
            }}
          />
        </label>
        {error && <p className="unlock-error">{error}</p>}
        {info && <p className="unlock-info">{info}</p>}
        <button
          type="button"
          className="btn"
          disabled={busy || !pin}
          onClick={() => void applySeed(true)}
        >
          {busy ? '여는 중…' : '키프레임 유지하고 열기'}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={busy || !pin}
          onClick={() => void applySeed(false)}
        >
          새로 열기 (키프레임 비움)
        </button>
      </div>
    </div>
  );
}
