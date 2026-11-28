import { describe, expect, it } from 'vitest';
import {
  applyDraftReplacement,
  applySanctuaryPurge,
  calculateDuelXp,
  computeBoardCombatPreview,
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
  type DuelState,
} from '../src/game/duelEngine';
import {
  DEFAULT_MUSIC_VOLUME,
  getNextCarouselIndex,
  getTrackAudioUrl,
  MUSIC_TRACKS,
  wrapTrackIndex,
} from '../src/audio/musicCatalog';
import { etherAudio } from '../src/audio/etherAudio';
import {
  DEFAULT_SFX_SCHEME,
  getSfxSchemeDef,
  isValidSfxSchemeId,
  SFX_SCHEMES,
} from '../src/audio/sfxSchemes';
import {
  applyCrossroadsChoice,
  createDefaultCodex,
  getCrossroadsOptions,
  getDailyTrialConfig,
  loadCodexSave,
  pickRivalCombatQuipKey,
  recordCardsDiscovered,
  recordContractCompleted,
  recordForgeCompleted,
  recordOrderVictory,
  recordRelicsDiscovered,
  recordStageCleared,
  recordTrialRun,
} from '../src/game/cathedralMeta';
import { evaluateCathedralOaths, getCodexMasterySummary } from '../src/game/campaignOaths';
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

  it('computes board strike preview with Flying, Guard intercept, Poison & Lethal detection', () => {
    const base = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'kinet', seed: 77 });
    const staged: typeof base = {
      ...base,
      enemyHp: 6,
      playerBoard: [
        {
          uid: 'p_fly',
          cardId: 'kinet_vortex',
          school: 'kinet',
          side: 'player',
          lane: 0,
          atk: 5,
          hp: 4,
          maxHp: 4,
          keywords: ['flying'],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack',
        },
        {
          uid: 'p_poison',
          cardId: 'vital_venom',
          school: 'vital',
          side: 'player',
          lane: 1,
          atk: 2,
          hp: 3,
          maxHp: 3,
          keywords: ['poison'],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack',
        },
        null,
        null,
      ],
      enemyBoard: [
        {
          uid: 'e_ground',
          cardId: 'synth_blade',
          school: 'synth',
          side: 'enemy',
          lane: 0,
          atk: 3,
          hp: 2,
          maxHp: 2,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack',
        },
        null,
        {
          uid: 'e_guard',
          cardId: 'synth_construct',
          school: 'synth',
          side: 'enemy',
          lane: 2,
          atk: 2,
          hp: 5,
          maxHp: 5,
          keywords: ['armor'],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'guard',
        },
        null,
      ],
    };

    // Lane 0: Flying kinet_vortex (5 + 1 passive = 6) flies over ground enemy -> 6 direct -> LETHAL!
    // Lane 1: Poison vital_venom (2 atk) intercepted by Guard synth_construct (armor 1 + guard 1 = 2 armor -> 0 dmg, poison doesn't pierce armor)
    const preview = computeBoardCombatPreview(staged);
    expect(preview.directToEnemyArchon).toBe(6);
    expect(preview.readyAttackers).toBe(2);
    expect(preview.enemyUnitsSlain).toBe(0);
    expect(preview.isLethal).toBe(true);

    // Without guard on lane 2, lane 1 poison strikes open enemy or if lane 1 enemy has no armor it gets slain
    const stagedPoisonKill = {
      ...staged,
      enemyBoard: [
        null,
        {
          uid: 'e_target',
          cardId: 'vital_stag',
          school: 'vital' as const,
          side: 'enemy' as const,
          lane: 1,
          atk: 3,
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
      ],
    };
    const killPreview = computeBoardCombatPreview(stagedPoisonKill);
    expect(killPreview.enemyUnitsSlain).toBe(1);
    expect(killPreview.creatureClashDmg).toBe(2);
  });

  it('AI casts AoE enemy spells (chaos_flare) against populated player boards', () => {
    const bossBase = createDuelState({ stageIndex: 3, difficulty: 'archmage', playerSchool: 'synth', seed: 11 });
    const withPlayerUnits = {
      ...bossBase,
      anomaly: 'bastion' as const,
      enemyChannel: 5,
      enemyHand: ['chaos_flare', 'chaos_flare', 'chaos_flare', 'chaos_flare'],
      playerBoard: [
        {
          uid: 'p1',
          cardId: 'synth_blade',
          school: 'synth' as const,
          side: 'player' as const,
          lane: 0,
          atk: 1,
          hp: 2,
          maxHp: 2,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'guard' as const,
        },
        {
          uid: 'p2',
          cardId: 'synth_construct',
          school: 'synth' as const,
          side: 'player' as const,
          lane: 1,
          atk: 1,
          hp: 5,
          maxHp: 5,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'guard' as const,
        },
        null,
        null,
      ],
    };
    const afterAi = resolvePlayerEndTurn(withPlayerUnits);
    expect(afterAi.lastAiSummary?.spells).toBeGreaterThanOrEqual(1);
    expect(afterAi.playerBoard[0]).toBeNull();
    expect((afterAi.playerBoard[1]?.hp ?? 0)).toBeLessThanOrEqual(2);
  });

  it('musicCatalog exposes 5 tracks, subdued default volume, and circular carousel indexing', () => {
    expect(MUSIC_TRACKS).toHaveLength(5);
    expect(DEFAULT_MUSIC_VOLUME).toBe(0.22);
    expect(wrapTrackIndex(-1)).toBe(4);
    expect(wrapTrackIndex(5)).toBe(0);
    expect(getNextCarouselIndex(4, 1)).toBe(0);
    expect(getNextCarouselIndex(0, -1)).toBe(4);
    expect(getTrackAudioUrl('Divine Conflict.ogg')).toBe('./audio/Divine%20Conflict.ogg');
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

  it('produces deterministic Daily Trial configs and applies Trial modifiers in duelEngine', () => {
    const fixedDate = new Date('2026-11-24T12:00:00Z');
    const a = getDailyTrialConfig(fixedDate);
    const b = getDailyTrialConfig(fixedDate);
    expect(a).toEqual(b);
    expect(a.dateKey).toBe('2026-11-24');

    const frailStats = getCardEffectiveStats('kinet_sylph', {}, 'frail_pact');
    expect(frailStats.cost).toBe(1);
    expect(frailStats.hp).toBe(1);

    const tideState = createDuelState({
      stageIndex: 0,
      difficulty: 'archmage',
      playerSchool: 'kinet',
      trialModifier: 'ether_tide',
      seed: a.seed,
    });
    expect(tideState.playerChannel).toBe(3);
    expect(tideState.playerResonance).toBe(1);
    expect(tideState.enemyChannel).toBe(3);

    const titanState = createDuelState({
      stageIndex: 0,
      difficulty: 'archmage',
      playerSchool: 'synth',
      trialModifier: 'titan_vow',
      seed: a.seed,
    });
    expect(titanState.playerMaxHp).toBe(31);
    expect(titanState.enemyMaxHp).toBe(24);
  });

  it('tracks Codex discoveries, Order wins, Daily Trial records, and Crossroads shrines', () => {
    let codex = createDefaultCodex();
    codex = recordCardsDiscovered(codex, ['kinet_sylph', 'kinet_sylph', 'invalid_id']);
    expect(codex.discoveredCards).toEqual(['kinet_sylph']);
    codex = recordRelicsDiscovered(codex, ['relic_ether_core', 'relic_ether_core']);
    expect(codex.discoveredRelics).toEqual(['relic_ether_core']);
    codex = recordOrderVictory(codex, 'kinet');
    expect(codex.orderWins.kinet).toBe(1);
    codex = recordTrialRun(codex, { dateKey: '2026-11-24', stageReached: 5, score: 42, completed: false });
    expect(codex.bestTrialStage).toBe(5);
    expect(codex.trialsCompleted).toBe(0);
    codex = recordTrialRun(codex, { dateKey: '2026-11-24', stageReached: 7, score: 88, completed: true });
    expect(codex.bestTrialStage).toBe(7);
    expect(codex.trialsCompleted).toBe(1);
    expect(pickRivalCombatQuipKey(9, 'heavy_hit')).toBe('stage_6_heavy_hit');

    const options = getCrossroadsOptions(2, 1337);
    expect(options).toHaveLength(2);
    expect(options[0].id).not.toBe(options[1].id);

    const anvilRes = applyCrossroadsChoice({
      eventId: 'astral_anvil',
      deck: ['synth_blade', 'synth_golem', 'synth_construct', 'synth_ward'],
      forgedCards: {},
      relics: [],
      maxHpBonus: 0,
      startingResonanceBonus: 0,
      seed: 42,
    });
    expect(Object.values(anvilRes.forgedCards)[0]).toBe(1);

    const chaliceRes = applyCrossroadsChoice({
      eventId: 'sanguine_chalice',
      deck: ['synth_blade'],
      forgedCards: {},
      relics: [],
      maxHpBonus: 0,
      startingResonanceBonus: 0,
      seed: 42,
    });
    expect(chaliceRes.maxHpBonus).toBe(-2);
    expect(chaliceRes.startingResonanceBonus).toBe(2);
  });

  it('triggers Cross-Order Spark 1x/turn and records 1-turn poison/chaos slot aftermath', () => {
    const base = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth', seed: 12 });
    const staged = {
      ...base,
      playerEther: 6,
      playerResonance: 0,
      playerHand: ['kinet_sylph', 'chaos_hound', 'vital_venom'],
      enemyBoard: [
        null,
        null,
        {
          uid: 'e_vanguard',
          cardId: 'kinet_sylph',
          school: 'kinet' as const,
          side: 'enemy' as const,
          lane: 2,
          atk: 1,
          hp: 4,
          maxHp: 4,
          keywords: [],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack' as const,
        },
        null,
      ],
      playerBoard: [
        null,
        null,
        {
          uid: 'p_venom',
          cardId: 'vital_venom',
          school: 'vital' as const,
          side: 'player' as const,
          lane: 2,
          atk: 2,
          hp: 5,
          maxHp: 5,
          keywords: ['poison' as const],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack' as const,
        },
        null,
      ],
    };
    const afterCross1 = playCardFromHand(staged, 0, 0); // kinet_sylph (cost 2) -> +1 Ether & +1 Res
    expect(afterCross1.crossSchoolTriggeredThisTurn).toBe(true);
    expect(afterCross1.playerEther).toBe(5);
    expect(afterCross1.playerResonance).toBe(2); // +1 play +1 kinet cross spark
    expect(afterCross1.combatLog.some((e) => e.kind === 'cross')).toBe(true);

    // Second off-school card in same turn should NOT re-trigger Cross-Order Spark
    const afterCross2 = playCardFromHand(afterCross1, 0, 1);
    expect(afterCross2.enemyHp).toBe(base.enemyHp);

    // Resolve turn -> poison kill in lane 2 marks enemy aftermath[2] = 'poison'
    const afterCombat = resolvePlayerEndTurn(afterCross2);
    expect(afterCombat.slotAftermath.enemy[2]).toBe('poison');

    // Following round turn clears previous aftermath
    const cleanRoundAfter = resolvePlayerEndTurn(afterCombat);
    expect(cleanRoundAfter.slotAftermath.enemy[2]).not.toBe('poison');
  });

  it('enforces Stage 2, 3, 5, and 6 Boss Passives', () => {
    // Stage 2: boss_forged_bulwark grants weakest enemy ally +0/+1 & Shield
    const s2 = createDuelState({ stageIndex: 1, difficulty: 'archmage', playerSchool: 'synth', seed: 5 });
    const s2After = resolvePlayerEndTurn({
      ...s2,
      enemyBoard: [
        {
          uid: 'e_s2',
          cardId: 'synth_construct',
          school: 'synth',
          side: 'enemy',
          lane: 0,
          atk: 1,
          hp: 2,
          maxHp: 2,
          keywords: ['armor'],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: 'attack',
        },
        null,
        null,
        null,
      ],
    });
    expect(s2After.combatLog.some((e) => e.kind === 'boss' && e.detail === 'boss_forged_bulwark')).toBe(true);

    // Stage 3: boss_briar_thorns deals 1 thorns DMG back to grounded player attacker
    const s3 = createDuelState({ stageIndex: 2, difficulty: 'archmage', playerSchool: 'synth', seed: 5 });
    const s3After = resolvePlayerEndTurn({
      ...s3,
      playerEther: 0,
      playerBoard: [
        {
          uid: 'p_s3',
          cardId: 'synth_blade',
          school: 'synth',
          side: 'player',
          lane: 0,
          atk: 3,
          hp: 3,
          maxHp: 3,
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
      enemyBoard: [
        {
          uid: 'e_s3',
          cardId: 'vital_sprout',
          school: 'vital',
          side: 'enemy',
          lane: 0,
          atk: 0,
          hp: 6,
          maxHp: 6,
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
      enemyHand: [],
    });
    expect(s3After.pendingEvents.some((ev) => ev.type === 'hit_creature' && ev.label === '-1 🌿')).toBe(true);
    expect(s3After.playerBoard[0]?.hp).toBe(3); // 3 - 1 thorns + 1 veteran = 3

    // Stage 5: boss_astral_blink shields first summoned enemy ally
    const s5 = createDuelState({ stageIndex: 4, difficulty: 'archmage', playerSchool: 'synth', seed: 5 });
    const s5After = resolvePlayerEndTurn({
      ...s5,
      enemyEther: 4,
      enemyChannel: 4,
      enemyHand: ['kinet_sylph'],
    });
    expect(s5After.combatLog.some((e) => e.kind === 'boss' && e.detail === 'boss_astral_blink')).toBe(true);

    // Stage 6: boss_clockwork_mend heals wounded enemy ally at start of AI turn on round >= 2
    const s6 = createDuelState({ stageIndex: 5, difficulty: 'archmage', playerSchool: 'synth', seed: 5 });
    const s6After = resolvePlayerEndTurn({
      ...s6,
      round: 2,
      enemyHand: [],
      enemyBoard: [
        {
          uid: 'e_s6',
          cardId: 'synth_golem',
          school: 'synth',
          side: 'enemy',
          lane: 0,
          atk: 2,
          hp: 3,
          maxHp: 6,
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
    });
    expect(s6After.combatLog.some((e) => e.kind === 'boss' && e.detail === 'boss_clockwork_mend')).toBe(true);
    expect(s6After.enemyBoard[0]?.hp).toBe(5); // 3 + 1 clockwork_mend + 1 veteran = 5
  });

  it('supports toggling music playback mode between carousel and dynamic', () => {
    etherAudio.setMusicMode('dynamic');
    expect(etherAudio.getMusicState().musicMode).toBe('dynamic');
    etherAudio.setMusicMode('carousel');
    expect(etherAudio.getMusicState().musicMode).toBe('carousel');
  });

  it('exposes 4 distinct SFX schemes, validates IDs, and switches active SFX scheme', () => {
    expect(SFX_SCHEMES).toHaveLength(4);
    expect(DEFAULT_SFX_SCHEME).toBe('cathedral');
    expect(isValidSfxSchemeId('forge')).toBe(true);
    expect(isValidSfxSchemeId('unknown')).toBe(false);
    expect(getSfxSchemeDef('astral').pitchScale).toBeGreaterThan(1);
    expect(getSfxSchemeDef('cataclysm').subImpactBoost).toBeGreaterThan(1);

    etherAudio.setSfxScheme('forge');
    expect(etherAudio.getSfxScheme()).toBe('forge');
    etherAudio.setSfxScheme('cathedral');
    expect(etherAudio.getSfxScheme()).toBe('cathedral');
    expect(() => etherAudio.playBattleStart('chaos')).not.toThrow();
  });

  it('activates consecrated lane runes when opted in and consumes them on summon', () => {
    const offState = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'vital', seed: 11 });
    expect(offState.laneRunes).toBeUndefined();
    expect(offState.activeQuest).toBeUndefined();

    const state = createDuelState({
      stageIndex: 0,
      difficulty: 'apprentice',
      playerSchool: 'vital',
      seed: 11,
      enableLaneRunes: true,
      enableQuests: true,
    });
    expect(state.laneRunes).toBeDefined();
    const activeEntries = (state.laneRunes?.player ?? [])
      .map((kind, lane) => ({ kind, lane }))
      .filter((entry): entry is { kind: 'aegis' | 'surge' | 'fury'; lane: number } => entry.kind !== null);
    expect(activeEntries).toHaveLength(2);
    expect(new Set(activeEntries.map((e) => e.kind)).size).toBe(2);
    expect(state.activeQuest).toBeDefined();

    for (const target of activeEntries) {
      const prepared: DuelState = {
        ...state,
        playerEther: 6,
        playerHand: ['vital_sprout'],
        playerBoard: [null, null, null, null],
      };
      const beforeRes = prepared.playerResonance;
      const after = playCardFromHand(prepared, 0, target.lane);
      const summoned = after.playerBoard[target.lane];
      expect(summoned).not.toBeNull();
      expect(after.laneRunes?.player[target.lane]).toBeNull();
      expect(after.combatLog.some((e) => e.kind === 'rune' && e.detail === target.kind.toUpperCase())).toBe(true);

      if (target.kind === 'aegis') {
        expect(summoned?.shielded).toBe(true);
        expect(summoned?.hp).toBe(5); // vital_sprout base 4 + 1 aegis
      } else if (target.kind === 'surge') {
        expect(after.playerEther).toBe(prepared.playerEther - 1 + 1);
        expect(after.playerResonance).toBe(beforeRes + 2); // +1 play + 1 surge
      } else if (target.kind === 'fury') {
        expect(summoned?.atk).toBe(3); // vital_sprout base 1 + 2 fury
      }
    }
  });

  it('tracks Obsidian Contract quest progression and awards bonus XP on victory', () => {
    const baseState = createDuelState({
      stageIndex: 0,
      difficulty: 'archmage',
      playerSchool: 'chaos',
      seed: 21,
      enableQuests: true,
    });
    expect(baseState.activeQuest).toBeDefined();

    const completedWinState = {
      ...baseState,
      phase: 'victory' as const,
      activeQuest: {
        id: 'summon_swarm' as const,
        progress: 4,
        target: 4,
        completed: true,
        bonusXp: 45,
      },
    };
    const withoutQuestWin = {
      ...baseState,
      phase: 'victory' as const,
      activeQuest: undefined,
    };
    expect(calculateDuelXp(completedWinState) - calculateDuelXp(withoutQuestWin)).toBe(45);
  });

  it('evaluates persistent Cathedral Oaths and backfills legacy Codex saves safely', () => {
    let codex = createDefaultCodex();
    expect(getCodexMasterySummary(codex)).toEqual({ completedCount: 0, totalCount: 5, rank: 1 });

    codex = recordContractCompleted(recordContractCompleted(recordContractCompleted(codex)));
    codex = recordForgeCompleted(recordForgeCompleted(recordForgeCompleted(codex)));
    codex = recordOrderVictory(recordOrderVictory(codex, 'kinet'), 'chaos');
    for (let i = 0; i < 7; i++) codex = recordStageCleared(codex);
    codex = recordTrialRun(codex, { dateKey: '2026-11-24', stageReached: 7, score: 50, completed: true });

    const oaths = evaluateCathedralOaths(codex);
    expect(oaths.every((o) => o.completed)).toBe(true);
    expect(getCodexMasterySummary(codex)).toEqual({ completedCount: 5, totalCount: 5, rank: 4 });

    const legacyStore = {
      getItem: () => JSON.stringify({ orderWins: { vital: 1 } }),
      setItem: () => {},
    } as unknown as Storage;
    const restored = loadCodexSave(legacyStore);
    expect(restored.contractsCompleted).toBe(0);
    expect(restored.forgesCompleted).toBe(0);
    expect(restored.stagesClearedCount).toBe(0);
    expect(restored.orderWins.vital).toBe(1);
  });
});
