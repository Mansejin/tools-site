import type { CSSProperties } from 'react';
import { useAppStore } from '../store/useAppStore';

export function RoleToggles() {
  const work = useAppStore((s) => s.activeWork());
  const toggleRoleVisible = useAppStore((s) => s.toggleRoleVisible);
  const setAllRolesVisible = useAppStore((s) => s.setAllRolesVisible);
  const selectedRoleId = useAppStore((s) => s.selectedRoleId);
  const setSelectedRole = useAppStore((s) => s.setSelectedRole);

  const allOn = work.roles.every((r) => r.visible);

  return (
    <div className="role-toggles" aria-label="배역">
      <div className="role-toggles-head">
        <span className="role-toggles-label">배역</span>
        <button
          type="button"
          className="btn tiny ghost"
          onClick={() => setAllRolesVisible(!allOn)}
        >
          {allOn ? '모두 숨김' : '모두 표시'}
        </button>
      </div>
      <ul>
        {work.roles.map((role) => (
          <li key={role.id}>
            <button
              type="button"
              className={`role-chip ${role.visible ? 'on' : 'off'} ${selectedRoleId === role.id ? 'selected' : ''}`}
              style={{ '--actor-color': role.color } as CSSProperties}
              onClick={() => setSelectedRole(role.id === selectedRoleId ? null : role.id)}
            >
              <span className="swatch">{role.shortName}</span>
              <span className="name">{role.name}</span>
            </button>
            <button
              type="button"
              className={`vis-btn ${role.visible ? 'on' : 'off'}`}
              title={role.visible ? '무대에서 숨기기' : '무대에 표시'}
              onClick={() => toggleRoleVisible(role.id)}
            >
              {role.visible ? '보이기' : '숨김'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
