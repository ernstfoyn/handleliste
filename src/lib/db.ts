import Dexie, { type Table } from 'dexie';
import type {
  CatalogEntry,
  Household,
  HouseholdMember,
  Item,
  ListMember,
  ListRecord,
  Profile,
} from './types';
import type { NewOutboxRecord, OutboxRecord } from './sync-types';

export interface MetaRecord {
  key: string;
  value: string;
}

export class HandlelisteDB extends Dexie {
  profiles!: Table<Profile, string>;
  households!: Table<Household, string>;
  householdMembers!: Table<HouseholdMember, [string, string]>;
  lists!: Table<ListRecord, string>;
  listMembers!: Table<ListMember, [string, string]>;
  items!: Table<Item, string>;
  catalog!: Table<CatalogEntry, string>;
  outbox!: Table<OutboxRecord, number, NewOutboxRecord>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('handleliste');
    this.version(1).stores({
      profiles: 'id',
      households: 'id',
      householdMembers: '[householdId+userId], householdId, userId',
      lists: 'id, householdId, updatedAt',
      listMembers: '[listId+userId], listId, userId',
      items: 'id, listId, position, updatedAt',
      catalog: 'id, householdId, [householdId+normalizedName], normalizedName, lastUsedAt',
      outbox: '++seq, id, entityId, kind, createdAt',
      meta: 'key',
    });
  }
}

export const db = new HandlelisteDB();

let preparePromise: Promise<void> | null = null;

async function clearAllTables(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.profiles,
      db.households,
      db.householdMembers,
      db.lists,
      db.listMembers,
      db.items,
      db.catalog,
      db.outbox,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.households.clear(),
        db.householdMembers.clear(),
        db.lists.clear(),
        db.listMembers.clear(),
        db.items.clear(),
        db.catalog.clear(),
        db.outbox.clear(),
        db.meta.clear(),
      ]);
    },
  );
}

/**
 * Sørger for at IndexedDB bare inneholder data for innlogget bruker.
 * Kalles før sync starter, slik at en annen bruker på samme enhet ikke ser gammel cache.
 */
export function prepareLocalUser(userId: string): Promise<void> {
  if (preparePromise) return preparePromise;

  preparePromise = (async () => {
    const owner = await db.meta.get('ownerUserId');
    if (owner?.value !== userId) {
      await clearAllTables();
      await db.meta.put({ key: 'ownerUserId', value: userId });
    }
  })().finally(() => {
    preparePromise = null;
  });

  return preparePromise;
}
