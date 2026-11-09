import { db } from '../lib/db';
import {
  mapCatalogEntry,
  mapHousehold,
  mapHouseholdMember,
  mapItem,
  mapList,
  mapListMember,
  mapProfile,
} from '../lib/mappers';
import { supabase } from '../lib/supabase';
import { reconcileRows } from '../lib/sync-core';

let lastSignature = '';

export function resetPullSignature(): void {
  lastSignature = '';
}

function signatureOf(parts: unknown): string {
  return JSON.stringify(parts);
}

/**
 * Henter hele datasettet brukeren har tilgang til og speiler det i IndexedDB.
 * Full pull er bevisst valgt i MVP: datasettet er lite, og det gjør
 * sletting/RLS/reconnect vesentlig enklere å få riktig enn inkrementell merge.
 */
export async function pullAll(
  userId: string,
  shouldApply: () => boolean = () => true,
): Promise<boolean> {
  if (!supabase) return false;

  const [
    listsResult,
    membersResult,
    itemsResult,
    catalogResult,
    profilesResult,
    householdsResult,
    householdMembersResult,
  ] = await Promise.all([
    supabase.from('lists').select('*').is('deleted_at', null),
    supabase.from('list_members').select('*'),
    supabase.from('items').select('*').is('deleted_at', null),
    supabase.from('item_catalog').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('households').select('*'),
    supabase.from('household_members').select('*'),
  ]);

  const firstError =
    listsResult.error ??
    membersResult.error ??
    itemsResult.error ??
    catalogResult.error ??
    profilesResult.error ??
    householdsResult.error ??
    householdMembersResult.error;
  if (firstError) throw firstError;
  if (!shouldApply()) return false;

  const remoteLists = (listsResult.data ?? []).map(mapList);
  const remoteMembers = (membersResult.data ?? []).map(mapListMember);
  const remoteItems = (itemsResult.data ?? []).map(mapItem);
  const remoteCatalog = (catalogResult.data ?? []).map(mapCatalogEntry);
  const remoteProfiles = (profilesResult.data ?? []).map(mapProfile);
  const remoteHouseholds = (householdsResult.data ?? []).map(mapHousehold);
  const remoteHouseholdMembers = (householdMembersResult.data ?? []).map(mapHouseholdMember);

  // Alt leses og skrives i én Dexie-transaksjon. Da kan ikke en lokal
  // handling som skjer mens pull er i flight, bli slettet av reconcile.
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
    ],
    async () => {
      // Ikke skriv data fra en avsluttet/utlogget synk inn i en ny brukers cache.
      if (!shouldApply()) return;

      const pending = await db.outbox.toArray();
      const pendingListIds = new Set(
        pending.filter((entry) => entry.kind.startsWith('list.')).map((entry) => entry.entityId),
      );
      const pendingItemIds = new Set(
        pending.filter((entry) => entry.kind.startsWith('item.')).map((entry) => entry.entityId),
      );

      const [localLists, localItems, localMembers] = await Promise.all([
        db.lists.toArray(),
        db.items.toArray(),
        db.listMembers.toArray(),
      ]);

      const listReconcile = reconcileRows(localLists, remoteLists, pendingListIds);
      const itemReconcile = reconcileRows(localItems, remoteItems, pendingItemIds);
      const preservedMembers = localMembers.filter((member) => pendingListIds.has(member.listId));

      if (listReconcile.toRemove.length > 0) {
        await db.lists.bulkDelete(listReconcile.toRemove);
      }
      if (listReconcile.toPut.length > 0) {
        await db.lists.bulkPut(listReconcile.toPut);
      }

      if (itemReconcile.toRemove.length > 0) {
        await db.items.bulkDelete(itemReconcile.toRemove);
      }
      if (itemReconcile.toPut.length > 0) {
        await db.items.bulkPut(itemReconcile.toPut);
      }

      await db.listMembers.clear();
      await db.listMembers.bulkPut([...remoteMembers, ...preservedMembers]);

      await db.profiles.clear();
      await db.profiles.bulkPut(remoteProfiles);

      await db.households.clear();
      await db.households.bulkPut(remoteHouseholds);

      await db.householdMembers.clear();
      await db.householdMembers.bulkPut(remoteHouseholdMembers);

      // Reparer ventende lister som ble opprettet mot en gammel/feil husstand
      // (typisk etter bytte mellom gjest og e-post på samme enhet).
      const myHouseholdIds = new Set(
        remoteHouseholdMembers
          .filter((member) => member.userId === userId)
          .map((member) => member.householdId),
      );
      const fallbackHouseholdId = [...myHouseholdIds][0];
      if (fallbackHouseholdId) {
        const pendingListInserts = await db.outbox
          .where('kind')
          .equals('list.insert')
          .toArray();
        for (const entry of pendingListInserts) {
          if (entry.kind !== 'list.insert') continue;
          if (myHouseholdIds.has(entry.payload.list.householdId)) continue;

          const repairedList = {
            ...entry.payload.list,
            householdId: fallbackHouseholdId,
          };
          await db.lists.put(repairedList);
          await db.outbox.put({ ...entry, payload: { list: repairedList } });
        }
      }

      await db.catalog.clear();
      await db.catalog.bulkPut(remoteCatalog);
    },
  );

  if (!shouldApply()) return false;

  const nextSignature = signatureOf({
    lists: remoteLists.map((list) => [list.id, list.updatedAt, list.name, list.archivedAt]),
    items: remoteItems.map((item) => [
      item.id,
      item.updatedAt,
      item.isChecked,
      item.displayName,
      item.quantity,
      item.note,
      item.position,
    ]),
    members: remoteMembers.map((member) => [member.listId, member.userId, member.role]),
    catalog: remoteCatalog.map((entry) => [entry.id, entry.useCount, entry.lastUsedAt]),
  });

  const changed = lastSignature !== '' && nextSignature !== lastSignature;
  lastSignature = nextSignature;
  return changed;
}
