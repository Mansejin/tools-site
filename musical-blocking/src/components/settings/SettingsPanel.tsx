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
  const importScript = useAppStore((s) => s.importScript);
  const clearScript = useAppStore((s) => s.clearScript);

  const [newRole, setNewRole] = useState('');
  const [newWorkTitle, setNewWorkTitle] = useState('');

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
            <h2>템포 · 박자</h2>
            <p className="help">키프레임은 박(beat) 단위로 기록됩니다. 재생 시 BPM에 맞춰 동선이 보간됩니다.</p>
            <div className="form-grid">
              <label>
                BPM
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
          </section>
        )}
      </div>
    </div>
  );
}
