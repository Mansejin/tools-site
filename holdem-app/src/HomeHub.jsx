import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Timer,
  Search,
  ScrollText,
  Download,
  Settings2,
  Zap,
  Hourglass,
  Swords,
  Grid3x3,
  GraduationCap,
  Infinity,
  GitBranch,
  Calculator,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Flame,
  Spade,
} from 'lucide-react';
import { streakCount, touchStreak } from './lib/route.js';
import { loadPracticeStats, accuracyPct } from './lib/practiceStats.js';
import { loadWrongs } from './tools/pushFoldPub.js';
import { useGameSettings } from './settings/GameSettingsContext.jsx';

const FEATURES = [
  {
    group: '학습',
    items: [
      { label: '터보', desc: '숏스택·리바인 구조', icon: Zap, color: 'text-amber-300 bg-amber-400/15', tab: 'turbo' },
      { label: 'MTT', desc: '딥스택·앤티', icon: Hourglass, color: 'text-sky-300 bg-sky-400/15', tab: 'mtt' },
      { label: '헤즈업', desc: '최종 2인', icon: Swords, color: 'text-violet-300 bg-violet-400/15', tab: 'hu' },
      { label: '차트', desc: 'RFI · Nash', icon: Grid3x3, color: 'text-emerald-300 bg-emerald-400/15', tab: 'gto' },
    ],
  },
  {
    group: '연습',
    items: [
      { label: '퀴즈', desc: '5문제 · 오답복습', icon: GraduationCap, color: 'text-rose-300 bg-rose-400/15', tab: 'quiz' },
      { label: '무한 연습', desc: '푸시/폴드 드릴', icon: Infinity, color: 'text-orange-300 bg-orange-400/15', tab: 'quiz' },
      { label: '핸드 조회', desc: '포지션·스택 즉시', icon: Search, color: 'text-cyan-300 bg-cyan-400/15', tab: 'tools', tool: 'lookup' },
      { label: '테이블 설정', desc: '칩·레벨·리바', icon: Settings2, color: 'text-gold bg-gold/15', tab: 'tools', tool: 'settings' },
    ],
  },
  {
    group: '도구',
    items: [
      { label: '타이머', desc: '블라인드 카운트', icon: Timer, color: 'text-lime-300 bg-lime-400/15', tab: 'tools', tool: 'timer' },
      { label: '치트시트', desc: '한 장 요약', icon: ScrollText, color: 'text-yellow-200 bg-yellow-400/15', tab: 'tools', tool: 'sheet' },
      { label: '버블', desc: '스택·국면별 조언', icon: GitBranch, color: 'text-fuchsia-300 bg-fuchsia-400/15', tab: 'tools', tool: 'bubble' },
      { label: 'ROI', desc: '리바 횟수 EV', icon: Calculator, color: 'text-teal-300 bg-teal-400/15', tab: 'tools', tool: 'roi' },
    ],
  },
];

function StatBar({ label, value, max, tone }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bar =
    tone === 'good'
      ? 'bg-emerald-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'bad'
          ? 'bg-rose-500'
          : 'bg-white/25';
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

export default function HomeHub({ onGo, installPrompt, onInstall }) {
  const { summary, analysis } = useGameSettings();
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState(() => loadPracticeStats());
  const [wrongs, setWrongs] = useState(0);

  useEffect(() => {
    touchStreak();
    setStreak(streakCount());
    setStats(loadPracticeStats());
    setWrongs(loadWrongs().length);
  }, []);

  const acc = accuracyPct(stats);
  const maxBar = Math.max(stats.correct, stats.wrong, 1);

  return (
    <div className="space-y-6">
      {/* App header — compact, not a marketing hero */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-casino-green/20 text-casino-green-bright">
              <Spade size={18} />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink">대시보드</h1>
              <p className="text-xs text-muted">Pub · 토너먼트</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onGo({ tab: 'tools', tool: 'settings' })}
          className="max-w-[55%] rounded-xl border border-white/10 bg-felt-3 px-3 py-2 text-left active:bg-felt-2"
        >
          <p className="text-[10px] font-medium tracking-wide text-muted uppercase">오늘 구조</p>
          <p className="mt-0.5 truncate text-xs text-ink">
            {analysis.startBb}bb · {analysis.levelMin}분
            {analysis.ante ? ' · 앤티' : ''}
          </p>
        </button>
      </div>

      {/* Feature grid — GTOW-style columns */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.flatMap((g) =>
          g.items.map((item) => (
            <motion.button
              key={`${g.group}-${item.label}`}
              type="button"
              whileTap={{ scale: 0.985 }}
              onClick={() => onGo({ tab: item.tab, tool: item.tool })}
              className="flex items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition hover:bg-felt-3 active:bg-felt-2"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}
              >
                <item.icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{item.label}</span>
                <span className="block truncate text-xs text-muted">{item.desc}</span>
              </span>
            </motion.button>
          )),
        )}
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onGo({ tab: 'quiz' })}
          className="rounded-2xl border border-white/[0.06] bg-felt-3 p-4 text-left transition hover:border-white/12"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">연습 통계</h3>
            <ChevronRight size={16} className="text-muted/50" />
          </div>
          <div className="mb-4 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums text-ink">{stats.answered}</p>
              <p className="text-[10px] text-muted">핸드</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-ink">{stats.answered}</p>
              <p className="text-[10px] text-muted">액션</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-rose-300">{stats.wrong}</p>
              <p className="text-[10px] text-muted">실수</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-casino-green-bright">{acc}%</p>
              <p className="text-[10px] text-muted">점수</p>
            </div>
          </div>
          <div className="space-y-2">
            <StatBar label="정답" value={stats.correct} max={maxBar} tone="good" />
            <StatBar label="오답" value={stats.wrong} max={maxBar} tone="bad" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onGo({ tab: 'quiz' })}
          className="rounded-2xl border border-white/[0.06] bg-felt-3 p-4 text-left transition hover:border-white/12"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">복습 · 스트릭</h3>
            <ChevronRight size={16} className="text-muted/50" />
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums text-gold">{streak}</p>
              <p className="text-[10px] text-muted">연속일</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-ink">{wrongs}</p>
              <p className="text-[10px] text-muted">오답 대기</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums text-ink">{stats.drill || 0}</p>
              <p className="text-[10px] text-muted">드릴</p>
            </div>
          </div>
          <div className="space-y-2.5 text-xs text-muted">
            <p className="flex items-center gap-2">
              <Flame size={14} className="text-gold" />
              {streak > 0 ? `${streak}일 연속 방문` : '오늘 첫 방문'}
            </p>
            <p className="flex items-center gap-2">
              {wrongs > 0 ? (
                <>
                  <XCircle size={14} className="text-rose-300" />
                  오답 {wrongs}개 복습 가능
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  복습 대기 없음
                </>
              )}
            </p>
            <p className="truncate text-[11px] text-muted/80">{summary}</p>
          </div>
        </button>
      </div>

      {installPrompt && (
        <button
          type="button"
          onClick={onInstall}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-casino-green text-sm font-semibold text-white active:brightness-95"
        >
          <Download size={15} />
          홈 화면에 추가
        </button>
      )}
    </div>
  );
}
