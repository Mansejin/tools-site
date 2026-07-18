import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { unlockSeed } from '../lib/unlockSeed';
import { parseScriptBundle } from '../lib/scriptParser';
import { roleColorAt, shortNameFrom } from '../lib/colors';
import { useAppStore } from '../store/useAppStore';
import type { MusicalWork, Role } from '../types';

const UNLOCK_FLAG = 'stagecue-unlocked-v3';

export function isUnlocked(): boolean {
  return localStorage.getItem(UNLOCK_FLAG) === '1';
}

export function UnlockGate({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const applySeed = async () => {
    setBusy(true);
    setError('');
    try {
      const seed = await unlockSeed(pin);
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
      const work: MusicalWork = {
        id: uuid(),
        title: seed.title,
        bpm: seed.bpm,
        beatsPerBar: seed.beatsPerBar,
        cueSpacing,
        tempoMap: bundle.tempoMap,
        numbers: bundle.numbers,
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
        <label>
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void applySeed();
            }}
          />
        </label>
        {error && <p className="unlock-error">{error}</p>}
        <button type="button" className="btn" disabled={busy || !pin} onClick={() => void applySeed()}>
          {busy ? '여는 중…' : '열기'}
        </button>
      </div>
    </div>
  );
}
