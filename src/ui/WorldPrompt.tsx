import { Sparkles } from 'lucide-react';
import { clampWorldPromptPos } from './hudLogic';

export interface WorldPromptProps {
  id: string;
  x: number;
  y: number;
  text: string;
  viewportW: number;
  viewportH: number;
}

export function WorldPrompt({ id, x, y, text, viewportW, viewportH }: WorldPromptProps) {
  const clamped = clampWorldPromptPos(x, y, viewportW, viewportH);

  return (
    <div
      data-world-prompt={id}
      className="hud-surface pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border border-cyan-300/60 bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#B6FAF3] drop-shadow-md transition-[left,top,opacity] duration-150 whitespace-nowrap"
      style={{
        left: `${clamped.x}px`,
        top: `${clamped.y}px`,
        textShadow: '0 2px 6px rgba(0, 0, 0, 0.95)',
      }}
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#62F2E4]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
