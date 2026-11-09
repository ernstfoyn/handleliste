import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PresenceUser } from '../lib/types';

interface PresenceMeta {
  display_name?: string;
  online_at?: string;
}

/**
 * Tilstedeværelse per liste. Bruker Supabase Realtime Presence og er bevisst
 * ikke persistiert – forsvinner når fanen lukkes eller nettet faller.
 */
export function usePresence(
  listId: string | undefined,
  userId: string | undefined,
  displayName: string,
): PresenceUser[] {
  const [peers, setPeers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!listId || !userId || !supabase) {
      setPeers([]);
      return;
    }

    const client = supabase;
    const channel = client.channel(`presence:${listId}`, {
      config: { presence: { key: userId } },
    });

    const update = () => {
      const state = channel.presenceState<PresenceMeta>();
      const byUser = new Map<string, PresenceUser>();
      for (const [peerId, presences] of Object.entries(state)) {
        const meta = presences[0];
        byUser.set(peerId, {
          userId: peerId,
          displayName: meta?.display_name?.trim() || 'Gjest',
        });
      }
      setPeers(
        [...byUser.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'nb-NO')),
      );
    };

    channel.on('presence', { event: 'sync' }, update);
    channel.on('presence', { event: 'join' }, update);
    channel.on('presence', { event: 'leave' }, update);

    void channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({
          display_name: displayName || 'Gjest',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      void channel.untrack();
      void client.removeChannel(channel);
    };
  }, [displayName, listId, userId]);

  return peers;
}
