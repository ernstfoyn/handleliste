import type { CatalogEntry, Item } from './types';

/**
 * Slår sammen:
 * - item_catalog fra alle husholdninger brukeren kan se
 * - alle varer på alle lister brukeren har tilgang til
 *
 * Dermed husker historikken også varer som aldri ble huket av, og varer fra
 * delte lister som ligger i en annen husholdning enn brukerens egen.
 */
export function buildHistory(
  catalog: readonly CatalogEntry[],
  items: readonly Item[],
): CatalogEntry[] {
  const byName = new Map<string, CatalogEntry>();

  for (const entry of catalog) {
    const existing = byName.get(entry.normalizedName);
    if (!existing) {
      byName.set(entry.normalizedName, { ...entry });
      continue;
    }

    const existingTime = new Date(existing.lastUsedAt).getTime();
    const entryTime = new Date(entry.lastUsedAt).getTime();
    const latest = entryTime > existingTime ? entry : existing;
    byName.set(entry.normalizedName, {
      ...latest,
      useCount: existing.useCount + entry.useCount,
    });
  }

  for (const item of items) {
    if (item.deletedAt) continue;
    const existing = byName.get(item.normalizedName);
    if (existing) {
      if (new Date(item.updatedAt).getTime() > new Date(existing.lastUsedAt).getTime()) {
        byName.set(item.normalizedName, {
          ...existing,
          displayName: item.displayName,
          lastUsedAt: item.updatedAt,
        });
      }
      continue;
    }

    byName.set(item.normalizedName, {
      id: `history:${item.normalizedName}`,
      householdId: 'all',
      normalizedName: item.normalizedName,
      displayName: item.displayName,
      useCount: 0,
      lastUsedAt: item.updatedAt,
    });
  }

  return [...byName.values()];
}
