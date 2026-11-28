import { createRng } from '../core/rng';
import type { MagicSchool } from '../view/assets/creatureTotems';
import {
  ALL_RELIC_IDS,
  CARD_CATALOG,
  type RelicId,
} from './cards';

export type TrialModifierId = 'frail_pact' | 'ether_tide' | 'titan_vow';

export interface DailyTrialConfig {
  dateKey: string;
  seed: number;
  modifier: TrialModifierId;
  school: MagicSchool;
}

const TRIAL_MODIFIERS: TrialModifierId[] = ['frail_pact', 'ether_tide', 'titan_vow'];
const TRIAL_SCHOOLS: MagicSchool[] = ['kinet', 'vital', 'chaos', 'synth'];

export function getDailyTrialConfig(date: Date = new Date()): DailyTrialConfig {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const dateKey = `${yyyy}-${mm}-${dd}`;
  const numericSeed = yyyy * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  const rng = createRng(numericSeed ^ 0x5a17c3);
  const modifier = TRIAL_MODIFIERS[Math.floor(rng.next() * TRIAL_MODIFIERS.length)];
  const school = TRIAL_SCHOOLS[Math.floor(rng.next() * TRIAL_SCHOOLS.length)];
  return {
    dateKey,
    seed: numericSeed,
    modifier,
    school,
  };
}

export type CrossroadsEventId =
  | 'obsidian_obelisk'
  | 'silent_sanctuary'
  | 'astral_anvil'
  | 'sanguine_chalice';

export interface CrossroadsEventDef {
  id: CrossroadsEventId;
  icon: string;
  schoolAccent: MagicSchool;
  requiresPurgeableDeck?: boolean;
}

export const CROSSROADS_POOL: CrossroadsEventDef[] = [
  { id: 'obsidian_obelisk', icon: '◈', schoolAccent: 'chaos' },
  { id: 'silent_sanctuary', icon: '✦', schoolAccent: 'vital' },
  { id: 'astral_anvil', icon: '⚒', schoolAccent: 'synth' },
  { id: 'sanguine_chalice', icon: '⚗', schoolAccent: 'kinet' },
];

export function getCrossroadsOptions(stageIndex: number, seed: number): CrossroadsEventDef[] {
  const rng = createRng(seed + stageIndex * 313 + 77);
  const pool = [...CROSSROADS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 2);
}

export interface CrossroadsApplyInput {
  eventId: CrossroadsEventId;
  deck: string[];
  forgedCards: Record<string, number>;
  relics: RelicId[];
  maxHpBonus: number;
  startingResonanceBonus: number;
  seed: number;
}

export interface CrossroadsApplyResult {
  deck: string[];
  forgedCards: Record<string, number>;
  relics: RelicId[];
  maxHpBonus: number;
  startingResonanceBonus: number;
  outcomeCardId?: string;
  outcomeRelicId?: RelicId;
}

export function applyCrossroadsChoice(input: CrossroadsApplyInput): CrossroadsApplyResult {
  const rng = createRng(input.seed + input.eventId.length * 19);
  const nextDeck = [...input.deck];
  const nextForged = { ...input.forgedCards };
  const nextRelics = [...input.relics];
  let maxHpBonus = input.maxHpBonus;
  let startingResonanceBonus = input.startingResonanceBonus;
  let outcomeCardId: string | undefined;
  let outcomeRelicId: RelicId | undefined;

  if (input.eventId === 'obsidian_obelisk') {
    maxHpBonus -= 3;
    const availableRelics = ALL_RELIC_IDS.filter((r) => !nextRelics.includes(r));
    if (availableRelics.length > 0) {
      outcomeRelicId = availableRelics[Math.floor(rng.next() * availableRelics.length)];
      nextRelics.push(outcomeRelicId);
    } else {
      startingResonanceBonus = Math.min(3, startingResonanceBonus + 2);
    }
  } else if (input.eventId === 'silent_sanctuary') {
    maxHpBonus += 3;
    if (nextDeck.length > 8) {
      let weakestIdx = 0;
      let weakestCost = Infinity;
      for (let i = 0; i < nextDeck.length; i++) {
        const c = CARD_CATALOG[nextDeck[i]];
        const score = (c?.cost ?? 9) + (nextForged[nextDeck[i]] ?? 0) * 3;
        if (score < weakestCost) {
          weakestCost = score;
          weakestIdx = i;
        }
      }
      outcomeCardId = nextDeck[weakestIdx];
      nextDeck.splice(weakestIdx, 1);
    }
  } else if (input.eventId === 'astral_anvil') {
    const forgeCandidates = Array.from(new Set(nextDeck)).filter(
      (id) => (nextForged[id] ?? 0) < 2
    );
    if (forgeCandidates.length > 0) {
      const picked = forgeCandidates[Math.floor(rng.next() * forgeCandidates.length)];
      nextForged[picked] = Math.min(2, (nextForged[picked] ?? 0) + 1);
      outcomeCardId = picked;
    } else {
      startingResonanceBonus = Math.min(3, startingResonanceBonus + 1);
    }
  } else if (input.eventId === 'sanguine_chalice') {
    maxHpBonus -= 2;
    startingResonanceBonus = Math.min(3, startingResonanceBonus + 2);
  }

  return {
    deck: nextDeck,
    forgedCards: nextForged,
    relics: nextRelics,
    maxHpBonus,
    startingResonanceBonus,
    outcomeCardId,
    outcomeRelicId,
  };
}

export interface CodexSaveData {
  discoveredCards: string[];
  discoveredRelics: RelicId[];
  orderWins: Record<MagicSchool, number>;
  bestTrialDate: string | null;
  bestTrialStage: number;
  bestTrialScore: number;
  trialsCompleted: number;
  contractsCompleted: number;
  forgesCompleted: number;
  stagesClearedCount: number;
}

const CODEX_STORAGE_KEY = 'obsidian_arcanum_codex_v1';

export function createDefaultCodex(): CodexSaveData {
  return {
    discoveredCards: [],
    discoveredRelics: [],
    orderWins: { kinet: 0, vital: 0, chaos: 0, synth: 0 },
    bestTrialDate: null,
    bestTrialStage: 0,
    bestTrialScore: 0,
    trialsCompleted: 0,
    contractsCompleted: 0,
    forgesCompleted: 0,
    stagesClearedCount: 0,
  };
}

export function loadCodexSave(storage?: Storage): CodexSaveData {
  const def = createDefaultCodex();
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return def;
    const raw = store.getItem(CODEX_STORAGE_KEY);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<CodexSaveData>;
    return {
      discoveredCards: Array.isArray(parsed.discoveredCards) ? parsed.discoveredCards : [],
      discoveredRelics: Array.isArray(parsed.discoveredRelics) ? parsed.discoveredRelics : [],
      orderWins: {
        kinet: parsed.orderWins?.kinet ?? 0,
        vital: parsed.orderWins?.vital ?? 0,
        chaos: parsed.orderWins?.chaos ?? 0,
        synth: parsed.orderWins?.synth ?? 0,
      },
      bestTrialDate: typeof parsed.bestTrialDate === 'string' ? parsed.bestTrialDate : null,
      bestTrialStage: typeof parsed.bestTrialStage === 'number' ? parsed.bestTrialStage : 0,
      bestTrialScore: typeof parsed.bestTrialScore === 'number' ? parsed.bestTrialScore : 0,
      trialsCompleted: typeof parsed.trialsCompleted === 'number' ? parsed.trialsCompleted : 0,
      contractsCompleted: typeof parsed.contractsCompleted === 'number' ? parsed.contractsCompleted : 0,
      forgesCompleted: typeof parsed.forgesCompleted === 'number' ? parsed.forgesCompleted : 0,
      stagesClearedCount: typeof parsed.stagesClearedCount === 'number' ? parsed.stagesClearedCount : 0,
    };
  } catch {
    return def;
  }
}

export function saveCodexSave(data: CodexSaveData, storage?: Storage): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!store) return;
    store.setItem(CODEX_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export function recordCardsDiscovered(codex: CodexSaveData, cardIds: string[]): CodexSaveData {
  const set = new Set(codex.discoveredCards);
  let changed = false;
  for (const id of cardIds) {
    if (CARD_CATALOG[id] && !set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (!changed) return codex;
  return { ...codex, discoveredCards: Array.from(set) };
}

export function recordRelicsDiscovered(codex: CodexSaveData, relicIds: RelicId[]): CodexSaveData {
  const set = new Set(codex.discoveredRelics);
  let changed = false;
  for (const id of relicIds) {
    if (!set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (!changed) return codex;
  return { ...codex, discoveredRelics: Array.from(set) };
}

export function recordOrderVictory(codex: CodexSaveData, school: MagicSchool): CodexSaveData {
  return {
    ...codex,
    orderWins: {
      ...codex.orderWins,
      [school]: (codex.orderWins[school] ?? 0) + 1,
    },
  };
}

export function recordTrialRun(
  codex: CodexSaveData,
  params: { dateKey: string; stageReached: number; score: number; completed: boolean }
): CodexSaveData {
  const betterStage = params.stageReached > codex.bestTrialStage;
  const betterScore = params.score > codex.bestTrialScore;
  return {
    ...codex,
    bestTrialDate: betterStage || betterScore ? params.dateKey : codex.bestTrialDate,
    bestTrialStage: Math.max(codex.bestTrialStage, params.stageReached),
    bestTrialScore: Math.max(codex.bestTrialScore, params.score),
    trialsCompleted: codex.trialsCompleted + (params.completed ? 1 : 0),
  };
}

export function recordContractCompleted(codex: CodexSaveData): CodexSaveData {
  return {
    ...codex,
    contractsCompleted: (codex.contractsCompleted ?? 0) + 1,
  };
}

export function recordForgeCompleted(codex: CodexSaveData): CodexSaveData {
  return {
    ...codex,
    forgesCompleted: (codex.forgesCompleted ?? 0) + 1,
  };
}

export function recordStageCleared(codex: CodexSaveData): CodexSaveData {
  return {
    ...codex,
    stagesClearedCount: (codex.stagesClearedCount ?? 0) + 1,
  };
}

export type RivalQuipTrigger = 'summon_sig' | 'heavy_hit' | 'overload_react';

export const STAGE_SIGNATURE_CARDS: Record<number, string[]> = {
  0: ['kinet_gale_knight', 'kinet_valkyrie'],
  1: ['synth_golem', 'synth_chronarch'],
  2: ['vital_hydra', 'vital_elder'],
  3: ['chaos_wyvern', 'chaos_ifrit'],
  4: ['kinet_valkyrie', 'synth_dragon'],
  5: ['synth_dragon', 'synth_chronarch'],
  6: ['chaos_dragon', 'kinet_valkyrie'],
};

export function pickRivalCombatQuipKey(
  stageIndex: number,
  trigger: RivalQuipTrigger
): string {
  const clampedStage = Math.max(0, Math.min(6, stageIndex));
  return `stage_${clampedStage}_${trigger}`;
}

export interface ChronicleChapterMeta {
  id: 'veil_rose' | 'four_orders' | 'anomalies_cycle' | 'obsidian_oath';
  school: MagicSchool;
  unlockWinsRequired: number;
}

export const CHRONICLE_CHAPTERS: ChronicleChapterMeta[] = [
  { id: 'veil_rose', school: 'kinet', unlockWinsRequired: 0 },
  { id: 'four_orders', school: 'synth', unlockWinsRequired: 0 },
  { id: 'anomalies_cycle', school: 'chaos', unlockWinsRequired: 1 },
  { id: 'obsidian_oath', school: 'vital', unlockWinsRequired: 2 },
];
