import { describe, expect, it } from 'vitest';
import {
  applyDraftReplacement,
  applySanctuaryPurge,
  calculateDuelXp,
  createDuelState,
  generateDraftChoices,
  getArchonRank,
  getCardEffectiveStats,
  playCardFromHand,
  resolvePlayerEndTurn,
  sacrificeCardAtAltar,
  toggleAltarMode,
  triggerOverload,
  triggerRightClickLeap,
  triggerUltimatum,
} from '../src/game/duelEngine';
import { AnimationQueue } from '../src/view/animationQueue';

describe('duelEngine vitest suite', () => {
  it('supports full duel loop: summon, leap pulse, overload, combat & draft', () => {
    let s = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth', seed: 1337 });
    expect(s.playerHp).toBe(25);
    expect(s.playerHand.length).toBe(4);

    s = triggerOverload(s);
    expect(s.playerHp).toBe(22);
    expect(s.overloadUsedThisTurn).toBe(true);

    const lowCostIdx = s.playerHand.findIndex((id) => id !== 'synth_golem');
    if (lowCostIdx >= 0) {
      s = playCardFromHand(s, lowCostIdx, 0);
    }

    s = triggerRightClickLeap(s, 0);
    expect(s.leapUsedThisTurn).toBe(true);

    s = toggleAltarMode(s);
    if (s.altarMode && s.playerHand.length > 0) {
      s = sacrificeCardAtAltar(s, 0);
      expect(s.altarMode).toBe(false);
    }

    const nextRound = resolvePlayerEndTurn(s);
    expect(nextRound.round).toBe(2);

    const choices = generateDraftChoices(nextRound.playerDeck, 99);
    expect(choices).toHaveLength(3);
    const updatedDeck = applyDraftReplacement(nextRound.playerDeck, choices[0], 0);
    expect(updatedDeck[0]).toBe(choices[0]);

    const lowHpState = { ...nextRound, playerHp: 10, ultimatumUsed: false };
    const afterUlt = triggerUltimatum(lowHpState);
    expect(afterUlt.ultimatumUsed).toBe(true);
    expect(afterUlt.playerEther).toBeGreaterThanOrEqual(nextRound.playerChannel * 2);
  });

  it('scales Forged cards, Archon Rank/XP, and enforces Sanctuary Purge floor', () => {
    const baseCreature = getCardEffectiveStats('synth_blade', {});
    const forged1Creature = getCardEffectiveStats('synth_blade', { synth_blade: 1 });
    const forged2Creature = getCardEffectiveStats('synth_blade', { synth_blade: 2 });
    expect(forged1Creature.atk).toBe(baseCreature.atk + 1);
    expect(forged1Creature.hp).toBe(baseCreature.hp + 1);
    expect(forged2Creature.atk).toBe(baseCreature.atk + 2);
    expect(forged2Creature.hp).toBe(baseCreature.hp + 2);

    const baseSpell = getCardEffectiveStats('synth_arcane_pulse', {});
    const forgedSpell = getCardEffectiveStats('synth_arcane_pulse', { synth_arcane_pulse: 1 });
    expect(forgedSpell.cost).toBe(Math.max(1, baseSpell.cost - 1));
    expect(forgedSpell.spellAmount).toBe(baseSpell.spellAmount + 2);

    expect(getArchonRank(0)).toBe(1);
    expect(getArchonRank(440)).toBe(3);

    const rankedState = createDuelState({
      stageIndex: 0,
      difficulty: 'archmage',
      playerSchool: 'kinet',
      archonRank: 3,
      seed: 101,
    });
    expect(rankedState.playerMaxHp).toBe(29);
    expect(rankedState.playerEther).toBe(3);
    expect(calculateDuelXp(rankedState)).toBeGreaterThan(100);

    const minDeck = Array.from({ length: 8 }, () => 'synth_blade');
    expect(applySanctuaryPurge(minDeck, 0)).toHaveLength(8);
    const tenDeck = Array.from({ length: 10 }, () => 'synth_blade');
    expect(applySanctuaryPurge(tenDeck, 0)).toHaveLength(9);
  });

  it('triggers distinct Turn-1 Order Doctrines across all four schools', () => {
    // 1. Kinet: first spell/ritual per turn refunds +1 Ether
    const kinet = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'kinet', seed: 42 });
    const kinetWithPulse = {
      ...kinet,
      playerEther: 3,
      playerHand: ['kinet_bolt', ...kinet.playerHand.slice(1)],
      enemyBoard: [
        {
          uid: 'e1',
          cardId: 'kinet_sylph',
          school: 'kinet' as const,
          side: 'enemy' as const,
          lane: 0,
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
        null,
      ],
    };
    const afterKinetSpell = playCardFromHand(kinetWithPulse, 0, 0);
    expect(afterKinetSpell.schoolDoctrineUsedThisTurn).toBe(true);
    expect(afterKinetSpell.playerEther).toBe(2); // spent 2 (kinet_bolt), refunded +1

    // 2. Vital: every creature summon heals Archon +1 HP
    const vital = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'vital', seed: 42 });
    const vitalInjured = {
      ...vital,
      playerHp: 18,
      playerEther: 4,
      playerHand: ['vital_sprout', 'vital_sprout', ...vital.playerHand.slice(2)],
    };
    const afterVitalSummon = playCardFromHand(vitalInjured, 0, 0);
    expect(afterVitalSummon.playerHp).toBe(19);
    const afterSecondVitalSummon = playCardFromHand(afterVitalSummon, 0, 1);
    expect(afterSecondVitalSummon.playerHp).toBe(20);

    // 3. Chaos: Overload burns enemy Archon -1 HP and buffs vanguard +1 ATK
    const chaos = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'chaos', seed: 42 });
    const chaosWithVanguard = {
      ...chaos,
      playerBoard: [
        {
          uid: 'p1',
          cardId: 'chaos_hound',
          school: 'chaos' as const,
          side: 'player' as const,
          lane: 0,
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
        null,
      ],
    };
    const afterChaosOverload = triggerOverload(chaosWithVanguard);
    expect(afterChaosOverload.enemyHp).toBe(chaosWithVanguard.enemyHp - 1);
    expect(afterChaosOverload.playerBoard[0]?.atk).toBe(3);

    // 4. Synth: ending turn with >=1 unspent Ether grants +1 Resonance & shields vanguard
    const synth = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth', seed: 42 });
    const synthWithAlly = {
      ...synth,
      playerEther: 2,
      playerResonance: 0,
      playerBoard: [
        {
          uid: 'p2',
          cardId: 'synth_blade',
          school: 'synth' as const,
          side: 'player' as const,
          lane: 0,
          atk: 2,
          hp: 5,
          maxHp: 5,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack' as const,
        },
        null,
        null,
        null,
      ],
    };
    const afterSynthTurn = resolvePlayerEndTurn(synthWithAlly);
    expect(afterSynthTurn.playerResonance).toBeGreaterThanOrEqual(1);
  });

  it('AnimationQueue executes steps sequentially with delays and supports clean cancellation', async () => {
    const queue = new AnimationQueue();
    const order: string[] = [];
    const busyStates: boolean[] = [];
    queue.onBusyChange((b) => busyStates.push(b));

    let completed = false;
    await queue.enqueue(
      [
        {
          label: 'attack1',
          durationMs: 25,
          run: () => order.push('attack1'),
        },
        {
          label: 'phaseGap',
          waitBeforeMs: 25,
          durationMs: 20,
          run: () => order.push('enemyCard'),
        },
      ],
      () => {
        completed = true;
      }
    );

    expect(order).toEqual(['attack1', 'enemyCard']);
    expect(busyStates).toEqual([true, false]);
    expect(completed).toBe(true);
    expect(queue.isBusy()).toBe(false);

    const cancelledOrder: string[] = [];
    const p = queue.enqueue([
      { label: 'first', durationMs: 40, run: () => cancelledOrder.push('first') },
      { label: 'second', durationMs: 40, run: () => cancelledOrder.push('second') },
    ]);
    await new Promise((r) => setTimeout(r, 10));
    queue.clear();
    await p;
    expect(cancelledOrder).toEqual(['first']);
    expect(queue.isBusy()).toBe(false);
  });
});

