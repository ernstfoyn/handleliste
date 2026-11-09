import type { ReactNode } from 'react';

function BasketIllustration() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-32" role="img" aria-label="Tom handlekurv">
      <path
        d="M23 38h74l-7 45a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5l-7-45Z"
        className="fill-brand-100 stroke-brand-600 dark:fill-brand-950 dark:stroke-brand-500"
        strokeWidth="2.5"
      />
      <path
        d="M43 40V27a17 17 0 0 1 34 0v13"
        className="fill-none stroke-brand-600 dark:stroke-brand-500"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M46 62l9 9 20-22"
        className="fill-none stroke-brand-700 dark:stroke-brand-300"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/50 px-6 py-10 text-center dark:border-stone-700 dark:bg-stone-900/40">
      <BasketIllustration />
      <h2 className="mt-3 font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-stone-600 dark:text-stone-300">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
