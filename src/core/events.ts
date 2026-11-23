export interface GameEvent {
  type: string;
  at: number;
  detail?: string;
}

export interface StudioMetrics {
  completed: boolean;
  overloadActive: boolean;
  moves?: number;
  ether?: number;
  hp?: number;
  events?: GameEvent[];
  round?: number;
  playerHp?: number;
  enemyHp?: number;
  playerEther?: number;
  stage?: number;
}

declare global {
  interface Window {
    __metrics?: StudioMetrics;
    __GAME__?: {
      ready: boolean;
      toggleOverload?: () => void;
      reset?: () => void;
      setPreset?: (p: 'combat' | 'closeup' | 'wide') => void;
      getOrbitState?: () => { yaw: number; pitch: number; zoom: number };
    };
  }
}

export function publishMetrics(metrics: StudioMetrics): void {
  if (typeof window === 'undefined') return;
  window.__metrics = metrics;
}

export function publishGameHandle(handle: NonNullable<Window['__GAME__']>): void {
  if (typeof window === 'undefined') return;
  window.__GAME__ = handle;
}
