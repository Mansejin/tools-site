import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SAMPLE_SCRIPT } from '../../lib/scriptParser';
import type { SettingsSection } from '../../types';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'works', label: '작품' },
  { id: 'roles', label: '배역' },
  { id: 'stage', label: '무대' },
  { id: 'tempo', label: '템포' },
];

export function SettingsPanel() {
  const work = useAppStore((s) => s.activeWork());
  const works = useAppStore((s) => s.works);
  const section = useAppStore((s) => s.settingsSection);
  const setSettingsSection = useAppStore((s) => s.setSettingsSection);
  const setActiveWork = useAppStore((s) => s.setActiveWork);
  const addWork = useAppStore((s) => s.addWork);
  const renameWork = useAppStore((s) => s.renameWork);
  const deleteWork = useAppStore((s) => s.deleteWork);
  const duplicateWork = useAppStore((s) => s.duplicateWork);
  const addRole = useAppStore((s) => s.addRole);
  const updateRole = useAppStore((s) => s.updateRole);
  const removeRole = useAppStore((s) => s.removeRole);
  const setStage = useAppStore((s) => s.setStage);
  const setTempo = useAppStore((s) => s.setTempo);
  const addTempoPoint = useAppStore((s) => s.addTempoPoint);
  const updateTempoPoint = useAppStore((s) => s.updateTempoPoint);
  const removeTempoPoint = useAppStore((s) => s.removeTempoPoint);
  const addNumber = useAppStore((s) => s.addNumber);
  const updateNumber = useAppStore((s) => s.updateNumber);
  const removeNumber = useAppStore((s) => s.removeNumber);
  const importScript = useAppStore((s) => s.importScript);
  const clearScript = useAppStore((s) => s.clearScript);
  const currentBeat = useAppStore((s) => s.currentBeat);

  const reloadPrivateSeed = () => {
    localStorage.removeItem('stagecue-unlocked-v1');
    localStorage.removeItem('stagecue-unlocked-v2');
    location.reload();
  };

  const [newRole, setNewRole] = useState('');
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newNumberTitle, setNewNumberTitle] = useState('');
  const [newNumberBpm, setNewNumberBpm] = useState('120');
  const [newTempoBpm, setNewTempoBpm] = useState('120');

  return (
    <div className="settings">
      <nav className="settings-nav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={section === s.id ? 'active' : ''}
            onClick={() => setSettingsSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="settings-body">
        {section === 'works' && (
          <section className="settings-block">
            <h2>작품 관리</h2>
            <p className="help">뮤지컬 작품은 언제든 추가·전환할 수 있습니다. 데이터는 브라우저에 저장됩니다.</p>

            <ul className="work-list">
              {works.map((w) => (
                <li key={w.id} className={w.id === work.id ? 'active' : ''}>
                  <button type="button" className="work-select" onClick={() => setActiveWork(w.id)}>
                    <strong>{w.title}</strong>
                    <small>
                      배역 {w.roles.length} · 키프레임 {w.keyframes.length} · 대사 {w.script.filter((l) => l.type !== 'blank').length}
                    </small>
                  </button>
                  <input
                    value={w.title}
                    onChange={(e) => renameWork(w.id, e.target.value)}
                    aria-label="작품명"
                  />
                  <button type="button" className="btn tiny ghost" onClick={() => duplicateWork(w.id)}>
                    복제
                  </button>
                  <button
                    type="button"
                    className="btn tiny danger"
                    disabled={works.length <= 1}
                    onClick={() => deleteWork(w.id)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>

            <div className="inline-form">
              <input
                placeholder="새 작품 제목"
                value={newWorkTitle}
                onChange={(e) => setNewWorkTitle(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  addWork(newWorkTitle || undefined);
                  setNewWorkTitle('');
                }}
              >
                작품 추가
              </button>
            </div>

            <div className="divider" />
            <h3>대본</h3>
            <div className="btn-row">
              <button type="button" className="btn ghost" onClick={() => importScript(SAMPLE_SCRIPT)}>
                샘플 대본 불러오기
              </button>
              <button type="button" className="btn ghost" onClick={reloadPrivateSeed}>
                비공개 시드 다시 열기
              </button>
              <button type="button" className="btn danger ghost" onClick={clearScript}>
                대본 비우기
              </button>
            </div>

            <div className="divider" />
            <h3>데이터 백업</h3>
            <div className="btn-row">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const payload = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    works: useAppStore.getState().works,
                    activeWorkId: useAppStore.getState().activeWorkId,
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `stagecue-backup-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                JSON 내보내기
              </button>
              <label className="btn ghost" style={{ display: 'inline-block' }}>
                JSON 가져오기
                <input
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const data = JSON.parse(await file.text()) as {
                        works?: typeof works;
                        activeWorkId?: string;
                      };
                      if (!data.works?.length) {
                        alert('유효한 StageCue 백업 파일이 아닙니다.');
                        return;
                      }
                      useAppStore.setState({
                        works: data.works,
                        activeWorkId: data.activeWorkId || data.works[0].id,
                        selectedLineIds: [],
                        charSelection: null,
                        currentBeat: 0,
                        isPlaying: false,
                      });
                    } catch {
                      alert('JSON을 읽지 못했습니다.');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </section>
        )}

        {section === 'roles' && (
          <section className="settings-block">
            <h2>배역 설정</h2>
            <p className="help">이름·약칭·색상을 지정합니다. 무대 탭에서 표시를 개별 토글할 수 있습니다.</p>
            <ul className="role-edit-list">
              {work.roles.map((role) => (
                <li key={role.id}>
                  <input
                    type="color"
                    value={role.color}
                    onChange={(e) => updateRole(role.id, { color: e.target.value })}
                    aria-label={`${role.name} 색상`}
                  />
                  <input
                    value={role.name}
                    onChange={(e) => updateRole(role.id, { name: e.target.value })}
                    placeholder="이름"
                  />
                  <input
                    className="short"
                    value={role.shortName}
                    maxLength={3}
                    onChange={(e) => updateRole(role.id, { shortName: e.target.value })}
                    placeholder="약칭"
                  />
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={role.visible}
                      onChange={(e) => updateRole(role.id, { visible: e.target.checked })}
                    />
                    표시
                  </label>
                  <button
                    type="button"
                    className="btn tiny danger"
                    onClick={() => removeRole(role.id)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
            <div className="inline-form">
              <input
                placeholder="새 배역 이름"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newRole.trim()) {
                    addRole(newRole);
                    setNewRole('');
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (!newRole.trim()) return;
                  addRole(newRole);
                  setNewRole('');
                }}
              >
                배역 추가
              </button>
            </div>
          </section>
        )}

        {section === 'stage' && (
          <section className="settings-block">
            <h2>무대 크기</h2>
            <p className="help">평면(탑뷰) 기준 가로·깊이를 미터 단위로 설정합니다.</p>
            <div className="form-grid">
              <label>
                가로 (m)
                <input
                  type="number"
                  min={4}
                  max={40}
                  step={0.5}
                  value={work.stage.widthM}
                  onChange={(e) => setStage({ widthM: Number(e.target.value) || 12 })}
                />
              </label>
              <label>
                깊이 (m)
                <input
                  type="number"
                  min={3}
                  max={30}
                  step={0.5}
                  value={work.stage.depthM}
                  onChange={(e) => setStage({ depthM: Number(e.target.value) || 8 })}
                />
              </label>
              <label>
                그리드 분할
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={work.stage.gridDivisions}
                  onChange={(e) =>
                    setStage({ gridDivisions: Number(e.target.value) || 8 })
                  }
                />
              </label>
              <label className="check wide">
                <input
                  type="checkbox"
                  checked={work.stage.showGrid}
                  onChange={(e) => setStage({ showGrid: e.target.checked })}
                />
                그리드 표시
              </label>
            </div>
            <div className="preset-row">
              <span>프리셋</span>
              <button type="button" className="btn tiny ghost" onClick={() => setStage({ widthM: 10, depthM: 7 })}>
                소극장
              </button>
              <button type="button" className="btn tiny ghost" onClick={() => setStage({ widthM: 14, depthM: 10 })}>
                중극장
              </button>
              <button type="button" className="btn tiny ghost" onClick={() => setStage({ widthM: 18, depthM: 12 })}>
                대극장
              </button>
            </div>
          </section>
        )}

        {section === 'tempo' && (
          <section className="settings-block">
            <h2>넘버 · 템포 맵</h2>
            <p className="help">
              동선은 항상 <strong>박</strong>으로 저장합니다. 넘버마다·넘버 안에서 BPM이 바뀌어도
              키프레임은 그대로이고, 재생만 템포 맵(박 → BPM)을 따릅니다.
              대본에 <code>【넘버: 제목 / BPM 120】</code>, <code>【BPM 144】</code> 형태를 쓰면 자동 인식됩니다.
            </p>

            <div className="form-grid">
              <label>
                기본 BPM
                <input
                  type="number"
                  min={40}
                  max={240}
                  value={work.bpm}
                  onChange={(e) => setTempo(Number(e.target.value) || 120)}
                />
              </label>
              <label>
                마디당 박
                <select
                  value={work.beatsPerBar}
                  onChange={(e) => setTempo(work.bpm, Number(e.target.value))}
                >
                  <option value={2}>2/4</option>
                  <option value={3}>3/4</option>
                  <option value={4}>4/4</option>
                  <option value={6}>6/8</option>
                </select>
              </label>
            </div>

            <div className="divider" />
            <h3>넘버</h3>
            <ul className="tempo-edit-list">
              {(work.numbers ?? []).map((num) => (
                <li key={num.id}>
                  <input
                    value={num.title}
                    onChange={(e) => updateNumber(num.id, { title: e.target.value })}
                    placeholder="제목"
                  />
                  <label>
                    시작 박
                    <input
                      type="number"
                      min={0}
                      value={num.startBeat}
                      onChange={(e) =>
                        updateNumber(num.id, { startBeat: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                  <label>
                    BPM
                    <input
                      type="number"
                      min={40}
                      max={240}
                      value={num.bpm ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        updateNumber(num.id, {
                          bpm: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn tiny danger"
                    onClick={() => removeNumber(num.id)}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
            <div className="inline-form">
              <input
                placeholder="새 넘버 제목"
                value={newNumberTitle}
                onChange={(e) => setNewNumberTitle(e.target.value)}
              />
              <input
                type="number"
                style={{ width: '5rem' }}
                value={newNumberBpm}
                onChange={(e) => setNewNumberBpm(e.target.value)}
                title="시작 BPM"
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  addNumber(
                    newNumberTitle || `넘버 ${(work.numbers?.length ?? 0) + 1}`,
                    currentBeat,
                    Number(newNumberBpm) || work.bpm,
                  );
                  setNewNumberTitle('');
                }}
              >
                현재 박에 넘버 추가
              </button>
            </div>

            <div className="divider" />
            <h3>템포 맵 (넘버 안 변화 포함)</h3>
            <ul className="tempo-edit-list">
              {[...(work.tempoMap ?? [])]
                .sort((a, b) => a.beat - b.beat)
                .map((point) => (
                  <li key={point.id}>
                    <label>
                      박
                      <input
                        type="number"
                        min={0}
                        value={point.beat}
                        onChange={(e) =>
                          updateTempoPoint(point.id, {
                            beat: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                    <label>
                      BPM
                      <input
                        type="number"
                        min={40}
                        max={240}
                        value={point.bpm}
                        onChange={(e) =>
                          updateTempoPoint(point.id, {
                            bpm: Number(e.target.value) || work.bpm,
                          })
                        }
                      />
                    </label>
                    <input
                      value={point.label || ''}
                      placeholder="라벨"
                      onChange={(e) =>
                        updateTempoPoint(point.id, { label: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="btn tiny danger"
                      disabled={(work.tempoMap?.length ?? 0) <= 1}
                      onClick={() => removeTempoPoint(point.id)}
                    >
                      삭제
                    </button>
                  </li>
                ))}
            </ul>
            <div className="inline-form">
              <input
                type="number"
                style={{ width: '5rem' }}
                value={newTempoBpm}
                onChange={(e) => setNewTempoBpm(e.target.value)}
                title="BPM"
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  addTempoPoint(
                    currentBeat,
                    Number(newTempoBpm) || work.bpm,
                    `BPM ${newTempoBpm}`,
                  );
                }}
              >
                현재 박에 템포 변경 추가
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
