import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap,
  Hourglass,
  Swords,
  GraduationCap,
  ChevronDown,
  Spade,
  Target,
  Shield,
  Flame,
  Users,
  Crown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';

/* ─── Tabs config ─── */
const TABS = [
  { id: 'turbo', label: '7분 터보', short: '터보', icon: Zap },
  { id: 'mtt', label: '15분 MTT', short: 'MTT', icon: Hourglass },
  { id: 'hu', label: '헤즈업', short: 'HU', icon: Swords },
  { id: 'quiz', label: '모의고사', short: '퀴즈', icon: GraduationCap },
];

/* ─── Quiz data ─── */
const QUIZ = [
  {
    id: 1,
    situation: 'UTG 포지션, 내 앞에 액션 없음. 내 카드는 AJo.',
    question: '15bb 올인(Push)?',
    answer: false,
    explanation: '얼리 포지션에서 AJo 올인은 자살 행위. 콜 당하면 지고 들어감.',
  },
  {
    id: 2,
    situation: '매니악이 3bb 오픈함. 나는 BTN에서 A5s 보유.',
    question: '3벳 블러프로 압박?',
    answer: false,
    explanation: '폴드를 모르는 매니악에게 3벳 블러프는 칩 헌납. 과감히 3벳 포기가 착취 전략.',
  },
  {
    id: 3,
    situation: 'BTN 포지션, 내 앞에 모두 폴드. 내 카드는 K9o.',
    question: '15bb 올인(Push)?',
    answer: true,
    explanation: '뒤에 블라인드 2명뿐. 앤티와 블라인드를 스틸하기 완벽한 올인 핸드.',
  },
  {
    id: 4,
    situation: '컷오프(CO) 유저가 15bb 올인. 나는 BB에서 A3o 보유.',
    question: '방어 콜(Call)?',
    answer: false,
    explanation: '내가 올인할 땐 A3o가 좋지만, 남의 올인에 콜하는 것은 상대 레인지에 철저히 지배당함.',
  },
  {
    id: 5,
    situation: 'ITM 상금 확정 직후, 5bb 숏스택이 묻지마 올인. 나는 칩 리더, 카드는 77.',
    question: '콜(Call)?',
    answer: true,
    explanation: '상금 확정 직후 숏스택 레인지는 Any Two. 77로 쿨하게 받아먹을 타이밍.',
  },
];

const PUSH_FOLD = [
  { pos: 'UTG', pct: '상위 10%', range: '77+, ATs+, AQo+, KQs', icon: Shield },
  { pos: 'MP/CO', pct: '상위 20%', range: '55+, 모든 수티드 에이스, A9o+, 모든 브로드웨이 수티드', icon: Target },
  { pos: 'BTN', pct: '상위 40%', range: '22+, 모든 에이스, 모든 수티드 K, K9o+, J9s+', icon: Spade },
  { pos: 'SB', pct: '상위 60%', range: '모든 파켓, 에이스, 킹, 퀸, 잭. 거의 모든 수티드 카드.', icon: Flame },
];

/* ─── UI primitives ─── */
function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-gold/15 bg-felt-3/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children, accent = 'green' }) {
  const ring =
    accent === 'gold'
      ? 'bg-gold/15 text-gold'
      : accent === 'red'
        ? 'bg-deep-red/25 text-red-300'
        : 'bg-casino-green/20 text-casino-green-bright';
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ring}`}>
        <Icon size={18} />
      </span>
      <h2 className="font-display text-lg font-semibold tracking-wide text-ink sm:text-xl">{children}</h2>
    </div>
  );
}

function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.title}
            className="overflow-hidden rounded-xl border border-white/8 bg-felt-2/90"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/3"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2.5 font-medium text-ink">
                {item.icon && (
                  <item.icon size={16} className="shrink-0 text-gold" aria-hidden />
                )}
                {item.title}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted"
              >
                <ChevronDown size={18} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-white/6 px-4 py-4 text-sm leading-relaxed text-muted sm:text-[15px]">
                    {item.body}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-casino-green-bright" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="scrollbar-thin -mx-1 overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gold/25 text-gold">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold tracking-wide whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-white/6 text-ink/90 odd:bg-white/[0.02] even:bg-transparent"
            >
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-3 align-top ${j === 0 ? 'font-semibold text-gold-soft' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ tone = 'gold', children }) {
  const styles =
    tone === 'red'
      ? 'border-deep-red/40 bg-deep-red/15 text-red-200'
      : tone === 'green'
        ? 'border-casino-green/40 bg-casino-green/10 text-emerald-100'
        : 'border-gold/35 bg-gold/10 text-amber-100';
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>{children}</div>
  );
}

/* ─── Tab panels ─── */
function TurboTab() {
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle icon={AlertTriangle} accent="gold">
          게임 구조의 진실
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p>
            시작은 <span className="font-semibold text-ink">150bb</span>지만{' '}
            <span className="font-semibold text-gold">7분 블라인드</span>라{' '}
            <span className="font-semibold text-ink">20분이면 숏스택(15bb)</span> 게임이 됨.
          </p>
          <Callout>
            최대 2블릿(본바이인 3만 + 1리바인 4만칩)까지만 쓰는 것이 수학적 최고 ROI.
          </Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Spade}>프리플랍: 초반 닌자 모드</SectionTitle>
        <p className="mb-4 text-sm text-muted">앤티 없음 · 9–10웨이</p>
        <Accordion
          items={[
            {
              title: 'UTG — 극강 타이트',
              icon: Shield,
              body: (
                <BulletList
                  items={[
                    '오픈: 88+, AQo+, A5s(유일한 블러프)만',
                    'AJo, KQo 절대 금지',
                    '다자간 팟 방지를 위해 3~4bb 강하게 오픈',
                  ]}
                />
              ),
            },
            {
              title: 'BTN — 선택적 스틸',
              icon: Target,
              body: (
                <BulletList
                  items={[
                    '22+, A2s+, A8o+, 모든 브로드웨이, 65s+',
                    '앤티가 없으므로 너무 넓은 스틸은 자제',
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle icon={Flame} accent="red">
          포스트플랍: 매니악(리바인러) 착취
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">리버까지의 운영</p>
        <Accordion
          items={[
            {
              title: '프리플랍 아이솔레이션',
              icon: Users,
              body: (
                <BulletList
                  items={[
                    '매니악 상대로 3벳을 4배~5배(4x~5x)로 강하게 쳐서 1:1 상황 만들기',
                    '프리미엄: TT+, AQo+, KQs 등',
                    'A5s, 87s 같은 3벳 블러프는 0%로 봉인',
                    '미들 파켓(22~99)은 콜만 해서 셋 마이닝',
                  ]}
                />
              ),
            },
            {
              title: '포스트플랍 블러프 금지',
              icon: XCircle,
              body: (
                <p>
                  폴드 버튼이 고장난 매니악 상대로 <strong className="text-ink">C-bet 블러프 금지</strong>.
                  안 맞으면 첵/폴드로 미련 없이 포기.
                </p>
              ),
            },
            {
              title: '밸류 베팅 및 함정(Trap)',
              icon: Crown,
              body: (
                <BulletList
                  items={[
                    '밸류 기준을 탑페어+탑키커(TPTK)로 낮춰 리버까지 강하게 밸류를 뽑아냄',
                    '셋(Set)이나 투페어 이상의 넛(Nut)이 맞았다면 절대 먼저 베팅하지 말 것',
                    '첵/콜로 리버까지 함정을 파서 매니악이 알아서 올인하게 유도',
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle icon={Zap} accent="gold">
          15bb 숏스택 푸시/폴드
        </SectionTitle>
        <div className="mb-4 space-y-2 text-sm text-muted">
          <p>
            <strong className="text-ink">원리:</strong> 폴드 에퀴티와 데드머니(앤티) 흡수.
          </p>
          <Callout tone="red">
            남의 올인을 &apos;콜&apos;할 때는 내가 &apos;올인&apos;할 때보다 2~3배 타이트하게 방어.
          </Callout>
        </div>
        <p className="mb-3 text-sm font-medium text-gold">포지션별 올인 레인지 (앞이 모두 폴드)</p>
        <DataTable
          columns={['포지션', '비율', '올인 레인지']}
          rows={PUSH_FOLD.map((r) => [r.pos, r.pct, r.range])}
        />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PUSH_FOLD.map(({ pos, pct, icon: Icon }) => (
            <div
              key={pos}
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-felt/60 px-3 py-2.5"
            >
              <Icon size={16} className="text-casino-green-bright" />
              <div>
                <div className="text-sm font-semibold text-ink">{pos}</div>
                <div className="text-xs text-muted">{pct}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Crown} accent="gold">
          버블(Bubble)과 ITM 직후 심리전
        </SectionTitle>
        <Accordion
          items={[
            {
              title: '버블 타임',
              icon: Hourglass,
              body: (
                <BulletList
                  items={[
                    '칩 리더: 미들 스택을 60% 이상 VPIP로 폭군처럼 압박',
                    '숏스택: 철저하게 프리미엄만 기다리며 생존',
                  ]}
                />
              ),
            },
            {
              title: 'ITM(상금 확정) 직후',
              icon: Flame,
              body: (
                <p>
                  숏스택들의 &apos;아무 카드(Any Two) 무지성 올인&apos; 파티 시작. 이때는{' '}
                  <strong className="text-ink">77이나 KTs</strong> 같은 마지널 밸류로도 과감하게 콜을
                  받아 칩 흡수.
                </p>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function MttTab() {
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle icon={Hourglass} accent="gold">
          게임 구조
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <BulletList
            items={[
              '200bb 딥스택 시작',
              '15분 블라인드',
              '시작부터 앤티 적용',
              '리엔트리(4/5/6만 칩)',
            ]}
          />
          <Callout tone="green">포스트플랍 실력이 매우 중요한 구조.</Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Spade}>딥스택 초반 프리플랍 & 포스트플랍</SectionTitle>
        <Accordion
          items={[
            {
              title: '데드 머니 스틸',
              icon: Target,
              body: (
                <p>
                  레벨 1부터 앤티가 있으므로, <strong className="text-ink">BTN과 CO</strong>에서 넓은
                  레인지로 블라인드 스틸을 적극 시도.
                </p>
              ),
            },
            {
              title: '임플라이드 오즈(Implied Odds) 극대화',
              icon: Crown,
              body: (
                <BulletList
                  items={[
                    '딥스택이므로 22~66 로우 파켓과 76s, 87s 같은 수티드 커넥터의 가치가 폭등',
                    '플랍에 셋이나 넛 플러시 드로우가 맞으면 다이아몬드 광산 캐듯 리바인 유저들과 칩을 다 넣고 승부',
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle icon={AlertTriangle} accent="red">
          레지(Late Reg) 마감과 3bb 룰렛 방어
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p>
            <strong className="text-ink">10000/20000 블라인드</strong> 전 브레이크 때 레지 마감.
            이때 6만 칩 리엔트리를 하면 <span className="font-semibold text-gold">3bb 스택</span>.
          </p>
          <Callout>
            레지 직전에 들어와 Any Two로 다이렉트 올인 박는 도박꾼들을 상대로 A 하이나 미들 파켓으로
            과감히 콜을 받아 데드머니 챙기기.
          </Callout>
        </div>
      </Card>
    </div>
  );
}

function HeadsUpTab() {
  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle icon={Swords} accent="gold">
          규칙의 변화
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p>
            헤즈업에서는 버튼(BTN)이 스몰 블라인드(SB)가 됨.
          </p>
          <DataTable
            columns={['국면', '버튼(SB) 액션 순서', '의미']}
            rows={[
              ['프리플랍', '먼저', '먼저 결정해야 함'],
              ['포스트플랍 (플랍~리버)', '나중에', '포지션 우위'],
            ]}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Flame} accent="red">
          가치의 변화
        </SectionTitle>
        <BulletList
          items={[
            '밸류 기준이 우주 끝까지 내려감',
            '프리플랍에서 A나 K가 한 장이라도 있으면 몬스터 핸드',
            '포스트플랍에서는 바텀 페어만 맞아도 강하게 벳 가능',
            '투페어는 넛(Nut) 취급',
          ]}
        />
      </Card>

      <Card>
        <SectionTitle icon={Target}>버튼(SB) 운영법</SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p>어차피 15bb 이하 숏스택 싸움.</p>
          <Callout tone="green">
            강하게 레이즈하면 상대 올인에 폴드하기 아까우므로,{' '}
            <strong>림프(Limp)와 미니 레이즈(Min-raise)</strong>를 섞어 스택을 보호하며 포스트플랍
            운영.
          </Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Crown} accent="gold">
          팁 · 칩 찹(Chop)
        </SectionTitle>
        <Callout>
          내 칩이 조금이라도 많다면(예: 6대4 비율) 칩 찹(Chop) 딜을 제안하는 것이 최상의 수익률.
        </Callout>
      </Card>
    </div>
  );
}

/* ─── Quiz ─── */
function QuizTab() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, picked }
  const [done, setDone] = useState(false);

  const q = QUIZ[idx];

  function answer(picked) {
    if (feedback) return;
    const correct = picked === q.answer;
    setFeedback({ correct, picked });
    if (correct) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= QUIZ.length) {
      setDone(true);
      setFeedback(null);
      return;
    }
    setIdx((i) => i + 1);
    setFeedback(null);
  }

  function reset() {
    setIdx(0);
    setScore(0);
    setFeedback(null);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((score / QUIZ.length) * 100);
    return (
      <Card className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-4 py-4"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
            <GraduationCap size={32} />
          </div>
          <h2 className="font-display text-2xl text-gold-soft">모의고사 완료</h2>
          <p className="text-muted">
            {QUIZ.length}문제 중 <span className="text-2xl font-bold text-ink">{score}</span>개 정답
            <span className="ml-2 text-gold">({pct}%)</span>
          </p>
          <Callout tone={pct >= 80 ? 'green' : pct >= 60 ? 'gold' : 'red'}>
            {pct >= 80
              ? '펍 테이블에서 숏스택 압박할 준비가 됐습니다.'
              : pct >= 60
                ? '기본기는 있습니다. 레인지 표를 한 번 더 외우세요.'
                : '터보 탭의 푸시/폴드 표를 복습하고 다시 도전하세요.'}
          </Callout>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-casino-green px-5 py-3 font-semibold text-white transition hover:bg-casino-green-bright"
          >
            <RotateCcw size={16} /> 다시 풀기
          </button>
        </motion.div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          문제 {idx + 1} / {QUIZ.length}
        </span>
        <span className="text-gold">정답 {score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-felt-4">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-casino-green to-gold"
          animate={{ width: `${((idx + (feedback ? 1 : 0)) / QUIZ.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-felt px-3 py-1.5 text-xs font-medium text-gold">
              <Spade size={12} /> 상황 {q.id}
            </div>
            <p className="mb-3 text-[15px] leading-relaxed text-muted">{q.situation}</p>
            <h3 className="mb-6 font-display text-xl font-semibold text-ink sm:text-2xl">
              {q.question}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!!feedback}
                onClick={() => answer(true)}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-casino-green/50 bg-casino-green/15 px-4 py-5 font-bold text-casino-green-bright transition hover:bg-casino-green/25 disabled:opacity-60"
              >
                <CheckCircle2 size={28} />
                <span>O · 올인/콜</span>
              </button>
              <button
                type="button"
                disabled={!!feedback}
                onClick={() => answer(false)}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-deep-red/50 bg-deep-red/15 px-4 py-5 font-bold text-red-300 transition hover:bg-deep-red/25 disabled:opacity-60"
              >
                <XCircle size={28} />
                <span>X · 폴드</span>
              </button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-md rounded-2xl border border-gold/25 bg-felt-3 p-6 shadow-2xl"
            >
              <div
                className={`mb-3 flex items-center gap-2 text-lg font-bold ${
                  feedback.correct ? 'text-casino-green-bright' : 'text-red-300'
                }`}
              >
                {feedback.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                {feedback.correct ? '정답!' : '오답'}
              </div>
              <p className="mb-2 text-sm text-gold">
                정답: {q.answer ? 'O (올인/콜)' : 'X (폴드)'}
              </p>
              <p className="mb-5 text-sm leading-relaxed text-muted">{q.explanation}</p>
              <button
                type="button"
                onClick={next}
                className="w-full rounded-xl bg-gold px-4 py-3 font-semibold text-felt transition hover:bg-gold-soft"
              >
                {idx + 1 >= QUIZ.length ? '결과 보기' : '다음 문제'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── App ─── */
export default function App() {
  const [tab, setTab] = useState('turbo');

  return (
    <div className="felt-noise min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
        <a
          href="/toys/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-gold"
        >
          <ArrowLeft size={14} /> 장난감
        </a>

        <header className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="mb-2 text-xs font-medium tracking-[0.25em] text-gold uppercase">
              Korean Hold&apos;em Pub
            </p>
            <h1 className="font-display text-2xl font-bold tracking-wide sm:text-4xl">
              <span className="gold-text">토너먼트 필승 전략 바이블</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              7분 터보 · 15분 MTT · 헤즈업 · 실전 15bb 모의고사
            </p>
          </motion.div>
        </header>

        <nav
          className="sticky top-0 z-40 -mx-4 mb-6 border-b border-gold/15 bg-felt/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6"
          aria-label="전략 섹션"
        >
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-thin">
            {TABS.map(({ id, label, short, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                    active ? 'text-gold' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} />
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                  {active && (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-gold"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {tab === 'turbo' && <TurboTab />}
            {tab === 'mtt' && <MttTab />}
            {tab === 'hu' && <HeadsUpTab />}
            {tab === 'quiz' && <QuizTab />}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-12 border-t border-white/8 pt-6 text-center text-xs text-muted">
          <p>※ 펍 토너먼트 ROI용 전략 정리 · 도박 권장 아님</p>
          <p className="mt-1">
            <a href="/toys/" className="hover:text-gold">
              장난감
            </a>
            {' · '}
            <a href="/" className="hover:text-gold">
              도구함
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
