import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from '../lib/db';
import { toErrorMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { isRetryableSyncError } from '../lib/sync-core';
import { useSyncStore } from '../lib/sync-store';
import { pullAll, resetPullSignature } from './pull';
import { sendOutboxEntry } from './outbox-send';

const PULL_DEBOUNCE_MS = 150;

class SyncEngine {
  private userId: string | null = null;
  private generation = 0;
  private channel: RealtimeChannel | null = null;
  private pullTimer: ReturnType<typeof setTimeout> | null = null;
  private pulling: Promise<void> | null = null;
  private flushing: Promise<void> | null = null;
  private pullAgain = false;
  private paused = false;
  private started = false;
  private online = typeof navigator === 'undefined' ? true : navigator.onLine;

  start(userId: string): void {
    if (this.started && this.userId === userId) return;
    this.stop();
    this.userId = userId;
    this.started = true;
    this.paused = false;
    this.pullAgain = false;
    this.online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const generation = ++this.generation;

    resetPullSignature();
    useSyncStore.getState().reset(this.online);

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.subscribe(generation);
    void this.refreshPending();

    if (!this.online) {
      useSyncStore.getState().setInitialPullDone(true);
      return;
    }

    void this.flushNow();
    void this.pullNow();
  }

  stop(): void {
    this.generation += 1;
    this.started = false;
    this.userId = null;
    this.paused = false;
    this.pullAgain = false;
    this.pulling = null;
    this.flushing = null;

    if (this.pullTimer) {
      clearTimeout(this.pullTimer);
      this.pullTimer = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    if (this.channel && supabase) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
    useSyncStore.getState().setPhase('idle');
  }

  kick(): void {
    void (async () => {
      await this.refreshPending();
      if (!this.online) return;
      await this.flushNow();
      if (this.online && !this.paused) {
        await this.pullNow();
      }
    })();
  }

  retry(): void {
    this.paused = false;
    useSyncStore.getState().setError(null, false);
    useSyncStore.getState().setPhase('idle');
    this.kick();
  }

  async pullNow(): Promise<void> {
    if (!this.userId || !this.online || !supabase) {
      useSyncStore.getState().setInitialPullDone(true);
      return;
    }

    if (this.pulling) {
      this.pullAgain = true;
      return this.pulling;
    }

    const generation = this.generation;
    this.pulling = (async () => {
      do {
        this.pullAgain = false;
        try {
          const changed = await pullAll(
            this.userId ?? '',
            () => generation === this.generation && this.userId !== null,
          );
          if (generation !== this.generation) return;
          const store = useSyncStore.getState();
          if (changed) {
            store.setLastSyncedAt(new Date().toISOString());
            if (store.initialPullDone) store.announce('Listen ble oppdatert.');
          }
        } catch (error) {
          if (generation !== this.generation) return;
          if (!isRetryableSyncError(error)) {
            console.warn('Kunne ikke hente data fra Supabase', error);
          }
        }
      } while (this.pullAgain && this.online && generation === this.generation);

      if (generation === this.generation && this.online && !this.paused) {
        await this.refreshPending();
        if (generation === this.generation && useSyncStore.getState().pending > 0) {
          void this.flushNow();
        }
      }
    })().finally(() => {
      if (generation === this.generation) {
        if (this.pulling) this.pulling = null;
        useSyncStore.getState().setInitialPullDone(true);
      }
    });

    return this.pulling;
  }

  async flushNow(): Promise<void> {
    if (!this.userId || !this.online || !supabase || this.paused) return;
    if (this.flushing) return this.flushing;

    const generation = this.generation;
    this.flushing = (async () => {
      let sentAny = false;

      // Looper til køen er tom. Nye handlinger kan legges i outbox mens vi
      // sender, og må plukkes opp i samme synkeforsøk.
      while (this.online && generation === this.generation && !this.paused) {
        const entries = await db.outbox.orderBy('seq').toArray();
        if (entries.length === 0) break;

        sentAny = true;
        useSyncStore.getState().setPhase('syncing');

        for (const entry of entries) {
          if (!this.online || generation !== this.generation || this.paused) break;

          try {
            await sendOutboxEntry(entry);
            if (generation !== this.generation) return;
            await db.outbox.delete(entry.seq);
          } catch (error) {
            if (generation !== this.generation) return;
            const message = toErrorMessage(error);
            await db.outbox.update(entry.seq, {
              attempts: entry.attempts + 1,
              lastError: message,
            });
            await this.refreshPending();
            if (generation !== this.generation) return;

            if (isRetryableSyncError(error)) {
              useSyncStore.getState().setPhase('idle');
            } else {
              this.paused = true;
              useSyncStore.getState().setError(message, true);
              useSyncStore.getState().setPhase('error');
            }
            return;
          }
        }

        if (!this.online || generation !== this.generation || this.paused) return;
        await this.refreshPending();
        if (generation !== this.generation) return;
        if (useSyncStore.getState().pending === 0) break;
      }

      if (generation !== this.generation) return;
      await this.refreshPending();
      if (generation !== this.generation) return;

      const store = useSyncStore.getState();
      store.setPhase('idle');
      if (store.pending === 0 && sentAny) {
        store.setError(null, false);
        store.setLastSyncedAt(new Date().toISOString());
      }
    })();

    try {
      await this.flushing;
    } finally {
      if (generation === this.generation) {
        this.flushing = null;
      }
    }
  }

  async refreshPending(): Promise<void> {
    const pending = await db.outbox.count();
    useSyncStore.getState().setPending(pending);
  }

  private subscribe(generation: number): void {
    if (!supabase || !this.userId) return;

    const channel = supabase.channel(`handlelista-db:${this.userId}`);
    const onChange = () => this.schedulePull();

    for (const table of [
      'items',
      'lists',
      'list_members',
      'profiles',
      'item_catalog',
      'households',
    ]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
    }

    channel.subscribe();
    this.channel = channel;

    // Hvis kanalen feiler, sørger reconnect/visibility/online for ny pull.
    if (generation !== this.generation) {
      void supabase.removeChannel(channel);
    }
  }

  private schedulePull(delay = PULL_DEBOUNCE_MS): void {
    if (this.pullTimer) clearTimeout(this.pullTimer);
    this.pullTimer = setTimeout(() => {
      this.pullTimer = null;
      void this.pullNow();
    }, delay);
  }

  private handleOnline = (): void => {
    this.online = true;
    useSyncStore.getState().setOnline(true);
    if (!this.userId) return;
    void this.flushNow();
    void this.pullNow();
  };

  private handleOffline = (): void => {
    this.online = false;
    useSyncStore.getState().setOnline(false);
    useSyncStore.getState().setPhase('idle');
  };

  private handleVisibility = (): void => {
    if (document.visibilityState !== 'visible' || !this.userId) return;
    if (!this.online) return;
    void this.flushNow();
    void this.pullNow();
  };
}

export const syncEngine = new SyncEngine();
