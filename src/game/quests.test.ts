import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeQuestXpBonus,
  createInitialQuestCounters,
  evaluateQuestProgress,
  generateDuelQuest,
  type DuelQuestState,
} from './quests';

test('generateDuelQuest deterministically produces valid quest state for every school', () => {
  const schools = ['kinet', 'vital', 'chaos', 'synth'] as const;
  for (let i = 0; i < schools.length; i++) {
    const q1 = generateDuelQuest(i, schools[i], 4242);
    const q2 = generateDuelQuest(i, schools[i], 4242);
    assert.deepEqual(q1, q2);
    assert.ok(q1.target >= 1);
    assert.ok(q1.bonusXp >= 50);
    assert.equal(q1.completed, false);
    assert.equal(q1.progress, 0);
  }
});

test('evaluateQuestProgress handles counter-based contracts and clamps to target', () => {
  const counters = { ...createInitialQuestCounters(), summoned: 2, spells: 3, shields: 2, resonanceUsed: 1 };

  const summonQuest: DuelQuestState = {
    id: 'summon_swarm',
    target: 3,
    progress: 0,
    bonusXp: 55,
    completed: false,
  };
  const mid = evaluateQuestProgress(summonQuest, counters, { phase: 'player_main', round: 2, overloadCount: 0 })!;
  assert.equal(mid.progress, 2);
  assert.equal(mid.completed, false);

  const done = evaluateQuestProgress(
    mid,
    { ...counters, summoned: 5 },
    { phase: 'player_main', round: 3, overloadCount: 0 }
  )!;
  assert.equal(done.progress, 3);
  assert.equal(done.completed, true);
  assert.equal(computeQuestXpBonus(done), 55);

  const spellQuest: DuelQuestState = { id: 'spell_weaver', target: 2, progress: 0, bonusXp: 55, completed: false };
  assert.equal(
    evaluateQuestProgress(spellQuest, counters, { phase: 'player_main', round: 2, overloadCount: 0 })!.completed,
    true
  );

  const shieldQuest: DuelQuestState = { id: 'aegis_bulwark', target: 2, progress: 0, bonusXp: 60, completed: false };
  assert.equal(
    evaluateQuestProgress(shieldQuest, counters, { phase: 'player_main', round: 2, overloadCount: 0 })!.completed,
    true
  );

  const resQuest: DuelQuestState = { id: 'resonance_burst', target: 1, progress: 0, bonusXp: 65, completed: false };
  assert.equal(
    evaluateQuestProgress(resQuest, counters, { phase: 'player_main', round: 2, overloadCount: 0 })!.completed,
    true
  );
});

test('evaluateQuestProgress handles victory-condition contracts pure_channel and swift_verdict', () => {
  const counters = createInitialQuestCounters();
  const pureQuest: DuelQuestState = { id: 'pure_channel', target: 1, progress: 0, bonusXp: 70, completed: false };
  assert.equal(
    evaluateQuestProgress(pureQuest, counters, { phase: 'player_main', round: 3, overloadCount: 0 })!.completed,
    false
  );
  assert.equal(
    evaluateQuestProgress(pureQuest, counters, { phase: 'victory', round: 4, overloadCount: 1 })!.completed,
    false
  );
  const pureDone = evaluateQuestProgress(pureQuest, counters, { phase: 'victory', round: 4, overloadCount: 0 })!;
  assert.equal(pureDone.completed, true);
  assert.equal(computeQuestXpBonus(pureDone), 70);

  const swiftQuest: DuelQuestState = { id: 'swift_verdict', target: 1, progress: 0, bonusXp: 75, completed: false };
  assert.equal(
    evaluateQuestProgress(swiftQuest, counters, { phase: 'victory', round: 7, overloadCount: 0 })!.completed,
    false
  );
  assert.equal(
    evaluateQuestProgress(swiftQuest, counters, { phase: 'victory', round: 6, overloadCount: 1 })!.completed,
    true
  );
});
