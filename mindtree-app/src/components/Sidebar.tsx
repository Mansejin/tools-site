import { useThoughtStore } from '../store/useThoughtStore';
import { CATEGORY_LABELS } from '../types';

type SidebarProps = {
  className?: string;
};

export default function Sidebar({ className = '' }: SidebarProps) {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const selectNode = useThoughtStore((s) => s.selectNode);
  const setMobileTab = useThoughtStore((s) => s.setMobileTab);

  const placed = map.nodes.filter((n) => !n.inInbox);
  const byDepth = new Map<number, typeof placed>();
  for (const node of placed) {
    const group = byDepth.get(node.depth) ?? [];
    group.push(node);
    byDepth.set(node.depth, group);
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);

  const handleSelect = (id: string) => {
    selectNode(id);
    setMobileTab('edit');
  };

  return (
    <aside className={`sidebar ${className}`.trim()}>
      <div className="sidebar-section">
        <h2 className="sidebar-title">생각 맵</h2>
        <p className="sidebar-map-name">{map.title}</p>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-subtitle">깊이별 탐색</h3>
        <nav className="depth-nav">
          {depths.length === 0 && (
            <p className="sidebar-empty">아직 배치된 생각이 없습니다.</p>
          )}
          {depths.map((depth) => (
            <div key={depth} className="depth-group">
              <span className="depth-label">깊이 {depth}</span>
              <ul>
                {byDepth.get(depth)?.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      className={`nav-item ${selectedNodeId === node.id ? 'active' : ''}`}
                      onClick={() => handleSelect(node.id)}
                    >
                      <span className="nav-category">{CATEGORY_LABELS[node.category]}</span>
                      <span className="nav-title">{node.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
