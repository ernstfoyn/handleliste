import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { prepareLocalUser } from '../lib/db';
import { syncEngine } from '../data/engine';
import { ensureBootstrap } from '../data/bootstrap';
import { useAuth } from './AuthProvider';

interface SyncContextValue {
  ready: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const [ready, setReady] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (status !== 'signed-in' || !userId) {
      setReady(false);
      syncEngine.stop();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await prepareLocalUser(userId);
      } catch (error) {
        console.warn('Kunne ikke klargjøre lokal database', error);
      }
      if (cancelled) return;

      syncEngine.start(userId);
      setReady(true);

      try {
        await ensureBootstrap();
      } catch (error) {
        // Bootstrap er idempotent og prøves igjen ved neste sync/online.
        console.warn('Bootstrap mot Supabase feilet', error);
      }
      if (!cancelled) {
        void syncEngine.pullNow();
      }
    })();

    return () => {
      cancelled = true;
      syncEngine.stop();
    };
  }, [status, userId]);

  return <SyncContext.Provider value={{ ready }}>{children}</SyncContext.Provider>;
}

export function useSyncReady(): boolean {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSyncReady må brukes innenfor SyncProvider.');
  return context.ready;
}
