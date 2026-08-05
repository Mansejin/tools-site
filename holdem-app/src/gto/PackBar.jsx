import { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileJson } from 'lucide-react';
import {
  loadPack,
  savePack,
  clearPack,
  packSummary,
  makeRfiStarterPack,
  examplePackDoc,
} from './myPack.js';

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Import / export personal strategy pack for GTO drill + charts. */
export default function PackBar({ onChange }) {
  const inputRef = useRef(null);
  const [sum, setSum] = useState(() => packSummary());
  const [err, setErr] = useState('');

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

  return (
    <div className="rounded-2xl border border-white/10 bg-felt-3/80 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">내 솔루션 팩</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Pio / GTO+ / WASM Postflop 결과를 JSON으로 넣으면 연습·차트가 그걸 우선합니다.
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

      {err && <p className="mb-2 text-xs text-rose-300">{err}</p>}

      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-casino-green px-3 text-xs font-semibold text-white"
        >
          <Upload size={14} />
          JSON 가져오기
        </button>
        <button
          type="button"
          onClick={() => {
            refresh(savePack(makeRfiStarterPack()));
          }}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs text-ink"
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
              onClick={() => {
                clearPack();
                refresh(null);
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 text-xs text-rose-300"
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
