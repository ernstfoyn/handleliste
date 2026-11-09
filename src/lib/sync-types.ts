import type { Item, ListRecord } from './types';

export interface OutboxEntry {
  seq: number;
  id: string;
  userId: string;
  entityId: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export type ListPatch = {
  name?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type OutboxOperation =
  | { kind: 'item.insert'; payload: { item: Item } }
  | {
      kind: 'item.update';
      payload: { itemId: string; patch: { isChecked: boolean; checkedAt: string | null } };
    }
  | { kind: 'item.delete'; payload: { itemId: string } }
  | { kind: 'list.insert'; payload: { list: ListRecord } }
  | { kind: 'list.update'; payload: { listId: string; patch: ListPatch } }
  | { kind: 'list.delete'; payload: { listId: string; deletedAt: string } };

export type OutboxRecord = OutboxEntry & OutboxOperation;
export type NewOutboxRecord = Omit<OutboxEntry, 'seq'> & OutboxOperation;
