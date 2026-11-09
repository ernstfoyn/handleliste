import { Link } from 'react-router-dom';

export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Handlelista"
      focusable="false"
    >
      <defs>
        <linearGradient id="brand-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f9e6a" />
          <stop offset="1" stopColor="#145a3b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#brand-gradient)" />
      <path
        d="M18.5 33.5 27.5 42.5 46 23.5"
        fill="none"
        stroke="#faf7f0"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({ to = '/', subtitle }: { to?: string; subtitle?: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none"
      aria-label="Handlelista – til listene"
    >
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Handlelista
        </span>
        {subtitle ? (
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
