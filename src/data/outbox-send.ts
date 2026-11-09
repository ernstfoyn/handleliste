import { requireSupabase } from '../lib/supabase';
import { toItemInsert, toItemUpdate, toListInsert, toListUpdate } from '../lib/mappers';
import type { OutboxRecord } from '../lib/sync-types';

/**
 * Sender én outbox-operasjon. Alle operasjoner er idempotente:
 * - insert bruker klient-generert UUID + ignoreDuplicates
 * - update/delete er naturlig idempotente på id
 */
export async function sendOutboxEntry(entry: OutboxRecord): Promise<void> {
  const supabase = requireSupabase();

  switch (entry.kind) {
    case 'item.insert': {
      const { error } = await supabase
        .from('items')
        .upsert(toItemInsert(entry.payload.item), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      return;
    }
    case 'item.update': {
      const { error } = await supabase
        .from('items')
        .update(toItemUpdate(entry.payload.patch))
        .eq('id', entry.payload.itemId);
      if (error) throw error;
      return;
    }
    case 'item.delete': {
      const { error } = await supabase.from('items').delete().eq('id', entry.payload.itemId);
      if (error) throw error;
      return;
    }
    case 'list.insert': {
      const { error } = await supabase
        .from('lists')
        .upsert(toListInsert(entry.payload.list), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      return;
    }
    case 'list.update': {
      const { error } = await supabase
        .from('lists')
        .update(toListUpdate(entry.payload.patch))
        .eq('id', entry.payload.listId);
      if (error) throw error;
      return;
    }
    case 'list.delete': {
      const { error } = await supabase
        .from('lists')
        .update({ deleted_at: entry.payload.deletedAt })
        .eq('id', entry.payload.listId);
      if (error) throw error;
      return;
    }
  }
}
