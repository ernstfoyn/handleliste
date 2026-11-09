import type { CatalogEntry } from './types';
import { normalizeItemName } from './normalize';

export interface RankOptions {
  limit?: number;
}

function byFrequency(a: CatalogEntry, b: CatalogEntry): number {
  return (
    b.useCount - a.useCount ||
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime() ||
    a.displayName.localeCompare(b.displayName, 'nb-NO')
  );
}

/**
 * Rangerer historikk-treff:
 * 1) prefikstreff før andre treff
 * 2) høyest use_count
 * 3) nyest last_used_at
 * 4) alfabetisk (stabilt)
 */
export function rankSuggestions(
  entries: readonly CatalogEntry[],
  query: string,
  options: RankOptions = {},
): CatalogEntry[] {
  const limit = options.limit ?? 6;
  const normalizedQuery = normalizeItemName(query);

  if (!normalizedQuery) {
    return [...entries].sort(byFrequency).slice(0, limit);
  }

  return entries
    .filter((entry) => entry.normalizedName.includes(normalizedQuery))
    .sort((a, b) => {
      const aPrefix = a.normalizedName.startsWith(normalizedQuery) ? 0 : 1;
      const bPrefix = b.normalizedName.startsWith(normalizedQuery) ? 0 : 1;
      return aPrefix - bPrefix || byFrequency(a, b);
    })
    .slice(0, limit);
}

export function mostUsed(entries: readonly CatalogEntry[], limit = 8): CatalogEntry[] {
  return entries
    .filter((entry) => entry.useCount >= 2)
    .sort(byFrequency)
    .slice(0, limit);
}

export function recentlyUsed(
  entries: readonly CatalogEntry[],
  exclude: readonly CatalogEntry[] = [],
  limit = 8,
): CatalogEntry[] {
  const excluded = new Set(exclude.map((entry) => entry.id));
  return entries
    .filter((entry) => !excluded.has(entry.id))
    .sort(
      (a, b) =>
        new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime() ||
        b.useCount - a.useCount ||
        a.displayName.localeCompare(b.displayName, 'nb-NO'),
    )
    .slice(0, limit);
}
