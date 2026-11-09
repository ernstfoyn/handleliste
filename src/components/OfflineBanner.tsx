import { useState } from 'react';
import { syncEngine } from '../data/engine';
import { resetLocalData } from '../lib/db';
import { useSyncStore } from '../lib/sync-store';
import { useDelayedFlag } from '../hooks/useDelayedFlag';

function CloudOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M17.5 18H7a4 4 0 0 1-.7-7.94A6 6 0 0 1 17.7 8.1 3.95 3.95 0 0 1 20 12"
        strokeLinecap="round"
      />
      <path d="M4 4l16 16" strokeLinecap="round" />
    </svg>
  );
}

export function OfflineBanner() {
  const online = useSyncStore((state) => state.online);
  const phase = useSyncStore((state) => state.phase);
  const pending = useSyncStore((state) => state.pending);
  const error = useSyncStore((state) => state.error);
  const paused = useSyncStore((state) => state.paused);
  const showSyncing = useDelayedFlag(pending > 0 && online && phase === 'syncing', 600);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (
      !window.confirm(
        'Nullstille lokal kø? Ulagrede endringer går tapt, men alt som er lagret på serveren hentes på nytt.',
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      syncEngine.stop();
      await resetLocalData();
      window.location.reload();
    } catch (error) {
      console.error('Kunne ikke nullstille lokal data', error);
      window.alert(
        'Kunne ikke nullstille lokal data. Prøv å slette nettleserdata for dette nettstedet.',
      );
      setResetting(false);
    }
  };

  if (!online) {
    return (
      <div
        role="status"
        className="sticky z-30 border-b border-ink/10 bg-butter-100 px-4 py-2 text-ink backdrop-blur dark:border-white/10 dark:bg-butter-950 dark:text-butter-100"
        style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-3xl items-start gap-2 text-sm">
          <CloudOffIcon />
          <p>
            <span className="font-semibold">Du er offline.</span> Endringer lagres på denne enheten
            og synkes når du er tilbake.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="sticky z-30 border-b border-ink/10 bg-blush-100 px-4 py-2 text-ink backdrop-blur dark:border-white/10 dark:bg-blush-950 dark:text-blush-100"
        style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 text-sm">
          <p className="min-w-0 flex-1 basis-64">
            <span className="font-semibold">Synk stopper.</span> {error}
          </p>
          {paused ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary min-h-11 px-2.5 text-xs"
                onClick={() => syncEngine.retry()}
              >
                Prøv igjen
              </button>
              <button
                type="button"
                className="min-h-11 px-1 text-xs font-medium text-ink/55 underline-offset-4 hover:text-ink hover:underline disabled:opacity-50 dark:text-paper/55 dark:hover:text-paper"
                onClick={() => void handleReset()}
                disabled={resetting}
              >
                {resetting ? 'Nullstiller …' : 'Nullstill lokal kø'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (showSyncing) {
    return (
      <div
        role="status"
        className="sticky z-30 border-b border-ink/[0.06] bg-white/70 px-4 py-1.5 text-ink/55 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-paper/55"
        style={{ top: 'calc(4rem + env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 text-xs">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink dark:bg-paper"
            aria-hidden="true"
          />
          <span>Synkroniserer {pending === 1 ? '1 endring' : `${pending} endringer`} …</span>
        </div>
      </div>
    );
  }

  return null;
}
