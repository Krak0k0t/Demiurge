import { createRng } from '../core/rng';
import type { MagicSchool } from '../view/assets/creatureTotems';

export type DuelQuestId =
  | 'summon_swarm'
  | 'spell_weaver'
  | 'aegis_bulwark'
  | 'pure_channel'
  | 'swift_verdict'
  | 'resonance_burst';

export interface QuestProgressCounters {
  summoned: number;
  spells: number;
  shields: number;
  resonanceUsed: number;
}

export interface DuelQuestState {
  id: DuelQuestId;
  target: number;
  progress: number;
  bonusXp: number;
  completed: boolean;
}

interface QuestSpec {
  id: DuelQuestId;
  target: number;
  bonusXp: number;
}

const QUEST_POOL: QuestSpec[] = [
  { id: 'summon_swarm', target: 3, bonusXp: 55 },
  { id: 'spell_weaver', target: 2, bonusXp: 55 },
  { id: 'aegis_bulwark', target: 2, bonusXp: 60 },
  { id: 'pure_channel', target: 1, bonusXp: 70 },
  { id: 'swift_verdict', target: 1, bonusXp: 75 },
  { id: 'resonance_burst', target: 1, bonusXp: 65 },
];

const SCHOOL_PREFERRED_QUESTS: Record<MagicSchool, DuelQuestId[]> = {
  kinet: ['spell_weaver', 'swift_verdict', 'resonance_burst'],
  vital: ['summon_swarm', 'pure_channel', 'aegis_bulwark'],
  chaos: ['swift_verdict', 'spell_weaver', 'resonance_burst'],
  synth: ['aegis_bulwark', 'summon_swarm', 'resonance_burst'],
};

export function createInitialQuestCounters(): QuestProgressCounters {
  return {
    summoned: 0,
    spells: 0,
    shields: 0,
    resonanceUsed: 0,
  };
}

export function generateDuelQuest(
  stageIndex: number,
  playerSchool: MagicSchool,
  seed: number
): DuelQuestState {
  const rng = createRng(seed + stageIndex * 131 + 29);
  const preferredIds = SCHOOL_PREFERRED_QUESTS[playerSchool] ?? ['summon_swarm'];
  const usePreferred = rng.next() < 0.72;
  const candidateIds = usePreferred ? preferredIds : QUEST_POOL.map((q) => q.id);
  const pickedId = candidateIds[Math.floor(rng.next() * candidateIds.length) % candidateIds.length];
  const spec = QUEST_POOL.find((q) => q.id === pickedId) ?? QUEST_POOL[0];
  return {
    id: spec.id,
    target: spec.target,
    progress: 0,
    bonusXp: spec.bonusXp,
    completed: false,
  };
}

export function evaluateQuestProgress(
  quest: DuelQuestState | undefined,
  counters: QuestProgressCounters,
  summary: { phase: string; round: number; overloadCount: number }
): DuelQuestState | undefined {
  if (!quest) return undefined;

  let progress = quest.progress;
  let completed = quest.completed;

  if (quest.id === 'summon_swarm') {
    progress = Math.min(quest.target, counters.summoned);
    completed = progress >= quest.target;
  } else if (quest.id === 'spell_weaver') {
    progress = Math.min(quest.target, counters.spells);
    completed = progress >= quest.target;
  } else if (quest.id === 'aegis_bulwark') {
    progress = Math.min(quest.target, counters.shields);
    completed = progress >= quest.target;
  } else if (quest.id === 'resonance_burst') {
    progress = Math.min(quest.target, counters.resonanceUsed);
    completed = progress >= quest.target;
  } else if (quest.id === 'pure_channel') {
    completed = summary.phase === 'victory' && summary.overloadCount === 0;
    progress = completed ? 1 : 0;
  } else if (quest.id === 'swift_verdict') {
    completed = summary.phase === 'victory' && summary.round <= 6;
    progress = completed ? 1 : 0;
  }

  if (progress === quest.progress && completed === quest.completed) {
    return quest;
  }
  return {
    ...quest,
    progress,
    completed,
  };
}

export function computeQuestXpBonus(quest?: DuelQuestState): number {
  return quest?.completed ? quest.bonusXp : 0;
}
