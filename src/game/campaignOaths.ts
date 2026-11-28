import type { MagicSchool } from '../view/assets/creatureTotems';
import type { CodexSaveData } from './cathedralMeta';

export type CathedralOathId =
  | 'oath_contracts'
  | 'oath_forge'
  | 'oath_orders'
  | 'oath_slayers'
  | 'oath_trial';

export interface CathedralOathDef {
  id: CathedralOathId;
  school: MagicSchool;
  target: number;
}

export interface CathedralOathProgress {
  id: CathedralOathId;
  school: MagicSchool;
  current: number;
  target: number;
  progressRatio: number;
  completed: boolean;
}

export interface CodexMasterySummary {
  completedCount: number;
  totalCount: number;
  rank: 1 | 2 | 3 | 4;
}

export const CATHEDRAL_OATHS: readonly CathedralOathDef[] = [
  { id: 'oath_contracts', school: 'kinet', target: 3 },
  { id: 'oath_forge', school: 'synth', target: 3 },
  { id: 'oath_orders', school: 'vital', target: 2 },
  { id: 'oath_slayers', school: 'chaos', target: 7 },
  { id: 'oath_trial', school: 'synth', target: 1 },
] as const;

export function countDistinctOrderWins(codex: CodexSaveData): number {
  const schools: MagicSchool[] = ['kinet', 'vital', 'chaos', 'synth'];
  let count = 0;
  for (const sc of schools) {
    if ((codex.orderWins[sc] ?? 0) > 0) count += 1;
  }
  return count;
}

export function getOathRawValue(id: CathedralOathId, codex: CodexSaveData): number {
  switch (id) {
    case 'oath_contracts':
      return Math.max(0, codex.contractsCompleted ?? 0);
    case 'oath_forge':
      return Math.max(0, codex.forgesCompleted ?? 0);
    case 'oath_orders':
      return countDistinctOrderWins(codex);
    case 'oath_slayers':
      return Math.max(0, codex.stagesClearedCount ?? 0);
    case 'oath_trial':
      return Math.max(0, codex.trialsCompleted ?? 0);
  }
}

export function evaluateCathedralOaths(codex: CodexSaveData): CathedralOathProgress[] {
  return CATHEDRAL_OATHS.map((def) => {
    const raw = getOathRawValue(def.id, codex);
    const current = Math.min(def.target, raw);
    return {
      id: def.id,
      school: def.school,
      current,
      target: def.target,
      progressRatio: def.target > 0 ? Math.min(1, current / def.target) : 1,
      completed: raw >= def.target,
    };
  });
}

export function getCodexMasterySummary(codex: CodexSaveData): CodexMasterySummary {
  const evaluated = evaluateCathedralOaths(codex);
  const completedCount = evaluated.filter((o) => o.completed).length;
  const totalCount = evaluated.length;
  const rank: 1 | 2 | 3 | 4 =
    completedCount >= 5 ? 4 : completedCount >= 3 ? 3 : completedCount >= 1 ? 2 : 1;
  return { completedCount, totalCount, rank };
}
