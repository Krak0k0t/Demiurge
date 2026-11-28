export type LanguageCode =
  | 'en'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'zh'
  | 'ar'
  | 'uk'
  | 'ru'
  | 'ja'
  | 'pl'
  | 'it'
  | 'vi'
  | 'fa'
  | 'elvish'
  | 'orcish';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  rtl?: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'es', nativeName: 'Español' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ar', nativeName: 'العربية', rtl: true },
  { code: 'uk', nativeName: 'Українська' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
  { code: 'fa', nativeName: 'فارسی', rtl: true },
  { code: 'elvish', nativeName: 'Eldarin (Elvish)' },
  { code: 'orcish', nativeName: 'Orkish (Orcish)' },
];

export interface TranslationPack {
  gameTitle: string;
  subtitle: string;
  startDuel: string;
  continueCampaign: string;
  difficulty: string;
  diffApprentice: string;
  diffArchmage: string;
  diffCataclysm: string;
  schoolLabel: string;
  schoolKinet: string;
  schoolVital: string;
  schoolChaos: string;
  schoolSynth: string;
  language: string;
  graphicsLabel: string;
  gfxUltra: string;
  gfxHigh: string;
  gfxMedium: string;
  gfxLow: string;
  fullscreen: string;
  exitFullscreen: string;
  soundOn: string;
  soundOff: string;
  menu: string;
  resume: string;
  restart: string;
  exitToMenu: string;
  round: string;
  anomaly: string;
  yourTurn: string;
  enemyTurn: string;
  endTurn: string;
  endTurnShort: string;
  attackAll: string;
  overloadBtn: string;
  overloadShort: string;
  overloadActive: string;
  altarBtn: string;
  altarShort: string;
  altarActive: string;
  ultimatumBtn: string;
  ultimatumUsed: string;
  leapPulseBtn: string;
  leapShort: string;
  hp: string;
  ether: string;
  deck: string;
  stage: string;
  camCombat: string;
  camClose: string;
  camWide: string;
  draftTitle: string;
  draftHint: string;
  replacePrompt: string;
  keepDeck: string;
  victoryTitle: string;
  defeatTitle: string;
  campaignWinTitle: string;
  nextDuel: string;
  playAgain: string;
  briefingContinue: string;
  controlsHint: string;
  statDamageDealt: string;
  statOverloads: string;
  statTurns: string;
  statStageReached: string;
  enemyPrefix: string;
  keywordFlying: string;
  keywordFirstStrike: string;
  keywordArmor: string;
  keywordPoison: string;
  keywordHeal: string;
  keywordSpell: string;
  keywordRitual: string;
  keywordEnchantment: string;
  keywordTrap: string;
  veteranTag: string;
  intentLabel: string;
  intentDirect: string;
  intentClash: string;
  intentReserve: string;
  fastCombatLabel: string;
  fastCombatOn: string;
  fastCombatOff: string;
  hoverInspectorLabel: string;
  hoverInspectorOn: string;
  hoverInspectorOff: string;
  intentWaitingTurn: string;
  intentSavedEther: string;
  intentBoardFull: string;
  boardHintSummon: string;
  boardHintOpenFrontline: string;
  inspectorArchonYou: string;
  inspectorOrder: string;
  inspectorAttack: string;
  inspectorHealth: string;
  inspectorStance: string;
  inspectorStatuses: string;
  inspectorAbility: string;
  inspectorAura: string;
  inspectorWard: string;
  inspectorRelics: string;
  inspectorShielded: string;
  inspectorExhausted: string;
  inspectorSummonSick: string;
  inspectorEmptyAura: string;
  inspectorHiddenWard: string;
  inspectorReadyUlt: string;
  stanceAttack: string;
  stanceGuard: string;
  enchantmentSlot: string;
  trapSlot: string;
  relicsTitle: string;
  relicPickHint: string;
  skipRelic: string;
  manageDeckBtn: string;
  mulliganBtn: string;
  mulliganHint: string;
  mulliganConfirm: string;
  mulliganCancel: string;
  mulliganReplaceTag: string;
  swapBtn: string;
  swapPickSource: string;
  swapPickTarget: string;
  swapLaneLabel: string;
  ascendTag: string;
  ascendHint: string;
  deckRemainingTitle: string;
  deckDrawLeft: string;
  deckEmpty: string;
  combatLogTitle: string;
  combatLogEmpty: string;
  trophyBadge: string;
  chronoRewindBtn: string;
  chronoRewindShort: string;
  chronoRewindSpent: string;
  chronoRewindDesc: string;
  soulTetherBtn: string;
  soulTetherShort: string;
  soulTetherActive: string;
  soulTetherCooldownTag: string;
  soulTetherDesc: string;
  resonanceBtn: string;
  resonanceShort: string;
  chaosBurnBadge: string;
  resonanceReadyBySchool: Record<'kinet' | 'vital' | 'chaos' | 'synth', string>;
  resonanceDescBySchool: Record<'kinet' | 'vital' | 'chaos' | 'synth', string>;
  bossPassiveNames: Record<string, string>;
  bossPassiveDescs: Record<string, string>;
  logKinds: Record<string, string>;
  ultimatumBySchool: Record<'kinet' | 'vital' | 'chaos' | 'synth', string>;
  abilityNames: Record<string, string>;
  abilityDescs: Record<string, string>;
  relicNames: Record<string, string>;
  relicDescs: Record<string, string>;
  keywordDescs: Record<string, string>;
  cardNames: Record<string, string>;
  cardRules: Record<string, string>;
  bossNames: Record<string, string>;
  bossQuotes: Record<string, string>;
  anomalies: Record<string, { name: string; desc: string }>;
  helpBtn: string;
  helpTitle: string;
  helpSubtitle: string;
  helpClose: string;
  altarBannerCancel: string;
  altarBannerExplain: string;
  orderDoctrines: Record<'kinet' | 'vital' | 'chaos' | 'synth', { name: string; desc: string }>;
  archonRankLabel: string;
  xpEarnedLabel: string;
  xpNextRankLabel: string;
  rankBonusSummary: string;
  forgedTag: string;
  forgedBonusCreature: string;
  forgedBonusSpell: string;
  forgedBonusCost: string;
  sanctuaryTitle: string;
  sanctuaryHint: string;
  sanctuaryModes: {
    replace: { title: string; desc: string };
    forge: { title: string; desc: string };
    shrine: { title: string; desc: string };
    purge: { title: string; desc: string };
  };
  shrineEffect: string;
  shrineConfirmBtn: string;
  purgeTooSmall: string;
  targetingPrompt: string;
  targetBtn: string;
  combatResolvingLabel: string;
  rivalActionSummoned: string;
  rivalActionSpell: string;
  rivalActionOverload: string;
  rivalActionSaved: string;
  rivalActionBoardFull: string;
  savedRunSummary: string;
  tournamentPathLabel: string;
  careerBestStage: string;
  lethalTag: string;
  musicCarouselTitle: string;
  musicAutoCarouselBadge: string;
  musicVolumeLabel: string;
  musicPrevTrack: string;
  musicNextTrack: string;
  musicPlayTrack: string;
  musicPauseTrack: string;
  musicModeLabel: string;
  musicModeCarousel: string;
  musicModeDynamic: string;
  musicTracks: Record<'demiurge' | 'demiurge2' | 'demiurge4' | 'demiurges' | 'divine_conflict', { title: string; mood: string }>;
  sfxSchemeLabel: string;
  sfxSchemePreview: string;
  sfxSchemes: Record<'cathedral' | 'forge' | 'astral' | 'cataclysm', { name: string; desc: string }>;
  codexBtn: string;
  titleAudioBtn: string;
  titleSetupBtn: string;
  sanctuaryDrawerTitle: string;
  arcanaWheelBtn: string;
  settingsBtn: string;
  settingsTitle: string;
  uiScaleLabel: string;
  highContrastLabel: string;
  highContrastOn: string;
  highContrastOff: string;
  silkLabel: string;
  composureLabel: string;
  minimapTitle: string;
  patternBarLabel: string;
  patternHoldHint: string;
  worldPromptPlay: string;
  worldPromptLeap: string;
  patterns: Record<'triangle' | 'star' | 'circle' | 'decoy', { name: string; desc: string }>;
  codex: {
    title: string;
    subtitle: string;
    close: string;
    tabs: {
      orders: string;
      vault: string;
      chronicle: string;
    };
    ordersCleared: string;
    bestTrialLabel: string;
    trialCompletedCount: string;
    noTrialYet: string;
    discoveredCardsLabel: string;
    discoveredRelicsLabel: string;
    unknownCard: string;
    lockedChapterHint: string;
    chapters: Record<'veil_rose' | 'four_orders' | 'anomalies_cycle' | 'obsidian_oath', { title: string; text: string }>;
    oathsTitle: string;
    oathsMasteryLabel: string;
    oathCompletedBadge: string;
    oathItems: Record<
      'oath_contracts' | 'oath_forge' | 'oath_orders' | 'oath_slayers' | 'oath_trial',
      { title: string; desc: string }
    >;
  };
  dailyTrial: {
    title: string;
    startBtn: string;
    activeBadge: string;
    dateLabel: string;
    bestRecord: string;
    modifiers: Record<'frail_pact' | 'ether_tide' | 'titan_vow', { name: string; desc: string }>;
  };
  crossroads: {
    title: string;
    subtitle: string;
    hint: string;
    pickBtn: string;
    events: Record<'obsidian_obelisk' | 'silent_sanctuary' | 'astral_anvil' | 'sanguine_chalice', { title: string; reward: string; cost: string }>;
  };
  draftRivalQuotes: Record<string, string>;
  bossCombatQuips: Record<string, string>;
  crossSchoolSynergies: Record<'kinet' | 'vital' | 'chaos' | 'synth', { tag: string; hint: string }>;
  questSectionLabel: string;
  questCompletedTag: string;
  questBonusLabel: string;
  questTitles: Record<'summon_swarm' | 'spell_weaver' | 'aegis_bulwark' | 'pure_channel' | 'swift_verdict' | 'resonance_burst', string>;
  questDescs: Record<'summon_swarm' | 'spell_weaver' | 'aegis_bulwark' | 'pure_channel' | 'swift_verdict' | 'resonance_burst', string>;
  laneRuneNames: Record<'aegis' | 'surge' | 'fury', string>;
  laneRuneDescs: Record<'aegis' | 'surge' | 'fury', string>;
  help: {
    tabs: {
      cards: string;
      actions: string;
      combat: string;
      controls: string;
    };
    cardsIntro: string;
    cardStates: Array<{
      id: 'altar' | 'selected' | 'ready' | 'dim';
      title: string;
      badge: string;
      desc: string;
    }>;
    cardTypesTitle: string;
    cardTypes: Array<{ title: string; desc: string }>;
    actionsIntro: string;
    turnActions: Array<{ title: string; desc: string }>;
    archonPowersTitle: string;
    archonPowers: Array<{ title: string; desc: string }>;
    combatIntro: string;
    combatRules: Array<{ title: string; desc: string }>;
    keywordsTitle: string;
    controlsIntro: string;
    controlsList: Array<{ keyHint: string; desc: string }>;
    arenaSystemsTitle: string;
    arenaSystems: Array<{ title: string; desc: string }>;
  };
}

const EN: TranslationPack = {
  gameTitle: 'OBSIDIAN ARCANUM',
  subtitle: 'Tarot Duel Arena',
  startDuel: 'Enter the Arena',
  continueCampaign: 'Continue Duel',
  difficulty: 'Difficulty',
  diffApprentice: 'Apprentice',
  diffArchmage: 'Archmage',
  diffCataclysm: 'Cataclysm',
  schoolLabel: 'Order',
  schoolKinet: 'Zephyrites',
  schoolVital: 'Verdants',
  schoolChaos: 'Pyroclasts',
  schoolSynth: 'Artificers',
  language: 'Language',
  graphicsLabel: 'Graphics',
  gfxUltra: 'Ultra',
  gfxHigh: 'High',
  gfxMedium: 'Medium',
  gfxLow: 'Low (Eco)',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  soundOn: 'Mute Audio',
  soundOff: 'Enable Audio',
  menu: 'Menu',
  resume: 'Resume Duel',
  restart: 'Restart Duel',
  exitToMenu: 'Main Menu',
  round: 'Round',
  anomaly: 'Arena Anomaly',
  yourTurn: 'Your Turn',
  enemyTurn: 'Rival Thinking…',
  endTurn: 'Strike & End Turn',
  endTurnShort: 'End Turn',
  attackAll: 'Command Strike',
  overloadBtn: 'Overload (+2 Ether / -3 HP)',
  overloadShort: 'Overload +2',
  overloadActive: 'Channel Overloaded',
  altarBtn: 'Altar Sacrifice',
  altarShort: 'Altar',
  altarActive: 'Pick card to burn (+1 Ether & +1/+1)',
  ultimatumBtn: 'Ultimatum (<50% HP: x2 Ether)',
  ultimatumUsed: 'Ultimatum Spent',
  leapPulseBtn: 'Surge Leap (Right-Click)',
  leapShort: 'Leap',
  hp: 'HP',
  ether: 'ETHER',
  deck: 'Deck',
  stage: 'Duel',
  camCombat: 'Duel 42°',
  camClose: 'Close-Up',
  camWide: 'Wide',
  draftTitle: 'Tarot Spoils — Choose 1 of 3',
  draftHint: 'Select a relic card to forge into your deck',
  replacePrompt: 'Pick a card in your deck to replace, or skip',
  keepDeck: 'Keep Current Deck',
  victoryTitle: 'DUEL WON',
  defeatTitle: 'CHANNEL SHATTERED',
  campaignWinTitle: 'GRAND ARCHON ASCENDANT',
  nextDuel: 'Next Opponent',
  playAgain: 'Duel Again',
  briefingContinue: 'Draw First Hand',
  controlsHint: 'Left-Click: Play Cards · Right-Click: Surge Leap · Drag / Touch: Orbit 3D · Wheel / Pinch: Zoom · Space: Overload',
  statDamageDealt: 'Damage Dealt',
  statOverloads: 'Overloads',
  statTurns: 'Rounds',
  statStageReached: 'Stage',
  enemyPrefix: 'Rival',
  keywordFlying: 'Flying',
  keywordFirstStrike: 'First Strike',
  keywordArmor: 'Armor 1',
  keywordPoison: 'Venom',
  keywordHeal: 'Vitality',
  keywordSpell: 'Spell',
  keywordRitual: 'Ritual',
  keywordEnchantment: 'Enchantment',
  keywordTrap: 'Ward',
  veteranTag: 'Veteran',
  intentLabel: 'Intent',
  intentDirect: 'Direct',
  intentClash: 'Clash',
  intentReserve: 'Cards',
  fastCombatLabel: 'Combat Speed',
  fastCombatOn: 'Fast',
  fastCombatOff: 'Cinematic',
  hoverInspectorLabel: 'Hover Tooltips',
  hoverInspectorOn: 'On',
  hoverInspectorOff: 'Off',
  intentWaitingTurn: 'Awaiting 1st Turn',
  intentSavedEther: 'Saved Ether',
  intentBoardFull: 'Board Full',
  boardHintSummon: 'Arena open — Play a creature card onto the ring to build your frontline',
  boardHintOpenFrontline: 'Open rival frontline — Ready attackers strike the rival Archon directly!',
  inspectorArchonYou: 'Your Archon',
  inspectorOrder: 'Order',
  inspectorAttack: 'ATK',
  inspectorHealth: 'HP',
  inspectorStance: 'Stance',
  inspectorStatuses: 'Modifiers',
  inspectorAbility: 'Skill',
  inspectorAura: 'Aura',
  inspectorWard: 'Ward',
  inspectorRelics: 'Relics',
  inspectorShielded: 'Surge Shield',
  inspectorExhausted: 'Exhausted',
  inspectorSummonSick: 'Summon Fatigue',
  inspectorEmptyAura: 'None',
  inspectorHiddenWard: 'Concealed Seal',
  inspectorReadyUlt: 'Ultimatum Ready',
  stanceAttack: 'Attack Stance',
  stanceGuard: 'Guard Stance (Intercepts Adjacent)',
  enchantmentSlot: 'Aura',
  trapSlot: 'Ward',
  relicsTitle: 'Archon Relics',
  relicPickHint: 'Optional Relic Boon — Pick 1 of 3',
  skipRelic: 'Skip Relic',
  manageDeckBtn: 'Deck',
  mulliganBtn: 'Mulligan',
  mulliganHint: 'Pick 1–3 cards to redraw before Round 1',
  mulliganConfirm: 'Redraw',
  mulliganCancel: 'Keep Hand',
  mulliganReplaceTag: 'SWAP',
  swapBtn: 'Swap Lane',
  swapPickSource: 'Click an ally lane to move or swap (1/turn)',
  swapPickTarget: 'Pick destination lane (occupied or empty)',
  swapLaneLabel: 'Lane',
  ascendTag: '+Ascend',
  ascendHint: 'Fuse into ally: +ATK/+HP, Keywords & Shield',
  deckRemainingTitle: 'Remaining Draw Pile',
  deckDrawLeft: 'In Pile',
  deckEmpty: 'Draw pile empty (reshuffles on draw)',
  combatLogTitle: 'Duel Log',
  combatLogEmpty: 'No actions recorded yet',
  trophyBadge: 'Rival Trophy',
  chronoRewindBtn: 'Chrono-Rewind',
  chronoRewindShort: 'Rewind',
  chronoRewindSpent: 'Rewind Spent',
  chronoRewindDesc: 'Once per duel (0⚡): Restore all allies to max HP with Shield & revive last fallen ally.',
  soulTetherBtn: 'Soul Tether',
  soulTetherShort: 'Tether',
  soulTetherActive: 'Tether 50%',
  soulTetherCooldownTag: 'CD',
  soulTetherDesc: '2-round CD (0⚡): Grant ally +2 HP & Shield and reflect 50% of enemy damage to Rival Archon.',
  resonanceBtn: 'Resonance',
  resonanceShort: 'Resonance',
  chaosBurnBadge: 'Cinder Rift',
  resonanceReadyBySchool: {
    kinet: 'Gale Shatter (5/5)',
    vital: 'Verdant Bloom (5/5)',
    chaos: 'Cinder Rift (5/5)',
    synth: 'Solar Barrage (5/5)',
  },
  resonanceDescBySchool: {
    kinet: 'Charges +1 per action. At 5/5 (0⚡): Strip enemy Guards & Shields, draw 1 card & deal 2 DMG to strongest foe.',
    vital: 'Charges +1 per action. At 5/5 (0⚡): Heal Archon +5 HP and grant all allies +1/+2 & Armor 1.',
    chaos: 'Charges +1 per action. At 5/5 (0⚡): Deal 3 AoE DMG, 2 Rival DMG & ignite all enemy lanes (2 DMG/turn for 2 rounds).',
    synth: 'Charges +1 per action. At 5/5 (0⚡): Deal 2 AoE DMG and grant all allies +1/+1 & Shield.',
  },
  bossPassiveNames: {
    boss_forged_bulwark: 'Bronze Bastion',
    boss_briar_thorns: 'Living Briar',
    boss_ember_tithe: 'Ember Tithe',
    boss_astral_blink: 'Astral Veil',
    boss_clockwork_mend: 'Chrono-Mend',
    boss_rift_sovereign: 'Rift Sovereign',
  },
  bossPassiveDescs: {
    boss_forged_bulwark: 'Rival Passive: First summoned ally each turn enters with an Ether Shield.',
    boss_briar_thorns: 'Rival Passive: Reflects 1 thorns DMG to attackers hitting Rival creatures.',
    boss_ember_tithe: 'Boss Passive: Even rounds deal 1 burn DMG & summon a 2/2 Ember Imp.',
    boss_astral_blink: 'Rival Passive: First direct hit on the Rival Archon each turn is halved.',
    boss_clockwork_mend: 'Rival Passive: Restores +1 HP to the Rival’s wounded vanguard each round.',
    boss_rift_sovereign: 'Boss Passive: Shifts Arena Anomaly every round & buffs vanguard +1/+1.',
  },
  logKinds: {
    summon: 'Summon',
    ascend: 'Ascension',
    spell: 'Cast',
    trap: 'Ward',
    intercept: 'Intercept',
    swap: 'Maneuver',
    mulligan: 'Mulligan',
    boss: 'Boss Rite',
    overload: 'Overload',
    ultimatum: 'Ultimatum',
    anomaly: 'Anomaly',
    chrono: 'Chrono-Rewind',
    tether: 'Soul Tether',
    resonance: 'Apotheosis',
    cross: 'Cross-Order',
    rune: 'Lane Rune',
  },
  ultimatumBySchool: {
    kinet: 'Tempest Surge (<50% HP: Draw 2, Shield Flyers & Stun)',
    vital: 'Living Sanctuary (<50% HP: +7 HP, +1/+2 & 2/5 Guard)',
    chaos: 'Obsidian Wrath (<50% HP: 4 AoE & 3 Rival DMG)',
    synth: 'Chrono-Overdrive (<50% HP: +2 Max, x2 Ether & Shield)',
  },
  abilityNames: {
    kinet_chill: 'Gale Freeze',
    vital_mend_aura: 'Sap Mending',
    chaos_spark: 'Cinder Spark',
    synth_shield_forge: 'Aegis Forge',
  },
  abilityDescs: {
    kinet_chill: '1⚡: Enemy -2 ATK & Exhausted (or 1 DMG)',
    vital_mend_aura: '1⚡: Heal Archon +2 HP',
    chaos_spark: '1⚡: Deal 2 DMG to enemy or Archon',
    synth_shield_forge: '1⚡: Grant ally +1/+1 & Shield',
  },
  relicNames: {
    relic_ether_core: 'Chrono Ether Core',
    relic_blood_pact: 'Obsidian Blood Pact',
    relic_veteran_crest: 'Crest of Veterans',
    relic_arcane_lens: 'Astral Prism Lens',
    relic_phylactery: 'Soul Phylactery',
    relic_chrono_gear: 'Astrolabe Mainspring',
    relic_thorn_carapace: 'Bramble Carapace',
    relic_soul_harvest: 'Reaper Chalice',
  },
  relicDescs: {
    relic_ether_core: 'Start every duel with +1 Ether Channel.',
    relic_blood_pact: 'Overload costs 2 HP instead of 3 HP.',
    relic_veteran_crest: 'All summoned creatures gain +1/+1.',
    relic_arcane_lens: 'All damaging & healing spells gain +1 power.',
    relic_phylactery: 'Once per duel, survive lethal at 3 HP (+2 Ether).',
    relic_chrono_gear: 'Start every duel with 5 cards instead of 4.',
    relic_thorn_carapace: 'Guard creatures gain +1 Armor & reflect 1 DMG.',
    relic_soul_harvest: 'Heal +1 HP whenever an enemy creature dies.',
  },
  keywordDescs: {
    flying: 'Flying — Attacks over grounded defenders straight at the rival Archon.',
    firstStrike: 'First Strike — Deals combat damage first; if the target falls, takes no retaliation.',
    armor: 'Armor 1 — Reduces incoming combat damage from attacks by 1.',
    poison: 'Venom — Destroys any enemy creature that takes at least 1 damage from it.',
    heal: 'Vitality — Restores +2 HP to your Archon when summoned.',
    spell: 'Spell — Instant arcane cast targeting enemy frontline or rival.',
    ritual: 'Ritual — Empowers allied totems or accelerates your Ether Channel.',
    enchantment: 'Enchantment — Persistent arena aura active every turn until replaced.',
    trap: 'Ward — Secret arcane seal triggered on the rival’s next spell, summon, or breach.',
    stance: 'Stance — Tap your totem badge to toggle Attack vs Guard (blocks & intercepts adjacent lanes).',
  },
  cardNames: {
    kinet_sylph: 'Winged Sylph',
    kinet_lance: 'Azure Falcon',
    kinet_vortex: 'Gale Arbiter',
    kinet_zephyr_monk: 'Zephyr Monk',
    kinet_bolt: 'Ether Lance',
    kinet_wind: 'Aegis Gust',
    kinet_ether_drain: 'Channel Siphon',
    kinet_tempest_aura: 'Tempest Spire',
    kinet_mirage_ward: 'Mirage Ward',
    vital_swarm: 'Amber Swarm',
    vital_stag: 'Gilded Warden',
    vital_sprout: 'Sunlit Bloom',
    vital_thorn_druid: 'Thorn Druid',
    vital_mend: 'Vital Elixir',
    vital_venom: 'Basilisk Fang',
    vital_overgrowth: 'Elder Overgrowth',
    vital_grove_heart: 'Heart of the Grove',
    vital_bramble_trap: 'Bramble Snare',
    chaos_ifrit: 'Obsidian Ifrit',
    chaos_hound: 'Cinder Hound',
    chaos_lord: 'Pyre Colossus',
    chaos_pyromancer: 'Ash Pyromancer',
    chaos_discharge: 'Ether Discharge',
    chaos_flare: 'Crimson Rupture',
    chaos_eruption: 'Basalt Eruption',
    chaos_inferno_altar: 'Inferno Altar',
    chaos_cinder_trap: 'Cinder Trap',
    synth_construct: 'Bronze Construct',
    synth_golem: 'Astrolabe Sentinel',
    synth_blade: 'Chrono-Striker',
    synth_chrono_smith: 'Chrono-Smith',
    synth_ward: 'Iron Bastion',
    synth_overload: 'Arcane Catalyst',
    synth_arcane_pulse: 'Arcane Pulse',
    synth_aether_forge: 'Aether Forge',
    synth_stasis_ward: 'Stasis Ward',
  },
  cardRules: {
    kinet_sylph: 'Flying. Strikes over ground defenders.',
    kinet_lance: 'Flying · First Strike. Fast aerial duelist.',
    kinet_vortex: 'Flying. Strikes rival Archon for +1 bonus.',
    kinet_zephyr_monk: 'Flying · 1⚡ Ability: Chill enemy -2 ATK & Exhaust.',
    kinet_bolt: 'Deal 4 damage to enemy creature or rival.',
    kinet_wind: 'Grant allies +2/+2 and shield pulse.',
    kinet_ether_drain: 'Deal 2 DMG & gain +1 permanent Ether Channel.',
    kinet_tempest_aura: 'Enchantment: +1 spell power & +1/+1 to summoned Flyers.',
    kinet_mirage_ward: 'Ward: Blocks next direct hit & summons 2/2 Guard Sylph.',
    vital_swarm: 'Heals your Archon +2 HP on summon.',
    vital_stag: 'Armor 1 · Heals +2 HP when summoned.',
    vital_sprout: 'Armor 1. Steadfast guardian of the ring.',
    vital_thorn_druid: '1⚡ Ability: Restore +2 HP to your Archon.',
    vital_mend: 'Restore 5 HP and empower an ally +1/+1.',
    vital_venom: 'Venom. Destroys any creature it wounds.',
    vital_overgrowth: 'Double target ally’s current HP & grant Armor 1.',
    vital_grove_heart: 'Enchantment: Heal +1 HP & +0/+1 weakest ally each turn.',
    vital_bramble_trap: 'Ward: Deals 3 DMG to next summoned enemy & +0/+1 ally.',
    chaos_ifrit: 'First Strike. Burns through frontlines.',
    chaos_hound: 'Aggressive ember beast with raw attack.',
    chaos_lord: 'Towering basalt-fire breaker.',
    chaos_pyromancer: '1⚡ Ability: Deal 2 damage to enemy creature or Archon.',
    chaos_discharge: 'Deal 5 damage to enemy frontline or rival.',
    chaos_flare: 'Deal 3 damage to ALL enemy creatures.',
    chaos_eruption: 'Execute enemy <=4 HP (or deal 4 DMG).',
    chaos_inferno_altar: 'Enchantment: Deal 1 DMG to rival whenever any creature dies.',
    chaos_cinder_trap: 'Ward: Deals 3 DMG to all foes on next spell or breach.',
    synth_construct: 'Armor 1. Reduces incoming combat damage by 1.',
    synth_golem: 'Armor 1 · First Strike. Heavy bronze guardian.',
    synth_blade: 'First Strike. Precision mechanical duelist.',
    synth_chrono_smith: 'Armor 1 · 1⚡ Ability: Grant an ally +1/+1 & Shield.',
    synth_ward: 'Fortify all allies +1/+2 & Shield.',
    synth_overload: 'Gain +3 Ether this turn.',
    synth_arcane_pulse: 'Deal 3 DMG to target enemy & draw 1 card.',
    synth_aether_forge: 'Enchantment: Grant +1/+0 & Shield to strongest ally each turn.',
    synth_stasis_ward: 'Ward: Negate the next offensive enemy spell completely.',
  },
  bossNames: {
    s1: 'Initiate Lyra',
    s2: 'Warden Torin',
    s3: 'Vespera of Thorns',
    s4: 'Ignis-Chancellor',
    s5: 'Magister Vael',
    s6: 'Chronos-Forged Prime',
    s7: 'Archon Corvin',
  },
  bossQuotes: {
    s1: '"Show me if your Ether Channel holds under steel and wind."',
    s2: '"Bronze endures longer than reckless flame, challenger."',
    s3: '"Every wound feeds the amber ring. Bleed wisely."',
    s4: '"Burn brighter or turn to ash before your second breath!"',
    s5: '"Ether forgives no debts. Pay the blood price willingly."',
    s6: '"Precision over chaos. Your probabilities are collapsing."',
    s7: '"The Rift feeds on every Overload. Prove you can master its crown!"',
  },
  anomalies: {
    rift: { name: 'Overheated Rift', desc: 'Spells deal +1 bonus damage' },
    winds: { name: 'Astral Gale', desc: 'Flying units gain +1 ATK' },
    bastion: { name: 'Bronze Resonance', desc: 'All summoned allies gain +0/+1' },
    surge: { name: 'Blood Conduit', desc: 'Overload grants +3 Ether instead of +2' },
    calm: { name: 'Equilibrium', desc: 'Start of round heals both Archons +1 HP' },
  },
  helpBtn: 'Guide',
  helpTitle: 'Obsidian Codex',
  helpSubtitle: 'Card states, Archon powers, combat rules & arena controls',
  helpClose: 'Close',
  altarBannerCancel: 'Cancel Altar',
  altarBannerExplain: 'Altar Sacrifice active (cards glow red) — click any card to burn it for +1 Ether & +1/+1 to allies',
  orderDoctrines: {
    kinet: {
      name: 'Doctrine: Windstep',
      desc: '1st Spell/Ritual each turn refunds +1⚡. 1st Flying summon enters with Shield.',
    },
    vital: {
      name: 'Doctrine: Living Roots',
      desc: 'Summoning heals Archon +1 HP. Weakest ally regenerates +1 HP each round.',
    },
    chaos: {
      name: 'Doctrine: Ember Fury',
      desc: 'Rival summon death & Overload burn Rival -1 HP. Overload grants leftmost ally +1 ATK.',
    },
    synth: {
      name: 'Doctrine: Astrolabe Matrix',
      desc: '1st Artificer summon enters with Shield. Unspent ⚡ turns into +1 Resonance & Shield.',
    },
  },
  archonRankLabel: 'Rank',
  xpEarnedLabel: 'Campaign XP',
  xpNextRankLabel: 'Next Rank',
  rankBonusSummary: '+2 Max HP/Rank · Rank 3+: +1 Turn-1 ⚡',
  forgedTag: 'Forged',
  forgedBonusCreature: '+1/+1 stats',
  forgedBonusSpell: '+2 power & -1 cost (3+⚡)',
  forgedBonusCost: '-1 Ether cost',
  sanctuaryTitle: 'Sanctuary Rite & Deck Crafting',
  sanctuaryHint: 'Shape your tournament deck or anoint your Archon before the next duel',
  sanctuaryModes: {
    replace: { title: 'Replace Card', desc: 'Swap out a card or append to your deck' },
    forge: { title: 'Forge Mastery ★', desc: 'Upgrade any card in deck (+stats / power)' },
    shrine: { title: 'Vitality Shrine', desc: '+3 Max HP & +2 Starting Resonance' },
    purge: { title: 'Arcane Purge', desc: 'Remove 1 weak card to sharpen draws' },
  },
  shrineEffect: 'Permanently grants +3 Max HP and +2 Starting Resonance for the rest of this tournament run.',
  shrineConfirmBtn: 'Receive Shrine Blessing',
  purgeTooSmall: 'Deck is already at minimum size (8 cards).',
  targetingPrompt: 'Select target badge or click card again to quick-cast',
  targetBtn: 'TARGET',
  combatResolvingLabel: 'Combat Resolving…',
  rivalActionSummoned: 'Summoned',
  rivalActionSpell: 'Cast',
  rivalActionOverload: 'Overloaded!',
  rivalActionSaved: 'Conserved Ether',
  rivalActionBoardFull: 'Frontline Full',
  savedRunSummary: 'Saved Run',
  tournamentPathLabel: 'Tournament Constellation',
  careerBestStage: 'Best Stage',
  lethalTag: 'LETHAL',
  musicCarouselTitle: 'Cathedral Soundtracks',
  musicAutoCarouselBadge: 'Carousel · Subdued',
  musicVolumeLabel: 'Music Volume',
  musicPrevTrack: 'Previous Track',
  musicNextTrack: 'Next Track',
  musicPlayTrack: 'Play Music',
  musicPauseTrack: 'Pause Music',
  musicModeLabel: 'Playback',
  musicModeCarousel: 'Carousel',
  musicModeDynamic: 'Dynamic',
  musicTracks: {
    demiurge: {
      title: 'Sanctum of the First Spark',
      mood: 'Solemn arcane prelude',
    },
    demiurge2: {
      title: 'Chronicle of the Archons',
      mood: 'Measured obsidian march',
    },
    demiurge4: {
      title: 'Ritual of Obsidian & Aether',
      mood: 'Deep cathedral mystery',
    },
    demiurges: {
      title: 'Ascension of the Demiurges',
      mood: 'Rising duel crescendo',
    },
    divine_conflict: {
      title: 'Divine Conflict',
      mood: 'Clash of the immortals',
    },
  },
  sfxSchemeLabel: 'SFX Pack',
  sfxSchemePreview: 'Test SFX',
  sfxSchemes: {
    cathedral: { name: 'Cathedral Arcane', desc: 'Balanced temple bells & ethereal chimes' },
    forge: { name: 'Obsidian Forge', desc: 'Sharp bronze anvils & metallic clashes' },
    astral: { name: 'Astral Choir', desc: 'Crystalline high overtones & luminous sweeps' },
    cataclysm: { name: 'Cataclysmic Ritual', desc: 'Deep sub-bass impacts & dark surges' },
  },
  codexBtn: 'Codex',
  titleAudioBtn: 'Audio',
  titleSetupBtn: 'Sanctuary',
  sanctuaryDrawerTitle: 'Sanctuary Settings & Trial',
  arcanaWheelBtn: 'Arcana',
  settingsBtn: 'Settings',
  settingsTitle: 'HUD & Accessibility',
  uiScaleLabel: 'UI Scale',
  highContrastLabel: 'High Contrast Mode',
  highContrastOn: 'Solid Dark',
  highContrastOff: 'Frosted',
  silkLabel: 'Ether Silk',
  composureLabel: 'Composure',
  minimapTitle: 'Arena Radar',
  patternBarLabel: 'Arcane Sigil',
  patternHoldHint: 'Hold Q / Tab · 1-4 Sigils',
  worldPromptPlay: '[Click] Summon Here',
  worldPromptLeap: '[RMB] Surge Leap',
  patterns: {
    triangle: { name: 'Triad Lance', desc: 'Focused offensive sigil pulse' },
    star: { name: 'Astral Star', desc: 'Radiant 8-point resonance seal' },
    circle: { name: 'Aegis Halo', desc: 'Protective ward perimeter' },
    decoy: { name: 'Mirage Decoy', desc: 'Illusory prism distraction' },
  },
  codex: {
    title: 'Archive of Orders & Chronicle',
    subtitle: 'Discovered Tarot spoils, Order victories, Daily Trial records & Cathedral lore',
    close: 'Close',
    tabs: {
      orders: 'Orders & Trials',
      vault: 'Tarot Vault',
      chronicle: 'Cathedral Chronicle',
    },
    ordersCleared: 'Campaign Wins',
    bestTrialLabel: 'Best Daily Trial',
    trialCompletedCount: 'Trials Cleared',
    noTrialYet: 'No Daily Trial completed yet',
    discoveredCardsLabel: 'Discovered Cards',
    discoveredRelicsLabel: 'Discovered Relics',
    unknownCard: 'Undiscovered Seal',
    lockedChapterHint: 'Win campaign runs to unseal this chapter (wins required: ',
    chapters: {
      veil_rose: {
        title: 'I. The Rose Above the Obsidian',
        text: 'Long before the four Orders forged their totems, the Demiurges raised the Obsidian Vault around a suspended Rose Window. Whenever an Archon bends five channels into Resonance, the stained glass remembers its ancient light.',
      },
      four_orders: {
        title: 'II. Pact of the Four Orders',
        text: 'Zephyrites claim the sky; Verdants bind wounds to bark and venom; Pyroclasts burn Ether faster than breath; Artificers trap time inside brass astrolabes. Yet a rival’s trophy card reveals how the four schools bleed into one.',
      },
      anomalies_cycle: {
        title: 'III. Breath of the Rift',
        text: 'Every three rounds the Obsidian Arena shifts its ley current — Winds, Overheat, Bronze Resonance, or Blood Conduit. Archons who refuse to read the sky fall to those who surf the anomaly.',
      },
      obsidian_oath: {
        title: 'IV. Crown of the Ascendant',
        text: 'Corvin did not seize the Crown by force; he survived every Overload until the Cathedral itself answered his call. To ascend is to carry the scars of seven duels without shattering your channel.',
      },
    },
    oathsTitle: 'Cathedral Oaths',
    oathsMasteryLabel: 'Archive Seal',
    oathCompletedBadge: 'Sealed',
    oathItems: {
      oath_contracts: {
        title: 'Oath of Obsidian Contracts',
        desc: 'Fulfill 3 Obsidian Contracts in duel combat.',
      },
      oath_forge: {
        title: 'Oath of the Star Forge',
        desc: 'Forge cards 3 times at Sanctuary or Astral Anvil.',
      },
      oath_orders: {
        title: 'Oath of Twin Orders',
        desc: 'Win full tournament campaigns with 2 distinct Orders.',
      },
      oath_slayers: {
        title: 'Oath of the Rose Gauntlet',
        desc: 'Defeat 7 tournament rivals across runs.',
      },
      oath_trial: {
        title: 'Oath of the Vigil',
        desc: 'Complete 1 Daily Cathedral Trial.',
      },
    },
  },
  dailyTrial: {
    title: 'Daily Cathedral Trial',
    startBtn: 'Enter Daily Trial',
    activeBadge: 'Daily Trial',
    dateLabel: 'UTC Cycle',
    bestRecord: 'Best',
    modifiers: {
      frail_pact: { name: 'Frail Pact', desc: 'All creatures cost -1⚡ (min 1) & enter with -1 HP (min 1).' },
      ether_tide: { name: 'Ether Tide', desc: 'Both Archons start with +1 Ether Channel and +1 Resonance.' },
      titan_vow: { name: 'Titan Vow', desc: 'Both Archons start with +6 Max HP.' },
    },
  },
  crossroads: {
    title: 'Cathedral Crossroads',
    subtitle: 'Between duels, an ancient sanctum opens beneath the Rose Window',
    hint: 'Choose one blessing to carry into the remaining tournament duels',
    pickBtn: 'Invoke Altar',
    events: {
      obsidian_obelisk: {
        title: 'Obsidian Obelisk',
        reward: 'Gain 1 random unowned Archon Relic (or +2 Starting Resonance)',
        cost: '-3 Max HP for this run',
      },
      silent_sanctuary: {
        title: 'Silent Sanctuary',
        reward: '+3 Max HP & purge your lowest-cost card (if deck > 8)',
        cost: 'No draw added',
      },
      astral_anvil: {
        title: 'Astral Anvil',
        reward: 'Automatically Forge ★ a random un-maxed card in your deck',
        cost: 'Fate picks the blade',
      },
      sanguine_chalice: {
        title: 'Sanguine Chalice',
        reward: '+2 Starting Resonance in every remaining duel',
        cost: '-2 Max HP for this run',
      },
    },
  },
  draftRivalQuotes: {
    s1: 'Lyra yields her sky-seal: "Speed is nothing without balance — take my wings."',
    s2: 'Torin lowers his halberd: "Your strike cracked cast bronze. Wear this crest."',
    s3: 'Vespera bows amidst amber thorns: "A clean cut deserves the grove’s tribute."',
    s4: 'Ignis-Chancellor laughs through embers: "Burn the next hall with my spark!"',
    s5: 'Magister Vael unclasps his ledger: "Calculated, yet unbowed. Take the tether."',
    s6: 'Chronos-Forged Prime hums down: "Probability recalculated. You advance."',
    s7: 'Archon Corvin kneels: "The Obsidian Rose answers you now, Grand Archon."',
  },
  bossCombatQuips: {
    stage_0_summon_sig: 'Lyra: "Ride the high wind — strike past their shield!"',
    stage_0_heavy_hit: 'Lyra: "That gust cut deeper than I measured…"',
    stage_0_overload_react: 'Lyra: "Borrowing blood for Ether? Reckless, initiate!"',
    stage_1_summon_sig: 'Torin: "Hold the bronze line! None shall pass."',
    stage_1_heavy_hit: 'Torin: "Hmph — solid iron against solid will!"',
    stage_1_overload_react: 'Torin: "Strike your own veins if you dare — my shield holds."',
    stage_2_summon_sig: 'Vespera: "Taste the venom in the roots of the ring."',
    stage_2_heavy_hit: 'Vespera: "The thorns drink, yet you press on…"',
    stage_2_overload_react: 'Vespera: "Yes — bleed into the chalice. Let the grove bloom!"',
    stage_3_summon_sig: 'Ignis-Chancellor: "Rise from basalt and ash — burn the board!"',
    stage_3_heavy_hit: 'Ignis-Chancellor: "A worthy furnace! Show me hotter flame!"',
    stage_3_overload_react: 'Ignis-Chancellor: "Hah! You burn yourself to match my pyre!"',
    stage_4_summon_sig: 'Vael: "Every trajectory converges upon this summon."',
    stage_4_heavy_hit: 'Vael: "An anomaly in the proof… recalibrating."',
    stage_4_overload_react: 'Vael: "Inefficient exchange — HP cannot be forged from thin air."',
    stage_5_summon_sig: 'Chronos Prime: "Timeline locked. Vanguard deployed."',
    stage_5_heavy_hit: 'Chronos Prime: "Warning: structural integrity descending."',
    stage_5_overload_react: 'Chronos Prime: "Self-inflicted entropy logged. Proceeding."',
    stage_6_summon_sig: 'Corvin: "Behold what awaits beyond the seventh veil!"',
    stage_6_heavy_hit: 'Corvin: "Now THIS is an Archon’s strike! Again!"',
    stage_6_overload_react: 'Corvin: "Feed the Rift! Every drop brings Apotheosis closer!"',
  },
  crossSchoolSynergies: {
    kinet: { tag: '+1⚡ & +1 Res', hint: 'Cross-Order Spark (1×/turn): +1 Ether & +1 Resonance' },
    vital: { tag: '+2 Archon HP', hint: 'Cross-Order Spark (1×/turn): Restore +2 Archon HP' },
    chaos: { tag: '+1 Burn DMG', hint: 'Cross-Order Spark (1×/turn): Deal 1 direct burn DMG to Rival' },
    synth: { tag: '+Ally Shield', hint: 'Cross-Order Spark (1×/turn): Grant Shield to weakest ally' },
  },
  questSectionLabel: 'Obsidian Contract',
  questCompletedTag: 'Fulfilled',
  questBonusLabel: 'Contract Boon',
  questTitles: {
    summon_swarm: 'Legions of the Rose',
    spell_weaver: 'Arcane Weaver',
    aegis_bulwark: 'Bastion of Light',
    pure_channel: 'Unblemished Channel',
    swift_verdict: 'Swift Verdict',
    resonance_burst: 'Apotheosis Rite',
  },
  questDescs: {
    summon_swarm: 'Summon or Ascend 3 allied creatures in this duel.',
    spell_weaver: 'Cast 2 Spells or Rituals during this duel.',
    aegis_bulwark: 'Bestow Ether Shields upon 2 allies.',
    pure_channel: 'Win the duel without using Blood Overload.',
    swift_verdict: 'Defeat the Rival Archon by Round 6 or earlier.',
    resonance_burst: 'Charge and unleash Archon Resonance (5/5) once.',
  },
  laneRuneNames: {
    aegis: 'Aegis Rune',
    surge: 'Ether Surge Rune',
    fury: 'Crimson Fury Rune',
  },
  laneRuneDescs: {
    aegis: 'Summoning onto this lane grants +0/+1 and an Ether Shield.',
    surge: 'Summoning onto this lane grants +1 Ether & +1 Resonance.',
    fury: 'Summoning onto this lane grants +2 ATK.',
  },
  help: {
    tabs: {
      cards: 'Card Colors & Types',
      actions: 'Actions & Archon',
      combat: 'Combat & Keywords',
      controls: 'Controls & Arena',
    },
    cardsIntro: 'Card border and frame colors change dynamically to tell you what clicking a card will do right now:',
    cardStates: [
      {
        id: 'altar',
        title: 'Crimson / Red Frame — Altar Sacrifice Active',
        badge: 'BURN MODE',
        desc: 'You toggled Altar of Ether ON. Even 0-Ether or expensive cards turn glowing red so you can burn any card in hand for +1 Ether this turn and +1/+1 to all your creatures. Click "Altar Sacrifice" or "Cancel Altar" to return to normal play.',
      },
      {
        id: 'selected',
        title: 'Teal / Cyan Frame — Selected Card',
        badge: 'SELECTED',
        desc: 'Selected for targeted play (lane spell, Fusion/Ascend onto an ally, or Mulligan redraw swap). Click an arena lane to apply, or click the card again to deselect.',
      },
      {
        id: 'ready',
        title: 'Forged Gold Frame — Ready to Play',
        badge: 'PLAYABLE',
        desc: 'You have enough Ether to summon or cast this card immediately on your turn.',
      },
      {
        id: 'dim',
        title: 'Dimmed Gray Frame — Unavailable',
        badge: 'LOCKED',
        desc: 'Either you need more Ether (use Overload or Altar), your board lanes are full, or the rival is currently taking their turn.',
      },
    ],
    cardTypesTitle: 'Tarot Card Types',
    cardTypes: [
      { title: 'Creature', desc: 'Summoned into one of 4 arena lanes with ATK & HP. Fuses via +Ascend onto an existing ally for combined stats & Shield.' },
      { title: 'Spell', desc: 'Instant arcane strike or buff affecting enemy frontline, rival Archon, or allied units.' },
      { title: 'Ritual', desc: 'Immediate channel boost (+Ether, mass team buff) that resolves without occupying a board slot.' },
      { title: 'Enchantment (Aura)', desc: 'Persistent arena rule active every turn until replaced by another Enchantment.' },
      { title: 'Ward (Trap)', desc: 'Concealed seal triggered automatically when the rival casts a spell, summons, or breaches your defense.' },
    ],
    actionsIntro: 'Tactical dock actions let you bend Ether economics and reposition your frontline during Your Turn:',
    turnActions: [
      { title: 'Altar Sacrifice (1×/turn)', desc: 'Turns hand cards red. Burn 1 card to gain +1 Ether immediately and grant +1/+1 to all your creatures on board.' },
      { title: 'Overload [Space] (1×/turn)', desc: 'Pay 3 HP (2 HP with Obsidian Blood Pact) to surge +2 Ether this turn and supercharge your Archon.' },
      { title: 'Surge Leap [Right-Click] (1×/turn)', desc: 'Grant a friendly creature an Ether Shield and +1 ATK until the end of the turn.' },
      { title: 'Swap Lane (1×/turn)', desc: 'Reposition an allied totem to an empty lane or swap two allies to align blockers or direct attacks.' },
      { title: '+Ascend Fusion', desc: 'When you already control allies, fuse an affordable Creature card onto an ally to grant bonus ATK/HP, keywords, and an Ether Shield.' },
      { title: 'Mulligan (Round 1 only)', desc: 'Before taking your first action in Round 1, redraw 1–3 starting cards back into your draw pile.' },
    ],
    archonPowersTitle: 'Archon Demiurge Powers',
    archonPowers: [
      { title: 'Chrono-Rewind (1×/duel, 0⚡)', desc: 'Restores all living allies to full HP with an Ether Shield and revives your last fallen ally onto an open lane.' },
      { title: 'Soul Tether (2-turn CD, 0⚡)', desc: 'Grants +2 HP and Shield to your vanguard and reflects 50% of incoming enemy damage back at the Rival Archon for 1 turn.' },
      { title: 'Archon Resonance (5 Pips, 0⚡)', desc: 'Every card played, Sacrifice, Overload, or Leap adds +1 Resonance. At 5/5, unleash your Order’s Apotheosis ultimate!' },
      { title: 'Ultimatum (<50% HP, 1×/duel)', desc: 'Unlocks once your Archon drops below half HP, triggering a dramatic Order-specific comeback surge.' },
    ],
    combatIntro: 'At "Strike & End Turn", all 4 lanes resolve left-to-right. Ready allies strike simultaneously across their lane:',
    combatRules: [
      { title: 'Open Lane = Direct Archon Strike', desc: 'If the opposing lane has no defender (or your attacker has Flying over ground units), the creature fires an energy strike straight into the Rival Archon! It is NOT attacking empty air.' },
      { title: 'Attack vs Guard Stance', desc: 'Click the stance badge below any allied totem to switch between Attack (gold sword) and Guard (teal shield). Guards deal -1 ATK but automatically intercept attacks aimed at adjacent empty lanes.' },
      { title: 'Summon Fatigue & Veterancy', desc: 'Newly summoned creatures rest for 1 turn before attacking. Whenever a creature survives combat after slaying a foe, it earns Veteran (+1/+1) and a golden crown.' },
    ],
    keywordsTitle: 'Creature Keywords',
    controlsIntro: 'Desktop & touch controls work seamlessly with both the 3D arena and tactical HUD:',
    controlsList: [
      { keyHint: 'Drag / 1-Finger Swipe', desc: 'Orbit the 3D arena camera freely around the obsidian table.' },
      { keyHint: 'Scroll / Pinch', desc: 'Zoom camera closer to totems or pull back to tactical overview.' },
      { keyHint: 'Q / Tab & 1–4', desc: 'Hold Q/Tab for the 4-sector Arcane Radial Wheel; press 1–4 for quick Sigils.' },
      { keyHint: 'Key C / Cam Menu', desc: 'Cycle or pick Combat 42°, Close-Up, or Wide camera preset.' },
      { keyHint: 'Right-Click Lane', desc: 'Cast Surge Leap (+1 ATK & Shield) directly on an allied lane.' },
      { keyHint: 'Space / H / Esc', desc: 'Space = Overload · H or ? = Open Guide · Esc / P = Pause & Settings.' },
    ],
    arenaSystemsTitle: 'Arena Intelligence & Settings',
    arenaSystems: [
      { title: 'Enemy Intent Plaque', desc: 'Top-left crimson plaque forecasts the rival’s incoming Direct damage, Clash damage, playable cards, and Overload threat.' },
      { title: 'Hover Inspector Toggle', desc: 'Hover any 3D totem or Archon to inspect live ATK/HP, Armor, Shield, Stance, and Boss Passives. Toggle anytime in Menu.' },
      { title: 'Graphics & Speed', desc: 'Switch Ultra/High/Medium/Low (Eco) quality and Fast vs Cinematic turn pacing inside Menu or Title settings.' },
    ],
  },
};

const RU: TranslationPack = {
  gameTitle: 'OBSIDIAN ARCANUM',
  subtitle: 'Арена Таро и Эфирного Разряда',
  startDuel: 'Войти на Арену',
  continueCampaign: 'Продолжить бой',
  difficulty: 'Сложность',
  diffApprentice: 'Ученик',
  diffArchmage: 'Архимаг',
  diffCataclysm: 'Катаклизм',
  schoolLabel: 'Орден',
  schoolKinet: 'Зефириты',
  schoolVital: 'Верданты',
  schoolChaos: 'Пирокласты',
  schoolSynth: 'Механисты',
  language: 'Язык',
  graphicsLabel: 'Графика',
  gfxUltra: 'Ультра',
  gfxHigh: 'Высокая',
  gfxMedium: 'Средняя',
  gfxLow: 'Низкая (Eco)',
  fullscreen: 'Полный экран',
  exitFullscreen: 'Оконный режим',
  soundOn: 'Выкл. звук',
  soundOff: 'Вкл. звук',
  menu: 'Меню',
  resume: 'Вернуться в бой',
  restart: 'Начать дуэль заново',
  exitToMenu: 'В главное меню',
  round: 'Раунд',
  anomaly: 'Аномалия арены',
  yourTurn: 'Ваш ход',
  enemyTurn: 'Ход соперника…',
  endTurn: 'Атака и конец хода',
  endTurnShort: 'Конец хода',
  attackAll: 'Боевой натиск',
  overloadBtn: 'Перегрузка (+2 Эфира / -3 HP)',
  overloadShort: 'Перегрузка',
  overloadActive: 'Канал перегружен',
  altarBtn: 'Алтарь Эфира',
  altarShort: 'Алтарь',
  altarActive: 'Выберите карту для сжигания (+1 Эфир и +1/+1)',
  ultimatumBtn: 'Ультиматум (<50% HP: х2 Эфир)',
  ultimatumUsed: 'Ультиматум исчерпан',
  leapPulseBtn: 'Импульс прыжка (ПКМ)',
  leapShort: 'Прыжок',
  hp: 'HP',
  ether: 'ЭФИР',
  deck: 'Колода',
  stage: 'Бой',
  camCombat: 'Боевая 42°',
  camClose: 'Крупно',
  camWide: 'Общий',
  draftTitle: 'Трофеи Таро — Выбор 1 из 3',
  draftHint: 'Выберите новую карту для вашей турнирной колоды',
  replacePrompt: 'Выберите карту колоды на замену или оставьте текущую',
  keepDeck: 'Оставить колоду',
  victoryTitle: 'ПОБЕДА В ДУЭЛИ',
  defeatTitle: 'КАНАЛ РАЗРУШЕН',
  campaignWinTitle: 'ВЕРХОВНЫЙ АРХОНТ',
  nextDuel: 'Следующий соперник',
  playAgain: 'Сыграть снова',
  briefingContinue: 'Начать поединок',
  controlsHint: 'ЛКМ: Карты · ПКМ: Прыжок-импульс · Свайп / Мышь: Вращать 3D · Колёсико / Щипок: Зум · Пробел: Перегрузка',
  statDamageDealt: 'Нанесено урона',
  statOverloads: 'Перегрузок',
  statTurns: 'Раундов',
  statStageReached: 'Этап',
  enemyPrefix: 'Соперник',
  keywordFlying: 'Полёт',
  keywordFirstStrike: 'Первый удар',
  keywordArmor: 'Броня 1',
  keywordPoison: 'Яд',
  keywordHeal: 'Исцеление',
  keywordSpell: 'Заклинание',
  keywordRitual: 'Ритуал',
  keywordEnchantment: 'Чары',
  keywordTrap: 'Ловушка',
  veteranTag: 'Ветеран',
  intentLabel: 'Угроза',
  intentDirect: 'В лицо',
  intentClash: 'В бой',
  intentReserve: 'Карт',
  fastCombatLabel: 'Скорость боя',
  fastCombatOn: 'Быстрый',
  fastCombatOff: 'Кино',
  hoverInspectorLabel: 'Статы при наведении',
  hoverInspectorOn: 'Вкл',
  hoverInspectorOff: 'Выкл',
  intentWaitingTurn: 'Ждёт 1-го хода',
  intentSavedEther: 'Копит Эфир',
  intentBoardFull: 'Стол полон',
  boardHintSummon: 'Стол пуст — разыграйте карту существа на арену',
  boardHintOpenFrontline: 'Фронт врага пуст — ваши отряды бьют прямо по Архонту!',
  inspectorArchonYou: 'Ваш Архонт',
  inspectorOrder: 'Орден',
  inspectorAttack: 'АТК',
  inspectorHealth: 'HP',
  inspectorStance: 'Стойка',
  inspectorStatuses: 'Эффекты',
  inspectorAbility: 'Навык',
  inspectorAura: 'Аура',
  inspectorWard: 'Ловушка',
  inspectorRelics: 'Реликвии',
  inspectorShielded: 'Эфирный щит',
  inspectorExhausted: 'Оглушён',
  inspectorSummonSick: 'Свежий призыв',
  inspectorEmptyAura: 'Нет',
  inspectorHiddenWard: 'Скрытая печать',
  inspectorReadyUlt: 'Ультиматум готов',
  stanceAttack: 'Стойка Атаки',
  stanceGuard: 'Стойка Защиты (Перехват соседних)',
  enchantmentSlot: 'Чары',
  trapSlot: 'Ловушка',
  relicsTitle: 'Реликвии Архонта',
  relicPickHint: 'Выберите 1 реликвию (по желанию)',
  skipRelic: 'Пропустить',
  manageDeckBtn: 'Колода',
  mulliganBtn: 'Замена (1×)',
  mulliganHint: 'Выберите 1–3 карты для замены перед 1-м ходом',
  mulliganConfirm: 'Заменить',
  mulliganCancel: 'Оставить руку',
  mulliganReplaceTag: 'ЗАМЕНА',
  swapBtn: 'Перестройка',
  swapPickSource: 'Выберите союзника для перемещения или обмена (1×/ход)',
  swapPickTarget: 'Выберите целевую линию (свободную или занятую)',
  swapLaneLabel: 'Линия',
  ascendTag: '+Слить',
  ascendHint: 'Слияние с союзником: +АТК/+HP, свойства и Щит',
  deckRemainingTitle: 'Оставшиеся карты в колоде',
  deckDrawLeft: 'В колоде',
  deckEmpty: 'Колода пуста (перемешается при доборе)',
  combatLogTitle: 'Журнал боя',
  combatLogEmpty: 'Событий пока нет',
  trophyBadge: 'Трофей врага',
  chronoRewindBtn: 'Хроно-Возврат',
  chronoRewindShort: 'Возврат',
  chronoRewindSpent: 'Возврат исчерпан',
  chronoRewindDesc: 'Раз за бой (0⚡): Исцеляет всех союзников до максимума со Щитом и воскрешает последнего павшего.',
  soulTetherBtn: 'Узы Души',
  soulTetherShort: 'Узы',
  soulTetherActive: 'Узы 50%',
  soulTetherCooldownTag: 'КД',
  soulTetherDesc: 'Перезарядка 2 хода (0⚡): Союзнику +2 HP и Щит, отражает 50% вражеского урона в Архонта врага.',
  resonanceBtn: 'Резонанс',
  resonanceShort: 'Резонанс',
  chaosBurnBadge: 'Ожог линий',
  resonanceReadyBySchool: {
    kinet: 'Шквал Разлома (5/5)',
    vital: 'Цветущий Расцвет (5/5)',
    chaos: 'Пепельный Разлом (5/5)',
    synth: 'Солнечный Залп (5/5)',
  },
  resonanceDescBySchool: {
    kinet: 'Заряд +1 за действие. На 5/5 (0⚡): Снимает Защиту и Щиты врагов, +1 карта и 2 ур. сильнейшему.',
    vital: 'Заряд +1 за действие. На 5/5 (0⚡): Лечит Архонту +5 HP и даёт союзникам +1/+2 и Броню 1.',
    chaos: 'Заряд +1 за действие. На 5/5 (0⚡): 3 ур. всем врагам, 2 ур. Архонту и поджигает линии на 2 хода.',
    synth: 'Заряд +1 за действие. На 5/5 (0⚡): 2 ур. всем врагам, всем союзникам +1/+1 и Щит.',
  },
  bossPassiveNames: {
    boss_forged_bulwark: 'Бронзовый Оплот',
    boss_briar_thorns: 'Живой Терновник',
    boss_ember_tithe: 'Подать Пепла',
    boss_astral_blink: 'Астральная Завеса',
    boss_clockwork_mend: 'Хроно-Починка',
    boss_rift_sovereign: 'Властелин Разлома',
  },
  bossPassiveDescs: {
    boss_forged_bulwark: 'Пассив врага: первый призванный за ход боец входит со Щитом.',
    boss_briar_thorns: 'Пассив врага: атакующие бойцы получают 1 урон шипами.',
    boss_ember_tithe: 'Правило босса: чётные раунды жгут 1 HP и зовут Беса 2/2.',
    boss_astral_blink: 'Пассив врага: первый прямой удар по вражескому Архонту за ход уполовинен.',
    boss_clockwork_mend: 'Пассив врага: в начале раунда лечит раненого авангарда на +1 HP.',
    boss_rift_sovereign: 'Правило босса: сдвигает Аномалию каждый ход и даёт +1/+1 авангарду.',
  },
  logKinds: {
    summon: 'Призыв',
    ascend: 'Слияние',
    spell: 'Чары',
    trap: 'Ловушка',
    intercept: 'Перехват',
    swap: 'Манёвр',
    mulligan: 'Муллиган',
    boss: 'Босс',
    overload: 'Перегрузка',
    ultimatum: 'Ультиматум',
    anomaly: 'Аномалия',
    chrono: 'Хроно-Возврат',
    tether: 'Узы Души',
    resonance: 'Апофеоз',
    cross: 'Синтез Орденов',
    rune: 'Руна Линии',
  },
  ultimatumBySchool: {
    kinet: 'Ультиматум Бури (<50% HP: 2 карты, Полёт и Стан врагов)',
    vital: 'Живой Оплот (<50% HP: +7 HP, +1/+2 и Страж 2/5)',
    chaos: 'Гнев Обсидиана (<50% HP: 4 ур. врагам и 3 Архонту)',
    synth: 'Хроно-Форсаж (<50% HP: +2 макс, х2 Эфир и Щиты)',
  },
  abilityNames: {
    kinet_chill: 'Ледяной Шквал',
    vital_mend_aura: 'Целебный Сок',
    chaos_spark: 'Искра Пепла',
    synth_shield_forge: 'Кузня Эгиды',
  },
  abilityDescs: {
    kinet_chill: '1⚡: Враг -2 АТК и Оглушён (или 1 ур.)',
    vital_mend_aura: '1⚡: Лечит Архонта на +2 HP',
    chaos_spark: '1⚡: Наносит 2 ур. врагу или Архонту',
    synth_shield_forge: '1⚡: Даёт союзнику +1/+1 и Щит',
  },
  relicNames: {
    relic_ether_core: 'Ядро Хроно-Эфира',
    relic_blood_pact: 'Обсидиановый Пакт',
    relic_veteran_crest: 'Знак Ветерана',
    relic_arcane_lens: 'Астральная Линза',
    relic_phylactery: 'Филактерия Души',
    relic_chrono_gear: 'Завод Астролябии',
    relic_thorn_carapace: 'Терновый Панцирь',
    relic_soul_harvest: 'Чаша Жнеца',
  },
  relicDescs: {
    relic_ether_core: 'Начало каждой дуэли с +1 каналом Эфира.',
    relic_blood_pact: 'Перегрузка стоит 2 HP вместо 3 HP.',
    relic_veteran_crest: 'Все призванные союзники получают +1/+1.',
    relic_arcane_lens: 'Все атакующие и лечащие чары получают +1 к силе.',
    relic_phylactery: 'Раз за бой спасает от гибели с 3 HP (+2 Эфира).',
    relic_chrono_gear: 'Стартовая рука — 5 карт вместо 4.',
    relic_thorn_carapace: 'Защитники получают +1 к броне и отражают 1 урон.',
    relic_soul_harvest: 'Гибель вражеского существа лечит вас на +1 HP.',
  },
  keywordDescs: {
    flying: 'Полёт — Бьёт поверх наземных защитников прямо по вражескому архонту.',
    firstStrike: 'Первый удар — Наносит урон первым; если враг пал, ответного удара не получает.',
    armor: 'Броня 1 — Снижает входящий боевой урон на 1.',
    poison: 'Яд — Мгновенно уничтожает любое существо, которому нанесён хотя бы 1 урон.',
    heal: 'Исцеление — Восстанавливает +2 HP вашему архонту при призыве.',
    spell: 'Заклинание — Мгновенный магический удар по передовой врага или архонту.',
    ritual: 'Ритуал — Усиливает союзные тотемы или ускоряет ваш Эфирный Канал.',
    enchantment: 'Чары — Постоянная аура арены, срабатывающая каждый раунд.',
    trap: 'Ловушка — Скрытая руна, срабатывающая при следующем ходе или атаке врага.',
    stance: 'Стойка — Клик по значку тотема меняет Атаку на Защиту (перехват соседних линий).',
  },
  cardNames: {
    kinet_sylph: 'Крылатый Сильф',
    kinet_lance: 'Лазурный Сокол',
    kinet_vortex: 'Арбитр Вихря',
    kinet_zephyr_monk: 'Монах Зефира',
    kinet_bolt: 'Копьё Эфира',
    kinet_wind: 'Порыв Эгиды',
    kinet_ether_drain: 'Сифон Канала',
    kinet_tempest_aura: 'Шпиль Бури',
    kinet_mirage_ward: 'Печать Миража',
    vital_swarm: 'Янтарный Роевик',
    vital_stag: 'Золочёный Страж',
    vital_sprout: 'Солнечный Росток',
    vital_thorn_druid: 'Друид Шипов',
    vital_mend: 'Эликсир Жизни',
    vital_venom: 'Клык Василиска',
    vital_overgrowth: 'Буйный Рост',
    vital_grove_heart: 'Сердце Рощи',
    vital_bramble_trap: 'Капкан Лозы',
    chaos_ifrit: 'Обсидиановый Ифрит',
    chaos_hound: 'Пепельный Пёс',
    chaos_lord: 'Колосс Костра',
    chaos_pyromancer: 'Пиромант Пепла',
    chaos_discharge: 'Разряд Эфира',
    chaos_flare: 'Багровый Разрыв',
    chaos_eruption: 'Вулкан Базальта',
    chaos_inferno_altar: 'Алтарь Инферно',
    chaos_cinder_trap: 'Пепельная Западня',
    synth_construct: 'Бронзовый Конструкт',
    synth_golem: 'Страж Астролябии',
    synth_blade: 'Хроно-Клинок',
    synth_chrono_smith: 'Хроно-Кузнец',
    synth_ward: 'Железный Бастион',
    synth_overload: 'Алхимический Катализатор',
    synth_arcane_pulse: 'Магический Импульс',
    synth_aether_forge: 'Кузня Эфира',
    synth_stasis_ward: 'Печать Стазиса',
  },
  cardRules: {
    kinet_sylph: 'Полёт. Атакует поверх наземных защитников.',
    kinet_lance: 'Полёт · Первый удар. Быстрый воздушный боец.',
    kinet_vortex: 'Полёт. Наносит +1 урона архонту при прорыве.',
    kinet_zephyr_monk: 'Полёт · 1⚡ Навык: Ослабить врага на -2 АТК и Оглушить.',
    kinet_bolt: 'Наносит 4 урона вражескому существу или архонту.',
    kinet_wind: 'Даёт союзникам +2/+2 и эфирный щит.',
    kinet_ether_drain: '2 урона и +1 постоянный канал Эфира.',
    kinet_tempest_aura: 'Чары: +1 сила заклинаний и +1/+1 летунам.',
    kinet_mirage_ward: 'Ловушка: Блокирует прямой удар и зовёт Сильфа 2/2 в защиту.',
    vital_swarm: 'Исцеляет архонта на +2 HP при призыве.',
    vital_stag: 'Броня 1 · Исцеляет +2 HP при выходе на арену.',
    vital_sprout: 'Броня 1. Стойкий защитник бронзового круга.',
    vital_thorn_druid: '1⚡ Навык: Восстановить +2 HP вашему Архонту.',
    vital_mend: 'Восстанавливает 5 HP и усиливает союзника на +1/+1.',
    vital_venom: 'Яд. Уничтожает любое раненое существо.',
    vital_overgrowth: 'Удваивает текущее HP союзника и даёт Броню 1.',
    vital_grove_heart: 'Чары: +1 HP и +0/+1 слабейшему союзнику каждый ход.',
    vital_bramble_trap: 'Ловушка: 3 ур. призванному врагу и +0/+1 союзнику.',
    chaos_ifrit: 'Первый удар. Прожигает передовую линию.',
    chaos_hound: 'Агрессивный угольный зверь с мощной атакой.',
    chaos_lord: 'Тяжёлый базальтово-огненный сокрушитель.',
    chaos_pyromancer: '1⚡ Навык: Нанести 2 урона врагу или Архонту.',
    chaos_discharge: 'Наносит 5 урона передовому врагу или архонту.',
    chaos_flare: 'Наносит 3 урона ВСЕМ существам соперника.',
    chaos_eruption: 'Казнит врага с HP ≤ 4 (или наносит 4 ур.).',
    chaos_inferno_altar: 'Чары: 1 урона сопернику при гибели любого существа.',
    chaos_cinder_trap: 'Ловушка: 3 ур. всем врагам при заклинании или прорыве.',
    synth_construct: 'Броня 1. Снижает входящий боевой урон на 1.',
    synth_golem: 'Броня 1 · Первый удар. Несокрушимый часовой.',
    synth_blade: 'Первый удар. Точный механический дуэлянт.',
    synth_chrono_smith: 'Броня 1 · 1⚡ Навык: Дать союзнику +1/+1 и Щит.',
    synth_ward: 'Усиливает всех союзников на +1/+2 и даёт Щит.',
    synth_overload: 'Даёт +3 Эфира на текущий ход.',
    synth_arcane_pulse: 'Наносит 3 урона врагу и добирает 1 карту.',
    synth_aether_forge: 'Чары: +1/+0 и Щит сильнейшему союзнику каждый ход.',
    synth_stasis_ward: 'Ловушка: Полностью отменяет следующее заклинание врага.',
  },
  bossNames: {
    s1: 'Послушница Лира',
    s2: 'Страж Торин',
    s3: 'Веспера Шипов',
    s4: 'Игнис-Канцлер',
    s5: 'Магистр Вейл',
    s6: 'Хроно-Конструкт Прим',
    s7: 'Архонт Корвин',
  },
  bossQuotes: {
    s1: '«Покажи, выдержит ли твой Канал встречу со сталью и ветром.»',
    s2: '«Литая бронза переживёт любой безрассудный пожар, претендент.»',
    s3: '«Каждая рана питает янтарный круг. Плати кровью с умом.»',
    s4: '«Сгоришь раньше, чем построишь защиту!»',
    s5: '«Эфир не прощает долгов — плати цену сразу.»',
    s6: '«Точность выше хаоса. Твои вероятности стремятся к нулю.»',
    s7: '«Каждый твой импульс уже учтён. Укроти Разлом или пади!»',
  },
  anomalies: {
    rift: { name: 'Перегретый Разлом', desc: 'Заклинания наносят +1 урон' },
    winds: { name: 'Астральный Вихрь', desc: 'Летающие существа получают +1 АТК' },
    bastion: { name: 'Бронзовый Резонанс', desc: 'Призванные союзники получают +0/+1' },
    surge: { name: 'Кровавый Проводник', desc: 'Перегрузка даёт +3 Эфира вместо +2' },
    calm: { name: 'Равновесие Таро', desc: 'Начало раунда лечит обоих на +1 HP' },
  },
  helpBtn: 'Справка',
  helpTitle: 'Кодекс Обсидиана',
  helpSubtitle: 'Почему карты меняют цвет, способности Архонта, правила боя и управление',
  helpClose: 'Закрыть',
  altarBannerCancel: 'Отменить Алтарь',
  altarBannerExplain: 'Алтарь Эфира активен (карты красные) — нажмите на любую карту, чтобы сжечь её ради +1 Эфира и +1/+1 союзникам',
  orderDoctrines: {
    kinet: {
      name: 'Доктрина: Шаг Ветра',
      desc: '1-е заклинание/ритуал за ход возвращает +1⚡. 1-й летун выходит со Щитом.',
    },
    vital: {
      name: 'Доктрина: Живые Корни',
      desc: 'Призыв лечит Архонта на +1 HP. Слабейший союзник регенерирует +1 HP каждый раунд.',
    },
    chaos: {
      name: 'Доктрина: Ярость Пепла',
      desc: 'Гибель врага и Перегрузка жгут врага на 1 HP. Перегрузка даёт крайнему союзнику +1 АТК.',
    },
    synth: {
      name: 'Доктрина: Матрица Астролябии',
      desc: '1-й Механист выходит со Щитом. Непотраченный ⚡ в конце хода даёт +1 Резонанс и Щит.',
    },
  },
  archonRankLabel: 'Ранг',
  xpEarnedLabel: 'Опыт похода',
  xpNextRankLabel: 'До ранга',
  rankBonusSummary: '+2 макс. HP/ранг · Ранг 3+: +1⚡ в 1-м раунде',
  forgedTag: 'Кованая',
  forgedBonusCreature: '+1/+1 к статам',
  forgedBonusSpell: '+2 к силе и -1 цена (от 3⚡)',
  forgedBonusCost: '-1 цена Эфира',
  sanctuaryTitle: 'Обряд Святилища и Колода',
  sanctuaryHint: 'Закалите карту, укрепите Архонта или вплетите трофей перед следующей дуэлью',
  sanctuaryModes: {
    replace: { title: 'Добавить / Заменить', desc: 'Вплести выбранную карту в колоду' },
    forge: { title: 'Кузница Мастера ★', desc: 'Улучшить любую карту колоды (+статы/мощь)' },
    shrine: { title: 'Алтарь Жизни', desc: '+3 макс. HP и +2 Резонанса на старте' },
    purge: { title: 'Чистка Колоды', desc: 'Удалить 1 слабую карту для точного добора' },
  },
  shrineEffect: 'Навсегда даёт +3 макс. HP и +2 стартового Резонанса во всех боях этого похода.',
  shrineConfirmBtn: 'Принять благословение',
  purgeTooSmall: 'Колода уже минимального размера (8 карт).',
  targetingPrompt: 'Выберите цель на арене или нажмите на карту снова для быстрого каста',
  targetBtn: 'ЦЕЛЬ',
  combatResolvingLabel: 'Идёт обмен ударами…',
  rivalActionSummoned: 'Призвано',
  rivalActionSpell: 'Заклинаний',
  rivalActionOverload: 'Перегрузка!',
  rivalActionSaved: 'Накопил Эфир',
  rivalActionBoardFull: 'Стол полон',
  savedRunSummary: 'Текущий поход',
  tournamentPathLabel: 'Путь Турнира',
  careerBestStage: 'Рекорд этапа',
  lethalTag: 'ЛЕТАЛ',
  musicCarouselTitle: 'Хроники Собора · Музыка',
  musicAutoCarouselBadge: 'Карусель · Приглушённо',
  musicVolumeLabel: 'Громкость музыки',
  musicPrevTrack: 'Предыдущий трек',
  musicNextTrack: 'Следующий трек',
  musicPlayTrack: 'Включить музыку',
  musicPauseTrack: 'Пауза музыки',
  musicModeLabel: 'Режим',
  musicModeCarousel: 'Карусель',
  musicModeDynamic: 'Динамика',
  musicTracks: {
    demiurge: {
      title: 'Святилище Первой Искры',
      mood: 'Торжественный эфирный прелюд',
    },
    demiurge2: {
      title: 'Хроника Архонтов',
      mood: 'Размеренный шаг судьбы',
    },
    demiurge4: {
      title: 'Ритуал Обсидиана и Эфира',
      mood: 'Глубокая храмовая мистерия',
    },
    demiurges: {
      title: 'Восхождение Демиургов',
      mood: 'Нарастающий зов дуэли',
    },
    divine_conflict: {
      title: 'Божественный Конфликт',
      mood: 'Столкновение бессмертных',
    },
  },
  sfxSchemeLabel: 'Схема SFX',
  sfxSchemePreview: 'Тест звука',
  sfxSchemes: {
    cathedral: { name: 'Соборный Эфир', desc: 'Гармоничные колокола и звон призыва' },
    forge: { name: 'Кузня Обсидиана', desc: 'Звонкие металлические клинки и наковальня' },
    astral: { name: 'Астральный Хор', desc: 'Высокие хрустальные переливы и шёпот' },
    cataclysm: { name: 'Ритуал Катаклизма', desc: 'Тяжёлые басовые удары и грозовые разряды' },
  },
  codexBtn: 'Кодекс',
  titleAudioBtn: 'Музыка',
  titleSetupBtn: 'Настройки',
  sanctuaryDrawerTitle: 'Настройки Святилища и Испытание',
  arcanaWheelBtn: 'Аркана',
  settingsBtn: 'Настройки',
  settingsTitle: 'Настройки HUD и контраста',
  uiScaleLabel: 'Масштаб UI',
  highContrastLabel: 'Высокий контраст',
  highContrastOn: 'Плотный фон',
  highContrastOff: 'Матовое стекло',
  silkLabel: 'Шёлк Эфира',
  composureLabel: 'Самообладание',
  minimapTitle: 'Радар арены',
  patternBarLabel: 'Печать Арканы',
  patternHoldHint: 'Удерж. Q / Tab · 1–4 Печати',
  worldPromptPlay: '[ЛКМ] Призвать сюда',
  worldPromptLeap: '[ПКМ] Импульс прыжка',
  patterns: {
    triangle: { name: 'Копьё Триады', desc: 'Направленный пробивающий импульс' },
    star: { name: 'Астральная Звезда', desc: 'Восьмилучевой резонанс печати' },
    circle: { name: 'Нимб Эгиды', desc: 'Защитный контур периметра' },
    decoy: { name: 'Мираж-Приманка', desc: 'Иллюзорный преломляющий знак' },
  },
  codex: {
    title: 'Архив Орденов и Хроника Собора',
    subtitle: 'Открытые карты Таро, реликвии, победы Орденов и предания Арены',
    close: 'Закрыть',
    tabs: {
      orders: 'Ордена и Испытания',
      vault: 'Собрание Карт',
      chronicle: 'Хроника Собора',
    },
    ordersCleared: 'Побед в походе',
    bestTrialLabel: 'Лучшее Испытание дня',
    trialCompletedCount: 'Испытаний пройдено',
    noTrialYet: 'Испытание дня ещё не пройдено',
    discoveredCardsLabel: 'Открыто карт',
    discoveredRelicsLabel: 'Открыто реликвий',
    unknownCard: 'Запечатанная карта',
    lockedChapterHint: 'Одержите победы в походе, чтобы открыть главу (нужно побед: ',
    chapters: {
      veil_rose: {
        title: 'I. Роза над Обсидианом',
        text: 'Задолго до раскола четырёх Орденов первые Демиурги возвели Обсидиановый Зал вокруг парящего витража-розы. Когда Архонт сводит пять каналов в Резонанс, стекло отвечает древним сиянием.',
      },
      four_orders: {
        title: 'II. Пакт Четырёх Орденов',
        text: 'Зефириты владеют высотой; Верданты сплетают кору и яд; Пирокласты сжигают Эфир ради натиска; Механисты запирают время в латунных астролябиях. Трофейная карта врага соединяет их силу воедино.',
      },
      anomalies_cycle: {
        title: 'III. Дыхание Разлома',
        text: 'Каждые три раунда арена меняет русло эфира — Вихрь, Перегрев, Бронзовый Резонанс или Кровавый Проводник. Архонт, читающий небо, побеждает раньше, чем опустится клинок.',
      },
      obsidian_oath: {
        title: 'IV. Венец Демиурга',
        text: 'Корвин не взял корону силой — он пережил каждую Перегрузку, пока сам Собор не признал его волю. Пройти семь кругов значит удержать канал без единой трещины.',
      },
    },
    oathsTitle: 'Клятвы Собора',
    oathsMasteryLabel: 'Печать Архива',
    oathCompletedBadge: 'Исполнена',
    oathItems: {
      oath_contracts: {
        title: 'Клятва Обсидиановых Контрактов',
        desc: 'Выполните 3 Обсидиановых Контракта в бою.',
      },
      oath_forge: {
        title: 'Клятва Звёздной Наковальни',
        desc: 'Закалите карты 3 раза в Святилище или Астральной Наковальне.',
      },
      oath_orders: {
        title: 'Клятва Двух Орденов',
        desc: 'Пройдите турнир до победы за 2 разных Ордена.',
      },
      oath_slayers: {
        title: 'Клятва Испытания Розы',
        desc: 'Одолейте 7 турнирных соперников за всё время.',
      },
      oath_trial: {
        title: 'Клятва Ночного Бдения',
        desc: 'Завершите 1 Испытание дня в Соборе.',
      },
    },
  },
  dailyTrial: {
    title: 'Испытание дня',
    startBtn: 'Войти в Испытание',
    activeBadge: 'Испытание дня',
    dateLabel: 'Цикл UTC',
    bestRecord: 'Рекорд',
    modifiers: {
      frail_pact: { name: 'Хрупкий Пакт', desc: 'Все существа стоят на 1⚡ дешевле (мин. 1), но выходят с -1 HP (мин. 1).' },
      ether_tide: { name: 'Прилив Эфира', desc: 'Оба Архонта начинают бой с +1 каналом Эфира и +1 Резонансом.' },
      titan_vow: { name: 'Клятва Титана', desc: 'Оба Архонта начинают бой с +6 макс. HP.' },
    },
  },
  crossroads: {
    title: 'Перепутье Собора',
    subtitle: 'Между поединками под витражом-розой открывается древний алтарь',
    hint: 'Выберите одно благословение для оставшихся дуэлей турнира',
    pickBtn: 'Воззвать к алтарю',
    events: {
      obsidian_obelisk: {
        title: 'Обелиск Обсидиана',
        reward: 'Случайная новая реликвия Архонта (или +2 стартового Резонанса)',
        cost: '-3 макс. HP до конца похода',
      },
      silent_sanctuary: {
        title: 'Тихое Святилище',
        reward: '+3 макс. HP и очищение самой дешёвой карты колоды (если > 8 карт)',
        cost: 'Без усиления карты',
      },
      astral_anvil: {
        title: 'Астральная Наковальня',
        reward: 'Закаливает ★ случайную карту вашей колоды до следующего уровня',
        cost: 'Судьба выбирает клинок',
      },
      sanguine_chalice: {
        title: 'Багровая Чаша',
        reward: '+2 стартового Резонанса в каждой следующей дуэли похода',
        cost: '-2 макс. HP до конца похода',
      },
    },
  },
  draftRivalQuotes: {
    s1: 'Лира протягивает печать ветра: «Скорость ничто без равновесия — возьми крылья.»',
    s2: 'Торин опускает алебарду: «Твой удар пробил литую бронзу. Возьми мой знак.»',
    s3: 'Веспера склоняется среди шипов: «Чистая победа достойна дани рощи.»',
    s4: 'Игнис-Канцлер смеётся сквозь пепел: «Опали следующий зал моей искрой!»',
    s5: 'Магистр Вейл закрывает фолиант: «Расчёт верен, воля крепка. Прими узы.»',
    s6: 'Хроно-Конструкт Прим затихает: «Вероятность пересчитана. Путь открыт.»',
    s7: 'Архонт Корвин преклоняет колено: «Теперь Роза Обсидиана отвечает тебе, Верховный Архонт.»',
  },
  bossCombatQuips: {
    stage_0_summon_sig: 'Лира: «Выше ветра — бей поверх щитов!»',
    stage_0_heavy_hit: 'Лира: «Этот порыв рассёк защиту глубже расчёта…»',
    stage_0_overload_react: 'Лира: «Платишь кровью за Эфир? Рискованно, новичок!»',
    stage_1_summon_sig: 'Торин: «Сомкнуть бронзовый строй! Ни шагу назад.»',
    stage_1_heavy_hit: 'Торин: «Крепкий удар — достойно литой стали!»',
    stage_1_overload_react: 'Торин: «Режь свой канал, если смеешь — мой щит устоит.»',
    stage_2_summon_sig: 'Веспера: «Попробуй яд корней янтарного круга.»',
    stage_2_heavy_hit: 'Веспера: «Шипы пьют кровь, но ты всё ещё стоишь…»',
    stage_2_overload_react: 'Веспера: «Да — питай круг своей кровью, пусть роща цветёт!»',
    stage_3_summon_sig: 'Игнис-Канцлер: «Восстань из базальта и золы — сожги арену!»',
    stage_3_heavy_hit: 'Игнис-Канцлер: «Достойное горнило! Покажи ещё жарче!»',
    stage_3_overload_react: 'Игнис-Канцлер: «Ха! Ты сам горишь, чтобы догнать мой костёр!»',
    stage_4_summon_sig: 'Вейл: «Все траектории сходятся на этом призыве.»',
    stage_4_heavy_hit: 'Вейл: «Отклонение в уравнении… пересчёт.»',
    stage_4_overload_react: 'Вейл: «Невыгодный обмен — кровь не вернуть формулой.»',
    stage_5_summon_sig: 'Хроно-Прим: «Временная линия зафиксирована. Авангард в строю.»',
    stage_5_heavy_hit: 'Хроно-Прим: «Внимание: целостность канала снижается.»',
    stage_5_overload_react: 'Хроно-Прим: «Добровольная энтропия зафиксирована.»',
    stage_6_summon_sig: 'Корвин: «Узри, что таится за седьмым витражом!»',
    stage_6_heavy_hit: 'Корвин: «Вот ЭТО — удар истинного Архонта! Ещё!»',
    stage_6_overload_react: 'Корвин: «Питай Разлом! Каждая капля приближает Апофеоз!»',
  },
  crossSchoolSynergies: {
    kinet: { tag: '+1⚡ и +1 Рез.', hint: 'Синтез Орденов (1×/ход): +1 Эфир и +1 Резонанс' },
    vital: { tag: '+2 HP Архонту', hint: 'Синтез Орденов (1×/ход): Лечит Архонту +2 HP' },
    chaos: { tag: '+1 Ожог врагу', hint: 'Синтез Орденов (1×/ход): 1 прямой урон вражескому Архонту' },
    synth: { tag: '+Щит союзнику', hint: 'Синтез Орденов (1×/ход): Щит слабейшему союзнику' },
  },
  questSectionLabel: 'Обсидиановый Контракт',
  questCompletedTag: 'Выполнен',
  questBonusLabel: 'Дар Контракта',
  questTitles: {
    summon_swarm: 'Легион Розы',
    spell_weaver: 'Ткач Арканы',
    aegis_bulwark: 'Оплот Света',
    pure_channel: 'Чистый Канал',
    swift_verdict: 'Быстрый Приговор',
    resonance_burst: 'Обряд Апофеоза',
  },
  questDescs: {
    summon_swarm: 'Призовите или слейте 3 союзных существ за эту дуэль.',
    spell_weaver: 'Разыграйте 2 Заклинания или Ритуала за дуэль.',
    aegis_bulwark: 'Наложите Эфирный щит на 2 союзников за дуэль.',
    pure_channel: 'Победите в дуэли, ни разу не применив Перегрузку.',
    swift_verdict: 'Одержите победу до 6-го раунда включительно.',
    resonance_burst: 'Накопите и активируйте Резонанс Архонта (5/5).',
  },
  laneRuneNames: {
    aegis: 'Руна Эгиды',
    surge: 'Руна Потока Эфира',
    fury: 'Руна Багровой Ярости',
  },
  laneRuneDescs: {
    aegis: 'Призыв на эту линию даёт существу +0/+1 и Эфирный Щит.',
    surge: 'Призыв на эту линию даёт +1 Эфира и +1 Резонанса.',
    fury: 'Призыв на эту линию даёт существу +2 АТК.',
  },
  help: {
    tabs: {
      cards: 'Цвета и типы карт',
      actions: 'Действия и Архонт',
      combat: 'Бой и свойства',
      controls: 'Управление и арена',
    },
    cardsIntro: 'Цвет рамки и свечение карт в руке подсказывают, что произойдёт при нажатии на карту прямо сейчас:',
    cardStates: [
      {
        id: 'altar',
        title: 'Багровая / красная карта — Включён «Алтарь Эфира»',
        badge: 'ЖЕРТВА',
        desc: 'Вы нажали кнопку «Алтарь Эфира». В этом режиме ВСЕ карты в руке загораются красным — даже если на них не хватает Эфира. Клик по любой красной карте сожжёт её, даст +1 Эфир на этот ход и +1/+1 всем вашим существам на столе. Чтобы отменить режим и играть карты обычно — нажмите «Алтарь Эфира» повторно или кнопку отмены.',
      },
      {
        id: 'selected',
        title: 'Бирюзовая / голубая рамка — Карта выбрана',
        badge: 'ВЫБРАНА',
        desc: 'Карта ожидает выбора цели (линия для заклинания, союзник для слияния «+Слить» или замена при Муллигане). Нажмите на линию арены или повторно на карту для отмены.',
      },
      {
        id: 'ready',
        title: 'Золотая рамка — Можно разыграть',
        badge: 'ГОТОВА',
        desc: 'Эфира достаточно — карта готова к немедленному призыву или применению в ваш ход.',
      },
      {
        id: 'dim',
        title: 'Тусклая серая карта — Недоступна',
        badge: 'ЗАБЛОКИРОВАНА',
        desc: 'Недостаточно Эфира (используйте Перегрузку или Алтарь), все 4 линии заняты или сейчас идёт ход соперника.',
      },
    ],
    cardTypesTitle: 'Типы карт Таро',
    cardTypes: [
      { title: 'Существо', desc: 'Призывается на одну из 4 линий арены с параметрами АТК и HP. Можно объединить с союзником через «+Слить».' },
      { title: 'Заклинание', desc: 'Мгновенный магический удар по передовой врага, вражескому Архонту или усиление союзника.' },
      { title: 'Ритуал', desc: 'Сразу даёт Эфир или массовое усиление команды, не занимая место на столе.' },
      { title: 'Чары (Аура)', desc: 'Постоянный эффект арены, работающий каждый раунд, пока вы не замените его другими Чарами.' },
      { title: 'Ловушка (Печать)', desc: 'Скрытая руна, срабатывающая автоматически при атаке, призыве или заклинании соперника.' },
    ],
    actionsIntro: 'Кнопки на нижней тактической панели позволяют управлять Эфиром и построением в ваш ход:',
    turnActions: [
      { title: 'Алтарь Эфира (1×/ход)', desc: 'Подсвечивает руку красным. Сожгите 1 карту ради +1 Эфира сейчас и +1/+1 всем союзным тотемам на столе.' },
      { title: 'Перегрузка [Пробел] (1×/ход)', desc: 'Тратит 3 HP (2 HP с реликвией Пакта), но даёт +2 Эфира на этот ход и заряжает канал.' },
      { title: 'Импульс прыжка [ПКМ] (1×/ход)', desc: 'Накладывает Эфирный щит и +1 АТК до конца хода на выбранного союзного бойца.' },
      { title: 'Перестройка (1×/ход)', desc: 'Перемещает союзный тотем на свободную линию или меняет двух союзников местами.' },
      { title: '+Слить (Вознесение)', desc: 'Если на столе уже есть союзник, выберите «+Слить» и карту существа — союзник получит его АТК/HP, свойства и Щит.' },
      { title: 'Замена (только 1-й раунд)', desc: 'До первого действия в бою можно заменить 1–3 стартовые карты из руки обратно в колоду.' },
    ],
    archonPowersTitle: 'Силы героя (Архонта)',
    archonPowers: [
      { title: 'Хроно-Возврат (1×/бой, 0⚡)', desc: 'Полностью исцеляет всех живых союзников, даёт им Щит и воскрешает последнего павшего союзника.' },
      { title: 'Узы Души (КД 2 хода, 0⚡)', desc: 'Даёт +2 HP и Щит авангарду и отражает 50% вражеского урона обратно в Архонта врага на 1 ход.' },
      { title: 'Резонанс Архонта (5 зарядов, 0⚡)', desc: 'Каждое действие (карта, Алтарь, Перегрузка, Прыжок) даёт +1 заряд. На 5/5 активирует Апофеоз вашего Ордена!' },
      { title: 'Ультиматум (<50% HP, 1×/бой)', desc: 'Открывается, когда здоровье вашего Архонта падает ниже половины — мощный переломный эффект Ордена.' },
    ],
    combatIntro: 'По кнопке «Атака и конец хода» все 4 линии бьют слева направо по очереди:',
    combatRules: [
      { title: 'Пустая линия = прямой выстрел в Архонта', desc: 'Если напротив вашего бойца нет врага (или у бойца есть «Полёт»), он выпускает направленный луч прямо во вражеского Архонта — это не удар по пустоте!' },
      { title: 'Стойка Атаки и Защиты', desc: 'Нажмите на значок под тотемом союзника, чтобы переключить Атаку (меч) на Защиту (щит). Защитник получает -1 АТК, но перехватывает удары по пустым соседним линиям.' },
      { title: 'Свежий призыв и Ветеранство', desc: 'Только что призванный отряд 1 ход готовится к бою. Пережив бой с врагом и победив его, тотем становится Ветераном (+1/+1 и золотая корона).' },
    ],
    keywordsTitle: 'Свойства существ',
    controlsIntro: 'Игра поддерживает свободное управление 3D-камерой и горячие клавиши на ПК и смартфонах:',
    controlsList: [
      { keyHint: 'Мышь / Свайп', desc: 'Вращайте 3D-сцену арены на любой удобный угол обзора.' },
      { keyHint: 'Колёсико / Щипок', desc: 'Приближайте и отдаляйте камеру от тотемов и алтарей.' },
      { keyHint: 'Q / Tab и 1–4', desc: 'Удерживайте Q или Tab для радиального колеса Арканы; 1–4 — быстрые печати.' },
      { keyHint: 'Клавиша C / Камера', desc: 'Переключение ракурсов: Боевая 42°, Крупно, Общий план.' },
      { keyHint: 'ПКМ по линии', desc: 'Мгновенный Импульс прыжка (+1 АТК и Щит) на союзную линию.' },
      { keyHint: 'Пробел / H / Esc', desc: 'Пробел = Перегрузка · H или ? = Справка · Esc / P = Меню и настройки.' },
    ],
    arenaSystemsTitle: 'Индикаторы и настройки',
    arenaSystems: [
      { title: 'Плашка «Угроза» (слева вверху)', desc: 'Показывает прогнозируемый урон врага «В лицо» и «В бой», запас карт и риск Перегрузки.' },
      { title: 'Статы при наведении', desc: 'Наведите курсор на любого юнита или Архонта в 3D, чтобы увидеть точные статы, броню, щит и навыки. Отключается в Меню.' },
      { title: 'Графика и темп боя', desc: 'В Меню (или на стартовом экране) можно выбрать качество от Низкой (Eco) до Ультра и Быстрый/Кино темп ходов.' },
    ],
  },
};

type PartialTranslation = Partial<
  Omit<
    TranslationPack,
    | 'cardNames'
    | 'cardRules'
    | 'bossNames'
    | 'bossQuotes'
    | 'anomalies'
    | 'keywordDescs'
    | 'ultimatumBySchool'
    | 'abilityNames'
    | 'abilityDescs'
    | 'relicNames'
    | 'relicDescs'
    | 'bossPassiveNames'
    | 'bossPassiveDescs'
    | 'logKinds'
    | 'resonanceReadyBySchool'
    | 'resonanceDescBySchool'
    | 'orderDoctrines'
    | 'sanctuaryModes'
    | 'codex'
    | 'dailyTrial'
    | 'crossroads'
    | 'draftRivalQuotes'
    | 'bossCombatQuips'
    | 'crossSchoolSynergies'
    | 'questTitles'
    | 'questDescs'
    | 'laneRuneNames'
    | 'laneRuneDescs'
    | 'sfxSchemes'
    | 'patterns'
    | 'help'
  >
>;

function makePack(overrides: PartialTranslation): TranslationPack {
  return {
    ...EN,
    ...overrides,
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationPack> = {
  en: EN,
  ru: RU,
  fr: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Arène de Duel du Tarot',
    startDuel: 'Entrer dans l’Arène',
    continueCampaign: 'Continuer',
    difficulty: 'Difficulté',
    diffApprentice: 'Apprenti',
    diffArchmage: 'Archimage',
    diffCataclysm: 'Cataclysme',
    schoolLabel: 'Ordre',
    schoolKinet: 'Zéphyrites',
    schoolVital: 'Verdoyants',
    schoolChaos: 'Pyroclastes',
    schoolSynth: 'Artificiers',
    language: 'Langue',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter plein écran',
    soundOn: 'Couper le son',
    soundOff: 'Activer le son',
    menu: 'Menu',
    resume: 'Reprendre',
    restart: 'Recommencer',
    exitToMenu: 'Menu Principal',
    round: 'Tour',
    anomaly: 'Anomalie',
    yourTurn: 'Votre Tour',
    enemyTurn: 'Tour Rival…',
    endTurn: 'Attaquer & Finir',
    overloadBtn: 'Surcharge (+2 Éther / -3 PV)',
    overloadActive: 'Canal Surchargé',
    altarBtn: 'Autel d’Éther',
    ultimatumBtn: 'Ultimatum (<50% PV: x2)',
    leapPulseBtn: 'Bond d’Éther (Clic Droit)',
    hp: 'PV',
    ether: 'ÉTHER',
    draftTitle: 'Butin du Tarot — 1 sur 3',
    victoryTitle: 'VICTOIRE',
    defeatTitle: 'CANAL BRISÉ',
    nextDuel: 'Adversaire Suivant',
    playAgain: 'Rejouer',
    briefingContinue: 'Tirer la Main',
    controlsHint: 'Clic Gauche: Cartes/UI · Clic Droit: Bond d’Éther · Espace: Surcharge · Échap: Menu',
  }),
  de: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Tarot-Duell-Arena',
    startDuel: 'Arena Betreten',
    continueCampaign: 'Fortsetzen',
    difficulty: 'Schwierigkeit',
    diffApprentice: 'Lehrling',
    diffArchmage: 'Erzmagier',
    diffCataclysm: 'Kataklysmus',
    schoolLabel: 'Schule',
    language: 'Sprache',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Fenster',
    soundOn: 'Ton Aus',
    soundOff: 'Ton An',
    menu: 'Menü',
    resume: 'Fortsetzen',
    restart: 'Neu Starten',
    exitToMenu: 'Hauptmenü',
    round: 'Runde',
    anomaly: 'Anomalie',
    yourTurn: 'Dein Zug',
    enemyTurn: 'Gegner…',
    endTurn: 'Angriff & Ende',
    overloadBtn: 'Überladung (+2 Äther / -3 LP)',
    altarBtn: 'Opferaltar',
    ultimatumBtn: 'Ultimatum (<50% LP: x2)',
    leapPulseBtn: 'Äthersprung (Rechtsklick)',
    hp: 'LP',
    ether: 'ÄTHER',
    draftTitle: 'Tarot-Beute — 1 aus 3',
    victoryTitle: 'DUELL GEWONNEN',
    defeatTitle: 'KANAL ZERSTÖRT',
    nextDuel: 'Nächster Gegner',
    playAgain: 'Nochmal',
    briefingContinue: 'Kampf Beginnen',
    controlsHint: 'Linksklick: Karten/UI · Rechtsklick: Äthersprung · Leertaste: Überladung · Esc: Menü',
  }),
  es: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Arena de Duelo del Tarot',
    startDuel: 'Entrar a la Arena',
    difficulty: 'Dificultad',
    diffApprentice: 'Aprendiz',
    diffArchmage: 'Archimago',
    diffCataclysm: 'Cataclismo',
    schoolLabel: 'Escuela',
    language: 'Idioma',
    fullscreen: 'Pantalla Completa',
    exitFullscreen: 'Salir Pantalla Completa',
    menu: 'Menú',
    resume: 'Reanudar',
    restart: 'Reiniciar',
    exitToMenu: 'Menú Principal',
    round: 'Ronda',
    anomaly: 'Anomalía',
    yourTurn: 'Tu Turno',
    enemyTurn: 'Turno Rival…',
    endTurn: 'Atacar y Terminar',
    overloadBtn: 'Sobrecarga (+2 Éter / -3 PS)',
    altarBtn: 'Altar de Éter',
    ultimatumBtn: 'Ultimátum (<50% PS: x2)',
    leapPulseBtn: 'Salto de Éter (Clic Derecho)',
    hp: 'PS',
    ether: 'ÉTER',
    draftTitle: 'Botín Tarot — Elige 1 de 3',
    victoryTitle: 'VICTORIA',
    defeatTitle: 'CANAL ROTO',
    nextDuel: 'Siguiente Rival',
    playAgain: 'Jugar de Nuevo',
    briefingContinue: 'Iniciar Duelo',
    controlsHint: 'Clic Izq: Cartas/UI · Clic Der: Salto de Éter · Espacio: Sobrecarga · Esc: Menú',
  }),
  pt: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Arena de Duelo do Tarô',
    startDuel: 'Entrar na Arena',
    difficulty: 'Dificuldade',
    diffApprentice: 'Aprendiz',
    diffArchmage: 'Arquimago',
    diffCataclysm: 'Cataclismo',
    schoolLabel: 'Escola',
    language: 'Idioma',
    fullscreen: 'Tela Cheia',
    exitFullscreen: 'Sair Tela Cheia',
    menu: 'Menu',
    resume: 'Continuar',
    restart: 'Reiniciar',
    exitToMenu: 'Menu Principal',
    round: 'Rodada',
    anomaly: 'Anomalia',
    yourTurn: 'Seu Turno',
    enemyTurn: 'Turno Rival…',
    endTurn: 'Atacar e Encerrar',
    overloadBtn: 'Sobrecarga (+2 Éter / -3 PV)',
    altarBtn: 'Altar de Éter',
    ultimatumBtn: 'Ultimato (<50% PV: x2)',
    leapPulseBtn: 'Salto de Éter (Botão Direito)',
    hp: 'PV',
    ether: 'ÉTER',
    draftTitle: 'Espólio Tarô — 1 de 3',
    victoryTitle: 'VITÓRIA',
    defeatTitle: 'CANAL QUEBRADO',
    nextDuel: 'Próximo Rival',
    playAgain: 'Jogar Novamente',
    briefingContinue: 'Iniciar Duelo',
    controlsHint: 'Botão Esq: Cartas/UI · Botão Dir: Salto · Espaço: Sobrecarga · Esc: Menu',
  }),
  zh: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: '黑曜石塔罗以太竞技场',
    startDuel: '踏入竞技场',
    difficulty: '难度',
    diffApprentice: '学徒',
    diffArchmage: '大法师',
    diffCataclysm: '灾变',
    schoolLabel: '学派',
    schoolKinet: '疾风派',
    schoolVital: '生机派',
    schoolChaos: '烬火派',
    schoolSynth: '秘工派',
    language: '语言',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
    soundOn: '静音',
    soundOff: '开启音效',
    menu: '菜单',
    resume: '继续决斗',
    restart: '重新开始',
    exitToMenu: '返回主菜单',
    round: '回合',
    anomaly: '竞技场异象',
    yourTurn: '你的回合',
    enemyTurn: '对手思考中…',
    endTurn: '发起攻击并结束',
    overloadBtn: '以太过载 (+2 以太 / -3 HP)',
    altarBtn: '以太祭坛',
    ultimatumBtn: '终极通牒 (<50% HP: 双倍)',
    leapPulseBtn: '脉冲跃迁 (右键)',
    hp: '生命',
    ether: '以太',
    draftTitle: '塔罗战利品 — 三选一',
    victoryTitle: '决斗胜利',
    defeatTitle: '通道崩毁',
    nextDuel: '下一位对手',
    playAgain: '再次决斗',
    briefingContinue: '抽取起手牌',
    controlsHint: '左键: 出牌与界面 · 右键: 脉冲跃迁 · 空格: 以太过载 · Esc: 菜单',
  }),
  ar: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'ساحة التاروت والأثير',
    startDuel: 'دخول الساحة',
    difficulty: 'الصعوبة',
    diffApprentice: 'متدرب',
    diffArchmage: 'ساحر أعظم',
    diffCataclysm: 'كارثة',
    schoolLabel: 'المدرسة',
    language: 'اللغة',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إغلاق ملء الشاشة',
    menu: 'القائمة',
    resume: 'استئناف',
    restart: 'إعادة',
    exitToMenu: 'القائمة الرئيسية',
    round: 'الجولة',
    anomaly: 'شذوذ الساحة',
    yourTurn: 'دورك',
    enemyTurn: 'دور الخصم…',
    endTurn: 'هجوم وإنهاء الدور',
    overloadBtn: 'زيادة التحميل (+2 أثير / -3 حياة)',
    altarBtn: 'مذبح الأثير',
    ultimatumBtn: 'إنذار أخير (<50% حياة)',
    leapPulseBtn: 'قفزة الأثير (زر يمين)',
    hp: 'حياة',
    ether: 'أثير',
    draftTitle: 'غنائم التاروت — اختر 1 من 3',
    victoryTitle: 'انتصار',
    defeatTitle: 'تحطمت القناة',
    nextDuel: 'الخصم التالي',
    playAgain: 'العب مجدداً',
    briefingContinue: 'بدء المبارزة',
    controlsHint: 'يسار: البطاقات · يمين: قفزة الأثير · مسافة: زيادة التحميل · Esc: القائمة',
  }),
  uk: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Обсидіанове Таро та Ефірний Розряд',
    startDuel: 'Увійти на Арену',
    difficulty: 'Складність',
    diffApprentice: 'Учень',
    diffArchmage: 'Архімаг',
    diffCataclysm: 'Катаклізм',
    schoolLabel: 'Орден',
    schoolKinet: 'Зефірити',
    schoolVital: 'Верданти',
    schoolChaos: 'Пірокласти',
    schoolSynth: 'Механісти',
    language: 'Мова',
    fullscreen: 'На весь екран',
    exitFullscreen: 'Вийти з повноекранного',
    menu: 'Меню',
    resume: 'Повернутись у бій',
    restart: 'Почати заново',
    exitToMenu: 'Головне меню',
    round: 'Раунд',
    anomaly: 'Аномалія арени',
    yourTurn: 'Ваш хід',
    enemyTurn: 'Хід суперника…',
    endTurn: 'Атака і кінець ходу',
    overloadBtn: 'Перевантаження (+2 Ефіру / -3 HP)',
    altarBtn: 'Вівтар Ефіру',
    ultimatumBtn: 'Ультиматум (<50% HP: х2)',
    leapPulseBtn: 'Імпульс стрибка (ПКМ)',
    hp: 'HP',
    ether: 'ЕФІР',
    draftTitle: 'Трофеї Таро — 1 з 3',
    victoryTitle: 'ПЕРЕМОГА',
    defeatTitle: 'КАНАЛ ЗРУЙНОВАНО',
    nextDuel: 'Наступний суперник',
    playAgain: 'Зіграти знову',
    briefingContinue: 'Почати поєдинок',
    controlsHint: 'ЛКМ: Карти та UI · ПКМ: Стрибок-імпульс · Пробіл: Перевантаження · Esc: Меню',
  }),
  ja: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: '黒曜石タロット・エーテル闘技場',
    startDuel: '闘技場へ',
    difficulty: '難易度',
    diffApprentice: '見習い',
    diffArchmage: '大魔導師',
    diffCataclysm: 'カタクリズム',
    schoolLabel: '学派',
    language: '言語',
    fullscreen: '全画面',
    exitFullscreen: '全画面解除',
    menu: 'メニュー',
    resume: '決闘に戻る',
    restart: 'やり直す',
    exitToMenu: 'メインメニュー',
    round: 'ラウンド',
    anomaly: '闘技場異変',
    yourTurn: 'あなたのターン',
    enemyTurn: '相手の思考中…',
    endTurn: '攻撃してターン終了',
    overloadBtn: '過負荷 (+2 エーテル / -3 HP)',
    altarBtn: 'エーテルの祭壇',
    ultimatumBtn: '最終通告 (<50% HP: x2)',
    leapPulseBtn: '跳躍パルス (右クリック)',
    hp: 'HP',
    ether: 'エーテル',
    draftTitle: 'タロット戦利品 — 3枚から1枚',
    victoryTitle: '決闘勝利',
    defeatTitle: '回路崩壊',
    nextDuel: '次の対戦者',
    playAgain: 'もう一度',
    briefingContinue: '手札を引く',
    controlsHint: '左クリック: カード/UI · 右クリック: 跳躍パルス · Space: 過負荷 · Esc: メニュー',
  }),
  pl: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Obsydianowa Arena Tarota',
    startDuel: 'Wejdź na Arenę',
    difficulty: 'Poziom trudności',
    diffApprentice: 'Uczeń',
    diffArchmage: 'Arcymag',
    diffCataclysm: 'Kataklizm',
    schoolLabel: 'Szkoła',
    language: 'Język',
    fullscreen: 'Pełny ekran',
    exitFullscreen: 'Zamknij pełny ekran',
    menu: 'Menu',
    resume: 'Wznów',
    restart: 'Restartuj',
    exitToMenu: 'Menu Główne',
    round: 'Runda',
    anomaly: 'Anomalia Areny',
    yourTurn: 'Twój Ruch',
    enemyTurn: 'Ruch Rywala…',
    endTurn: 'Atak i Koniec Tury',
    overloadBtn: 'Przeciążenie (+2 Eter / -3 PŻ)',
    altarBtn: 'Ołtarz Eteru',
    ultimatumBtn: 'Ultimatum (<50% PŻ: x2)',
    leapPulseBtn: 'Skok Impulsu (PPM)',
    hp: 'PŻ',
    ether: 'ETER',
    draftTitle: 'Łup Tarota — 1 z 3',
    victoryTitle: 'ZWYCIĘSTWO',
    defeatTitle: 'KANAŁ ZNISZCZONY',
    nextDuel: 'Następny Rywal',
    playAgain: 'Zagraj Ponownie',
    briefingContinue: 'Rozpocznij Walkę',
    controlsHint: 'LPM: Karty/UI · PPM: Skok Impulsu · Spacja: Przeciążenie · Esc: Menu',
  }),
  it: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Arena dei Tarocchi d’Ossidiana',
    startDuel: 'Entra nell’Arena',
    difficulty: 'Difficoltà',
    diffApprentice: 'Apprendista',
    diffArchmage: 'Arcimago',
    diffCataclysm: 'Cataclisma',
    schoolLabel: 'Scuola',
    language: 'Lingua',
    fullscreen: 'Schermo Intero',
    exitFullscreen: 'Esci da Schermo Intero',
    menu: 'Menu',
    resume: 'Riprendi',
    restart: 'Ricomincia',
    exitToMenu: 'Menu Principale',
    round: 'Round',
    anomaly: 'Anomalia',
    yourTurn: 'Tuo Turno',
    enemyTurn: 'Turno Rivale…',
    endTurn: 'Attacca e Termina',
    overloadBtn: 'Sovraccarico (+2 Etere / -3 PS)',
    altarBtn: 'Altare d’Etere',
    ultimatumBtn: 'Ultimatum (<50% PS: x2)',
    leapPulseBtn: 'Balzo Etereo (Tasto Destro)',
    hp: 'PS',
    ether: 'ETERE',
    draftTitle: 'Bottino Tarocchi — 1 su 3',
    victoryTitle: 'VITTORIA',
    defeatTitle: 'CANALE INFRANTO',
    nextDuel: 'Prossimo Rivale',
    playAgain: 'Gioca Ancora',
    briefingContinue: 'Inizia Duello',
    controlsHint: 'Click Sx: Carte/UI · Click Dx: Balzo Etereo · Spazio: Sovraccarico · Esc: Menu',
  }),
  vi: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'Đấu Trường Tarot Hắc Diện',
    startDuel: 'Vào Đấu Trường',
    difficulty: 'Độ khó',
    diffApprentice: 'Tập sự',
    diffArchmage: 'Đại pháp sư',
    diffCataclysm: 'Đại họa',
    schoolLabel: 'Hệ phái',
    language: 'Ngôn ngữ',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    menu: 'Menu',
    resume: 'Tiếp tục',
    restart: 'Chơi lại',
    exitToMenu: 'Về Menu Chính',
    round: 'Vòng',
    anomaly: 'Dị biến đấu trường',
    yourTurn: 'Lượt của bạn',
    enemyTurn: 'Đối thủ đang tính…',
    endTurn: 'Tấn công & Kết lượt',
    overloadBtn: 'Quá tải (+2 Ether / -3 HP)',
    altarBtn: 'Tế đàn Ether',
    ultimatumBtn: 'Tối hậu thư (<50% HP: x2)',
    leapPulseBtn: 'Nhảy Xung (Chuột phải)',
    hp: 'HP',
    ether: 'ETHER',
    draftTitle: 'Chiến lợi phẩm — Chọn 1 trong 3',
    victoryTitle: 'CHIẾN THẮNG',
    defeatTitle: 'KÊNH VỠ VỤN',
    nextDuel: 'Đối thủ kế tiếp',
    playAgain: 'Đấu lại',
    briefingContinue: 'Rút bài mở màn',
    controlsHint: 'Chuột trái: Đánh bài/UI · Chuột phải: Nhảy Xung · Space: Quá tải · Esc: Menu',
  }),
  fa: makePack({
    gameTitle: 'OBSIDIAN ARCANUM',
    subtitle: 'میدان تاروت ابسیدین و اتر',
    startDuel: 'ورود به میدان',
    difficulty: 'سطح دشواری',
    diffApprentice: 'شاگرد',
    diffArchmage: 'جادوگر اعظم',
    diffCataclysm: 'فاجعه',
    schoolLabel: 'مکتب',
    language: 'زبان',
    fullscreen: 'تمام‌صفحه',
    exitFullscreen: 'خروج از تمام‌صفحه',
    menu: 'منو',
    resume: 'ادامه نبرد',
    restart: 'شروع مجدد',
    exitToMenu: 'منوی اصلی',
    round: 'دور',
    anomaly: 'ناهنجاری میدان',
    yourTurn: 'نوبت شما',
    enemyTurn: 'نوبت حریف…',
    endTurn: 'حمله و پایان نوبت',
    overloadBtn: 'اضافه‌بار (+۲ اتر / -۳ جان)',
    altarBtn: 'قربانگاه اتر',
    ultimatumBtn: 'ضرب‌الاجل (<۵۰٪ جان: ۲ برابر)',
    leapPulseBtn: 'جهش اتر (کلیک راست)',
    hp: 'جان',
    ether: 'اتر',
    draftTitle: 'غنیمت تاروت — ۱ از ۳',
    victoryTitle: 'پیروزی',
    defeatTitle: 'کانال فروپاشید',
    nextDuel: 'حریف بعدی',
    playAgain: 'نبرد دوباره',
    briefingContinue: 'آغاز دوئل',
    controlsHint: 'کلیک چپ: کارت‌ها · کلیک راست: جهش اتر · Space: اضافه‌بار · Esc: منو',
  }),
  elvish: makePack({
    gameTitle: 'MAHTALË VALARION',
    subtitle: 'Elen-Tarot Ondo-Men',
    startDuel: 'Tula i Menna',
    difficulty: 'Nwalmë',
    diffApprentice: 'Noldo-Nér',
    diffArchmage: 'Sairon',
    diffCataclysm: 'Dagor-Aurin',
    schoolLabel: 'Nóre',
    schoolKinet: 'Súlimo',
    schoolVital: 'Yavanna',
    schoolChaos: 'Nárë',
    schoolSynth: 'Aulë-Tan',
    language: 'Lambë',
    fullscreen: 'Ilqua Cén',
    exitFullscreen: 'Pitya Cén',
    menu: 'Tengwë',
    resume: 'Aváma',
    restart: 'En-yesta',
    exitToMenu: 'Metta-Men',
    round: 'Rinda',
    anomaly: 'Men-Aista',
    yourTurn: 'Lúmenya',
    enemyTurn: 'Cotumo Sana…',
    endTurn: 'Mahta & Metta',
    overloadBtn: 'Úrë-Fëa (+2 Fëa / -3 Coivë)',
    altarBtn: 'Yána-Fëa',
    ultimatumBtn: 'Metta-Quenta (<50%)',
    leapPulseBtn: 'Limpë-Halta (For-Tamba)',
    hp: 'COIVË',
    ether: 'FËA',
    draftTitle: 'Anna Elen — Cilë 1 minë 3',
    victoryTitle: 'TÚRË',
    defeatTitle: 'FËA RÁCAINA',
    nextDuel: 'Ento Cotumo',
    playAgain: 'En-mahta',
    briefingContinue: 'Yesta Dagor',
    controlsHint: 'Hyarya: Parma · Forya: Halta-Fëa · Space: Úrë-Fëa · Esc: Tengwë',
  }),
  orcish: makePack({
    gameTitle: 'MAK’GORA ZUG-ZUG',
    subtitle: 'OBSIDIAN BLOOD-TAROT PIT',
    startDuel: 'SMASH INTO PIT!',
    difficulty: 'BRUTALITY',
    diffApprentice: 'GRUNT',
    diffArchmage: 'WARCHIEF',
    diffCataclysm: 'BLOOD-GOD',
    schoolLabel: 'CLAN',
    schoolKinet: 'WIND-CLAW',
    schoolVital: 'BONE-MEND',
    schoolChaos: 'HELL-FIRE',
    schoolSynth: 'IRON-FORGE',
    language: 'TONGUE',
    fullscreen: 'BIG-EYES',
    exitFullscreen: 'SMALL-BOX',
    menu: 'WAR-BOARD',
    resume: 'BACK TO KRUMP',
    restart: 'RE-KRUMP!',
    exitToMenu: 'WAR-CAMP',
    round: 'CLASH',
    anomaly: 'PIT-CURSE',
    yourTurn: 'YOUR WAAAGH!',
    enemyTurn: 'RUNT THINKIN…',
    endTurn: 'CHOP & PASS',
    overloadBtn: 'BLOOD-SURGE (+2 JUICE / -3 BLOOD)',
    altarBtn: 'BURN CARD ON ALTAR',
    ultimatumBtn: 'BERSERK (<50% BLOOD: x2)',
    leapPulseBtn: 'POWER LEAP (RIGHT-CLICK)',
    hp: 'BLOOD',
    ether: 'JUICE',
    draftTitle: 'LOOT SPOILS — PICK 1 OF 3',
    victoryTitle: 'KRUMPED ’EM!',
    defeatTitle: 'YOU GOT KRUMPED',
    nextDuel: 'NEXT CHALLENGER',
    playAgain: 'WAAAGH AGAIN!',
    briefingContinue: 'DRAW AXES',
    controlsHint: 'Left-Click: Throw Cards · Right-Click: Power Leap · Space: Blood-Surge · Esc: War-Board',
  }),
};

export function getTranslations(lang: LanguageCode): TranslationPack {
  return TRANSLATIONS[lang] ?? EN;
}

export function isRtlLanguage(lang: LanguageCode): boolean {
  return lang === 'ar' || lang === 'fa';
}
