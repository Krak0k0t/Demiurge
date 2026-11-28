import type { MagicSchool } from '../view/assets/creatureTotems';
import type { CardDef } from './cards';
import type { DuelState } from './duelEngine';

export interface SchoolCardChrome {
  borderHex: string;
  glowRgba: string;
  accentHex: string;
}

export const SCHOOL_CARD_CHROME: Record<MagicSchool, SchoolCardChrome> = {
  kinet: {
    borderHex: '#4FA89E',
    glowRgba: 'rgba(94, 200, 190, 0.34)',
    accentHex: '#7BE6DB',
  },
  vital: {
    borderHex: '#C79B42',
    glowRgba: 'rgba(226, 179, 84, 0.34)',
    accentHex: '#FFE29A',
  },
  chaos: {
    borderHex: '#C94E3C',
    glowRgba: 'rgba(229, 102, 76, 0.38)',
    accentHex: '#FF9482',
  },
  synth: {
    borderHex: '#7898B5',
    glowRgba: 'rgba(130, 168, 204, 0.34)',
    accentHex: '#B6D3EE',
  },
};

export interface CardPlayAffordance {
  affordable: boolean;
  isCrossOrderSynergy: boolean;
  canFuse: boolean;
  edgeColor: string;
  edgeGlow: string;
}

export function evaluateCardPlayAffordance(
  card: CardDef,
  effectiveCost: number,
  state: Pick<
    DuelState,
    'playerSchool' | 'playerEther' | 'altarMode' | 'crossSchoolTriggeredThisTurn' | 'playerBoard'
  >,
  mulliganMode: boolean
): CardPlayAffordance {
  const affordable = mulliganMode || state.altarMode || state.playerEther >= effectiveCost;
  const isCrossOrderSynergy =
    card.school !== state.playerSchool &&
    !state.crossSchoolTriggeredThisTurn &&
    !state.altarMode &&
    !mulliganMode;
  const hasAlly = state.playerBoard.some((c) => c !== null);
  const canFuse =
    card.type === 'creature' &&
    hasAlly &&
    !state.altarMode &&
    !mulliganMode &&
    state.playerEther >= effectiveCost;

  const chrome = SCHOOL_CARD_CHROME[card.school];
  const edgeColor = state.altarMode ? '#D95843' : affordable ? chrome.borderHex : '#47404E';
  const edgeGlow = state.altarMode
    ? 'rgba(217, 88, 67, 0.42)'
    : affordable
      ? chrome.glowRgba
      : 'rgba(0, 0, 0, 0)';

  return {
    affordable,
    isCrossOrderSynergy,
    canFuse,
    edgeColor,
    edgeGlow,
  };
}

export interface TurnThreatDelta {
  netDamageDelta: number;
  isDanger: boolean;
}

export function computeNetThreatDelta(
  outgoingDirectDmg: number,
  incomingDirectDmg: number,
  playerHp: number
): TurnThreatDelta {
  return {
    netDamageDelta: outgoingDirectDmg - incomingDirectDmg,
    isDanger: incomingDirectDmg >= playerHp && incomingDirectDmg > 0,
  };
}
