import { createRng, type Rng } from '../core/rng';
import type { MagicSchool } from '../view/assets/creatureTotems';
import {
  ALL_CARD_IDS,
  ALL_RELIC_IDS,
  ANOMALY_ROTATION,
  CARD_CATALOG,
  STARTER_DECKS,
  TOURNAMENT_OPPONENTS,
  type ActiveAbilityId,
  type AnomalyId,
  type BossPassiveId,
  type CardDef,
  type Difficulty,
  type Keyword,
  type OpponentDef,
  type RelicId,
} from './cards';
import type { TrialModifierId } from './cathedralMeta';
import {
  computeQuestXpBonus,
  createInitialQuestCounters,
  evaluateQuestProgress,
  generateDuelQuest,
  type DuelQuestState,
  type QuestProgressCounters,
} from './quests';

export type CreatureStance = 'attack' | 'guard';
export type SlotAftermathKind = 'chaos' | 'poison' | null;
export type LaneRuneKind = 'aegis' | 'surge' | 'fury';

export interface BoardCreature {
  uid: string;
  cardId: string;
  school: MagicSchool;
  side: 'player' | 'enemy';
  lane: number; // 0..3
  atk: number;
  hp: number;
  maxHp: number;
  keywords: Keyword[];
  veteranCount: number;
  shielded: boolean;
  summonSick: boolean;
  stance: CreatureStance;
  exhausted?: boolean;
  activeAbility?: ActiveAbilityId;
  abilityUsedThisTurn?: boolean;
}

export interface CombatEvent {
  type:
    | 'summon'
    | 'spell'
    | 'attack'
    | 'hit_creature'
    | 'hit_demiurge'
    | 'creature_died'
    | 'overload'
    | 'altar'
    | 'ultimatum'
    | 'leap_pulse'
    | 'veteran'
    | 'anomaly'
    | 'stance'
    | 'intercept'
    | 'enchant'
    | 'trap'
    | 'ability'
    | 'chrono_rewind'
    | 'soul_tether'
    | 'tether_reflect'
    | 'resonance';
  side: 'player' | 'enemy';
  lane?: number;
  fromLane?: number;
  amount?: number;
  label?: string;
  school?: MagicSchool;
  uid?: string;
  cardId?: string;
  atk?: number;
  hp?: number;
}

export interface AiTurnSummary {
  acted: boolean;
  summoned: number;
  spells: number;
  overloaded: boolean;
  passedReason: 'none' | 'saving_ether' | 'board_full';
}

export interface CombatLogEntry {
  id: number;
  round: number;
  actor: 'player' | 'enemy' | 'arena';
  kind:
    | 'summon'
    | 'ascend'
    | 'spell'
    | 'trap'
    | 'intercept'
    | 'swap'
    | 'mulligan'
    | 'boss'
    | 'overload'
    | 'ultimatum'
    | 'anomaly'
    | 'chrono'
    | 'tether'
    | 'resonance'
    | 'cross'
    | 'rune';
  cardId?: string;
  detail: string;
}

export interface DuelState {
  stageIndex: number; // 0..6
  difficulty: Difficulty;
  playerSchool: MagicSchool;
  round: number;
  phase: 'player_main' | 'ai_turn' | 'victory' | 'defeat';
  anomaly: AnomalyId;

  playerHp: number;
  playerMaxHp: number;
  playerEther: number;
  playerChannel: number;
  overloadUsedThisTurn: boolean;
  ultimatumUsed: boolean;
  ultimatumActive: boolean;
  leapUsedThisTurn: boolean;
  swapUsedThisTurn: boolean;
  mulliganDone: boolean;
  altarMode: boolean;

  chronoRewindUsed: boolean;
  lastLostAlly: { creature: BoardCreature; lane: number } | null;
  soulTetherActive: boolean;
  soulTetherCooldown: number;
  soulTetherLane: number | null;
  playerResonance: number; // 0..5
  chaosBurnLanes: number[]; // length 4 turn counters

  enemyHp: number;
  enemyMaxHp: number;
  enemyEther: number;
  enemyChannel: number;
  enemyOverloaded: boolean;

  playerEnchantment: string | null;
  enemyEnchantment: string | null;
  playerTrap: string | null;
  enemyTrap: string | null;

  relics: RelicId[];
  phylacteryUsed: boolean;
  forgedCards: Record<string, number>;
  archonRank: number;
  schoolDoctrineUsedThisTurn: boolean;
  crossSchoolTriggeredThisTurn: boolean;
  trialModifier: TrialModifierId | null;
  slotAftermath: {
    player: SlotAftermathKind[];
    enemy: SlotAftermathKind[];
  };
  laneRunes?: {
    player: Array<LaneRuneKind | null>;
    enemy: Array<LaneRuneKind | null>;
  };
  activeQuest?: DuelQuestState;
  questCounters?: QuestProgressCounters;

  playerDeck: string[];
  playerDrawPile: string[];
  playerHand: string[];
  enemyHand: string[];

  playerBoard: Array<BoardCreature | null>; // 4 lanes
  enemyBoard: Array<BoardCreature | null>; // 4 lanes

  damageDealtTotal: number;
  overloadCount: number;
  nextUid: number;
  seed: number;
  lastAiSummary: AiTurnSummary | null;
  combatLog: CombatLogEntry[];
  pendingEvents: CombatEvent[];
}

const MAX_CHANNEL = 10;
const MAX_HAND = 6;
const LANES = 4;

function shuffleWithRng<T>(arr: T[], rng: Rng): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getOpponentForStage(stageIndex: number): OpponentDef {
  return TOURNAMENT_OPPONENTS[Math.max(0, Math.min(TOURNAMENT_OPPONENTS.length - 1, stageIndex))];
}

export interface EffectiveCardStats {
  cost: number;
  atk: number;
  hp: number;
  spellAmount: number;
  hpBonus: number;
  forgeTier: number;
}

export function getCardEffectiveStats(
  cardId: string,
  forgedCards: Record<string, number> = {},
  trialModifier: TrialModifierId | null = null
): EffectiveCardStats {
  const card = CARD_CATALOG[cardId];
  if (!card) {
    return { cost: 0, atk: 0, hp: 0, spellAmount: 0, hpBonus: 0, forgeTier: 0 };
  }
  const forgeTier = Math.max(0, Math.min(2, forgedCards[cardId] ?? 0));
  const applyTrial = (stats: EffectiveCardStats): EffectiveCardStats => {
    if (trialModifier === 'frail_pact' && card.type === 'creature') {
      return {
        ...stats,
        cost: Math.max(1, stats.cost - 1),
        hp: Math.max(1, stats.hp - 1),
      };
    }
    return stats;
  };
  if (forgeTier === 0) {
    return applyTrial({
      cost: card.cost,
      atk: card.atk ?? 0,
      hp: card.hp ?? 0,
      spellAmount: card.spellEffect?.amount ?? 0,
      hpBonus: card.spellEffect?.hpBonus ?? 0,
      forgeTier: 0,
    });
  }
  if (card.type === 'creature') {
    return applyTrial({
      cost: card.cost,
      atk: (card.atk ?? 2) + forgeTier,
      hp: (card.hp ?? 2) + forgeTier,
      spellAmount: 0,
      hpBonus: 0,
      forgeTier,
    });
  }
  if (card.type === 'enchantment' || card.type === 'trap') {
    return {
      cost: Math.max(1, card.cost - forgeTier),
      atk: 0,
      hp: 0,
      spellAmount: 0,
      hpBonus: 0,
      forgeTier,
    };
  }
  const eff = card.spellEffect;
  if (eff?.kind === 'gain_ether') {
    return {
      cost: card.cost,
      atk: 0,
      hp: 0,
      spellAmount: eff.amount + forgeTier,
      hpBonus: 0,
      forgeTier,
    };
  }
  if (eff?.kind === 'double_hp_armor') {
    return {
      cost: Math.max(1, card.cost - forgeTier),
      atk: 0,
      hp: 0,
      spellAmount: eff.amount,
      hpBonus: 0,
      forgeTier,
    };
  }
  return {
    cost: card.cost >= 3 ? Math.max(1, card.cost - 1) : card.cost,
    atk: 0,
    hp: 0,
    spellAmount: (eff?.amount ?? 0) + forgeTier * 2,
    hpBonus: (eff?.hpBonus ?? 0) + (eff?.hpBonus !== undefined ? forgeTier : 0),
    forgeTier,
  };
}

export function getArchonRank(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / 220);
}

export function calculateDuelXp(state: DuelState): number {
  const stageReward = (state.stageIndex + 1) * 45;
  const speedBonus = Math.max(0, (10 - state.round) * 12);
  const survivalBonus = Math.max(0, state.playerHp * 3);
  const diffMult = state.difficulty === 'cataclysm' ? 1.3 : state.difficulty === 'archmage' ? 1.15 : 1;
  return Math.round((80 + stageReward + speedBonus + survivalBonus) * diffMult) + computeQuestXpBonus(state.activeQuest);
}

export function createDuelState(params: {
  stageIndex: number;
  difficulty: Difficulty;
  playerSchool: MagicSchool;
  deck?: string[];
  relics?: RelicId[];
  forgedCards?: Record<string, number>;
  archonRank?: number;
  maxHpBonus?: number;
  startingResonanceBonus?: number;
  trialModifier?: TrialModifierId | null;
  enableLaneRunes?: boolean;
  enableQuests?: boolean;
  seed?: number;
}): DuelState {
  const seed = params.seed ?? 1337 + params.stageIndex * 97;
  const rng = createRng(seed);
  const opponent = getOpponentForStage(params.stageIndex);
  const relics = [...(params.relics ?? [])];
  const forgedCards = { ...(params.forgedCards ?? {}) };
  const trialModifier = params.trialModifier ?? null;
  const archonRank = Math.max(1, params.archonRank ?? 1);
  const rankHpBonus = (archonRank - 1) * 2;
  const rankEtherBonus = archonRank >= 3 ? 1 : 0;
  const titanBonus = trialModifier === 'titan_vow' ? 6 : 0;

  const playerMaxHp = Math.max(
    10,
    (params.difficulty === 'apprentice' ? 28 : params.difficulty === 'archmage' ? 25 : 22) +
      rankHpBonus +
      titanBonus +
      (params.maxHpBonus ?? 0)
  );
  const enemyBonus =
    params.difficulty === 'apprentice' ? -2 : params.difficulty === 'archmage' ? 0 : 4;
  const enemyMaxHp = Math.max(12, opponent.baseHp + enemyBonus + titanBonus);

  const deckSource = params.deck ? [...params.deck] : [...STARTER_DECKS[params.playerSchool]];
  const shuffled = shuffleWithRng(deckSource, rng);
  const initialHandCount = relics.includes('relic_chrono_gear') ? 5 : 4;
  const playerHand = shuffled.splice(0, Math.min(MAX_HAND, initialHandCount));
  const enemyHand = [...opponent.deck.slice(0, 3)];

  const baseChannel = params.difficulty === 'apprentice' ? 3 : 2;
  const trialEtherBonus = trialModifier === 'ether_tide' ? 1 : 0;
  const trialResonanceBonus = trialModifier === 'ether_tide' ? 1 : 0;
  const startingChannel = baseChannel + (relics.includes('relic_ether_core') ? 1 : 0) + trialEtherBonus;
  const startingEther = startingChannel + rankEtherBonus;

  // Guarantee at least one playable card in opening hand so Round 1 never bricks
  const hasOpeningPlay = playerHand.some(
    (id) => getCardEffectiveStats(id, forgedCards, trialModifier).cost <= startingEther
  );
  if (!hasOpeningPlay) {
    const cheapIdx = shuffled.findIndex((id) => {
      const c = CARD_CATALOG[id];
      const effCost = getCardEffectiveStats(id, forgedCards, trialModifier).cost;
      return c && effCost <= startingEther && c.type === 'creature';
    });
    const fallbackIdx =
      cheapIdx >= 0
        ? cheapIdx
        : shuffled.findIndex((id) => getCardEffectiveStats(id, forgedCards, trialModifier).cost <= startingEther);
    if (fallbackIdx >= 0 && playerHand.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < playerHand.length; i++) {
        if (
          getCardEffectiveStats(playerHand[i], forgedCards, trialModifier).cost >
          getCardEffectiveStats(playerHand[maxIdx], forgedCards, trialModifier).cost
        ) {
          maxIdx = i;
        }
      }
      const swapCard = shuffled[fallbackIdx];
      shuffled[fallbackIdx] = playerHand[maxIdx];
      playerHand[maxIdx] = swapCard;
    }
  }

  return {
    stageIndex: params.stageIndex,
    difficulty: params.difficulty,
    playerSchool: params.playerSchool,
    round: 1,
    phase: 'player_main',
    anomaly: ANOMALY_ROTATION[params.stageIndex % ANOMALY_ROTATION.length],

    playerHp: playerMaxHp,
    playerMaxHp,
    playerEther: startingEther,
    playerChannel: startingChannel,
    overloadUsedThisTurn: false,
    ultimatumUsed: false,
    ultimatumActive: false,
    leapUsedThisTurn: false,
    swapUsedThisTurn: false,
    mulliganDone: false,
    altarMode: false,

    chronoRewindUsed: false,
    lastLostAlly: null,
    soulTetherActive: false,
    soulTetherCooldown: 0,
    soulTetherLane: null,
    playerResonance: Math.min(5, Math.max(0, (params.startingResonanceBonus ?? 0) + trialResonanceBonus)),
    chaosBurnLanes: [0, 0, 0, 0],

    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyEther: 2 + trialEtherBonus,
    enemyChannel: 2 + trialEtherBonus,
    enemyOverloaded: false,

    playerEnchantment: null,
    enemyEnchantment: null,
    playerTrap: null,
    enemyTrap: null,

    relics,
    phylacteryUsed: false,
    forgedCards,
    archonRank,
    schoolDoctrineUsedThisTurn: false,
    crossSchoolTriggeredThisTurn: false,
    trialModifier,
    slotAftermath: {
      player: [null, null, null, null],
      enemy: [null, null, null, null],
    },
    ...(params.enableLaneRunes
      ? (() => {
          const runePool: LaneRuneKind[] = ['aegis', 'surge', 'fury'];
          const rRng = createRng(seed + 311);
          const laneA = Math.floor(rRng.next() * LANES) % LANES;
          const laneB = (laneA + 1 + Math.floor(rRng.next() * (LANES - 1))) % LANES;
          const pRunes: Array<LaneRuneKind | null> = [null, null, null, null];
          const firstIdx = Math.floor(rRng.next() * runePool.length) % runePool.length;
          const secondIdx = (firstIdx + 1 + Math.floor(rRng.next() * 2)) % runePool.length;
          pRunes[laneA] = runePool[firstIdx];
          pRunes[laneB] = runePool[secondIdx];
          return {
            laneRunes: {
              player: pRunes,
              enemy: [null, null, null, null] as Array<LaneRuneKind | null>,
            },
          };
        })()
      : {}),
    ...(params.enableQuests
      ? {
          activeQuest: generateDuelQuest(params.stageIndex, params.playerSchool, seed),
          questCounters: createInitialQuestCounters(),
        }
      : {}),

    playerDeck: deckSource,
    playerDrawPile: shuffled,
    playerHand,
    enemyHand,

    playerBoard: [null, null, null, null],
    enemyBoard: [null, null, null, null],

    damageDealtTotal: 0,
    overloadCount: 0,
    nextUid: 1,
    seed: seed + 17,
    lastAiSummary: null,
    combatLog: [],
    pendingEvents: [],
  };
}

function withQuestEvaluation(
  next: DuelState,
  delta?: Partial<QuestProgressCounters>
): DuelState {
  if (!next.activeQuest) return next;
  const prevCounters = next.questCounters ?? createInitialQuestCounters();
  const nextCounters: QuestProgressCounters = {
    summoned: prevCounters.summoned + (delta?.summoned ?? 0),
    spells: prevCounters.spells + (delta?.spells ?? 0),
    shields: prevCounters.shields + (delta?.shields ?? 0),
    resonanceUsed: prevCounters.resonanceUsed + (delta?.resonanceUsed ?? 0),
  };
  const updatedQuest = evaluateQuestProgress(next.activeQuest, nextCounters, next);
  return {
    ...next,
    questCounters: nextCounters,
    activeQuest: updatedQuest,
  };
}

const MAX_COMBAT_LOG = 24;

function appendLog(
  log: CombatLogEntry[],
  entry: Omit<CombatLogEntry, 'id'>
): CombatLogEntry[] {
  const nextId = (log[log.length - 1]?.id ?? 0) + 1;
  const next = [...log, { ...entry, id: nextId }];
  return next.length > MAX_COMBAT_LOG ? next.slice(next.length - MAX_COMBAT_LOG) : next;
}

function appendEventsToLog(
  baseLog: CombatLogEntry[],
  round: number,
  newEvents: CombatEvent[]
): CombatLogEntry[] {
  let log = baseLog;
  for (const ev of newEvents) {
    if (ev.type === 'trap') {
      log = appendLog(log, {
        round,
        actor: ev.side,
        kind: 'trap',
        detail: ev.label ?? 'WARD',
      });
    } else if (ev.type === 'intercept') {
      log = appendLog(log, {
        round,
        actor: ev.side,
        kind: 'intercept',
        detail: `${(ev.fromLane ?? 0) + 1}→${(ev.lane ?? 0) + 1}`,
      });
    } else if (ev.type === 'anomaly') {
      log = appendLog(log, {
        round,
        actor: 'arena',
        kind: 'anomaly',
        detail: ev.label ?? '',
      });
    }
  }
  return log;
}

function drawCardForPlayer(state: DuelState): DuelState {
  if (state.playerHand.length >= MAX_HAND) return state;
  let pile = [...state.playerDrawPile];
  if (pile.length === 0) {
    const rng = createRng(state.seed + state.round * 31);
    pile = shuffleWithRng(state.playerDeck, rng);
  }
  const top = pile.shift();
  if (!top) return state;
  return {
    ...state,
    playerDrawPile: pile,
    playerHand: [...state.playerHand, top],
  };
}

function findFirstEmptyLane(board: Array<BoardCreature | null>): number {
  return board.findIndex((c) => c === null);
}

function cloneBoard(board: Array<BoardCreature | null>): Array<BoardCreature | null> {
  return board.map((c) => (c ? { ...c, keywords: [...c.keywords] } : null));
}

function applyCreatureDeathPassives(
  sideWhoDied: 'player' | 'enemy',
  state: {
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    playerEnchantment: string | null;
    enemyEnchantment: string | null;
    relics: RelicId[];
    damageDealtTotal: number;
    playerSchool?: MagicSchool;
    lastLostAlly?: { creature: BoardCreature; lane: number } | null;
  },
  events: CombatEvent[],
  deadCreature?: BoardCreature,
  deadLane?: number
): void {
  if (sideWhoDied === 'player' && deadCreature && deadLane !== undefined) {
    state.lastLostAlly = {
      creature: { ...deadCreature, keywords: [...deadCreature.keywords] },
      lane: deadLane,
    };
  }
  if (sideWhoDied === 'enemy' && state.relics.includes('relic_soul_harvest')) {
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 1);
    events.push({ type: 'hit_demiurge', side: 'player', amount: -1, label: '+1 HP' });
  }
  // Pyroclasts (Chaos) Doctrine: Ember Fury deals 1 burn DMG when any enemy creature dies
  if (sideWhoDied === 'enemy' && state.playerSchool === 'chaos') {
    state.enemyHp = Math.max(0, state.enemyHp - 1);
    state.damageDealtTotal += 1;
    events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 1, label: '-1 🔥' });
  }
  if (state.playerEnchantment === 'chaos_inferno_altar') {
    state.enemyHp = Math.max(0, state.enemyHp - 2);
    state.damageDealtTotal += 2;
    events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 2, label: '-2' });
  }
  if (state.enemyEnchantment === 'chaos_inferno_altar') {
    state.playerHp = Math.max(0, state.playerHp - 2);
    events.push({ type: 'hit_demiurge', side: 'player', school: 'chaos', amount: 2, label: '-2' });
  }
}

export function triggerOverload(state: DuelState): DuelState {
  if (state.phase !== 'player_main' || state.overloadUsedThisTurn || state.playerHp <= 1) {
    return state;
  }
  const hasBloodPact = state.relics.includes('relic_blood_pact');
  const hpCost = hasBloodPact ? 2 : 3;
  const gain = state.anomaly === 'surge' ? 3 : 2;
  const nextHp = state.playerHp - hpCost;
  const events: CombatEvent[] = [
    ...state.pendingEvents,
    { type: 'overload', side: 'player', amount: gain, label: `+${gain}` },
    { type: 'hit_demiurge', side: 'player', amount: hpCost, label: `-${hpCost}` },
  ];

  const nextBoard = cloneBoard(state.playerBoard);
  if (hasBloodPact) {
    nextBoard.forEach((ally, i) => {
      if (ally) {
        ally.atk += 1;
        events.push({ type: 'veteran', side: 'player', lane: i, uid: ally.uid, label: '+1 ATK' });
      }
    });
  }

  let nextEnemyHp = state.enemyHp;
  let nextDamageTotal = state.damageDealtTotal;
  // Pyroclasts (Chaos) Doctrine: Overload deals 1 Burn to Rival and boosts vanguard +1 ATK
  if (state.playerSchool === 'chaos') {
    nextEnemyHp = Math.max(0, nextEnemyHp - 1);
    nextDamageTotal += 1;
    events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 1, label: '-1 🔥' });
    const vanguardIdx = nextBoard.findIndex((c) => c !== null);
    if (vanguardIdx >= 0 && nextBoard[vanguardIdx]) {
      nextBoard[vanguardIdx]!.atk += 1;
      events.push({
        type: 'veteran',
        side: 'player',
        lane: vanguardIdx,
        uid: nextBoard[vanguardIdx]!.uid,
        school: 'chaos',
        label: '+1 ATK',
      });
    }
  }

  const nextLog = appendLog(state.combatLog, {
    round: state.round,
    actor: 'player',
    kind: 'overload',
    detail: `+${gain}⚡ / -${hpCost} HP`,
  });

  const nextPhase = nextHp <= 0 ? 'defeat' : nextEnemyHp <= 0 ? 'victory' : state.phase;

  return {
    ...state,
    playerHp: nextHp,
    enemyHp: nextEnemyHp,
    damageDealtTotal: nextDamageTotal,
    playerEther: state.playerEther + gain,
    playerBoard: nextBoard,
    overloadUsedThisTurn: true,
    mulliganDone: true,
    playerResonance: Math.min(5, state.playerResonance + 1),
    overloadCount: state.overloadCount + 1,
    phase: nextPhase,
    combatLog: nextLog,
    pendingEvents: events,
  };
}

export function triggerUltimatum(state: DuelState): DuelState {
  if (
    state.phase !== 'player_main' ||
    state.ultimatumUsed ||
    state.playerHp >= state.playerMaxHp * 0.5
  ) {
    return state;
  }

  const events: CombatEvent[] = [...state.pendingEvents];
  let next = { ...state };
  const nextPlayerBoard = cloneBoard(state.playerBoard);
  const nextEnemyBoard = cloneBoard(state.enemyBoard);

  if (state.playerSchool === 'kinet') {
    next = drawCardForPlayer(next);
    next = drawCardForPlayer(next);
    nextPlayerBoard.forEach((ally, i) => {
      if (!ally) return;
      ally.shielded = true;
      if (!ally.keywords.includes('flying')) ally.keywords.push('flying');
      events.push({ type: 'leap_pulse', side: 'player', lane: i, uid: ally.uid, label: 'AEGIS' });
    });
    nextEnemyBoard.forEach((foe, i) => {
      if (!foe) return;
      foe.exhausted = true;
      events.push({ type: 'spell', side: 'player', lane: i, uid: foe.uid, school: 'kinet', label: 'STUN' });
    });
    events.push({ type: 'ultimatum', side: 'player', school: 'kinet', label: 'TEMPEST' });
    return {
      ...next,
      playerBoard: nextPlayerBoard,
      enemyBoard: nextEnemyBoard,
      ultimatumUsed: true,
      ultimatumActive: true,
      mulliganDone: true,
      combatLog: appendLog(next.combatLog, { round: next.round, actor: 'player', kind: 'ultimatum', detail: 'TEMPEST' }),
      pendingEvents: events,
    };
  }

  if (state.playerSchool === 'vital') {
    const heal = 7;
    next.playerHp = Math.min(next.playerMaxHp, next.playerHp + heal);
    events.push({ type: 'hit_demiurge', side: 'player', amount: -heal, label: `+${heal} HP` });
    nextPlayerBoard.forEach((ally, i) => {
      if (!ally) return;
      ally.atk += 1;
      ally.hp += 2;
      ally.maxHp += 2;
      if (!ally.keywords.includes('armor')) ally.keywords.push('armor');
      events.push({ type: 'veteran', side: 'player', lane: i, uid: ally.uid, label: '+1/+2' });
    });
    const emptyLane = findFirstEmptyLane(nextPlayerBoard);
    if (emptyLane >= 0) {
      const uid = `u${next.nextUid++}`;
      nextPlayerBoard[emptyLane] = {
        uid,
        cardId: 'vital_sprout',
        school: 'vital',
        side: 'player',
        lane: emptyLane,
        atk: 2,
        hp: 5,
        maxHp: 5,
        keywords: ['armor'],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'guard',
      };
      events.push({
        type: 'summon',
        side: 'player',
        lane: emptyLane,
        uid,
        cardId: 'vital_sprout',
        atk: 2,
        hp: 5,
        school: 'vital',
        label: '2/5',
      });
    }
    events.push({ type: 'ultimatum', side: 'player', school: 'vital', label: 'GENESIS' });
    return {
      ...next,
      playerBoard: nextPlayerBoard,
      ultimatumUsed: true,
      ultimatumActive: true,
      mulliganDone: true,
      combatLog: appendLog(next.combatLog, { round: next.round, actor: 'player', kind: 'ultimatum', detail: 'GENESIS' }),
      pendingEvents: events,
    };
  }

  if (state.playerSchool === 'chaos') {
    for (let i = 0; i < LANES; i++) {
      const foe = nextEnemyBoard[i];
      if (!foe) continue;
      foe.hp -= 4;
      next.damageDealtTotal += 4;
      events.push({ type: 'spell', side: 'player', lane: i, uid: foe.uid, school: 'chaos', amount: 4, label: '-4' });
      if (foe.hp <= 0) {
        events.push({ type: 'creature_died', side: 'enemy', lane: i, uid: foe.uid });
        nextEnemyBoard[i] = null;
        applyCreatureDeathPassives('enemy', next, events, foe, i);
      }
    }
    next.enemyHp = Math.max(0, next.enemyHp - 3);
    next.damageDealtTotal += 3;
    events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 3, label: '-3' });
    events.push({ type: 'ultimatum', side: 'player', school: 'chaos', label: 'CATACLYSM' });
    return {
      ...next,
      enemyBoard: nextEnemyBoard,
      ultimatumUsed: true,
      ultimatumActive: true,
      mulliganDone: true,
      phase: next.enemyHp <= 0 ? 'victory' : next.phase,
      combatLog: appendLog(next.combatLog, { round: next.round, actor: 'player', kind: 'ultimatum', detail: 'CATACLYSM' }),
      pendingEvents: events,
    };
  }

  // synth (Artificers): Permanent +2 Channel + surge Ether + Shield all allies
  const nextChannel = Math.min(MAX_CHANNEL, state.playerChannel + 2);
  const nextEther = Math.max(state.playerEther * 2, nextChannel + 4);
  nextPlayerBoard.forEach((ally, i) => {
    if (!ally) return;
    ally.shielded = true;
    events.push({ type: 'leap_pulse', side: 'player', lane: i, uid: ally.uid, label: 'SHIELD' });
  });
  events.push({ type: 'ultimatum', side: 'player', school: 'synth', amount: nextEther, label: `x2 (${nextEther})` });
  return {
    ...next,
    playerChannel: nextChannel,
    playerEther: nextEther,
    playerBoard: nextPlayerBoard,
    ultimatumUsed: true,
    ultimatumActive: true,
    mulliganDone: true,
    combatLog: appendLog(next.combatLog, { round: next.round, actor: 'player', kind: 'ultimatum', detail: `x2 (${nextEther})` }),
    pendingEvents: events,
  };
}

export function toggleAltarMode(state: DuelState): DuelState {
  if (state.phase !== 'player_main' || state.playerHand.length === 0) return state;
  return { ...state, altarMode: !state.altarMode };
}

export function sacrificeCardAtAltar(state: DuelState, handIndex: number): DuelState {
  if (state.phase !== 'player_main' || handIndex < 0 || handIndex >= state.playerHand.length) {
    return state;
  }
  const sacrificedId = state.playerHand[handIndex];
  const nextHand = state.playerHand.filter((_, i) => i !== handIndex);
  const events: CombatEvent[] = [...state.pendingEvents];
  const nextBoard = cloneBoard(state.playerBoard);

  const firstIdx = nextBoard.findIndex((c) => c !== null);
  let nextHp = state.playerHp;
  if (firstIdx >= 0 && nextBoard[firstIdx]) {
    const ally = nextBoard[firstIdx]!;
    ally.atk += 1;
    ally.hp += 1;
    ally.maxHp += 1;
    events.push({
      type: 'altar',
      side: 'player',
      lane: firstIdx,
      uid: ally.uid,
      label: '+1/+1 & +1⚡',
    });
  } else {
    nextHp = Math.min(state.playerMaxHp, state.playerHp + 2);
    events.push({
      type: 'altar',
      side: 'player',
      amount: 2,
      label: '+2 HP & +1⚡',
    });
  }

  return {
    ...state,
    altarMode: false,
    mulliganDone: true,
    playerResonance: Math.min(5, state.playerResonance + 1),
    playerHand: nextHand,
    playerEther: state.playerEther + 1,
    playerHp: nextHp,
    playerBoard: nextBoard,
    combatLog: appendLog(state.combatLog, {
      round: state.round,
      actor: 'player',
      kind: 'spell',
      cardId: sacrificedId,
      detail: '+1⚡',
    }),
    pendingEvents: events.concat({
      type: 'spell',
      side: 'player',
      school: CARD_CATALOG[sacrificedId]?.school ?? 'chaos',
    }),
  };
}

export function performMulligan(state: DuelState, replaceIndices: number[]): DuelState {
  if (state.phase !== 'player_main' || state.round !== 1 || state.mulliganDone) {
    return state;
  }
  const unique = Array.from(
    new Set(replaceIndices.filter((idx) => idx >= 0 && idx < state.playerHand.length))
  ).slice(0, 3);
  if (unique.length === 0) {
    return { ...state, mulliganDone: true };
  }

  const removeSet = new Set(unique);
  const kept: string[] = [];
  const returned: string[] = [];
  state.playerHand.forEach((id, idx) => {
    if (removeSet.has(idx)) returned.push(id);
    else kept.push(id);
  });

  const rng = createRng(state.seed + 79);
  const shuffledPile = shuffleWithRng([...state.playerDrawPile, ...returned], rng);
  const drawn = shuffledPile.splice(0, unique.length);
  const nextHand = [...kept, ...drawn];

  // Ensure at least one playable card remains after mulligan
  const hasOpeningPlay = nextHand.some((id) => (CARD_CATALOG[id]?.cost ?? 99) <= state.playerChannel);
  if (!hasOpeningPlay) {
    const cheapIdx = shuffledPile.findIndex((id) => {
      const c = CARD_CATALOG[id];
      return c && c.cost <= state.playerChannel && c.type === 'creature';
    });
    const fallbackIdx =
      cheapIdx >= 0
        ? cheapIdx
        : shuffledPile.findIndex((id) => (CARD_CATALOG[id]?.cost ?? 99) <= state.playerChannel);
    if (fallbackIdx >= 0 && nextHand.length > 0) {
      let maxIdx = 0;
      for (let i = 1; i < nextHand.length; i++) {
        if ((CARD_CATALOG[nextHand[i]]?.cost ?? 0) > (CARD_CATALOG[nextHand[maxIdx]]?.cost ?? 0)) {
          maxIdx = i;
        }
      }
      const swapCard = shuffledPile[fallbackIdx];
      shuffledPile[fallbackIdx] = nextHand[maxIdx];
      nextHand[maxIdx] = swapCard;
    }
  }

  return {
    ...state,
    mulliganDone: true,
    playerHand: nextHand,
    playerDrawPile: shuffledPile,
    seed: state.seed + 13,
    combatLog: appendLog(state.combatLog, {
      round: state.round,
      actor: 'player',
      kind: 'mulligan',
      detail: `${unique.length}`,
    }),
    pendingEvents: [
      ...state.pendingEvents,
      { type: 'leap_pulse', side: 'player', lane: 1, label: `↻${unique.length}` },
    ],
  };
}

export function swapPlayerLanes(state: DuelState, laneA: number, laneB: number): DuelState {
  if (
    state.phase !== 'player_main' ||
    state.swapUsedThisTurn ||
    laneA < 0 ||
    laneA >= LANES ||
    laneB < 0 ||
    laneB >= LANES ||
    laneA === laneB
  ) {
    return state;
  }
  const unitA = state.playerBoard[laneA];
  const unitB = state.playerBoard[laneB];
  if (!unitA && !unitB) return state;

  const nextBoard = cloneBoard(state.playerBoard);
  const movedA = nextBoard[laneA];
  const movedB = nextBoard[laneB];
  nextBoard[laneA] = movedB ? { ...movedB, lane: laneA } : null;
  nextBoard[laneB] = movedA ? { ...movedA, lane: laneB } : null;

  const events: CombatEvent[] = [...state.pendingEvents];
  if (movedA) {
    events.push({ type: 'leap_pulse', side: 'player', lane: laneB, uid: movedA.uid, school: movedA.school, label: '⇄' });
  }
  if (movedB) {
    events.push({ type: 'leap_pulse', side: 'player', lane: laneA, uid: movedB.uid, school: movedB.school, label: '⇄' });
  }

  return {
    ...state,
    playerBoard: nextBoard,
    swapUsedThisTurn: true,
    mulliganDone: true,
    combatLog: appendLog(state.combatLog, {
      round: state.round,
      actor: 'player',
      kind: 'swap',
      detail: `${laneA + 1}↔${laneB + 1}`,
    }),
    pendingEvents: events,
  };
}

export function toggleCreatureStance(state: DuelState, lane: number): DuelState {
  if (state.phase !== 'player_main' || lane < 0 || lane >= LANES) return state;
  const unit = state.playerBoard[lane];
  if (!unit) return state;

  const nextBoard = cloneBoard(state.playerBoard);
  const nextUnit = nextBoard[lane]!;
  nextUnit.stance = nextUnit.stance === 'attack' ? 'guard' : 'attack';
  return {
    ...state,
    mulliganDone: true,
    playerBoard: nextBoard,
    pendingEvents: [
      ...state.pendingEvents,
      {
        type: 'stance',
        side: 'player',
        lane,
        uid: nextUnit.uid,
        label: nextUnit.stance === 'guard' ? 'GUARD' : 'ATTACK',
      },
    ],
  };
}

export function triggerCreatureAbility(
  state: DuelState,
  lane: number,
  preferredEnemyLane?: number
): DuelState {
  if (state.phase !== 'player_main' || lane < 0 || lane >= LANES) return state;
  const unit = state.playerBoard[lane];
  if (!unit || !unit.activeAbility || unit.abilityUsedThisTurn || unit.exhausted || state.playerEther < 1) {
    return state;
  }

  let next = { ...state, playerEther: state.playerEther - 1, mulliganDone: true };
  const nextPlayerBoard = cloneBoard(state.playerBoard);
  const nextEnemyBoard = cloneBoard(state.enemyBoard);
  const events: CombatEvent[] = [...state.pendingEvents];
  const actor = nextPlayerBoard[lane]!;
  actor.abilityUsedThisTurn = true;

  if (unit.activeAbility === 'kinet_chill') {
    const tLane =
      preferredEnemyLane !== undefined && nextEnemyBoard[preferredEnemyLane]
        ? preferredEnemyLane
        : nextEnemyBoard[lane]
          ? lane
          : nextEnemyBoard.findIndex((c) => c !== null);
    if (tLane >= 0 && nextEnemyBoard[tLane]) {
      const foe = nextEnemyBoard[tLane]!;
      foe.atk = Math.max(0, foe.atk - 2);
      foe.exhausted = true;
      events.push({ type: 'ability', side: 'player', lane: tLane, uid: foe.uid, school: 'kinet', label: '-2 ATK' });
    } else {
      next.enemyHp = Math.max(0, next.enemyHp - 1);
      next.damageDealtTotal += 1;
      events.push({ type: 'hit_demiurge', side: 'enemy', school: 'kinet', amount: 1, label: '-1' });
    }
  } else if (unit.activeAbility === 'vital_mend_aura') {
    next.playerHp = Math.min(next.playerMaxHp, next.playerHp + 2);
    events.push({ type: 'hit_demiurge', side: 'player', amount: -2, label: '+2 HP' });
  } else if (unit.activeAbility === 'chaos_spark') {
    const tLane =
      preferredEnemyLane !== undefined && nextEnemyBoard[preferredEnemyLane]
        ? preferredEnemyLane
        : nextEnemyBoard[lane]
          ? lane
          : nextEnemyBoard.findIndex((c) => c !== null);
    if (tLane >= 0 && nextEnemyBoard[tLane]) {
      const foe = nextEnemyBoard[tLane]!;
      foe.hp -= 2;
      next.damageDealtTotal += 2;
      events.push({ type: 'ability', side: 'player', lane: tLane, uid: foe.uid, school: 'chaos', amount: 2, label: '-2' });
      if (foe.hp <= 0) {
        events.push({ type: 'creature_died', side: 'enemy', lane: tLane, uid: foe.uid });
        nextEnemyBoard[tLane] = null;
        applyCreatureDeathPassives('enemy', next, events, foe, tLane);
      }
    } else {
      next.enemyHp = Math.max(0, next.enemyHp - 2);
      next.damageDealtTotal += 2;
      events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 2, label: '-2' });
    }
  } else if (unit.activeAbility === 'synth_shield_forge') {
    const allyLane = nextPlayerBoard.findIndex((c, idx) => c !== null && idx !== lane);
    const targetAlly = allyLane >= 0 ? nextPlayerBoard[allyLane]! : actor;
    const tIdx = allyLane >= 0 ? allyLane : lane;
    targetAlly.shielded = true;
    targetAlly.atk += 1;
    targetAlly.hp += 1;
    targetAlly.maxHp += 1;
    events.push({ type: 'ability', side: 'player', lane: tIdx, uid: targetAlly.uid, school: 'synth', label: '+1/+1 & SHIELD' });
  }

  return withQuestEvaluation(
    {
      ...next,
      playerBoard: nextPlayerBoard,
      enemyBoard: nextEnemyBoard,
      phase: next.enemyHp <= 0 ? 'victory' : next.phase,
      combatLog: appendLog(next.combatLog, {
        round: next.round,
        actor: 'player',
        kind: 'spell',
        cardId: unit.cardId,
        detail: unit.activeAbility,
      }),
      pendingEvents: events,
    },
    { shields: unit.activeAbility === 'synth_shield_forge' ? 1 : 0 }
  );
}

export function triggerRightClickLeap(state: DuelState, targetLane?: number): DuelState {
  if (state.phase !== 'player_main' || state.leapUsedThisTurn) return state;
  const nextBoard = cloneBoard(state.playerBoard);
  const chosenIdx =
    targetLane !== undefined && nextBoard[targetLane]
      ? targetLane
      : nextBoard.findIndex((c) => c !== null);

  const events: CombatEvent[] = [...state.pendingEvents];
  if (chosenIdx >= 0 && nextBoard[chosenIdx]) {
    const ally = nextBoard[chosenIdx]!;
    ally.shielded = true;
    ally.atk += 1;
    events.push({
      type: 'leap_pulse',
      side: 'player',
      lane: chosenIdx,
      uid: ally.uid,
      label: '+1 ATK',
    });
  } else {
    events.push({
      type: 'leap_pulse',
      side: 'player',
      lane: targetLane ?? 1,
      label: '+1 SHIELD',
    });
  }

  return withQuestEvaluation(
    {
      ...state,
      playerBoard: nextBoard,
      leapUsedThisTurn: true,
      mulliganDone: true,
      pendingEvents: events,
    },
    { shields: chosenIdx >= 0 ? 1 : 0 }
  );
}

export function triggerChronoRewind(state: DuelState): DuelState {
  if (state.phase !== 'player_main' || state.chronoRewindUsed) return state;
  const hasRestorableAlly = state.playerBoard.some(
    (c) => c !== null && (c.hp < c.maxHp || Boolean(c.abilityUsedThisTurn) || Boolean(c.exhausted))
  );
  if (!state.lastLostAlly && !hasRestorableAlly) return state;

  const nextBoard = cloneBoard(state.playerBoard);
  const events: CombatEvent[] = [...state.pendingEvents];
  let primaryLane = 1;

  for (let i = 0; i < LANES; i++) {
    const ally = nextBoard[i];
    if (!ally) continue;
    ally.hp = ally.maxHp;
    ally.shielded = true;
    ally.exhausted = false;
    ally.abilityUsedThisTurn = false;
    primaryLane = i;
    events.push({
      type: 'chrono_rewind',
      side: 'player',
      lane: i,
      uid: ally.uid,
      school: 'synth',
      label: 'REWIND',
    });
  }

  let resurrected = false;
  if (state.lastLostAlly) {
    const targetLane =
      nextBoard[state.lastLostAlly.lane] === null
        ? state.lastLostAlly.lane
        : findFirstEmptyLane(nextBoard);
    if (targetLane >= 0) {
      const revived: BoardCreature = {
        ...state.lastLostAlly.creature,
        keywords: [...state.lastLostAlly.creature.keywords],
        lane: targetLane,
        hp: state.lastLostAlly.creature.maxHp,
        shielded: true,
        exhausted: false,
        abilityUsedThisTurn: false,
      };
      nextBoard[targetLane] = revived;
      primaryLane = targetLane;
      resurrected = true;
      events.push({
        type: 'summon',
        side: 'player',
        lane: targetLane,
        uid: revived.uid,
        cardId: revived.cardId,
        atk: revived.atk,
        hp: revived.hp,
        school: revived.school,
        label: `${revived.atk}/${revived.hp}`,
      });
      events.push({
        type: 'chrono_rewind',
        side: 'player',
        lane: targetLane,
        uid: revived.uid,
        school: revived.school,
        label: 'CHRONO-REVIVE!',
      });
    }
  }

  if (!resurrected && !hasRestorableAlly) return state;

  return {
    ...state,
    playerBoard: nextBoard,
    chronoRewindUsed: true,
    lastLostAlly: null,
    mulliganDone: true,
    combatLog: appendLog(state.combatLog, {
      round: state.round,
      actor: 'player',
      kind: 'chrono',
      detail: `Lane ${primaryLane + 1}`,
    }),
    pendingEvents: events,
  };
}

export function triggerSoulTether(state: DuelState, preferredLane?: number): DuelState {
  if (state.phase !== 'player_main' || state.soulTetherActive || state.soulTetherCooldown > 0) {
    return state;
  }
  const nextBoard = cloneBoard(state.playerBoard);
  let chosenLane =
    preferredLane !== undefined && nextBoard[preferredLane] ? preferredLane : -1;
  if (chosenLane === -1) {
    chosenLane = nextBoard.findIndex((c) => c !== null && c.stance === 'guard');
  }
  if (chosenLane === -1) {
    chosenLane = nextBoard.findIndex((c) => c !== null);
  }

  let nextPlayerHp = state.playerHp;
  let uid: string | undefined;
  let detailLabel = '50%';
  if (chosenLane >= 0 && nextBoard[chosenLane]) {
    const ally = nextBoard[chosenLane]!;
    ally.hp += 2;
    ally.maxHp += 2;
    ally.shielded = true;
    uid = ally.uid;
    detailLabel = `50% (${chosenLane + 1})`;
  } else {
    nextPlayerHp = Math.min(state.playerMaxHp, state.playerHp + 1);
  }

  return withQuestEvaluation(
    {
      ...state,
      playerHp: nextPlayerHp,
      playerBoard: nextBoard,
      soulTetherActive: true,
      soulTetherCooldown: 2,
      soulTetherLane: chosenLane >= 0 ? chosenLane : null,
      mulliganDone: true,
      combatLog: appendLog(state.combatLog, {
        round: state.round,
        actor: 'player',
        kind: 'tether',
        detail: detailLabel,
      }),
      pendingEvents: [
        ...state.pendingEvents,
        {
          type: 'soul_tether',
          side: 'player',
          lane: chosenLane >= 0 ? chosenLane : undefined,
          uid,
          school: state.playerSchool,
          label: 'TETHER 50%',
        },
      ],
    },
    { shields: chosenLane >= 0 ? 1 : 0 }
  );
}

export function triggerResonanceApotheosis(state: DuelState): DuelState {
  if (state.phase !== 'player_main' || state.playerResonance < 5) return state;

  let next: DuelState = { ...state, playerResonance: 0, mulliganDone: true };
  const nextPlayerBoard = cloneBoard(state.playerBoard);
  const nextEnemyBoard = cloneBoard(state.enemyBoard);
  const events: CombatEvent[] = [...state.pendingEvents];
  const passiveTrack = {
    playerHp: next.playerHp,
    playerMaxHp: next.playerMaxHp,
    enemyHp: next.enemyHp,
    enemyMaxHp: next.enemyMaxHp,
    playerEnchantment: next.playerEnchantment,
    enemyEnchantment: next.enemyEnchantment,
    relics: next.relics,
    damageDealtTotal: next.damageDealtTotal,
    playerSchool: next.playerSchool,
    lastLostAlly: next.lastLostAlly,
  };
  const nextAftermath = cloneSlotAftermath(state.slotAftermath);

  let burstLabel = 'APOTHEOSIS';
  if (state.playerSchool === 'kinet') {
    burstLabel = 'GALE SHATTER';
    next = drawCardForPlayer(next);
    let bestLane = -1;
    let bestAtk = -1;
    for (let i = 0; i < LANES; i++) {
      const foe = nextEnemyBoard[i];
      if (!foe) continue;
      foe.stance = 'attack';
      foe.shielded = false;
      if (foe.atk > bestAtk) {
        bestAtk = foe.atk;
        bestLane = i;
      }
    }
    if (bestLane >= 0 && nextEnemyBoard[bestLane]) {
      const foe = nextEnemyBoard[bestLane]!;
      foe.hp -= 2;
      passiveTrack.damageDealtTotal += 2;
      events.push({ type: 'spell', side: 'player', lane: bestLane, uid: foe.uid, school: 'kinet', amount: 2, label: '-2' });
      if (foe.hp <= 0) {
        events.push({ type: 'creature_died', side: 'enemy', lane: bestLane, uid: foe.uid });
        nextEnemyBoard[bestLane] = null;
        applyCreatureDeathPassives('enemy', passiveTrack, events, foe, bestLane);
      }
    } else {
      passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - 2);
      passiveTrack.damageDealtTotal += 2;
      events.push({ type: 'hit_demiurge', side: 'enemy', school: 'kinet', amount: 2, label: '-2' });
    }
  } else if (state.playerSchool === 'synth') {
    burstLabel = 'SOLAR BARRAGE';
    let hitEnemy = false;
    for (let i = 0; i < LANES; i++) {
      const foe = nextEnemyBoard[i];
      if (!foe) continue;
      hitEnemy = true;
      foe.hp -= 2;
      passiveTrack.damageDealtTotal += 2;
      events.push({ type: 'spell', side: 'player', lane: i, uid: foe.uid, school: 'synth', amount: 2, label: '-2' });
      if (foe.hp <= 0) {
        events.push({ type: 'creature_died', side: 'enemy', lane: i, uid: foe.uid });
        nextEnemyBoard[i] = null;
        applyCreatureDeathPassives('enemy', passiveTrack, events, foe, i);
      }
    }
    if (!hitEnemy) {
      passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - 2);
      passiveTrack.damageDealtTotal += 2;
      events.push({ type: 'hit_demiurge', side: 'enemy', school: 'synth', amount: 2, label: '-2' });
    }
    for (let i = 0; i < LANES; i++) {
      const ally = nextPlayerBoard[i];
      if (!ally) continue;
      ally.shielded = true;
      ally.atk += 1;
      ally.hp += 1;
      ally.maxHp += 1;
      events.push({ type: 'veteran', side: 'player', lane: i, uid: ally.uid, school: 'synth', label: '+1/+1' });
    }
  } else if (state.playerSchool === 'chaos') {
    burstLabel = 'CINDER RIFT';
    for (let i = 0; i < LANES; i++) {
      const foe = nextEnemyBoard[i];
      if (!foe) continue;
      foe.hp -= 3;
      passiveTrack.damageDealtTotal += 3;
      events.push({ type: 'spell', side: 'player', lane: i, uid: foe.uid, school: 'chaos', amount: 3, label: '-3' });
      if (foe.hp <= 0) {
        events.push({ type: 'creature_died', side: 'enemy', lane: i, uid: foe.uid });
        nextEnemyBoard[i] = null;
        nextAftermath.enemy[i] = 'chaos';
        applyCreatureDeathPassives('enemy', passiveTrack, events, foe, i);
      }
    }
    passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - 2);
    passiveTrack.damageDealtTotal += 2;
    events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 2, label: '-2' });
    next.chaosBurnLanes = [2, 2, 2, 2];
  } else {
    burstLabel = 'VERDANT BLOOM';
    passiveTrack.playerHp = Math.min(passiveTrack.playerMaxHp, passiveTrack.playerHp + 5);
    events.push({ type: 'hit_demiurge', side: 'player', school: 'vital', amount: -5, label: '+5 HP' });
    for (let i = 0; i < LANES; i++) {
      const ally = nextPlayerBoard[i];
      if (!ally) continue;
      ally.atk += 1;
      ally.hp += 2;
      ally.maxHp += 2;
      if (!ally.keywords.includes('armor')) ally.keywords.push('armor');
      events.push({ type: 'veteran', side: 'player', lane: i, uid: ally.uid, school: 'vital', label: '+1/+2' });
    }
  }

  events.push({
    type: 'resonance',
    side: 'player',
    school: state.playerSchool,
    label: burstLabel,
  });

  return withQuestEvaluation(
    {
      ...next,
      playerHp: passiveTrack.playerHp,
      enemyHp: passiveTrack.enemyHp,
      damageDealtTotal: passiveTrack.damageDealtTotal,
      lastLostAlly: passiveTrack.lastLostAlly,
      playerBoard: nextPlayerBoard,
      enemyBoard: nextEnemyBoard,
      slotAftermath: nextAftermath,
      phase: passiveTrack.enemyHp <= 0 ? 'victory' : next.phase,
      combatLog: appendLog(next.combatLog, {
        round: next.round,
        actor: 'player',
        kind: 'resonance',
        detail: burstLabel,
      }),
      pendingEvents: events,
    },
    { resonanceUsed: 1 }
  );
}

function maybeTriggerEnemyTrapOnPlayerAction(
  next: DuelState,
  action: 'spell' | 'summon',
  summonedLane: number | undefined,
  nextPlayerBoard: Array<BoardCreature | null>,
  nextEnemyBoard: Array<BoardCreature | null>,
  events: CombatEvent[]
): boolean {
  const trap = next.enemyTrap;
  if (!trap) return false;

  if (action === 'spell' && trap === 'synth_stasis_ward') {
    next.enemyTrap = null;
    events.push({ type: 'trap', side: 'enemy', school: 'synth', label: 'NEGATED!' });
    return true;
  }

  if (action === 'spell' && trap === 'chaos_cinder_trap') {
    next.enemyTrap = null;
    events.push({ type: 'trap', side: 'enemy', school: 'chaos', label: 'CINDER TRAP!' });
    for (let i = 0; i < LANES; i++) {
      const p = nextPlayerBoard[i];
      if (!p) continue;
      p.hp -= 3;
      events.push({ type: 'hit_creature', side: 'player', lane: i, uid: p.uid, amount: 3, label: '-3' });
      if (p.hp <= 0) {
        events.push({ type: 'creature_died', side: 'player', lane: i, uid: p.uid });
        nextPlayerBoard[i] = null;
        applyCreatureDeathPassives('player', next, events, p, i);
      }
    }
    return false;
  }

  if (action === 'summon' && trap === 'vital_bramble_trap' && summonedLane !== undefined) {
    next.enemyTrap = null;
    events.push({ type: 'trap', side: 'enemy', school: 'vital', label: 'BRAMBLE TRAP!' });
    const target = nextPlayerBoard[summonedLane];
    if (target) {
      target.hp -= 3;
      events.push({ type: 'hit_creature', side: 'player', lane: summonedLane, uid: target.uid, amount: 3, label: '-3' });
      if (target.hp <= 0) {
        events.push({ type: 'creature_died', side: 'player', lane: summonedLane, uid: target.uid });
        nextPlayerBoard[summonedLane] = null;
        applyCreatureDeathPassives('player', next, events, target, summonedLane);
      }
    }
    const eFirst = nextEnemyBoard.findIndex((c) => c !== null);
    if (eFirst >= 0 && nextEnemyBoard[eFirst]) {
      nextEnemyBoard[eFirst]!.hp += 1;
      nextEnemyBoard[eFirst]!.maxHp += 1;
    }
    return false;
  }

  return false;
}

function cloneSlotAftermath(aftermath?: {
  player: SlotAftermathKind[];
  enemy: SlotAftermathKind[];
}): { player: SlotAftermathKind[]; enemy: SlotAftermathKind[] } {
  return {
    player: aftermath?.player ? [...aftermath.player] : [null, null, null, null],
    enemy: aftermath?.enemy ? [...aftermath.enemy] : [null, null, null, null],
  };
}

function applyCrossSchoolSpark(
  state: DuelState,
  cardSchool: MagicSchool,
  nextPlayerBoard: Array<BoardCreature | null>,
  nextEnemyBoard: Array<BoardCreature | null>,
  aftermath: { player: SlotAftermathKind[]; enemy: SlotAftermathKind[] },
  events: CombatEvent[],
  log: CombatLogEntry[]
): { log: CombatLogEntry[]; triggered: boolean } {
  if (state.crossSchoolTriggeredThisTurn || cardSchool === state.playerSchool) {
    return { log, triggered: false };
  }
  if (cardSchool === 'kinet') {
    state.playerResonance = Math.min(5, state.playerResonance + 1);
    state.playerEther += 1;
    events.push({ type: 'leap_pulse', side: 'player', school: 'kinet', label: '+1⚡ +RES' });
  } else if (cardSchool === 'vital') {
    state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 2);
    events.push({ type: 'hit_demiurge', side: 'player', school: 'vital', amount: -2, label: '+2 HP' });
  } else if (cardSchool === 'chaos') {
    const enemyIdx = nextEnemyBoard.findIndex((c) => c !== null);
    if (enemyIdx >= 0 && nextEnemyBoard[enemyIdx]) {
      const foe = nextEnemyBoard[enemyIdx]!;
      foe.hp -= 1;
      state.damageDealtTotal += 1;
      events.push({ type: 'spell', side: 'player', lane: enemyIdx, uid: foe.uid, school: 'chaos', amount: 1, label: '-1 🔥' });
      if (foe.hp <= 0) {
        events.push({ type: 'creature_died', side: 'enemy', lane: enemyIdx, uid: foe.uid });
        nextEnemyBoard[enemyIdx] = null;
        aftermath.enemy[enemyIdx] = 'chaos';
        applyCreatureDeathPassives('enemy', state, events, foe, enemyIdx);
      }
    } else {
      state.enemyHp = Math.max(0, state.enemyHp - 1);
      state.damageDealtTotal += 1;
      events.push({ type: 'hit_demiurge', side: 'enemy', school: 'chaos', amount: 1, label: '-1 🔥' });
    }
  } else {
    let weakestIdx = -1;
    let lowestHp = Infinity;
    for (let i = 0; i < LANES; i++) {
      const ally = nextPlayerBoard[i];
      if (ally && ally.hp < lowestHp) {
        lowestHp = ally.hp;
        weakestIdx = i;
      }
    }
    if (weakestIdx >= 0 && nextPlayerBoard[weakestIdx]) {
      nextPlayerBoard[weakestIdx]!.shielded = true;
      events.push({
        type: 'leap_pulse',
        side: 'player',
        lane: weakestIdx,
        uid: nextPlayerBoard[weakestIdx]!.uid,
        school: 'synth',
        label: 'SHIELD',
      });
    } else {
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + 1);
      events.push({ type: 'hit_demiurge', side: 'player', school: 'synth', amount: -1, label: '+1 HP' });
    }
  }
  const nextLog = appendLog(log, {
    round: state.round,
    actor: 'player',
    kind: 'cross',
    detail: cardSchool.toUpperCase(),
  });
  return { log: nextLog, triggered: true };
}

export function fuseCreatureFromHand(
  state: DuelState,
  handIndex: number,
  targetLane: number
): DuelState {
  if (state.phase !== 'player_main' || state.altarMode) return state;
  if (targetLane < 0 || targetLane >= LANES) return state;
  const target = state.playerBoard[targetLane];
  if (!target) return state;

  const cardId = state.playerHand[handIndex];
  const card = cardId ? CARD_CATALOG[cardId] : undefined;
  const effStats = cardId
    ? getCardEffectiveStats(cardId, state.forgedCards, state.trialModifier)
    : undefined;
  if (!card || !effStats || card.type !== 'creature' || state.playerEther < effStats.cost) return state;

  let next = { ...state };
  const prevEventsLen = state.pendingEvents.length;
  const events: CombatEvent[] = [...state.pendingEvents];
  const nextPlayerBoard = cloneBoard(state.playerBoard);
  const nextEnemyBoard = cloneBoard(state.enemyBoard);
  const nextAftermath = cloneSlotAftermath(state.slotAftermath);
  const fused = nextPlayerBoard[targetLane]!;

  const atkGain = Math.max(1, Math.ceil(effStats.atk * 0.75));
  const hpGain = Math.max(1, Math.ceil(effStats.hp * 0.75));
  fused.atk += atkGain;
  fused.hp += hpGain;
  fused.maxHp += hpGain;
  fused.veteranCount += 1;
  fused.shielded = true;
  for (const kw of card.keywords) {
    if (!fused.keywords.includes(kw)) fused.keywords.push(kw);
  }
  if (!fused.activeAbility && card.activeAbility) {
    fused.activeAbility = card.activeAbility;
    fused.abilityUsedThisTurn = false;
  }

  events.push({
    type: 'veteran',
    side: 'player',
    lane: targetLane,
    uid: fused.uid,
    school: card.school,
    label: `+${atkGain}/+${hpGain}`,
  });
  events.push({
    type: 'leap_pulse',
    side: 'player',
    lane: targetLane,
    uid: fused.uid,
    school: card.school,
  });

  if (card.keywords.includes('heal')) {
    next.playerHp = Math.min(next.playerMaxHp, next.playerHp + 2);
    events.push({ type: 'hit_demiurge', side: 'player', amount: -2, label: '+2 HP' });
  }

  maybeTriggerEnemyTrapOnPlayerAction(next, 'summon', targetLane, nextPlayerBoard, nextEnemyBoard, events);

  const crossRes = applyCrossSchoolSpark(
    next,
    card.school,
    nextPlayerBoard,
    nextEnemyBoard,
    nextAftermath,
    events,
    state.combatLog
  );

  let nextLog = appendLog(crossRes.log, {
    round: state.round,
    actor: 'player',
    kind: 'ascend',
    cardId: fused.cardId,
    detail: `+${atkGain}/+${hpGain}`,
  });
  nextLog = appendEventsToLog(nextLog, state.round, events.slice(prevEventsLen));

  next.playerBoard = nextPlayerBoard;
  next.enemyBoard = nextEnemyBoard;
  next.slotAftermath = nextAftermath;
  if (crossRes.triggered) next.crossSchoolTriggeredThisTurn = true;
  next.playerEther -= effStats.cost;
  next.playerHand = state.playerHand.filter((_, i) => i !== handIndex);
  next.mulliganDone = true;
  next.playerResonance = Math.min(5, next.playerResonance + 1);
  next.combatLog = nextLog;
  next.pendingEvents = events;
  return withQuestEvaluation(next, { summoned: 1, shields: 1 });
}

export function playCardFromHand(
  state: DuelState,
  handIndex: number,
  preferredLane?: number
): DuelState {
  if (state.phase !== 'player_main') return state;
  if (state.altarMode) return sacrificeCardAtAltar(state, handIndex);

  const cardId = state.playerHand[handIndex];
  if (!cardId) return state;
  const card: CardDef | undefined = CARD_CATALOG[cardId];
  const effStats = getCardEffectiveStats(cardId, state.forgedCards, state.trialModifier);
  if (!card || state.playerEther < effStats.cost) return state;

  let next = { ...state };
  const prevEventsLen = state.pendingEvents.length;
  const events: CombatEvent[] = [...state.pendingEvents];
  const nextEnemyBoard = cloneBoard(state.enemyBoard);
  const nextPlayerBoard = cloneBoard(state.playerBoard);
  const nextAftermath = cloneSlotAftermath(state.slotAftermath);

  let runeLogEntry: Omit<CombatLogEntry, 'id'> | null = null;
  let shieldsGrantedCount = 0;

  if (card.type === 'creature') {
    const lane =
      preferredLane !== undefined && preferredLane >= 0 && preferredLane < LANES && nextPlayerBoard[preferredLane] === null
        ? preferredLane
        : findFirstEmptyLane(nextPlayerBoard);
    if (lane === -1) return state; // board full

    const flyingBonus = state.anomaly === 'winds' && card.keywords.includes('flying') ? 1 : 0;
    const tempestBonus = next.playerEnchantment === 'kinet_tempest_aura' && card.keywords.includes('flying') ? 1 : 0;
    const crestBonus = next.relics.includes('relic_veteran_crest') ? 1 : 0;
    const bastionHpBonus = state.anomaly === 'bastion' ? 1 : 0;

    let baseAtk = effStats.atk + flyingBonus + tempestBonus + crestBonus;
    let baseHp = effStats.hp + bastionHpBonus + tempestBonus + crestBonus;
    const uid = `u${state.nextUid}`;

    const grantDoctrineShield =
      !next.schoolDoctrineUsedThisTurn &&
      ((next.playerSchool === 'kinet' && card.keywords.includes('flying')) ||
        (next.playerSchool === 'synth' && card.school === 'synth'));
    if (grantDoctrineShield) {
      next.schoolDoctrineUsedThisTurn = true;
    }

    const activeRune = next.laneRunes?.player[lane] ?? null;
    let runeShield = false;
    if (activeRune && next.laneRunes) {
      next.laneRunes = {
        player: [...next.laneRunes.player],
        enemy: [...next.laneRunes.enemy],
      };
      next.laneRunes.player[lane] = null;
      if (activeRune === 'aegis') {
        runeShield = true;
        baseHp += 1;
      } else if (activeRune === 'surge') {
        next.playerEther += 1;
        next.playerResonance = Math.min(5, next.playerResonance + 1);
      } else if (activeRune === 'fury') {
        baseAtk += 2;
      }
      runeLogEntry = {
        round: next.round,
        actor: 'player',
        kind: 'rune',
        cardId: card.id,
        detail: activeRune.toUpperCase(),
      };
    }

    const enteredShielded = grantDoctrineShield || runeShield;
    if (enteredShielded) shieldsGrantedCount += 1;

    nextPlayerBoard[lane] = {
      uid,
      cardId: card.id,
      school: card.school,
      side: 'player',
      lane,
      atk: baseAtk,
      hp: baseHp,
      maxHp: baseHp,
      keywords: [...card.keywords],
      veteranCount: effStats.forgeTier,
      shielded: enteredShielded,
      summonSick: false,
      stance: 'attack',
      activeAbility: card.activeAbility,
      abilityUsedThisTurn: false,
    };

    events.push({
      type: 'summon',
      side: 'player',
      lane,
      uid,
      cardId: card.id,
      atk: baseAtk,
      hp: baseHp,
      school: card.school,
      label: `${baseAtk}/${baseHp}`,
    });

    if (activeRune === 'aegis') {
      events.push({ type: 'leap_pulse', side: 'player', lane, uid, school: card.school, label: 'RUNE: AEGIS +0/+1' });
    } else if (activeRune === 'surge') {
      events.push({ type: 'leap_pulse', side: 'player', lane, uid, school: card.school, label: 'RUNE: +1⚡ +RES' });
    } else if (activeRune === 'fury') {
      events.push({ type: 'veteran', side: 'player', lane, uid, school: card.school, label: 'RUNE: FURY +2 ATK' });
    }

    if (card.keywords.includes('heal')) {
      next.playerHp = Math.min(next.playerMaxHp, next.playerHp + 2);
      events.push({ type: 'hit_demiurge', side: 'player', amount: -2, label: '+2 HP' });
    }

    // Verdants (Vital) Doctrine: Living Roots heals +1 HP on every creature summon
    if (next.playerSchool === 'vital') {
      next.playerHp = Math.min(next.playerMaxHp, next.playerHp + 1);
      events.push({ type: 'hit_demiurge', side: 'player', school: 'vital', amount: -1, label: '+1 HP' });
    }

    maybeTriggerEnemyTrapOnPlayerAction(next, 'summon', lane, nextPlayerBoard, nextEnemyBoard, events);

    next.playerBoard = nextPlayerBoard;
    next.enemyBoard = nextEnemyBoard;
    next.nextUid += 1;
  } else if (card.type === 'enchantment') {
    next.playerEnchantment = card.id;
    events.push({
      type: 'enchant',
      side: 'player',
      school: card.school,
      label: 'ENCHANT',
    });
  } else if (card.type === 'trap') {
    next.playerTrap = card.id;
    events.push({
      type: 'trap',
      side: 'player',
      school: card.school,
      label: 'WARD SET',
    });
  } else if (card.spellEffect) {
    const isOffenseSpell = card.type === 'spell';
    const negated = isOffenseSpell
      ? maybeTriggerEnemyTrapOnPlayerAction(next, 'spell', undefined, nextPlayerBoard, nextEnemyBoard, events)
      : false;

    if (!negated) {
      const eff = card.spellEffect;
      const spellBonus =
        (state.anomaly === 'rift' ? 1 : 0) +
        (next.relics.includes('relic_arcane_lens') ? 1 : 0) +
        (next.playerEnchantment === 'kinet_tempest_aura' ? 1 : 0);

      if (eff.kind === 'damage_target' || eff.kind === 'drain_channel' || eff.kind === 'execute_or_burn' || eff.kind === 'pulse_draw') {
        const dmg = effStats.spellAmount + spellBonus;
        const targetLane =
          preferredLane !== undefined && nextEnemyBoard[preferredLane]
            ? preferredLane
            : nextEnemyBoard.findIndex((c) => c !== null);

        if (targetLane >= 0 && nextEnemyBoard[targetLane]) {
          const target = nextEnemyBoard[targetLane]!;
          const lethalExec = eff.kind === 'execute_or_burn' && target.hp <= 4 + effStats.forgeTier;
          const appliedDmg = lethalExec ? target.hp : dmg;
          target.hp -= appliedDmg;
          events.push({
            type: 'spell',
            side: 'player',
            lane: targetLane,
            uid: target.uid,
            school: card.school,
            amount: appliedDmg,
            label: lethalExec ? 'SHATTER!' : `-${appliedDmg}`,
          });
          if (target.hp <= 0) {
            events.push({ type: 'creature_died', side: 'enemy', lane: targetLane, uid: target.uid });
            nextEnemyBoard[targetLane] = null;
            if (card.school === 'chaos') nextAftermath.enemy[targetLane] = 'chaos';
            applyCreatureDeathPassives('enemy', next, events, target, targetLane);
          }
          next.damageDealtTotal += appliedDmg;
        } else {
          next.enemyHp -= dmg;
          next.damageDealtTotal += dmg;
          events.push({
            type: 'hit_demiurge',
            side: 'enemy',
            school: card.school,
            amount: dmg,
            label: `-${dmg}`,
          });
        }

        if (eff.kind === 'drain_channel') {
          next.playerChannel = Math.min(MAX_CHANNEL, next.playerChannel + 1);
          events.push({ type: 'spell', side: 'player', school: 'kinet', label: '+1 MAX ⚡' });
        } else if (eff.kind === 'pulse_draw') {
          next = drawCardForPlayer(next);
        }
      } else if (eff.kind === 'aoe_enemy') {
        const dmg = effStats.spellAmount + spellBonus;
        for (let i = 0; i < LANES; i++) {
          const t = nextEnemyBoard[i];
          if (!t) continue;
          t.hp -= dmg;
          next.damageDealtTotal += dmg;
          events.push({
            type: 'spell',
            side: 'player',
            lane: i,
            uid: t.uid,
            school: card.school,
            amount: dmg,
            label: `-${dmg}`,
          });
          if (t.hp <= 0) {
            events.push({ type: 'creature_died', side: 'enemy', lane: i, uid: t.uid });
            nextEnemyBoard[i] = null;
            if (card.school === 'chaos') nextAftermath.enemy[i] = 'chaos';
            applyCreatureDeathPassives('enemy', next, events, t, i);
          }
        }
      } else if (eff.kind === 'buff_ally') {
        const atkUp = effStats.spellAmount;
        const hpUp = effStats.hpBonus || atkUp;
        for (let i = 0; i < LANES; i++) {
          const ally = nextPlayerBoard[i];
          if (!ally) continue;
          ally.atk += atkUp;
          ally.hp += hpUp;
          ally.maxHp += hpUp;
          ally.shielded = true;
          events.push({
            type: 'spell',
            side: 'player',
            lane: i,
            uid: ally.uid,
            school: card.school,
            label: `+${atkUp}/+${hpUp}`,
          });
        }
      } else if (eff.kind === 'heal_and_buff') {
        const healAmt = effStats.spellAmount + spellBonus;
        next.playerHp = Math.min(next.playerMaxHp, next.playerHp + healAmt);
        events.push({ type: 'hit_demiurge', side: 'player', amount: -healAmt, label: `+${healAmt} HP` });
        const allyIdx = nextPlayerBoard.findIndex((c) => c !== null);
        if (allyIdx >= 0 && nextPlayerBoard[allyIdx]) {
          const a = nextPlayerBoard[allyIdx]!;
          const buffAmt = 1 + effStats.forgeTier;
          a.atk += buffAmt;
          a.hp += buffAmt;
          a.maxHp += buffAmt;
          events.push({ type: 'veteran', side: 'player', lane: allyIdx, uid: a.uid, label: `+${buffAmt}/+${buffAmt}` });
        }
      } else if (eff.kind === 'double_hp_armor') {
        const allyIdx =
          preferredLane !== undefined && nextPlayerBoard[preferredLane]
            ? preferredLane
            : nextPlayerBoard.findIndex((c) => c !== null);
        if (allyIdx >= 0 && nextPlayerBoard[allyIdx]) {
          const a = nextPlayerBoard[allyIdx]!;
          a.maxHp = a.hp * 2;
          a.hp *= 2;
          if (!a.keywords.includes('armor')) a.keywords.push('armor');
          events.push({ type: 'spell', side: 'player', lane: allyIdx, uid: a.uid, school: 'vital', label: 'x2 HP' });
        }
      } else if (eff.kind === 'gain_ether') {
        next.playerEther += effStats.spellAmount;
        events.push({
          type: 'spell',
          side: 'player',
          school: card.school,
          amount: effStats.spellAmount,
          label: `+${effStats.spellAmount} ETHER`,
        });
      }
    }

    next.enemyBoard = nextEnemyBoard;
    next.playerBoard = nextPlayerBoard;
  }

  const crossRes = applyCrossSchoolSpark(
    next,
    card.school,
    nextPlayerBoard,
    nextEnemyBoard,
    nextAftermath,
    events,
    next.combatLog
  );
  if (crossRes.triggered) next.crossSchoolTriggeredThisTurn = true;
  next.slotAftermath = nextAftermath;

  let nextLog = appendLog(crossRes.log, {
    round: next.round,
    actor: 'player',
    kind: card.type === 'creature' ? 'summon' : card.type === 'trap' ? 'trap' : 'spell',
    cardId: card.id,
    detail: card.type === 'creature' ? `${effStats.atk}/${effStats.hp}` : `${effStats.cost}⚡`,
  });
  if (runeLogEntry) {
    nextLog = appendLog(nextLog, runeLogEntry);
  }
  nextLog = appendEventsToLog(nextLog, next.round, events.slice(prevEventsLen));

  next.playerEther -= effStats.cost;
  // Zephyrites (Kinet) Doctrine: Windstep refunds +1 Ether on first Spell/Ritual each turn
  if (
    next.playerSchool === 'kinet' &&
    !next.schoolDoctrineUsedThisTurn &&
    (card.type === 'spell' || card.type === 'ritual')
  ) {
    next.schoolDoctrineUsedThisTurn = true;
    next.playerEther += 1;
    events.push({ type: 'leap_pulse', side: 'player', school: 'kinet', label: '+1⚡ WINDSTEP' });
  }
  next.playerHand = state.playerHand.filter((_, i) => i !== handIndex);
  next.mulliganDone = true;
  next.playerResonance = Math.min(5, next.playerResonance + 1);
  next.combatLog = nextLog;
  next.pendingEvents = events;

  if (next.enemyHp <= 0) {
    next.enemyHp = 0;
    next.phase = 'victory';
  }
  if (card.spellEffect?.kind === 'buff_ally') {
    shieldsGrantedCount += nextPlayerBoard.filter((c) => c !== null).length;
  }
  return withQuestEvaluation(next, {
    summoned: card.type === 'creature' ? 1 : 0,
    spells: card.type === 'spell' || card.type === 'ritual' ? 1 : 0,
    shields: shieldsGrantedCount,
  });
}

function findAdjacentGuard(
  defB: Array<BoardCreature | null>,
  lane: number,
  attackerHasFlying: boolean,
  usedGuards: Set<string>
): number {
  const candidates = [lane - 1, lane + 1].filter((l) => l >= 0 && l < LANES);
  for (const gLane of candidates) {
    const g = defB[gLane];
    if (!g) continue;
    if (g.stance !== 'guard' || g.exhausted || usedGuards.has(g.uid)) continue;
    if (attackerHasFlying && !g.keywords.includes('flying')) continue;
    return gLane;
  }
  return -1;
}

function resolveCombatSide(
  attackingSide: 'player' | 'enemy',
  attackerBoard: Array<BoardCreature | null>,
  defenderBoard: Array<BoardCreature | null>,
  defenderHp: number,
  ultimatumDouble: boolean,
  defendingRelics: RelicId[],
  stateForPassives: {
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    playerEnchantment: string | null;
    enemyEnchantment: string | null;
    playerTrap: string | null;
    enemyTrap: string | null;
    relics: RelicId[];
    damageDealtTotal: number;
    playerSchool?: MagicSchool;
    soulTetherActive?: boolean;
    lastLostAlly?: { creature: BoardCreature; lane: number } | null;
    bossPassive?: BossPassiveId;
    slotAftermath?: { player: SlotAftermathKind[]; enemy: SlotAftermathKind[] };
  },
  events: CombatEvent[]
): {
  attackerBoard: Array<BoardCreature | null>;
  defenderBoard: Array<BoardCreature | null>;
  defenderHp: number;
  damageDealt: number;
  nextUidDelta: number;
} {
  const atkB = cloneBoard(attackerBoard);
  const defB = cloneBoard(defenderBoard);
  let hp = defenderHp;
  let damageDealt = 0;
  let nextUidDelta = 0;
  const defendingSide = attackingSide === 'player' ? 'enemy' : 'player';
  const usedGuards = new Set<string>();

  for (let lane = 0; lane < LANES; lane++) {
    const atk = atkB[lane];
    if (!atk || atk.stance === 'guard' || atk.exhausted) continue;

    let defLane = lane;
    let def = defB[lane];
    const atkFlying = atk.keywords.includes('flying');
    const directBlocked = def !== null && (!atkFlying || def.keywords.includes('flying'));

    if (!directBlocked) {
      const interceptLane = findAdjacentGuard(defB, lane, atkFlying, usedGuards);
      if (interceptLane >= 0) {
        defLane = interceptLane;
        def = defB[interceptLane];
        if (def) {
          usedGuards.add(def.uid);
          events.push({
            type: 'intercept',
            side: defendingSide,
            lane,
            fromLane: interceptLane,
            uid: def.uid,
            school: def.school,
            label: 'INTERCEPT!',
          });
        }
      } else {
        def = null;
      }
    }

    if (def === null) {
      // Check Defender Trap on direct Archon attack!
      if (defendingSide === 'player' && stateForPassives.playerTrap === 'kinet_mirage_ward') {
        stateForPassives.playerTrap = null;
        events.push({ type: 'trap', side: 'player', school: 'kinet', label: 'MIRAGE WARD!' });
        const emptyIdx = findFirstEmptyLane(defB);
        if (emptyIdx >= 0) {
          const mirageUid = `m${lane}_${Date.now() % 9999}_${++nextUidDelta}`;
          defB[emptyIdx] = {
            uid: mirageUid,
            cardId: 'kinet_sylph',
            school: 'kinet',
            side: 'player',
            lane: emptyIdx,
            atk: 2,
            hp: 2,
            maxHp: 2,
            keywords: ['flying'],
            veteranCount: 0,
            shielded: false,
            summonSick: false,
            stance: 'guard',
          };
          events.push({
            type: 'summon',
            side: 'player',
            lane: emptyIdx,
            uid: mirageUid,
            cardId: 'kinet_sylph',
            atk: 2,
            hp: 2,
            school: 'kinet',
            label: '2/2',
          });
        }
        continue;
      }
      if (defendingSide === 'enemy' && stateForPassives.enemyTrap === 'kinet_mirage_ward') {
        stateForPassives.enemyTrap = null;
        events.push({ type: 'trap', side: 'enemy', school: 'kinet', label: 'MIRAGE WARD!' });
        continue;
      }
      if (defendingSide === 'player' && stateForPassives.playerTrap === 'chaos_cinder_trap') {
        stateForPassives.playerTrap = null;
        events.push({ type: 'trap', side: 'player', school: 'chaos', label: 'CINDER TRAP!' });
        for (let ci = 0; ci < LANES; ci++) {
          const e = atkB[ci];
          if (!e) continue;
          e.hp -= 3;
          events.push({ type: 'hit_creature', side: attackingSide, lane: ci, uid: e.uid, amount: 3, label: '-3' });
          if (e.hp <= 0) {
            events.push({ type: 'creature_died', side: attackingSide, lane: ci, uid: e.uid });
            atkB[ci] = null;
            applyCreatureDeathPassives(attackingSide, stateForPassives, events, e, ci);
          }
        }
        if (!atkB[lane]) continue;
      }

      let dmg = atk.atk + (atk.cardId === 'kinet_vortex' ? 1 : 0);
      if (ultimatumDouble) dmg *= 2;
      hp -= dmg;
      damageDealt += dmg;
      events.push({ type: 'attack', side: attackingSide, lane, uid: atk.uid, amount: dmg, school: atk.school });
      events.push({
        type: 'hit_demiurge',
        side: defendingSide,
        amount: dmg,
        label: `-${dmg}`,
      });
      if (defendingSide === 'player' && stateForPassives.soulTetherActive && dmg > 0) {
        const reflectDmg = Math.max(1, Math.ceil(dmg * 0.5));
        stateForPassives.enemyHp = Math.max(0, stateForPassives.enemyHp - reflectDmg);
        stateForPassives.damageDealtTotal += reflectDmg;
        events.push({
          type: 'tether_reflect',
          side: 'enemy',
          lane,
          amount: reflectDmg,
          school: stateForPassives.playerSchool ?? 'synth',
          label: `-${reflectDmg} ⛓`,
        });
      }

      // Surviving attacker earns Veterancy +1/+1
      atk.veteranCount += 1;
      atk.atk += 1;
      atk.hp += 1;
      atk.maxHp += 1;
      events.push({
        type: 'veteran',
        side: attackingSide,
        lane,
        uid: atk.uid,
        label: '+1/+1',
      });
      continue;
    }

    // Creature vs Creature clash with First Strike, Armor, Guard Bonus, Poison, Shield
    events.push({ type: 'attack', side: attackingSide, lane, uid: atk.uid, school: atk.school });

    const atkFirst = atk.keywords.includes('firstStrike');
    const guardBonus =
      def.stance === 'guard' ? 1 + (defendingRelics.includes('relic_thorn_carapace') ? 1 : 0) : 0;
    const defArmor = (def.keywords.includes('armor') ? 1 : 0) + (def.shielded ? 1 : 0) + guardBonus;
    const atkArmor = (atk.keywords.includes('armor') ? 1 : 0) + (atk.shielded ? 1 : 0);

    const dmgToDef = Math.max(0, atk.atk - defArmor);
    def.hp -= dmgToDef;
    def.shielded = false;
    damageDealt += dmgToDef;
    events.push({
      type: 'hit_creature',
      side: defendingSide,
      lane: defLane,
      uid: def.uid,
      amount: dmgToDef,
      label: dmgToDef > 0 ? `-${dmgToDef}` : 'BLOCK',
    });
    if (defendingSide === 'player' && stateForPassives.soulTetherActive && dmgToDef > 0) {
      const reflectDmg = Math.max(1, Math.ceil(dmgToDef * 0.5));
      stateForPassives.enemyHp = Math.max(0, stateForPassives.enemyHp - reflectDmg);
      stateForPassives.damageDealtTotal += reflectDmg;
      events.push({
        type: 'tether_reflect',
        side: 'enemy',
        lane: defLane,
        amount: reflectDmg,
        school: stateForPassives.playerSchool ?? 'synth',
        label: `-${reflectDmg} ⛓`,
      });
    }

    const poisonedDef = dmgToDef > 0 && atk.keywords.includes('poison');
    if (def.hp <= 0 || poisonedDef) {
      events.push({ type: 'creature_died', side: defendingSide, lane: defLane, uid: def.uid });
      defB[defLane] = null;
      if (poisonedDef && stateForPassives.slotAftermath) {
        stateForPassives.slotAftermath[defendingSide][defLane] = 'poison';
      }
      applyCreatureDeathPassives(defendingSide, stateForPassives, events, def, defLane);
      if (atkFirst) {
        if (attackingSide === 'player' && stateForPassives.bossPassive === 'boss_briar_thorns' && !atkFlying && atkB[lane]) {
          atk.hp -= 1;
          events.push({ type: 'hit_creature', side: 'player', lane, uid: atk.uid, amount: 1, label: '-1 🌿' });
          if (atk.hp <= 0) {
            events.push({ type: 'creature_died', side: 'player', lane, uid: atk.uid });
            atkB[lane] = null;
            applyCreatureDeathPassives('player', stateForPassives, events, atk, lane);
            continue;
          }
        }
        atk.veteranCount += 1;
        atk.atk += 1;
        atk.hp += 1;
        atk.maxHp += 1;
        events.push({ type: 'veteran', side: attackingSide, lane, uid: atk.uid, label: '+1/+1' });
        continue;
      }
    }

    if (!atkFirst || defB[defLane] !== null) {
      const dmgToAtk = Math.max(0, def.atk - atkArmor);
      atk.hp -= dmgToAtk;
      atk.shielded = false;
      events.push({
        type: 'hit_creature',
        side: attackingSide,
        lane,
        uid: atk.uid,
        amount: dmgToAtk,
        label: dmgToAtk > 0 ? `-${dmgToAtk}` : 'BLOCK',
      });
      const poisonedAtk = dmgToAtk > 0 && def.keywords.includes('poison');
      if (atk.hp <= 0 || poisonedAtk) {
        events.push({ type: 'creature_died', side: attackingSide, lane, uid: atk.uid });
        atkB[lane] = null;
        if (poisonedAtk && stateForPassives.slotAftermath) {
          stateForPassives.slotAftermath[attackingSide][lane] = 'poison';
        }
        applyCreatureDeathPassives(attackingSide, stateForPassives, events, atk, lane);
      }
    }

    if (atkB[lane]) {
      if (attackingSide === 'player' && stateForPassives.bossPassive === 'boss_briar_thorns' && !atkFlying) {
        atk.hp -= 1;
        events.push({ type: 'hit_creature', side: 'player', lane, uid: atk.uid, amount: 1, label: '-1 🌿' });
        if (atk.hp <= 0) {
          events.push({ type: 'creature_died', side: 'player', lane, uid: atk.uid });
          atkB[lane] = null;
          applyCreatureDeathPassives('player', stateForPassives, events, atk, lane);
          continue;
        }
      }
      atk.veteranCount += 1;
      atk.atk += 1;
      atk.hp += 1;
      atk.maxHp += 1;
      events.push({ type: 'veteran', side: attackingSide, lane, uid: atk.uid, label: '+1/+1' });
    }
  }

  return { attackerBoard: atkB, defenderBoard: defB, defenderHp: hp, damageDealt, nextUidDelta };
}

export function resolvePlayerEndTurn(state: DuelState): DuelState {
  if (state.phase !== 'player_main') return state;
  const opponent = getOpponentForStage(state.stageIndex);
  const prevEventsLen = state.pendingEvents.length;
  const events: CombatEvent[] = [...state.pendingEvents];
  const turnAftermath: { player: SlotAftermathKind[]; enemy: SlotAftermathKind[] } = {
    player: [null, null, null, null],
    enemy: [null, null, null, null],
  };

  // Artificers (Synth) Doctrine: Astrolabe Matrix converts >=1 unspent Ether into Shield/Fortify & +1 Resonance
  const endTurnUnspentEther = state.playerEther;
  const startBoard = cloneBoard(state.playerBoard);
  let startResonance = state.playerResonance;
  let synthPlayerHp = state.playerHp;
  if (state.playerSchool === 'synth' && endTurnUnspentEther >= 1) {
    startResonance = Math.min(5, startResonance + 1);
    let weakestIdx = -1;
    let weakestHp = Infinity;
    for (let i = 0; i < LANES; i++) {
      const a = startBoard[i];
      if (a && a.hp < weakestHp) {
        weakestHp = a.hp;
        weakestIdx = i;
      }
    }
    if (weakestIdx >= 0 && startBoard[weakestIdx]) {
      const a = startBoard[weakestIdx]!;
      a.shielded = true;
      a.hp += 1;
      a.maxHp += 1;
      events.push({
        type: 'leap_pulse',
        side: 'player',
        lane: weakestIdx,
        uid: a.uid,
        school: 'synth',
        label: '+0/+1 & SHIELD',
      });
    } else {
      synthPlayerHp = Math.min(state.playerMaxHp, synthPlayerHp + 1);
      events.push({ type: 'hit_demiurge', side: 'player', school: 'synth', amount: -1, label: '+1 HP' });
    }
  }

  const passiveTrack = {
    playerHp: synthPlayerHp,
    playerMaxHp: state.playerMaxHp,
    enemyHp: state.enemyHp,
    enemyMaxHp: state.enemyMaxHp,
    playerEnchantment: state.playerEnchantment,
    enemyEnchantment: state.enemyEnchantment,
    playerTrap: state.playerTrap,
    enemyTrap: state.enemyTrap,
    relics: state.relics,
    damageDealtTotal: state.damageDealtTotal,
    playerSchool: state.playerSchool,
    soulTetherActive: state.soulTetherActive,
    lastLostAlly: state.lastLostAlly,
    bossPassive: opponent.bossPassive,
    slotAftermath: turnAftermath,
  };

  // 1. Player creatures attack (attack stance & non-exhausted only)
  const pAttack = resolveCombatSide(
    'player',
    startBoard,
    state.enemyBoard,
    passiveTrack.enemyHp,
    state.ultimatumActive,
    [],
    passiveTrack,
    events
  );

  let next: DuelState = {
    ...state,
    altarMode: false,
    mulliganDone: true,
    playerResonance: startResonance,
    playerBoard: pAttack.attackerBoard,
    enemyBoard: pAttack.defenderBoard,
    enemyHp: Math.max(0, passiveTrack.enemyHp - Math.max(0, passiveTrack.enemyHp - pAttack.defenderHp)),
    playerHp: passiveTrack.playerHp,
    enemyTrap: passiveTrack.enemyTrap,
    playerTrap: passiveTrack.playerTrap,
    lastLostAlly: passiveTrack.lastLostAlly,
    slotAftermath: turnAftermath,
    damageDealtTotal: passiveTrack.damageDealtTotal + pAttack.damageDealt,
    nextUid: state.nextUid + pAttack.nextUidDelta,
    pendingEvents: events,
  };

  if (next.enemyHp <= 0) {
    return withQuestEvaluation({
      ...next,
      enemyHp: 0,
      phase: 'victory',
      combatLog: appendEventsToLog(next.combatLog, next.round, events.slice(prevEventsLen)),
    });
  }

  // 2. AI Turn
  const aiPrevEventsLen = next.pendingEvents.length;
  next = executeAiTurn(next);
  if (next.enemyHp <= 0) {
    return withQuestEvaluation({
      ...next,
      enemyHp: 0,
      phase: 'victory',
      combatLog: appendEventsToLog(next.combatLog, next.round, next.pendingEvents.slice(aiPrevEventsLen)),
    });
  }
  if (next.playerHp <= 0) {
    if (!next.phylacteryUsed && next.relics.includes('relic_phylactery')) {
      next = {
        ...next,
        playerHp: 3,
        playerEther: next.playerEther + 2,
        phylacteryUsed: true,
        combatLog: appendLog(next.combatLog, {
          round: next.round,
          actor: 'player',
          kind: 'ultimatum',
          detail: 'PHYLACTERY +3 HP',
        }),
        pendingEvents: [
          ...next.pendingEvents,
          { type: 'ultimatum', side: 'player', label: 'PHYLACTERY +3 HP' },
        ],
      };
    } else {
      return {
        ...next,
        playerHp: 0,
        phase: 'defeat',
        combatLog: appendEventsToLog(next.combatLog, next.round, next.pendingEvents.slice(aiPrevEventsLen)),
      };
    }
  }

  // 3. Advance Round, reset exhausted & ability cooldowns, trigger turn-start enchantments & burn lanes
  const nextRound = next.round + 1;
  const nextChannel = Math.min(MAX_CHANNEL, next.playerChannel + 1);
  let nextAnomaly = next.anomaly;
  const roundEvents = [...next.pendingEvents];

  if (opponent.bossPassive === 'boss_rift_sovereign' || nextRound % 2 === 1) {
    const idx = (ANOMALY_ROTATION.indexOf(next.anomaly) + 1) % ANOMALY_ROTATION.length;
    nextAnomaly = ANOMALY_ROTATION[idx];
    roundEvents.push({ type: 'anomaly', side: 'player', label: nextAnomaly });
  }

  let nextPlayerHp = next.playerHp;
  let nextEnemyHp = next.enemyHp;
  if (nextAnomaly === 'calm') {
    nextPlayerHp = Math.min(next.playerMaxHp, nextPlayerHp + 1);
    nextEnemyHp = Math.min(next.enemyMaxHp, nextEnemyHp + 1);
  }

  const resetPlayerBoard = cloneBoard(next.playerBoard);
  resetPlayerBoard.forEach((c) => {
    if (c) {
      c.exhausted = false;
      c.abilityUsedThisTurn = false;
    }
  });
  const resetEnemyBoard = cloneBoard(next.enemyBoard);
  resetEnemyBoard.forEach((c) => {
    if (c) {
      c.exhausted = false;
      c.abilityUsedThisTurn = false;
    }
  });

  // Chaos Resonance Cinder Rift burn lanes tick
  const nextChaosBurnLanes = (next.chaosBurnLanes ?? [0, 0, 0, 0]).map((t) => Math.max(0, t - 1));
  const roundAftermath = cloneSlotAftermath(next.slotAftermath);
  const burnTrack = {
    playerHp: nextPlayerHp,
    playerMaxHp: next.playerMaxHp,
    enemyHp: nextEnemyHp,
    enemyMaxHp: next.enemyMaxHp,
    playerEnchantment: next.playerEnchantment,
    enemyEnchantment: next.enemyEnchantment,
    relics: next.relics,
    damageDealtTotal: next.damageDealtTotal,
    playerSchool: next.playerSchool,
    lastLostAlly: next.lastLostAlly,
  };
  for (let i = 0; i < LANES; i++) {
    if ((next.chaosBurnLanes?.[i] ?? 0) > 0 && resetEnemyBoard[i]) {
      const foe = resetEnemyBoard[i]!;
      foe.hp -= 2;
      burnTrack.damageDealtTotal += 2;
      roundEvents.push({
        type: 'spell',
        side: 'player',
        lane: i,
        uid: foe.uid,
        school: 'chaos',
        amount: 2,
        label: '-2 🔥',
      });
      if (foe.hp <= 0) {
        roundEvents.push({ type: 'creature_died', side: 'enemy', lane: i, uid: foe.uid });
        resetEnemyBoard[i] = null;
        roundAftermath.enemy[i] = 'chaos';
        applyCreatureDeathPassives('enemy', burnTrack, roundEvents, foe, i);
      }
    }
  }
  nextPlayerHp = burnTrack.playerHp;
  nextEnemyHp = burnTrack.enemyHp;

  // Turn-start player enchantment triggers
  let extraEther = 0;
  if (next.playerEnchantment === 'synth_aether_forge') {
    extraEther += 1;
    roundEvents.push({ type: 'enchant', side: 'player', school: 'synth', label: '+1 ⚡' });
  } else if (next.playerEnchantment === 'vital_grove_heart') {
    nextPlayerHp = Math.min(next.playerMaxHp, nextPlayerHp + 2);
    roundEvents.push({ type: 'hit_demiurge', side: 'player', amount: -2, label: '+2 HP' });
    const allyIdx = resetPlayerBoard.findIndex((c) => c !== null);
    if (allyIdx >= 0 && resetPlayerBoard[allyIdx]) {
      resetPlayerBoard[allyIdx]!.hp += 1;
      resetPlayerBoard[allyIdx]!.maxHp += 1;
    }
  }

  // Verdants (Vital) Doctrine: Living Roots regenerates weakest ally +1 HP at round start
  if (next.playerSchool === 'vital') {
    let weakestIdx = -1;
    let weakestMissing = -1;
    let lowestHp = Infinity;
    for (let i = 0; i < LANES; i++) {
      const a = resetPlayerBoard[i];
      if (!a) continue;
      const missing = a.maxHp - a.hp;
      if (missing > weakestMissing || (missing === weakestMissing && a.hp < lowestHp)) {
        weakestMissing = missing;
        lowestHp = a.hp;
        weakestIdx = i;
      }
    }
    if (weakestIdx >= 0 && resetPlayerBoard[weakestIdx]) {
      const a = resetPlayerBoard[weakestIdx]!;
      if (a.hp < a.maxHp) {
        a.hp += 1;
      } else {
        a.hp += 1;
        a.maxHp += 1;
      }
      roundEvents.push({
        type: 'veteran',
        side: 'player',
        lane: weakestIdx,
        uid: a.uid,
        school: 'vital',
        label: '+1 HP',
      });
    }
  }

  const finalLog = appendEventsToLog(next.combatLog, nextRound, roundEvents.slice(prevEventsLen));

  next = {
    ...next,
    round: nextRound,
    anomaly: nextAnomaly,
    playerHp: nextPlayerHp,
    enemyHp: Math.max(0, nextEnemyHp),
    playerChannel: nextChannel,
    playerEther: nextChannel + extraEther,
    playerBoard: resetPlayerBoard,
    enemyBoard: resetEnemyBoard,
    damageDealtTotal: burnTrack.damageDealtTotal,
    lastLostAlly: burnTrack.lastLostAlly,
    overloadUsedThisTurn: false,
    leapUsedThisTurn: false,
    swapUsedThisTurn: false,
    schoolDoctrineUsedThisTurn: false,
    crossSchoolTriggeredThisTurn: false,
    slotAftermath: roundAftermath,
    ultimatumActive: false,
    soulTetherActive: false,
    soulTetherLane: null,
    soulTetherCooldown: Math.max(0, next.soulTetherCooldown - 1),
    chaosBurnLanes: nextChaosBurnLanes,
    phase: nextEnemyHp <= 0 ? 'victory' : 'player_main',
    combatLog: finalLog,
    pendingEvents: roundEvents,
  };

  if (next.phase === 'victory') return withQuestEvaluation(next);
  next = drawCardForPlayer(next);
  return withQuestEvaluation(next);
}

function executeAiTurn(state: DuelState): DuelState {
  const opponent = getOpponentForStage(state.stageIndex);
  const rng = createRng(state.seed + state.round * 73);
  const events: CombatEvent[] = [...state.pendingEvents];

  const nextEnemyChannel = Math.min(MAX_CHANNEL, state.enemyChannel + 1);
  let ether = nextEnemyChannel + (state.enemyEnchantment === 'synth_aether_forge' ? 1 : 0);
  let enemyHp = state.enemyHp;
  let enemyOverloaded = false;
  let enemyEnchantment = state.enemyEnchantment;
  let enemyTrap = state.enemyTrap;
  let playerTrap = state.playerTrap;

  if (enemyEnchantment === 'vital_grove_heart') {
    enemyHp = Math.min(state.enemyMaxHp, enemyHp + 2);
  }

  const enemyHand = [...state.enemyHand];
  while (enemyHand.length < 4) {
    const pick = opponent.deck[Math.floor(rng.next() * opponent.deck.length)];
    enemyHand.push(pick);
  }

  if (
    state.difficulty !== 'apprentice' &&
    enemyHp > 10 &&
    (state.difficulty === 'cataclysm' || rng.next() < 0.45)
  ) {
    ether += state.anomaly === 'surge' ? 3 : 2;
    enemyHp -= 3;
    enemyOverloaded = true;
    events.push({ type: 'overload', side: 'enemy', amount: 2, label: '+2' });
    events.push({ type: 'hit_demiurge', side: 'enemy', amount: 3, label: '-3' });
  }

  const eBoard = cloneBoard(state.enemyBoard);
  const pBoard = cloneBoard(state.playerBoard);
  const aiAftermath = cloneSlotAftermath(state.slotAftermath);
  const passiveTrack = {
    playerHp: state.playerHp,
    playerMaxHp: state.playerMaxHp,
    enemyHp,
    enemyMaxHp: state.enemyMaxHp,
    playerEnchantment: state.playerEnchantment,
    enemyEnchantment,
    playerTrap,
    enemyTrap,
    relics: state.relics,
    damageDealtTotal: state.damageDealtTotal,
    playerSchool: state.playerSchool,
    soulTetherActive: state.soulTetherActive,
    lastLostAlly: state.lastLostAlly,
    bossPassive: opponent.bossPassive,
    slotAftermath: aiAftermath,
  };
  let nextUid = state.nextUid;
  let summonedCount = 0;
  let spellsCount = 0;
  let nextLog = state.combatLog;
  let astralBlinkGranted = false;

  // Unique Rival Passives (Stages 2–7)
  if (opponent.bossPassive === 'boss_clockwork_mend' && state.round >= 2) {
    passiveTrack.enemyHp = Math.min(state.enemyMaxHp, passiveTrack.enemyHp + 1);
    events.push({ type: 'hit_demiurge', side: 'enemy', school: 'synth', amount: -1, label: '+1 HP' });
    let weakestIdx = -1;
    let lowestHp = Infinity;
    for (let i = 0; i < LANES; i++) {
      const a = eBoard[i];
      if (a && a.hp < lowestHp) {
        lowestHp = a.hp;
        weakestIdx = i;
      }
    }
    if (weakestIdx >= 0 && eBoard[weakestIdx]) {
      const a = eBoard[weakestIdx]!;
      a.atk += 1;
      a.hp += 1;
      a.maxHp += 1;
      events.push({ type: 'veteran', side: 'enemy', lane: weakestIdx, uid: a.uid, school: 'synth', label: '+1/+1' });
    }
    nextLog = appendLog(nextLog, {
      round: state.round,
      actor: 'enemy',
      kind: 'boss',
      detail: 'boss_clockwork_mend',
    });
  } else if (opponent.bossPassive === 'boss_ember_tithe' && state.round >= 2 && state.round % 2 === 0) {
    passiveTrack.playerHp -= 1;
    events.push({ type: 'hit_demiurge', side: 'player', school: 'chaos', amount: 1, label: '-1' });
    if (state.soulTetherActive) {
      passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - 1);
      passiveTrack.damageDealtTotal += 1;
      events.push({
        type: 'tether_reflect',
        side: 'enemy',
        amount: 1,
        school: state.playerSchool,
        label: '-1 ⛓',
      });
    }
    const openLane = findFirstEmptyLane(eBoard);
    if (openLane >= 0) {
      const impUid = `eb${nextUid++}`;
      eBoard[openLane] = {
        uid: impUid,
        cardId: 'chaos_hound',
        school: 'chaos',
        side: 'enemy',
        lane: openLane,
        atk: 2,
        hp: 2,
        maxHp: 2,
        keywords: [],
        veteranCount: 0,
        shielded: false,
        summonSick: false,
        stance: 'attack',
      };
      summonedCount += 1;
      events.push({
        type: 'summon',
        side: 'enemy',
        lane: openLane,
        uid: impUid,
        cardId: 'chaos_hound',
        atk: 2,
        hp: 2,
        school: 'chaos',
        label: '2/2',
      });
    }
    nextLog = appendLog(nextLog, {
      round: state.round,
      actor: 'enemy',
      kind: 'boss',
      detail: 'boss_ember_tithe',
    });
  } else if (opponent.bossPassive === 'boss_rift_sovereign' && state.round >= 2) {
    const vanguardIdx = eBoard.findIndex((c) => c !== null);
    if (vanguardIdx >= 0 && eBoard[vanguardIdx]) {
      const v = eBoard[vanguardIdx]!;
      v.atk += 1;
      v.hp += 1;
      v.maxHp += 1;
      events.push({ type: 'veteran', side: 'enemy', lane: vanguardIdx, uid: v.uid, label: '+1/+1' });
    }
    nextLog = appendLog(nextLog, {
      round: state.round,
      actor: 'enemy',
      kind: 'boss',
      detail: 'boss_rift_sovereign',
    });
  }

  for (let pass = 0; pass < 2; pass++) {
    let played = false;
    for (let i = 0; i < enemyHand.length; i++) {
      const card = CARD_CATALOG[enemyHand[i]];
      if (!card || card.cost > ether) continue;

      if (card.type === 'creature') {
        let targetLane = -1;
        for (let l = 0; l < LANES; l++) {
          if (eBoard[l] === null && pBoard[l] !== null) {
            targetLane = l;
            break;
          }
        }
        if (targetLane === -1) targetLane = findFirstEmptyLane(eBoard);
        if (targetLane === -1) continue;

        const uid = `e${nextUid++}`;
        const flyingBonus = state.anomaly === 'winds' && card.keywords.includes('flying') ? 1 : 0;
        const atk = (card.atk ?? 2) + flyingBonus;
        const hp = card.hp ?? 2;

        // Tactical guard placement on low HP if defender exists
        const shouldGuard = passiveTrack.enemyHp <= 8 && pBoard[targetLane] !== null && rng.next() < 0.4;

        eBoard[targetLane] = {
          uid,
          cardId: card.id,
          school: card.school,
          side: 'enemy',
          lane: targetLane,
          atk,
          hp,
          maxHp: hp,
          keywords: [...card.keywords],
          veteranCount: 0,
          shielded: false,
          summonSick: false,
          stance: shouldGuard ? 'guard' : 'attack',
          activeAbility: card.activeAbility,
        };
        ether -= card.cost;
        enemyHand.splice(i, 1);
        events.push({
          type: 'summon',
          side: 'enemy',
          lane: targetLane,
          uid,
          cardId: card.id,
          atk,
          hp,
          school: card.school,
          label: `${atk}/${hp}`,
        });
        if (opponent.bossPassive === 'boss_astral_blink' && !astralBlinkGranted && eBoard[targetLane]) {
          astralBlinkGranted = true;
          const boosted = eBoard[targetLane]!;
          boosted.atk += 1;
          boosted.shielded = true;
          events.push({
            type: 'veteran',
            side: 'enemy',
            lane: targetLane,
            uid: boosted.uid,
            school: 'kinet',
            label: '+1 ATK & SHIELD',
          });
          nextLog = appendLog(nextLog, {
            round: state.round,
            actor: 'enemy',
            kind: 'boss',
            detail: 'boss_astral_blink',
          });
        }
        if (card.keywords.includes('heal')) {
          passiveTrack.enemyHp = Math.min(state.enemyMaxHp, passiveTrack.enemyHp + 2);
        }

        // Player vital_bramble_trap triggers on enemy summon!
        if (playerTrap === 'vital_bramble_trap') {
          playerTrap = null;
          passiveTrack.playerTrap = null;
          events.push({ type: 'trap', side: 'player', school: 'vital', label: 'BRAMBLE TRAP!' });
          const foe = eBoard[targetLane];
          if (foe) {
            foe.hp -= 3;
            events.push({ type: 'hit_creature', side: 'enemy', lane: targetLane, uid: foe.uid, amount: 3, label: '-3' });
            if (foe.hp <= 0) {
              events.push({ type: 'creature_died', side: 'enemy', lane: targetLane, uid: foe.uid });
              eBoard[targetLane] = null;
              applyCreatureDeathPassives('enemy', passiveTrack, events, foe, targetLane);
            }
          }
          const pAllyIdx = pBoard.findIndex((c) => c !== null);
          if (pAllyIdx >= 0 && pBoard[pAllyIdx]) {
            pBoard[pAllyIdx]!.hp += 1;
            pBoard[pAllyIdx]!.maxHp += 1;
          }
        }

        summonedCount += 1;
        played = true;
        break;
      } else if (card.type === 'enchantment' && enemyEnchantment !== card.id) {
        enemyEnchantment = card.id;
        passiveTrack.enemyEnchantment = card.id;
        ether -= card.cost;
        enemyHand.splice(i, 1);
        events.push({ type: 'enchant', side: 'enemy', cardId: card.id, school: card.school, label: 'ENCHANT' });
        spellsCount += 1;
        played = true;
        break;
      } else if (card.type === 'trap' && !enemyTrap) {
        enemyTrap = card.id;
        passiveTrack.enemyTrap = card.id;
        ether -= card.cost;
        enemyHand.splice(i, 1);
        events.push({ type: 'trap', side: 'enemy', cardId: card.id, school: card.school, label: 'WARD SET' });
        spellsCount += 1;
        played = true;
        break;
      } else if (card.spellEffect) {
        const effectKind = card.spellEffect.kind;
        if (
          effectKind === 'damage_target' ||
          effectKind === 'execute_or_burn' ||
          effectKind === 'pulse_draw' ||
          effectKind === 'drain_channel'
        ) {
          if (effectKind === 'damage_target' || effectKind === 'execute_or_burn' || effectKind === 'pulse_draw') {
            if (pBoard.every((c) => c === null) && rng.next() < 0.15) continue;
          }
          // Player synth_stasis_ward negates enemy spell!
          if (playerTrap === 'synth_stasis_ward') {
            playerTrap = null;
            passiveTrack.playerTrap = null;
            events.push({ type: 'trap', side: 'player', school: 'synth', label: 'STASIS NEGATED!' });
          } else {
            const spellDmg = card.spellEffect.amount + (state.anomaly === 'rift' ? 1 : 0);
            const pTargetIdx = pBoard.findIndex((c) => c !== null);
            if (pTargetIdx >= 0 && pBoard[pTargetIdx]) {
              const t = pBoard[pTargetIdx]!;
              const hitDmg = effectKind === 'execute_or_burn' && t.hp <= spellDmg ? t.hp : spellDmg;
              t.hp -= hitDmg;
              events.push({
                type: 'spell',
                side: 'enemy',
                lane: pTargetIdx,
                uid: t.uid,
                cardId: card.id,
                school: card.school,
                amount: hitDmg,
                label: `-${hitDmg}`,
              });
              if (state.soulTetherActive && hitDmg > 0) {
                const reflectDmg = Math.max(1, Math.ceil(hitDmg * 0.5));
                passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - reflectDmg);
                passiveTrack.damageDealtTotal += reflectDmg;
                events.push({
                  type: 'tether_reflect',
                  side: 'enemy',
                  lane: pTargetIdx,
                  amount: reflectDmg,
                  school: state.playerSchool,
                  label: `-${reflectDmg} ⛓`,
                });
              }
              if (t.hp <= 0) {
                events.push({ type: 'creature_died', side: 'player', lane: pTargetIdx, uid: t.uid });
                pBoard[pTargetIdx] = null;
                if (card.school === 'chaos') aiAftermath.player[pTargetIdx] = 'chaos';
                applyCreatureDeathPassives('player', passiveTrack, events, t, pTargetIdx);
              }
            } else {
              passiveTrack.playerHp -= spellDmg;
              events.push({
                type: 'hit_demiurge',
                side: 'player',
                cardId: card.id,
                school: card.school,
                amount: spellDmg,
                label: `-${spellDmg}`,
              });
              if (state.soulTetherActive && spellDmg > 0) {
                const reflectDmg = Math.max(1, Math.ceil(spellDmg * 0.5));
                passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - reflectDmg);
                passiveTrack.damageDealtTotal += reflectDmg;
                events.push({
                  type: 'tether_reflect',
                  side: 'enemy',
                  amount: reflectDmg,
                  school: state.playerSchool,
                  label: `-${reflectDmg} ⛓`,
                });
              }
            }
            if (effectKind === 'drain_channel') {
              ether += 1;
              events.push({ type: 'overload', side: 'enemy', amount: 1, school: card.school, label: '+1 ⚡' });
            }
          }
          ether -= card.cost;
          enemyHand.splice(i, 1);
          spellsCount += 1;
          played = true;
          break;
        } else if (effectKind === 'aoe_enemy') {
          if (!pBoard.some((c) => c !== null)) continue;
          if (playerTrap === 'synth_stasis_ward') {
            playerTrap = null;
            passiveTrack.playerTrap = null;
            events.push({ type: 'trap', side: 'player', school: 'synth', label: 'STASIS NEGATED!' });
          } else {
            const aoeDmg = card.spellEffect.amount + (state.anomaly === 'rift' ? 1 : 0);
            let totalReflected = 0;
            for (let lane = 0; lane < LANES; lane++) {
              const t = pBoard[lane];
              if (!t) continue;
              t.hp -= aoeDmg;
              totalReflected += aoeDmg;
              events.push({
                type: 'spell',
                side: 'enemy',
                lane,
                uid: t.uid,
                cardId: card.id,
                school: card.school,
                amount: aoeDmg,
                label: `-${aoeDmg}`,
              });
              if (t.hp <= 0) {
                events.push({ type: 'creature_died', side: 'player', lane, uid: t.uid });
                pBoard[lane] = null;
                if (card.school === 'chaos') aiAftermath.player[lane] = 'chaos';
                applyCreatureDeathPassives('player', passiveTrack, events, t, lane);
              }
            }
            if (state.soulTetherActive && totalReflected > 0) {
              const reflectDmg = Math.max(1, Math.ceil(totalReflected * 0.5));
              passiveTrack.enemyHp = Math.max(0, passiveTrack.enemyHp - reflectDmg);
              passiveTrack.damageDealtTotal += reflectDmg;
              events.push({
                type: 'tether_reflect',
                side: 'enemy',
                amount: reflectDmg,
                school: state.playerSchool,
                label: `-${reflectDmg} ⛓`,
              });
            }
          }
          ether -= card.cost;
          enemyHand.splice(i, 1);
          spellsCount += 1;
          played = true;
          break;
        } else if (effectKind === 'buff_ally') {
          if (!eBoard.some((c) => c !== null)) continue;
          const atkBuff = card.spellEffect.amount;
          const hpBuff = card.spellEffect.hpBonus ?? 0;
          for (let lane = 0; lane < LANES; lane++) {
            const ally = eBoard[lane];
            if (!ally) continue;
            ally.atk += atkBuff;
            ally.hp += hpBuff;
            ally.maxHp += hpBuff;
            if (card.id === 'synth_ward') ally.shielded = true;
            events.push({
              type: 'veteran',
              side: 'enemy',
              lane,
              uid: ally.uid,
              school: card.school,
              label: `+${atkBuff}/+${hpBuff}`,
            });
          }
          ether -= card.cost;
          enemyHand.splice(i, 1);
          spellsCount += 1;
          played = true;
          break;
        } else if (effectKind === 'heal_and_buff') {
          const canHeal = passiveTrack.enemyHp < state.enemyMaxHp - 2;
          const allyIdx = eBoard.findIndex((c) => c !== null);
          if (!canHeal && allyIdx < 0) continue;
          passiveTrack.enemyHp = Math.min(state.enemyMaxHp, passiveTrack.enemyHp + card.spellEffect.amount);
          events.push({
            type: 'hit_demiurge',
            side: 'enemy',
            school: card.school,
            amount: -card.spellEffect.amount,
            label: `+${card.spellEffect.amount} HP`,
          });
          if (allyIdx >= 0 && eBoard[allyIdx]) {
            const ally = eBoard[allyIdx]!;
            const b = card.spellEffect.hpBonus ?? 1;
            ally.atk += b;
            ally.hp += b;
            ally.maxHp += b;
            events.push({
              type: 'veteran',
              side: 'enemy',
              lane: allyIdx,
              uid: ally.uid,
              school: card.school,
              label: `+${b}/+${b}`,
            });
          }
          ether -= card.cost;
          enemyHand.splice(i, 1);
          spellsCount += 1;
          played = true;
          break;
        }
      }
    }
    if (!played) break;
  }

  if (opponent.bossPassive === 'boss_forged_bulwark') {
    let weakestIdx = -1;
    let lowestHp = Infinity;
    for (let i = 0; i < LANES; i++) {
      const ally = eBoard[i];
      if (ally && ally.hp < lowestHp) {
        lowestHp = ally.hp;
        weakestIdx = i;
      }
    }
    if (weakestIdx >= 0 && eBoard[weakestIdx]) {
      const bulwark = eBoard[weakestIdx]!;
      bulwark.shielded = true;
      bulwark.hp += 1;
      bulwark.maxHp += 1;
      events.push({
        type: 'leap_pulse',
        side: 'enemy',
        lane: weakestIdx,
        uid: bulwark.uid,
        school: 'synth',
        label: '+0/+1 & SHIELD',
      });
      nextLog = appendLog(nextLog, {
        round: state.round,
        actor: 'enemy',
        kind: 'boss',
        detail: 'boss_forged_bulwark',
      });
    }
  }

  // AI Creatures Attack
  const aiAttack = resolveCombatSide(
    'enemy',
    eBoard,
    pBoard,
    passiveTrack.playerHp,
    false,
    state.relics,
    passiveTrack,
    events
  );

  const acted = summonedCount > 0 || spellsCount > 0;
  const boardHasUnits = aiAttack.attackerBoard.some((c) => c !== null);
  const boardFull = aiAttack.attackerBoard.every((c) => c !== null);
  const passedReason: AiTurnSummary['passedReason'] = acted
    ? 'none'
    : boardFull
      ? 'board_full'
      : !boardHasUnits
        ? 'saving_ether'
        : 'saving_ether';

  return {
    ...state,
    enemyHp: Math.max(0, passiveTrack.enemyHp),
    enemyChannel: nextEnemyChannel,
    enemyEther: ether,
    enemyOverloaded,
    enemyEnchantment,
    enemyTrap: passiveTrack.enemyTrap,
    playerTrap: passiveTrack.playerTrap,
    enemyHand,
    enemyBoard: aiAttack.attackerBoard,
    playerBoard: aiAttack.defenderBoard,
    playerHp: aiAttack.defenderHp,
    damageDealtTotal: passiveTrack.damageDealtTotal,
    lastLostAlly: passiveTrack.lastLostAlly,
    slotAftermath: aiAftermath,
    nextUid: nextUid + aiAttack.nextUidDelta,
    lastAiSummary: {
      acted,
      summoned: summonedCount,
      spells: spellsCount,
      overloaded: enemyOverloaded,
      passedReason,
    },
    combatLog: nextLog,
    pendingEvents: events,
  };
}

export function generateDraftChoices(
  deck: string[],
  seed: number,
  defeatedSchool?: MagicSchool
): string[] {
  const rng = createRng(seed);
  const pool = shuffleWithRng(
    ALL_CARD_IDS.filter((id) => CARD_CATALOG[id].cost >= 2),
    rng
  );
  const choices: string[] = [];

  if (defeatedSchool) {
    const trophyCandidates = pool.filter((id) => CARD_CATALOG[id].school === defeatedSchool);
    const preferredTrophy =
      trophyCandidates.find((id) => !deck.includes(id)) ?? trophyCandidates[0];
    if (preferredTrophy) choices.push(preferredTrophy);
  }

  for (const id of pool) {
    if (!choices.includes(id)) choices.push(id);
    if (choices.length >= 3) break;
  }
  while (choices.length < 3) {
    choices.push(deck[choices.length % deck.length] ?? 'kinet_sylph');
  }
  return choices;
}

export function generateRelicChoices(owned: RelicId[], seed: number): RelicId[] {
  const rng = createRng(seed + 41);
  const available = shuffleWithRng(
    ALL_RELIC_IDS.filter((id) => !owned.includes(id)),
    rng
  );
  return available.slice(0, 3);
}

export function applyDraftReplacement(
  deck: string[],
  newCardId: string,
  replaceIndex: number | null
): string[] {
  if (replaceIndex === null) {
    return deck.length < 16 ? [...deck, newCardId] : [...deck.slice(0, -1), newCardId];
  }
  return deck.map((id, i) => (i === replaceIndex ? newCardId : id));
}

export function applySanctuaryPurge(deck: string[], removeIndex: number): string[] {
  if (deck.length <= 8 || removeIndex < 0 || removeIndex >= deck.length) return deck;
  return deck.filter((_, i) => i !== removeIndex);
}

export interface EnemyIntentSummary {
  boardCreatureDmg: number;
  directDemiurgeDmg: number;
  totalIncomingDmg: number;
  playableCardsCount: number;
  expectedEnemyEther: number;
  mayOverload: boolean;
}

export function computeEnemyIntent(state: DuelState): EnemyIntentSummary {
  let boardCreatureDmg = 0;
  let directDemiurgeDmg = 0;
  const usedGuards = new Set<string>();

  for (let lane = 0; lane < LANES; lane++) {
    const atk = state.enemyBoard[lane];
    if (!atk || atk.stance === 'guard' || atk.exhausted) continue;

    let def = state.playerBoard[lane];
    const atkFlying = atk.keywords.includes('flying');
    const directBlocked = def !== null && (!atkFlying || def.keywords.includes('flying'));

    if (!directBlocked) {
      const interceptLane = findAdjacentGuard(state.playerBoard, lane, atkFlying, usedGuards);
      if (interceptLane >= 0) {
        def = state.playerBoard[interceptLane];
        if (def) usedGuards.add(def.uid);
      } else {
        def = null;
      }
    }

    if (def === null) {
      const dmg = atk.atk + (atk.cardId === 'kinet_vortex' ? 1 : 0);
      directDemiurgeDmg += dmg;
    } else {
      const guardBonus =
        def.stance === 'guard' ? 1 + (state.relics.includes('relic_thorn_carapace') ? 1 : 0) : 0;
      const defArmor = (def.keywords.includes('armor') ? 1 : 0) + (def.shielded ? 1 : 0) + guardBonus;
      const dmgToDef = Math.max(0, atk.atk - defArmor);
      boardCreatureDmg += dmgToDef;
    }
  }

  const nextEnemyChannel = Math.min(MAX_CHANNEL, state.enemyChannel + 1);
  const mayOverload = state.difficulty !== 'apprentice' && state.enemyHp > 10;
  const overloadGain = state.anomaly === 'surge' ? 3 : 2;
  const expectedEnemyEther = nextEnemyChannel + (mayOverload ? overloadGain : 0);

  let playableCardsCount = 0;
  for (const id of state.enemyHand) {
    const card = CARD_CATALOG[id];
    if (card && card.cost <= nextEnemyChannel) {
      playableCardsCount += 1;
    }
  }

  return {
    boardCreatureDmg,
    directDemiurgeDmg,
    totalIncomingDmg: boardCreatureDmg + directDemiurgeDmg,
    playableCardsCount,
    expectedEnemyEther,
    mayOverload,
  };
}

export interface BoardCombatPreview {
  directToEnemyArchon: number;
  creatureClashDmg: number;
  enemyUnitsSlain: number;
  readyAttackers: number;
  isLethal: boolean;
}

export function computeBoardCombatPreview(state: DuelState): BoardCombatPreview {
  let directToEnemyArchon = 0;
  let creatureClashDmg = 0;
  let enemyUnitsSlain = 0;
  let readyAttackers = 0;
  const usedGuards = new Set<string>();
  const enemyRemainingHp = state.enemyBoard.map((c) => (c ? c.hp : 0));
  const enemyShielded = state.enemyBoard.map((c) => Boolean(c?.shielded));
  let enemyMirageTrapReady = state.enemyTrap === 'kinet_mirage_ward';
  const ultimatumDouble = state.ultimatumActive && state.playerSchool === 'chaos';

  for (let lane = 0; lane < LANES; lane++) {
    const atk = state.playerBoard[lane];
    if (!atk || atk.stance === 'guard' || atk.exhausted) continue;
    readyAttackers += 1;

    let defLane = lane;
    let def = state.enemyBoard[lane];
    const atkFlying = atk.keywords.includes('flying');
    const directBlocked =
      def !== null && enemyRemainingHp[lane] > 0 && (!atkFlying || def.keywords.includes('flying'));

    if (!directBlocked) {
      const interceptLane = findAdjacentGuard(state.enemyBoard, lane, atkFlying, usedGuards);
      if (interceptLane >= 0 && enemyRemainingHp[interceptLane] > 0) {
        defLane = interceptLane;
        def = state.enemyBoard[interceptLane];
        if (def) usedGuards.add(def.uid);
      } else {
        def = null;
      }
    }

    if (def === null) {
      if (enemyMirageTrapReady) {
        enemyMirageTrapReady = false;
        continue;
      }
      let dmg = atk.atk + (atk.cardId === 'kinet_vortex' ? 1 : 0);
      if (ultimatumDouble) dmg *= 2;
      directToEnemyArchon += dmg;
    } else {
      const guardBonus = def.stance === 'guard' ? 1 : 0;
      const defArmor =
        (def.keywords.includes('armor') ? 1 : 0) + (enemyShielded[defLane] ? 1 : 0) + guardBonus;
      const dmgToDef = Math.max(0, atk.atk - defArmor);
      enemyShielded[defLane] = false;
      enemyRemainingHp[defLane] -= dmgToDef;
      creatureClashDmg += dmgToDef;
      const poisoned = dmgToDef > 0 && atk.keywords.includes('poison');
      if (enemyRemainingHp[defLane] <= 0 || poisoned) {
        enemyRemainingHp[defLane] = 0;
        enemyUnitsSlain += 1;
      }
    }
  }

  const isLethal = state.enemyHp > 0 && directToEnemyArchon >= state.enemyHp;
  return {
    directToEnemyArchon,
    creatureClashDmg,
    enemyUnitsSlain,
    readyAttackers,
    isLethal,
  };
}
