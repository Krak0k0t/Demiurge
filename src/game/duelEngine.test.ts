import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDraftReplacement,
  computeEnemyIntent,
  createDuelState,
  fuseCreatureFromHand,
  generateDraftChoices,
  generateRelicChoices,
  performMulligan,
  playCardFromHand,
  resolvePlayerEndTurn,
  sacrificeCardAtAltar,
  swapPlayerLanes,
  toggleAltarMode,
  toggleCreatureStance,
  triggerChronoRewind,
  triggerCreatureAbility,
  triggerOverload,
  triggerResonanceApotheosis,
  triggerRightClickLeap,
  triggerSoulTether,
  triggerUltimatum,
  type DuelState,
} from './duelEngine';

test('duelEngine initializes with difficulty-scaled HP and starting hand', () => {
  const sApp = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'kinet' });
  const sCat = createDuelState({ stageIndex: 0, difficulty: 'cataclysm', playerSchool: 'kinet' });

  assert.equal(sApp.playerHp, 28);
  assert.equal(sCat.playerHp, 22);
  assert.equal(sApp.playerHand.length, 4);
  assert.ok(sCat.enemyHp > sApp.enemyHp);
});

test('overload grants +2 ether (or +3 on surge anomaly) and costs 3 HP', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'chaos' });
  const baseEther = state.playerEther;
  const baseHp = state.playerHp;

  state = triggerOverload(state);
  assert.equal(state.playerHp, baseHp - 3);
  assert.equal(state.playerEther, baseEther + 2);
  assert.equal(state.overloadUsedThisTurn, true);

  const second = triggerOverload(state);
  assert.equal(second.playerEther, state.playerEther);
});

test('altar sacrifice burns card for +1 ether and buffs board or heals', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'vital' });
  state = { ...state, playerHp: 20, playerHand: ['vital_sprout', 'kinet_bolt'] };
  state = toggleAltarMode(state);
  assert.equal(state.altarMode, true);

  const etherBefore = state.playerEther;
  state = sacrificeCardAtAltar(state, 1);
  assert.equal(state.altarMode, false);
  assert.equal(state.playerHand.length, 1);
  assert.equal(state.playerEther, etherBefore + 1);
  assert.equal(state.playerHp, 22);
});

test('playing creature, right-click leap shield, combat, flying bypass & veterancy +1/+1', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'kinet' });
  state = {
    ...state,
    playerEther: 5,
    playerHand: ['kinet_sylph'],
    enemyBoard: [
      {
        uid: 'blocker1',
        cardId: 'vital_sprout',
        school: 'vital',
        side: 'enemy',
        lane: 0,
        atk: 1,
        hp: 4,
        maxHp: 4,
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
  };

  state = playCardFromHand(state, 0, 0);
  assert.ok(state.playerBoard[0] !== null);
  assert.equal(state.playerBoard[0]!.cardId, 'kinet_sylph');

  state = triggerRightClickLeap(state, 0);
  assert.equal(state.playerBoard[0]!.shielded, true);
  assert.equal(state.playerBoard[0]!.atk, 4);

  const enemyHpBefore = state.enemyHp;
  state = resolvePlayerEndTurn(state);

  assert.ok(state.enemyHp <= enemyHpBefore - 4);
  assert.ok(state.round === 2);
});

test('ultimatum only triggers below 50% HP and doubles ether', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth' });
  const denied = triggerUltimatum(state);
  assert.equal(denied.ultimatumUsed, false);

  state = { ...state, playerHp: 10, playerEther: 4 };
  const active = triggerUltimatum(state);
  assert.equal(active.ultimatumUsed, true);
  assert.equal(active.ultimatumActive, true);
  assert.equal(active.playerEther, 8);
});

test('draft generates 3 cards and replaces cleanly', () => {
  const deck = ['kinet_sylph', 'kinet_bolt', 'synth_construct'];
  const choices = generateDraftChoices(deck, 999);
  assert.equal(choices.length, 3);
  const updated = applyDraftReplacement(deck, choices[0], 1);
  assert.equal(updated.length, 3);
  assert.equal(updated[1], choices[0]);
});

test('computeEnemyIntent predicts direct flying bypass, armored clashes, and playable cards', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth' });
  state = {
    ...state,
    enemyChannel: 2,
    enemyHand: ['kinet_sylph', 'kinet_lance', 'kinet_bolt'],
    enemyBoard: [
      {
        uid: 'e1',
        cardId: 'kinet_sylph',
        school: 'kinet',
        side: 'enemy',
        lane: 0,
        atk: 3,
        hp: 2,
        maxHp: 2,
        keywords: ['flying'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      },
      {
        uid: 'e2',
        cardId: 'synth_blade',
        school: 'synth',
        side: 'enemy',
        lane: 1,
        atk: 3,
        hp: 2,
        maxHp: 2,
        keywords: ['firstStrike'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      },
      null,
      null,
    ],
    playerBoard: [
      {
        uid: 'p1',
        cardId: 'vital_sprout',
        school: 'vital',
        side: 'player',
        lane: 0,
        atk: 1,
        hp: 4,
        maxHp: 4,
        keywords: ['armor'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      },
      {
        uid: 'p2',
        cardId: 'synth_construct',
        school: 'synth',
        side: 'player',
        lane: 1,
        atk: 2,
        hp: 5,
        maxHp: 5,
        keywords: ['armor'],
        veteranCount: 0,
        shielded: true,
        summonSick: false,
        stance: 'attack',
      },
      null,
      null,
    ],
  };

  const intent = computeEnemyIntent(state);
  assert.equal(intent.directDemiurgeDmg, 3);
  assert.equal(intent.boardCreatureDmg, 1);
  assert.equal(intent.totalIncomingDmg, 4);
  assert.equal(intent.playableCardsCount, 3);
  assert.equal(intent.mayOverload, true);
});

test('guard stance skips attack and intercepts adjacent unblocked lane', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'vital' });
  state = {
    ...state,
    enemyHand: [],
    playerBoard: [
      null,
      {
        uid: 'p_guard',
        cardId: 'vital_sprout',
        school: 'vital',
        side: 'player',
        lane: 1,
        atk: 1,
        hp: 4,
        maxHp: 4,
        keywords: ['armor'],
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
        uid: 'e_raider',
        cardId: 'chaos_hound',
        school: 'chaos',
        side: 'enemy',
        lane: 0,
        atk: 4,
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
  };

  state = toggleCreatureStance(state, 1);
  assert.equal(state.playerBoard[1]!.stance, 'guard');

  // Intent should reflect guard intercepting lane 0 (0 direct damage!)
  const intent = computeEnemyIntent(state);
  assert.equal(intent.directDemiurgeDmg, 0);

  const enemyHpBefore = state.enemyHp;
  state = resolvePlayerEndTurn(state);

  // Guard did not attack enemy Archon, and intercepted chaos hound so intercept event fired & guard took 2 dmg
  assert.equal(state.enemyHp, enemyHpBefore);
  assert.ok(state.pendingEvents.some((e) => e.type === 'intercept' && e.fromLane === 1 && e.lane === 0));
  assert.equal(state.playerBoard[1]!.hp, 2);
});

test('enchantment, trap wards, and creature active abilities work end-to-end', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'chaos' });
  state = {
    ...state,
    playerEther: 8,
    playerHand: ['chaos_inferno_altar', 'kinet_mirage_ward', 'chaos_pyromancer'],
    enemyBoard: [
      null,
      null,
      {
        uid: 'e_foe',
        cardId: 'kinet_sylph',
        school: 'kinet',
        side: 'enemy',
        lane: 2,
        atk: 3,
        hp: 2,
        maxHp: 2,
        keywords: ['flying'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      },
      null,
    ],
  };

  state = playCardFromHand(state, 0); // Enchantment
  assert.equal(state.playerEnchantment, 'chaos_inferno_altar');

  state = playCardFromHand(state, 0); // Trap
  assert.equal(state.playerTrap, 'kinet_mirage_ward');

  state = playCardFromHand(state, 0, 0); // Summon pyromancer in lane 0
  assert.equal(state.playerBoard[0]!.activeAbility, 'chaos_spark');

  const enemyHpBefore = state.enemyHp;
  state = triggerCreatureAbility(state, 0, 2); // Kills sylph (2 hp), triggering Inferno Altar (-2 enemy HP!)
  assert.equal(state.enemyBoard[2], null);
  assert.equal(state.enemyHp, enemyHpBefore - 2);
});

test('all 4 order ultimates and relic choices behave accurately', () => {
  const relics = generateRelicChoices(['relic_ether_core'], 77);
  assert.equal(relics.length, 3);
  assert.ok(!relics.includes('relic_ether_core'));

  const sWithCore = createDuelState({
    stageIndex: 0,
    difficulty: 'archmage',
    playerSchool: 'kinet',
    relics: ['relic_ether_core'],
  });
  assert.equal(sWithCore.playerChannel, 3);

  // Kinet ultimatum draws 2 and stuns enemy board
  let kState: DuelState = {
    ...sWithCore,
    playerHp: 8,
    playerHand: ['kinet_bolt'],
    enemyBoard: [
      {
        uid: 'e_x',
        cardId: 'synth_golem',
        school: 'synth' as const,
        side: 'enemy' as const,
        lane: 0,
        atk: 4,
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
  kState = triggerUltimatum(kState);
  assert.equal(kState.playerHand.length, 3);
  assert.equal(kState.enemyBoard[0]!.exhausted, true);

  // Vital ultimatum heals +7 and summons sprout guard
  let vState = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'vital' });
  vState = { ...vState, playerHp: 8 };
  vState = triggerUltimatum(vState);
  assert.equal(vState.playerHp, 15);
  assert.ok(vState.playerBoard[0] !== null);
  assert.equal(vState.playerBoard[0]!.stance, 'guard');
});

test('round 1 opening hand always contains a playable card and tracks lastAiSummary', async () => {
  const { CARD_CATALOG } = await import('./cards');
  for (let i = 0; i < 12; i++) {
    for (const stageIndex of [0, 3, 6]) {
      const s = createDuelState({
        stageIndex,
        difficulty: 'archmage',
        playerSchool: 'synth',
        seed: 1000 + i * 37,
      });
      assert.equal(s.lastAiSummary, null);
      const hasPlayable = s.playerHand.some((id) => (CARD_CATALOG[id]?.cost ?? 99) <= s.playerChannel);
      assert.ok(hasPlayable, `Expected playable opener for seed ${1000 + i * 37} stage ${stageIndex}`);
    }
  }

  let turn = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'kinet', seed: 42 });
  turn = resolvePlayerEndTurn(turn);
  assert.ok(turn.lastAiSummary !== null);
  assert.equal(typeof turn.lastAiSummary!.acted, 'boolean');
  assert.equal(typeof turn.lastAiSummary!.summoned, 'number');
});

test('performMulligan replaces selected cards once on Round 1 and keeps deck invariant', async () => {
  const { CARD_CATALOG } = await import('./cards');
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth', seed: 505 });
  const totalBefore = state.playerHand.length + state.playerDrawPile.length;
  assert.equal(state.mulliganDone, false);

  state = performMulligan(state, [0, 2]);
  assert.equal(state.mulliganDone, true);
  assert.equal(state.playerHand.length + state.playerDrawPile.length, totalBefore);
  assert.ok(state.playerHand.some((id) => (CARD_CATALOG[id]?.cost ?? 99) <= state.playerChannel));
  assert.ok(state.combatLog.some((e) => e.kind === 'mulligan'));

  const handAfter = [...state.playerHand];
  const retry = performMulligan(state, [1]);
  assert.deepEqual(retry.playerHand, handAfter);
});

test('fuseCreatureFromHand ascends an ally with stats, keywords, shield, and combatLog', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'archmage', playerSchool: 'synth', seed: 111 });
  state = {
    ...state,
    playerEther: 6,
    playerHand: ['kinet_sylph'], // 3/2 flying, cost 2
    playerBoard: [
      {
        uid: 'base1',
        cardId: 'synth_construct',
        school: 'synth',
        side: 'player',
        lane: 0,
        atk: 2,
        hp: 5,
        maxHp: 5,
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
  };

  state = fuseCreatureFromHand(state, 0, 0);
  const fused = state.playerBoard[0]!;
  assert.equal(state.playerEther, 4);
  assert.equal(state.playerHand.length, 0);
  assert.equal(fused.atk, 5); // 2 + ceil(3*0.75)=3
  assert.equal(fused.hp, 7); // 5 + ceil(2*0.75)=2
  assert.equal(fused.shielded, true);
  assert.equal(fused.veteranCount, 1);
  assert.ok(fused.keywords.includes('armor'));
  assert.ok(fused.keywords.includes('flying'));
  assert.ok(state.combatLog.some((e) => e.kind === 'ascend'));
});

test('swapPlayerLanes maneuvers units once per turn and resets next round', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'vital', seed: 222 });
  state = {
    ...state,
    enemyHand: [],
    playerBoard: [
      {
        uid: 'u1',
        cardId: 'vital_sprout',
        school: 'vital',
        side: 'player',
        lane: 0,
        atk: 1,
        hp: 4,
        maxHp: 4,
        keywords: ['armor'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'guard',
      },
      null,
      null,
      null,
    ],
  };

  state = swapPlayerLanes(state, 0, 2);
  assert.equal(state.swapUsedThisTurn, true);
  assert.equal(state.playerBoard[0], null);
  assert.equal(state.playerBoard[2]!.uid, 'u1');
  assert.equal(state.playerBoard[2]!.lane, 2);
  assert.ok(state.combatLog.some((e) => e.kind === 'swap'));

  // Blocked second swap in same turn
  const blocked = swapPlayerLanes(state, 2, 1);
  assert.equal(blocked.playerBoard[1], null);

  // Resets on next round
  state = resolvePlayerEndTurn(state);
  assert.equal(state.swapUsedThisTurn, false);
});

test('boss passives on stages 4 and 7 trigger and cross-school draft includes rival card', async () => {
  const { CARD_CATALOG } = await import('./cards');

  // Cross-school draft guarantee
  const draft = generateDraftChoices(['synth_blade', 'synth_construct'], 777, 'chaos');
  assert.equal(draft.length, 3);
  assert.ok(draft.some((id) => CARD_CATALOG[id].school === 'chaos'));

  // Stage 4 Boss (Ember Tithe on Round 2)
  let s4 = createDuelState({ stageIndex: 3, difficulty: 'archmage', playerSchool: 'synth', seed: 303 });
  s4 = { ...s4, round: 2, enemyHand: [] };
  const hpBefore = s4.playerHp;
  s4 = resolvePlayerEndTurn(s4);
  assert.ok(s4.playerHp <= hpBefore - 1);
  assert.ok(s4.combatLog.some((e) => e.kind === 'boss' && e.detail === 'boss_ember_tithe'));

  // Stage 7 Boss (Rift Sovereign shifts anomaly every round & buffs vanguard on R2+)
  let s7 = createDuelState({ stageIndex: 6, difficulty: 'archmage', playerSchool: 'kinet', seed: 404 });
  const initialAnomaly = s7.anomaly;
  s7 = resolvePlayerEndTurn(s7); // Round 1 -> Round 2 (normally even rounds don't rotate, but Korvin does!)
  assert.notEqual(s7.anomaly, initialAnomaly);
});

test('chrono-rewind heals/refreshes living allies, resurrects lastLostAlly with shield, and is once per duel', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'synth', seed: 606 });
  state = {
    ...state,
    enemyHand: [],
    playerBoard: [
      {
        uid: 'ally_fragile',
        cardId: 'kinet_sylph',
        school: 'kinet',
        side: 'player',
        lane: 0,
        atk: 3,
        hp: 2,
        maxHp: 2,
        keywords: ['flying'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'guard',
      },
      {
        uid: 'ally_bruised',
        cardId: 'synth_construct',
        school: 'synth',
        side: 'player',
        lane: 1,
        atk: 2,
        hp: 1,
        maxHp: 5,
        keywords: ['armor'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'guard',
        exhausted: true,
        abilityUsedThisTurn: true,
      },
      null,
      null,
    ],
    enemyBoard: [
      {
        uid: 'foe_1',
        cardId: 'chaos_hound',
        school: 'chaos',
        side: 'enemy',
        lane: 0,
        atk: 4,
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
  };

  // End turn -> foe_1 kills ally_fragile in lane 0
  state = resolvePlayerEndTurn(state);
  assert.equal(state.playerBoard[0], null);
  assert.ok(state.lastLostAlly !== null);
  assert.equal(state.lastLostAlly!.creature.uid, 'ally_fragile');
  assert.equal(state.lastLostAlly!.lane, 0);

  // Trigger Chrono-Rewind -> resurrects ally_fragile in lane 0 & heals/refreshes ally_bruised in lane 1
  state = triggerChronoRewind(state);
  assert.equal(state.chronoRewindUsed, true);
  assert.equal(state.lastLostAlly, null);
  assert.ok(state.playerBoard[0] !== null);
  assert.equal(state.playerBoard[0]!.uid, 'ally_fragile');
  assert.equal(state.playerBoard[0]!.hp, 2);
  assert.equal(state.playerBoard[0]!.shielded, true);
  assert.equal(state.playerBoard[1]!.hp, 5);
  assert.equal(state.playerBoard[1]!.shielded, true);
  assert.equal(state.playerBoard[1]!.exhausted, false);
  assert.equal(state.playerBoard[1]!.abilityUsedThisTurn, false);
  assert.ok(state.combatLog.some((e) => e.kind === 'chrono'));

  // Second cast is blocked
  const afterSecond = triggerChronoRewind(state);
  assert.equal(afterSecond, state);
});

test('soul tether empowers ally +2 HP & Shield, reflects 50% enemy damage, and respects 2-round cooldown', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'synth', seed: 707 });
  state = {
    ...state,
    enemyHand: [],
    playerBoard: [
      {
        uid: 'guard1',
        cardId: 'synth_construct',
        school: 'synth',
        side: 'player',
        lane: 0,
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
      null,
      null,
    ],
    enemyBoard: [
      null,
      {
        uid: 'e_direct',
        cardId: 'chaos_lord',
        school: 'chaos',
        side: 'enemy',
        lane: 1,
        atk: 5,
        hp: 5,
        maxHp: 5,
        keywords: [],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      },
      null,
      {
        uid: 'e_unblocked',
        cardId: 'chaos_hound',
        school: 'chaos',
        side: 'enemy',
        lane: 3,
        atk: 3,
        hp: 2,
        maxHp: 2,
        keywords: [],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      },
    ],
  };

  state = triggerSoulTether(state, 0);
  assert.equal(state.soulTetherActive, true);
  assert.equal(state.soulTetherCooldown, 2);
  assert.equal(state.playerBoard[0]!.hp, 7);
  assert.equal(state.playerBoard[0]!.shielded, true);

  const enemyHpBefore = state.enemyHp;
  state = resolvePlayerEndTurn(state);

  // e_direct (5 atk) intercepted by guard1 (armor 1 + shield 1 + guard 1 = 3 armor -> 2 dmg) => ceil(2*0.5)=1 reflected
  // e_unblocked (3 atk) hits player Archon directly (3 dmg) => ceil(3*0.5)=2 reflected
  // Total reflected >= 3
  assert.ok(state.enemyHp <= enemyHpBefore - 3);
  assert.ok(state.pendingEvents.some((e) => e.type === 'tether_reflect'));
  assert.equal(state.soulTetherActive, false);
  assert.equal(state.soulTetherCooldown, 1);

  // Cooldown prevents immediate recast on round 2
  const blocked = triggerSoulTether(state);
  assert.equal(blocked.soulTetherActive, false);

  // Advance another round -> cooldown reaches 0 and allows recast
  state = resolvePlayerEndTurn(state);
  assert.equal(state.soulTetherCooldown, 0);
  const recast = triggerSoulTether(state);
  assert.equal(recast.soulTetherActive, true);
});

test('archon resonance charges 0->5 on actions and unleashes school apotheosis & chaos burn lanes', () => {
  let state = createDuelState({ stageIndex: 0, difficulty: 'apprentice', playerSchool: 'chaos', seed: 808 });
  state = {
    ...state,
    playerEther: 10,
    enemyHand: [],
    playerHand: ['chaos_hound', 'kinet_bolt', 'chaos_hound', 'kinet_bolt'],
    enemyBoard: [
      {
        uid: 'foe_burn',
        cardId: 'synth_golem',
        school: 'synth',
        side: 'enemy',
        lane: 0,
        atk: 4,
        hp: 6,
        maxHp: 6,
        keywords: [],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'guard',
      },
      null,
      null,
      null,
    ],
  };

  state = triggerOverload(state); // +1
  state = playCardFromHand(state, 0, 1); // +1 (summon hound)
  state = playCardFromHand(state, 0, 0); // +1 (bolt on foe_burn: 6 -> 2 HP? wait: 4 dmg -> 2 hp)
  assert.equal(state.playerResonance, 3);

  // Reset foe hp high enough to survive and put in lane 3 (non-adjacent to lanes 1) to test burn ticks
  state = {
    ...state,
    enemyBoard: [
      null,
      null,
      null,
      {
        uid: 'foe_tank',
        cardId: 'synth_golem',
        school: 'synth',
        side: 'enemy',
        lane: 3,
        atk: 4,
        hp: 10,
        maxHp: 10,
        keywords: [],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'guard',
      },
    ],
  };

  state = playCardFromHand(state, 0, 2); // +1
  state = playCardFromHand(state, 0, 3); // +1 (kinet_bolt 5 dmg on foe_tank -> 5 HP) -> 5/5!
  assert.equal(state.playerResonance, 5);

  const enemyHpBefore = state.enemyHp;
  state = triggerResonanceApotheosis(state);
  assert.equal(state.playerResonance, 0);
  assert.equal(state.enemyHp, enemyHpBefore - 2);
  // kinet_bolt dealt 5 dmg (4 + 1 rift anomaly) -> 10 - 5 = 5, then Cinder Rift 3 AoE -> 2 HP
  assert.equal(state.enemyBoard[3]!.hp, 2);
  assert.deepEqual(state.chaosBurnLanes, [2, 2, 2, 2]);
  assert.ok(state.combatLog.some((e) => e.kind === 'resonance'));

  // End turn -> burn lanes deal another 2 dmg finishing foe_tank (2 -> 0) and decrement counter to 1
  state = resolvePlayerEndTurn(state);
  assert.deepEqual(state.chaosBurnLanes, [1, 1, 1, 1]);
  assert.equal(state.enemyBoard[3], null);
});





