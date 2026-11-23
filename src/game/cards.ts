import type { MagicSchool } from '../view/assets/creatureTotems';

export type Difficulty = 'apprentice' | 'archmage' | 'cataclysm';
export type CardType = 'creature' | 'spell' | 'ritual' | 'enchantment' | 'trap';
export type Keyword = 'flying' | 'firstStrike' | 'armor' | 'poison' | 'heal';
export type AnomalyId = 'rift' | 'winds' | 'bastion' | 'surge' | 'calm';
export type ActiveAbilityId =
  | 'kinet_chill'
  | 'vital_mend_aura'
  | 'chaos_spark'
  | 'synth_shield_forge';
export type BossPassiveId = 'boss_ember_tithe' | 'boss_rift_sovereign';

export type RelicId =
  | 'relic_ether_core'
  | 'relic_blood_pact'
  | 'relic_veteran_crest'
  | 'relic_arcane_lens'
  | 'relic_phylactery'
  | 'relic_chrono_gear'
  | 'relic_thorn_carapace'
  | 'relic_soul_harvest';

export interface RelicDef {
  id: RelicId;
  school: MagicSchool | 'all';
}

export const RELIC_CATALOG: Record<RelicId, RelicDef> = {
  relic_ether_core: { id: 'relic_ether_core', school: 'synth' },
  relic_blood_pact: { id: 'relic_blood_pact', school: 'chaos' },
  relic_veteran_crest: { id: 'relic_veteran_crest', school: 'all' },
  relic_arcane_lens: { id: 'relic_arcane_lens', school: 'kinet' },
  relic_phylactery: { id: 'relic_phylactery', school: 'all' },
  relic_chrono_gear: { id: 'relic_chrono_gear', school: 'synth' },
  relic_thorn_carapace: { id: 'relic_thorn_carapace', school: 'vital' },
  relic_soul_harvest: { id: 'relic_soul_harvest', school: 'chaos' },
};

export const ALL_RELIC_IDS = Object.keys(RELIC_CATALOG) as RelicId[];

export interface CardDef {
  id: string;
  school: MagicSchool;
  type: CardType;
  cost: number;
  atk?: number;
  hp?: number;
  keywords: Keyword[];
  activeAbility?: ActiveAbilityId;
  spellEffect?: {
    kind:
      | 'damage_target'
      | 'aoe_enemy'
      | 'buff_ally'
      | 'heal_and_buff'
      | 'gain_ether'
      | 'drain_channel'
      | 'double_hp_armor'
      | 'execute_or_burn'
      | 'pulse_draw';
    amount: number;
    hpBonus?: number;
  };
}

export interface OpponentDef {
  id: string;
  stage: number;
  school: MagicSchool;
  baseHp: number;
  isBoss: boolean;
  hasCutscene: boolean;
  bossPassive?: BossPassiveId;
  deck: string[];
}

export const CARD_CATALOG: Record<string, CardDef> = {
  // ZEPHYRITES / KINET (Air, Flying, Precision, Control)
  kinet_sylph: {
    id: 'kinet_sylph',
    school: 'kinet',
    type: 'creature',
    cost: 2,
    atk: 3,
    hp: 2,
    keywords: ['flying'],
  },
  kinet_lance: {
    id: 'kinet_lance',
    school: 'kinet',
    type: 'creature',
    cost: 3,
    atk: 3,
    hp: 3,
    keywords: ['flying', 'firstStrike'],
  },
  kinet_vortex: {
    id: 'kinet_vortex',
    school: 'kinet',
    type: 'creature',
    cost: 4,
    atk: 5,
    hp: 4,
    keywords: ['flying'],
  },
  kinet_zephyr_monk: {
    id: 'kinet_zephyr_monk',
    school: 'kinet',
    type: 'creature',
    cost: 2,
    atk: 2,
    hp: 3,
    keywords: ['flying'],
    activeAbility: 'kinet_chill',
  },
  kinet_bolt: {
    id: 'kinet_bolt',
    school: 'kinet',
    type: 'spell',
    cost: 2,
    keywords: [],
    spellEffect: { kind: 'damage_target', amount: 4 },
  },
  kinet_ether_drain: {
    id: 'kinet_ether_drain',
    school: 'kinet',
    type: 'spell',
    cost: 3,
    keywords: [],
    spellEffect: { kind: 'drain_channel', amount: 3 },
  },
  kinet_wind: {
    id: 'kinet_wind',
    school: 'kinet',
    type: 'ritual',
    cost: 2,
    keywords: [],
    spellEffect: { kind: 'buff_ally', amount: 2, hpBonus: 2 },
  },
  kinet_tempest_aura: {
    id: 'kinet_tempest_aura',
    school: 'kinet',
    type: 'enchantment',
    cost: 3,
    keywords: [],
  },
  kinet_mirage_ward: {
    id: 'kinet_mirage_ward',
    school: 'kinet',
    type: 'trap',
    cost: 2,
    keywords: [],
  },

  // VERDANTS / VITAL (Growth, Healing, Venom, Armor)
  vital_swarm: {
    id: 'vital_swarm',
    school: 'vital',
    type: 'creature',
    cost: 2,
    atk: 2,
    hp: 4,
    keywords: ['heal'],
  },
  vital_stag: {
    id: 'vital_stag',
    school: 'vital',
    type: 'creature',
    cost: 3,
    atk: 3,
    hp: 5,
    keywords: ['armor', 'heal'],
  },
  vital_sprout: {
    id: 'vital_sprout',
    school: 'vital',
    type: 'creature',
    cost: 1,
    atk: 1,
    hp: 4,
    keywords: ['armor'],
  },
  vital_venom: {
    id: 'vital_venom',
    school: 'vital',
    type: 'creature',
    cost: 3,
    atk: 2,
    hp: 3,
    keywords: ['poison'],
  },
  vital_thorn_druid: {
    id: 'vital_thorn_druid',
    school: 'vital',
    type: 'creature',
    cost: 2,
    atk: 2,
    hp: 4,
    keywords: ['armor'],
    activeAbility: 'vital_mend_aura',
  },
  vital_mend: {
    id: 'vital_mend',
    school: 'vital',
    type: 'ritual',
    cost: 2,
    keywords: [],
    spellEffect: { kind: 'heal_and_buff', amount: 5, hpBonus: 1 },
  },
  vital_overgrowth: {
    id: 'vital_overgrowth',
    school: 'vital',
    type: 'ritual',
    cost: 3,
    keywords: [],
    spellEffect: { kind: 'double_hp_armor', amount: 1 },
  },
  vital_grove_heart: {
    id: 'vital_grove_heart',
    school: 'vital',
    type: 'enchantment',
    cost: 3,
    keywords: [],
  },
  vital_bramble_trap: {
    id: 'vital_bramble_trap',
    school: 'vital',
    type: 'trap',
    cost: 2,
    keywords: [],
  },

  // PYROCLASTS / CHAOS (High attack, First Strike, Burn)
  chaos_ifrit: {
    id: 'chaos_ifrit',
    school: 'chaos',
    type: 'creature',
    cost: 3,
    atk: 4,
    hp: 3,
    keywords: ['firstStrike'],
  },
  chaos_hound: {
    id: 'chaos_hound',
    school: 'chaos',
    type: 'creature',
    cost: 2,
    atk: 4,
    hp: 2,
    keywords: [],
  },
  chaos_lord: {
    id: 'chaos_lord',
    school: 'chaos',
    type: 'creature',
    cost: 5,
    atk: 6,
    hp: 5,
    keywords: ['firstStrike'],
  },
  chaos_pyromancer: {
    id: 'chaos_pyromancer',
    school: 'chaos',
    type: 'creature',
    cost: 2,
    atk: 2,
    hp: 2,
    keywords: ['firstStrike'],
    activeAbility: 'chaos_spark',
  },
  chaos_discharge: {
    id: 'chaos_discharge',
    school: 'chaos',
    type: 'spell',
    cost: 3,
    keywords: [],
    spellEffect: { kind: 'damage_target', amount: 5 },
  },
  chaos_flare: {
    id: 'chaos_flare',
    school: 'chaos',
    type: 'spell',
    cost: 4,
    keywords: [],
    spellEffect: { kind: 'aoe_enemy', amount: 3 },
  },
  chaos_eruption: {
    id: 'chaos_eruption',
    school: 'chaos',
    type: 'spell',
    cost: 4,
    keywords: [],
    spellEffect: { kind: 'execute_or_burn', amount: 5 },
  },
  chaos_inferno_altar: {
    id: 'chaos_inferno_altar',
    school: 'chaos',
    type: 'enchantment',
    cost: 3,
    keywords: [],
  },
  chaos_cinder_trap: {
    id: 'chaos_cinder_trap',
    school: 'chaos',
    type: 'trap',
    cost: 2,
    keywords: [],
  },

  // ARTIFICERS / SYNTH (Armor, First Strike, Channel, Shields)
  synth_construct: {
    id: 'synth_construct',
    school: 'synth',
    type: 'creature',
    cost: 3,
    atk: 2,
    hp: 5,
    keywords: ['armor'],
  },
  synth_golem: {
    id: 'synth_golem',
    school: 'synth',
    type: 'creature',
    cost: 4,
    atk: 4,
    hp: 5,
    keywords: ['armor', 'firstStrike'],
  },
  synth_blade: {
    id: 'synth_blade',
    school: 'synth',
    type: 'creature',
    cost: 2,
    atk: 3,
    hp: 2,
    keywords: ['firstStrike'],
  },
  synth_chrono_smith: {
    id: 'synth_chrono_smith',
    school: 'synth',
    type: 'creature',
    cost: 3,
    atk: 2,
    hp: 4,
    keywords: ['armor'],
    activeAbility: 'synth_shield_forge',
  },
  synth_ward: {
    id: 'synth_ward',
    school: 'synth',
    type: 'ritual',
    cost: 2,
    keywords: [],
    spellEffect: { kind: 'buff_ally', amount: 1, hpBonus: 2 },
  },
  synth_overload: {
    id: 'synth_overload',
    school: 'synth',
    type: 'ritual',
    cost: 0,
    keywords: [],
    spellEffect: { kind: 'gain_ether', amount: 3 },
  },
  synth_arcane_pulse: {
    id: 'synth_arcane_pulse',
    school: 'synth',
    type: 'spell',
    cost: 3,
    keywords: [],
    spellEffect: { kind: 'pulse_draw', amount: 3 },
  },
  synth_aether_forge: {
    id: 'synth_aether_forge',
    school: 'synth',
    type: 'enchantment',
    cost: 3,
    keywords: [],
  },
  synth_stasis_ward: {
    id: 'synth_stasis_ward',
    school: 'synth',
    type: 'trap',
    cost: 2,
    keywords: [],
  },
};

export const ALL_CARD_IDS = Object.keys(CARD_CATALOG);

export const STARTER_DECKS: Record<MagicSchool, string[]> = {
  kinet: [
    'kinet_sylph', 'kinet_zephyr_monk', 'kinet_lance', 'kinet_bolt', 'kinet_ether_drain',
    'kinet_wind', 'kinet_vortex', 'kinet_tempest_aura', 'kinet_mirage_ward',
    'synth_blade', 'vital_swarm', 'synth_overload',
  ],
  vital: [
    'vital_sprout', 'vital_thorn_druid', 'vital_swarm', 'vital_stag', 'vital_venom',
    'vital_mend', 'vital_overgrowth', 'vital_grove_heart', 'vital_bramble_trap',
    'synth_construct', 'kinet_sylph', 'synth_overload',
  ],
  chaos: [
    'chaos_hound', 'chaos_pyromancer', 'chaos_ifrit', 'chaos_discharge', 'chaos_flare',
    'chaos_eruption', 'chaos_lord', 'chaos_inferno_altar', 'chaos_cinder_trap',
    'kinet_sylph', 'vital_mend', 'synth_overload',
  ],
  synth: [
    'synth_blade', 'synth_blade', 'synth_construct', 'synth_chrono_smith', 'synth_golem',
    'synth_ward', 'synth_overload', 'synth_aether_forge', 'synth_stasis_ward',
    'synth_arcane_pulse', 'kinet_sylph', 'vital_sprout',
  ],
};

export const TOURNAMENT_OPPONENTS: OpponentDef[] = [
  {
    id: 's1',
    stage: 1,
    school: 'kinet',
    baseHp: 18,
    isBoss: false,
    hasCutscene: true,
    deck: ['kinet_sylph', 'kinet_zephyr_monk', 'vital_sprout', 'kinet_bolt', 'kinet_lance', 'synth_blade'],
  },
  {
    id: 's2',
    stage: 2,
    school: 'synth',
    baseHp: 21,
    isBoss: false,
    hasCutscene: false,
    deck: ['synth_blade', 'synth_construct', 'synth_chrono_smith', 'synth_aether_forge', 'kinet_bolt', 'synth_golem'],
  },
  {
    id: 's3',
    stage: 3,
    school: 'vital',
    baseHp: 23,
    isBoss: false,
    hasCutscene: false,
    deck: ['vital_sprout', 'vital_thorn_druid', 'vital_swarm', 'vital_grove_heart', 'vital_stag', 'kinet_lance'],
  },
  {
    id: 's4',
    stage: 4,
    school: 'chaos',
    baseHp: 26,
    isBoss: true,
    hasCutscene: true,
    bossPassive: 'boss_ember_tithe',
    deck: ['chaos_hound', 'chaos_pyromancer', 'chaos_ifrit', 'chaos_inferno_altar', 'chaos_flare', 'chaos_lord'],
  },
  {
    id: 's5',
    stage: 5,
    school: 'kinet',
    baseHp: 27,
    isBoss: false,
    hasCutscene: false,
    deck: ['kinet_sylph', 'kinet_zephyr_monk', 'kinet_lance', 'kinet_vortex', 'kinet_tempest_aura', 'kinet_mirage_ward', 'kinet_bolt', 'synth_golem'],
  },
  {
    id: 's6',
    stage: 6,
    school: 'synth',
    baseHp: 30,
    isBoss: false,
    hasCutscene: false,
    deck: ['synth_blade', 'vital_sprout', 'synth_construct', 'synth_golem', 'synth_aether_forge', 'synth_stasis_ward', 'synth_arcane_pulse', 'chaos_discharge'],
  },
  {
    id: 's7',
    stage: 7,
    school: 'chaos',
    baseHp: 35,
    isBoss: true,
    hasCutscene: true,
    bossPassive: 'boss_rift_sovereign',
    deck: ['chaos_hound', 'chaos_pyromancer', 'synth_golem', 'chaos_lord', 'chaos_ifrit', 'chaos_inferno_altar', 'chaos_cinder_trap', 'chaos_eruption', 'kinet_vortex'],
  },
];

export const ANOMALY_ROTATION: AnomalyId[] = ['rift', 'winds', 'bastion', 'surge', 'calm'];

