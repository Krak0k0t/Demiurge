export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export const GRAPHICS_LEVEL: Record<GraphicsQuality, number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
};

export const GRAPHICS_ORDER: GraphicsQuality[] = ['ultra', 'high', 'medium', 'low'];

const STORAGE_KEY = 'duel_demiurges_graphics_quality';

function isValidQuality(v: string | null): v is GraphicsQuality {
  return v === 'low' || v === 'medium' || v === 'high' || v === 'ultra';
}

function readStoredQuality(): GraphicsQuality {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isValidQuality(saved)) return saved;
    }
  } catch {
    // Ignore storage access errors in sandboxed iframes
  }
  return 'ultra';
}

let currentQuality: GraphicsQuality = readStoredQuality();
let currentLevel: number = GRAPHICS_LEVEL[currentQuality];
const listeners = new Set<(q: GraphicsQuality, level: number) => void>();

function syncDomAttribute(q: GraphicsQuality): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.graphics = q;
  }
}

syncDomAttribute(currentQuality);

export function getGraphicsQuality(): GraphicsQuality {
  return currentQuality;
}

export function getGraphicsLevel(): number {
  return currentLevel;
}

export function setGraphicsQuality(quality: GraphicsQuality): void {
  currentQuality = quality;
  currentLevel = GRAPHICS_LEVEL[quality];
  syncDomAttribute(quality);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, quality);
    }
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((cb) => cb(currentQuality, currentLevel));
}

export function subscribeGraphicsQuality(
  listener: (q: GraphicsQuality, level: number) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const FAST_COMBAT_KEY = 'obsidian_arcanum_fast_combat';
let fastCombat = (() => {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(FAST_COMBAT_KEY) === '1';
  } catch {
    return false;
  }
})();
const fastListeners = new Set<(fast: boolean) => void>();

export function getFastCombat(): boolean {
  return fastCombat;
}

export function setFastCombat(next: boolean): void {
  fastCombat = next;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FAST_COMBAT_KEY, next ? '1' : '0');
    }
  } catch {
    // Ignore storage errors
  }
  fastListeners.forEach((cb) => cb(fastCombat));
}

export function subscribeFastCombat(listener: (fast: boolean) => void): () => void {
  fastListeners.add(listener);
  return () => {
    fastListeners.delete(listener);
  };
}

const HOVER_INSPECTOR_KEY = 'obsidian_arcanum_hover_inspector';
let hoverInspector = (() => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    const saved = window.localStorage.getItem(HOVER_INSPECTOR_KEY);
    return saved !== '0';
  } catch {
    return true;
  }
})();
const hoverListeners = new Set<(enabled: boolean) => void>();

export function getHoverInspector(): boolean {
  return hoverInspector;
}

export function setHoverInspector(enabled: boolean): void {
  if (hoverInspector === enabled) return;
  hoverInspector = enabled;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HOVER_INSPECTOR_KEY, enabled ? '1' : '0');
    }
  } catch {
    // Ignore storage errors
  }
  hoverListeners.forEach((cb) => cb(hoverInspector));
}

export function subscribeHoverInspector(listener: (enabled: boolean) => void): () => void {
  hoverListeners.add(listener);
  return () => {
    hoverListeners.delete(listener);
  };
}

export type DetailTier = 0 | 1 | 2 | 3;

export function getGraphicsDetailTier(level: number = currentLevel): DetailTier {
  if (level <= GRAPHICS_LEVEL.low) return 0;
  if (level === GRAPHICS_LEVEL.medium) return 1;
  if (level === GRAPHICS_LEVEL.high) return 2;
  return 3;
}


