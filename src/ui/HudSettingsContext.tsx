import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { clampUiScale, type ArcanePatternId } from './hudLogic';

const UI_SCALE_KEY = 'obsidian_arcanum_ui_scale_v1';
const HIGH_CONTRAST_KEY = 'obsidian_arcanum_high_contrast_v1';

export interface PatternBridgeTarget {
  setPattern: (pattern: ArcanePatternId) => void;
  triggerPattern: (pattern?: ArcanePatternId) => void;
}

export interface HudSettingsContextValue {
  uiScale: number;
  setUiScale: (scale: number) => void;
  isHighContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  toggleHighContrast: () => void;
  selectedPattern: ArcanePatternId;
  selectPattern: (pattern: ArcanePatternId) => void;
  bindEngineBridge: (bridge: PatternBridgeTarget | null) => void;
}

const HudSettingsContext = createContext<HudSettingsContextValue | null>(null);

function readInitialScale(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(UI_SCALE_KEY);
    return raw ? clampUiScale(Number(raw)) : 1;
  } catch {
    return 1;
  }
}

function readInitialHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(HIGH_CONTRAST_KEY) === '1';
  } catch {
    return false;
  }
}

export function HudSettingsProvider({ children }: { children: ReactNode }) {
  const [uiScale, setUiScaleState] = useState<number>(readInitialScale);
  const [isHighContrast, setHighContrastState] = useState<boolean>(readInitialHighContrast);
  const [selectedPattern, setSelectedPatternState] = useState<ArcanePatternId>('triangle');
  const engineBridgeRef = useRef<PatternBridgeTarget | null>(null);

  const setUiScale = useCallback((next: number) => {
    const clamped = clampUiScale(next);
    setUiScaleState(clamped);
    try {
      window.localStorage.setItem(UI_SCALE_KEY, String(clamped));
    } catch {
      // ignore storage failure
    }
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    try {
      window.localStorage.setItem(HIGH_CONTRAST_KEY, enabled ? '1' : '0');
    } catch {
      // ignore storage failure
    }
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrastState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(HIGH_CONTRAST_KEY, next ? '1' : '0');
      } catch {
        // ignore storage failure
      }
      return next;
    });
  }, []);

  const selectPattern = useCallback((pattern: ArcanePatternId) => {
    setSelectedPatternState(pattern);
    engineBridgeRef.current?.setPattern(pattern);
  }, []);

  const bindEngineBridge = useCallback((bridge: PatternBridgeTarget | null) => {
    engineBridgeRef.current = bridge;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('high-contrast', isHighContrast);
    return () => {
      document.body.classList.remove('high-contrast');
    };
  }, [isHighContrast]);

  return (
    <HudSettingsContext.Provider
      value={{
        uiScale,
        setUiScale,
        isHighContrast,
        setHighContrast,
        toggleHighContrast,
        selectedPattern,
        selectPattern,
        bindEngineBridge,
      }}
    >
      {children}
    </HudSettingsContext.Provider>
  );
}

export function useHudSettings(): HudSettingsContextValue {
  const ctx = useContext(HudSettingsContext);
  if (!ctx) {
    throw new Error('useHudSettings must be used inside HudSettingsProvider');
  }
  return ctx;
}
