import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATHEDRAL_OATHS,
  evaluateCathedralOaths,
  getCodexMasterySummary,
} from './campaignOaths';
import {
  createDefaultCodex,
  loadCodexSave,
  recordContractCompleted,
  recordForgeCompleted,
  recordOrderVictory,
  recordStageCleared,
  recordTrialRun,
} from './cathedralMeta';

test('default codex starts with zero progress on all 5 Cathedral Oaths at rank 1', () => {
  const codex = createDefaultCodex();
  const oaths = evaluateCathedralOaths(codex);
  assert.equal(oaths.length, CATHEDRAL_OATHS.length);
  assert.ok(oaths.every((o) => o.current === 0 && !o.completed && o.progressRatio === 0));

  const mastery = getCodexMasterySummary(codex);
  assert.equal(mastery.completedCount, 0);
  assert.equal(mastery.totalCount, 5);
  assert.equal(mastery.rank, 1);
});

test('oaths progress clamps cleanly at target and advances mastery rank', () => {
  let codex = createDefaultCodex();
  codex = recordContractCompleted(codex);
  codex = recordContractCompleted(codex);
  codex = recordContractCompleted(codex);
  codex = recordContractCompleted(codex); // overshoot clamps cleanly at 3/3

  codex = recordForgeCompleted(codex);
  codex = recordForgeCompleted(codex);
  codex = recordForgeCompleted(codex);

  codex = recordOrderVictory(codex, 'kinet');
  codex = recordOrderVictory(codex, 'kinet'); // duplicate order does not double-count distinct orders
  let oaths = evaluateCathedralOaths(codex);
  const distinctOrderOath = oaths.find((o) => o.id === 'oath_orders');
  assert.equal(distinctOrderOath?.current, 1);
  assert.equal(distinctOrderOath?.completed, false);

  codex = recordOrderVictory(codex, 'synth');
  for (let i = 0; i < 7; i++) {
    codex = recordStageCleared(codex);
  }
  codex = recordTrialRun(codex, { dateKey: '2026-11-24', stageReached: 7, score: 65, completed: true });

  oaths = evaluateCathedralOaths(codex);
  assert.ok(oaths.every((o) => o.completed && o.current === o.target && o.progressRatio === 1));

  const mastery = getCodexMasterySummary(codex);
  assert.equal(mastery.completedCount, 5);
  assert.equal(mastery.rank, 4);
});

test('loadCodexSave safely backfills missing oath counters from legacy saves', () => {
  const legacyJson = JSON.stringify({
    discoveredCards: ['kinet_sylph'],
    discoveredRelics: [],
    orderWins: { kinet: 2, vital: 0, chaos: 0, synth: 0 },
    bestTrialDate: null,
    bestTrialStage: 0,
    bestTrialScore: 0,
    trialsCompleted: 0,
  });
  const mockStorage = {
    getItem: () => legacyJson,
    setItem: () => {},
  } as unknown as Storage;

  const loaded = loadCodexSave(mockStorage);
  assert.equal(loaded.contractsCompleted, 0);
  assert.equal(loaded.forgesCompleted, 0);
  assert.equal(loaded.stagesClearedCount, 0);
  assert.equal(loaded.orderWins.kinet, 2);
});
