import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Brand } from './Brand';
import { AccountDialog } from './AccountDialog';
import { LiveRegion } from './LiveRegion';
import { OfflineBanner } from './OfflineBanner';
import { useMyProfile } from '../hooks/useMyProfile';

export function AppShell({ children }: { children: ReactNode }) {
  const profile = useMyProfile();
  const [accountOpen, setAccountOpen] = useState(false);
  const name = profile?.displayName ?? 'Gjest';

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-cream dark:bg-stone-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_70%_at_50%_0%,rgba(39,143,96,0.16),transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_50%_0%,rgba(39,143,96,0.18),transparent_70%)]"
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Hopp til innhold
      </a>
      <header
        className="sticky top-0 z-40 border-b border-stone-200/70 bg-cream/85 backdrop-blur-md dark:border-stone-800/80 dark:bg-stone-950/85"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Brand />
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-stone-900/5 dark:hover:bg-white/5"
            onClick={() => setAccountOpen(true)}
            aria-label={`Konto for ${name}`}
          >
            <Avatar id={profile?.id ?? 'guest'} name={name} />
            <span className="hidden max-w-32 truncate text-sm font-medium text-stone-700 dark:text-stone-200 sm:block">
              {name}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-stone-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M8 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>
      <OfflineBanner />
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:pt-9">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-8 text-center text-xs text-stone-500 dark:text-stone-400">
        <Link to="/" className="hover:text-stone-600 dark:hover:text-stone-300">
          Handlelista
        </Link>{' '}
        · felles handleliste som husker
      </footer>
      <LiveRegion />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
