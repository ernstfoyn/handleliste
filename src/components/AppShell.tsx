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
    <div className="relative min-h-dvh overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Hopp til innhold
      </a>
      <header
        className="sticky top-0 z-40 border-b border-ink/[0.06] bg-paper/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0D0D0C]/70"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Brand />
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-full border border-ink/10 bg-white/60 py-1 pl-1 pr-2.5 transition-all hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/10"
            onClick={() => setAccountOpen(true)}
            aria-label={`Konto for ${name}`}
          >
            <Avatar id={profile?.id ?? 'guest'} name={name} />
            <span className="hidden max-w-32 truncate text-sm font-medium text-ink dark:text-paper sm:block">
              {name}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-ink/40 dark:text-paper/40"
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
      <main id="main" className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:pt-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-10 text-center text-[11px] uppercase tracking-[0.16em] text-ink/35 dark:text-paper/35">
        <Link to="/" className="hover:text-ink/60 dark:hover:text-paper/60">
          Handlelista
        </Link>{' '}
        · felles handleliste
      </footer>
      <LiveRegion />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
