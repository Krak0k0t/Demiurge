import type { ReactNode } from 'react';
import type { TranslationPack } from '../i18n/translations';
import { DesktopControls } from './DesktopControls';
import type { ArcanePatternId } from './hudLogic';
import { MobileControls, type RadialArcanaAction } from './MobileControls';

export interface HUDProps {
  isMobile: boolean;
  isShortLandscape: boolean;
  t: TranslationPack;
  vitalsCluster: ReactNode;
  endTurnBtn: ReactNode;
  tarotHand: ReactNode;
  radialActions: RadialArcanaAction[];
  selectedPattern?: ArcanePatternId;
  onSelectPattern?: (pattern: ArcanePatternId) => void;
}

export function HUD({
  isMobile,
  isShortLandscape,
  t,
  vitalsCluster,
  endTurnBtn,
  tarotHand,
  radialActions,
  selectedPattern,
  onSelectPattern,
}: HUDProps) {
  if (isMobile) {
    return (
      <MobileControls
        t={t}
        isShortLandscape={isShortLandscape}
        vitalsCluster={vitalsCluster}
        endTurnBtn={endTurnBtn}
        tarotHand={tarotHand}
        radialActions={radialActions}
        selectedPattern={selectedPattern}
        onSelectPattern={onSelectPattern}
      />
    );
  }

  return (
    <DesktopControls
      t={t}
      vitalsCluster={vitalsCluster}
      endTurnBtn={endTurnBtn}
      tarotHand={tarotHand}
      radialActions={radialActions}
    />
  );
}
