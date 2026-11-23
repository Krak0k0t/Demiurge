export interface Rng {
  next: () => number;
  range: (min: number, max: number) => number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
  };
}

export interface LaunchParams {
  seed: number;
  scene: string;
  capture: boolean;
  autostart: boolean;
}

export function readLaunchParams(search: string): LaunchParams {
  const params = new URLSearchParams(search);
  const rawSeed = Number(params.get('seed'));
  const seed = Number.isFinite(rawSeed) && rawSeed > 0 ? Math.floor(rawSeed) : 1337;
  return {
    seed,
    scene: params.get('scene') ?? 'duel',
    capture: params.get('capture') === '1',
    autostart: params.get('autostart') === '1',
  };
}
