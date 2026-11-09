import { db } from '../lib/db';
import { createId, createPosition } from '../lib/id';
import { cleanDisplayName, normalizeItemName } from '../lib/normalize';
import { requireSupabase } from '../lib/supabase';
import type { OutboxOperation } from '../lib/sync-types';
import { syncEngine } from './engine';
import { ensureBootstrap } from './bootstrap';
import type { CatalogEntry, Item, ListMember, ListRecord } from '../lib/types';

function nowIso(): string {
  return new Date().toISOString();
}

function validateListName(raw: string): string {
  const name = cleanDisplayName(raw);
  if (!name) throw new Error('Listen må ha et navn.');
  if (name.length > 120) throw new Error('Listenavnet kan være maks 120 tegn.');
  return name;
}

async function enqueue(
  userId: string,
  entityId: string,
  operation: OutboxOperation,
): Promise<void> {
  await db.outbox.add({
    id: createId(),
    userId,
    entityId,
    createdAt: nowIso(),
    attempts: 0,
    lastError: null,
    ...operation,
  });
}

async function touchList(listId: string, userId: string, now: string): Promise<void> {
  await db.lists.update(listId, { updatedAt: now, updatedBy: userId });
}

async function findHouseholdId(userId: string): Promise<string> {
  // Bruk husstanden der brukeren faktisk har et medlemskap. Etter bytte mellom
  // gjest/e-post kan IndexedDB inneholde en gammel husstand fra en annen konto;
  // den vil RLS avvise insert i.
  const localMembership = await db.householdMembers.where('userId').equals(userId).first();
  if (localMembership) return localMembership.householdId;

  try {
    await ensureBootstrap();
    await syncEngine.pullNow();
  } catch (error) {
    console.warn('Bootstrap feilet', error);
  }

  const refreshedMembership = await db.householdMembers.where('userId').equals(userId).first();
  if (refreshedMembership) return refreshedMembership.householdId;

  throw new Error(
    'Fant ingen husholdning for brukeren. Sjekk at Supabase er konfigurert og tilgjengelig.',
  );
}

export async function createList(userId: string, rawName: string): Promise<string> {
  const name = validateListName(rawName);
  const householdId = await findHouseholdId(userId);
  const id = createId();
  const now = nowIso();

  const list: ListRecord = {
    id,
    householdId,
    name,
    archivedAt: null,
    deletedAt: null,
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  const member: ListMember = {
    listId: id,
    userId,
    role: 'owner',
    joinedAt: now,
  };

  await db.transaction('rw', db.lists, db.listMembers, db.outbox, async () => {
    await db.lists.put(list);
    await db.listMembers.put(member);
    await enqueue(userId, id, { kind: 'list.insert', payload: { list } });
  });

  syncEngine.kick();
  return id;
}

export async function renameList(listId: string, rawName: string, userId: string): Promise<void> {
  const name = validateListName(rawName);
  const list = await db.lists.get(listId);
  if (!list) throw new Error('Fant ikke listen.');
  const now = nowIso();

  await db.transaction('rw', db.lists, db.outbox, async () => {
    await db.lists.put({ ...list, name, updatedAt: now, updatedBy: userId });
    await enqueue(userId, listId, { kind: 'list.update', payload: { listId, patch: { name } } });
  });

  syncEngine.kick();
}

export async function setListArchived(
  listId: string,
  archived: boolean,
  userId: string,
): Promise<void> {
  const list = await db.lists.get(listId);
  if (!list) throw new Error('Fant ikke listen.');
  const now = nowIso();
  const archivedAt = archived ? now : null;

  await db.transaction('rw', db.lists, db.outbox, async () => {
    await db.lists.put({ ...list, archivedAt, updatedAt: now, updatedBy: userId });
    await enqueue(userId, listId, {
      kind: 'list.update',
      payload: { listId, patch: { archivedAt } },
    });
  });

  syncEngine.kick();
}

export async function deleteList(listId: string, userId: string): Promise<void> {
  const list = await db.lists.get(listId);
  if (!list) return;
  const now = nowIso();

  await db.transaction('rw', db.lists, db.outbox, async () => {
    await db.lists.put({ ...list, deletedAt: now, updatedAt: now, updatedBy: userId });
    await enqueue(userId, listId, {
      kind: 'list.delete',
      payload: { listId, deletedAt: now },
    });
  });

  syncEngine.kick();
}

export interface AddItemInput {
  userId: string;
  listId: string;
  name: string;
  quantity?: string;
  note?: string;
}

export async function addItem(input: AddItemInput): Promise<Item> {
  const displayName = cleanDisplayName(input.name);
  if (!displayName) throw new Error('Skriv inn et varenavn.');
  if (displayName.length > 200) throw new Error('Varenavnet kan være maks 200 tegn.');

  const normalizedName = normalizeItemName(displayName);
  if (!normalizedName) throw new Error('Skriv inn et gyldig varenavn.');

  const list = await db.lists.get(input.listId);
  if (!list) throw new Error('Fant ikke listen.');

  const existing = await db.items.where('listId').equals(input.listId).toArray();
  const now = nowIso();
  const quantity = cleanDisplayName(input.quantity ?? '');
  const note = cleanDisplayName(input.note ?? '');

  const item: Item = {
    id: createId(),
    listId: input.listId,
    name: displayName,
    displayName,
    normalizedName,
    quantity: quantity ? quantity.slice(0, 80) : null,
    note: note ? note.slice(0, 500) : null,
    isChecked: false,
    checkedAt: null,
    deletedAt: null,
    createdBy: input.userId,
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
    position: createPosition(existing.map((row) => row.position)),
  };

  await db.transaction('rw', db.items, db.lists, db.catalog, db.outbox, async () => {
    await db.items.put(item);
    await rememberAddedItem(item, list.householdId, now);
    await touchList(input.listId, input.userId, now);
    await enqueue(input.userId, item.id, { kind: 'item.insert', payload: { item } });
  });

  syncEngine.kick();
  return item;
}

async function rememberAddedItem(item: Item, householdId: string, now: string): Promise<void> {
  const existing = await db.catalog
    .where('[householdId+normalizedName]')
    .equals([householdId, item.normalizedName])
    .first();

  if (existing) {
    await db.catalog.put({
      ...existing,
      displayName: item.displayName,
      lastUsedAt: now,
    });
    return;
  }

  await db.catalog.put({
    id: createId(),
    householdId,
    normalizedName: item.normalizedName,
    displayName: item.displayName,
    useCount: 0,
    lastUsedAt: now,
  });
}

async function bumpCatalog(item: Item, now: string): Promise<void> {
  const list = await db.lists.get(item.listId);
  if (!list) return;

  const existing = await db.catalog
    .where('[householdId+normalizedName]')
    .equals([list.householdId, item.normalizedName])
    .first();

  if (existing) {
    await db.catalog.put({
      ...existing,
      displayName: item.displayName,
      useCount: existing.useCount + 1,
      lastUsedAt: now,
    });
    return;
  }

  const entry: CatalogEntry = {
    id: createId(),
    householdId: list.householdId,
    normalizedName: item.normalizedName,
    displayName: item.displayName,
    useCount: 1,
    lastUsedAt: now,
  };
  await db.catalog.put(entry);
}

export async function toggleItem(
  itemId: string,
  userId: string,
  nextChecked?: boolean,
): Promise<void> {
  const item = await db.items.get(itemId);
  if (!item) return;

  const checked = nextChecked ?? !item.isChecked;
  if (item.isChecked === checked) return;

  const now = nowIso();
  const checkedAt = checked ? now : null;

  await db.transaction('rw', db.items, db.lists, db.catalog, db.outbox, async () => {
    await db.items.put({
      ...item,
      isChecked: checked,
      checkedAt,
      updatedAt: now,
      updatedBy: userId,
    });
    await touchList(item.listId, userId, now);
    await enqueue(userId, item.id, {
      kind: 'item.update',
      payload: { itemId: item.id, patch: { isChecked: checked, checkedAt } },
    });
    if (checked) {
      await bumpCatalog(item, now);
    }
  });

  syncEngine.kick();
}

export async function deleteItem(itemId: string, userId: string): Promise<Item | null> {
  const item = await db.items.get(itemId);
  if (!item) return null;
  const now = nowIso();

  await db.transaction('rw', db.items, db.lists, db.outbox, async () => {
    await db.items.delete(item.id);
    await touchList(item.listId, userId, now);
    await enqueue(userId, item.id, { kind: 'item.delete', payload: { itemId: item.id } });
  });

  syncEngine.kick();
  return item;
}

export async function restoreItem(item: Item, userId: string): Promise<void> {
  const now = nowIso();
  // En vare kan være slettet av en annen listemedlem. Re-insert må da eies av
  // den som angrer, ellers stopper RLS-policyen (created_by = auth.uid()).
  const restored: Item = {
    ...item,
    createdBy: userId,
    updatedBy: userId,
    updatedAt: now,
    deletedAt: null,
  };

  await db.transaction('rw', db.items, db.lists, db.outbox, async () => {
    await db.items.put(restored);
    await touchList(item.listId, userId, now);
    await enqueue(userId, item.id, { kind: 'item.insert', payload: { item: restored } });
  });

  syncEngine.kick();
}

export async function clearCheckedItems(listId: string, userId: string): Promise<Item[]> {
  const items = await db.items.where('listId').equals(listId).toArray();
  const checked = items.filter((item) => item.isChecked);
  if (checked.length === 0) return [];

  const now = nowIso();
  await db.transaction('rw', db.items, db.lists, db.outbox, async () => {
    await db.items.bulkDelete(checked.map((item) => item.id));
    await touchList(listId, userId, now);
    for (const item of checked) {
      await enqueue(userId, item.id, { kind: 'item.delete', payload: { itemId: item.id } });
    }
  });

  syncEngine.kick();
  return checked;
}

export async function restoreItems(items: Item[], userId: string): Promise<void> {
  if (items.length === 0) return;
  const now = nowIso();

  await db.transaction('rw', db.items, db.lists, db.outbox, async () => {
    const listIds = new Set(items.map((item) => item.listId));
    for (const item of items) {
      const restored: Item = {
        ...item,
        createdBy: userId,
        updatedBy: userId,
        updatedAt: now,
        deletedAt: null,
      };
      await db.items.put(restored);
      await enqueue(userId, item.id, { kind: 'item.insert', payload: { item: restored } });
    }
    for (const listId of listIds) {
      await touchList(listId, userId, now);
    }
  });

  syncEngine.kick();
}

export async function updateProfileName(userId: string, rawName: string): Promise<void> {
  const displayName = cleanDisplayName(rawName);
  if (!displayName) throw new Error('Navnet kan ikke være tomt.');
  if (displayName.length > 60) throw new Error('Navnet kan være maks 60 tegn.');

  const client = requireSupabase();
  const { error } = await client
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId);
  if (error) throw error;
  await db.profiles.update(userId, { displayName });
}

export async function createInvite(listId: string, userId: string): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Du må være online for å lage en invitasjonslenke.');
  }
  const client = requireSupabase();
  // Listen og eierskapet må finnes på serveren før invitasjonen kan lages.
  // Dette håndterer at brukeren deler rett etter at listen ble opprettet.
  await syncEngine.flushNow();
  if ((await db.outbox.count()) > 0) {
    throw new Error('Endringene er ikke synkronisert ennå. Prøv igjen om et øyeblikk.');
  }
  const { data, error } = await client
    .from('list_invites')
    .insert({ list_id: listId, created_by: userId })
    .select('token')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Kunne ikke lage invitasjonslenke.');
  return data.token;
}

export async function removeMember(listId: string, memberId: string): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Du må være online for å fjerne medlemmer.');
  }
  const client = requireSupabase();
  const { error } = await client
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', memberId);
  if (error) throw error;
  await db.listMembers.delete([listId, memberId]);
  await syncEngine.pullNow();
}

export interface AcceptedInvite {
  listId: string;
  listName: string;
}

export async function acceptInvite(token: string): Promise<AcceptedInvite> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('accept_list_invite', { p_token: token });
  if (error) throw new Error(error.message);
  const invite = Array.isArray(data) ? data[0] : undefined;
  if (!invite) throw new Error('Invitasjonen er ugyldig eller utløpt.');
  await syncEngine.pullNow();
  const localList = await db.lists.get(invite.list_id);
  if (!localList) {
    throw new Error('Du ble med, men listen kunne ikke hentes. Sjekk nettet og prøv igjen.');
  }
  return { listId: invite.list_id, listName: invite.list_name };
}
