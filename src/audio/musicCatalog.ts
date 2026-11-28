export type MusicTrackId =
  | 'demiurge'
  | 'demiurge2'
  | 'demiurge4'
  | 'demiurges'
  | 'divine_conflict';

export interface MusicTrackMeta {
  id: MusicTrackId;
  file: string;
  durationSec: number;
  durationLabel: string;
}

export const DEFAULT_MUSIC_VOLUME = 0.22;

export const MUSIC_TRACKS: readonly MusicTrackMeta[] = [
  {
    id: 'demiurge',
    file: 'Demiurge.ogg',
    durationSec: 176,
    durationLabel: '2:55',
  },
  {
    id: 'demiurge2',
    file: 'Demiurge2.ogg',
    durationSec: 105,
    durationLabel: '1:45',
  },
  {
    id: 'demiurge4',
    file: 'Demiurge4.ogg',
    durationSec: 189,
    durationLabel: '3:09',
  },
  {
    id: 'demiurges',
    file: 'Demiurges.ogg',
    durationSec: 196,
    durationLabel: '3:16',
  },
  {
    id: 'divine_conflict',
    file: 'Divine Conflict.ogg',
    durationSec: 177,
    durationLabel: '2:57',
  },
];

export function wrapTrackIndex(index: number, total = MUSIC_TRACKS.length): number {
  if (total <= 0) return 0;
  return ((Math.trunc(index) % total) + total) % total;
}

export function getNextCarouselIndex(currentIndex: number, step: 1 | -1, total = MUSIC_TRACKS.length): number {
  return wrapTrackIndex(currentIndex + step, total);
}

export function getTrackAudioUrl(file: string): string {
  return `./audio/${encodeURIComponent(file)}`;
}
