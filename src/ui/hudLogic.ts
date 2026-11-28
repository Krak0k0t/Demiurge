import type { DuelState } from '../game/duelEngine';

export type ArcanePatternId = 'triangle' | 'star' | 'circle' | 'decoy';

export const ARCANE_PATTERNS: readonly ArcanePatternId[] = [
  'triangle',
  'star',
  'circle',
  'decoy',
] as const;

export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 1.5;

export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(value * 100) / 100));
}

export function computeSilkPct(silk: number, maxSilk = 160): number {
  if (!Number.isFinite(silk) || !Number.isFinite(maxSilk) || maxSilk <= 0) return 0;
  return Math.max(0, Math.min(100, (silk / maxSilk) * 100));
}

/**
 * Converts Archon HP/MaxHP into 0..3 Composure droplet charges.
 */
export function computeComposureDrops(hp: number, maxHp: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(hp) || !Number.isFinite(maxHp) || maxHp <= 0 || hp <= 0) return 0;
  const ratio = hp / maxHp;
  if (ratio > 0.66) return 3;
  if (ratio > 0.33) return 2;
  return 1;
}

/**
 * Maps a cursor offset (dx, dy) from the radial wheel center into one of the 4 sectors:
 * - top    (-135° .. -45°): 'triangle'
 * - right  ( -45° .. +45°): 'star'
 * - bottom ( +45° .. +135°): 'circle'
 * - left   (>=135° or <-135°): 'decoy'
 */
export function pickRadialSector(
  dx: number,
  dy: number,
  deadzonePx = 18
): ArcanePatternId | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.hypot(dx, dy) < deadzonePx) return null;
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg >= -135 && deg < -45) return 'triangle';
  if (deg >= -45 && deg < 45) return 'star';
  if (deg >= 45 && deg < 135) return 'circle';
  return 'decoy';
}

export function clampWorldPromptPos(
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
  marginX = 88,
  marginY = 64
): { x: number; y: number } {
  const maxW = Math.max(marginX + 10, viewportW - marginX);
  const maxH = Math.max(marginY + 10, viewportH - marginY);
  return {
    x: Math.round(Math.max(marginX, Math.min(maxW, x))),
    y: Math.round(Math.max(marginY, Math.min(maxH, y))),
  };
}

export interface MinimapDot {
  id: string;
  kind: 'player_archon' | 'enemy_archon' | 'player_unit' | 'enemy_unit';
  xPct: number;
  yPct: number;
  shielded?: boolean;
}

const LANE_X_PCT = [23, 41, 59, 77];

export function buildMinimapDots(state: DuelState): MinimapDot[] {
  const dots: MinimapDot[] = [
    { id: 'enemy-archon', kind: 'enemy_archon', xPct: 50, yPct: 16 },
    { id: 'player-archon', kind: 'player_archon', xPct: 50, yPct: 84 },
  ];

  state.enemyBoard.forEach((unit, lane) => {
    if (!unit) return;
    dots.push({
      id: unit.uid,
      kind: 'enemy_unit',
      xPct: LANE_X_PCT[lane] ?? 50,
      yPct: 36,
      shielded: unit.shielded,
    });
  });

  state.playerBoard.forEach((unit, lane) => {
    if (!unit) return;
    dots.push({
      id: unit.uid,
      kind: 'player_unit',
      xPct: LANE_X_PCT[lane] ?? 50,
      yPct: 64,
      shielded: unit.shielded,
    });
  });

  return dots;
}

export interface ArcStrokeResult {
  pct: number;
  dasharray: string;
  dashoffset: number;
}

/**
 * Computes SVG stroke-dasharray / stroke-dashoffset values for circular/arc HP & Ether gauges.
 */
export function computeArcStroke(
  value: number,
  max: number,
  circumference: number,
  arcFraction = 1
): ArcStrokeResult {
  if (!Number.isFinite(circumference) || circumference <= 0) {
    return { pct: 0, dasharray: '0 0', dashoffset: 0 };
  }
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeVal = Number.isFinite(value) ? Math.max(0, Math.min(safeMax, value)) : 0;
  const pct = safeVal / safeMax;
  const span = circumference * Math.max(0.05, Math.min(1, arcFraction));
  const filled = span * pct;
  return {
    pct,
    dasharray: `${span.toFixed(2)} ${circumference.toFixed(2)}`,
    dashoffset: Number((span - filled).toFixed(2)),
  };
}

export interface LaneRuneTarget {
  side: 'player' | 'enemy';
  lane: number;
}

/**
 * Returns only the lane rune matching the currently hovered board lane (hover-only tooltip).
 */
export function filterHoveredLaneRunes<T extends LaneRuneTarget>(
  runes: readonly T[],
  hoveredLane: LaneRuneTarget | null
): T[] {
  if (!hoveredLane) return [];
  return runes.filter((r) => r.side === hoveredLane.side && r.lane === hoveredLane.lane);
}

