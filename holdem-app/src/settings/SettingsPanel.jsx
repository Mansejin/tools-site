import { Settings2 } from 'lucide-react';
import { useGameSettings } from './GameSettingsContext.jsx';
import { PRESETS } from './gameSettings.js';

const inputCls =
  'w-full min-h-12 rounded-xl border border-white/10 bg-felt px-3 py-3 text-ink outline-none focus:border-gold/40';

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Compact bar — clickable when onClick provided */
export default function SettingsPanel({ compact = false, onOpen }) {
  const { settings, analysis, patchSettings, applyPreset, summary, turbo } = useGameSettings();

  if (compact) {
    const body = (
      <div className="flex items-start gap-2">
        <Settings2 size={16} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1 text-left">
          <p className="font-medium text-gold">오늘 구조{onOpen ? ' · 탭해서 수정' : ''}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{summary}</p>
          <p className="mt-1 text-xs text-ink/90">{turbo.summary}</p>
        </div>
      </div>
    );
    if (onOpen) {
      return (
        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-xl border border-gold/20 bg-gold/10 px-3 py-2.5 text-sm active:bg-gold/15"
        >
          {body}
        </button>
      );
    }
    return (
      <div className="rounded-xl border border-gold/20 bg-gold/10 px-3 py-2.5 text-sm">{body}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-muted">한국 홀덤펍에서 흔한 구조 프리셋. 바꾸면 해설·타이머·ROI가 맞춰진다.</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(PRESETS).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                settings.preset === p.id
                  ? 'bg-gold text-felt'
                  : 'border border-white/12 text-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
          <span
            className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs ${
              settings.preset === 'custom' ? 'bg-casino-green/20 text-casino-green-bright' : 'text-muted/50'
            }`}
          >
            {settings.preset === 'custom' ? '커스텀' : ''}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-3 text-sm text-amber-100">
        <p className="font-medium text-gold">이 설정 기준</p>
        <p className="mt-1">{turbo.summary}</p>
        <p className="mt-1 text-xs text-muted">
          시작 {analysis.startBb}bb · 숏스택({analysis.pushFoldBb}bb)까지 약 {analysis.minutesToShort}분
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="시작 칩">
          <input
            type="number"
            className={inputCls}
            value={settings.startChips}
            onChange={(e) => patchSettings({ startChips: +e.target.value })}
          />
        </Field>
        <Field label="시작 BB">
          <input
            type="number"
            className={inputCls}
            value={settings.startBB}
            onChange={(e) => patchSettings({ startBB: +e.target.value })}
          />
        </Field>
        <Field label="레벨 (분)">
          <input
            type="number"
            className={inputCls}
            value={settings.levelMin}
            onChange={(e) => patchSettings({ levelMin: +e.target.value })}
          />
        </Field>
        <Field label="푸시/폴드 기준 (bb)">
          <input
            type="number"
            className={inputCls}
            value={settings.pushFoldBb}
            onChange={(e) => patchSettings({ pushFoldBb: +e.target.value })}
          />
        </Field>
        <Field label="인원">
          <input
            type="number"
            min={2}
            max={10}
            className={inputCls}
            value={settings.seats}
            onChange={(e) => patchSettings({ seats: +e.target.value })}
          />
        </Field>
        <Field label="앤티">
          <button
            type="button"
            onClick={() => patchSettings({ ante: !settings.ante })}
            className={`min-h-12 w-full rounded-xl border text-sm font-medium ${
              settings.ante
                ? 'border-casino-green/50 bg-casino-green/20 text-casino-green-bright'
                : 'border-white/10 bg-felt text-muted'
            }`}
          >
            {settings.ante ? '있음' : '없음'}
          </button>
        </Field>
        <Field label="바이인 (원)">
          <input
            type="number"
            className={inputCls}
            value={settings.buyin}
            onChange={(e) => patchSettings({ buyin: +e.target.value })}
          />
        </Field>
        <Field label="리바인 1회 (원)">
          <input
            type="number"
            className={inputCls}
            value={settings.rebuy}
            onChange={(e) => patchSettings({ rebuy: +e.target.value })}
          />
        </Field>
        <Field label="리바 칩">
          <input
            type="number"
            className={inputCls}
            value={settings.rebuyChips}
            onChange={(e) => patchSettings({ rebuyChips: +e.target.value })}
          />
        </Field>
        <Field label="최대 리바 횟수">
          <input
            type="number"
            min={0}
            max={5}
            className={inputCls}
            value={settings.maxRebuys}
            onChange={(e) => patchSettings({ maxRebuys: +e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
