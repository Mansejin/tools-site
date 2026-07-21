import { useState } from 'react';
import { useThoughtStore } from '../store/useThoughtStore';
import type { ThoughtDirection } from '../types';

export default function InboxPanel() {
  const map = useThoughtStore((s) => s.map);
  const selectedNodeId = useThoughtStore((s) => s.selectedNodeId);
  const addInboxThought = useThoughtStore((s) => s.addInboxThought);
  const placeInboxThought = useThoughtStore((s) => s.placeInboxThought);
  const selectNode = useThoughtStore((s) => s.selectNode);

  const [capture, setCapture] = useState('');
  const [placingId, setPlacingId] = useState<string | null>(null);

  const inbox = map.nodes.filter((n) => n.inInbox);

  const handleCapture = () => {
    if (!capture.trim()) return;
    addInboxThought(capture.trim());
    setCapture('');
  };

  const handlePlace = (inboxId: string, direction: ThoughtDirection) => {
    placeInboxThought(inboxId, selectedNodeId, direction);
    setPlacingId(null);
  };

  return (
    <div className="inbox-panel">
      <div className="inbox-capture">
        <input
          type="text"
          placeholder="떠오른 생각을 적어보세요..."
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
        />
        <button type="button" onClick={handleCapture}>추가</button>
      </div>

      {inbox.length > 0 && (
        <div className="inbox-list">
          <span className="inbox-label">Inbox ({inbox.length})</span>
          {inbox.map((item) => (
            <div key={item.id} className="inbox-item">
              <span className="inbox-title">{item.title}</span>
              {placingId === item.id ? (
                <div className="place-buttons">
                  <button type="button" onClick={() => handlePlace(item.id, 'up')}>↑ 위</button>
                  <button type="button" onClick={() => handlePlace(item.id, 'center')}>→ 깊게</button>
                  <button type="button" onClick={() => handlePlace(item.id, 'down')}>↓ 아래</button>
                  <button type="button" className="cancel" onClick={() => setPlacingId(null)}>취소</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="place-btn"
                  onClick={() => {
                    if (!selectedNodeId) {
                      selectNode(map.nodes.find((n) => !n.inInbox)?.id ?? null);
                    }
                    setPlacingId(item.id);
                  }}
                >
                  배치
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
