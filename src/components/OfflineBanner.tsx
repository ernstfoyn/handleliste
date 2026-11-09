import { syncEngine } from '../data/engine';
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
        <div className="mx-auto flex max-w-3xl items-center gap-3 text-sm">
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Synk stopper.</span> {error}
          </p>
          {paused ? (
            <button
              type="button"
              className="btn btn-secondary min-h-11 px-2.5 text-xs"
              onClick={() => syncEngine.retry()}
            >
              Prøv igjen
            </button>
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
