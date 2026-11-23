export function StoneCorners({ color = '#D7A84E' }: { color?: string }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Top-Left Carved Gold Bracket */}
      <path d="M 1.5 16 L 1.5 1.5 L 16 1.5" fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {/* Top-Right Carved Gold Bracket */}
      <path d="M 84 1.5 L 98.5 1.5 L 98.5 16" fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {/* Bottom-Left Carved Gold Bracket */}
      <path d="M 1.5 84 L 1.5 98.5 L 16 98.5" fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      {/* Bottom-Right Carved Gold Bracket */}
      <path d="M 84 98.5 L 98.5 98.5 L 98.5 84" fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StoneDivider() {
  return (
    <div className="my-3 flex items-center gap-2.5" aria-hidden="true">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#A67F38] to-[#D7A84E]" />
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16">
        <polygon points="8,1 15,8 8,15 1,8" fill="#1B1622" stroke="#E2B354" strokeWidth="1.4" />
        <circle cx="8" cy="8" r="2.2" fill="#5EC8BE" />
      </svg>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#A67F38] to-[#D7A84E]" />
    </div>
  );
}
