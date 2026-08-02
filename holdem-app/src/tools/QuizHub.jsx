import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Infinity,
  BookMarked,
  Spade,
  Trash2,
} from 'lucide-react';
import {
  DRILL_POSITIONS,
  randomHand,
  randomPosition,
  shouldPush,
  shouldCallShove,
  saveWrong,
  loadWrongs,
  clearWrongs,
  removeWrong,
} from './pushFoldPub.js';

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

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-gold/15 bg-felt-3/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function ModeTabs({ mode, setMode, wrongCount }) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl border border-white/8 bg-felt p-1">
      {[
        { id: 'exam', label: '모의고사', icon: GraduationCap },
        { id: 'drill', label: '무한 드릴', icon: Infinity },
        { id: 'review', label: `오답 (${wrongCount})`, icon: BookMarked },
      ].map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
            mode === m.id ? 'bg-gold/90 text-felt' : 'text-muted hover:text-ink'
          }`}
        >
          <m.icon size={14} />
          <span className="truncate">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function OxButtons({ disabled, onYes, onNo, yesLabel = 'O · 올인/콜', noLabel = 'X · 폴드' }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onYes}
        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-casino-green/50 bg-casino-green/15 px-4 py-5 font-bold text-casino-green-bright transition hover:bg-casino-green/25 disabled:opacity-60"
      >
        <CheckCircle2 size={28} />
        <span>{yesLabel}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onNo}
        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-deep-red/50 bg-deep-red/15 px-4 py-5 font-bold text-red-300 transition hover:bg-deep-red/25 disabled:opacity-60"
      >
        <XCircle size={28} />
        <span>{noLabel}</span>
      </button>
    </div>
  );
}

function FeedbackModal({ correct, answerLabel, explanation, onNext, nextLabel }) {
  return (
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
            correct ? 'text-casino-green-bright' : 'text-red-300'
          }`}
        >
          {correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          {correct ? '정답!' : '오답'}
        </div>
        <p className="mb-2 text-sm text-gold">정답: {answerLabel}</p>
        <p className="mb-5 text-sm leading-relaxed text-muted">{explanation}</p>
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-xl bg-gold px-4 py-3 font-semibold text-felt transition hover:bg-gold-soft"
        >
          {nextLabel}
        </button>
      </motion.div>
    </motion.div>
  );
}

function ExamMode() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const q = QUIZ[idx];

  function answer(picked) {
    if (feedback) return;
    const correct = picked === q.answer;
    setFeedback({ correct });
    if (correct) setScore((s) => s + 1);
    else {
      saveWrong({
        kind: 'exam',
        hand: q.situation,
        pos: `Q${q.id}`,
        answer: q.answer,
        explanation: q.explanation,
        question: q.question,
        situation: q.situation,
      });
    }
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <GraduationCap size={32} />
        </div>
        <h2 className="font-display text-2xl text-gold-soft">모의고사 완료</h2>
        <p className="mt-2 text-muted">
          {QUIZ.length}문제 중 <span className="text-2xl font-bold text-ink">{score}</span>개 ·{' '}
          <span className="text-gold">{pct}%</span>
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-casino-green px-5 py-3 font-semibold text-white"
        >
          <RotateCcw size={16} /> 다시 풀기
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-muted">
        <span>
          문제 {idx + 1} / {QUIZ.length}
        </span>
        <span className="text-gold">정답 {score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-felt-4">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-casino-green to-gold"
          animate={{ width: `${((idx + (feedback ? 1 : 0)) / QUIZ.length) * 100}%` }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-felt px-3 py-1.5 text-xs font-medium text-gold">
              <Spade size={12} /> 상황 {q.id}
            </div>
            <p className="mb-3 text-[15px] text-muted">{q.situation}</p>
            <h3 className="mb-6 font-display text-xl font-semibold text-ink sm:text-2xl">
              {q.question}
            </h3>
            <OxButtons disabled={!!feedback} onYes={() => answer(true)} onNo={() => answer(false)} />
          </Card>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {feedback && (
          <FeedbackModal
            correct={feedback.correct}
            answerLabel={q.answer ? 'O (올인/콜)' : 'X (폴드)'}
            explanation={q.explanation}
            onNext={next}
            nextLabel={idx + 1 >= QUIZ.length ? '결과 보기' : '다음 문제'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function nextDrill(filterPos) {
  const kind = Math.random() < 0.7 ? 'push' : 'call';
  const pos =
    kind === 'call'
      ? 'BB'
      : filterPos === 'ALL'
        ? randomPosition()
        : filterPos;
  const hand = randomHand();
  const answer = kind === 'push' ? shouldPush(hand, pos) : shouldCallShove(hand, 'BB');
  return { kind, pos, hand, answer };
}

function DrillMode() {
  const [filterPos, setFilterPos] = useState('ALL');
  const [q, setQ] = useState(() => nextDrill('ALL'));
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ ok: 0, n: 0 });
  const [feedback, setFeedback] = useState(null);

  function answer(picked) {
    if (feedback) return;
    const correct = picked === q.answer;
    setFeedback({ correct });
    setStats((s) => ({ ok: s.ok + (correct ? 1 : 0), n: s.n + 1 }));
    setStreak((s) => (correct ? s + 1 : 0));
    if (!correct) {
      saveWrong({
        kind: q.kind,
        hand: q.hand,
        pos: q.pos,
        answer: q.answer,
        explanation:
          q.kind === 'push'
            ? `${q.pos}에서 ${q.hand} 오픈 잼은 ${q.answer ? '맞음' : '폴드'}. 펍 15bb 표 기준.`
            : `BB에서 ${q.hand}로 콜은 ${q.answer ? '맞음' : '폴드'}. 남의 올인은 2~3배 타이트.`,
      });
    }
  }

  function next() {
    setQ(nextDrill(filterPos));
    setFeedback(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {['ALL', ...DRILL_POSITIONS].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setFilterPos(p);
                setQ(nextDrill(p));
                setFeedback(null);
              }}
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                filterPos === p ? 'bg-casino-green text-white' : 'border border-white/10 text-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          연승 <span className="text-gold">{streak}</span>
          {' · '}
          {stats.n ? Math.round((stats.ok / stats.n) * 100) : 0}% ({stats.ok}/{stats.n})
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${q.hand}-${q.pos}-${q.kind}-${stats.n}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
        >
          <Card>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-felt px-3 py-1.5 text-xs font-medium text-gold">
              {q.kind === 'push' ? '오픈 잼' : '올인 방어 콜'} · 15bb
            </div>
            <p className="mb-2 text-sm text-muted">
              {q.kind === 'push'
                ? `${q.pos}, 앞 모두 폴드. 핸드 ${q.hand}.`
                : `상대 15bb 올인. 나는 BB, 핸드 ${q.hand}.`}
            </p>
            <h3 className="mb-6 font-display text-2xl font-semibold text-ink">
              {q.hand}
              <span className="ml-2 text-base font-normal text-muted">
                {q.kind === 'push' ? '푸시?' : '콜?'}
              </span>
            </h3>
            <OxButtons
              disabled={!!feedback}
              onYes={() => answer(true)}
              onNo={() => answer(false)}
              yesLabel={q.kind === 'push' ? 'O · 푸시' : 'O · 콜'}
            />
          </Card>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <FeedbackModal
            correct={feedback.correct}
            answerLabel={q.answer ? (q.kind === 'push' ? 'PUSH' : 'CALL') : 'FOLD'}
            explanation={
              q.kind === 'push'
                ? `${q.pos} 15bb 오픈 잼 레인지 ${q.answer ? '안' : '밖'}. ${q.hand}`
                : `BB 콜 레인지(타이트) ${q.answer ? '안' : '밖'}. ${q.hand}`
            }
            onNext={next}
            nextLabel="다음"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewMode({ onChange }) {
  const [items, setItems] = useState(() => loadWrongs());
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState(null);

  if (!items.length) {
    return (
      <Card className="text-center text-sm text-muted">
        <BookMarked className="mx-auto mb-3 text-gold" size={28} />
        오답이 없습니다. 모의고사·드릴을 풀면 여기에 쌓입니다.
      </Card>
    );
  }

  const q = items[idx % items.length];

  function answer(picked) {
    if (feedback) return;
    const correct = picked === q.answer;
    setFeedback({ correct });
    if (correct) {
      removeWrong(q.hand, q.pos, q.kind);
      const next = loadWrongs();
      setItems(next);
      onChange?.();
    }
  }

  function next() {
    setFeedback(null);
    if (!loadWrongs().length) {
      setItems([]);
      return;
    }
    setItems(loadWrongs());
    setIdx((i) => i + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">오답 {items.length}개</p>
        <button
          type="button"
          onClick={() => {
            clearWrongs();
            setItems([]);
            onChange?.();
          }}
          className="inline-flex items-center gap-1 text-xs text-red-300"
        >
          <Trash2 size={12} /> 전체 삭제
        </button>
      </div>
      <Card>
        <p className="mb-2 text-xs text-gold">
          {q.kind === 'exam' ? '모의고사' : q.kind === 'push' ? '푸시 드릴' : '콜 드릴'} · {q.pos}
        </p>
        <p className="mb-3 text-sm text-muted">{q.situation || `${q.pos} · ${q.hand}`}</p>
        <h3 className="mb-6 font-display text-xl text-ink">
          {q.question || (q.kind === 'push' ? `${q.hand} 푸시?` : `${q.hand} 콜?`)}
        </h3>
        <OxButtons disabled={!!feedback} onYes={() => answer(true)} onNo={() => answer(false)} />
      </Card>
      <AnimatePresence>
        {feedback && (
          <FeedbackModal
            correct={feedback.correct}
            answerLabel={q.answer ? 'O' : 'X'}
            explanation={q.explanation || ''}
            onNext={next}
            nextLabel={feedback.correct ? '제거됨 · 다음' : '다음'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuizHub() {
  const [mode, setMode] = useState('exam');
  const [wrongCount, setWrongCount] = useState(() => loadWrongs().length);

  return (
    <div>
      <ModeTabs
        mode={mode}
        setMode={(m) => {
          setMode(m);
          setWrongCount(loadWrongs().length);
        }}
        wrongCount={wrongCount}
      />
      {mode === 'exam' && <ExamMode />}
      {mode === 'drill' && <DrillMode />}
      {mode === 'review' && <ReviewMode onChange={() => setWrongCount(loadWrongs().length)} />}
    </div>
  );
}
