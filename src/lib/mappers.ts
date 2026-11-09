import type { Database } from './database.types';
import type {
  CatalogEntry,
  Household,
  HouseholdMember,
  Item,
  ListMember,
  ListRecord,
  Profile,
} from './types';
import type { ListPatch } from './sync-types';

type Tables = Database['public']['Tables'];
type ProfileRow = Tables['profiles']['Row'];
type HouseholdRow = Tables['households']['Row'];
type HouseholdMemberRow = Tables['household_members']['Row'];
type ListRow = Tables['lists']['Row'];
type ListMemberRow = Tables['list_members']['Row'];
type ItemRow = Tables['items']['Row'];
type CatalogRow = Tables['item_catalog']['Row'];

export type ItemInsert = Tables['items']['Insert'];
export type ItemUpdate = Tables['items']['Update'];
export type ListInsert = Tables['lists']['Insert'];
export type ListUpdate = Tables['lists']['Update'];

export function mapProfile(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, createdAt: row.created_at };
}

export function mapHousehold(row: HouseholdRow): Household {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function mapHouseholdMember(row: HouseholdMemberRow): HouseholdMember {
  return {
    householdId: row.household_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function mapList(row: ListRow): ListRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapListMember(row: ListMemberRow): ListMember {
  return {
    listId: row.list_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

export function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    quantity: row.quantity,
    note: row.note,
    isChecked: row.is_checked,
    checkedAt: row.checked_at,
    deletedAt: row.deleted_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    position: row.position,
  };
}

export function mapCatalogEntry(row: CatalogRow): CatalogEntry {
  return {
    id: row.id,
    householdId: row.household_id,
    normalizedName: row.normalized_name,
    displayName: row.display_name,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
  };
}

export function toItemInsert(item: Item): ItemInsert {
  return {
    id: item.id,
    list_id: item.listId,
    name: item.name,
    display_name: item.displayName,
    normalized_name: item.normalizedName,
    quantity: item.quantity,
    note: item.note,
    is_checked: item.isChecked,
    checked_at: item.checkedAt,
    deleted_at: item.deletedAt,
    created_by: item.createdBy,
    updated_by: item.updatedBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    position: item.position,
  };
}

export function toListInsert(list: ListRecord): ListInsert {
  return {
    id: list.id,
    household_id: list.householdId,
    name: list.name,
    archived_at: list.archivedAt,
    deleted_at: list.deletedAt,
    created_by: list.createdBy,
    updated_by: list.updatedBy,
    created_at: list.createdAt,
    updated_at: list.updatedAt,
  };
}

export function toListUpdate(patch: ListPatch): ListUpdate {
  const update: ListUpdate = {};
  if (patch.name !== undefined) update.name = patch.name;
  if ('archivedAt' in patch) update.archived_at = patch.archivedAt ?? null;
  if ('deletedAt' in patch) update.deleted_at = patch.deletedAt ?? null;
  return update;
}

export function toItemUpdate(patch: { isChecked: boolean; checkedAt: string | null }): ItemUpdate {
  return { is_checked: patch.isChecked, checked_at: patch.checkedAt };
}
