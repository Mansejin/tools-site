import { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileJson, Cpu } from 'lucide-react';
import {
  loadPack,
  savePack,
  clearPack,
  packSummary,
  makeRfiStarterPack,
  examplePackDoc,
} from './myPack.js';
import { solveBbVsBtnPack } from './cfr/bbVsBtn.js';

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function mergePack(prev, next) {
  return savePack({
    v: 1,
    name: next.name || prev?.name || '내 솔루션',
    note: next.note || prev?.note || '',
    spots: { ...(prev?.spots || {}), ...(next.spots || {}) },
  });
}

/** Import / export personal strategy pack for GTO drill + charts. */
export default function PackBar({ onChange }) {
  const inputRef = useRef(null);
  const [sum, setSum] = useState(() => packSummary());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState(0);

  function refresh(next) {
    setSum(packSummary(next));
    setErr('');
    onChange?.(next);
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data?.spots || typeof data.spots !== 'object') throw new Error('spots 객체 필요');
        refresh(savePack(data));
      } catch (ex) {
        setErr(ex.message || 'JSON 파싱 실패');
      }
    };
    reader.readAsText(file);
  }

  async function runCfr() {
    if (busy) return;
    setBusy(true);
    setProg(0);
    setErr('');
    try {
      const solved = await solveBbVsBtnPack(80000, setProg);
      refresh(mergePack(loadPack(), solved));
    } catch (ex) {
      setErr(ex.message || '솔브 실패');
    } finally {
      setBusy(false);
      setProg(0);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-felt-3/80 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">내 솔루션 팩</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            JSON 가져오기 · 또는 미니 CFR로 BB vs 오픈 스팟을 직접 솔브 (근사 EV).
          </p>
        </div>
        <FileJson size={18} className="shrink-0 text-muted" />
      </div>

      {sum ? (
        <p className="mb-3 rounded-lg border border-casino-green/25 bg-casino-green/10 px-2.5 py-1.5 text-xs text-emerald-100">
          활성: {sum.name} · 스팟 {sum.nSpots} · 핸드 {sum.nHands}
        </p>
      ) : (
        <p className="mb-3 rounded-lg border border-white/8 bg-felt px-2.5 py-1.5 text-xs text-muted">
          팩 없음 → 내장 Nash/RFI 사용 중
        </p>
      )}

      {busy && (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[10px] text-muted">
            <span>CFR 돌리는 중…</span>
            <span>{Math.round(prog * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div className="h-full bg-casino-green-bright transition-all" style={{ width: `${prog * 100}%` }} />
          </div>
        </div>
      )}

      {err && <p className="mb-2 text-xs text-rose-300">{err}</p>}

      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={runCfr}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#aafbb2] px-3 text-xs font-bold text-black disabled:opacity-50"
        >
          <Cpu size={14} />
          미니 CFR 솔브
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-casino-green px-3 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Upload size={14} />
          JSON 가져오기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => refresh(savePack(makeRfiStarterPack()))}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs text-ink disabled:opacity-50"
        >
          공개 RFI 깔기
        </button>
        <button
          type="button"
          onClick={() => downloadJson(examplePackDoc(), 'gto-pack-example.json')}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs text-muted"
        >
          <Download size={14} />
          예시 받기
        </button>
        {sum && (
          <>
            <button
              type="button"
              onClick={() => downloadJson(loadPack(), `${sum.name || 'my-pack'}.json`)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs text-muted"
            >
              내보내기
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                clearPack();
                refresh(null);
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 text-xs text-rose-300 disabled:opacity-50"
            >
              <Trash2 size={14} />
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  );
}
