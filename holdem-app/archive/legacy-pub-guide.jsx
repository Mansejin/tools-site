/** @archived Not imported. Legacy Korean pub tournament guide panels. */
import { useState } from 'react';
import {
  Zap, Hourglass, Swords, ChevronDown, Spade, Target, Shield, Flame,
  Users, Crown, AlertTriangle, XCircle,
} from 'lucide-react';
import { useGameSettings } from '../src/settings/GameSettingsContext.jsx';
import SettingsPanel from '../src/settings/SettingsPanel.jsx';

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
              <span className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} />
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-white/6 px-4 py-4 text-sm leading-relaxed text-muted sm:text-[15px]">
                {item.body}
              </div>
            )}
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



