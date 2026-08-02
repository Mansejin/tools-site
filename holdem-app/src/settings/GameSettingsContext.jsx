import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  analyze,
  applyPreset,
  loadSettings,
  normalize,
  saveSettings,
  turboNarrative,
  mttNarrative,
  huNarrative,
  structureSummary,
} from './gameSettings.js';

const Ctx = createContext(null);

export function GameSettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => loadSettings());

  const patchSettings = useCallback((patch) => {
    setSettingsState((prev) => {
      const next = normalize({ ...prev, ...patch, preset: 'custom' });
      saveSettings(next);
      return next;
    });
  }, []);

  const apply = useCallback((presetId) => {
    const s = applyPreset(presetId);
    saveSettings(s);
    setSettingsState(s);
  }, []);

  const reset = useCallback(() => apply('turbo'), [apply]);

  const value = useMemo(() => {
    const analysis = analyze(settings);
    return {
      settings,
      analysis,
      patchSettings,
      applyPreset: apply,
      reset,
      turbo: turboNarrative(settings),
      mtt: mttNarrative(settings),
      hu: huNarrative(settings),
      summary: structureSummary(analysis),
    };
  }, [settings, patchSettings, apply, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGameSettings() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGameSettings outside provider');
  return v;
}
