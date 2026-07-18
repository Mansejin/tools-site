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
    <div className="role-toggles">
      <div className="role-toggles-head">
        <h3>배역 표시</h3>
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
            <label className="vis-toggle" title="무대에 표시">
              <input
                type="checkbox"
                checked={role.visible}
                onChange={() => toggleRoleVisible(role.id)}
              />
              <span>{role.visible ? 'ON' : 'OFF'}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
