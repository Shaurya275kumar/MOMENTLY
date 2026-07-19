export function DevGramMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="dg-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#dg-grad)" />
      <path d="M 8 7 L 11 7 A 11 9 0 0 1 11 25 L 8 25 Z" fill="#ffffff" />
      <path d="M 13.5 11 L 21 16 L 13.5 21 Z" fill="url(#dg-grad)" />
    </svg>
  );
}

export function DevGramWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DevGramMark className="w-7 h-7" />
      <span className="font-logo text-2xl text-[#262626] leading-none">DevGram</span>
    </div>
  );
}
