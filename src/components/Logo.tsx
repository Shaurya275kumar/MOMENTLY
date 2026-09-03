export function MomentlyMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`${className} ml-mark`} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="ml-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" className="ml-grad-stop-1" />
          <stop offset="100%" stopColor="#6366f1" className="ml-grad-stop-2" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#ml-grad)" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.35" className="ml-ring" />
      <path d="M 10 22 L 10 13 L 16 18 L 22 13 L 22 22" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ml-path" />
      <circle cx="16" cy="16" r="1.8" fill="#ffffff" className="ml-center" />
    </svg>
  );
}

export function MomentlyWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MomentlyMark className="w-7 h-7" />
      <span className="font-logo text-2xl text-[#262626] dark:text-[#f5f5f5] leading-none tracking-tight">Momently</span>
    </div>
  );
}
