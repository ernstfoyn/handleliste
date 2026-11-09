import { describe, expect, it } from 'vitest';
import { mostUsed, rankSuggestions, recentlyUsed } from './autocomplete';
import type { CatalogEntry } from './types';

function entry(
  displayName: string,
  normalizedName: string,
  useCount: number,
  lastUsedAt: string,
  id = normalizedName,
): CatalogEntry {
  return {
    id,
    householdId: 'household',
    normalizedName,
    displayName,
    useCount,
    lastUsedAt,
  };
}

const entries: CatalogEntry[] = [
  entry('Melk', 'melk', 3, '2026-11-08T10:00:00.000Z', 'melk'),
  entry('Karamell', 'karamell', 50, '2026-11-09T10:00:00.000Z', 'karamell'),
  entry('Melon', 'melon', 2, '2026-11-07T10:00:00.000Z', 'melon'),
  entry('Brød', 'brød', 5, '2026-11-01T10:00:00.000Z', 'brød'),
  entry('Egg', 'egg', 1, '2026-11-06T10:00:00.000Z', 'egg'),
];

describe('rankSuggestions', () => {
  it('setter prefikstreff før substring-treff, selv med lavere frekvens', () => {
    const result = rankSuggestions(entries, 'mel');
    expect(result.map((item) => item.displayName).slice(0, 2)).toEqual(['Melk', 'Melon']);
    expect(result.some((item) => item.displayName === 'Karamell')).toBe(true);
    expect(result.findIndex((item) => item.displayName === 'Karamell')).toBeGreaterThan(0);
  });

  it('rangerer på frekvens og deretter sist brukt innenfor samme prefiks', () => {
    const samePrefix = [
      entry('Melk', 'melk', 3, '2026-11-01T10:00:00.000Z', 'melk'),
      entry('Melkesjokolade', 'melkesjokolade', 3, '2026-11-09T10:00:00.000Z', 'sjokolade'),
      entry('Melon', 'melon', 8, '2026-10-01T10:00:00.000Z', 'melon'),
    ];
    expect(rankSuggestions(samePrefix, 'mel').map((item) => item.displayName)).toEqual([
      'Melon',
      'Melkesjokolade',
      'Melk',
    ]);
  });

  it('matcher flertallsform via normalisering', () => {
    const result = rankSuggestions(entries, 'eggene');
    expect(result[0]?.displayName).toBe('Egg');
  });

  it('matcher ÆØÅ uavhengig av case', () => {
    const result = rankSuggestions(
      [
        entry('Øl', 'øl', 2, '2026-11-09T10:00:00.000Z'),
        entry('Brød', 'brød', 5, '2026-11-09T11:00:00.000Z'),
      ],
      'ØL',
    );
    expect(result.map((item) => item.displayName)).toEqual(['Øl']);
  });

  it('respekterer limit og faller tilbake til frekvens ved tomt søk', () => {
    const result = rankSuggestions(entries, '', { limit: 3 });
    expect(result.map((item) => item.displayName)).toEqual(['Karamell', 'Brød', 'Melk']);
  });
});

describe('mostUsed / recentlyUsed', () => {
  it('viser ofte brukt bare ved to eller flere bruk, sortert på frekvens', () => {
    expect(mostUsed(entries).map((item) => item.displayName)).toEqual([
      'Karamell',
      'Brød',
      'Melk',
      'Melon',
    ]);
  });

  it('nylig brukt sorterer på tid og kan ekskludere ofte brukt', () => {
    const all = recentlyUsed(entries, [], 10);
    expect(all.map((item) => item.displayName)).toEqual([
      'Karamell',
      'Melk',
      'Melon',
      'Egg',
      'Brød',
    ]);

    const recentOnly = recentlyUsed(entries, mostUsed(entries), 10);
    expect(recentOnly.map((item) => item.displayName)).toEqual(['Egg']);
  });
});
