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
      <rect width="64" height="64" rx="17" fill="#111111" />
      <path
        d="M18.5 33.5 27.5 42.5 46 23.5"
        fill="none"
        stroke="#F7F3EC"
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
      className="flex min-h-11 items-center gap-2.5 rounded-full focus-visible:outline-none"
      aria-label="Handlelista – til listene"
    >
      <BrandMark />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-xl font-semibold tracking-tight text-ink dark:text-paper">
          Handlelista
        </span>
        {subtitle ? <span className="eyebrow mt-0.5">{subtitle}</span> : null}
      </span>
    </Link>
  );
}
