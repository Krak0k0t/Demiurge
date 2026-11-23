import { useState } from 'react';
import { BookOpen, Flame, Gamepad2, Palette, Shield, Sparkles, Swords, X } from 'lucide-react';
import type { TranslationPack } from '../i18n/translations';
import { StoneCorners, StoneDivider } from './StoneOrnament';

type HelpTabId = 'cards' | 'actions' | 'combat' | 'controls';

interface HelpModalProps {
  t: TranslationPack;
  onClose: () => void;
}

const CARD_SWATCH_STYLES: Record<
  'altar' | 'selected' | 'ready' | 'dim',
  {
    borderColor: string;
    background: string;
    badgeColor: string;
    badgeBorder: string;
    badgeBg: string;
  }
> = {
  altar: {
    borderColor: '#D95843',
    background: 'linear-gradient(180deg, #3A1618 0%, #1F0B0D 100%)',
    badgeColor: '#FFB2A6',
    badgeBorder: '#C94A38',
    badgeBg: '#46181A',
  },
  selected: {
    borderColor: '#7BE6DB',
    background: 'linear-gradient(180deg, #163338 0%, #0D1E22 100%)',
    badgeColor: '#A9F2EA',
    badgeBorder: '#4E9F97',
    badgeBg: '#122B30',
  },
  ready: {
    borderColor: '#D7A447',
    background: 'linear-gradient(180deg, #2B2418 0%, #19150F 100%)',
    badgeColor: '#FFE8AE',
    badgeBorder: '#B88D44',
    badgeBg: '#302412',
  },
  dim: {
    borderColor: '#47404E',
    background: 'linear-gradient(180deg, #1B1821 0%, #110F15 100%)',
    badgeColor: '#ACA2B5',
    badgeBorder: '#47404E',
    badgeBg: '#18151D',
  },
};

export function HelpModal({ t, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<HelpTabId>('cards');

  const tabs: Array<{ id: HelpTabId; label: string; Icon: typeof Palette }> = [
    { id: 'cards', label: t.help.tabs.cards, Icon: Palette },
    { id: 'actions', label: t.help.tabs.actions, Icon: Sparkles },
    { id: 'combat', label: t.help.tabs.combat, Icon: Swords },
    { id: 'controls', label: t.help.tabs.controls, Icon: Gamepad2 },
  ];

  const keywordItems = [
    { key: 'flying', text: t.keywordDescs.flying },
    { key: 'firstStrike', text: t.keywordDescs.firstStrike },
    { key: 'armor', text: t.keywordDescs.armor },
    { key: 'poison', text: t.keywordDescs.poison },
    { key: 'heal', text: t.keywordDescs.heal },
    { key: 'stance', text: t.keywordDescs.stance },
  ];

  return (
    <div
      data-help-modal="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/78 p-2 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="stone-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden p-3 sm:max-h-[88vh] sm:p-6">
        <StoneCorners />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7CDAD1]">
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.helpBtn}</span>
            </div>
            <h2
              id="help-modal-title"
              className="font-display mt-0.5 text-xl font-bold tracking-wide text-[#FBF2E1] sm:text-2xl"
            >
              {t.helpTitle}
            </h2>
            <p className="font-body mt-0.5 text-xs text-[#CFC2AE]">{t.helpSubtitle}</p>
          </div>

          <button
            type="button"
            data-help-close="true"
            onClick={onClose}
            aria-label={t.helpClose}
            className="stone-btn inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center p-2 text-[#EAD9BD] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Category Tabs */}
        <div
          role="tablist"
          aria-label={t.helpTitle}
          className="relative z-10 mt-3.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4"
        >
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                data-help-tab={id}
                onClick={() => setActiveTab(id)}
                className={`font-body inline-flex min-h-[40px] items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? 'gold-cta-btn font-bold'
                    : 'stone-btn font-normal text-[#DED1BE] hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <StoneDivider />

        {/* Scrollable Content */}
        <div className="relative z-10 flex-1 space-y-4 overflow-y-auto pr-1">
          {activeTab === 'cards' && (
            <div className="space-y-4">
              <p className="font-body text-xs leading-relaxed text-[#E2D6C3] sm:text-sm">
                {t.help.cardsIntro}
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {t.help.cardStates.map((item) => {
                  const swatch = CARD_SWATCH_STYLES[item.id];
                  return (
                    <div
                      key={item.id}
                      data-help-card-state={item.id}
                      className="flex flex-col gap-2 border p-3"
                      style={{
                        borderColor: swatch.borderColor,
                        background: swatch.background,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-7 w-5 shrink-0 items-center justify-center border-2"
                            style={{
                              borderColor: swatch.borderColor,
                              background: '#120E18',
                            }}
                            aria-hidden="true"
                          >
                            {item.id === 'altar' && <Flame className="h-3 w-3 text-[#FF8775]" />}
                          </span>
                          <h3 className="font-display text-xs font-bold leading-snug text-[#FBF2E1] sm:text-[13px]">
                            {item.title}
                          </h3>
                        </div>
                        <span
                          className="font-display shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            color: swatch.badgeColor,
                            borderColor: swatch.badgeBorder,
                            background: swatch.badgeBg,
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="font-body text-xs leading-relaxed text-[#E2D6C3]">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#A67F38]/30 pt-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-[#E8BC5E]">
                  {t.help.cardTypesTitle}
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {t.help.cardTypes.map((ct) => (
                    <div
                      key={ct.title}
                      className="border border-[#5A4728]/70 bg-[#14111B]/90 px-3 py-2"
                    >
                      <div className="font-display text-xs font-bold text-[#FFE8AE]">{ct.title}</div>
                      <p className="font-body mt-0.5 text-xs leading-relaxed text-[#D8CCB9]">
                        {ct.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-4">
              <p className="font-body text-xs leading-relaxed text-[#E2D6C3] sm:text-sm">
                {t.help.actionsIntro}
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {t.help.turnActions.map((act) => (
                  <div
                    key={act.title}
                    className="border border-[#6A532E]/75 bg-[#15121D]/90 px-3 py-2.5"
                  >
                    <div className="font-display text-xs font-bold text-[#FFE8AE]">{act.title}</div>
                    <p className="font-body mt-1 text-xs leading-relaxed text-[#DDD1BE]">
                      {act.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#A67F38]/30 pt-3">
                <h3 className="font-display flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#7CDAD1]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.help.archonPowersTitle}</span>
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {t.help.archonPowers.map((pow) => (
                    <div
                      key={pow.title}
                      className="border border-[#3D726E]/80 bg-[#101A1F]/90 px-3 py-2.5"
                    >
                      <div className="font-display text-xs font-bold text-[#A9F2EA]">{pow.title}</div>
                      <p className="font-body mt-1 text-xs leading-relaxed text-[#D8ECEA]">
                        {pow.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'combat' && (
            <div className="space-y-4">
              <p className="font-body text-xs leading-relaxed text-[#E2D6C3] sm:text-sm">
                {t.help.combatIntro}
              </p>

              <div className="space-y-2">
                {t.help.combatRules.map((rule) => (
                  <div
                    key={rule.title}
                    className="border border-[#6A532E]/75 bg-[#15121D]/90 px-3 py-2.5"
                  >
                    <div className="font-display text-xs font-bold text-[#FFE8AE]">{rule.title}</div>
                    <p className="font-body mt-1 text-xs leading-relaxed text-[#DDD1BE]">
                      {rule.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#A67F38]/30 pt-3">
                <h3 className="font-display flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#E8BC5E]">
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.help.keywordsTitle}</span>
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {keywordItems.map((kw) => (
                    <div
                      key={kw.key}
                      className="border border-[#4B3F56]/80 bg-[#14111A]/90 px-3 py-2"
                    >
                      <p className="font-body text-xs leading-relaxed text-[#E4D9C8]">{kw.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-4">
              <p className="font-body text-xs leading-relaxed text-[#E2D6C3] sm:text-sm">
                {t.help.controlsIntro}
              </p>

              <div className="space-y-2">
                {t.help.controlsList.map((ctrl) => (
                  <div
                    key={ctrl.keyHint}
                    className="flex flex-col gap-1 border border-[#5A4728]/75 bg-[#15121D]/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="font-display shrink-0 text-xs font-bold text-[#7BE6DB]">
                      {ctrl.keyHint}
                    </span>
                    <span className="font-body text-xs text-[#E4D9C8] sm:text-right">
                      {ctrl.desc}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#A67F38]/30 pt-3">
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.14em] text-[#E8BC5E]">
                  {t.help.arenaSystemsTitle}
                </h3>
                <div className="mt-2 space-y-2">
                  {t.help.arenaSystems.map((sys) => (
                    <div
                      key={sys.title}
                      className="border border-[#5A4728]/70 bg-[#14111B]/90 px-3 py-2.5"
                    >
                      <div className="font-display text-xs font-bold text-[#FFE8AE]">{sys.title}</div>
                      <p className="font-body mt-0.5 text-xs leading-relaxed text-[#DDD1BE]">
                        {sys.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Close CTA */}
        <div className="relative z-10 mt-4 flex justify-end border-t border-[#A67F38]/35 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="gold-cta-btn font-display min-h-[40px] px-6 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em]"
          >
            {t.helpClose}
          </button>
        </div>
      </div>
    </div>
  );
}
