import { create } from 'zustand';

export type SyncPhase = 'idle' | 'syncing' | 'error';

interface SyncState {
  online: boolean;
  phase: SyncPhase;
  pending: number;
  error: string | null;
  paused: boolean;
  initialPullDone: boolean;
  lastSyncedAt: string | null;
  announcement: string;
  announcementNonce: number;
  setOnline: (online: boolean) => void;
  setPhase: (phase: SyncPhase) => void;
  setPending: (pending: number) => void;
  setError: (error: string | null, paused?: boolean) => void;
  setInitialPullDone: (done: boolean) => void;
  setLastSyncedAt: (iso: string) => void;
  announce: (message: string) => void;
  reset: (online: boolean) => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  phase: 'idle',
  pending: 0,
  error: null,
  paused: false,
  initialPullDone: false,
  lastSyncedAt: null,
  announcement: '',
  announcementNonce: 0,
  setOnline: (online) => set({ online }),
  setPhase: (phase) => set({ phase }),
  setPending: (pending) => set({ pending }),
  setError: (error, paused = false) => set({ error, paused }),
  setInitialPullDone: (initialPullDone) => set({ initialPullDone }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  announce: (announcement) =>
    set((state) => ({ announcement, announcementNonce: state.announcementNonce + 1 })),
  reset: (online) =>
    set({
      online,
      phase: 'idle',
      pending: 0,
      error: null,
      paused: false,
      initialPullDone: false,
      lastSyncedAt: null,
      announcement: '',
      announcementNonce: 0,
    }),
}));
