import { Download } from 'lucide-react';

/**
 * Short trainer how-to (inspired by GTO Wizard help + Shark setup ideas).
 * Legacy pub turbo/MTT prose lives in holdem-app/archive/ — not shown here.
 */
export default function TrainerGuide({ installPrompt, onInstall }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">연습 가이드</h1>
        <p className="mt-1 text-xs text-muted">GTO 트레이너 사용법 · 짧게</p>
      </div>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-felt-3 p-4 text-sm leading-relaxed text-muted">
        <h2 className="font-semibold text-ink">1. 스팟 잡기</h2>
        <p>
          테이블에서 <span className="text-ink">히어로 포지션</span>을 고르고, 솔루션(포맷·인원·스택)과
          프리플랍 행동(오픈 / vs 오픈 등)을 고른 뒤 <span className="text-ink">연습 시작하기</span>를
          누릅니다.
        </p>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-felt-3 p-4 text-sm leading-relaxed text-muted">
        <h2 className="font-semibold text-ink">2. 추천 드릴</h2>
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            <span className="text-ink">처음부터 + 프리플랍</span> — 실제처럼 흔한 스팟을 먼저
          </li>
          <li>
            <span className="text-ink">오픈</span> — 포지션별 RFI / 숏스택 잼
          </li>
          <li>
            <span className="text-ink">vs 오픈 (BB)</span> — 수비·콜 레인지
          </li>
          <li>
            <span className="text-ink">Spot 모드</span> — 한 결정만 반복 (지금 앱 기본)
          </li>
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-white/10 bg-felt-3 p-4 text-sm leading-relaxed text-muted">
        <h2 className="font-semibold text-ink">3. 팁</h2>
        <ul className="list-disc space-y-1.5 pl-4">
          <li>쉬운 폴드만 반복하지 말고, 애매한 핸드 비중이 나오게 스택·액션을 바꿔 보세요.</li>
          <li>ICM·이벤트는 칩EV Nash보다 타이트하게 근사합니다 (정확/근사 표시 확인).</li>
          <li>
            포스트플랍 풀 솔버는{' '}
            <a
              className="text-casino-green-bright underline"
              href="https://wasm-postflop.pages.dev/"
              target="_blank"
              rel="noreferrer"
            >
              WASM Postflop
            </a>
            · PC용{' '}
            <a
              className="text-casino-green-bright underline"
              href="https://github.com/24parida/shark-2.0"
              target="_blank"
              rel="noreferrer"
            >
              Shark 2.0
            </a>
            을 참고하세요.
          </li>
        </ul>
      </section>

      {installPrompt && (
        <button
          type="button"
          onClick={onInstall}
          className="mx-auto flex items-center gap-1.5 py-3 text-xs text-muted/70 hover:text-muted"
        >
          <Download size={12} />
          홈 화면에 추가
        </button>
      )}
    </div>
  );
}
