import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_CATALOG } from './cards';
import { computeNetThreatDelta, evaluateCardPlayAffordance } from './tacticalPreview';

test('evaluateCardPlayAffordance detects affordability, cross-order synergy, and fuse readiness', () => {
  const card = CARD_CATALOG.chaos_hound;
  assert.ok(card);

  const res = evaluateCardPlayAffordance(
    card,
    card.cost,
    {
      playerSchool: 'kinet',
      playerEther: card.cost,
      altarMode: false,
      crossSchoolTriggeredThisTurn: false,
      playerBoard: [
        {
          uid: 'p1',
          cardId: 'kinet_wisp',
          school: 'kinet',
          side: 'player',
          lane: 0,
          atk: 2,
          hp: 2,
          maxHp: 2,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack',
        },
        null,
        null,
        null,
      ],
    },
    false
  );

  assert.equal(res.affordable, true);
  assert.equal(res.isCrossOrderSynergy, true);
  assert.equal(res.canFuse, true);
  assert.equal(res.edgeColor, '#C94E3C');
});

test('evaluateCardPlayAffordance disables cross-order sparkle after synergy triggered or during altar', () => {
  const card = CARD_CATALOG.vital_stag;
  assert.ok(card);

  const triggered = evaluateCardPlayAffordance(
    card,
    card.cost,
    {
      playerSchool: 'kinet',
      playerEther: 0,
      altarMode: true,
      crossSchoolTriggeredThisTurn: false,
      playerBoard: [null, null, null, null],
    },
    false
  );

  assert.equal(triggered.affordable, true);
  assert.equal(triggered.isCrossOrderSynergy, false);
  assert.equal(triggered.edgeColor, '#D95843');
});

test('computeNetThreatDelta flags lethal enemy counterattack danger accurately', () => {
  const safe = computeNetThreatDelta(6, 3, 12);
  assert.equal(safe.netDamageDelta, 3);
  assert.equal(safe.isDanger, false);

  const lethal = computeNetThreatDelta(2, 9, 8);
  assert.equal(lethal.netDamageDelta, -7);
  assert.equal(lethal.isDanger, true);
});
