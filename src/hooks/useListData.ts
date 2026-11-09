import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { CatalogEntry, Household, Item, ListMember, ListRecord, Profile } from '../lib/types';

export interface ListData {
  list: ListRecord | null;
  items: Item[];
  members: ListMember[];
  profiles: Profile[];
  catalog: CatalogEntry[];
  household: Household | null;
}

const EMPTY: ListData = {
  list: null,
  items: [],
  members: [],
  profiles: [],
  catalog: [],
  household: null,
};

export function useListData(listId: string | undefined): ListData | undefined {
  return useLiveQuery(async () => {
    if (!listId) return EMPTY;

    const list = await db.lists.get(listId);
    if (!list || list.deletedAt) return EMPTY;

    const [items, members, catalog, household] = await Promise.all([
      db.items.where('listId').equals(listId).toArray(),
      db.listMembers.where('listId').equals(listId).toArray(),
      db.catalog.where('householdId').equals(list.householdId).toArray(),
      db.households.get(list.householdId),
    ]);

    const memberProfiles = await db.profiles.bulkGet(members.map((member) => member.userId));

    return {
      list,
      items: items.sort(
        (a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt),
      ),
      members,
      profiles: memberProfiles.filter((profile): profile is Profile => Boolean(profile)),
      catalog,
      household: household ?? null,
    };
  }, [listId]);
}
