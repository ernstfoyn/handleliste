import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { ListRecord, Profile } from '../lib/types';

export interface ListOverviewItem {
  list: ListRecord;
  total: number;
  unchecked: number;
  checked: number;
  updatedByProfile: Profile | null;
}

export interface ListsOverview {
  active: ListOverviewItem[];
  archived: ListOverviewItem[];
}

export function useListsOverview(): ListsOverview | undefined {
  return useLiveQuery(async () => {
    const [lists, items, profiles] = await Promise.all([
      db.lists.toArray(),
      db.items.toArray(),
      db.profiles.toArray(),
    ]);

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const overview: ListOverviewItem[] = lists
      .filter((list) => !list.deletedAt)
      .map((list) => {
        const listItems = items.filter((item) => item.listId === list.id && !item.deletedAt);
        const checked = listItems.filter((item) => item.isChecked).length;
        return {
          list,
          total: listItems.length,
          checked,
          unchecked: listItems.length - checked,
          updatedByProfile: list.updatedBy ? (profileById.get(list.updatedBy) ?? null) : null,
        };
      })
      .sort((a, b) => b.list.updatedAt.localeCompare(a.list.updatedAt));

    return {
      active: overview.filter((entry) => !entry.list.archivedAt),
      archived: overview.filter((entry) => Boolean(entry.list.archivedAt)),
    };
  }, []);
}
