import { useEffect, useState, useCallback } from 'react';
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
  XCircle,
  ArrowLeft,
  Grid3x3,
  Wrench,
  Home,
} from 'lucide-react';
import GtoLab from './gto/GtoLab.jsx';
import PracticeTools from './tools/PracticeTools.jsx';
import QuizHub from './tools/QuizHub.jsx';
import HomeHub from './HomeHub.jsx';
import BottomNav, { isGuideTab } from './BottomNav.jsx';
import { readRoute, writeRoute } from './lib/route.js';
import { useGameSettings } from './settings/GameSettingsContext.jsx';
import SettingsPanel from './settings/SettingsPanel.jsx';

/* ─── Tabs config ─── */
const TABS = [
  { id: 'home', label: '오늘', short: '오늘', icon: Home },
  { id: 'turbo', label: '7분 터보', short: '터보', icon: Zap },
  { id: 'mtt', label: '15분 MTT', short: 'MTT', icon: Hourglass },
  { id: 'hu', label: '헤즈업', short: 'HU', icon: Swords },
  { id: 'gto', label: '차트', short: '차트', icon: Grid3x3 },
  { id: 'tools', label: '도구', short: '도구', icon: Wrench },
  { id: 'quiz', label: '퀴즈', short: '퀴즈', icon: GraduationCap },
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
              className="flex w-full min-h-12 items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-white/5"
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
function TurboTab({ onOpenSettings }) {
  const { turbo, analysis, summary } = useGameSettings();
  return (
    <div className="space-y-5">
      <SettingsPanel compact onOpen={onOpenSettings} />
      <Card>
        <SectionTitle icon={AlertTriangle} accent="gold">
          구조부터 보자
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p className="text-xs text-gold">{summary}</p>
          <p>
            <span className="font-semibold text-ink">{turbo.summary}</span>
          </p>
          <Callout>{turbo.rebuy}</Callout>
          <p className="text-sm">{turbo.seatsNote}</p>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Spade}>프리플랍: 초반엔 타이트</SectionTitle>
        <p className="mb-4 text-sm text-muted">
          {analysis.ante ? '앤티 있음' : '앤티 없음'} · {analysis.seats}웨이
        </p>
        <Callout tone="green">{turbo.earlyOpen}</Callout>
        <div className="mt-3">
          <Accordion
            items={[
              {
                title: 'UTG — 아주 타이트',
                icon: Shield,
                body: (
                  <BulletList
                    items={[
                      '오픈: 88+, AQo+, A5s(블러프는 이것만)',
                      'AJo, KQo는 폴드',
                      '멀티팟 피하려면 3~4bb로 크게 오픈',
                    ]}
                  />
                ),
              },
              {
                title: 'BTN — 스틸은 골라서',
                icon: Target,
                body: (
                  <BulletList
                    items={[
                      '22+, A2s+, A8o+, 브로드웨이, 65s+',
                      turbo.anteNote,
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Flame} accent="red">
          포스트플랍: 리바인러(콜 많은 상대)
        </SectionTitle>
        <p className="mb-4 text-sm text-muted">플랍~리버</p>
        <Callout tone="red">{turbo.iso}</Callout>
        <div className="mt-3">
          <Accordion
            items={[
              {
                title: '프리플랍 아이솔레이션',
                icon: Users,
                body: (
                  <BulletList
                    items={[
                      '콜 스테이션 상대로는 3벳을 4~5배로 키워 헤즈업 만들기',
                      '레인지: TT+, AQo+, KQs 등 프리미엄만',
                      'A5s, 87s 같은 3벳 블러프는 안 씀',
                      '미들 페어(22~99)는 콜만 하고 셋 노림',
                    ]}
                  />
                ),
              },
              {
                title: '포스트플랍 블러프는 접기',
                icon: XCircle,
                body: (
                  <p>
                    폴드를 거의 안 하는 상대에게 <strong className="text-ink">C-bet 블러프는 금지</strong>.
                    안 맞으면 체크/폴드.
                  </p>
                ),
              },
              {
                title: '밸류와 슬로우플레이',
                icon: Crown,
                body: (
                  <BulletList
                    items={[
                      '밸류 기준을 TPTK까지 낮춰 리버까지 밸류벳',
                      '셋·투페어 이상이면 먼저 벳하지 말 것',
                      '체크/콜로 리버까지 끌어서 상대 올인을 받기',
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Zap} accent="gold">
          {analysis.pushFoldBb}bb 숏스택 푸시/폴드
        </SectionTitle>
        <div className="mb-4 space-y-2 text-sm text-muted">
          <p>
            <strong className="text-ink">원리:</strong> 폴드 에퀴티와 데드머니 흡수.
          </p>
          <Callout tone="red">
            남의 올인을 콜할 때는 내가 올인할 때보다 2~3배 타이트하게.
          </Callout>
          <Callout tone="green">{turbo.pushNote}</Callout>
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
          버블과 ITM 직후
        </SectionTitle>
        <Accordion
          items={[
            {
              title: '버블 타임',
              icon: Hourglass,
              body: (
                <BulletList
                  items={[
                    '칩 리더: 미들 스택을 VPIP 60% 이상으로 압박',
                    '숏스택: 센 핸드만 기다리며 버티기',
                  ]}
                />
              ),
            },
            {
              title: 'ITM(상금권) 직후',
              icon: Flame,
              body: (
                <p>
                  숏스택이 아무 카드로 올인하기 시작한다. 이때는{' '}
                  <strong className="text-ink">77, KTs</strong> 같은 핸드도 콜해서 칩을 먹는다.
                </p>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function MttTab({ onOpenSettings }) {
  const { mtt, analysis, summary } = useGameSettings();
  return (
    <div className="space-y-5">
      <SettingsPanel compact onOpen={onOpenSettings} />
      <Card>
        <SectionTitle icon={Hourglass} accent="gold">
          게임 구조
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p className="text-xs text-gold">{summary}</p>
          <BulletList
            items={[
              `시작 ${analysis.startBb}bb (${analysis.startChips.toLocaleString()}칩 / BB ${analysis.startBB})`,
              `${analysis.levelMin}분 블라인드`,
              analysis.ante ? '앤티 적용' : '앤티 없음(또는 늦게)',
              `리엔트리 칩 약 ${analysis.rebuyChips.toLocaleString()}`,
            ]}
          />
          <Callout tone="green">{mtt.summary}</Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Spade}>딥스택 초반 프리플랍 & 포스트플랍</SectionTitle>
        <Accordion
          items={[
            {
              title: '데드 머니 스틸',
              icon: Target,
              body: <p>{mtt.ante}</p>,
            },
            {
              title: '임플라이드 오즈',
              icon: Crown,
              body: <p>{mtt.implied}</p>,
            },
          ]}
        />
      </Card>

      <Card>
        <SectionTitle icon={AlertTriangle} accent="red">
          레지 마감과 숏스택 방어
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p>{mtt.lateReg}</p>
          <Callout>{mtt.rebuy}</Callout>
        </div>
      </Card>
    </div>
  );
}

function HeadsUpTab({ onOpenSettings }) {
  const { hu } = useGameSettings();
  return (
    <div className="space-y-5">
      <SettingsPanel compact onOpen={onOpenSettings} />
      <Card>
        <SectionTitle icon={Swords} accent="gold">
          규칙의 변화
        </SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <p>헤즈업에서는 버튼(BTN)이 스몰 블라인드(SB)가 됨.</p>
          <p className="text-ink">{hu.summary}</p>
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
        <BulletList items={[hu.value, '프리플랍에 A·K만 있어도 강한 편', '포스트플랍은 바텀 페어에도 벳할 수 있다', '투페어는 거의 넛으로 봐도 된다']} />
      </Card>

      <Card>
        <SectionTitle icon={Target}>버튼(SB) 운영법</SectionTitle>
        <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-[15px]">
          <Callout tone="green">{hu.line}</Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Crown} accent="gold">
          팁 · 칩 나누기(Chop)
        </SectionTitle>
        <Callout>{hu.chop}</Callout>
      </Card>
    </div>
  );
}


/* ─── App ─── */
export default function App() {
  const initial = readRoute();
  const [tab, setTab] = useState(initial.tab);
  const [tool, setTool] = useState(initial.tool);
  const [hand, setHand] = useState(initial.hand);
  const [pos, setPos] = useState(initial.pos);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const syncRoute = useCallback((next) => {
    const state = {
      tab: next.tab ?? tab,
      tool: next.tool ?? tool,
      hand: next.hand !== undefined ? next.hand : hand,
      pos: next.pos !== undefined ? next.pos : pos,
    };
    if (next.tab !== undefined) setTab(next.tab);
    if (next.tool !== undefined) setTool(next.tool);
    if (next.hand !== undefined) setHand(next.hand);
    if (next.pos !== undefined) setPos(next.pos);
    writeRoute(state);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab, tool, hand, pos]);

  useEffect(() => {
    function onPop() {
      const r = readRoute();
      setTab(r.tab);
      setTool(r.tool);
      setHand(r.hand);
      setPos(r.pos);
      setGuideOpen(false);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    function onBip(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  function goTab(id) {
    syncRoute({ tab: id, tool: id === 'tools' ? tool : undefined });
  }

  const showDesktopHeader = tab === 'home';

  return (
    <div className="felt-noise min-h-dvh">
      <div className="mx-auto max-w-3xl px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pb-16 sm:pt-8 md:pb-16">
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-6">
          <a
            href="/toys/"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm text-muted transition hover:text-gold"
          >
            <ArrowLeft size={14} /> 장난감
          </a>
          {!showDesktopHeader && (
            <p className="truncate text-sm font-medium text-gold sm:hidden">
              {TABS.find((t) => t.id === tab)?.label || '가이드'}
            </p>
          )}
          <span className="w-14 sm:hidden" aria-hidden />
        </div>

        <header className={`text-center ${showDesktopHeader ? 'mb-6 sm:mb-8' : 'mb-4 hidden sm:mb-8 sm:block'}`}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="mb-2 text-xs font-medium tracking-[0.25em] text-gold uppercase">
              Korean Hold&apos;em Pub
            </p>
            <h1 className="font-display text-2xl font-bold tracking-wide sm:text-4xl">
              <span className="gold-text">홀덤펍 토너먼트 가이드</span>
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted sm:mt-3 sm:text-base">
              터보·MTT·헤즈업 정리 · 차트 · 15bb 연습
            </p>
          </motion.div>
        </header>

        {/* desktop / tablet top tabs */}
        <nav
          className="sticky top-0 z-40 -mx-3 mb-6 hidden border-b border-gold/15 bg-felt/90 px-3 backdrop-blur-md sm:-mx-6 sm:px-6 md:block"
          aria-label="전략 섹션"
        >
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-thin">
            {TABS.map(({ id, label, short, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => goTab(id)}
                  className={`relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
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

        {/* mobile: compact chip row for guide context only */}
        {isGuideTab(tab) && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin md:hidden">
            {[
              { id: 'turbo', label: '터보' },
              { id: 'mtt', label: 'MTT' },
              { id: 'hu', label: 'HU' },
              { id: 'gto', label: '차트' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => goTab(c.id)}
                className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm font-medium ${
                  tab === c.id ? 'bg-gold text-felt' : 'border border-white/12 text-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {tab === 'home' && (
              <HomeHub
                onGo={({ tab: t, tool: tl }) => syncRoute({ tab: t, tool: tl })}
                installPrompt={installPrompt}
                onInstall={async () => {
                  if (!installPrompt) return;
                  installPrompt.prompt();
                  await installPrompt.userChoice;
                  setInstallPrompt(null);
                }}
              />
            )}
            {tab === 'turbo' && (
              <TurboTab onOpenSettings={() => syncRoute({ tab: 'tools', tool: 'settings' })} />
            )}
            {tab === 'mtt' && (
              <MttTab onOpenSettings={() => syncRoute({ tab: 'tools', tool: 'settings' })} />
            )}
            {tab === 'hu' && (
              <HeadsUpTab onOpenSettings={() => syncRoute({ tab: 'tools', tool: 'settings' })} />
            )}
            {tab === 'gto' && <GtoLab />}
            {tab === 'tools' && (
              <PracticeTools
                initialTool={tool}
                initialHand={hand || undefined}
                initialPos={pos || undefined}
                onToolChange={(id) => syncRoute({ tab: 'tools', tool: id })}
              />
            )}
            {tab === 'quiz' && <QuizHub />}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-10 hidden border-t border-white/8 pt-6 text-center text-xs text-muted md:block">
          <p>※ 학습용 정리입니다. 도박을 권하지 않습니다.</p>
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

      <BottomNav
        tab={tab}
        onTab={goTab}
        guideOpen={guideOpen}
        setGuideOpen={setGuideOpen}
      />
    </div>
  );
}
