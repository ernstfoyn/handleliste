export type MemberRole = 'owner' | 'member';

export interface Profile {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
}

export interface HouseholdMember {
  householdId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
}

export interface ListRecord {
  id: string;
  householdId: string;
  name: string;
  archivedAt: string | null;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMember {
  listId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
}

export interface Item {
  id: string;
  listId: string;
  name: string;
  displayName: string;
  normalizedName: string;
  quantity: string | null;
  note: string | null;
  isChecked: boolean;
  checkedAt: string | null;
  deletedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  position: number;
}

export interface CatalogEntry {
  id: string;
  householdId: string;
  normalizedName: string;
  displayName: string;
  useCount: number;
  lastUsedAt: string;
}

export interface PresenceUser {
  userId: string;
  displayName: string;
}

export interface ListSummary {
  list: ListRecord;
  total: number;
  unchecked: number;
  checked: number;
}
