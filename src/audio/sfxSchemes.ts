export type SfxSchemeId = 'cathedral' | 'forge' | 'astral' | 'cataclysm';

export interface SfxSchemeDef {
  id: SfxSchemeId;
  pitchScale: number;
  decayScale: number;
  wavePrimary: OscillatorType;
  waveAccent: OscillatorType;
  harmonicInterval: number;
  noiseQScale: number;
  filterShift: number;
  subImpactBoost: number;
}

export const SFX_SCHEMES: ReadonlyArray<SfxSchemeDef> = [
  {
    id: 'cathedral',
    pitchScale: 1.0,
    decayScale: 1.0,
    wavePrimary: 'triangle',
    waveAccent: 'sine',
    harmonicInterval: 1.5,
    noiseQScale: 1.0,
    filterShift: 1.0,
    subImpactBoost: 1.0,
  },
  {
    id: 'forge',
    pitchScale: 0.88,
    decayScale: 0.92,
    wavePrimary: 'sawtooth',
    waveAccent: 'square',
    harmonicInterval: 1.333,
    noiseQScale: 1.35,
    filterShift: 0.86,
    subImpactBoost: 1.15,
  },
  {
    id: 'astral',
    pitchScale: 1.24,
    decayScale: 1.24,
    wavePrimary: 'sine',
    waveAccent: 'triangle',
    harmonicInterval: 1.618,
    noiseQScale: 1.45,
    filterShift: 1.32,
    subImpactBoost: 0.85,
  },
  {
    id: 'cataclysm',
    pitchScale: 0.74,
    decayScale: 1.18,
    wavePrimary: 'sawtooth',
    waveAccent: 'triangle',
    harmonicInterval: 1.414,
    noiseQScale: 0.85,
    filterShift: 0.72,
    subImpactBoost: 1.35,
  },
] as const;

export const DEFAULT_SFX_SCHEME: SfxSchemeId = 'cathedral';

export function isValidSfxSchemeId(value: string | null | undefined): value is SfxSchemeId {
  return value === 'cathedral' || value === 'forge' || value === 'astral' || value === 'cataclysm';
}

export function getSfxSchemeDef(id: SfxSchemeId): SfxSchemeDef {
  return SFX_SCHEMES.find((s) => s.id === id) ?? SFX_SCHEMES[0];
}
