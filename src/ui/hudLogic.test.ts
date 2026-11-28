import test from 'node:test';
import assert from 'node:assert/strict';
import { createDuelState } from '../game/duelEngine';
import {
  ARCANE_PATTERNS,
  buildMinimapDots,
  clampUiScale,
  clampWorldPromptPos,
  computeArcStroke,
  computeComposureDrops,
  computeSilkPct,
  filterHoveredLaneRunes,
  pickRadialSector,
} from './hudLogic';

test('clampUiScale restricts HUD scale to 0.8..1.5 and defaults safely on NaN', () => {
  assert.equal(clampUiScale(1), 1);
  assert.equal(clampUiScale(0.4), 0.8);
  assert.equal(clampUiScale(2.1), 1.5);
  assert.equal(clampUiScale(Number.NaN), 1);
});

test('computeSilkPct and computeComposureDrops return bounded percentages and droplet counts', () => {
  assert.equal(computeSilkPct(80, 160), 50);
  assert.equal(computeSilkPct(240, 160), 100);
  assert.equal(computeSilkPct(-10, 160), 0);

  assert.equal(computeComposureDrops(25, 25), 3);
  assert.equal(computeComposureDrops(15, 25), 2);
  assert.equal(computeComposureDrops(5, 25), 1);
  assert.equal(computeComposureDrops(0, 25), 0);
});

test('pickRadialSector maps cardinal cursor directions to the 4 arcane patterns and honors deadzone', () => {
  assert.equal(ARCANE_PATTERNS.length, 4);
  assert.equal(pickRadialSector(4, 5), null);
  assert.equal(pickRadialSector(0, -64), 'triangle');
  assert.equal(pickRadialSector(64, 0), 'star');
  assert.equal(pickRadialSector(0, 64), 'circle');
  assert.equal(pickRadialSector(-64, 0), 'decoy');
});

test('clampWorldPromptPos keeps projected badges inside safe viewport margins', () => {
  assert.deepEqual(clampWorldPromptPos(-40, 2000, 1280, 720), { x: 88, y: 656 });
  assert.deepEqual(clampWorldPromptPos(640, 360, 1280, 720), { x: 640, y: 360 });
});

test('buildMinimapDots projects archons and active lane creatures onto radar coordinates', () => {
  const base = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth', seed: 99 });
  const withUnits = {
    ...base,
    playerBoard: [
      {
        uid: 'p1',
        cardId: 'synth_blade',
        school: 'synth' as const,
        side: 'player' as const,
        lane: 0,
        atk: 2,
        hp: 4,
        maxHp: 4,
        keywords: [],
        veteranCount: 0,
        shielded: true,
        summonSick: false,
        stance: 'attack' as const,
      },
      null,
      null,
      null,
    ],
    enemyBoard: [
      null,
      {
        uid: 'e2',
        cardId: 'kinet_sylph',
        school: 'kinet' as const,
        side: 'enemy' as const,
        lane: 1,
        atk: 2,
        hp: 2,
        maxHp: 2,
        keywords: [],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack' as const,
      },
      null,
      null,
    ],
  };

  const dots = buildMinimapDots(withUnits);
  assert.equal(dots.length, 4);
  assert.equal(dots.find((d) => d.id === 'p1')?.shielded, true);
  assert.equal(dots.find((d) => d.id === 'e2')?.yPct, 36);
});

test('computeArcStroke calculates bounded SVG arc dasharray and dashoffset', () => {
  const full = computeArcStroke(20, 20, 100, 0.75);
  assert.equal(full.pct, 1);
  assert.equal(full.dasharray, '75.00 100.00');
  assert.equal(full.dashoffset, 0);

  const half = computeArcStroke(10, 20, 100, 1);
  assert.equal(half.pct, 0.5);
  assert.equal(half.dashoffset, 50);

  const clamped = computeArcStroke(-5, 20, 100, 1);
  assert.equal(clamped.pct, 0);
  assert.equal(clamped.dashoffset, 100);
});

test('filterHoveredLaneRunes only emits runes on the hovered board lane', () => {
  const runes = [
    { side: 'player' as const, lane: 0, kind: 'aegis' },
    { side: 'enemy' as const, lane: 2, kind: 'fury' },
  ];
  assert.deepEqual(filterHoveredLaneRunes(runes, null), []);
  assert.deepEqual(filterHoveredLaneRunes(runes, { side: 'player', lane: 1 }), []);
  assert.deepEqual(filterHoveredLaneRunes(runes, { side: 'enemy', lane: 2 }), [
    { side: 'enemy', lane: 2, kind: 'fury' },
  ]);
});

