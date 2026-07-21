import { LIFE_TOPICS } from '../types';
import { useThoughtStore } from '../store/useThoughtStore';

export default function WelcomeScreen() {
  const showWelcome = useThoughtStore((s) => s.showWelcome);
  const dismissWelcome = useThoughtStore((s) => s.dismissWelcome);
  const loadSampleMap = useThoughtStore((s) => s.loadSampleMap);
  const startWithTopic = useThoughtStore((s) => s.startWithTopic);
  const startBlank = useThoughtStore((s) => s.startBlank);

  if (!showWelcome) return null;

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        <p className="welcome-eyebrow">Mindtree</p>
        <h1 className="welcome-title">
          흩어진 생각을
          <br />
          <em>한눈에</em> 정리하세요
        </h1>
        <p className="welcome-desc">
          꿈, 미래, 업무, 가족, 대인관계, 깊은 생각, 철학 —
          머릿속에 떠다니는 것들을 트리로 펼치면 구조가 보입니다.
          AI가 생각을 정리해 드립니다. <span className="coming-soon">(준비 중)</span>
        </p>

        <div className="topic-chips">
          {LIFE_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              className="topic-chip"
              onClick={() => startWithTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="welcome-actions">
          <button type="button" className="btn-primary" onClick={loadSampleMap}>
            샘플로 둘러보기
          </button>
          <button type="button" className="btn-secondary" onClick={startBlank}>
            빈 맵으로 시작
          </button>
        </div>

        <button type="button" className="welcome-skip" onClick={dismissWelcome}>
          바로 사용하기
        </button>
      </div>
    </div>
  );
}
