import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';

export interface QuestTrackerProps {
  questId: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  bonusXp: number;
  completedTag: string;
  compact?: boolean;
}

export function QuestTracker({
  questId,
  title,
  description,
  progress,
  target,
  completed,
  bonusXp,
  completedTag,
  compact = false,
}: QuestTrackerProps) {
  const fullText = completed ? `${completedTag} · +${bonusXp} XP` : description;
  const [charCount, setCharCount] = useState(fullText.length);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || compact) {
      setCharCount(fullText.length);
      return;
    }
    setCharCount(0);
    let idx = 0;
    const stepMs = 16;
    const interval = window.setInterval(() => {
      idx += 1;
      setCharCount(idx);
      if (idx >= fullText.length) {
        window.clearInterval(interval);
      }
    }, stepMs);
    return () => window.clearInterval(interval);
  }, [questId, fullText, compact]);

  const displayedText = fullText.slice(0, charCount);

  return (
    <div
      data-quest-badge="true"
      title={description}
      className={`border-t border-[#A67F38]/30 pt-1.5 text-left ${
        completed ? 'text-[#A8F3EC]' : 'text-[#F5E6C8]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-display inline-flex items-center gap-1 truncate text-[9.5px] font-bold uppercase tracking-wider text-[#E8BC5E] drop-shadow-md"
          style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.92)' }}
        >
          <ScrollText className="h-3 w-3 shrink-0 text-[#E2B354]" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </span>
        <span
          className={`font-num shrink-0 text-[10px] font-extrabold drop-shadow-md ${
            completed ? 'text-[#7BE6DB]' : 'text-[#FFE29A]'
          }`}
          style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.92)' }}
        >
          {completed ? `✓ +${bonusXp} XP` : `${progress}/${target}`}
        </span>
      </div>
      {!compact && (
        <p
          className="font-body mt-0.5 min-h-[16px] text-[10.5px] leading-snug tracking-wide text-[#E6DAC7] drop-shadow-md"
          style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.96)' }}
        >
          {displayedText}
        </p>
      )}
    </div>
  );
}
