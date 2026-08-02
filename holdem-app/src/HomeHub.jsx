import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Search, ScrollText, Flame, Download, Share2 } from 'lucide-react';
import { streakCount, touchStreak, shareUrl } from './lib/route.js';

const QUICK = [
  { id: 'timer', label: '타이머', desc: '블라인드·스택 bb', icon: Timer, tab: 'tools', tool: 'timer' },
  { id: 'lookup', label: '15bb 조회', desc: '핸드·포지션 바로', icon: Search, tab: 'tools', tool: 'lookup' },
  { id: 'sheet', label: '치트시트', desc: '한 장 요약', icon: ScrollText, tab: 'tools', tool: 'sheet' },
];

export default function HomeHub({ onGo, installPrompt, onInstall }) {
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    touchStreak();
    setStreak(streakCount());
  }, []);

  async function copyHome() {
    const link = shareUrl({ tab: 'home' });
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('링크 복사', link);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gold/20 bg-felt-3/80 p-5 text-center sm:p-6">
        <p className="text-xs tracking-widest text-gold uppercase">오늘 테이블</p>
        <h2 className="font-display mt-2 text-xl text-ink sm:text-2xl">바로 쓰기</h2>
        {streak > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
            <Flame size={14} className="text-gold" />
            연속 <span className="font-semibold text-gold">{streak}</span>일
          </p>
        )}
      </div>

      <div className="grid gap-3">
        {QUICK.map((q) => (
          <motion.button
            key={q.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onGo({ tab: q.tab, tool: q.tool })}
            className="flex items-center gap-4 rounded-2xl border border-gold/15 bg-felt-3/90 px-4 py-4 text-left transition hover:border-gold/35"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <q.icon size={22} />
            </span>
            <span>
              <span className="block font-semibold text-ink">{q.label}</span>
              <span className="text-sm text-muted">{q.desc}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={copyHome}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm text-muted"
        >
          <Share2 size={15} />
          {copied ? '복사됨' : '가이드 링크 복사'}
        </button>
        {installPrompt && (
          <button
            type="button"
            onClick={onInstall}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-casino-green py-3 text-sm font-semibold text-white"
          >
            <Download size={15} />
            홈 화면에 추가
          </button>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        가이드·차트·퀴즈는 위 탭에서 · 오프라인도 치트시트는 캐시됩니다
      </p>
    </div>
  );
}
